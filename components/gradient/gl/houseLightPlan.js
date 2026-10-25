/**
 * (0.4.28) The lighting brief (ROADMAP.md, "Lighting brief (0.4.28)") as
 * the house's lights: an evening of hosting,
 * balanced, mostly hidden light with four statement pieces, warm white
 * varied a little by room. Every light and strip in houseLights.js's form;
 * where a fitting is drawn by lightFixtures.js, the data it's drawn from is
 * here too (PANELS, GLOBES, …), so the light and the thing it comes from
 * can't drift apart.
 *
 * Its colours are close (2700 K through the house, the bedrooms a touch
 * warmer, the washrooms a touch cleaner, the closet between): side by side
 * from the meadow a bigger spread reads as mismatched lamps (the research:
 * once the eye has adapted, colour temperature barely changes how a room
 * feels; what does is how much light the walls and ceilings get).
 */

import { BOLLARDS, FLOOR, MATCH_AXES, PLAN, POOL, STOREY, TERRACE, ZONES, moundY } from './houseShape';
import { axes } from './meshKit';

const B = FLOOR;
const T = TERRACE;
const SLAB = 0.35;
/** The finished floors, and the ceilings' undersides. */
export const FLOORS = { ground: B + 0.02, upper: T + 0.07 };
export const CEILS = { ground: B + STOREY - SLAB - 0.02, upper: T + STOREY - SLAB - 0.02 };
const [FG, FU] = [FLOORS.ground, FLOORS.upper];
const [CG, CU] = [CEILS.ground, CEILS.upper];

export const TONE2 = {
  warm: [1.0, 0.71, 0.44],
  bed: [1.0, 0.685, 0.41],
  wash: [1.0, 0.75, 0.52],
  closet: [1.0, 0.735, 0.49],
  bar: [1.0, 0.675, 0.4],
  moon: [0.86, 0.9, 1.0],
};
const W = TONE2;
// Each room's colour (ZONES; 0 outside).
const ROOM = [W.warm, W.wash, W.warm, W.warm, W.bed, W.closet, W.wash, W.bed, W.warm];

const norm = v => {
  const l = Math.hypot(...v) || 1;
  return v.map(x => x / l);
};
const cosd = deg => Math.cos((deg * Math.PI) / 180);
const frameOf = (c, yaw) => {
  const ax = axes(0, yaw);
  return (x, y, z) => [0, 1, 2].map(i => c[i] + ax[0][i] * x + ax[1][i] * y + ax[2][i] * z);
};

/**
 * The floating ceilings: [x0, x1, z0, z1] in the room's ceiling, a panel
 * 12 cm deep hung 16 cm under it, its cove light along its top edges
 * washing the band of ceiling round it; `night`, `day` its share on.
 */
export const PANEL_DROP = [0.28, 0.16];
export const PANELS = [
  { at: [-7.27, 0.3, -71.65, -63.95], ceil: CG, zone: 3, k: 0.34, night: 1, day: 0.35 },
  { at: [0.75, 4.15, -71.05, -63.95], ceil: CG, zone: 3, k: 0.32, night: 1, day: 0.35 },
  { at: [2.05, 7.27, -78.27, -71.95], ceil: CG, zone: 3, k: 0.26, night: 1, day: 0.35 },
  { at: [-4.95, 1.15, -78.27, -73.45], ceil: CG, zone: 2, k: 0.3, night: 1, day: 0.35 },
  { at: [-4.0, 2.15, -75.3, -71.85], ceil: CU, zone: 4, k: 0.34, night: 1, day: 0.35 },
  { at: [3.1, 7.27, -78.27, -75.45], ceil: CU, zone: 7, k: 0.38, night: 0, day: 0.35 },
  { at: [3.85, 5.35, -72.7, -71.65], ceil: CU, zone: 6, k: 0.3, night: 1, day: 0.35 },
];
/** A panel's underside, where its spots are set. */
export const panelUnder = ceil => ceil - PANEL_DROP[0];

/**
 * The cascade through the stair's void: opal globes [x, z, y (middle),
 * radius] on cords from the upper ceiling, at staggered heights through
 * both floors, clear of the stair's headroom (2.1 m over its treads).
 */
export const GLOBES = [
  [-7.2, -72.45, 6.25, 0.12],
  [-6.62, -72.8, 6.6, 0.09],
  [-7.42, -73.25, 7.05, 0.15],
  [-6.85, -73.7, 7.65, 0.11],
  [-7.15, -74.2, 8.25, 0.13],
  [-6.35, -74.55, 7.3, 0.1],
  [-7.45, -74.95, 8.9, 0.12],
  [-6.9, -75.45, 9.35, 0.15],
  [-6.38, -75.9, 8.6, 0.09],
  [-7.3, -76.3, 9.7, 0.11],
  [-6.85, -76.65, 9.95, 0.1],
];
/** The cascade's canopy on the ceiling, along the void (x, z0, z1). */
export const CASCADE_CANOPY = [-6.9, -72.3, -76.8];

