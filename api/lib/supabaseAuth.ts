import { createClient, type User } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';

function readEnv(name: string): string {
  return (process.env[name] || '').trim();
}

export function getSupabaseServerConfig(): { url: string; anonKey: string; serviceRoleKey: string } {
  return {
    // VITE_* fallbacks keep the existing Vercel configuration working, while
    // the non-VITE names are the preferred server-only configuration.
    url: readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL'),
    anonKey: readEnv('SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY'),
    serviceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function getBearerToken(req: IncomingMessage): string | null {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * Validates a caller's Supabase access token against Supabase Auth. The
 * returned user must always be derived from the token, never request JSON.
 */
export async function requireAuthenticatedUser(
  req: IncomingMessage,
  res: ServerResponse
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { ok: false, error: 'Autentifikatsiya talab qilinadi.' });
    return null;
  }

  const { url, anonKey } = getSupabaseServerConfig();
  if (!url || !anonKey) {
    sendJson(res, 500, { ok: false, error: 'Supabase server sozlamalari topilmadi.' });
    return null;
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    sendJson(res, 401, { ok: false, error: 'Sessiya yaroqsiz yoki muddati tugagan.' });
    return null;
  }

  return data.user;
}

export function sendApiJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  sendJson(res, status, body);
}
