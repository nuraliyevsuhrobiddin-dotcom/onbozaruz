// node --experimental-vm-modules --test tests/video-compress.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(await readFile(new URL('../src/utils/videoCompress.ts', import.meta.url), 'utf8'));
const { targetSize, targetBitrate, canCompressVideoHere, compressVideo, VIDEO_TARGET_BITRATE } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('phone videos are scaled to 720p on the short side, keeping the aspect ratio', () => {
  assert.deepEqual(targetSize(1080, 1920), { width: 720, height: 1280 });
  assert.deepEqual(targetSize(2160, 3840), { width: 720, height: 1280 });
  assert.deepEqual(targetSize(1920, 1080), { width: 1280, height: 720 });
  assert.deepEqual(targetSize(720, 1280), { width: 720, height: 1280 });
});

test('small videos are never upscaled and sizes stay even for H.264', () => {
  assert.deepEqual(targetSize(480, 854), { width: 480, height: 854 });
  const odd = targetSize(1081, 1917);
  assert.equal(odd.width % 2, 0);
  assert.equal(odd.height % 2, 0);
  assert.ok(Math.max(odd.width, odd.height) <= 1280);
});

test('bitrate is 2.5 Mbit/s at 720p and proportionally lower for smaller frames, with a floor', () => {
  assert.equal(targetBitrate(720, 1280), VIDEO_TARGET_BITRATE);
  assert.equal(targetBitrate(1280, 720), VIDEO_TARGET_BITRATE);
  const sd = targetBitrate(480, 854);
  assert.ok(sd < VIDEO_TARGET_BITRATE && sd > 1_000_000, String(sd));
  assert.equal(targetBitrate(160, 284), 1_000_000);
});

test('without WebCodecs the original file is kept (no crash, no upload loss)', async () => {
  assert.equal(canCompressVideoHere(), false);
  const outcome = await compressVideo(new File([new Uint8Array(10)], 'a.mp4', { type: 'video/mp4' }));
  assert.deepEqual(outcome, { kind: 'skipped', reason: 'unsupported' });
});
