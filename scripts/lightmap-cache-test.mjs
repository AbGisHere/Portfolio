// (0.4.57) The stored lightmap: halves back from floats bit for bit, and a
// key that moves with anything the bake reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { f16ToF32, f32ToF16Exact, hashParts, validLightmap } from '../components/gradient/gl/lightmapCache.js';

test('f32ToF16Exact gives back every half float, bit for bit', () => {
  const floats = new Float32Array(65536);
  const want = new Uint16Array(65536);
  let n = 0;
  for (let h = 0; h < 65536; h++) {
    const e = (h >>> 10) & 31;
    if (e === 31 && h & 1023) continue; // NaNs aren't kept
    floats[n] = f16ToF32(h);
    want[n++] = h;
  }
  const got = new Uint16Array(n);
  assert.equal(f32ToF16Exact(floats.subarray(0, n), got), true);
  assert.deepEqual(got, want.subarray(0, n));
});

test('f32ToF16Exact refuses anything a half can\'t hold', () => {
  const out = new Uint16Array(1);
  for (const x of [1 + 2 ** -11, 0.1, 2 ** -25, 3 * 2 ** -26, 65520, 1e-40, NaN, 2 ** 16]) {
    assert.equal(f32ToF16Exact(new Float32Array([x]), out), false, String(x));
  }
  assert.equal(f32ToF16Exact(new Float32Array([65504, -0, 2 ** -24, 2 ** -14]), new Uint16Array(4)), true);
});

test('f32ToF16Exact converts a slice in place', () => {
  const src = new Float32Array([1, 2, 0.5, -1]);
  const out = new Uint16Array(4);
  assert.equal(f32ToF16Exact(src, out, 1, 3), true);
  assert.deepEqual([...out], [0, 0x4000, 0x3800, 0]);
});

test('validLightmap needs the whole atlas with alpha 1 everywhere', () => {
  const ok = new Uint16Array(2 * 2 * 4);
  for (let i = 3; i < ok.length; i += 4) ok[i] = 0x3c00;
  assert.equal(validLightmap(ok, 2, 2), true);
  assert.equal(validLightmap(new Uint16Array(16), 2, 2), false);
  assert.equal(validLightmap(ok.subarray(0, 12), 2, 2), false);
  assert.equal(validLightmap(new Float32Array(16).fill(1), 2, 2), false);
});

test('hashParts moves with every part and is stable', () => {
  const lights = new Float32Array([1, 2, 3, 4]);
  const base = hashParts(['shader', { size: [1024, 1024] }, lights]);
  assert.match(base, /^[0-9a-f]{16}$/);
  assert.equal(hashParts(['shader', { size: [1024, 1024] }, new Float32Array([1, 2, 3, 4])]), base);
  assert.notEqual(hashParts(['shader!', { size: [1024, 1024] }, lights]), base);
  assert.notEqual(hashParts(['shader', { size: [1024, 512] }, lights]), base);
  assert.notEqual(hashParts(['shader', { size: [1024, 1024] }, new Float32Array([1, 2, 3, 4.0001])]), base);
  // (Parts don't run into each other.)
  assert.notEqual(hashParts(['ab', 'c']), hashParts(['a', 'bc']));
});

// (0.5.16, H1) The shipped bake must be the bake of what the house is now.
test('the shipped lightmap matches its inputs (else: npm run lightmap-bake)', async () => {
  const { LIGHTMAP_BAKED, bakedLightmapHash } = await import('../components/gradient/gl/lightmapBaked.js');
  const { existsSync } = await import('node:fs');
  assert.equal(LIGHTMAP_BAKED.hash, bakedLightmapHash());
  assert.ok(existsSync('public/lightmap/lightmap.bin.gz'));
});
