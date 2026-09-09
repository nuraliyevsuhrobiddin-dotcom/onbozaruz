import { useState, useEffect } from 'react';

export interface NetworkInfo {
  isSlowConnection: boolean;
  saveData: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
}

export function useNetworkStatus(): NetworkInfo {
  const getInfo = (): NetworkInfo => {
    if (typeof navigator === 'undefined') {
      return { isSlowConnection: false, saveData: false, effectiveType: 'unknown' };
    }

    const conn = (navigator as unknown as {
      connection?: {
        effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
        saveData?: boolean;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }).connection;

    if (!conn) {
      return { isSlowConnection: false, saveData: false, effectiveType: 'unknown' };
    }

    const effectiveType = conn.effectiveType || 'unknown';
    const saveData = Boolean(conn.saveData);
    const isSlow = saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

    return { isSlowConnection: isSlow, saveData, effectiveType };
  };

  const [status, setStatus] = useState<NetworkInfo>(getInfo);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const conn = (navigator as unknown as {
      connection?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }).connection;

    if (!conn?.addEventListener) return;

    const handler = () => setStatus(getInfo());
    conn.addEventListener('change', handler);
    return () => conn.removeEventListener?.('change', handler);
  }, []);

  return status;
}
