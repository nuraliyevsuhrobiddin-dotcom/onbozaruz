const CACHE_NAME = 'onbozor-shell-v4';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.png', '/favicon.svg', '/notification.wav'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('onbozor-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Recover old notification links without ever caching worker source as HTML.
  if (url.pathname === '/sw.js') {
    if (event.request.mode === 'navigate') {
      event.respondWith(Promise.resolve(Response.redirect(`${url.origin}/${url.hash}`, 302)));
    }
    return;
  }
  // Auth/API responses and partial media downloads must never enter the shell cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')
    || event.request.headers.has('range') || ['video', 'audio'].includes(event.request.destination)) return;
  const isNavigation = event.request.mode === 'navigate';
  const isShellAsset = APP_SHELL.includes(url.pathname) || url.pathname.startsWith('/assets/');
  if (!isNavigation && !isShellAsset) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const isHtml = (response.headers.get('content-type') || '').includes('text/html');
        const isAppPage = url.pathname === '/' || url.pathname === '/index.html'
          || !/\.[^/]+$/.test(url.pathname);
        if (response.ok && response.status === 200 && !response.redirected
          && (!isNavigation || (isHtml && isAppPage))) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME)
            .then((cache) => cache.put(isNavigation ? '/index.html' : event.request, copy))
            .catch(() => {}));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(isNavigation ? '/index.html' : event.request) || Response.error();
      })
  );
});

// ─── Tizim Bildirishnomalarini Ko'rsatish (System Notifications) ───────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'OnBozar', {
        icon: '/logo.png',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200, 100, 200],
        ...options,
      })
    );
  }
});

// Standart Web Push hodisasi
self.addEventListener('push', (event) => {
  let data = { title: 'OnBozar bildirishnomasi', body: 'Yangi xabar keldi' };
  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') data = { ...data, ...parsed };
    } catch {
      data = { title: 'OnBozar', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: { ...data.data, url: notificationUrl(data.data?.url) },
    tag: data.tag || 'onbozar-push',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Foydalanuvchi Bildirishnomani Bosganda (Notification Click) ───────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = notificationUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // Agar ilova ochiq bo'lsa, o'sha oynani faollashtiramiz va yo'naltiramiz
      for (const client of clientList) {
        if ('focus' in client && new URL(client.url).origin === self.location.origin) {
          try {
            const navigated = await client.navigate(targetUrl);
            if (navigated) return await navigated.focus();
          } catch {
            // A closing tab must not swallow a notification click.
          }
        }
      }
      // Agar barcha oynalar yopiq bo'lsa, yangi oynada ochamiz
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

function notificationUrl(value) {
  const root = `${self.location.origin}/`;
  try {
    // Hash-only URLs otherwise resolve relative to /sw.js in a worker.
    const url = new URL(typeof value === 'string' ? value : '/', root);
    if (url.origin !== self.location.origin) return root;
    if (url.pathname === '/sw.js') return `${root}${url.hash}`;
    if (url.pathname !== '/' && url.pathname !== '/index.html') return root;
    return url.href;
  } catch {
    return root;
  }
}
