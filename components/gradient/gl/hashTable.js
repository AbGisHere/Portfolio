/**
 * The ridge noise's lattice hashes, precomputed on the CPU for the GPU crest
 * pass (crestShader.js).
 *
 * The engine hashes each integer noise cell with `fract(sin(x) * 43758.5453)`
 * (`Hl`). That only works in 64-bit maths: GPU float32 `sin` of arguments in
 * the thousands differs per vendor, and so would the mountains. So the shader
 * never hashes. It looks the values up here, computed in JS doubles and bit
 * for bit the ones the CPU path uses.
 *
 * One row per (ridge, noise layer): layers 0–2 are the profile's three
 * octaves, layer 3 the `d` modulation term. Columns are integer cells from
 * `origin` up. The range covers every cell a frame can touch for noise
 * offsets in [nLo, nHi]. It's rebuilt only when the frame size changes or the
 * offset leaves that range (a theme switch), never per frame.
 */

import { MAX_RIDGES } from './mistShader';

export const LAYERS = 4;

// Hl
const hash = e => {
  const t = Math.sin(e) * 43758.5453;
  return t - Math.floor(t);
};

// Per ridge b: the octave frequencies and the `u` each layer hashes with,
// exactly as mistGeometry.js's ridgeProfile / noise1 use them.
function layers(b) {
  const o = 1.7 + b * 0.33;
  const s = b * 7.31 + 13.7;
  return [
    { freq: o, nScale: 1, u: s },
    { freq: o * 2.15, nScale: 1, u: s + 1.77 },
    { freq: o * 4.4, nScale: 1, u: s + 3.31 },
    { freq: 1.13, nScale: 0.51, u: s + 5.2 },
  ];
}

/**
 * @param {number} eMin lowest profile x (0..1 across the reference frame)
 * @param {number} eMax highest
 * @param {number} nLo lowest noise offset (seed × 0.73)
 * @param {number} nHi highest
 */
export function buildHashTable(eMin, eMax, nLo, nHi) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let b = 0; b < MAX_RIDGES; b++) {
    for (const { freq, nScale } of layers(b)) {
      lo = Math.min(lo, Math.floor(eMin * freq + nLo * nScale));
      hi = Math.max(hi, Math.floor(eMax * freq + nHi * nScale) + 1);
    }
  }
  // One cell of slack each side: float32 rounding in the shader can land an
  // argument that's a hair past an integer on the neighbouring cell.
  const origin = lo - 1;
  const width = hi - origin + 2;
  const rows = MAX_RIDGES * LAYERS;
  const data = new Float32Array(width * rows);
  for (let b = 0; b < MAX_RIDGES; b++) {
    layers(b).forEach(({ u }, k) => {
      const row = (b * LAYERS + k) * width;
      for (let c = 0; c < width; c++) data[row + c] = hash((origin + c) * 127.1 + u * 311.7);
    });
  }
  return { data, width, rows, origin, nLo, nHi };
}
