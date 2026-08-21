/**
 * Notification chime & Sound System.
 *
 * Synthesized via Web Audio API — works offline, zero external assets, crystal clear sound.
 * Plays a pleasant 3-tone harmonic glass chime (G5 -> C6 -> E6).
 */
let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/**
 * Auto-unlock Web Audio API context on first user interaction.
 * This ensures notifications will play sound even in strict mobile browser environments (iOS Safari, Android Chrome).
 */
export function initNotificationAudio(): void {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume().then(() => {
          isAudioUnlocked = true;
        });
      } else if (ctx && ctx.state === 'running') {
        isAudioUnlocked = true;
      }
    } catch {
      // Ignore unlock failure
    } finally {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    }
  };

  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('keydown', unlock, { passive: true, once: true });
}

// Auto-register on import
if (typeof window !== 'undefined') {
  initNotificationAudio();
}

function playHarmonicTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Gentle sine with slight triangular warmth
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Plays a pleasant, modern, high-fidelity notification sound (G5 -> C6 -> E6 chime)
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    // Tone 1: G5 (783.99 Hz)
    playHarmonicTone(ctx, 783.99, now, 0.15, 0.22);
    // Tone 2: C6 (1046.50 Hz)
    playHarmonicTone(ctx, 1046.50, now + 0.08, 0.18, 0.25);
    // Tone 3: E6 (1318.51 Hz) harmonic sparkle
    playHarmonicTone(ctx, 1318.51, now + 0.16, 0.28, 0.20);
  } catch {
    // Fail gracefully if Web Audio is blocked
  }
}

