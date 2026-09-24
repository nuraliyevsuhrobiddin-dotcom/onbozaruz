import { useLayoutEffect, useState, type RefObject } from 'react';

/** Keep the poster visible until this media element has presented a frame. */
export function useVideoFrame(
  ref: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  retryKey: number,
) {
  const [hasFrame, setHasFrame] = useState(false);

  useLayoutEffect(() => {
    const video = ref.current;
    setHasFrame(false);
    if (!video || !src) return;

    let cancelled = false;
    let frameId: number | undefined;
    const supportsFrameCallback = typeof video.requestVideoFrameCallback === 'function';
    const markFrame = () => {
      frameId = undefined;
      if (!cancelled && video.readyState >= 2 && video.videoWidth > 0) setHasFrame(true);
    };
    const watchFrame = () => {
      if (supportsFrameCallback) {
        if (frameId === undefined) frameId = video.requestVideoFrameCallback(markFrame);
      } else if (video.readyState >= 2) {
        markFrame();
      }
    };
    const reset = () => {
      setHasFrame(false);
      if (frameId !== undefined) video.cancelVideoFrameCallback(frameId);
      frameId = undefined;
      watchFrame();
    };
    video.addEventListener('emptied', reset);
    video.addEventListener('loadeddata', watchFrame);
    video.addEventListener('playing', watchFrame);
    watchFrame();
    return () => {
      cancelled = true;
      if (frameId !== undefined) video.cancelVideoFrameCallback(frameId);
      video.removeEventListener('emptied', reset);
      video.removeEventListener('loadeddata', watchFrame);
      video.removeEventListener('playing', watchFrame);
    };
  }, [ref, src, retryKey]);

  return hasFrame;
}
