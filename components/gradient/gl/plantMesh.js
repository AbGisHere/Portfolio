/**
 * (0.4.2) The house's own plants, each its species, built leaf by leaf in
 * code (not the meadow's trees, treeShader.js): every leaf a small curved
 * surface of its own shape, on stems and branches that carry it.
 *
 * - **Olive** (the terrace): a gnarled trunk that twists as it climbs and
 *   parts into a few limbs, twigs off them, and on the twigs narrow
 *   lance-shaped leaves in pairs, grey-green above, silver beneath.
 * - **Fiddle-leaf fig** (by the glass inside): a few stems up from the
 *   pot, big fiddle-shaped leaves off them on short stalks, cupped and
 *   drooping, glossy, a pale midrib.
 * - **Boxwood**: mounds of small oval leaves on a dense dark core, clipped
 *   round (no longer planted, 0.4.16).
 * - **Coneflowers** (the forecourt's planters, 0.4.16): a rosette of
 *   leaves at the soil, and stems up from it, each with a raised cone and
 *   its ring of drooping pink petals.
 *
 * Leaves are HOUSE_PART.leaf with the species as its variant (.1 olive,
 * .4 fig, .7 box, .91 a coneflower's petals, .97 its cone), their own coordinates `s` along the leaf (0 … 1) and
 * `t` across it (−1 … 1); stems are HOUSE_PART.bark (.1 olive, .5 fig).
 * houseShader.js shades both sides and the light through them.
 */

import { HOUSE_PART } from './houseShape';
import { add, ball, cross, grid, scale, soft, sweep, tube, unit } from './meshKit';

const LEAF = HOUSE_PART.leaf;
const BARK = HOUSE_PART.bark;

function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * One leaf from `p` along `dir`, its face toward `up` (both unit): `len`
 * long, `wid` wide at its widest, its outline `shape(u)` (0 … 1 of the
 * width along it), cupped by `cup` (its edges up) and drooping by `droop`
 * toward its tip.
 */
function leaf(out, p, dir, up, len, wid, shape, cup, droop, variant) {
  const side = unit(cross(dir, up));
  const face = unit(cross(side, dir));
  // (0.4.13) A small leaf (a lavender's, a creeping fig's) in fewer
  // pieces: its curve the same, a quarter of the vertices.
  const small = len < 0.08;
  grid(out, small ? 3 : 6, small ? 2 : 4, (u, w) => {
    const v = w * 2 - 1;
    const half = wid * 0.5 * shape(u);
    let q = add(p, dir, len * u);
    q = add(q, side, half * v);
    q = add(q, face, cup * half * v * v - droop * len * u * u);
    return { p: q, part: LEAF + variant, s: u, t: v };
  }, face);
}

// The species' outlines.
const lance = u => Math.pow(Math.sin(Math.PI * u), 0.9) * (1 - 0.25 * u);
const fiddle = u => {
  const a = Math.sin(Math.PI * Math.pow(u, 0.75));
  // Waisted below the middle, broadest toward the tip.
  return Math.max(0.05, a * (0.75 + 0.35 * u) * (1 - 0.18 * Math.exp(-((u - 0.35) ** 2) / 0.01)));
};
const oval = u => Math.sin(Math.PI * u);

