/**
 * (0.4.21) Clothes, for the entrance and the walk-in wardrobe: each
 * garment cut to its own outline and hung on a hanger, or folded on a
 * shelf (they were soft blobs, one shape for everything).
 *
 * - **Hung** (`garment`): a front and a back, each a surface cut to the
 *   garment's outline (shoulders sloping from the neck, the body, a waist
 *   or a flare, the hem), a few millimetres apart round a fullness that
 *   thins to the seams; soft folds running down from the shoulders,
 *   deepening toward the hem; sleeves hanging at the sides; a collar.
 *   Kinds: a shirt, a knit, a coat (long, buttoned), a dress (fitted to
 *   the waist, a flared skirt, no sleeves), trousers (folded over the
 *   hanger's bar).
 * - **The hanger** (`hanger`): a walnut bar shaped to the shoulders, its
 *   ends turned down, a brass hook up from its middle round the rail.
 * - **A scarf** (`scarf`): a long band of knit hung over a hook, its two
 *   ends falling either side, one longer, fringed.
 * - **Folded** (`foldedStack`): each piece a slab with its folded front
 *   edge rolled round, a hair of sag, no two the same size or colour.
 *
 * In the garment's frame: x across its shoulders, y up, z its front.
 */

import { HOUSE_PART } from './houseShape';
import { add, axes, ball, grid, scale, soft, sweep, tube } from './meshKit';

const P = HOUSE_PART;
const v = (part, k) => part + Math.min(0.9, Math.max(0, k));

const KINDS = {
  shirt: { sh: 0.2, len: 0.74, body: [0.24, 0.235], neck: 0.075, slope: 0.05, sleeve: [0.62, 0.045, 0.034], thick: 0.012, collar: true },
  knit: { sh: 0.21, len: 0.66, body: [0.25, 0.23], neck: 0.08, slope: 0.06, sleeve: [0.6, 0.05, 0.036], thick: 0.02, collar: false },
  coat: { sh: 0.24, len: 1.02, body: [0.27, 0.31], neck: 0.085, slope: 0.045, sleeve: [0.68, 0.058, 0.046], thick: 0.026, collar: true, buttons: 4 },
  dress: { sh: 0.16, len: 1.0, body: [0.17, 0.33], neck: 0.07, slope: 0.035, sleeve: null, thick: 0.01, waist: [0.36, 0.14] },
  trousers: { sh: 0.19, len: 0.56, body: [0.19, 0.17], neck: 0, slope: 0, sleeve: null, thick: 0.014, over: true },
};

/** The hanger at the frame's origin (its hook's eye on the rail at
 * hy above it). */
export function hanger(out, at, ax, { w = 0.22, trouser = false } = {}) {
  const pt = (x, y, z = 0) => add(add(add(at, ax[0], x), ax[1], y), ax[2], z);
  const pts = [];
  for (let k = 0; k <= 10; k++) {
    const x = -w + (2 * w * k) / 10;
    const t = Math.abs(x) / w;
    pts.push(pt(x, -0.035 * t * t - (t > 0.9 ? (t - 0.9) * 0.15 : 0)));
  }
  sweep(out, pts, 0.011, v(P.walnut, 0.2), { seg: 8 });
  for (const x of [-w, w]) ball(out, pts[x < 0 ? 0 : 10], 0.011, v(P.walnut, 0.2), 8, 4);
  if (trouser) tube(out, pt(-w * 0.85, -0.035), pt(w * 0.85, -0.035), 0.006, v(P.walnut, 0.2), 6);
  // The hook: up from the bar's middle and over the rail.
  const hook = [pt(0, 0.0), pt(0, 0.04), pt(0, 0.075), pt(0, 0.09, 0.012), pt(0, 0.085, 0.024), pt(0, 0.07, 0.024)];
  sweep(out, hook, 0.0028, P.brass, { seg: 6 });
}

/**
 * A garment of `kind` hung from a hanger whose bar sits at `top` (world),
 * facing `yaw` (its front toward +z turned), colour `k` (0 … 1), `seed`
 * for its folds.
 */
