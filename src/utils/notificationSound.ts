/**
 * Notification chime.
 *
 * Synthesized via the Web Audio API instead of an audio file — no asset to
 * ship, works offline, and needs no licensing. A short two-note chime
 * (A5 -> E6).
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  return audioCtx;
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, volume: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.12, 0.16);
    playTone(ctx, 1318.5, now + 0.1, 0.16, 0.16);
  } catch {
    // Autoplay blocked or Web Audio unavailable — fail silently.
  }
}
