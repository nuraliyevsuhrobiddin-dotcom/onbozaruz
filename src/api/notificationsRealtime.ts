/**
 * Notification updates.
 *
 * Shared hosting (Ahost/cPanel) cannot keep WebSocket connections open, so the
 * notification list is refreshed on an interval, when the tab becomes visible
 * again and when the device comes back online. The store's refresh callback
 * detects new rows and plays the sound / shows the banner.
 */
const POLL_INTERVAL_MS = 20000;

export function subscribeToNotifications(onRefresh: () => Promise<void>): () => void {
  let disposed = false;
  let refreshing = false;
  const refresh = async () => {
    if (disposed || refreshing || document.visibilityState === 'hidden' || !navigator.onLine) return;
    refreshing = true;
    try { await onRefresh(); }
    catch (error) { console.warn('[Notifications] Refresh failed:', error); }
    finally { refreshing = false; }
  };

  void refresh();
  const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
  window.addEventListener('online', refresh);
  document.addEventListener('visibilitychange', refresh);

  return () => {
    disposed = true;
    window.clearInterval(interval);
    window.removeEventListener('online', refresh);
    document.removeEventListener('visibilitychange', refresh);
  };
}