/** The dining table's linear pendant: its middle, length (along z), the
 * bottom of its body. */
export const LINEAR = { c: [2.55, -67.9], len: 1.9, y: FG + 0.73 + 0.75 };

/** The closet's brass ring: its middle, radius. */
export const RING = { c: [-0.95, CU - 0.55, -76.35], r: 0.35 };

/** The main bedroom's sconces: on the bed's panel either side, at each
 * nightstand (houseRooms.js: the bed at x −0.95, the panel's face at z). */
export const SCONCES = { xs: [-2.26, 0.36], y: FU + 1.15, z: -75.645, reach: 0.26 };
/** A sconce's head (its shade's middle) and the way it's aimed: onto its
 * own side of the bed, where you'd sit up to read (the pillow and the top
 * of the mattress, 45 cm in from the bed's edge). */
export const sconceAim = x => {
  const inward = Math.sign(-0.95 - x);
  const head = [x + inward * 0.04, SCONCES.y, SCONCES.z + SCONCES.reach];
  const at = [-0.95 - inward * (0.95 - 0.45), FU + 0.62, -75.0];
  return { head, inward, dir: norm(at.map((c, i) => c - head[i])) };
};

/** The living room's side tables at the sofa's ends, a table lamp on each;
 * the fig by the glass, its uplight; the study's and the bedroom's floor
 * lamps by their reading chairs. */
export const SIDE_TABLES = [[-6.55, -70.9], [-3.05, -70.9]];
export const SIDE_TABLE_H = 0.52;
export const FIG = [-7.22, -64.1];
export const FLOOR_LAMPS = [[-5.0, FG, -73.5], [2.22, FU, -72.85]];
/** The fig's pot: its height, its radius at the rim. */
export const FIG_POT = [0.42, 0.22];

/** The stair (houseRooms.js): its first tread's front, run, rise, the wall
 * it's on, the brass rail's line. */
const STAIR = { z0: -72.2, run: 0.28, rise: 0.2, wall: -7.72, rail: -6.505 };
const tread = i => ({ z: STAIR.z0 - (i - 1) * STAIR.run, y: B + i * STAIR.rise });
/** The stair's wall step lights, every other tread: [x, y, z]. */
export const STEP_LIGHTS = [1, 3, 5, 7, 9, 11, 13, 15, 17].map(i => {
  const t = tread(i);
  return [STAIR.wall, t.y + 0.32, t.z - 0.14];
});

/** Picture lights: [middle of its bar, its width, the picture's facing
 * (yaw)], over the landing's tall print and over the bed's. */
export const PICTURE_LIGHTS = [
  { c: [-7.72 + 0.13, FU + 1.53 + 0.58, -78.0], w: 0.45, yaw: Math.PI / 2 },
  { c: [-0.95, FU + 1.95 + 0.38, -75.74 + 0.13], w: 0.75, yaw: 0 },
];

/** The lounger lanterns on the terrace (x, z). */
export const LANTERNS = [[4.95, -63.5], [7.95, -63.5]];

/** The skirting's channels (a, b on the floor line, the wall's outward
 * normal): along the upstairs passage and the landing. */
export const SKIRTING = [
  { a: [-7.6, FU + 0.06, -78.69], b: [2.5, FU + 0.06, -78.69], n: [0, 0, 1] },
  { a: [-4.45, FU + 0.06, -77.59], b: [2.5, FU + 0.06, -77.59], n: [0, 0, -1] },
  { a: [-4.59, FU + 0.06, -71.45], b: [-4.59, FU + 0.06, -73.5], n: [-1, 0, 0] },
  { a: [-4.59, FU + 0.06, -74.7], b: [-4.59, FU + 0.06, -77.4], n: [-1, 0, 0] },
];

/** The beds' bases (houseRooms.js), for the glow under each: middle of
 * its head, its width, length. */
export const BEDS = [
  { c: [-0.95, FU, -75.74], w: 1.9, l: 2.1, zone: 4 },
  { c: [5.15, FU, -78.7], w: 1.5, l: 2.0, zone: 7 },
];

/** The walk-in closet's run (houseRooms.js wardrobeRun): its back, depth,
 * height, its bays' widths and kinds. */
export const CLOSET = { x0: -4.42, x1: 2.52, back: -77.44, D: 0.6, H: 2.4, t: 0.025, widths: [0.9, 0.9, 0.7, 0.9, 0.9, 0.7, 0.9], kinds: ['long', 'double', 'shelves', 'double', 'long', 'shelves', 'double', 'long'] };
export const closetUprights = () => {
  const xs = [CLOSET.x0];
  for (const w of CLOSET.widths) xs.push(xs[xs.length - 1] + w);
  return xs;
};

