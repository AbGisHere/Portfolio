/**
 * (0.3.2) The meadow's paint: one tileable RGBA texture the ground samples in
 * world space at several scales (mistShader.js meadowPaint), mipmapped so it
 * averages out with distance instead of shimmering. Built once, on the CPU,
 * from a fixed seed (the same meadow every load).
 *
 * - R: soft patches (value noise, a few octaves): fields of light and shade,
 *   and the cloud shadows.
 * - G: tufts: jittered cells, each a soft clump brighter at its heart.
 * - B: brush strokes: short dashes, mostly along the tile's y, light and
 *   dark on a mid-grey, like grass painted stroke by stroke.
 * - A: fine patches (higher octaves): where flowers gather, small variation.
 */

/** Texels a side. */
export const MEADOW_SIZE = 256;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise, octaves summed and normalised, as a field of
 * MEADOW_SIZE² values: `list` is [cells a side over the tile, weight]. */
function octaves(list, rand) {
  const N = MEADOW_SIZE;
  const out = new Float32Array(N * N);
  const smooth = v => v * v * (3 - 2 * v);
  let sum = 0;
  for (const [cells, w] of list) {
    sum += w;
    const g = Float32Array.from({ length: cells * cells }, rand);
    const step = cells / N;
    // Per column: the lattice cell and its smoothed fraction.
    const ix = new Int32Array(N);
    const sx = new Float32Array(N);
    for (let x = 0; x < N; x++) {
      const fx = x * step;
      ix[x] = Math.floor(fx);
      sx[x] = smooth(fx - ix[x]);
    }
    for (let y = 0; y < N; y++) {
      const fy = y * step;
      const iy = Math.floor(fy);
      const t = smooth(fy - iy);
      const r0 = (iy % cells) * cells;
      const r1 = ((iy + 1) % cells) * cells;
      for (let x = 0; x < N; x++) {
        const i0 = ix[x] % cells;
        const i1 = (ix[x] + 1) % cells;
        const a = g[r0 + i0] + (g[r0 + i1] - g[r0 + i0]) * sx[x];
        const b = g[r1 + i0] + (g[r1 + i1] - g[r1 + i0]) * sx[x];
        out[y * N + x] += (a + (b - a) * t) * w;
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

/** The texels, RGBA8, row-major. */
export function meadowTexels(seed = 7) {
  const N = MEADOW_SIZE;
  const rand = rng(seed);
  const out = new Uint8Array(N * N * 4);
  const coarse = octaves([[4, 1], [8, 0.5], [16, 0.25]], rand);
  const fine = octaves([[16, 1], [32, 0.5], [64, 0.25]], rand);

  // Tufts: 16 cells a side, one clump each at a jittered spot, stamped
  // over its own square (wrapping), the brightest clump kept.
  const C = 16;
  const cell = N / C;
  const tufts = new Float32Array(N * N);
  for (let k = 0; k < C * C; k++) {
    const cx = ((k % C) + rand()) * cell;
    const cy = (Math.floor(k / C) + rand()) * cell;
    const R = cell * 0.85 * (0.55 + 0.45 * rand());
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = (dx * dx + dy * dy) / (R * R);
        if (d2 >= 1) continue;
        const i = (((y % N) + N) % N) * N + (((x % N) + N) % N);
        const v = (1 - Math.sqrt(d2)) ** 1.4;
        if (v > tufts[i]) tufts[i] = v;
      }
  }

  // Strokes: short dashes laid on a mid-grey, wrapping at the edges.
  const strokes = new Float32Array(N * N).fill(0.5);
  for (let k = 0; k < 5200; k++) {
    const x0 = rand() * N;
    const y0 = rand() * N;
    const ang = (rand() - 0.5) * 0.7;
    const len = 5 + rand() * 9;
    const v = rand() < 0.5 ? 0.15 + rand() * 0.2 : 0.7 + rand() * 0.3;
    const dx = Math.sin(ang);
    const dy = Math.cos(ang);
    for (let s = 0; s < len; s += 0.5) {
      // Strokes taper toward their tip.
      const w = 1 - s / len;
      const x = Math.round(x0 + dx * s);
      const y = Math.round(y0 + dy * s);
      const i = ((y % N) + N) % N * N + ((x % N) + N) % N;
      strokes[i] += (v - strokes[i]) * (0.4 + 0.5 * w);
    }
  }

  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      out[i] = Math.round(coarse[y * N + x] * 255);
      out[i + 1] = Math.round(tufts[y * N + x] * 255);
      out[i + 2] = Math.round(strokes[y * N + x] * 255);
      out[i + 3] = Math.round(fine[y * N + x] * 255);
    }
  return out;
}
