let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/** Also register on demand: notification permission can precede window.load. */
export function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      return await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), 10000); }),
      ]);
    } catch (error) {
      console.warn('[Notifications] Service worker registration failed:', error);
      return null;
    } finally {
      clearTimeout(timeout);
      registrationPromise = null;
    }
  })();
  return registrationPromise;
}
