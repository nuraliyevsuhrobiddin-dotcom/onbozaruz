import { getSupabaseAccessToken } from '../api/authClient';

const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();

function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = `${value.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Registers the current browser with the push service. It is intentionally a
 * no-op until VAPID has been configured, so in-app notifications keep working
 * in local/mock environments.
 */
export async function syncWebPushSubscription(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY
    || typeof window === 'undefined'
    || !('serviceWorker' in navigator)
    || !('PushManager' in window)
    || Notification.permission !== 'granted') {
    return false;
  }

  const token = await getSupabaseAccessToken();
  if (!token) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    });
    return response.ok;
  } catch {
    return false;
  }
}