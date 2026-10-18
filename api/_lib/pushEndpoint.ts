/** Only browser push providers may receive requests from the delivery server. */
export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false;
    return url.hostname === 'fcm.googleapis.com'
      || url.hostname === 'updates.push.services.mozilla.com'
      || url.hostname === 'web.push.apple.com'
      || url.hostname === 'wns.windows.com'
      || url.hostname.endsWith('.notify.windows.com');
  } catch {
    return false;
  }
}

export function isValidPushKeys(keys: unknown): keys is { p256dh: string; auth: string } {
  if (!keys || typeof keys !== 'object') return false;
  const { p256dh, auth } = keys as Record<string, unknown>;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return false;
  if (!/^[A-Za-z0-9_-]{87}=?$/.test(p256dh) || !/^[A-Za-z0-9_-]{22}(==)?$/.test(auth)) return false;
  const publicKey = Buffer.from(p256dh, 'base64url');
  return publicKey.length === 65 && publicKey[0] === 4 && Buffer.from(auth, 'base64url').length === 16;
}
