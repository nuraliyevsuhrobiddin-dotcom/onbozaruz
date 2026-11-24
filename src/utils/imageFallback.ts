/**
 * App-wide safety net for images: a missing or broken image URL shows a
 * neutral placeholder instead of the browser's broken-image icon and alt text.
 * Components that handle `onError` themselves still receive the event.
 */
const PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#f1f5f9"/>' +
      '<path d="M20 42l8-10 6 7 4-5 6 8z" fill="#cbd5e1"/>' +
      '<circle cx="26" cy="25" r="3.5" fill="#cbd5e1"/>' +
      '</svg>',
  );

export function installImageFallback(): void {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallback === '1') return;
      img.dataset.fallback = '1';
      img.removeAttribute('srcset');
      img.alt = '';
      img.src = PLACEHOLDER;
    },
    true, // image errors do not bubble; listen in the capture phase
  );
}