/** A direction off `d` by `ang`, turned `az` round it. */
function turn(d, ang, az) {
  const t1 = unit(cross(d, Math.abs(d[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0]));
  const t2 = cross(d, t1);
  const off = add(scale(t1, Math.cos(az)), t2, Math.sin(az));
  return unit(add(scale(d, Math.cos(ang)), off, Math.sin(ang)));
}

/** An olive whose trunk stands at `base`, `h` tall. */
export function olive(out, base, h, seed) {
  const rnd = seeded(seed);
  // The trunk: a twisting climb, thick at the foot.
  const trunk = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const a = t * 2.6 + rnd() * 0.3;
    trunk.push([base[0] + Math.sin(a) * 0.07 * t, base[1] + t * h * 0.42, base[2] + Math.cos(a * 1.3) * 0.06 * t]);
  }
  sweep(out, trunk, 0.055, BARK + 0.1, { seg: 10 });
  // Knots where it twists.
  for (const k of [2, 4, 6]) ball(out, add(trunk[k], [0.03 * (rnd() - 0.5), 0, 0.03 * (rnd() - 0.5)]), 0.05, BARK + 0.1, 8);
  const top = trunk.at(-1);
  // Limbs, then twigs, then leaves in pairs along the twigs.
  const limbs = 4;
  for (let l = 0; l < limbs; l++) {
    const d = turn([0, 1, 0], 0.5 + rnd() * 0.35, (l / limbs) * Math.PI * 2 + rnd() * 0.5);
    const len = h * (0.3 + 0.12 * rnd());
    const mid = add(add(top, d, len * 0.5), [0, 0.05, 0]);
    const end = add(top, d, len);
    sweep(out, [top, mid, end], 0.028, BARK + 0.1, { seg: 7 });
    for (let k = 0; k < 14; k++) {
      const from = add(top, d, len * (0.3 + 0.7 * rnd()));
      const td = turn(d, 0.4 + rnd() * 0.6, rnd() * Math.PI * 2);
      const tl = 0.22 + 0.22 * rnd();
      const tend = add(from, td, tl);
      tube(out, from, tend, 0.006, BARK + 0.1, 5);
      // The twig's leaves seen as a mass from afar: a loose clump of them
      // round it, dark inside, so the crown reads whole at any distance.
      soft(out, add(from, td, tl * 0.6), [tl * 0.45, tl * 0.3, tl * 0.45], LEAF + 0.15, { e1: 0.9, e2: 0.9, nu: 10, nv: 6, ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] });
      for (let j = 0; j < 12; j++) {
        const at = add(from, td, tl * (0.12 + 0.88 * (j / 11)));
        for (const s of [-1, 1]) {
          const ld = turn(td, 0.6 + rnd() * 0.4, s * Math.PI * 0.5 + rnd() * 0.6);
          const lu = unit(add([0, 1, 0], ld, -0.3));
          leaf(out, at, ld, lu, 0.065 + 0.025 * rnd(), 0.013 + 0.004 * rnd(), lance, 0.25, 0.15, 0.1);
        }
      }
    }
  }
}

/** A fiddle-leaf fig in its pot, its stems from `base`, `h` tall. */
export function fig(out, base, h, seed) {
  const rnd = seeded(seed);
  for (let st = 0; st < 3; st++) {
    const lean = [(rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25];
    const hh = h * (0.7 + 0.3 * rnd());
    const pts = [0, 0.35, 0.7, 1].map(t => [base[0] + lean[0] * t * t * hh + (st - 1) * 0.04, base[1] + t * hh, base[2] + lean[2] * t * t * hh]);
    sweep(out, pts, 0.012, BARK + 0.5, { seg: 6 });
    // Leaves up the stem's top two thirds, alternating round it, bigger
    // lower down; a cluster at the crown.
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = 0.35 + 0.65 * (i / (n - 1));
      const k = Math.min(2, Math.floor(t * 3));
      const at = add(pts[k], add(pts[k + 1], pts[k], -1), t * 3 - k);
      const az = i * 2.4 + st * 1.1 + rnd() * 0.4;
      const d = turn([0, 1, 0], 1.05 + rnd() * 0.3 - t * 0.35, az);
      const stalk = add(at, d, 0.04);
      tube(out, at, stalk, 0.004, BARK + 0.5, 4);
      const ld = unit(add(d, [0, 0.25, 0]));
      const size = 0.26 + 0.1 * (1 - t) + 0.05 * rnd();
      leaf(out, stalk, ld, unit(add([0, 1, 0], ld, -0.5)), size, size * 0.62, fiddle, 0.18, 0.28, 0.4);
    }
  }
}