export function garment(out, top, yaw, kind, k, seed = 1, { hang = true } = {}) {
  const G = KINDS[kind];
  const ax = axes(0, yaw);
  const part = v(P.clothes, k);
  const pt = (x, y, z) => add(add(add(top, ax[0], x), ax[1], y), ax[2], z);
  if (hang) hanger(out, pt(0, 0, 0), ax, { w: kind === 'trousers' ? 0.2 : G.sh + 0.01, trouser: kind === 'trousers' });
  const yOff = kind === 'trousers' ? -0.035 : 0;
  // The outline: half-width at w (0 the shoulder line … 1 the hem).
  const half = w => {
    if (G.waist) {
      const [ww, wh] = G.waist;
      if (w < ww) return G.body[0] + (wh - G.body[0]) * Math.sin((w / ww) * Math.PI / 2);
      return wh + (G.body[1] - wh) * Math.pow((w - ww) / (1 - ww), 1.2);
    }
    return G.body[0] + (G.body[1] - G.body[0]) * w;
  };
  const f1 = (seed * 1.37) % 6.28;
  const f2 = (seed * 2.71) % 6.28;
  for (const side of [1, -1]) {
    grid(out, 16, 20, (u, w) => {
      const s = u * 2 - 1;
      // Across the shoulders the cloth follows the hanger's slope, then
      // falls straight.
      const hw = w < 0.08 ? G.sh + (half(0.08) - G.sh) * (w / 0.08) : half(w);
      const x = s * hw;
      const ax2 = Math.abs(x) / Math.max(G.sh, 1e-3);
      const yTop = -(G.slope * Math.min(1, ax2) ** 1.5) - 0.012;
      const y = yOff + yTop * (1 - w) - w * G.len;
      const full = G.thick * Math.pow(Math.max(0, 1 - s * s), 0.4) * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, w * 1.4 + 0.1)));
      // Folds down from the shoulders, deeper toward the hem.
      const fold = (0.004 + 0.012 * w) * Math.sin(s * 9.4 + f1 + w * 1.5) + 0.004 * w * Math.sin(s * 23 + f2);
      const neckCut = !G.over && Math.abs(x) < G.neck && w < 0.06 ? (G.neck - Math.abs(x)) * 0.6 : 0;
      return { p: pt(x, y - neckCut, side * (full + 0.002) + fold), part, s: u, t: w };
    }, scale(ax[2], side));
  }
  // Sleeves: hanging from the shoulder's end, a little in front, tapering
  // to the cuff, bent a touch at the elbow.
  if (G.sleeve) {
    const [sl, r0, r1] = G.sleeve;
    for (const sx of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const bow = 0.02 * Math.sin(Math.PI * t);
        pts.push(pt(sx * (G.sh + 0.02 + 0.025 * t + bow * 0.5), -G.slope - 0.02 - sl * t, 0.012 + bow + 0.01 * Math.sin(seed + sx)));
      }
      const n = pts.length;
      for (let i = 0; i < n - 1; i++) tube(out, pts[i], pts[i + 1], r0 + (r1 - r0) * (i / (n - 1)), part, 10);
      ball(out, pts[n - 1], r1 * 0.9, part, 8, 4);
    }
  }
  // A collar round the neck, a placket and buttons down a coat's front.
  if (G.collar) {
    const ring = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      ring.push(pt(-Math.cos(a) * G.neck, -0.01 + 0.02 * Math.sin(a) * 0, -0.004 + Math.sin(a) * (G.thick + 0.012)));
    }
    sweep(out, ring, kind === 'coat' ? 0.014 : 0.008, part, { seg: 6 });
  }
  if (G.buttons) {
    for (let b = 0; b < G.buttons; b++) {
      const y = -0.14 - b * 0.16;
      ball(out, pt(0.035, y, G.thick + 0.006), 0.009, v(P.walnut, 0), 8, 4);
    }
  }
}

/** A stack of `n` folded pieces on a shelf at c (its middle at the shelf's
 * top), facing `yaw`. */
export function foldedStack(out, c, yaw, n, seed = 5) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ax = axes(0, yaw);
  let y = 0;
  for (let k = 0; k < n; k++) {
    const hh = 0.018 + 0.016 * rnd();
    const w = 0.15 + 0.02 * rnd();
    const d = 0.13 + 0.015 * rnd();
    const t = axes(0, yaw + (rnd() - 0.5) * 0.08);
    const col = v(P.clothes, rnd());
    const mid = add(add(c, [0, y + hh, 0]), t[0], (rnd() - 0.5) * 0.015);
    soft(out, mid, [w, hh, d], col, { e1: 0.3, e2: 0.25, ax: t });
    // The folded edge at the front, rolled round.
    tube(out, add(add(mid, t[2], d - hh * 0.4), t[0], -w + 0.01), add(add(mid, t[2], d - hh * 0.4), t[0], w - 0.01), hh * 0.95, col, 8);
    y += hh * 2 - 0.002;
  }
  return y;
}

/** A scarf over a hook at `at` (the hook's tip), facing `yaw`: a band
 * `len` long each side at most, falling either side of the hook. */
export function scarf(out, at, yaw, len, k) {
  const ax = axes(0, yaw);
  const part = v(P.clothes, k);
  const pt = (x, y, z) => add(add(add(at, ax[0], x), ax[1], y), ax[2], z);
  for (const [side, l] of [[-1, len], [1, len * 0.8]]) {
    for (const face of [1, -1]) {
      grid(out, 6, 16, (u, w) => {
        const x = side * (0.02 + 0.04 * w) + (u - 0.5) * 0.17 * (1 - 0.15 * w);
        const y = -0.005 - w * l;
        const z = face * 0.004 + 0.012 * Math.sin(w * 5 + side) * w + 0.01 * (1 - w) * (face > 0 ? 1 : 1);
        return { p: pt(x, y, z), part, s: u, t: w };
      }, scale(ax[2], face));
    }
    for (let f = 0; f < 9; f++) {
      const x = side * (0.02 + 0.04) + ((f + 0.5) / 9 - 0.5) * 0.15;
      tube(out, pt(x, -l, 0.012 * Math.sin(5 + side)), pt(x + 0.004 * Math.sin(f * 2.3), -l - 0.05, 0.012 * Math.sin(5 + side)), 0.0018, part, 4);
    }
  }
  // Over the hook: the fold round it.
  const ring = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (i / 10);
    ring.push(pt(-Math.cos(a) * 0.02, Math.sin(a) * 0.012, 0.004));
  }
  for (let b = -2; b <= 2; b++) sweep(out, ring.map(p => add(p, ax[2], b * 0.0)).map(p => add(p, [0, 0, 0], 0)).map((p, i) => add(p, ax[0], 0)), 0.006, part, { seg: 5 });
}
