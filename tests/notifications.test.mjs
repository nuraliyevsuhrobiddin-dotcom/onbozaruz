import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load(relativePath, globals, dependencies = {}, env = {}) {
  const context = createContext({ console, URL, Uint8Array, atob, AbortSignal, setTimeout, clearTimeout, ...globals });
  const code = stripTypeScriptTypes(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
  const module = new SourceTextModule(code, {
    context, initializeImportMeta(meta) { meta.env = env; },
  });
  await module.link(specifier => {
    const exports = dependencies[specifier];
    if (!exports) throw Error(`Unexpected import: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

async function push(fetcher, token = async () => 'token', extra = {}) {
  const subscription = { toJSON: () => ({ endpoint: 'https://push.test', keys: { auth: 'auth', p256dh: 'key' } }) };
  return load('../src/utils/webPush.ts', {
    window: { PushManager: {}, Notification: {} }, navigator: { serviceWorker: {} },
    Notification: { permission: 'granted' }, fetch: fetcher,
    console: { warn() {} }, ...extra,
  }, {
    '../api/authClient': { getAccessToken: token },
    './serviceWorker': { ensureServiceWorker: async () => ({ pushManager: { getSubscription: async () => subscription } }) },
  }, { VITE_WEB_PUSH_VAPID_PUBLIC_KEY: 'dGVzdA' });
}

for (const [name, response] of [
  ['HTML fallback', () => new Response('<html>app</html>')],
  ['server rejection', () => Response.json({ ok: false }, { status: 503 })],
  ['network failure', () => { throw Error('Offline'); }],
]) {
  test(`Push registration cannot report success for ${name}`, async () => {
    const api = await push(response);
    assert.equal(await api.syncWebPushSubscription(), false);
  });
}

test('Push registration requires the authenticated API acknowledgement', async () => {
  const api = await push(async (url, options) => {
    assert.equal(url, '/api/push/subscribe');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.equal(JSON.parse(options.body).endpoint, 'https://push.test');
    return Response.json({ ok: true }, { status: 201 });
  });
  assert.equal(await api.syncWebPushSubscription(), true);
});

test('Expired authentication is handled without an unhandled rejection', async () => {
  const api = await push(() => { throw Error('Must not fetch'); }, async () => { throw Error('Expired'); });
  assert.equal(await api.syncWebPushSubscription(), false);
});

test('Browsers without Notification support safely skip push registration', async () => {
  const api = await push(() => { throw Error('Must not fetch'); }, undefined, { window: { PushManager: {} }, Notification: undefined });
  assert.equal(await api.syncWebPushSubscription(), false);
});

test('Worker registration is shared between concurrent calls and can retry failures', async () => {
  let count = 0;
  const registration = { active: {} };
  const api = await load('../src/utils/serviceWorker.ts', {
    window: { isSecureContext: true },
    navigator: { serviceWorker: {
      ready: Promise.resolve(registration),
      register: async (url, options) => {
        count++;
        assert.equal(url, '/sw.js');
        assert.equal(options.updateViaCache, 'none');
        if (count === 1) throw Error('Temporary failure');
      },
    } }, console: { warn() {} },
  });
  const first = api.ensureServiceWorker();
  assert.equal(api.ensureServiceWorker(), first);
  assert.equal(await first, null);
  assert.equal(await api.ensureServiceWorker(), registration);
  assert.equal(count, 2);
});

test('Worker readiness times out and clears its timer', async () => {
  let timeout, cleared = false;
  const api = await load('../src/utils/serviceWorker.ts', {
    window: { isSecureContext: true },
    navigator: { serviceWorker: { register: async () => {}, ready: new Promise(() => {}) } },
    setTimeout: fn => { timeout = fn; return 1; }, clearTimeout: () => { cleared = true; },
  });
  const pending = api.ensureServiceWorker();
  await new Promise(resolve => setImmediate(resolve));
  timeout();
  assert.equal(await pending, null);
  assert.ok(cleared);
});

test('Notification polling refreshes on start, interval, online and visible events, and cleanup stops it', async () => {
  const events = new Map();
  let interval, refreshes = 0;
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
  };
  const window = {
    ...document, setInterval: fn => { interval = fn; return 7; }, clearInterval: id => assert.equal(id, 7),
  };
  const api = await load('../src/api/notificationsRealtime.ts', { window, document, navigator: { onLine: true } });
  const stop = api.subscribeToNotifications(async () => { refreshes++; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshes, 1);
  await events.get('online')();
  assert.equal(refreshes, 2);
  document.visibilityState = 'hidden';
  await events.get('visibilitychange')();
  assert.equal(refreshes, 2);
  document.visibilityState = 'visible';
  await events.get('visibilitychange')();
  interval();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshes, 4);
  stop();
  assert.equal(events.size, 0);
  interval();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshes, 4);
});


test('logout revokes the current browser push endpoint', async () => {
  let revoked = false;
  const api = await push(async () => Response.json({ ok: true }), undefined, {
    navigator: { serviceWorker: { getRegistration: async () => ({ pushManager: {
      getSubscription: async () => ({ unsubscribe: async () => { revoked = true; return true; } }),
    } }) } },
  });
  await api.unsubscribeWebPush();
  assert.equal(revoked, true);
});

test('logout surfaces failed push revocation instead of silently leaving an active endpoint', async () => {
  const api = await push(async () => Response.json({ ok: true }), undefined, {
    navigator: { serviceWorker: { getRegistration: async () => ({ pushManager: {
      getSubscription: async () => ({ unsubscribe: async () => false }),
    } }) } },
  });
  await assert.rejects(api.unsubscribeWebPush(), /uzib/);
});

test('logout without a browser push registration is safe', async () => {
  const api = await push(async () => Response.json({ ok: true }), undefined, {
    navigator: { serviceWorker: { getRegistration: async () => undefined } },
  });
  await api.unsubscribeWebPush();
});
