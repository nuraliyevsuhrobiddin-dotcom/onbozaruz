// Run `npm run dev`, open /tests/reels-audio.html, then click Run tests.
// Generates real media locally; no backend data or uploaded videos are needed.
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { VideoReelsViewer } from '../src/components/VideoReelsViewer';
import { VideoPlayer } from '../src/components/ui/VideoPlayer';
import { useAgroStore } from '../src/store/useAgroStore';
import type { Post } from '../src/api/types';
import '../src/index.css';

const results: string[] = [];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function until(check: () => boolean, message: string) {
  const start = performance.now();
  while (!check()) {
    if (performance.now() - start > 6000) throw new Error(message);
    await delay(20);
  }
}
function pass(message: string) { results.push(message); }
const slide = (index: number) => document.querySelector<HTMLElement>(`[data-index="${index}"]`)!;
const video = (index: number) => slide(index)?.querySelector('video');
const scrollContainer = () => slide(0).parentElement!;
const playing = () => [...document.querySelectorAll('video')].filter(v => !v.paused);
async function settled(index: number) {
  await until(() => Boolean(video(index) && !video(index)!.paused && video(index)!.readyState >= 2
    && !slide(index).querySelector('[data-video-placeholder]')), `Slide ${index} never presented a frame`);
  assert(playing().length === 1, 'More than one video is playing');
  assert(document.querySelectorAll('[data-index] video[src]').length <= 3, 'Too many attached sources');
}
async function go(index: number) {
  scrollContainer().scrollTop = index * scrollContainer().clientHeight;
  await settled(index);
}

async function run() {
  // Use a real decoder, instead of mocking readyState/play success.
  const canvas = document.createElement('canvas');
  canvas.width = 180; canvas.height = 320;
  const context = canvas.getContext('2d')!;
  const stream = canvas.captureStream(24);
  const audioContext = new AudioContext();
  await audioContext.resume();
  const destination = audioContext.createMediaStreamDestination();
  const oscillator = audioContext.createOscillator();
  oscillator.connect(destination);
  oscillator.start();
  destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
  const mimeType = ['video/webm;codecs=vp8', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const recorded = new Promise<Blob>(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
  });
  context.fillStyle = '#167c67';
  context.fillRect(0, 0, 180, 320);
  recorder.start(100);
  const paint = setInterval(() => {
    context.fillStyle = '#167c67'; context.fillRect(0, 0, 180, 320);
    context.fillStyle = '#ffffff'; context.fillText(String(Date.now()), 10, 150);
  }, 40);
  await delay(1200);
  recorder.stop(); clearInterval(paint); stream.getTracks().forEach(track => track.stop());
  oscillator.stop();
  await audioContext.close();
  const blob = await recorded;
  assert(blob.size > 1024, 'The browser did not record enough media for a decoder test');
  const urls = Array.from({ length: 9 }, () => URL.createObjectURL(blob));
  const posts = urls.map((mediaUrl, index) => ({
    id: `video-regression-${index}`, sellerId: 'fixture', sellerName: 'Fixture', sellerAvatar: '/logo.png',
    phone: '', title: `Video ${index}`, type: 'video', mediaUrl, location: 'Test', price: '0',
    likesCount: 0, commentsCount: 0, viewsCount: 0, categoryName: 'Test',
  } as Post));
  useAgroStore.setState({ posts: [], isVideoViewerOpen: false });
  const root = createRoot(document.getElementById('root')!);
  root.render(<StrictMode><div id="feed" style={{ width: 320 }}><VideoPlayer src={urls[0]} /></div><VideoReelsViewer /></StrictMode>);
  await until(() => {
    const feedVideo = document.querySelector<HTMLVideoElement>('#feed video');
    return Boolean(feedVideo && !feedVideo.paused && feedVideo.readyState >= 2);
  }, 'Feed did not autoplay in StrictMode');
  pass('Feed starts with actual decoded media under StrictMode');

  useAgroStore.getState().openVideoViewer(posts, 4);
  await settled(4);
  assert(!video(4)!.muted && video(4)!.volume === 1, 'Reels did not request sound on opening');
  const audioButton = () => document.querySelector<HTMLButtonElement>('button[title]')!;
  audioButton().click();
  await until(() => video(4)!.muted, 'Mute button did not silence the reel');
  await go(5);
  assert(video(5)!.muted, 'Explicit mute was lost on swipe');
  const volumeUp = new KeyboardEvent('keydown', { key: 'AudioVolumeUp', cancelable: true, bubbles: true });
  document.body.dispatchEvent(volumeUp);
  await until(() => !video(5)!.muted && video(5)!.volume === 1, 'Exposed volume-up key did not unmute');
  assert(!volumeUp.defaultPrevented, 'Native volume control was blocked');
  await go(4);
  assert(!video(4)!.muted && video(5)!.muted, 'Sound did not follow the active reel');
  pass('Sound opens enabled; mute persists; exposed volume-up keys restore sound without blocking system volume');

  // Force the browser-policy rejection independently of Chromium's settings.
  useAgroStore.getState().closeVideoViewer();
  await until(() => !document.querySelector('[data-index]'), 'Viewer did not close before policy test');
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (this.closest('[data-index]') && !this.muted) {
      return Promise.reject(new DOMException('Test autoplay policy', 'NotAllowedError'));
    }
    return originalPlay.call(this);
  };
  try {
    useAgroStore.getState().openVideoViewer(posts, 2);
    await settled(2);
    assert(video(2)!.muted && audioButton().title === 'Ovozni yoqish', 'Autoplay fallback left incorrect audio UI');
    await delay(3300);
    assert(Boolean(audioButton()), 'Muted audio control disappeared');
  } finally {
    HTMLMediaElement.prototype.play = originalPlay;
  }
  audioButton().click();
  assert(!video(2)!.muted, 'Unmute was deferred outside the click gesture');
  await settled(2);
  await go(3);
  assert(!video(3)!.muted, 'Enabled sound did not persist after autoplay fallback');
  pass('Blocked autoplay continues muted with a visible, accurate button; click restores sound across swipes');

  useAgroStore.getState().closeVideoViewer();
  await until(() => !document.querySelector('[data-index]'), 'Viewer did not close');
  useAgroStore.getState().openVideoViewer(posts, 4);
  await settled(4);
  assert(!video(4)!.muted, 'Reopening reels did not enable sound');
  pass('Reopening requests sound again');
  root.unmount();
  urls.forEach(url => URL.revokeObjectURL(url));
}

document.getElementById('run')!.addEventListener('click', () => {
  (document.getElementById('run') as HTMLButtonElement).disabled = true;
  run().then(() => {
  document.getElementById('results')!.textContent = `PASS\n${results.join('\n')}`;
  document.documentElement.dataset.testResult = 'pass';
}).catch(error => {
  document.getElementById('results')!.textContent = `FAIL: ${error.message}\n${results.join('\n')}`;
  document.documentElement.dataset.testResult = 'fail';
  console.error(error);
});
}, { once: true });