/** A clipped boxwood mound centred at `c`, `r` round. */
export function boxwood(out, c, r, seed) {
  const rnd = seeded(seed);
  // The dense dark core the leaves stand on.
  ball(out, add(c, [0, -r * 0.08, 0]), r * 0.9, LEAF + 0.75, 12);
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2;
    const e = Math.asin(rnd() * 1.6 - 0.6);
    const n = [Math.cos(e) * Math.cos(a), Math.sin(e) * 0.85, Math.cos(e) * Math.sin(a)];
    const p = add(c, n, r * (0.9 + 0.12 * rnd()));
    const d = turn(unit(n), 1.1 + rnd() * 0.4, rnd() * Math.PI * 2);
    leaf(out, p, d, unit(n), 0.03 + 0.01 * rnd(), 0.016, oval, 0.2, 0.05, 0.7);
  }
}

/**
 * (0.4.16) Coneflowers (echinacea) from the soil at `c`, about `h` tall: a
 * rosette of long rough leaves arching out low, then stems wandering up,
 * a leaf or two along each, every stem topped by a raised rust cone and a
 * ring of long petals drooping from it, no two at the same height.
 */
export function coneflower(out, c, h, seed) {
  const rnd = seeded(seed);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rnd() * 0.5;
    const lean = 0.9 + 0.45 * rnd();
    const d = unit([Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean)]);
    leaf(out, add(c, [Math.cos(a) * 0.02, 0.005, Math.sin(a) * 0.02]), d, unit(add([0, 1, 0], d, -0.4)), 0.15 + 0.08 * rnd(), 0.045, lance, 0.25, 0.3, 0.68);
  }
  const stems = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < stems; i++) {
    const a = rnd() * Math.PI * 2;
    const foot = add(c, [Math.cos(a) * 0.05 * rnd(), 0, Math.sin(a) * 0.05 * rnd()]);
    const tall = h * (0.7 + 0.3 * rnd());
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(add(foot, [Math.cos(a) * 0.1 * t * t + 0.01 * Math.sin(t * 5 + i), tall * t, Math.sin(a) * 0.1 * t * t + 0.01 * Math.cos(t * 4 + i)]));
    }
    sweep(out, pts, 0.0032, LEAF + 0.68, { seg: 5 });
    for (const t of [0.3, 0.55]) {
      const at = pts[Math.round(t * 6)];
      const la = a + (t > 0.4 ? Math.PI : 0) + rnd();
      const d = unit([Math.cos(la), 0.5, Math.sin(la)]);
      leaf(out, at, d, unit(add([0, 1, 0], d, -0.5)), 0.08 + 0.03 * rnd(), 0.022, lance, 0.2, 0.25, 0.68);
    }
    const top = pts[6];
    const up = unit(add(pts[6], pts[5], -1));
    ball(out, add(top, up, 0.008), 0.017, LEAF + 0.97, 8, 5);
    const n = 13;
    const az0 = rnd() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const az = az0 + (k / n) * Math.PI * 2;
      const out1 = [Math.cos(az), 0, Math.sin(az)];
      const d = unit(add(out1, up, -0.25 - 0.35 * rnd()));
      leaf(out, add(top, out1, 0.012), d, unit(add(up, out1, -0.2)), 0.045 + 0.012 * rnd(), 0.013, oval, 0.15, 0.3, 0.91);
    }
  }
}

/**
 * (0.4.8) An ornamental grass (feather reed): a clump of long narrow blades
 * from a tight base, arching out and over, and upright flowering stems
 * with a feathered plume each. Its leaves the leaf part's .3 variant (a
 * blue-green grass), the plumes .6 (straw, catching the light).
 */
export function grassClump(out, c, h, seed) {
  const rnd = seeded(seed);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const lean = 0.25 + 0.6 * rnd();
    const len = h * (0.55 + 0.45 * rnd());
    const d = unit([Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean)]);
    const base = add(c, [Math.cos(a) * 0.03 * rnd(), 0, Math.sin(a) * 0.03 * rnd()]);
    leaf(out, base, d, unit(add([0, 1, 0], d, -0.9)), len, 0.016 + 0.008 * rnd(), lance, 0.6, 0.35 + 0.3 * rnd(), 0.3);
  }
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const top = add(c, [Math.cos(a) * 0.08, h * (1.3 + 0.3 * rnd()), Math.sin(a) * 0.08]);
    tube(out, c, top, 0.0025, LEAF + 0.6, 4);
    for (let k = 0; k < 10; k++) {
      const at = add(c, add(top, c, -1).map(x => x * (0.78 + 0.22 * (k / 9))));
      const sd = unit([Math.cos(a + k * 2.4), 1.6, Math.sin(a + k * 2.4)]);
      leaf(out, at, sd, unit([Math.cos(a + k * 2.4 + 1.5), 0, Math.sin(a + k * 2.4 + 1.5)]), 0.05, 0.008, oval, 0.1, 0.05, 0.6);
    }
  }
}

