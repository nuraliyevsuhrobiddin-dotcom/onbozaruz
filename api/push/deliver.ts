import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';
import * as webpush from 'web-push';
import { readJsonBody } from '../lib/requestBody';
import { getSupabaseServerConfig, sendApiJson } from '../lib/supabaseAuth';

type DeliveryPayload = { notification_id?: unknown };
type StoredSubscription = { endpoint: string; p256dh: string; auth: string };
type StoredNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  target_type: string | null;
  target_id: string | null;
  type: string;
};

function secretsMatch(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

/**
 * Receives one database-triggered event and fan-outs it to that user's browser
 * subscriptions. The shared secret prevents arbitrary internet callers from
 * using the endpoint as a push relay.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }

  const deliverySecret = (process.env.WEB_PUSH_DELIVERY_SECRET || '').trim();
  const requestSecret = req.headers['x-onbozar-push-secret'];
  const secret = Array.isArray(requestSecret) ? requestSecret[0] : requestSecret;
  if (!deliverySecret || !secretsMatch(deliverySecret, secret)) {
    sendApiJson(res, 401, { ok: false, error: 'Ruxsat berilmadi.' });
    return;
  }

  let payload: DeliveryPayload;
  try {
    payload = await readJsonBody<DeliveryPayload>(req);
  } catch (error) {
    sendApiJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'So\'rov o\'qilmadi.',
    });
    return;
  }
  if (typeof payload.notification_id !== 'string' || !payload.notification_id) {
    sendApiJson(res, 422, { ok: false, error: 'notification_id talab qilinadi.' });
    return;
  }

  const publicKey = (process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '').trim();
  if (!publicKey || !privateKey) {
    sendApiJson(res, 503, { ok: false, error: 'VAPID kalitlari sozlanmagan.' });
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
  const { data: notification, error: notificationError } = await adminClient
    .from('notifications')
    .select('id, user_id, title, body, target_type, target_id, type')
    .eq('id', payload.notification_id)
    .maybeSingle<StoredNotification>();

  if (notificationError || !notification) {
    sendApiJson(res, 404, { ok: false, error: 'Bildirishnoma topilmadi.' });
    return;
  }

  const { data: subscriptions, error: subscriptionsError } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', notification.user_id)
    .returns<StoredSubscription[]>();
  if (subscriptionsError) {
    sendApiJson(res, 500, { ok: false, error: 'Push qabul qiluvchilarini o\'qib bo\'lmadi.' });
    return;
  }

  webpush.setVapidDetails(
    (process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:support@onbozar.uz').trim(),
    publicKey,
    privateKey
  );

  const message = JSON.stringify({
    title: notification.title,
    body: notification.body || '',
    tag: `onbozar-${notification.id}`,
    data: {
      url: notification.target_type === 'b2b_order' && notification.target_id
        ? `#market/order/${notification.target_id}`
        : notification.target_type === 'b2b_product' && notification.target_id
          ? `#market/product/${notification.target_id}`
          : notification.target_type === 'order'
            ? '#profile/orders'
            : '#home',
    },
  });

  let delivered = 0;
  await Promise.all((subscriptions || []).map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, message, { TTL: 60 * 60, urgency: 'high', topic: `n-${notification.id.replace(/-/g, '').slice(0, 30)}` });
      delivered += 1;
    } catch (error: any) {
      // Expired endpoints must be discarded so every later notification is not
      // slowed by the same permanent Web Push failure.
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await adminClient.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      }
    }
  }));

  sendApiJson(res, 200, { ok: true, delivered });
}