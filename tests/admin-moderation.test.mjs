import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function repository(client, api = {}, env = {}) {
  const context = createContext({ console });
  const source = await readFile(new URL('../src/api/adminRepository.ts', import.meta.url), 'utf8');
  const module = new SourceTextModule(stripTypeScriptTypes(source), {
    context, initializeImportMeta(meta) { meta.env = env; },
  });
  const dependencies = {
    '../data/mockAgroData': { CATEGORIES: [] },
    './authClient': { supabaseClient: client },
    './http': { api, normalizeApiRow: rows => rows },
  };
  await module.link(name => {
    const exports = dependencies[name];
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace.adminRepository;
}

test('moderation loads every page including pending, rejected and expired listings', async () => {
  const rows = Array.from({ length: 501 }, (_, id) => ({ id: String(id), status: id % 2 ? 'pending' : 'rejected', expires_at: '2020-01-01' }));
  const ranges = [];
  const query = { select: () => query, order: () => query, range: async (from, to) => {
    ranges.push([from, to]); return { data: rows.slice(from, to + 1), error: null };
  } };
  const repo = await repository({ from: table => { assert.equal(table, 'posts'); return query; } });
  assert.equal((await repo.getPosts()).length, 501);
  assert.deepEqual(ranges, [[0, 499], [500, 999]]);
});

test('moderation propagates read failures instead of returning an empty queue', async () => {
  const query = { select: () => query, order: () => query, range: async () => ({ error: { message: 'Denied' } }) };
  await assert.rejects((await repository({ from: () => query })).getPosts(), /Denied/);
});

for (const operation of ['approve', 'delete']) {
  test(`${operation} rejects zero affected rows`, async () => {
    const query = { update: () => query, delete: () => query, eq: () => query, select: () => query,
      single: async () => ({ data: null, error: { message: 'No rows' } }) };
    const repo = await repository({ from: () => query });
    await assert.rejects(operation === 'approve' ? repo.updatePostModeration('missing', 'approved') : repo.deletePostByAdmin('missing'), /No rows/);
  });
}

test('approval verifies the returned status and clears rejection reason', async () => {
  let payload;
  const query = { update: value => { payload = value; return query; }, eq: () => query, select: () => query,
    single: async () => ({ data: { id: 'post', status: 'pending' }, error: null }) };
  const repo = await repository({ from: () => query });
  await assert.rejects(repo.updatePostModeration('post', 'approved'), /saqlanmadi/);
  assert.equal(payload.rejection_reason, '');
});

test('mock moderation persists via the same transport as listing creation', async () => {
  const calls = [];
  const repo = await repository(null, { patch: async (...args) => calls.push(args), delete: async (...args) => calls.push(args) });
  await repo.updatePostModeration('post', 'rejected', 'Sabab');
  await repo.deletePostByAdmin('post');
  assert.equal(calls[0][1].rejectionReason, 'Sabab');
  assert.equal(calls[1][0], '/posts/post');
});

async function storeActions(repository) {
  const source = await readFile(new URL('../src/store/useAgroStore.ts', import.meta.url), 'utf8');
  const start = source.indexOf('      deletePost: async');
  const end = source.indexOf('      deleteProduct:', start);
  let state = { currentUser: { id: 'owner' }, isAdminUser: false,
    posts: [{ id: 'post', userId: 'owner', title: 'Old', status: 'approved' }],
    productDetail: { id: 'post', title: 'Old' }, editModalItem: { id: 'post' } };
  const writes = [];
  const context = createContext({
    get: () => state, set: update => { state = { ...state, ...(typeof update === 'function' ? update(state) : update) }; },
    postsRepository: repository, cacheManager: { savePostsCache: rows => writes.push(rows) }, deleteListingMedia() {},
  });
  const module = new SourceTextModule(stripTypeScriptTypes(`export const actions = { ${source.slice(start, end)} };`), { context });
  await module.link(() => { throw Error('Unexpected import'); });
  await module.evaluate();
  return { actions: module.namespace.actions, state: () => state, writes };
}

for (const operation of ['update', 'remove']) {
  test(`failed ${operation} preserves listing, cache and open editor`, async () => {
    const store = await storeActions({ [operation]: async () => { throw Error('Offline'); } });
    const result = operation === 'update'
      ? await store.actions.updatePost('post', { title: 'New' })
      : await store.actions.deletePost('post');
    assert.equal(result, false);
    assert.equal(store.state().posts[0].title, 'Old');
    assert.equal(store.state().editModalItem.id, 'post');
    assert.equal(store.writes.length, 0);
  });
}

test('saved edit adopts the authoritative moderation status from server', async () => {
  const store = await storeActions({ update: async () => ({ id: 'post', title: 'New', status: 'pending' }) });
  assert.equal(await store.actions.updatePost('post', { title: 'New' }), true);
  assert.equal(store.state().posts[0].status, 'pending');
  assert.equal(store.state().productDetail.status, 'pending');
  assert.equal(store.state().editModalItem, null);
  assert.equal(store.writes.length, 1);
});

test('delete changes UI only after the server confirms success', async () => {
  let complete;
  const store = await storeActions({ remove: () => new Promise(resolve => { complete = resolve; }) });
  const pending = store.actions.deletePost('post');
  assert.equal(store.state().posts.length, 1);
  complete({ id: 'post' });
  assert.equal(await pending, true);
  assert.equal(store.state().posts.length, 0);
  assert.equal(store.state().productDetail, null);
});
