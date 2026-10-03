// Runs before stores initialize; preserve existing data on the same origin.
export function migrateBrandStorage(storage: Storage): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) {
      if (!key || !/^(onbozor|onbozar)-/.test(key)) continue;
      const target = key.replace(/^(onbozor|onbozar)-/, 'mollbazar-');
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(target) === null) storage.setItem(target, value);
      storage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable or full; existing app fallbacks still apply.
  }
}

if (typeof window !== 'undefined') {
  try { migrateBrandStorage(window.localStorage); } catch { /* Browser policy. */ }
  try { migrateBrandStorage(window.sessionStorage); } catch { /* Browser policy. */ }
}
