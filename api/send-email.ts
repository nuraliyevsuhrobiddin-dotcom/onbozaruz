import type { IncomingMessage, ServerResponse } from 'http';
import { sendApiJson } from './lib/supabaseAuth';

/**
 * Kept solely for backwards-compatible errors. The former endpoint accepted
 * arbitrary recipients and HTML from unauthenticated callers, effectively
 * exposing the Resend account as a public mail relay. Order events use the
 * database notification triggers instead.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }

  sendApiJson(res, 410, {
    ok: false,
    error: 'Bu endpoint o\'chirilgan. Tizim xatlari Supabase Auth yoki server triggerlari orqali yuboriladi.',
  });
}
