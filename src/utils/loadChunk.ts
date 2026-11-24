/**
 * Loads a lazily split part of the app (a screen or the map).
 *
 * After a new release the file names of these parts change. A tab that was
 * opened before the release still asks for the old names; if those are gone the
 * import fails and React would show the error screen. One automatic reload
 * fetches the new version instead (the create-post form keeps its draft).
 * A short guard window prevents reload loops when the network is simply down.
 */
const RELOAD_KEY = 'mollbazar-reloaded-for-update';
const GUARD_MS = 30_000;

export async function loadChunk<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    } catch {
      // Storage may be blocked; then reload at most once per page view below.
    }
    if (Date.now() - last > GUARD_MS && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      window.location.reload();
      // Keep the suspended screen as it is until the reload replaces the page.
      return new Promise<T>(() => {});
    }
    throw error;
  }
}
