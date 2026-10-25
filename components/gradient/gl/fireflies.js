/**
 * (0.4.26) Fireflies by night, over the meadow round the desk, along the
 * way and in the house's garden: a fifth kind in the birds' pass
 * (birdShader.js, `uKind` 4), on the same clock.
 *
 * - **Each a glow, not a beetle:** what shows of a firefly at dusk is its
 *   light, so each is a soft disc of it facing the camera, a few
 *   centimetres across, never smaller than a few pixels (a point
 *   thinner than one would come and go as the camera moves); added onto
 *   the frame, so the bloom takes it up.
 * - **Flight** (`firefliesAt`): slow, wandering, low (0.3 – 1.6 m over the
 *   ground or the hill), each its own path.
 * - **The flash:** each its own rhythm, a few seconds apart, a rise and a
 *   slower fade of about a second, a yellow-green; out by day, coming out
 *   as the night does.
 */

import { BIRD_INSTANCE } from './birdFlight';
import { moundY } from './houseShape';

// [x, z, radius, count]: round the desk, along the way, in the garden.
const PLACES = [
  [0, 8, 12, 26], [-10, 18, 7, 10], [9, 2, 7, 10], [2, -16, 7, 10], [-3, -30, 7, 10], [1, -44, 7, 10],
  [-7, -57.4, 4, 8], [7, -57.4, 4, 8], [-14, -63, 5, 8], [13, -65, 5, 8],
];
export const FIREFLIES = PLACES.reduce((n, p) => n + p[3], 0);

const hash = n => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const noise = x => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};

/** The glow's mesh: a square (−1 … 1) the shader turns to face the camera. */
export function fireflyMesh() {
  const out = [];
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) out.push(x, y, 0, 0, 0, 1, 0, 0, 0);
  const data = new Float32Array(out);
  return { data, count: 6 };
}

/** Every firefly at time t (seconds), by night (0 … 1): BIRD_INSTANCE
 * floats each (x, y, z, ·, ·, ·, flash, ·, show, seed). */
export function firefliesAt(t, night) {
  const out = new Float32Array(FIREFLIES * BIRD_INSTANCE);
  if (night < 0.05) return out;
  let k = 0;
  PLACES.forEach(([cx, cz, r, n], g) => {
    for (let i = 0; i < n; i++, k++) {
      const s = g * 13.1 + i * 7.37 + 5;
      const x = cx + r * (noise(t * 0.05 + s) - 0.5) * 2 + 0.5 * Math.sin(t * 0.3 + s);
      const z = cz + r * (noise(t * 0.045 + s * 2) - 0.5) * 2 + 0.5 * Math.cos(t * 0.27 + s);
      const y = moundY(x, z) + 0.3 + 1.3 * noise(t * 0.12 + s * 3);
      // The flash: a quick rise, a slower fade, once a cycle.
      const cycle = 2.5 + 4 * hash(s + 1);
      const ph = ((t + hash(s + 2) * cycle) % cycle) / cycle;
      const on = ph < 0.08 ? ph / 0.08 : Math.max(0, 1 - (ph - 0.08) / 0.35);
      const flash = on * on * night;
      // Each comes out with the night, some later than others.
      const show = night > 0.2 + 0.5 * hash(s + 3) ? 1 : 0;
      out.set([x, y, z, 0, 0, 0, flash, 0, show, s, 0, 0], k * BIRD_INSTANCE);
    }
  });
  return out;
}
