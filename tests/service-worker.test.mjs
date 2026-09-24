import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker(fetcher = async () => new Response('ok')) {
  const handlers = {}, writes = [], deleted = [];
  const shell = new Response('<html>offline shell</html>');
  const cache = {
    put: async (key) => { writes.push(key); },
    match: async key => key === '/index.html' ? shell.clone() : undefined,
  };
  runInNewContext(source, {
    URL, Response,
    fetch: fetcher,
    self: { location: { origin: 'https://example.test' }, addEventListener: (type, handler) => { handlers[type] = handler; } },
    caches: {
      open: async () => cache,
      keys: async () => ['onbozor-shell-v2', 'onbozor-shell-v3', 'another-app'],
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
  return { request, writes, deleted, handlers };
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

test('Activation removes only obsolete OnBozar caches', async () => {
  const { handlers, deleted } = worker();
  let pending;
  // This test inspects cache cleanup; clients.claim is unrelated.
  try { handlers.activate({ waitUntil: promise => { pending = promise; } }); } catch { /* clients unavailable in the test */ }
  await pending;
  assert.deepEqual(deleted, ['onbozor-shell-v2']);
});
