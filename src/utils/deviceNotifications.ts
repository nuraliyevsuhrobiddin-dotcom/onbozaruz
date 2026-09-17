/**
 * Device Push & System Notifications Integration for OnBozar.
 *
 * Connects the web application to the smartphone / desktop OS notification system:
 * - Native lockscreen & notification shade banner
 * - Phone vibration pattern
 * - Native device notification sound
 * - Clicking notification opens/focuses the app
 */

import { unlockAudioContext } from './notificationSound';
import { syncWebPushSubscription } from './webPush';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if the browser / phone supports system notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current device notification permission status
 */
export function getDeviceNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Ask user / phone for notification permission
 */
export async function requestDeviceNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    // Calling during a user gesture also unlocks audio
    unlockAudioContext();
    const result = await Notification.requestPermission();
    if (result === 'granted') void syncWebPushSubscription();
    return result;
  } catch {
    return 'denied';
  }
}

export interface DeviceNotificationPayload {
  title: string;
  body?: string;
  id?: string;
  tag?: string;
  url?: string;
}

type ExtendedNotificationOptions = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
};

/**
 * Show a native system notification on the user's phone or desktop
 */
export async function showDeviceNotification(payload: DeviceNotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  const permission = Notification.permission;
  if (permission !== 'granted') return false;

  const title = payload.title || 'OnBozar';
  const body = payload.body || '';
  const tag = payload.tag || payload.id || `onbozar-${Date.now()}`;
  const url = payload.url || '/';

  const options: ExtendedNotificationOptions = {
    body,
    icon: '/logo.png',
    badge: '/favicon.svg',
    tag,
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url },
  };

  // 1. Try Service Worker showNotification (vital for Mobile Android & iOS PWA background notifications)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await Promise.race<ServiceWorkerRegistration | null>([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
      ]);
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    } catch {
      // Fallback to window Notification constructor
    }
  }

  // 2. Direct Notification constructor fallback
  try {
    const notif = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/favicon.svg',
      tag,
      data: { url },
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (url && url !== '/') {
        window.location.hash = url.startsWith('#') ? url : `#${url}`;
      }
    };
    return true;
  } catch {
    return false;
  }
}
