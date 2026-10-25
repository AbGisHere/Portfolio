/**
 * (0.4.24) Butterflies over the meadow, along the way to the house and in
 * its garden: a fourth kind in the birds' pass (birdShader.js), on the
 * same clock.
 *
 * - **Shape** (`butterflyMesh`): a slim body (thorax, a long abdomen, a
 *   head with its antennae) and two wings a side, the forewing's rounded
 *   point and the hindwing's lobe, each a fan from the wing's root, both
 *   faces. One joint a wing (the bird's arm, about the body's axis); the
 *   wing's own coordinates go to the shader for its pattern: `along` the
 *   distance out from the root (0 … 1), the sign of the joint which wing,
 *   the material (wingTop the forewing, wingUnder the hindwing).
 * - **Kinds** (by seed, birdShader.js): a painted lady (orange, black tips
 *   spotted white), a cabbage white (a dark tip, a spot), a common blue,
 *   a brimstone (sulphur yellow).
 * - **Flight** (`butterfliesAt`): each its own wandering path, low over the
 *   ground (or the hill), bobbing with every few beats; now and then it
 *   comes down on a flower and rests, opening and closing its wings
 *   slowly, before it flutters off. Wings beat at 8 – 11 Hz, each its own,
 *   never in step. Gathered by the flowers' drifts round the desk, strung
 *   along the way, and round the house's planters.
 */

import { BIRD_INSTANCE } from './birdFlight';
import { BIRD_PART, BIRD_STRIDE } from './birdShape';
import { moundY } from './houseShape';

// Round the desk, along the way, by the house's forecourt and its hill.
const PLACES = [
  [0, 9, 9, 8], [-8, 16, 5, 4], [7, 4, 5, 3], [3, -14, 6, 3], [-2, -28, 6, 3], [1, -42, 6, 3],
  [-6, -57.2, 3, 3], [6, -57.2, 3, 3], [-14, -62, 4, 2], [13, -64, 4, 2],
];
export const BUTTERFLIES = PLACES.reduce((n, p) => n + p[3], 0);

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

function tri(out, a, b, c, joint, part, along) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const l = Math.hypot(...n) || 1;
  const N = n.map(x => x / l);
  for (let i = 0; i < 3; i++) out.push(...[a, b, c][i], ...N, joint, part, along[i]);
}

/** A butterfly's mesh (metres, its body along z, wings out along x). */
export function butterflyMesh() {
  const out = [];
  // The wings: fans from the root at the thorax, outlines as radius by
  // angle (0 straight out, + forward). The forewing reaches forward and
  // out to a rounded point; the hindwing back, a broad lobe.
  const fore = a => 0.034 * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (a + 0.25) / 1.45))) * (1 + 0.25 * Math.exp(-((a - 0.55) ** 2) / 0.05));
  const hind = a => 0.026 * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, (-a + 0.05) / 1.5)));
  const fan = (side, r, a0, a1, part, root) => {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const [p, q] = [a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n];
      const P = a => [side * Math.cos(a) * r(a) + side * 0.002, 0, root + Math.sin(a) * r(a)];
      const c = [side * 0.002, 0, root];
      const [A, B] = [P(p), P(q)];
      const [ra, rb] = [r(p) / 0.04, r(q) / 0.04];
      // Both faces, a hair apart, wound each its way.
      if (side > 0) {
        tri(out, c, B, A, side, part, [0, rb, ra]);
        tri(out, c.map((x, k) => x - (k === 1 ? 0.0002 : 0)), A.map((x, k) => x - (k === 1 ? 0.0002 : 0)), B.map((x, k) => x - (k === 1 ? 0.0002 : 0)), side, part, [0, ra, rb]);
      } else {
        tri(out, c, A, B, side, part, [0, ra, rb]);
        tri(out, c.map((x, k) => x - (k === 1 ? 0.0002 : 0)), B.map((x, k) => x - (k === 1 ? 0.0002 : 0)), A.map((x, k) => x - (k === 1 ? 0.0002 : 0)), side, part, [0, rb, ra]);
      }
    }
  };
  for (const side of [1, -1]) {
    fan(side, fore, -0.2, 1.25, BIRD_PART.wingTop, 0.002);
    fan(side, hind, -1.45, 0.0, BIRD_PART.wingUnder, -0.002);
  }
  // The body: thorax, abdomen, head, as stacked rings; the antennae.
  const seg = (z0, z1, r0, r1, part) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const [a, b] = [(i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2];
      const ring = (z, r, t) => [Math.cos(t) * r, Math.sin(t) * r, z];
      const [p0, p1, p2, p3] = [ring(z0, r0, a), ring(z0, r0, b), ring(z1, r1, b), ring(z1, r1, a)];
      tri(out, p0, p1, p2, 0, part, [0, 0, 0]);
      tri(out, p0, p2, p3, 0, part, [0, 0, 0]);
    }
  };
  seg(-0.022, -0.004, 0.0008, 0.0024, BIRD_PART.belly);
  seg(-0.004, 0.006, 0.0024, 0.003, BIRD_PART.back);
  seg(0.006, 0.0095, 0.003, 0.0022, BIRD_PART.back);
  seg(0.0095, 0.0115, 0.0022, 0.0005, BIRD_PART.eye);
  for (const s of [-1, 1]) {
    const a = [s * 0.0008, 0.001, 0.0105];
    const b = [s * 0.006, 0.004, 0.026];
    tri(out, a, [a[0] + 0.0004, a[1], a[2]], b, 0, BIRD_PART.eye, [0, 0, 0]);
    tri(out, a, b, [a[0] + 0.0004, a[1], a[2]], 0, BIRD_PART.eye, [0, 0, 0]);
  }
  const data = new Float32Array(out);
  return { data, count: data.length / BIRD_STRIDE };
}

