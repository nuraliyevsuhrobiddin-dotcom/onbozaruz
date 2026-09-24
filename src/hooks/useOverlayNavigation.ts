import { useCallback, useEffect, useRef } from 'react';

type Overlay = { id: string; close: () => void; previousState: unknown; url: string };
const overlays: Overlay[] = [];
let sequence = 0;
const marker = '__onbozarOverlay';

function handleBack(event: PopStateEvent) {
  const top = overlays.at(-1);
  if (!top || event.state?.[marker] === top.id) return;
  // A history jump may cross several stacked dialogs, or leave their page.
  const destination = overlays.findIndex(overlay => overlay.id === event.state?.[marker]);
  const dismissed = overlays.splice(destination + 1);
  dismissed.reverse().forEach(overlay => overlay.close());
  if (location.href === top.url) event.stopImmediatePropagation();
}

function dismiss(overlay: Overlay) {
  if (overlays.at(-1) === overlay && history.state?.[marker] === overlay.id) history.back();
  else overlay.close();
}

function handleEscape(event: KeyboardEvent) {
  const top = overlays.at(-1);
  if (!top || event.key !== 'Escape') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  dismiss(top);
}

/** A single Back/Escape handler for stacked dialogs, sheets and Reels. */
export function useOverlayNavigation(isOpen: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const entryRef = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // StrictMode's initial setup/cleanup must not create duplicate entries.
    queueMicrotask(() => {
      if (cancelled) return;
      const entry: Overlay = {
        id: `overlay-${++sequence}`,
        close: () => closeRef.current(),
        previousState: history.state,
        url: location.href,
      };
      entryRef.current = entry;
      if (!overlays.length) {
        window.addEventListener('popstate', handleBack, true);
        window.addEventListener('keydown', handleEscape, true);
      }
      overlays.push(entry);
      history.pushState({ ...history.state, [marker]: entry.id }, '');
    });

    return () => {
      cancelled = true;
      const entry = entryRef.current;
      entryRef.current = null;
      if (entry) {
        const index = overlays.indexOf(entry);
        if (index !== -1) overlays.splice(index, 1);
        // A lower dialog can unmount while another dialog remains open.
        for (const remaining of overlays) {
          if ((remaining.previousState as Record<string, unknown> | null)?.[marker] === entry.id) {
            remaining.previousState = entry.previousState;
          }
        }
        // Programmatic unmounts (e.g. opening auth) must not navigate the page.
        if (history.state?.[marker] === entry.id) history.replaceState(entry.previousState, '');
      }
      if (!overlays.length) {
        window.removeEventListener('popstate', handleBack, true);
        window.removeEventListener('keydown', handleEscape, true);
      }
    };
  }, [isOpen]);

  return useCallback(() => {
    if (entryRef.current) dismiss(entryRef.current);
    else closeRef.current();
  }, []);
}
