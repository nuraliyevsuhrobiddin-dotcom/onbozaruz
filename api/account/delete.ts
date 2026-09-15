import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';
import { getSupabaseServerConfig, requireAuthenticatedUser, sendApiJson } from '../lib/supabaseAuth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  const { url, serviceRoleKey } = getSupabaseServerConfig();
  if (!url || !serviceRoleKey) {
    sendApiJson(res, 503, {
      ok: false,
      error: 'Akkauntni o\'chirish xizmati sozlanmagan. Administratorga murojaat qiling.',
    });
    return;
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) {
    sendApiJson(res, 500, { ok: false, error: 'Akkauntni o\'chirib bo\'lmadi.' });
    return;
  }

  // profiles.id has ON DELETE CASCADE from auth.users, so deleting the Auth
  // user also removes the profile, posts and related application records.
  sendApiJson(res, 200, { ok: true });
}
