/**
 * On-device video compression before upload, the way Instagram and TikTok do it.
 *
 * Phones record 1080p/4K at 10–50 Mbit/s, far more than a phone screen or a
 * mobile connection needs. The listing video is re-encoded with the phone's own
 * hardware encoder (WebCodecs, through Mediabunny) into:
 *   - H.264 (plays everywhere, unlike iPhone HEVC or WebM),
 *   - at most 1280 px on the long side (720p for vertical video), at most 30 fps,
 *   - ~2.5 Mbit/s variable bitrate (scaled down for smaller frames): sharp on a
 *     phone screen, yet 4–10× smaller than what phone cameras record,
 *   - AAC audio, copied untouched when the source already uses AAC,
 *   - a "fast start" MP4, so playback can begin before the whole file arrives.
 *
 * Anything unexpected returns `null` and the caller uploads the original file:
 * compression must never cost a listing or its sound.
 */

export const VIDEO_MAX_SIDE = 1280;
export const VIDEO_TARGET_BITRATE = 2_500_000;
const VIDEO_MIN_BITRATE = 1_000_000;
const VIDEO_MAX_FPS = 30;
/**
 * Videos that are already web-friendly (H.264, at most 1280 px, at most this
 * bitrate) are uploaded untouched: every re-encode loses detail, and at 1.2 Mbit/s
 * re-encoded 720p videos looked visibly blurry.
 */
const SKIP_BELOW_BITRATE = 4_500_000;
/** A result must save at least this share of the size, or the original is kept. */
const MIN_SAVING = 0.15;

export interface CompressedVideo {
  file: File;
  originalSize: number;
  width: number;
  height: number;
  duration: number;
}

export type CompressOutcome =
  | { kind: 'compressed'; video: CompressedVideo }
  | { kind: 'skipped'; reason: 'unsupported' | 'already-small' | 'no-gain' | 'would-lose-audio' | 'undecodable' };

/** Cheap synchronous check used when the file is picked (no library download). */
export function canCompressVideoHere(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder === 'function'
    && typeof (window as unknown as { VideoDecoder?: unknown }).VideoDecoder === 'function';
}

/** Starts downloading the compressor early (when the create form opens), so picking a video starts at once. */
export function preloadVideoCompressor(): void {
  if (canCompressVideoHere()) void import('mediabunny').catch(() => {});
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Output size: the long side capped at VIDEO_MAX_SIDE, aspect ratio kept, even numbers for H.264. */
export function targetSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, VIDEO_MAX_SIDE / Math.max(width, height));
  return { width: even(width * scale), height: even(height * scale) };
}

/** Bitrate for the output frame: 2.5 Mbit/s at 720×1280, proportionally less for smaller frames. */
export function targetBitrate(width: number, height: number): number {
  const share = (width * height) / (720 * 1280);
  return Math.round(Math.min(VIDEO_TARGET_BITRATE, Math.max(VIDEO_MIN_BITRATE, VIDEO_TARGET_BITRATE * share)));
}

export async function compressVideo(
  file: File,
  options: { onProgress?: (share: number) => void; signal?: AbortSignal } = {},
): Promise<CompressOutcome> {
  if (!canCompressVideoHere()) return { kind: 'skipped', reason: 'unsupported' };
  const mb = await import('mediabunny');
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return { kind: 'skipped', reason: 'undecodable' };
    if (!(await videoTrack.canDecode())) return { kind: 'skipped', reason: 'undecodable' };
    const audioTrack = await input.getPrimaryAudioTrack();
    const duration = await input.computeDuration();
    if (!duration || !Number.isFinite(duration)) return { kind: 'skipped', reason: 'undecodable' };

    const { width, height } = targetSize(videoTrack.displayWidth, videoTrack.displayHeight);
    const bitrate = targetBitrate(width, height);
    const stats = await videoTrack.computePacketStats(120);
    const sourceFps = stats.averagePacketRate;
    const sourceBitrate = (file.size * 8) / duration;

    const alreadySmall = videoTrack.codec === 'avc'
      && Math.max(videoTrack.displayWidth, videoTrack.displayHeight) <= VIDEO_MAX_SIDE
      && sourceBitrate <= SKIP_BELOW_BITRATE
      && (!audioTrack || audioTrack.codec === 'aac');
    if (alreadySmall) return { kind: 'skipped', reason: 'already-small' };

    const quality = new mb.Quality({ bitrate, bitrateMode: 'variable' });
    if (!(await mb.canEncodeVideo('avc', { width, height, quality }))) {
      return { kind: 'skipped', reason: 'unsupported' };
    }

    const target = new mb.BufferTarget();
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: 'avc',
        width,
        height,
        fit: 'contain',
        // Bake the phone's rotation into the pixels: every player then shows it upright.
        allowTransformationMetadata: false,
        frameRate: sourceFps > VIDEO_MAX_FPS + 1 ? VIDEO_MAX_FPS : undefined,
        quality,
        forceTranscode: true,
      },
      // AAC sources are copied as they are; anything else is encoded to AAC.
      audio: { codec: 'aac' },
    });

    // A video must never lose its sound or picture just to become smaller.
    const lost = conversion.discardedTracks.filter((t) => t.reason !== 'discarded_by_user');
    if (!conversion.isValid || lost.some((t) => t.track.type === 'video')) return { kind: 'skipped', reason: 'unsupported' };
    if (lost.some((t) => t.track.type === 'audio')) return { kind: 'skipped', reason: 'would-lose-audio' };

    const abort = () => { void conversion.cancel(); };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.onProgress) conversion.onProgress = (share) => options.onProgress?.(share);
    try {
      await conversion.execute();
    } finally {
      options.signal?.removeEventListener('abort', abort);
    }
    if (options.signal?.aborted) throw new DOMException('Video tayyorlash bekor qilindi', 'AbortError');

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength < 1024) return { kind: 'skipped', reason: 'undecodable' };
    if (buffer.byteLength > file.size * (1 - MIN_SAVING)) return { kind: 'skipped', reason: 'no-gain' };

    const name = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    return {
      kind: 'compressed',
      video: {
        file: new File([buffer], name, { type: 'video/mp4' }),
        originalSize: file.size,
        width,
        height,
        duration,
      },
    };
  } finally {
    input.dispose();
  }
}
