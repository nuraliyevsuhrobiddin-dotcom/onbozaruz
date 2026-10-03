import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker(fetcher = async () => new Response('ok'), clients = {}) {
  const handlers = {}, writes = [], deleted = [];
  const opened = [], shown = [];
  const shell = new Response('<html>offline shell</html>');
  const cache = {
    put: async (key) => { writes.push(key); },
    match: async key => key === '/index.html' ? shell.clone() : undefined,
  };
  runInNewContext(source, {
    URL, Response,
    fetch: fetcher,
    self: {
      location: { origin: 'https://example.test' },
      clients: { claim: async () => {}, matchAll: async () => [], openWindow: async url => { opened.push(url); }, ...clients },
      registration: { showNotification: async (title, options) => { shown.push({ title, options }); } },
      addEventListener: (type, handler) => { handlers[type] = handler; },
    },
    caches: {
      open: async () => cache,
      keys: async () => ['onbozor-shell-v4', 'mollbazar-shell-v5', 'mollbazar-shell-v6', 'another-app'],
      delete: async key => { deleted.push(key); },
    },
  });
  async function request(path, options = {}) {
    const pending = [];
    let response;
    handlers.fetch({
      request: { url: `https://example.test${path}`, method: 'GET', mode: 'cors', destination: '', headers: new Headers(), ...options },
      waitUntil: promise => pending.push(promise), respondWith: promise => { response = promise; },
    });
    const value = await response;
    await Promise.all(pending);
    return value;
  }
  async function dispatch(type, event) {
    const pending = [];
    handlers[type]({ ...event, waitUntil: promise => pending.push(promise) });
    await Promise.all(pending);
  }
  return { request, writes, deleted, handlers, dispatch, opened, shown };
}

test('API, auth, media and Range requests bypass the service-worker cache', async () => {
  const { request, writes } = worker(() => { throw new Error('Should bypass worker'); });
  for (const path of ['/api/account', '/auth/callback']) assert.equal(await request(path), undefined);
  assert.equal(await request('/assets/movie.mp4', { destination: 'video' }), undefined);
  assert.equal(await request('/assets/movie.mp4', { headers: new Headers({ range: 'bytes=0-100' }) }), undefined);
  assert.equal(writes.length, 0);
});

test('Only navigation gets an HTML fallback while offline', async () => {
  const { request } = worker(async () => { throw new TypeError('offline'); });
  assert.match(await (await request('/profile', { mode: 'navigate' })).text(), /offline shell/);
  assert.equal((await request('/assets/missing.js')).type, 'error');
});

test('Server failures do not replace the cached application', async () => {
  const { request, writes } = worker(async () => new Response('unavailable', { status: 503 }));
  assert.equal((await request('/', { mode: 'navigate' })).status, 503);
  assert.equal(writes.length, 0);
});

test('Activation removes only obsolete MollBazar caches', async () => {
  const { handlers, deleted } = worker();
  let pending;
  handlers.activate({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(deleted, ['onbozor-shell-v4', 'mollbazar-shell-v5']);
});

test('Old worker navigation recovers to the app and never poisons its cache', async () => {
  const { request, writes } = worker(() => { throw new Error('Must redirect without fetching'); });
  const response = await request('/sw.js#home', { mode: 'navigate' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.test/#home');
  assert.deepEqual(writes, []);
  assert.equal(await request('/sw.js'), undefined);
});

test('Non-HTML documents cannot replace the offline app shell', async () => {
  const { request, writes } = worker(async () => new Response('const code = true', {
    headers: { 'Content-Type': 'application/javascript' },
  }));
  await request('/unexpected.js', { mode: 'navigate' });
  await request('/', { mode: 'navigate' });
  assert.deepEqual(writes, []);
});

test('Real HTML app navigation is cached', async () => {
  const { request, writes } = worker(async () => new Response('<html>app</html>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
  await request('/', { mode: 'navigate' });
  assert.deepEqual(writes, ['/index.html']);
});

for (const [url, expected] of [
  ['#home', '/#home'], ['/#market/order/123', '/#market/order/123'],
  ['/sw.js#profile/orders', '/#profile/orders'], ['https://evil.test/', '/'],
  ['javascript:alert(1)', '/'], ['/api/push/subscribe', '/'], [undefined, '/'],
]) {
  test(`Notification click opens the safe app URL for ${url}`, async () => {
    const { dispatch, opened } = worker();
    let closed = false;
    await dispatch('notificationclick', { notification: { data: { url }, close: () => { closed = true; } } });
    assert.ok(closed);
    assert.deepEqual(opened, [`https://example.test${expected}`]);
  });
}

test('Existing window navigation completes before focus', async () => {
  const calls = [];
  const client = {
    url: 'https://example.test/#home', focus: async () => { calls.push('focus'); },
    navigate: async url => { calls.push(url); return client; },
  };
  const { dispatch, opened } = worker(undefined, { matchAll: async () => [client] });
  await dispatch('notificationclick', { notification: { data: { url: '#profile/orders' }, close() {} } });
  assert.deepEqual(calls, ['https://example.test/#profile/orders', 'focus']);
  assert.deepEqual(opened, []);
});

test('Closing windows do not swallow the notification click', async () => {
  const { dispatch, opened } = worker(undefined, { matchAll: async () => [{
    url: 'https://example.test/', focus() {}, navigate: async () => { throw Error('Tab closed'); },
  }] });
  await dispatch('notificationclick', { notification: { data: { url: '#home' }, close() {} } });
  assert.deepEqual(opened, ['https://example.test/#home']);
});

test('Push uses a default title and converts fragment targets to absolute app URLs', async () => {
  const { dispatch, shown } = worker();
  await dispatch('push', { data: { json: () => ({ body: 'Hello', data: { url: '#home' } }) } });
  assert.equal(shown[0].title, 'MollBazar bildirishnomasi');
  assert.equal(shown[0].options.data.url, 'https://example.test/#home');
  await dispatch('push', { data: { json: () => null } });
  assert.equal(shown[1].title, 'MollBazar bildirishnomasi');
});
