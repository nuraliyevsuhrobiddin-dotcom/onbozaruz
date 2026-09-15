import type { IncomingMessage, ServerResponse } from 'http';
import { sendApiJson } from '../lib/supabaseAuth';

/** Password reset tokens must be created and emailed by Supabase Auth. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }
  sendApiJson(res, 410, {
    ok: false,
    error: 'Parolni tiklash Supabase Auth orqali yuboriladi.',
  });
}
