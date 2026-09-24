import { useEffect, useState, type RefObject } from 'react';

/** Keep the poster visible until this media element has presented a frame. */
export function useVideoFrame(
  ref: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  retryKey: number,
) {
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) {
      setHasFrame(false);
      return;
    }

    let cancelled = false;
    let rfcId: number | undefined;

    const markFrameReady = () => {
      if (cancelled) return;
      // readyState >= 2 (HAVE_CURRENT_DATA) or currentTime > 0 means a valid frame is ready
      if ((video.readyState >= 2 && video.videoWidth > 0) || video.currentTime > 0) {
        setHasFrame(true);
      }
    };

    // 1. Initial check (if video is already cached or decoded)
    markFrameReady();

    // 2. Hardware paint turn detection via requestVideoFrameCallback if available
    if (typeof video.requestVideoFrameCallback === 'function') {
      const onFrame = () => {
        rfcId = undefined;
        if (!cancelled && video.videoWidth > 0) {
          setHasFrame(true);
        }
      };
      rfcId = video.requestVideoFrameCallback(onFrame);
    }

    // 3. Fallback to standard HTML5 media events
    const onLoadedMetadata = () => {
      // Force mobile Safari to decode the first frame if paused at 0
      if (video.paused && video.currentTime === 0) {
        try {
          video.currentTime = 0.001;
        } catch {
          // Ignore if seek not allowed yet
        }
      }
      markFrameReady();
    };

    const mediaEvents = ['loadeddata', 'canplay', 'playing', 'timeupdate', 'seeked'];
    mediaEvents.forEach((evt) => video.addEventListener(evt, markFrameReady));
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    const onReset = () => {
      if (!cancelled) setHasFrame(false);
    };
    video.addEventListener('emptied', onReset);
    video.addEventListener('error', onReset);

    return () => {
      cancelled = true;
      if (rfcId !== undefined && typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(rfcId);
      }
      mediaEvents.forEach((evt) => video.removeEventListener(evt, markFrameReady));
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('emptied', onReset);
      video.removeEventListener('error', onReset);
    };
  }, [ref, src, retryKey]);

  return hasFrame;
}
