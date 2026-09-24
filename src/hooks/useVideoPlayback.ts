import { useEffect, useRef, type RefObject } from 'react';

/** A cancelled play request must never restart a slide that is now offscreen. */
export function useVideoPlayback(
  ref: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  active: boolean,
  muted: boolean,
  retryKey: number,
  onAutoplayMuted?: () => void,
) {
  const prevMutedRef = useRef(muted);
  const mutedRef = useRef(muted);
  const onAutoplayMutedRef = useRef(onAutoplayMuted);
  onAutoplayMutedRef.current = onAutoplayMuted;

  // Sync muted and volume states; when unmuting while active, trigger play.
  useEffect(() => {
    const wasMuted = prevMutedRef.current;
    prevMutedRef.current = muted;
    mutedRef.current = muted;

    const video = ref.current;
    if (!video) return;

    video.muted = !active || muted;
    video.volume = active && !muted ? 1 : 0;

    // Unmute while active and video is paused → resume playback immediately
    if (active && wasMuted && !muted && video.paused && !document.hidden) {
      void video.play().catch(() => {});
    }
  }, [ref, active, muted]);

  // Handle explicit retry reload
  useEffect(() => {
    if (retryKey > 0) {
      const video = ref.current;
      if (video) {
        try {
          video.load();
        } catch {
          // ignore
        }
      }
    }
  }, [ref, retryKey]);

  // Handle active playback and visibility
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    let cancelled = false;

    const pause = () => {
      // Pause immediately, aborting any pending play. A deferred pause from
      // an old effect can otherwise stop a newly active StrictMode player.
      video.pause();
    };

    const play = async () => {
      if (cancelled || !active || !src || document.hidden) return;

      const isMutedNow = mutedRef.current;
      video.muted = isMutedNow;
      video.volume = isMutedNow ? 0 : 1;

      try {
        await video.play();
      } catch (error) {
        if (cancelled || document.hidden) return;

        const err = error as DOMException;
        // Autoplay policy on mobile rejected unmuted playback: fallback to muted autoplay
        if (err?.name === 'NotAllowedError') {
          video.muted = true;
          video.volume = 0;
          onAutoplayMutedRef.current?.();
          try {
            await video.play();
          } catch {
            // A swipe or teardown can abort the muted fallback as well.
          }
        }
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        pause();
      } else if (active) {
        void play();
      }
    };

    if (active) {
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

