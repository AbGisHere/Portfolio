/**
 * (0.4.2) The house meshed in code from houseShape.js: the mound, the stone
 * base and its steps, walls built round their openings (render outside,
 * plaster in, so every window has its reveal), the rooms behind the glass
 * (floors, ceilings, the furniture, the lamps), the terrace and its pool,
 * the roof with its fascia and soffit. Opaque, in KIT_STRIDE vertices
 * (meshKit.js); the glass panes and the water are houseGlass.js's.
 */

import { BOLLARDS, EDGE, FLOOR, GLASS_THICK, HOUSE_LIGHTS, HOUSE_STRIPS, HOUSE_PART, MOUND, PLAN, POOL, STOREY, TERRACE, WALL, moundY } from './houseShape';
import { ball, barPull, box, grid, lathe, tube } from './meshKit';
import { MIRRORS, lounger } from './furniture';
import { groundRooms, upperRooms } from './houseRooms';
import { coneflower, fig, grassClump, lavender, olive, trailing } from './plantMesh';

// (0.4.16) A seeded stream for the planting's drifts.
const seededMesh = seed => {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const B = FLOOR;
const T = TERRACE;
const P = HOUSE_PART;
// A part with a variant (0 … 0.9): houseShader.js reads the fraction.
const v = (part, k) => part + Math.min(0.9, Math.max(0, k));
// The slab under each floor's roof, and the ceiling's height in a room.
const SLAB = 0.35;
const [px0, px1] = [POOL.at[0] - POOL.w / 2, POOL.at[0] + POOL.w / 2];
const [pz0, pz1] = [POOL.at[2] - POOL.d / 2, POOL.at[2] + POOL.d / 2];
const COPING = 0.35;

/**
 * A wall along x (its outer face at z = `face`, its inside toward −z by
 * WALL, or +z for a `back` wall) or along z (`alongZ`: its outer face at x = `face`, inside toward
 * the house's middle), from `a` to `b` along it, `y0` to `y1`, with
 * `openings` [a0, a1, y0, y1] cut through it. A render skin outside, plaster
 * behind.
 */
function wall(out, { alongZ = false, face, a, b, y0, y1, openings = [], skin = P.render, back = false }) {
  const inward = alongZ ? -Math.sign(face) : back ? 1 : -1;
  const layers = [
    [face, face + inward * 0.05, skin],
    [face + inward * 0.05, face + inward * WALL, P.plaster],
  ];
  const ops = [...openings].sort((p, q) => p[0] - q[0]);
  // The wall's pieces in its own plane: [a0, a1, y0, y1].
  const pieces = [];
  let at = a;
  for (const [o0, o1, oy0, oy1] of ops) {
    if (o0 > at) pieces.push([at, o0, y0, y1]);
    if (oy0 > y0) pieces.push([o0, o1, y0, oy0]);
    if (oy1 < y1) pieces.push([o0, o1, oy1, y1]);
    at = o1;
  }
  if (b > at) pieces.push([at, b, y0, y1]);
  for (const [d0, d1, part] of layers) {
    const [n0, n1] = [Math.min(d0, d1), Math.max(d0, d1)];
    for (const [s0, s1, t0, t1] of pieces) {
      if (alongZ) box(out, [n0, t0, s0], [n1, t1, s1], part);
      else box(out, [s0, t0, n0], [s1, t1, n1], part);
    }
  }
}

/** A frame round an opening in a wall along x at z (the glass's plane):
 * jambs, head and sill as 6 × 8 cm aluminium, and mullions at `xs`. */
function frameX(out, x0, x1, y0, y1, z, xs = []) {
  // (2 mm in from the opening all round, never in its reveals' planes.)
  [x0, x1, y0, y1] = [x0 + 0.002, x1 - 0.002, y0 + 0.002, y1 - 0.002];
  const d = [z - 0.045, z + 0.035];
  box(out, [x0, y0, d[0]], [x0 + 0.06, y1, d[1]], P.frame);
  box(out, [x1 - 0.06, y0, d[0]], [x1, y1, d[1]], P.frame);
  box(out, [x0, y1 - 0.06, d[0]], [x1, y1, d[1]], P.frame);
  box(out, [x0, y0, d[0]], [x1, y0 + 0.05, d[1]], P.frame);
  for (const x of xs) box(out, [x - 0.035, y0, d[0]], [x + 0.035, y1, d[1]], P.frame);
}

/**
 * (0.4.4) A wall of sliding glass: panels between the xs, each in its own
 * slim aluminium frame, on two tracks (alternate panels a track behind, so
 * they pass); `open` slides a panel (by its index) along its track by that
 * many metres, over its neighbour.
 */
function sliders(out, pane, xs, y0, y1, z, open = {}) {
  for (let i = 0; i < xs.length - 1; i++) {
    const shift = open[i] ?? 0;
    const tz = i % 2 ? z - 0.075 : z;
    const [x0, x1] = [xs[i] + 0.01 + shift, xs[i + 1] - 0.01 + shift];
    const d = [tz - 0.03, tz + 0.03];
    box(out, [x0, y0, d[0]], [x0 + 0.055, y1, d[1]], P.frame);
    box(out, [x1 - 0.055, y0, d[0]], [x1, y1, d[1]], P.frame);
    box(out, [x0, y1 - 0.06, d[0]], [x1, y1, d[1]], P.frame);
    box(out, [x0, y0, d[0]], [x1, y0 + 0.08, d[1]], P.frame);
    // A slim bar pull on the meeting stile (0.4.18, on posts; a block
    // before), on the face away from the other track, clear of it.
    const face = i % 2 ? -1 : 1;
    barPull(out, [x1 - 0.0675, y0 + 0.85, tz + face * 0.03], [x1 - 0.0675, y0 + 1.55, tz + face * 0.03], [0, 0, face], P.frame, { r: 0.008, off: 0.03 });
    pane([x0 + 0.05, y0 + 0.075, tz - GLASS_THICK / 2], [x1 - 0.05, y1 - 0.055, tz + GLASS_THICK / 2]);
  }
}

/** The same along z at x. */
function frameZ(out, z0, z1, y0, y1, x) {
  [z0, z1, y0, y1] = [z0 + 0.002, z1 - 0.002, y0 + 0.002, y1 - 0.002];
  const d = [x - 0.04, x + 0.04];
  box(out, [d[0], y0, z0], [d[1], y1, z0 + 0.06], P.frame);
  box(out, [d[0], y0, z1 - 0.06], [d[1], y1, z1], P.frame);
  box(out, [d[0], y1 - 0.06, z0], [d[1], y1, z1], P.frame);
  box(out, [d[0], y0, z0], [d[1], y0 + 0.06, z1], P.frame);
}

/** The stair's void through the slab over the ground floor (x0, z0, x1,
 * z1). */
const VOID = [-7.72, -77.0, -6.2, -72.0];

/** A slab from lo to hi with a hole (x0, z0, x1, z1) through it. */
function holed(out, lo, hi, [hx0, hz0, hx1, hz1], part) {
  box(out, [lo[0], lo[1], lo[2]], [hi[0], hi[1], hz0], part);
  box(out, [lo[0], lo[1], hz1], [hi[0], hi[1], hi[2]], part);
  if (hx0 > lo[0]) box(out, [lo[0], lo[1], hz0], [hx0, hi[1], hz1], part);
  if (hx1 < hi[0]) box(out, [hx1, lo[1], hz0], [hi[0], hi[1], hz1], part);
}

/** The mound, the house, its rooms and its terrace: `{ data, count }`,
 * plus `glass` (the panes: [lo, hi, rail] boxes, `rail` the terrace's
 * and the balustrades') for houseGlass.js. */
export function houseLayout() {
  MIRRORS.length = 0;
  const out = [];
  const glass = [];
  const pane = (lo, hi, rail = false) => glass.push([lo, hi, rail]);

  // ---- The mound: rings out from its top, a little past its foot.
  const [cx, cz] = MOUND.at;
  const [rx, rz] = MOUND.r;
  grid(out, 48, 96, (u, w) => {
    const r = 1.12 * u ** 1.35;
    const a = w * Math.PI * 2;
    const x = cx + rx * r * Math.cos(a);
    const z = cz + rz * r * Math.sin(a);
    return { p: [x, moundY(x, z), z], part: P.lawn, s: x, t: z };
  });
  // (0.4.12) The lawn is drawn on its own, under the meadow's paint
  // (MistCanvas.jsx): its vertices first, this many.
  const lawn = out.length / 9;
  // Stepping stones down the mound toward the desk.
  for (let i = 0; i < 14; i++) {
    const z = -55.6 + i * 1.05;
    const x = Math.sin(i * 0.7) * 0.5 + (i % 2 ? 0.18 : -0.18);
    const y = moundY(x, z);
    box(out, [x - 0.36, y - 0.08, z - 0.26], [x + 0.36, y + 0.035, z + 0.26], v(P.stone, 0.5 + 0.04 * (i % 5)));
  }

  // (0.4.6) The path's bollards: a bronze post, its light in a slot near
  // its top; the uplights' cans, sunk flush.
  for (const [x, z] of BOLLARDS) {
    const y = moundY(x, z);
    box(out, [x - 0.05, y - 0.1, z - 0.05], [x + 0.05, y + 0.6, z + 0.05], v(P.brass, 0.6));
    box(out, [x - 0.051, y + 0.5, z - 0.051], [x + 0.051, y + 0.56, z + 0.051], P.lamp);
  }
  for (const [x, y, z, , , kind] of HOUSE_LIGHTS) if (kind === 4) lathe(out, [x, y - 0.04, z], [0, 1, 0], [[0, 0], [0.05, 0], [0.05, 0.04], [0.035, 0.04], [0, 0.043]], P.lamp, 14);

  // ---- The stone base, its forecourt, the steps and their cheek walls.
  box(out, [-9.5, 0.2, -81], [9.5, B, -57.5], P.stone);
  const front = moundY(0, -57.5);
  const steps = 5;
  const rise = (B - front) / steps;
  // (0.4.9) Each step a block of the base's stone, its riser set back
  // under a limestone tread 4 cm thick whose nose overhangs it by 3 cm,
  // its edge eased; the forecourt paved in the same limestone.
  for (let i = 0; i < steps; i++) {
    const [z0, z1] = [-57.5 + i * 0.34, -57.5 + (i + 1) * 0.34];
    const yT = B - (i + 1) * rise;
    box(out, [-1.4, front - 0.3, z0], [1.4, yT - 0.04, z1], v(P.stone, 0.3));
    box(out, [-1.4, yT - 0.04, z0], [1.4, yT, z1 + 0.03], P.paver);
    tube(out, [-1.4, yT - 0.02, z1 + 0.03], [1.4, yT - 0.02, z1 + 0.03], 0.02, P.paver, 8);
  }
  box(out, [-9.5, B, -81], [9.5, B + 0.015, -57.5], P.paver, { bottom: false });
  for (const x of [-1.7, 1.4]) box(out, [x, front - 0.3, -57.5], [x + 0.3, B + 0.1, -57.5 + steps * 0.34], P.stone);
  // (0.4.8) A recessed step light in each cheek wall, at every other step.
  for (let i = 0; i < steps; i += 2) {
    const y = B - (i + 1) * rise + 0.12;
    const z = -57.5 + (i + 0.5) * 0.34;
    box(out, [-1.401, y, z - 0.05], [-1.399, y + 0.035, z + 0.05], P.lamp);
    box(out, [1.399, y, z - 0.05], [1.401, y + 0.035, z + 0.05], P.lamp);
  }
  // (0.4.8) The forecourt's planters: board-formed concrete (the planks'
  // marks across them), a thin steel coping, and (0.4.16) a bed of dark
  // mulch set 7 cm down, heaped a little, and planted in drifts: feather-
  // reed grass arching over, lavender, coneflowers in twos and threes,
  // creeping fig trailing over the front, the mulch showing between.
  for (const [x0, x1] of [[-9.2, -3.2], [3.2, 9.2]]) {
    // (0.4.16) A shell 6 cm thick, filled to the bed (it was solid, its
    // coping a plate over the whole top, so no soil showed), the coping a
    // rim round its walls.
    const t = 0.06;
    const shell = [
      [[x0, -58.5], [x1, -58.5 + t]],
      [[x0, -57.7 - t], [x1, -57.7]],
      [[x0, -58.5 + t], [x0 + t, -57.7 - t]],
      [[x1 - t, -58.5 + t], [x1, -57.7 - t]],
    ];
    for (const [[ax, az], [bx, bz]] of shell) {
      box(out, [ax, B, az], [bx, B + 0.6, bz], v(P.planter, 0.15));
      box(out, [ax - 0.008, B + 0.6, az - 0.008], [bx + 0.008, B + 0.612, bz + 0.008], v(P.steel, 0.2));
    }
    box(out, [x0 + t, B, -58.5 + t], [x1 - t, B + 0.49, -57.7 - t], P.soil, { bottom: false });
    const bed = (x, z) => {
      const ex = Math.min(x - x0 - t, x1 - t - x) / 0.25;
      const ez = Math.min(z + 58.5 - t, -57.7 - t - z) / 0.12;
      const heap = Math.min(1, Math.max(0, Math.min(ex, ez)));
      return B + 0.5 + 0.035 * Math.sqrt(heap) + 0.006 * Math.sin(x * 23 + z * 7) * Math.sin(z * 31 - x * 5);
    };
    grid(out, Math.round((x1 - x0) * 12), 8, (u, w) => {
      const x = x0 + t + u * (x1 - x0 - 2 * t);
      const z = -58.5 + t + w * (0.8 - 2 * t);
      return { p: [x, bed(x, z), z], part: P.soil, s: u, t: w };
    });
    // Each spot's plant from where it falls along the bed (drifts, not a
    // repeat): the grass every metre or so, then lavender or coneflowers by
    // a slow wave, each spot nudged off the line.
    const right = x0 > 0;
    const rnd = seededMesh(right ? 77 : 41);
    let x = x0 + 0.3;
    let k = 0;
    while (x < x1 - 0.25) {
      const z = -58.1 + (rnd() - 0.5) * 0.36;
      const seed = 31 + k * 7 + (right ? 3 : 0);
      const wave = Math.sin((x - x0) * 1.3 + (right ? 2 : 0));
      const y = bed(x, z);
      if (k % 4 === 2) {
        grassClump(out, [x, y, -58.15], 0.7, seed);
        x += 0.4;
      } else if (wave > 0.1) {
        coneflower(out, [x, y, z], 0.55 + 0.15 * rnd(), seed);
        x += 0.22 + 0.1 * rnd();
      } else {
        lavender(out, [x, y, z], 0.28, seed);
        x += 0.3 + 0.08 * rnd();
      }
      if (rnd() < 0.45) trailing(out, [x, B + 0.61, -57.72], [0, 0, 1], 0.45, seed + 1);
      k++;
    }
  }

  // ---- The ground floor.
  const G = PLAN.ground;
  const top = B + STOREY - SLAB;
  // The front: one wide opening of sliding glass, a timber panel by it.
  const gOpen = [-7.4, 4.6, B, top - 0.05];
  // The front door, a tall walnut pivot door in the timber.
  const fd = [5.6, 6.8, B, B + 2.5];
  wall(out, { face: G.z[1], a: G.x[0], b: G.x[1], y0: B, y1: top, openings: [gOpen, fd] });
  box(out, [4.6, B, G.z[1]], [fd[0], top, G.z[1] + 0.04], P.timber);
  box(out, [fd[1], B, G.z[1]], [G.x[1], top, G.z[1] + 0.04], P.timber);
  box(out, [fd[0], fd[3], G.z[1]], [fd[1], top, G.z[1] + 0.04], P.timber);
  box(out, [fd[0] + 0.01, B, G.z[1] - 0.18], [fd[1] - 0.01, fd[3] - 0.01, G.z[1] - 0.1], v(P.walnut, 0.6));
  // (0.4.18) A long brass bar pull each side on posts (it was a block).
  barPull(out, [fd[1] - 0.15, B + 0.85, G.z[1] - 0.1], [fd[1] - 0.15, B + 1.95, G.z[1] - 0.1], [0, 0, 1], P.brass, { r: 0.013, off: 0.06 });
  barPull(out, [fd[1] - 0.15, B + 0.85, G.z[1] - 0.18], [fd[1] - 0.15, B + 1.95, G.z[1] - 0.18], [0, 0, -1], P.brass, { r: 0.013, off: 0.06 });
  const gz = G.z[1] - 0.12;
  const gx = [-7.4, -4.4, -1.4, 1.6, 4.6];
  frameX(out, gOpen[0], gOpen[1], gOpen[2], gOpen[3], gz, []);
  sliders(out, pane, gx, B + 0.05, gOpen[3] - 0.06, gz, { 2: -2.6 });
  // The sides, a slot window each (by the living room's front corner; high
  // in the WC); the back, blind.
  for (const sx of [G.x[0], G.x[1]]) {
    const slot = sx < 0 ? [-66.4, -63.9, B + 0.5, top - 0.35] : [-71.1, -68.0, B + 1.7, top - 0.35];
    wall(out, { alongZ: true, face: sx, a: G.z[0] + WALL, b: G.z[1] - WALL, y0: B, y1: top, openings: [slot] });
    const fx = sx - Math.sign(sx) * 0.1;
    frameZ(out, slot[0], slot[1], slot[2], slot[3], fx);
    pane([fx - GLASS_THICK / 2, slot[2] + 0.06, slot[0] + 0.06], [fx + GLASS_THICK / 2, slot[3] - 0.06, slot[1] - 0.06]);
  }
  // The back: a band window into the study (the kitchen's run is on the
  // rest).
  const sb = [-4.8, 0.8, B + 1.05, top - 0.3];
  wall(out, { face: G.z[0], a: G.x[0], b: G.x[1], y0: B, y1: top, back: true, openings: [sb] });
  frameX(out, sb[0], sb[1], sb[2], sb[3], G.z[0] + 0.1, [-2.0]);
  pane([sb[0] + 0.06, sb[2] + 0.05, G.z[0] + 0.1 - GLASS_THICK / 2], [sb[1] - 0.06, sb[3] - 0.06, G.z[0] + 0.1 + GLASS_THICK / 2]);
  // Inside: an oak floor and the ceiling, holed for the stair.
  const ix = [G.x[0] + WALL, G.x[1] - WALL];
  const iz = [G.z[0] + WALL, G.z[1] - WALL];
  box(out, [ix[0], B, iz[0]], [ix[1], B + 0.02, iz[1]], P.oak, { bottom: false });
  holed(out, [ix[0], top - 0.02, iz[0]], [ix[1], top, iz[1]], VOID, P.ceiling);
  groundRooms(out, ix, iz, glass);
  // (0.4.6) The LED strips, each a thin bright line where it's fitted.
  for (const [a, b, , , , , hidden] of HOUSE_STRIPS) if (!hidden) tube(out, a, b, 0.005, P.lamp, 6);
  // The recessed lights in both ceilings (HOUSE_LIGHTS kind 3).
  for (const [x, y, z, , , kind] of HOUSE_LIGHTS) {
    if (kind === 3) lathe(out, [x, y + 0.05, z], [0, -1, 0], [[0.075, 0], [0.06, 0.012], [0, 0.012]], P.lamp, 16);
  }

  // ---- The terrace slab round the pool's hole, the pool, the deck.
  const sy = [top, T];
  holed(out, [-8.4, sy[0], -79.4], [8.4, sy[1], pz0], VOID, P.slab);
  box(out, [-8.4, sy[0], pz1], [8.4, sy[1], EDGE], P.slab);
  // Under the cantilever the pool's basin, cast as the porch's roof, and
  // two slim columns at the front corners.
  const fl0 = POOL.at[1] - POOL.deep;
  const bz1 = Math.min(pz1 + 0.3, EDGE);
  box(out, [px0 - 0.3, fl0 - 0.18, pz0 - 0.3], [px1 + 0.3, fl0 - 0.05, bz1], v(P.slab, 0.3));
  box(out, [px0 - 0.3, fl0 - 0.05, pz0 - 0.3], [px0, top, bz1], v(P.slab, 0.3));
  box(out, [px1, fl0 - 0.05, pz0 - 0.3], [px1 + 0.3, top, bz1], v(P.slab, 0.3));
  box(out, [px0, fl0 - 0.05, pz0 - 0.3], [px1, top, pz0], v(P.slab, 0.3));
  box(out, [px0, fl0 - 0.05, pz1], [px1, top, bz1], v(P.slab, 0.3));
  for (const x of [-8.1, 8.1]) box(out, [x - 0.09, B, EDGE - 0.28], [x + 0.09, top, EDGE - 0.1], P.steel);
  // (Only the porch's, under the cantilever: the bollards are kind 1 too.)
  for (const [x, , z, , , kind] of HOUSE_LIGHTS) if (kind === 1 && z > G.z[1] && z < EDGE) box(out, [x - 0.07, top - 0.012, z - 0.07], [x + 0.07, top, z + 0.07], P.lamp);
  box(out, [-8.4, sy[0], pz0], [px0, sy[1], pz1], P.slab);
  box(out, [px1, sy[0], pz0], [8.4, sy[1], pz1], P.slab);
  // The basin: tiled floor and walls, and steps down at one end.
  const fl = POOL.at[1] - POOL.deep;
  box(out, [px0, fl - 0.05, pz0], [px1, fl, pz1], P.tile);
  box(out, [px0, fl, pz0], [px0 + 0.02, T, pz1], P.tile);
  box(out, [px1 - 0.02, fl, pz0], [px1, T, pz1], P.tile);
  box(out, [px0, fl, pz0], [px1, T, pz0 + 0.02], P.tile);
  box(out, [px0, fl, pz1 - 0.02], [px1, T, pz1], P.tile);
  for (let i = 0; i < 4; i++) box(out, [px1 - 0.02 - (4 - i) * 0.34, fl, pz0 + 0.02], [px1 - 0.02, POOL.at[1] - 0.25 - i * 0.27, pz1 - 0.02], P.tile);
  // The coping round it, the decking round that.
  const dy = [T, T + 0.05];
  box(out, [px0 - COPING, dy[0], pz0 - COPING], [px1 + COPING, dy[1] + 0.01, pz0], v(P.stone, 0.8));
  box(out, [px0 - COPING, dy[0], pz1], [px1 + COPING, dy[1] + 0.01, pz1 + COPING], v(P.stone, 0.8));
  box(out, [px0 - COPING, dy[0], pz0], [px0, dy[1] + 0.01, pz1], v(P.stone, 0.8));
  box(out, [px1, dy[0], pz0], [px1 + COPING, dy[1] + 0.01, pz1], v(P.stone, 0.8));
  box(out, [-8.4, dy[0], pz1 + COPING], [8.4, dy[1], EDGE], P.deck);
  box(out, [-8.4, dy[0], PLAN.upper.z[1]], [8.4, dy[1], pz0 - COPING], P.deck);
  box(out, [-8.4, dy[0], pz0 - COPING], [px0 - COPING, dy[1], pz1 + COPING], P.deck);
  box(out, [px1 + COPING, dy[0], pz0 - COPING], [8.4, dy[1], pz1 + COPING], P.deck);
  // Frameless glass round the terrace's open sides, in a steel shoe.
  const gy = dy[1];
  const run = [[[-8.25, -70.9], [-8.25, EDGE - 0.15]], [[-8.25, EDGE - 0.15], [8.25, EDGE - 0.15]], [[8.25, EDGE - 0.15], [8.25, -70.9]]];
  for (const [a, b] of run) {
    const alongX = a[1] === b[1];
    const len = Math.abs(alongX ? b[0] - a[0] : b[1] - a[1]);
    const n = Math.round(len / 1.6);
    const lo = [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
    if (alongX) box(out, [lo[0] - 0.04, gy, a[1] - 0.04], [lo[0] + len + 0.04, gy + 0.1, a[1] + 0.04], P.steel);
    else box(out, [a[0] - 0.04, gy, lo[1] - 0.04], [a[0] + 0.04, gy + 0.1, lo[1] + len + 0.04], P.steel);
    for (let k = 0; k < n; k++) {
      const s0 = (len * k) / n + 0.006;
      const s1 = (len * (k + 1)) / n - 0.006;
      if (alongX) pane([lo[0] + s0, gy + 0.04, a[1] - 0.006], [lo[0] + s1, gy + 1.05, a[1] + 0.006], true);
      else pane([a[0] - 0.006, gy + 0.04, lo[1] + s0], [a[0] + 0.006, gy + 1.05, lo[1] + s1], true);
    }
    // (0.4.17) A brushed-brass handrail capping the glass, the panes
    // seated in its slot; a knuckle at each corner, a rounded end at the
    // wall.
    tube(out, [a[0], gy + 1.062, a[1]], [b[0], gy + 1.062, b[1]], 0.021, P.brass, 14);
  }
  for (const [x, z, r] of [[-8.25, EDGE - 0.15, 0.024], [8.25, EDGE - 0.15, 0.024], [-8.25, -70.9, 0.021], [8.25, -70.9, 0.021]]) ball(out, [x, gy + 1.062, z], r, P.brass, 14, 8);
  // Two loungers by the pool, a side table between, an olive in a pot.
  for (const x of [5.65, 7.25]) lounger(out, x, -63.85, gy);
  box(out, [6.08, gy, -62.50], [6.62, gy + 0.42, -61.96], P.walnut);
  // (0.4.17) The olive's pot: thrown stoneware in a dark glaze, wide at
  // the shoulder, a rolled lip, tapering to a foot that lifts it off the
  // deck; the soil 6 cm down inside the lip (it was a plain box).
  const potAt = [-7.2, gy, -59.4];
  lathe(out, potAt, [0, 1, 0], [[0, 0.012], [0.25, 0.012], [0.26, 0], [0.29, 0.03], [0.34, 0.2], [0.4, 0.5], [0.42, 0.66], [0.445, 0.69], [0.45, 0.72], [0.435, 0.745], [0.4, 0.75], [0.385, 0.73], [0.38, 0.69]], v(P.ceramic, 0.8), 40);
  lathe(out, potAt, [0, 1, 0], [[0.385, 0.69], [0.2, 0.7], [0, 0.71]], P.soil, 40);
  olive(out, [-7.2, gy + 0.7, -59.4], 2.6, 7);

  // ---- The upper floor, set back off the terrace.
  const U = PLAN.upper;
  const utop = T + STOREY - SLAB;
  const uOpen = [-7.2, 2.6, T + 0.05, utop - 0.05];
  wall(out, { face: U.z[1], a: U.x[0], b: U.x[1], y0: T + 0.05, y1: utop, openings: [uOpen] });
  box(out, [2.6, T + 0.05, U.z[1]], [U.x[1], utop, U.z[1] + 0.04], P.timber);
  const uz = U.z[1] - 0.12;
  const ux = [-7.2, -3.93, -0.67, 2.6];
  frameX(out, uOpen[0], uOpen[1], uOpen[2], uOpen[3], uz, []);
  // (0.4.14) Open in the middle (the owner): its middle panel slid over
  // the one on its left.
  sliders(out, pane, ux, uOpen[2] + 0.05, uOpen[3] - 0.06, uz, { 1: -2.5 });
  // The sides: blind on the landing's; on the far side a slot for the
  // en-suite and one for the guest room.
  wall(out, { alongZ: true, face: U.x[0], a: U.z[0] + WALL, b: U.z[1] - WALL, y0: T + 0.05, y1: utop });
  const slots = [[-74.6, -72.2, T + 1.5, utop - 0.3], [-78.2, -76.0, T + 0.7, utop - 0.4]];
  wall(out, { alongZ: true, face: U.x[1], a: U.z[0] + WALL, b: U.z[1] - WALL, y0: T + 0.05, y1: utop, openings: slots });
  for (const slot of slots) {
    frameZ(out, slot[0], slot[1], slot[2], slot[3], U.x[1] - 0.1);
    pane([U.x[1] - 0.1 - GLASS_THICK / 2, slot[2] + 0.06, slot[0] + 0.06], [U.x[1] - 0.1 + GLASS_THICK / 2, slot[3] - 0.06, slot[1] - 0.06]);
  }
  // The back: a window for the guest room.
  const ub = [3.6, 6.9, T + 0.85, utop - 0.3];
  wall(out, { face: U.z[0], a: U.x[0], b: U.x[1], y0: T + 0.05, y1: utop, back: true, openings: [ub] });
  frameX(out, ub[0], ub[1], ub[2], ub[3], U.z[0] + 0.1, [5.25]);
  pane([ub[0] + 0.06, ub[2] + 0.05, U.z[0] + 0.1 - GLASS_THICK / 2], [ub[1] - 0.06, ub[3] - 0.06, U.z[0] + 0.1 + GLASS_THICK / 2]);
  const jx = [U.x[0] + WALL, U.x[1] - WALL];
  const jz = [U.z[0] + WALL, U.z[1] - WALL];
  holed(out, [jx[0], T + 0.05, jz[0]], [jx[1], T + 0.07, jz[1]], VOID, P.oak);
  box(out, [jx[0], utop - 0.02, jz[0]], [jx[1], utop, jz[1]], P.ceiling);
  upperRooms(out, glass, jx, jz);

  // ---- The roof: a slab reaching out over the terrace, a deep fascia, a
  // soffit with its downlights.
  // (0.4.17) Built up as a roof is (it was one plain slab): the slab; a
  // fascia all round in two layers, a deep band of smooth render under a
  // bronzed metal coping standing up as a low parapet, a shadow gap
  // between; under the overhang a soffit of timber boards, recessed;
  // inside the parapet a sedum roof with a margin of pale gravel; and at
  // the back two scuppers through the parapet into downpipes.
  const R = PLAN.roof;
  const rt = utop + SLAB + 0.05;
  box(out, [R.x[0], utop, R.z[0]], [R.x[1], rt, R.z[1]], P.slab);
  const ring = (x0, z0, x1, z1, y0, y1, part, t) => {
    box(out, [x0, y0, z1 - t], [x1, y1, z1], part);
    box(out, [x0, y0, z0], [x1, y1, z0 + t], part);
    box(out, [x0, y0, z0 + t], [x0 + t, y1, z1 - t], part);
    box(out, [x1 - t, y0, z0 + t], [x1, y1, z1 - t], part);
  };
  const o = 0.03;
  ring(R.x[0] - o, R.z[0] - o, R.x[1] + o, R.z[1] + o, utop - 0.16, rt - 0.02, v(P.slab, 0.3), 0.06);
  ring(R.x[0] - o + 0.012, R.z[0] - o + 0.012, R.x[1] + o - 0.012, R.z[1] + o - 0.012, rt - 0.02, rt + 0.01, P.frame, 0.05);
  ring(R.x[0] - o - 0.01, R.z[0] - o - 0.01, R.x[1] + o + 0.01, R.z[1] + o + 0.01, rt + 0.01, rt + 0.2, v(P.steel, 0.15), 0.07);
  box(out, [R.x[0] - o - 0.01, rt + 0.2, R.z[0] - o - 0.01], [R.x[1] + o + 0.01, rt + 0.212, R.z[0] - o + 0.07], v(P.steel, 0.15));
  box(out, [R.x[0] - o - 0.01, rt + 0.2, R.z[1] + o - 0.07], [R.x[1] + o + 0.01, rt + 0.212, R.z[1] + o + 0.01], v(P.steel, 0.15));
  box(out, [R.x[0] - o - 0.01, rt + 0.2, R.z[0] - o + 0.07], [R.x[0] - o + 0.07, rt + 0.212, R.z[1] + o - 0.07], v(P.steel, 0.15));
  box(out, [R.x[1] + o - 0.07, rt + 0.2, R.z[0] - o + 0.07], [R.x[1] + o + 0.01, rt + 0.212, R.z[1] + o - 0.07], v(P.steel, 0.15));
  // The soffit: boards 3 cm up into the overhang, held off the fascia by a
  // shadow gap, over the terrace and round the sides.
  const sf = utop - 0.03;
  const inner = 0.07;
  box(out, [R.x[0] + inner, sf, U.z[1] + 0.04], [R.x[1] - inner, sf + 0.025, R.z[1] - inner], P.timber);
  for (const [x0, x1] of [[R.x[0] + inner, U.x[0]], [U.x[1], R.x[1] - inner]]) box(out, [x0, sf, R.z[0] + inner], [x1, sf + 0.025, U.z[1] + 0.04], P.timber);
  box(out, [U.x[0], sf, R.z[0] + inner], [U.x[1], sf + 0.025, U.z[0]], P.timber);
  for (const x of [-6, -2, 2, 6]) box(out, [x - 0.07, sf - 0.012, -69.87], [x + 0.07, sf, -69.73], P.lamp);
  // The roof's top: sedum, a gravel margin 30 cm wide inside the parapet.
  const gx0 = R.x[0] - o + 0.07;
  const gx1 = R.x[1] + o - 0.07;
  const gz0 = R.z[0] - o + 0.07;
  const gz1 = R.z[1] + o - 0.07;
  box(out, [gx0, rt, gz0], [gx1, rt + 0.06, gz1], v(P.roof, 0.8), { bottom: false });
  grid(out, 60, 36, (u, w) => {
    const x = gx0 + 0.3 + u * (gx1 - gx0 - 0.6);
    const z = gz0 + 0.3 + w * (gz1 - gz0 - 0.6);
    return { p: [x, rt + 0.075 + 0.012 * Math.sin(x * 3.1 + z * 1.7) * Math.sin(z * 2.3 - x * 0.9), z], part: v(P.roof, 0.2), s: x, t: z };
  });
  for (const x of [R.x[0] + 0.9, R.x[1] - 0.9]) {
    box(out, [x - 0.09, rt + 0.03, R.z[0] - o - 0.06], [x + 0.09, rt + 0.13, R.z[0] - o + 0.07], P.frame);
    box(out, [x - 0.11, rt - 0.12, R.z[0] - o - 0.2], [x + 0.11, rt + 0.03, R.z[0] - o - 0.04], v(P.steel, 0.15));
    // Down from the hopper to under the soffit, back to the wall, and down
    // it to a grating in the paving.
    const zw = U.z[0] - 0.08;
    const pipe = [[x, rt - 0.12, R.z[0] - o - 0.12], [x, sf - 0.12, R.z[0] - o - 0.12], [x, sf - 0.12, zw], [x, B + 0.02, zw]];
    for (let k = 0; k < 3; k++) tube(out, pipe[k], pipe[k + 1], 0.045, v(P.steel, 0.15), 12);
    for (const p of pipe.slice(1, 3)) ball(out, p, 0.047, v(P.steel, 0.15), 12, 6);
    for (const y of [B + 0.8, B + 2.4, B + 4.2, B + 5.8]) box(out, [x - 0.06, y, zw - 0.01], [x + 0.06, y + 0.04, U.z[0]], v(P.steel, 0.15));
    box(out, [x - 0.12, B, zw - 0.12], [x + 0.12, B + 0.012, zw + 0.06], P.frame);
  }

  const data = new Float32Array(out);
  return { data, count: data.length / 9, lawn, glass, mirrors: MIRRORS.map(m => ({ c: [...m.c], n: [...m.n] })) };
}
