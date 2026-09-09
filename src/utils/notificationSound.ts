/**
 * Notification chime & Sound System.
 *
 * Synthesized via Web Audio API + HTML5 Audio fallback.
 * Works offline, zero external assets, crystal clear sound.
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
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Auto-unlock Web Audio API context on first user interaction.
 * Crucial for iOS Safari & strict mobile browsers: plays a 1-sample silent buffer.
 */
export function initNotificationAudio(): void {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isAudioUnlocked = true;
      }
    } catch {
      // Ignore unlock failure
    } finally {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
  };

  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('pointerdown', unlock, { passive: true, once: true });
  window.addEventListener('keydown', unlock, { passive: true, once: true });
}

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
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    // Ignore tone scheduling errors
  }
}

function playChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // Tone 1: G5 (783.99 Hz)
  playHarmonicTone(ctx, 783.99, now, 0.16, 0.28);
  // Tone 2: C6 (1046.50 Hz)
  playHarmonicTone(ctx, 1046.50, now + 0.08, 0.18, 0.32);
  // Tone 3: E6 (1318.51 Hz) harmonic sparkle
  playHarmonicTone(ctx, 1318.51, now + 0.16, 0.26, 0.25);
}

/**
 * Standalone WAV data URI fallback
 */
let cachedWavUri: string | null = null;
function getFallbackWavUri(): string {
  if (cachedWavUri) return cachedWavUri;
  const sampleRate = 22050;
  const duration = 0.45;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Synthesize 3 harmonic bell tones
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // G5 (784Hz) from 0.00 to 0.25
    if (t >= 0 && t < 0.25) {
      const decay = Math.exp(-t * 14);
      sample += 0.4 * Math.sin(2 * Math.PI * 784 * t) * decay;
    }
    // C6 (1046Hz) from 0.08 to 0.35
    if (t >= 0.08 && t < 0.35) {
      const dt = t - 0.08;
      const decay = Math.exp(-dt * 14);
      sample += 0.45 * Math.sin(2 * Math.PI * 1046 * dt) * decay;
    }
    // E6 (1318Hz) from 0.16 to 0.45
    if (t >= 0.16 && t < 0.45) {
      const dt = t - 0.16;
      const decay = Math.exp(-dt * 12);
      sample += 0.4 * Math.sin(2 * Math.PI * 1318 * dt) * decay;
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

function playAudioFallback(): void {
  try {
    const uri = getFallbackWavUri();
    const audio = new Audio(uri);
    audio.volume = 0.6;
    void audio.play().catch(() => {});
  } catch {
    // Ignore audio failure
  }
}

/**
 * Plays a pleasant, modern, high-fidelity notification sound (G5 -> C6 -> E6 chime)
 * with vibration on supported mobile devices.
 */
export function playNotificationSound(): void {
  // Trigger mobile vibration feedback if supported
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {
    // Ignore vibration failure
  }

  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          playChime(ctx);
        }).catch(() => {
          playAudioFallback();
        });
        return;
      }
      playChime(ctx);
      return;
    }
  } catch {
    // Fallback to HTML5 Audio
  }
  playAudioFallback();
}
