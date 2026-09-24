import { useLayoutEffect, useRef, type RefObject } from 'react';

/** A cancelled play request must never restart a slide that is now offscreen. */
export function useVideoPlayback(
  ref: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  active: boolean,
  muted: boolean,
  retryKey: number,
) {
  // Reattach during React StrictMode's effect replay as well as on retry.
  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (src) {
      if (video.getAttribute('src') !== src) video.setAttribute('src', src);
    } else {
      video.removeAttribute('src');
      video.load();
    }
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [ref, src, retryKey]);

  const mutedRef = useRef(muted);
  useLayoutEffect(() => {
    mutedRef.current = muted;
    const video = ref.current;
    if (video) {
      video.muted = !active || muted;
      video.volume = active && !muted ? 1 : 0;
    }
  }, [ref, active, muted, retryKey]);

  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;
    const pause = () => {
      video.muted = true;
      video.pause();
    };
    const play = async () => {
      if (cancelled || !active || !src || document.hidden) return;
      video.muted = mutedRef.current;
      video.volume = mutedRef.current ? 0 : 1;
      try {
        await video.play();
      } catch (error) {
        // AbortError is normal during rapid navigation; retrying it restarts
        // an obsolete video. Only an autoplay-policy rejection gets a fallback.
        if (cancelled || document.hidden || (error as DOMException).name !== 'NotAllowedError') return;
        video.muted = true;
        video.volume = 0;
        try { await video.play(); } catch { /* Tap-to-play remains available. */ }
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
      else void play();
    };
    if (active && src) {
      void play();
      document.addEventListener('visibilitychange', onVisibility);
    } else {
      pause();
    }
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      pause();
    };
  }, [ref, src, active, retryKey]);

}
