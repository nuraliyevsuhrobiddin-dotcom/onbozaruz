const CACHE_NAME = 'onbozor-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.png', '/favicon.svg', '/notification.wav'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
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
      data = event.data.json();
    } catch {
      data = { title: 'OnBozar', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    tag: data.tag || 'onbozar-push',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Foydalanuvchi Bildirishnomani Bosganda (Notification Click) ───────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Agar ilova ochiq bo'lsa, o'sha oynani faollashtiramiz va yo'naltiramiz
      for (const client of clientList) {
        if ('focus' in client) {
          if (targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Agar barcha oynalar yopiq bo'lsa, yangi oynada ochamiz
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