/** The bookcases (houseRooms.js): middle of the foot, yaw, width, height. */
export const BOOKCASES = [
  { c: [-3.4, B, -72.935], yaw: 0, w: 3.8, h: 2.4, zone: 3 },
  { c: [1.48, B, -75.9], yaw: -Math.PI / 2, w: 2.6, h: 2.4, zone: 2 },
];
/** A bookcase's uprights' x (along it) and its front's depth. */
export const bookcaseBays = ({ w }) => {
  const bays = Math.max(1, Math.round(w / 0.8));
  return { bays, bw: w / bays, D: 0.36, t: 0.025 };
};

/** Grazing slots in a ceiling, each a dark slot with its light: a, b and
 * the wall's side (the way it grazes). */
export const SLOTS = [
  { a: [-7.6, CG - 0.01, -69.6], b: [-7.6, CG - 0.01, -66.65], to: [-1, 0, 0], zone: 3, k: 0.42, day: 0 },
  { a: [7.6, CG - 0.01, -71.35], b: [7.6, CG - 0.01, -67.65], to: [1, 0, 0], zone: 1, k: 0.6, day: 0.5 },
  { a: [4.78, CG - 0.01, -71.32], b: [7.58, CG - 0.01, -71.32], to: [0, 0, -1], zone: 1, k: 0.42, day: 0.5 },
  { a: [2.78, CU - 0.01, -74.85], b: [2.78, CU - 0.01, -71.4], to: [-1, 0, 0], zone: 6, k: 0.55, day: 0.5 },
  { a: [6.0, CU - 0.01, -74.66], b: [7.6, CU - 0.01, -74.66], to: [0, 0, -1], zone: 6, k: 0.5, day: 0.5 },
  { a: [4.72, CG - 0.01, -63.42], b: [7.6, CG - 0.01, -63.42], to: [0, 0, 1], zone: 3, k: 0.5, day: 0 },
];

/** The mirrors' side lights: vertical opal bars either side of the
 * washrooms' vanity mirrors [x on the wall's face, its normal's x, z, y's
 * middle, height]. */
export const MIRROR_BARS = [
  ...[-1, 1].map(s => ({ x: 7.7, nx: -1, z: MATCH_AXES[0] + s * 0.69, y: B + 0.03 + 1.46, h: 0.44, zone: 1 })),
  ...[-1, 1].map(s => ({ x: 2.68, nx: 1, z: MATCH_AXES[1] + s * 0.99, y: FU + 0.012 + 1.56, h: 0.55, zone: 6 })),
];

