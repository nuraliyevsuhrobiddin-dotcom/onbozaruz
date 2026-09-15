import type { IncomingMessage, ServerResponse } from 'http';
import { sendApiJson } from '../lib/supabaseAuth';

/** Email confirmation must be issued by Supabase Auth, which owns the token. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }
  sendApiJson(res, 410, {
    ok: false,
    error: 'Email tasdiqlash Supabase Auth orqali yuboriladi.',
  });
}
