/**
 * HTTP transport for simple table reads/writes against the PHP API (public/api),
 * which speaks the PostgREST protocol. Keys are camelCase in the app and
 * snake_case in the database.
 */
import { API_PUBLIC_KEY, API_URL, getAccessToken } from './authClient';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  /** PostgREST ordering clause, for example created_at.desc. */
  order?: string;
  /** Maximum number of rows returned. */
  limit?: number;
}

export class ApiTransportError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiTransportError';
    this.status = status;
  }
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function mapObjectKeys(value: unknown, mapper: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => mapObjectKeys(item, mapper));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      mapper(key),
      mapObjectKeys(nested, mapper),
    ])
  );
}

function normalizeApiDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeApiDates);
  if (!value || typeof value !== 'object') return value;

  const row = value as Record<string, unknown>;
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, nested]) => [key, normalizeApiDates(nested)])
  );

  if (normalized.date === undefined && normalized.dateDisplay !== undefined) {
    normalized.date = normalized.dateDisplay;
  }
  return normalized;
}

/** Shared mapping for PostgREST table reads and RPC results. */
export function normalizeApiRow<T>(value: unknown): T {
  return normalizeApiDates(mapObjectKeys(value, toCamelCase)) as T;
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const pathSegments = path.split('/').filter(Boolean);
  const table = pathSegments[0];
  const id = pathSegments[1];
  const params = new URLSearchParams();

  if (method === 'GET') params.set('select', '*');
  if (id) params.set('id', `eq.${id}`);
  if (options?.order) params.set('order', options.order);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        const strVal = String(value);
        const hasOperator = /^(eq|neq|gt|gte|lt|lte|like|ilike|in|is|cs|cd)\./.test(strVal);
        const formattedVal = hasOperator ? strVal : `eq.${strVal}`;
        params.set(toSnakeCase(key), formattedVal);
      }
    });
  }

  const accessToken = await getAccessToken();
  const readTable = !accessToken && method === 'GET' && (table === 'posts' || table === 'products')
    ? `${table}_public` : table;

  let response = await fetch(`${API_URL}/rest/v1/${readTable}?${params.toString()}`, {
    method,
    headers: {
      apikey: API_PUBLIC_KEY,
      Authorization: `Bearer ${accessToken || API_PUBLIC_KEY}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method === 'POST' || method === 'PATCH' ? { Prefer: 'return=representation' } : {}),
    },
    body: body !== undefined ? JSON.stringify(mapObjectKeys(body, toSnakeCase)) : undefined,
  });

  // If a GET request fails with 401 due to an expired/stale accessToken, retry once anonymously
  if (response.status === 401 && accessToken && method === 'GET') {
    const anonymousTable = table === 'posts' || table === 'products' ? `${table}_public` : table;
    response = await fetch(`${API_URL}/rest/v1/${anonymousTable}?${params.toString()}`, {
      method: 'GET',
      headers: {
        apikey: API_PUBLIC_KEY,
        Authorization: `Bearer ${API_PUBLIC_KEY}`,
      },
    });
  }

  if (!response.ok) {
    let message = `Server xatolik qaytardi (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string; hint?: string };
      message = payload?.message || payload?.error || payload?.hint || message;
    } catch {
      // Non-JSON error body: keep default message.
    }
    if (import.meta.env.DEV) {
      console.error(`[API] ${method} /${table}:`, message);
    }
    throw new ApiTransportError(response.status, message);
  }

  if (method === 'DELETE') return (id ? { id } : {}) as T;

  const payload = await response.json();
  const normalized = normalizeApiDates(mapObjectKeys(payload, toCamelCase));
  if (Array.isArray(normalized) && (id || method === 'POST' || method === 'PATCH')) return normalized[0] as T;
  return normalized as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};