/** Every butterfly at time t (seconds), thinned by `weight`: BIRD_INSTANCE
 * floats each (x, y, z, yaw, climb, bank, beat, sweep, scale, seed). */
export function butterfliesAt(t, weight) {
  const out = new Float32Array(BUTTERFLIES * BIRD_INSTANCE);
  let k = 0;
  PLACES.forEach(([cx, cz, r, n], g) => {
    for (let i = 0; i < n; i++, k++) {
      const s = g * 17.3 + i * 5.71 + 3;
      // A visit: every so often it rests on a flower for a while.
      const cycle = 9 + 6 * hash(s);
      const u = (t + hash(s + 1) * cycle) / cycle;
      const phase = u - Math.floor(u);
      const resting = phase > 0.72;
      const pathAt = tt => {
        const a = tt * (0.35 + 0.2 * hash(s + 2)) + s;
        const x = cx + r * (noise(tt * 0.22 + s) - 0.5) * 2 + 0.6 * Math.sin(a * 1.7);
        const z = cz + r * (noise(tt * 0.19 + s * 2) - 0.5) * 2 + 0.6 * Math.cos(a * 1.3);
        const bob = 0.12 * Math.sin(tt * 6.3 + s) + 0.08 * Math.sin(tt * 2.3 + s * 3);
        return [x, moundY(x, z) + 0.45 + 0.5 * noise(tt * 0.5 + s * 5) + bob, z];
      };
      // At rest: where its flight left it, down on a flower's head.
      const tRest = (Math.floor(u) + 0.72) * cycle - hash(s + 1) * cycle;
      const tt = resting ? tRest : t;
      const p = pathAt(tt);
      const e = 0.03;
      const a = pathAt(tt - e);
      const b = pathAt(tt + e);
      const vx = (b[0] - a[0]) / (2 * e);
      const vy = (b[1] - a[1]) / (2 * e);
      const vz = (b[2] - a[2]) / (2 * e);
      const sp = Math.hypot(vx, vz) || 1e-6;
      let yaw = Math.atan2(vx, vz);
      let climb = Math.atan2(vy, sp) * 0.5;
      let beat;
      let y = p[1];
      if (resting) {
        // Settled on a flower (~0.3 m up), wings slowly opening and
        // closing over its back.
        y = moundY(p[0], p[2]) + 0.28 + 0.06 * hash(s + 4);
        beat = 1.05 + 0.4 * Math.sin(t * 1.6 + s);
        climb = 0;
        yaw += 0.3 * Math.sin(s);
      } else {
        // Fluttering: fast beats, a full stroke, now and then a glide.
        const hz = 8 + 3 * hash(s + 3);
        const glide = noise(t * 0.8 + s * 7) > 0.78;
        beat = glide ? 0.2 : 0.55 + 0.85 * Math.sin(t * 6.2832 * hz + s * 11);
      }
      const show = hash(s + 9) < weight ? 1.25 : 0;
      out.set([p[0], y, p[2], yaw, climb, 0, beat, 0, show, s, 0, 0], k * BIRD_INSTANCE);
    }
  });
  return out;
}
