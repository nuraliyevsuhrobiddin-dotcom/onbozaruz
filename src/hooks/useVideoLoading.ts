import { useEffect, type RefObject } from 'react';

/**
 * Network hygiene for <video> elements on phones.
 *
 * A <video> keeps downloading after React removes its `src` prop or even
 * unmounts it, until the element is reset with `load()`. Off-screen videos
 * then compete with the one being watched for the same mobile bandwidth,
 * which is what made playback stutter.
 */

/** Stops the download when `src` is dropped, the element is replaced (retry) or unmounted. */
export function useReleaseVideo(ref: RefObject<HTMLVideoElement | null>, src: string | undefined, retryKey: number) {
  useEffect(() => {
    const video = ref.current;
    if (!video || src) return;
    if (video.currentSrc || video.getAttribute('src')) release(video);
  }, [ref, src]);

  useEffect(() => {
    const video = ref.current;
    return () => {
      if (video) release(video);
    };
  }, [ref, retryKey]);
}

function release(video: HTMLVideoElement) {
  try {
    video.pause();
    video.removeAttribute('src');
    video.load();
  } catch {
    // A detached element may refuse; it is going away anyway.
  }
}

/** Seconds buffered ahead of the playhead (the whole rest counts when fully buffered). */
export function bufferedAhead(video: HTMLVideoElement): number {
  const t = video.currentTime;
  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    if (start <= t + 0.3 && end > t) {
      if (Number.isFinite(video.duration) && end >= video.duration - 0.5) return Infinity;
      return end - t;
    }
  }
  return 0;
}

/**
 * Calls `onHealthy` once the active video has `seconds` buffered ahead.
 * Until then neighbours stay unloaded, so the visible video gets all bandwidth.
 */
export function useBufferHealth(
  ref: RefObject<HTMLVideoElement | null>,
  src: string | undefined,
  active: boolean,
  retryKey: number,
  onHealthy: (() => void) | undefined,
  seconds = 8,
) {
  useEffect(() => {
    const video = ref.current;
    if (!video || !src || !active || !onHealthy) return;
    let done = false;
    const check = () => {
      if (done || bufferedAhead(video) < seconds) return;
      done = true;
      onHealthy();
    };
    check();
    video.addEventListener('progress', check);
    video.addEventListener('timeupdate', check);
    return () => {
      done = true;
      video.removeEventListener('progress', check);
      video.removeEventListener('timeupdate', check);
    };
  }, [ref, src, active, retryKey, onHealthy, seconds]);
}
