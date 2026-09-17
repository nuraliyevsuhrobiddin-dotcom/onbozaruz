import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';
import { readJsonBody } from '../lib/requestBody';
import { getSupabaseServerConfig, requireAuthenticatedUser, sendApiJson } from '../lib/supabaseAuth';

type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function isValidSubscription(payload: PushSubscriptionPayload): payload is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (typeof payload.endpoint !== 'string'
    || typeof payload.keys?.p256dh !== 'string'
    || typeof payload.keys?.auth !== 'string') {
    return false;
  }

  try {
    return new URL(payload.endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Stores a browser PushSubscription for the authenticated owner only. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  let payload: PushSubscriptionPayload;
  try {
    payload = await readJsonBody<PushSubscriptionPayload>(req);
  } catch (error) {
    sendApiJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'So\'rov o\'qilmadi.',
    });
    return;
  }

  if (!isValidSubscription(payload)) {
    sendApiJson(res, 422, { ok: false, error: 'Push subscription ma\'lumoti yaroqsiz.' });
    return;
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig();
  if (!url || !serviceRoleKey) {
    sendApiJson(res, 503, { ok: false, error: 'Push xizmati sozlanmagan.' });
    return;
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.from('push_subscriptions').upsert({
    endpoint: payload.endpoint,
    user_id: user.id,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    sendApiJson(res, 500, { ok: false, error: 'Push subscription saqlanmadi.' });
    return;
  }

  sendApiJson(res, 201, { ok: true });
}