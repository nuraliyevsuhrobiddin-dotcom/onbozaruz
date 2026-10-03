import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = stripTypeScriptTypes(await readFile(new URL('../src/utils/brandStorage.ts', import.meta.url), 'utf8')).replace('export function', 'function');
function migrate(entries) {
  const data = new Map(entries);
  const storage = {
    get length() { return data.size; }, key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key),
  };
  runInNewContext(`${source}\nmigrateBrandStorage(storage);`, { storage });
  return data;
}
test('Brand migration preserves session and draft, keeps newer data and unrelated storage', () => {
  const data = migrate([
    ['onbozor-auth-session', '{"id":"existing-user"}'], ['onbozar-viewer-location', 'location'],
    ['onbozor-create-post-draft', 'draft'], ['onbozor-app-settings', 'old'], ['mollbazar-app-settings', 'new'], ['other-app', 'untouched'],
  ]);
  assert.equal(data.get('mollbazar-auth-session'), '{"id":"existing-user"}');
  assert.equal(data.get('mollbazar-viewer-location'), 'location');
  assert.equal(data.get('mollbazar-create-post-draft'), 'draft');
  assert.equal(data.get('mollbazar-app-settings'), 'new');
  assert.equal(data.get('other-app'), 'untouched');
  assert.equal(data.has('onbozor-auth-session'), false);
});
test('Unavailable storage cannot prevent app initialization', () => {
  assert.doesNotThrow(() => runInNewContext(source, { window: { get localStorage() { throw Error('blocked'); }, get sessionStorage() { throw Error('blocked'); } } }));
});
