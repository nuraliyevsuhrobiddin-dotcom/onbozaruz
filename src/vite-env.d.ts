/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API address; defaults to `/api` on the same site. */
  readonly VITE_API_URL?: string;
  /** Public, non-secret API key; defaults to the PHP API's anonymous key. */
  readonly VITE_API_PUBLIC_KEY?: string;
  /** Public half of the Web Push VAPID pair (optional). */
  readonly VITE_WEB_PUSH_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
