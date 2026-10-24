/**
 * (0.4.4) Where every bird is and what its wings are doing, a pure function
 * of the sky's clock (so a scroll or a freeze never breaks a flight): its
 * place (metres), heading, climb and bank from its path's own velocity and
 * turn (banked as a bird banks, into the turn by its speed squared over
 * the radius), and its wings (the beat's angle, how swept back).
 *
 * - **Swallows** hunt low over the meadow and round the house: each on its
 *   own looping, darting path at ~10 m/s, beating fast (≈ 7 Hz) in bursts
 *   and gliding between them, wings swept back.
 * - **Red kites**, a pair, circle high on a thermal that drifts, wings held
 *   flat and a little raised, a slow beat now and then.
 * - **Geese**, a skein of seven in a V, pass high across now and then at
 *   ~17 m/s, beating slowly and steadily, each a little behind the one
 *   ahead of it in the beat.
 *
 * `birdsAt(t, weight)` → per species a Float32Array of BIRD_INSTANCE floats
 * a bird: x, y, z, yaw, climb, bank, beat, sweep, scale (0: not there),
 * seed, and two spare. `weight` (0 … 1) thins them out (the sky's life:
 * none by night).
 */

export const BIRD_INSTANCE = 12;

const G = 9.81;
const hash = n => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// Smooth value noise in one dimension.
const noise = x => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};

/** A bird along `path(t)` (metres): its heading, climb and bank from the
 * path's velocity and acceleration (sampled), into `out` at `k`. */
function fly(out, k, path, t, beat, sweep, scale, seed) {
  const e = 0.02;
  const p = path(t);
  const a = path(t - e);
  const b = path(t + e);
  const v = [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e), (b[2] - a[2]) / (2 * e)];
  const acc = [(b[0] - 2 * p[0] + a[0]) / (e * e), (b[1] - 2 * p[1] + a[1]) / (e * e), (b[2] - 2 * p[2] + a[2]) / (e * e)];
  const sp = Math.hypot(v[0], v[2]) || 1e-6;
  const yaw = Math.atan2(v[0], v[2]);
  const climb = Math.atan2(v[1], sp);
  // The turn's sideways pull, across the heading (to the bird's right).
  const side = (acc[0] * v[2] - acc[2] * v[0]) / sp;
  const bank = Math.max(-1.2, Math.min(1.2, Math.atan2(-side, G)));
  out.set([p[0], p[1], p[2], yaw, climb, bank, beat, sweep, scale, seed, 0, 0], k * BIRD_INSTANCE);
}

/** The swallows: `n` hunting round a centre (x, y, z) over a loop rx × rz. */
function swallows(out, t, weight, centre, rx, rz, n, seed0) {
  for (let i = 0; i < n; i++) {
    const s = seed0 + i * 7.13;
    const w = (2 * Math.PI) / (11 + 7 * hash(s));
    const ph = hash(s + 1) * 6.283;
    const dir = hash(s + 2) > 0.5 ? 1 : -1;
    const path = tt => {
      const a = dir * w * tt + ph;
      // A loop that wanders: its own figure, darting on noise.
      const dx = 3.5 * (noise(tt * 0.45 + s) - 0.5) + 1.5 * (noise(tt * 1.3 + s * 2) - 0.5);
      const dz = 3.5 * (noise(tt * 0.4 + s * 3) - 0.5) + 1.5 * (noise(tt * 1.2 + s * 4) - 0.5);
      return [
        centre[0] + rx * Math.sin(a) * (0.7 + 0.3 * hash(s + 3)) + dx,
        centre[1] + 2.5 * Math.sin(a * 2 + s) + 2.5 * (noise(tt * 0.3 + s * 5) - 0.5),
        centre[2] + rz * Math.sin(2 * a + hash(s + 4) * 3) * 0.6 + rz * 0.5 * Math.cos(a) + dz,
      ];
    };
    // Beats in bursts, glides between: wings swept back to cut the air.
    const burst = noise(t * 0.9 + s * 9);
    const flapping = burst > 0.42;
    const beat = flapping ? 0.85 * Math.sin(t * 6.2832 * (6.5 + 1.5 * hash(s + 5)) + s) : 0.12;
    const sweep = flapping ? 0.15 : 0.85;
    fly(out, i, path, t, beat, sweep, hash(s + 6) < weight ? 1 : 0, s);
  }
}

/** The kites: two circling a drifting thermal high over the meadow. */
function kites(out, t, weight) {
  for (let i = 0; i < 2; i++) {
    const s = 41 + i * 3.7;
    const r = 20 + 6 * i;
    const w = (2 * Math.PI) / (24 + 5 * i);
    const path = tt => {
      const a = w * tt + i * 2.6;
      const cx = -36 + 14 * (noise(tt * 0.01 + 3) - 0.5) * 2;
      const cz = 70 + 14 * (noise(tt * 0.012 + 7) - 0.5) * 2;
      return [cx + r * Math.cos(a), 34 + 5 * i + 2.5 * Math.sin(tt * 0.08 + i), cz + r * Math.sin(a)];
    };
    // A few slow beats now and then; otherwise held, a little raised.
    const n = noise(t * 0.18 + s);
    const beat = n > 0.8 ? 0.45 * Math.sin(t * 6.2832 * 1.8) : 0.14;
    fly(out, i, path, t, beat, 0.05, hash(s) < weight ? 1 : 0, s);
  }
}

/** The geese: a skein of seven in a V, across high every two minutes or so,
 * a little way past the meadow. */
function geese(out, t, weight) {
  const period = 130;
  const k = Math.floor(t / period);
  const u = t / period - k;
  const show = u < 0.3 && hash(k + 0.5) < 0.8;
  const dirX = hash(k + 1.5) > 0.5 ? 1 : -1;
  const z = 120 + 60 * hash(k + 2.5);
  const y = 48 + 18 * hash(k + 3.5);
  for (let i = 0; i < 7; i++) {
    const rank = Math.ceil(i / 2);
    const sideOff = i === 0 ? 0 : (i % 2 ? 1 : -1) * rank * 1.9;
    const path = tt => {
      const uu = tt / period - k;
      const x = dirX * (-280 + (uu / 0.3) * 560) - dirX * rank * 1.7;
      return [x + 0.3 * Math.sin(tt * 0.7 + i), y + 0.4 * Math.sin(tt * 0.5 + i * 0.7) - rank * 0.2, z + sideOff];
    };
    const beat = 0.6 * Math.sin(t * 6.2832 * 2.9 - rank * 0.9);
    fly(out, i, path, t, beat, 0.1, show && hash(i + 9) < weight ? 1 : 0, i + 60);
  }
}

/** Every bird at time t (seconds), thinned by `weight`. */
export function birdsAt(t, weight) {
  const swallow = new Float32Array(15 * BIRD_INSTANCE);
  const near = new Float32Array(9 * BIRD_INSTANCE);
  const house = new Float32Array(6 * BIRD_INSTANCE);
  // Low over the meadow before the desk, and round the house on its hill.
  swallows(near, t, weight, [0, 6.5, 26], 24, 14, 9, 11);
  swallows(house, t, weight, [0, 12, -55], 18, 12, 6, 97);
  swallow.set(near, 0);
  swallow.set(house, near.length);
  const kite = new Float32Array(2 * BIRD_INSTANCE);
  kites(kite, t, weight);
  const goose = new Float32Array(7 * BIRD_INSTANCE);
  geese(goose, t, weight);
  return { swallow, kite, goose };
}
