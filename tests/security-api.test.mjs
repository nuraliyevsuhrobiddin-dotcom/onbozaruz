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

test('Anonymous listing reads and expired-token retries use redacted views', async () => {
  let token = null; const requests = [];
  const api = await load('../src/api/http.ts', {
    './authClient': { API_URL: 'https://db.test', API_PUBLIC_KEY: 'anon', getAccessToken: async () => token },
  }, { URLSearchParams, fetch: async (url, options) => {
    requests.push({ url, options });
    if (options.headers.Authorization === 'Bearer stale') return new Response('{}', { status: 401 });
    return Response.json([]);
  } });
  await api.api.get('/posts');
  assert.match(requests.at(-1).url, /\/posts_public\?/);
  await api.api.get('/products');
  assert.match(requests.at(-1).url, /\/products_public\?/);
  token = 'stale'; await api.api.get('/posts');
  assert.match(requests.at(-2).url, /\/posts\?/);
  assert.match(requests.at(-1).url, /\/posts_public\?/);
});
