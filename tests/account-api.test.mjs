// node --experimental-vm-modules --test tests/account-api.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function loadAuth({ fetch = async () => { throw new Error('Unexpected network request'); }, profileResult } = {}) {
  const calls = { signOut: 0, writes: 0 };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'test-token', user: { id: 'test-user' } } } }),
      getUser: async () => ({ data: { user: { id: 'test-user', email: 'test@example.test', user_metadata: { name: 'Old signup name' } } } }),
      signOut: async () => { calls.signOut++; return {}; },
    },
    from: () => {
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: async () => profileResult,
        single: async () => profileResult,
        insert: () => { calls.writes++; return query; },
        upsert: () => { calls.writes++; return query; },
        delete: () => { calls.writes++; return query; },
      };
      return query;
    },
  };
  const context = createContext({ fetch, console, URL, Date, setTimeout, clearTimeout });
  const code = stripTypeScriptTypes(await readFile(new URL('../src/api/authClient.ts', import.meta.url), 'utf8'));
  const module = new SourceTextModule(code, {
    context,
    initializeImportMeta(meta) { meta.env = { VITE_SUPABASE_URL: 'https://test.invalid', VITE_SUPABASE_ANON_KEY: 'fake-test-key' }; },
  });
  await module.link(specifier => {
    const exports = specifier === '@supabase/supabase-js' ? { createClient: () => client }
      : specifier === 'tus-js-client' ? { Upload: class {} } : { processAndCompressImage: () => {} };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return { auth: module.namespace.authClient, calls, client };
}

for (const [name, response] of [
  ['missing endpoint', () => new Response('{}', { status: 404 })],
  ['unavailable service', () => new Response('{}', { status: 503 })],
  ['HTML fallback with HTTP 200', () => new Response('<html>app</html>')],
  ['explicit failure with HTTP 200', () => Response.json({ ok: false })],
  ['network failure', () => { throw new TypeError('Failed to fetch'); }],
]) {
  test(`Account deletion: ${name} cannot delete the profile or report success`, async () => {
    const { auth, calls } = await loadAuth({ fetch: async () => response() });
    await assert.rejects(auth.deleteAccount());
    assert.equal(calls.writes, 0);
    assert.equal(calls.signOut, 0);
  });
}

test('Confirmed server deletion signs out without deleting profiles on the client', async () => {
  const { auth, calls } = await loadAuth({ fetch: async (url, options) => {
    assert.equal(url, '/api/account/delete');
    assert.equal(options.method, 'POST');
    return Response.json({ ok: true });
  } });
  await auth.deleteAccount();
  assert.equal(calls.signOut, 1);
  assert.equal(calls.writes, 0);
});

test('Profile read failure cannot overwrite profile data with signup metadata', async () => {
  const { auth, calls } = await loadAuth({ profileResult: { data: null, error: { message: 'Network unavailable' } } });
  await assert.rejects(auth.restoreSession());
  assert.equal(calls.writes, 0);
});

test('Restoring a profile uses saved values and requires the DB admin flag', async () => {
  const { auth, calls } = await loadAuth({ profileResult: { data: { name: 'Updated name', handle: 'updated' }, error: null } });
  const user = await auth.restoreSession();
  assert.equal(user.name, 'Updated name');
  assert.equal(user.isAdmin, false);
  assert.equal(calls.writes, 0);
});

test('Logout surfaces the server error instead of reporting a false logout', async () => {
  const { auth, client } = await loadAuth();
  client.auth.signOut = async () => ({ error: { message: 'Network unavailable' } });
  await assert.rejects(auth.signOut());
});