/** Every light and strip of the brief, and its rooms. */
export function lightPlan() {
  const lights = [];
  const strips = [];
  const L = (p, o) => lights.push({ p, r: 3, k: 0.5, kind: 0, zone: 0, day: 0, night: 1, cat: 0, mesh: null, ...o, glow: o.glow ?? Math.min((o.k ?? 0.5) / 0.42, 1.15), tone: o.tone ?? ROOM[o.zone ?? 0] });
  const S = (a, b, d, o) => strips.push({ a, b, d, r: 1, k: 0.4, zone: 0, day: 0, night: 1, cat: 1, fall: 2, spread: -0.1, fill: 0, mesh: null, ...o, glow: o.glow ?? Math.min((o.k ?? 0.4) / 0.42, 1.15), tone: o.tone ?? ROOM[o.zone ?? 0] });
  const spot = (p, at, deg, o) => L(p, { kind: 6, dir: norm(at.map((x, i) => x - p[i])), cone: cosd(deg), cat: 1, mesh: 'spot', ...o });

  // ---- The floating ceilings' coves: along each top edge, washing out
  // and up over the band of ceiling round the panel.
  for (const pn of PANELS) {
    const [x0, x1, z0, z1] = pn.at;
    const y = pn.ceil - PANEL_DROP[1] + 0.015;
    const e = 0.04;
    const o = { r: 1.5, k: pn.k, zone: pn.zone, day: pn.day, night: pn.night, cat: 0, fall: 1.0, spread: -0.2, fill: 0.065 };
    S([x0 + e, y, z0 + e], [x1 - e, y, z0 + e], norm([0, 0.55, -0.85]), o);
    S([x0 + e, y, z1 - e], [x1 - e, y, z1 - e], norm([0, 0.55, 0.85]), o);
    S([x0 + e, y, z0 + e], [x0 + e, y, z1 - e], norm([-0.85, 0.55, 0]), o);
    S([x1 - e, y, z0 + e], [x1 - e, y, z1 - e], norm([0.85, 0.55, 0]), o);
  }
  // Grazing slots: down their walls.
  for (const s of SLOTS) {
    const d = norm([s.to[0] * 0.3, -1, s.to[2] * 0.3]);
    S(s.a, s.b, d, { r: 3.2, k: s.k, zone: s.zone, day: s.day, cat: 1, fall: 0.35, spread: 0.0, fill: 0.05, mesh: 'slot' });
  }

  // ---- The living room. A pool on the coffee table; the reading lamp;
  // the side tables' lamps; the fig lit from its pot; the bookcase lit
  // bay by bay down its uprights.
  const GU = panelUnder(CG);
  spot([-4.8, GU, -68.4], [-4.8, FG, -68.4], 18, { r: 5, k: 0.7, zone: 3 });
  L([-7.2, B + 1.55, -70.3], { r: 3.6, k: 0.36, zone: 3, cat: 0, glow: 1.0 });
  for (const [x, z] of SIDE_TABLES) L([x, B + SIDE_TABLE_H + 0.38, z], { r: 2.6, k: 0.26, zone: 3, cat: 0, glow: 0.9 });
  L([FIG[0] + 0.05, FG + FIG_POT[0] - 0.01, FIG[1] + 0.04], { kind: 4, r: 3.2, k: 0.55, zone: 3, cat: 1, mesh: 'spike' });
  for (const bc of BOOKCASES) {
    const at = frameOf(bc.c, bc.yaw);
    const { bays, bw, D, t } = bookcaseBays(bc);
    const fwd = axes(0, bc.yaw);
    for (let k = 0; k < bays; k++) {
      for (const side of [0, 1]) {
        const lx = -bc.w / 2 + (k + side) * bw + (side ? -t / 2 - 0.004 : t / 2 + 0.004);
        const into = side ? -1 : 1;
        const d = norm([0, 1, 2].map(i => fwd[0][i] * into - fwd[2][i] * 0.6));
        S(at(lx, 0.12, D - 0.03), at(lx, bc.h - 0.06, D - 0.03), d, { r: 0.9, k: 0.32, zone: bc.zone, cat: 1, fall: 2.5, spread: -0.25, fill: 0.01, mesh: 'line' });
      }
    }
  }

  // ---- The dining table: the linear pendant (down on the table, a little
  // up on the ceiling); the painting lit at 30°.
  {
    const { c, len, y } = LINEAR;
    const a = [c[0], y - 0.006, c[1] - len / 2 + 0.05];
    const b = [c[0], y - 0.006, c[1] + len / 2 - 0.05];
    S(a, b, [0, -1, 0], { r: 2.4, k: 0.95, zone: 3, cat: 0, day: 0.3, fall: 1.2, spread: 0.1 });
    S(a.map((v, i) => (i === 1 ? y + 0.06 : v)), b.map((v, i) => (i === 1 ? y + 0.06 : v)), [0, 1, 0], { r: 1.8, k: 0.12, zone: 3, cat: 0, day: 0.3, fall: 1.2, spread: 0.0 });
  }
  spot([3.77, GU, -68.7], [4.54, B + 1.62, -68.7], 24, { r: 3.5, k: 0.75, zone: 3 });

  // ---- The kitchen, its cooking done: the island's pendants low, the
  // under-cabinet light low, the plinths' glow; a pin-spot on the
  // island's flowers.
  L([4.4, B + 2.1, -74.9], { r: 5, k: 0.32, zone: 3, cat: 0 });
  S([2.6, B + 1.44, -78.42], [4.85, B + 1.44, -78.42], [0, -1, 0.2], { r: 1.6, k: 0.3, zone: 3 });
  for (const [a, b, d] of [[[2.6, B + 0.03, -78.15], [7.3, B + 0.03, -78.15], [0, -0.4, 1]], [[3.1, B + 0.03, -74.46], [5.7, B + 0.03, -74.46], [0, -0.4, 1]], [[3.1, B + 0.03, -75.34], [5.7, B + 0.03, -75.34], [0, -0.4, -1]]]) {
    S(a, b, d, { r: 1.0, k: 0.25, zone: 3, mesh: 'line' });
  }
  spot([3.8, GU, -75.2], [3.8, B + 1.1, -74.8], 10, { r: 4, k: 0.6, zone: 3 });

  // ---- The foyer: the front wall washed from its slot (SLOTS), the
  // mirror backlit, the front door's frame lit from the floor.
  backlit([7.7, B + 1.5, -65.4], [-1, 0, 0], 0.8, 1.1, 3, 0);
  for (const x of [5.5, 6.9]) L([x, FG + 0.01, -63.42], { kind: 4, r: 2.8, k: 0.42, zone: 3, cat: 1, mesh: 'can' });

  // ---- The stair: the strip under every tread; the wall's step lights;
  // the line in the handrail.
  S([-7.12, B + 0.13, -72.05], [-7.12, B + 3.33, -76.53], [0, -1, 0], { r: 1.7, k: 0.7, zone: 3 });
  for (const p of STEP_LIGHTS) L([p[0] + 0.03, p[1], p[2]], { kind: 6, dir: norm([0.75, -0.66, 0]), cone: cosd(58), r: 1.6, k: 0.45, zone: 3, cat: 1 });
  {
    const rail = i => [STAIR.rail, B + i * STAIR.rise + 1.08 - 0.03, STAIR.z0 - (i - 1) * STAIR.run - STAIR.run / 2];
    S(rail(-0.1), rail(17), [0, -1, 0], { r: 1.3, k: 0.35, zone: 3, fall: 1.5, spread: 0.0, mesh: 'rail' });
  }

  // ---- The study, a library: the bookcase (above), a reading lamp by the
  // chair, the desk lamp off.
  L([FLOOR_LAMPS[0][0], FG + 1.55, FLOOR_LAMPS[0][2]], { r: 3.4, k: 0.6, zone: 2, cat: 0 });
  L([-2.75, B + 1.1, -78.2], { r: 3.6, k: 0, zone: 2 });

  // ---- The WC: its walls grazed (SLOTS), light either side of the mirror
  // as well as behind it, the glow under the vanity, a spot on the basin.
  S([7.68, B + 1.7, MATCH_AXES[0] + 0.55], [7.68, B + 1.7, MATCH_AXES[0] - 0.55], [-1, 0.4, 0], { r: 0.9, k: 0.55, zone: 1, day: 0.5 });
  S([7.3, B + 0.45, MATCH_AXES[0] + 0.55], [7.3, B + 0.45, MATCH_AXES[0] - 0.55], [0, -1, 0], { r: 0.9, k: 0.4, zone: 1, fall: 3 });
  spot([7.3, CG, MATCH_AXES[0]], [7.4, FG + 0.86, MATCH_AXES[0]], 30, { r: 4, k: 0.42, zone: 1, day: 0.45 });

  // ---- The upper landing and passage: the cascade; the skirting's glow;
  // a picture light on the tall print; the doors' frames lit; a spot on the
  // stair's head.
  GLOBES.forEach(([x, z, y, rr]) => L([x, y, z], { r: 2.0, k: 0.05 + rr * 0.45, glow: 0.95, zone: y > T ? 8 : 3, cat: 0, day: 0.3 }));
  for (const s of SKIRTING) S(s.a, s.b, norm([s.n[0], -0.45, s.n[2]]), { r: 1.2, k: 0.3, zone: 8, fall: 2, mesh: 'skirting' });
  for (const pl of PICTURE_LIGHTS.slice(0, 1)) pictureLight(pl, 8);
  for (const p of [[-4.64, -73.55], [-4.64, -74.65]]) L([p[0], FU + 0.01, p[1]], { kind: 4, r: 2.6, k: 0.34, zone: 8, cat: 1, mesh: 'can' });
  // (The guest room's door fills the passage's end: lit from its ceiling.)
  spot([1.75, CU, -78.05], [2.55, FU + 1.0, -78.05], 26, { r: 3.5, k: 0.45, zone: 8 });
  spot([-6.9, CU, -77.25], [-6.9, FU, -77.25], 22, { r: 4, k: 0.5, zone: 8 });

  // ---- The main bedroom: the brass sconces; the headboard's wash and the
  // picture light over the print (which lights the pillows); the nightstands'
  // glow; the reading lamp by the chair; the dresser's mirror backlit; the
  // glow under the bed; the en-suite's door frame.
  for (const x of SCONCES.xs) {
    const { head, dir } = sconceAim(x);
    L(head.map((c, i) => c + dir[i] * 0.03), { kind: 6, dir, cone: cosd(24), r: 2.0, k: 0.75, glow: 1.1, zone: 4, cat: 0, day: 0.25 });
  }
  S([-2.65, T + 1.38, -75.73], [0.75, T + 1.38, -75.73], [0, 1, 0.15], { r: 1.4, k: 0.5, zone: 4 });
  pictureLight(PICTURE_LIGHTS[1], 4);
  for (const x of [-2.5, 0.1]) S([x, T + 0.46, -75.44], [x + 0.5, T + 0.46, -75.44], [0, -1, 0], { r: 0.9, k: 0.25, zone: 4 });
  L([FLOOR_LAMPS[1][0], FU + 1.55, FLOOR_LAMPS[1][2]], { r: 3.4, k: 0.55, zone: 4, cat: 0 });
  backlit([-4.42, FU + 1.55, -72.6], [1, 0, 0], 0.9, 1.0, 4, 0);
  for (const bd of BEDS) underBed(bd);
  for (const z of [-73.65, -74.65]) L([2.45, FU + 0.01, z], { kind: 4, r: 2.6, k: 0.32, zone: 4, cat: 1, mesh: 'can' });

  // ---- The walk-in closet, a warm dressing room: the brass ring; light
  // down every bay's sides; the rails' strips; the shelves' strips.
  L(RING.c, { r: 4, k: 0.55, zone: 5, cat: 0, day: 0.3 });
  {
    const xs = closetUprights();
    const front = CLOSET.back + CLOSET.D;
    const ys = [FU + 0.1, FU + CLOSET.H - 0.06];
    for (let b = 0; b < CLOSET.kinds.length; b++) {
      const a = xs[b];
      const e = xs[b + 1] ?? CLOSET.x1;
      const left = a + CLOSET.t + 0.003;
      const right = b === CLOSET.kinds.length - 1 ? CLOSET.x1 - CLOSET.t - 0.003 : e - 0.003;
      S([left, ys[0], front - 0.03], [left, ys[1], front - 0.03], norm([1, 0, -0.5]), { r: 0.75, k: 0.34, zone: 5, fall: 3, spread: -0.2, mesh: 'line' });
      S([right, ys[0], front - 0.03], [right, ys[1], front - 0.03], norm([-1, 0, -0.5]), { r: 0.75, k: 0.34, zone: 5, fall: 3, spread: -0.2, mesh: 'line' });
      if (CLOSET.kinds[b] === 'shelves') {
        for (let r = 1; r < 4; r++) {
          const sy = FU + 0.82 + r * 0.37 - 0.004;
          S([left + 0.02, sy, front - 0.05], [right - 0.02, sy, front - 0.05], norm([0, -1, -0.5]), { r: 0.5, k: 0.28, zone: 5, fall: 4 });
        }
      }
    }
    S([-4.3, T + 2.07, -76.9], [2.4, T + 2.07, -76.9], [0, -1, -0.5], { r: 1.3, k: 0.45, zone: 5 });
    S([-4.3, T + 1.11, -76.9], [2.4, T + 1.11, -76.9], [0, -1, -0.5], { r: 1.0, k: 0.35, zone: 5 });
  }

  // ---- The en-suite: its walls grazed (SLOTS), side lights and the
  // mirror's backlight, the bath's cove (PANELS), the niche and a wash over
  // the shower's floor, the glow under the vanity, a light in the shower.
  S([2.71, T + 2.0, MATCH_AXES[1] + 0.85], [2.71, T + 2.0, MATCH_AXES[1] - 0.85], [1, 0.4, 0], { r: 1.0, k: 0.5, zone: 6, day: 0.5 });
  S([6.3, T + 1.48, -74.8], [6.9, T + 1.48, -74.8], [0, -1, 0.3], { r: 0.6, k: 0.5, zone: 6, day: 0.5 });
  S([6.05, FU + 0.27, -74.8], [7.6, FU + 0.27, -74.8], norm([0, -0.7, 1]), { r: 1.3, k: 0.32, zone: 6, day: 0.3, mesh: 'line' });
  S([3.08, FU + 0.43, MATCH_AXES[1] + 0.85], [3.08, FU + 0.43, MATCH_AXES[1] - 0.85], [0, -1, 0], { r: 0.9, k: 0.38, zone: 6, fall: 3 });
  spot([6.6, CU, -74.0], [6.6, FU, -74.0], 30, { r: 4, k: 0.38, zone: 6, day: 0.45 });
  for (const m of MIRROR_BARS) S([m.x + m.nx * 0.06, m.y - m.h / 2, m.z], [m.x + m.nx * 0.06, m.y + m.h / 2, m.z], [m.nx, 0, 0], { r: 1.6, k: 0.55, zone: m.zone, day: 0.5, fall: 1.5, spread: -0.4, fill: 0.03 });

  // ---- The guest room, a guest winding down: its bedside lamp on, the
  // other off; the glow under the bed (above).
  L([6.31, T + 1.29, -78.38], { r: 3, k: 0.42, zone: 7, cat: 0 });
  L([4.04, T + 1.29, -78.38], { r: 3, k: 0, zone: 7 });

  // ---- Outside. The terrace's soffit: downlights over it (its two over
  // the bar dimmer, so the bar's own pools read), two narrow spots over
  // the bar's counter, a pool each on its stone (0.4.27); the bar's shelf
  // strips, tight pools on the bottles. The porch's downlights under the
  // cantilever; uplights grazing the columns, the timber by the front door
  // and on the terrace (not where the bar stands), and into the olive; the
  // path's bollards.
  const soffit = T + STOREY - 0.42;
  for (const x of [-6, -2, 2, 6]) L([x, soffit, -69.8], { kind: 1, r: 4.5, k: x === 6 ? 0.38 : 0.55, cat: 2 });
  for (const x of [4.25, 5.75]) L([x, T + STOREY - 0.4, PLAN.upper.z[1] + 0.34], { kind: 5, r: 3.2, k: 1.1, cat: 1, tone: W.bar, mesh: 'barSpot' });
  const barZ = PLAN.upper.z[1] + 0.04 + 0.2025;
  S([3.5, T + 1.425, barZ], [6.3, T + 1.425, barZ], [0, -1, 0.15], { r: 0.9, k: 0.95, tone: W.bar });
  S([3.5, T + 1.825, barZ], [6.3, T + 1.825, barZ], [0, -1, 0.15], { r: 0.8, k: 0.7, tone: W.bar });
  for (const x of [-6.2, 6.2]) L([x, B + STOREY - 0.4, -60.8], { kind: 1, r: 4.5, k: 0.6, cat: 2, mesh: 'porch' });
  for (const [x, y, z, r, k] of [[-8.1, B + 0.05, -58.42, 4, 0.7], [8.1, B + 0.05, -58.42, 4, 0.7], [5.0, B + 0.05, -62.75, 4, 0.6], [7.4, B + 0.05, -62.75, 4, 0.6], [7.4, T + 0.08, -70.75, 3.6, 0.55], [2.95, T + 0.08, -70.75, 3.6, 0.55], [-6.52, T + 0.09, -59.05, 3, 0.6]]) {
    L([x, y, z], { kind: 4, r, k: k * 0.85, cat: 2, mesh: 'can' });
  }
  for (const [x, z] of BOLLARDS) L([x, moundY(x, z) + 0.55, z], { kind: 1, r: 3.2, k: 0.55, cat: 2 });
  // The stone base grazed from a linear light at its foot, each side of
  // the steps, following the mound.
  for (const [x0, x1] of [[-9.4, -5.6], [-5.6, -1.8], [1.8, 5.6], [5.6, 9.4]]) {
    // (25 cm out: closer, it only skims the stone's face.)
    const at = x => [x, moundY(x, -57.25) + 0.03, -57.25];
    S(at(x0), at(x1), norm([0, 1, -0.2]), { r: 3.8, k: 1.1, zone: 0, cat: 2, fall: 0.22, spread: 0.2, mesh: 'graze' });
  }
  // The timber by the front door washed from the porch's ceiling.
  S([4.72, B + STOREY - SLAB - 0.03, -62.8], [7.9, B + STOREY - SLAB - 0.03, -62.8], norm([0, -1, -0.4]), { r: 3.6, k: 0.4, zone: 0, cat: 2, fall: 0.3, spread: 0.0, mesh: 'slot' });
  // The cantilevers' lines: the roof's soffit, in its shadow gap by the
  // fascia; the terrace's, under its front edge over the porch.
  {
    const R = PLAN.roof;
    const sf = T + STOREY - SLAB - 0.03;
    S([R.x[0] + 0.07, sf + 0.005, R.z[1] - 0.05], [R.x[1] - 0.07, sf + 0.005, R.z[1] - 0.05], norm([0, -1, 0.15]), { r: 3.0, k: 0.45, zone: 0, cat: 2, fall: 0.6, spread: 0.0, mesh: 'line' });
    S([-8.3, B + STOREY - SLAB - 0.01, -58.75], [8.3, B + STOREY - SLAB - 0.01, -58.75], norm([0, -1, 0.3]), { r: 3.0, k: 0.35, zone: 0, cat: 2, fall: 0.6, spread: 0.0, mesh: 'line' });
    // The roof's outline: a faint line in the shadow gap under the coping,
    // down the fascia (front and sides).
    const rt = T + STOREY + 0.05 - 0.005;
    const o = 0.03 - 0.001;
    S([R.x[0] - o, rt, R.z[1] + o], [R.x[1] + o, rt, R.z[1] + o], norm([0, -1, 0.2]), { r: 1.0, k: 0.22, zone: 0, cat: 2, mesh: 'line' });
    S([R.x[0] - o, rt, R.z[0] - o], [R.x[0] - o, rt, R.z[1] + o], norm([-0.2, -1, 0]), { r: 1.0, k: 0.22, zone: 0, cat: 2, mesh: 'line' });
    S([R.x[1] + o, rt, R.z[0] - o], [R.x[1] + o, rt, R.z[1] + o], norm([0.2, -1, 0]), { r: 1.0, k: 0.22, zone: 0, cat: 2, mesh: 'line' });
  }
  // The entrance steps' lights, in their cheek walls (their slots are the
  // mesh's already), across each step.
  {
    const front = moundY(0, -57.5);
    const rise = (B - front) / 5;
    for (let i = 0; i < 5; i += 2) {
      const y = B - (i + 1) * rise + 0.12 + 0.018;
      const z = -57.5 + (i + 0.5) * 0.34;
      L([-1.39, y, z], { kind: 6, dir: norm([1, -0.5, 0]), cone: cosd(60), r: 1.8, k: 0.42, zone: 0, cat: 2 });
      L([1.39, y, z], { kind: 6, dir: norm([-1, -0.5, 0]), cone: cosd(60), r: 1.8, k: 0.42, zone: 0, cat: 2 });
    }
  }
  // Moonlight from the two trees nearest the house, dappled by their
  // leaves on the lawn.
  for (const [x, z, h] of [[-17, -63, 7], [15, -66, 6]]) L([x, moundY(x, z) + h * 0.75, z], { kind: 7, dir: [0, -1, 0], cone: cosd(55), r: 12, k: 0.32, zone: 0, cat: 2, tone: W.moon });
  // The terrace: a glow along the pool's coping, the loungers' lanterns, a
  // line at the foot of the glass balustrade.
  {
    const gy = T + 0.05;
    const [px0, px1] = [POOL.at[0] - POOL.w / 2 - 0.35, POOL.at[0] + POOL.w / 2 + 0.35];
    const [pz0, pz1] = [POOL.at[2] - POOL.d / 2 - 0.35, POOL.at[2] + POOL.d / 2 + 0.35];
    const cy = gy + 0.005;
    const o = { r: 1.2, k: 0.28, zone: 0, cat: 2, fall: 2, mesh: 'line' };
    S([px0, cy, pz0 - 0.002], [px1, cy, pz0 - 0.002], norm([0, -0.5, -1]), o);
    S([px0, cy, pz1 + 0.002], [px1, cy, pz1 + 0.002], norm([0, -0.5, 1]), o);
    S([px0 - 0.002, cy, pz0], [px0 - 0.002, cy, pz1], norm([-1, -0.5, 0]), o);
    S([px1 + 0.002, cy, pz0], [px1 + 0.002, cy, pz1], norm([1, -0.5, 0]), o);
    for (const [x, z] of LANTERNS) L([x, gy + 0.2, z], { r: 2.2, k: 0.32, zone: 0, cat: 2 });
    const by = gy + 0.1;
    const b = { r: 1.0, k: 0.26, zone: 0, cat: 2, fall: 3, mesh: 'line' };
    S([-8.19, by, -70.9], [-8.19, by, -58.81], norm([1, -0.35, 0]), b);
    S([-8.19, by, -58.81], [8.19, by, -58.81], norm([0, -0.35, -1]), b);
    S([8.19, by, -70.9], [8.19, by, -58.81], norm([-1, -0.35, 0]), b);
  }

  // A mirror backlit: strips just behind its four edges, washing the wall
  // round it.
  function backlit(c, n, w, h, zone, day) {
    const [nx, , nz] = n;
    const side = [-nz, 0, nx];
    const at = (u, v) => [c[0] + side[0] * u + n[0] * 0.012, c[1] + v, c[2] + side[2] * u + n[2] * 0.012];
    const o = { r: 0.5, k: 0.32, zone, day, cat: 1, fall: 4, spread: -0.3 };
    S(at(-w / 2 + 0.05, h / 2 - 0.02), at(w / 2 - 0.05, h / 2 - 0.02), norm([n[0] * 0.3, 1, n[2] * 0.3]), o);
    S(at(-w / 2 + 0.05, -h / 2 + 0.02), at(w / 2 - 0.05, -h / 2 + 0.02), norm([n[0] * 0.3, -1, n[2] * 0.3]), o);
    S(at(-w / 2 + 0.02, -h / 2 + 0.05), at(-w / 2 + 0.02, h / 2 - 0.05), norm([n[0] * 0.3 - side[0], 0, n[2] * 0.3 - side[2]]), o);
    S(at(w / 2 - 0.02, -h / 2 + 0.05), at(w / 2 - 0.02, h / 2 - 0.05), norm([n[0] * 0.3 + side[0], 0, n[2] * 0.3 + side[2]]), o);
  }
  // A picture light's bar: down on the picture from 12 cm out.
  function pictureLight({ c, w, yaw }, zone) {
    const ax = axes(0, yaw);
    const a = [0, 1, 2].map(i => c[i] - (ax[0][i] * w) / 2 + ax[2][i] * 0.0);
    const b = [0, 1, 2].map(i => c[i] + (ax[0][i] * w) / 2);
    const d = norm([0, 1, 2].map(i => -ax[1][i] - ax[2][i] * 0.3));
    S(a, b, d, { r: 2.2, k: 0.55, zone, cat: 1, fall: 1.2, spread: 0.0 });
  }
  // The glow under a bed: hidden just inside the base's edge, under its
  // overhang, thrown down and out, a soft pool fading half a metre across
  // the floor so the bed floats (it was a thin band hugging the plinth,
  // its LED a visible line).
  function underBed({ c, w, l, zone }) {
    const at = frameOf(c, 0);
    const hw = w / 2;
    const y = 0.084;
    const [z0, z1] = [0.2, 0.1 + l + 0.01];
    const o = { r: 1.0, k: 1.0, zone, cat: 1, fall: 2.2, spread: -0.45 };
    S(at(-hw, y, z0), at(-hw, y, z1 - 0.1), norm([-0.55, -1, 0]), o);
    S(at(hw, y, z0), at(hw, y, z1 - 0.1), norm([0.55, -1, 0]), o);
    S(at(-hw + 0.1, y, z1), at(hw - 0.1, y, z1), norm([0, -1, 0.55]), o);
  }

  return {
    lights,
    strips,
    // The stair's void between the floors is the ground floor's (its top
    // treads were outside every room, lit as the garden is).
    zones: [...ZONES.map(([lo, hi, light], i) => ({ lo, hi, light, id: i + 1 })), { lo: [-7.72, CG, -77.0], hi: [-6.2, T, -72.0], light: 1, id: 3 }],
    roomTone: ROOM,
    roomDay: [0, 0.5, 0, 0, 0, 0, 0.5, 0, 0],
  };
}
