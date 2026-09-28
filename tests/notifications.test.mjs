import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { timingSafeEqual } from 'node:crypto';

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
    '../api/authClient': { getSupabaseAccessToken: token },
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

test('Realtime reconnect, online and visible events recover missed rows and cleanup stops callbacks', async () => {
  const events = new Map();
  let status, insert, interval, refreshes = 0, received = 0, removed = false;
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
  };
  const window = {
    ...document, setInterval: fn => { interval = fn; return 7; }, clearInterval: id => assert.equal(id, 7),
  };
  const channel = {
    on: (_type, filter, fn) => { assert.equal(filter.filter, 'user_id=eq.user-1'); insert = fn; return channel; },
    subscribe: fn => { status = fn; return channel; },
  };
  const api = await load('../src/api/notificationsRealtime.ts', { window, document, navigator: { onLine: true } }, {
    './authClient': { supabaseClient: { channel: () => channel, removeChannel: async () => { removed = true; } } },
  });
  const stop = api.subscribeToNotifications('user-1', () => { received++; }, async () => { refreshes++; });
  status('SUBSCRIBED');
  await new Promise(resolve => setImmediate(resolve));
  await events.get('online')();
  document.visibilityState = 'hidden';
  await events.get('visibilitychange')();
  assert.equal(refreshes, 2);
  document.visibilityState = 'visible';
  await events.get('visibilitychange')();
  assert.equal(refreshes, 3);
  insert({ new: { id: 'n1', user_id: 'user-1' } });
  assert.equal(received, 1);
  stop();
  assert.ok(removed);
  assert.equal(events.size, 0);
  interval();
  insert({ new: { id: 'n2' } });
  assert.equal(received, 1);
  assert.equal(refreshes, 3);
});

async function delivery({ statusCode, secret = 'shared-secret' } = {}) {
  const sent = [], deleted = [];
  let response;
  const notification = { id: 'notification-1', user_id: 'user-1', title: 'Order', target_type: 'b2b_order', target_id: 'order-1' };
  const client = { from: table => {
    let deleting = false;
    const query = {
      select: () => query,
      eq: (key, value) => { if (deleting) deleted.push(value); return query; },
      maybeSingle: async () => ({ data: notification }),
      returns: async () => ({ data: [{ endpoint: 'https://push.test', p256dh: 'key', auth: 'auth' }] }),
      delete: () => { assert.equal(table, 'push_subscriptions'); deleting = true; return query; },
    };
    return query;
  } };
  const api = await load('../api/push/deliver.ts', {
    Buffer, process: { env: {
      WEB_PUSH_DELIVERY_SECRET: 'shared-secret', WEB_PUSH_VAPID_PUBLIC_KEY: 'public', WEB_PUSH_VAPID_PRIVATE_KEY: 'private',
    } }, console: { error() {} },
  }, {
    crypto: { timingSafeEqual },
    '@supabase/supabase-js': { createClient: () => client },
    'web-push': {
      setVapidDetails() {},
      sendNotification: async (_subscription, body) => {
        sent.push(JSON.parse(body));
        if (statusCode) throw { statusCode };
      },
    },
    '../lib/requestBody': { readJsonBody: async () => ({ notification_id: 'notification-1' }) },
    '../lib/supabaseAuth': {
      getSupabaseServerConfig: () => ({ url: 'https://db.test', serviceRoleKey: 'server-only' }),
      sendApiJson: (_res, status, body) => { response = { status, body }; },
    },
  });
  await api.default({ method: 'POST', headers: { 'x-onbozar-push-secret': secret } }, { setHeader() {} });
  return { response, sent, deleted };
}

test('Server push sends a root-relative order link', async () => {
  const { response, sent } = await delivery();
  assert.equal(response.status, 200);
  assert.equal(response.body.delivered, 1);
  assert.equal(sent[0].data.url, '/#market/order/order-1');
});

test('Server push rejects incorrect delivery credentials', async () => {
  const { response, sent } = await delivery({ secret: 'wrong' });
  assert.equal(response.status, 401);
  assert.equal(sent.length, 0);
});

test('Temporary push delivery failures are reported instead of hidden as success', async () => {
  const { response, deleted } = await delivery({ statusCode: 503 });
  assert.equal(response.status, 502);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.failed, 1);
  assert.equal(deleted.length, 0);
});

test('Expired push endpoints are removed', async () => {
  const { response, deleted } = await delivery({ statusCode: 410 });
  assert.equal(response.body.expired, 1);
  assert.deepEqual(deleted, ['https://push.test']);
});
