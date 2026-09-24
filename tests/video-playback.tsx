// Run `npm run dev`, then open /tests/video-playback.html in Chromium.
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
  assert(scrollContainer().scrollTop === 4 * scrollContainer().clientHeight, 'Wrong opening index');
  assert(!document.querySelector('#feed video[src]'), 'Feed still downloading behind viewer');
  assert(video(5)?.preload === 'auto', 'Next video does not buffer');
  await until(() => (video(5)?.readyState ?? 0) >= 2, 'Next video has no buffered frame');
  pass('Opens requested item, releases feed source, buffers next video');

  const previous = video(4)!;
  await go(5);
  assert(video(4) === previous && previous.paused && previous.readyState >= 2, 'Previous video lost its frame');
  await go(4);
  assert(video(4) === previous, 'Reverse navigation recreated the decoder');
  pass('Reverse swipe preserves previous element and decoded frame');

  previous.click(); // Delayed single-tap handler must be cancelled on departure.
  await go(5);
  await delay(350);
  assert(previous.paused && playing().length === 1, 'Delayed tap restarted an inactive slide');
  for (const index of [7, 1, 6, 0, 3]) {
    scrollContainer().scrollTop = index * scrollContainer().clientHeight;
    await delay(35);
  }
  await settled(3);
  pass('Rapid forward/reverse jumps and delayed taps leave exactly one player active');

  const broken = video(3)!;
  const badUrl = URL.createObjectURL(new Blob(['invalid media'], { type: 'video/webm' }));
  broken.src = badUrl;
  await until(() => Boolean(slide(3).textContent?.includes('Video yuklanmadi')), 'Error UI did not appear');
  [...slide(3).querySelectorAll('button')].find(button => button.textContent?.includes('Qayta yuklash'))!.click();
  await settled(3);
  assert(video(3) !== broken && !broken.hasAttribute('src') && broken.paused, 'Retry leaked old media element');
  URL.revokeObjectURL(badUrl);
  pass('Failed media retries successfully and releases the replaced decoder');

  const detached = [...document.querySelectorAll<HTMLVideoElement>('[data-index] video')];
  useAgroStore.getState().closeVideoViewer();
  await until(() => !document.querySelector('[data-index]'), 'Viewer did not close');
  assert(detached.every(item => item.paused && !item.hasAttribute('src')), 'Closing leaked media sources');
  await until(() => Boolean(document.querySelector<HTMLVideoElement>('#feed video')?.currentTime), 'Feed did not resume');
  useAgroStore.getState().openVideoViewer(posts, 2);
  await settled(2);
  pass('Close releases all reels; feed resumes; reopen selects the new requested item');

  // Simulate a data-saver connection using the same change event as Chromium.
  const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');
  const connection = Object.assign(new EventTarget(), { effectiveType: '3g', saveData: true });
  useAgroStore.getState().closeVideoViewer();
  await delay(50);
  root.unmount();
  Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  const slowRoot = createRoot(document.getElementById('root')!);
  slowRoot.render(<StrictMode><VideoReelsViewer /></StrictMode>);
  await delay(50);
  useAgroStore.getState().openVideoViewer(posts, 4);
  await settled(4);
  assert(!video(5)?.hasAttribute('src'), 'Data saver downloaded the next video');
  await go(5);
  await go(4);
  pass('Data saver skips speculative downloads and still supports reverse navigation');

  useAgroStore.getState().closeVideoViewer();
  await delay(50);
  slowRoot.unmount();
  if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection);
  else Reflect.deleteProperty(navigator, 'connection');
  urls.forEach(url => URL.revokeObjectURL(url));
}

run().then(() => {
  document.getElementById('results')!.textContent = `PASS\n${results.join('\n')}`;
  document.documentElement.dataset.testResult = 'pass';
}).catch(error => {
  document.getElementById('results')!.textContent = `FAIL: ${error.message}\n${results.join('\n')}`;
  document.documentElement.dataset.testResult = 'fail';
  console.error(error);
});
