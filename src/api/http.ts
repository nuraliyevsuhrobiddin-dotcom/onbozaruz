/**
 * HTTP transport layer.
 *
 * Single switch point between the mock API and Supabase.
 *
 * .env example:
 *   VITE_USE_MOCK_API=false
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 */
import { ApiResult, mockServer } from './mockServer';
import { getSupabaseAccessToken } from './authClient';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  params?: Record<string, string | number | undefined>;
}

export class ApiTransportError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiTransportError';
    this.status = status;
  }
}

async function unwrap<T>(result: Promise<ApiResult<T>> | ApiResult<T>): Promise<T> {
  const resolved = await result;
  if ('error' in resolved) {
    throw new ApiTransportError(resolved.error.status, resolved.error.message);
  }
  return resolved.data;
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  if (USE_MOCK_API) {
    return (await requestMock(method, path, body, options)) as T;
  }
  return (await requestSupabase(method, path, body, options)) as T;
}

async function requestMock(
  method: HttpMethod,
  path: string,
  body?: unknown,
  _options?: RequestOptions
): Promise<unknown> {
  const pathSegments = path.split('/').filter(Boolean);
  const resource = pathSegments[0];
  const id = pathSegments[1];

  switch (method) {
    case 'GET': {
      if (resource === 'posts') {
        if (id) return unwrap(mockServer.getPost(id));
        return unwrap(mockServer.listPosts());
      }
      if (resource === 'products') {
        if (id) return unwrap(mockServer.getProduct(id));
        return unwrap(mockServer.listProducts());
      }
      if (resource === 'orders') {
        if (id) return unwrap(mockServer.getOrder(id));
        return unwrap(mockServer.listOrders());
      }
      if (resource === 'categories') return unwrap(mockServer.listCategories());
      throw new ApiTransportError(404, `Endpoint topilmadi: GET /${path}`);
    }
    case 'POST': {
      if (resource === 'posts') {
        return unwrap(mockServer.createPost(body as Parameters<typeof mockServer.createPost>[0]));
      }
      if (resource === 'products') {
        return unwrap(mockServer.createProduct(body as Parameters<typeof mockServer.createProduct>[0]));
      }
      if (resource === 'orders') {
        return unwrap(mockServer.createOrder(body as Parameters<typeof mockServer.createOrder>[0]));
      }
      throw new ApiTransportError(404, `Endpoint topilmadi: POST /${path}`);
    }
    case 'PATCH': {
      if (resource === 'posts' && id) {
        return unwrap(mockServer.updatePost(id, (body || {}) as Parameters<typeof mockServer.updatePost>[1]));
      }
      if (resource === 'products' && id) {
        return unwrap(mockServer.updateProduct(id, (body || {}) as Parameters<typeof mockServer.updateProduct>[1]));
      }
      if (resource === 'orders' && id) {
        return unwrap(mockServer.updateOrder(id, (body || {}) as Parameters<typeof mockServer.updateOrder>[1]));
      }
      throw new ApiTransportError(404, `Endpoint topilmadi: PATCH /${path}`);
    }
    case 'DELETE': {
      if (resource === 'posts' && id) return unwrap(mockServer.deletePost(id));
      if (resource === 'products' && id) return unwrap(mockServer.deleteProduct(id));
      throw new ApiTransportError(404, `Endpoint topilmadi: DELETE /${path}`);
    }
    default:
      throw new ApiTransportError(405, `Method qo'llab-quvvatlanmaydi: ${method}`);
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

async function requestSupabase(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new ApiTransportError(
      500,
      'Supabase sozlanmagan: VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY kerak'
    );
  }

  const pathSegments = path.split('/').filter(Boolean);
  const table = pathSegments[0];
  const id = pathSegments[1];
  const params = new URLSearchParams();

  if (method === 'GET') params.set('select', '*');
  if (id) params.set('id', `eq.${id}`);
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) params.set(toSnakeCase(key), String(value));
    });
  }

  const accessToken = await getSupabaseAccessToken();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method === 'POST' || method === 'PATCH' ? { Prefer: 'return=representation' } : {}),
    },
    body: body !== undefined ? JSON.stringify(mapObjectKeys(body, toSnakeCase)) : undefined,
  });

  if (!response.ok) {
    let message = `Supabase xatolik qaytardi (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string; hint?: string };
      message = payload?.message || payload?.error || payload?.hint || message;
    } catch {
      // Non-JSON error body: keep default message.
    }
    throw new ApiTransportError(response.status, message);
  }

  if (method === 'DELETE') return id ? { id } : {};

  const payload = await response.json();
  const normalized = mapObjectKeys(payload, toCamelCase);
  if (Array.isArray(normalized) && id) return normalized[0];
  if (Array.isArray(normalized) && (method === 'POST' || method === 'PATCH')) return normalized[0];
  return normalized;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};


