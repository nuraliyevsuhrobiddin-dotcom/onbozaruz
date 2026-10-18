import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load(path, dependencies = {}, globals = {}, env = {}) {
  const context = createContext({ Buffer, URL, console, Date, process: { env: {} }, ...globals });
  const module = new SourceTextModule(stripTypeScriptTypes(await readFile(new URL(path, import.meta.url), 'utf8')), {
    context, initializeImportMeta(meta) { meta.env = env; },
  });
  await module.link(name => {
    if (!dependencies[name]) throw Error(`Unexpected import ${name}`);
    return new SyntheticModule(Object.keys(dependencies[name]), function () {
      for (const [key, value] of Object.entries(dependencies[name])) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const endpointPolicy = await load('../api/lib/pushEndpoint.ts');
test('Push endpoints reject internal hosts, lookalikes, credentials and nonstandard ports', () => {
  for (const endpoint of ['https://127.0.0.1/a', 'https://[::1]/', 'https://169.254.169.254/',
    'https://fcm.googleapis.com.attacker.test/a', 'https://attackerfcm.googleapis.com/',
    'https://fcm.googleapis.com@evil.test/', 'https://user:pass@fcm.googleapis.com/',
    'https://fcm.googleapis.com:8443/', 'http://fcm.googleapis.com/', 'https://evil.test/']) {
    assert.equal(endpointPolicy.isAllowedPushEndpoint(endpoint), false, endpoint);
  }
  for (const endpoint of ['https://fcm.googleapis.com/fcm/send/token', 'https://updates.push.services.mozilla.com/wpush/v2/token',
    'https://web.push.apple.com/token', 'https://abc.notify.windows.com/token']) {
    assert.equal(endpointPolicy.isAllowedPushEndpoint(endpoint), true, endpoint);
  }
  assert.equal(endpointPolicy.isValidPushKeys({ p256dh: 'fake', auth: 'fake' }), false);
});

for (const [name, result, expected] of [
  ['banned account', { data: { status: 'banned' } }, 403],
  ['missing profile', { data: null }, 403],
  ['profile lookup failure', { error: { message: 'offline' } }, 503],
  ['active account', { data: { status: 'active' } }, 200],
]) {
  test(`Server authentication: ${name}`, async () => {
    let config, body;
    const api = await load('../api/lib/supabaseAuth.ts', {
      '@supabase/supabase-js': { createClient: (_url, _key, options) => {
        config = options;
        const query = { select: () => query, eq: () => query, maybeSingle: async () => result };
        return { auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, from: () => query };
      } },
    }, { process: { env: { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon' } } });
    const res = { statusCode: 200, setHeader() {}, end(value) { body = JSON.parse(value); } };
    const user = await api.requireAuthenticatedUser({ headers: { authorization: 'Bearer token' } }, res);
    assert.equal(config.global.headers.Authorization, 'Bearer token');
    assert.equal(res.statusCode, expected);
    assert.equal(Boolean(user), expected === 200);
    if (expected !== 200) assert.equal(body.ok, false);
  });
}

test('Welcome mail reserves a persistent slot before sending and fails closed', async () => {
  let reservation = { data: true }, sends = 0, response;
  const api = await load('../api/auth/send-welcome.ts', {
    '@supabase/supabase-js': { createClient: () => ({ rpc: async (name, args) => {
      assert.equal(name, 'claim_welcome_email'); assert.equal(args.p_user_id, 'user');
      return reservation;
    } }) },
    '../lib/resendClient': { DEFAULT_FROM_EMAIL: 'test@test.invalid', getResendClient: () => ({ emails: { send: async () => {
      sends++; return { data: { id: 'email' } };
    } } }) },
    '../lib/emailTemplates': { getWelcomeEmailTemplate: () => ({ subject: 'welcome', html: 'welcome', text: 'welcome' }) },
    '../lib/supabaseAuth': {
      requireAuthenticatedUser: async () => ({ id: 'user', email: 'user@test.invalid', email_confirmed_at: '2026-10-18' }),
      getSupabaseServerConfig: () => ({ url: 'https://db.test', serviceRoleKey: 'secret' }),
      sendApiJson: (_res, status, body) => { response = { status, body }; },
    },
  });
  const invoke = () => api.default({ method: 'POST' }, { setHeader() {} });
  await invoke(); assert.equal(response.status, 200); assert.equal(sends, 1);
  reservation = { data: false };
  await invoke(); assert.equal(response.status, 429); assert.equal(sends, 1);
  reservation = { error: { message: 'database unavailable' } };
  await invoke(); assert.equal(response.status, 503); assert.equal(sends, 1);
});

test('Anonymous listing reads and expired-token retries use redacted views', async () => {
  let token = null; const requests = [];
  const api = await load('../src/api/http.ts', {
    './mockServer': { mockServer: {} },
    './authClient': { isSupabaseConfigured: true, getSupabaseAccessToken: async () => token },
  }, { URLSearchParams, fetch: async (url, options) => {
    requests.push({ url, options });
    if (options.headers.Authorization === 'Bearer stale') return new Response('{}', { status: 401 });
    return Response.json([]);
  } }, { VITE_SUPABASE_URL: 'https://db.test', VITE_SUPABASE_ANON_KEY: 'anon' });
  await api.api.get('/posts');
  assert.match(requests.at(-1).url, /\/posts_public\?/);
  await api.api.get('/products');
  assert.match(requests.at(-1).url, /\/products_public\?/);
  token = 'stale'; await api.api.get('/posts');
  assert.match(requests.at(-2).url, /\/posts\?/);
  assert.match(requests.at(-1).url, /\/posts_public\?/);
});
