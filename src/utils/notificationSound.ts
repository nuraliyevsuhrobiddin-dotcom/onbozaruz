/**
 * Notification chime & Sound System for OnBozar.
 *
 * Optimized for mobile phone speakers (loud, crystal clear, pleasant)
 * with haptic vibration support and instant audio unlocking.
 *
 * Employs a multi-layered approach:
 * 1. Web Audio API (dynamic harmonic glass chime, loud & clear)
 * 2. Preloaded HTML5 Audio element (/notification.wav) fallback
 * 3. Synthesized base64 WAV fallback
 * 4. Hardware vibration motor feedback on mobile devices
 */

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;
let preloadedAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Preload the audio element so mobile devices have it ready in memory
 */
function getPreloadedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!preloadedAudio) {
    try {
      preloadedAudio = new Audio('/notification.wav');
      preloadedAudio.preload = 'auto';
      preloadedAudio.volume = 0.9;
    } catch {
      preloadedAudio = null;
    }
  }
  return preloadedAudio;
}

/**
 * Unlocks audio on mobile phones (iOS Safari & Android Chrome)
 * Can be called explicitly during user click/tap (e.g. test button, notification drawer)
 */
export function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      isAudioUnlocked = true;
    }

    // Also prime the HTML5 audio element
    const audio = getPreloadedAudio();
    if (audio) {
      audio.load();
    }
  } catch {
    // Ignore unlock errors
  }
}

/**
 * Auto-unlock Web Audio API context on first user interaction.
 */
export function initNotificationAudio(): void {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    unlockAudioContext();
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('pointerdown', unlock, { passive: true, once: true });
  window.addEventListener('keydown', unlock, { passive: true, once: true });
}

if (typeof window !== 'undefined') {
  initNotificationAudio();
}

/**
 * Schedule tone with harmonic warmth and exponential decay
 */
function playHarmonicTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number
): void {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Add gentle 2nd harmonic for rich projection on small smartphone speakers
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(volume * 0.28, startTime + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime);
    osc2.stop(startTime + duration * 0.7);
  } catch {
    // Ignore tone scheduling errors
  }
}

/**
 * 3-note harmonic glass chime (G5 -> C6 -> E6) with optimal acoustic presence
 */
function playChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // Note 1: G5 (783.99 Hz)
  playHarmonicTone(ctx, 783.99, now, 0.22, 0.75);
  // Note 2: C6 (1046.50 Hz)
  playHarmonicTone(ctx, 1046.50, now + 0.08, 0.26, 0.85);
  // Note 3: E6 (1318.51 Hz) - clear bright finish
  playHarmonicTone(ctx, 1318.51, now + 0.16, 0.38, 0.9);
}

/**
 * Plays the preloaded WAV file
 */
function playWavFallback(): boolean {
  try {
    const audio = new Audio('/notification.wav');
    audio.volume = 0.95;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSynthesizedBase64Wav();
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Standalone synthetic base64 WAV emergency fallback
 */
let cachedWavUri: string | null = null;
function getFallbackWavUri(): string {
  if (cachedWavUri) return cachedWavUri;
  const sampleRate = 22050;
  const duration = 0.45;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    if (t >= 0 && t < 0.25) {
      sample += 0.6 * Math.sin(2 * Math.PI * 784 * t) * Math.exp(-t * 12);
    }
    if (t >= 0.08 && t < 0.35) {
      sample += 0.7 * Math.sin(2 * Math.PI * 1046 * (t - 0.08)) * Math.exp(-(t - 0.08) * 12);
    }
    if (t >= 0.16 && t < 0.45) {
      sample += 0.8 * Math.sin(2 * Math.PI * 1318 * (t - 0.16)) * Math.exp(-(t - 0.16) * 10);
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedWavUri = `data:audio/wav;base64,${btoa(binary)}`;
  return cachedWavUri;
}

function playSynthesizedBase64Wav(): void {
  try {
    const uri = getFallbackWavUri();
    const audio = new Audio(uri);
    audio.volume = 0.85;
    void audio.play().catch(() => {});
  } catch {
    // Ignore failure
  }
}

/**
 * Triggers mobile device hardware vibration
 */
export function triggerHapticVibration(pattern: number[] = [150, 75, 150]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore vibration failure
  }
}

/**
 * Plays a pleasant, modern, high-fidelity notification sound (G5 -> C6 -> E6 chime)
 * with tactile phone vibration.
 */
export function playNotificationSound(): void {
  // 1. Tactile mobile vibration
  triggerHapticVibration([120, 60, 120]);

  // 2. Play audible chime
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          playChime(ctx);
        }).catch(() => {
          playWavFallback();
        });
        return;
      }
      playChime(ctx);
      return;
    }
  } catch {
    // Fallback if Web Audio context errors
  }

  // 3. Fallback to HTML5 Audio
  playWavFallback();
}