/**
 * (0.4.8) Lavender: a mound of grey-green needle leaves, and slender stems
 * above it, each with its spike of violet flowers.
 */
export function lavender(out, c, r, seed) {
  const rnd = seeded(seed);
  for (let i = 0; i < 360; i++) {
    const a = rnd() * Math.PI * 2;
    const e = Math.asin(rnd() * 0.9);
    const n = unit([Math.cos(e) * Math.cos(a), Math.sin(e) + 0.2, Math.cos(e) * Math.sin(a)]);
    const p = add(c, [n[0] * r * 0.8, n[1] * r * 0.55, n[2] * r * 0.8]);
    leaf(out, p, unit(add(n, [0, 0.6, 0])), unit(add([0, 1, 0], n, -0.5)), 0.055 + 0.02 * rnd(), 0.007, lance, 0.2, 0.1, 0.3);
  }
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const k = Math.sqrt(rnd());
    const foot = add(c, [Math.cos(a) * r * 0.6 * k, r * 0.35, Math.sin(a) * r * 0.6 * k]);
    const top = add(foot, [Math.cos(a) * 0.08 * k, 0.28 + 0.12 * rnd(), Math.sin(a) * 0.08 * k]);
    tube(out, foot, top, 0.0018, LEAF + 0.3, 4);
    // The spike: whorls of flowers up its last 7 cm.
    for (let w = 0; w < 7; w++) {
      const at = add(foot, add(top, foot, -1).map(x => x * (0.82 + 0.18 * (w / 6))));
      ball(out, at, 0.008 - 0.0005 * w, LEAF + 0.85, 5, 3);
    }
  }
}

/**
 * (0.4.9) A creeping fig trailing over a planter's edge at `edge`, falling
 * along `dir` (unit, away from the planter): wiry stems curving over the
 * lip and hanging, clothed thick with small rounded leaves on short stalks
 * in two ranks along them, each turned out to the light, the youngest
 * smallest at the tips.
 */
export function trailing(out, edge, dir, len, seed) {
  const rnd = seeded(seed);
  const side = unit([dir[2], 0, -dir[0]]);
  for (let i = 0; i < 9; i++) {
    const off = (rnd() - 0.5) * 0.55;
    const drop = len * (0.45 + 0.55 * rnd());
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      // Over the lip, then down the face, a little away from it.
      const out1 = 0.05 * Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) + 0.015 * t;
      const down = t < 0.25 ? -0.02 + 0.06 * Math.sin(t * 4 * Math.PI * 0.5) * (1 - t * 4) : -(t - 0.25) / 0.75 * drop;
      pts.push(add(add(edge, side, off + 0.04 * Math.sin(k * 0.9 + i)), add(scale(dir, out1), [0, down + 0.02, 0])));
    }
    sweep(out, pts, 0.0018, BARK + 0.5, { seg: 4 });
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1];
      const b = pts[k];
      const along = unit(add(b, a, -1));
      for (let j = 0; j < 4; j++) {
        const t = (j + rnd() * 0.5) / 4;
        const at = add(a, add(b, a, -1).map(x => x * t));
        const rank = (k * 4 + j) % 2 ? 1 : -1;
        // Out to the light: off the stem sideways and away from the wall.
        const ld = unit(add(add(scale(side, rank * 0.8), dir, 0.9), [0, 0.35, 0]));
        const face = unit(add(dir, [0, 0.4, 0]));
        const size = 0.022 + 0.014 * (1 - k / pts.length) + 0.006 * rnd();
        const stalk = add(at, ld, 0.006);
        leaf(out, stalk, ld, face, size, size * 0.78, oval, 0.15, 0.08, 0.45);
      }
    }
  }
}
