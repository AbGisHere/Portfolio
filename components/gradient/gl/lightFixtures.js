/**
 * (0.4.28) The lighting brief's fittings (houseLightPlan.js):
 * built from the same data as their lights, so each glows where its light
 * is (houseShader.js fittingGlow). Nothing in a fitting lies over anything
 * else within a centimetre (seen from the desk, the depth buffer can't
 * part them): faces are side by side, or a centimetre clear.
 *
 * - **The floating ceilings** (`PANELS`): a plastered panel 12 cm deep,
 *   hung 16 cm under the ceiling, the cove's light hidden on its top.
 * - **Spots**: a black can 12 mm proud of the ceiling, an annulus round a
 *   small lens set 8 mm up into it (a baffle).
 * - **Slots and grazers**: a black linear housing with its line of light.
 * - **The statement pieces**: the cascade of opal globes through the
 *   stair's void, each on its cord from a brass rose; the dining table's
 *   linear pendant in brushed brass, an opal diffuser under it, on two
 *   cables; the closet's brass ring with an opal ring under it, on three;
 *   the bedroom's brass sconces, a round plate, an arm out, a cone shade
 *   tipped toward the bed.
 * - **The rest**: picture lights, the stair's wall step lights, the
 *   skirting's channels, the rail's LED, the mirrors' side bars, the
 *   loungers' lanterns, the side tables and their lamps, the reading
 *   lamps, the fig in its pot.
 */

import { HOUSE_PART } from './houseShape';
import { LIGHTS, STRIPS } from './houseLights';
import {
  CEILS,
  FIG,
  FIG_POT,
  FLOOR_LAMPS,
  FLOORS,
  GLOBES,
  LANTERNS,
  LINEAR,
  MIRROR_BARS,
  PANELS,
  PANEL_DROP,
  PICTURE_LIGHTS,
  RING,
  SCONCES,
  sconceAim,
  SIDE_TABLES,
  SIDE_TABLE_H,
  SKIRTING,
  STEP_LIGHTS,
  panelUnder,
} from './houseLightPlan';
import { add, axes, ball, box, lathe, obox, sweep, tube } from './meshKit';
import { floorLamp, tableLamp } from './furniture';
import { fig } from './plantMesh';

const P = HOUSE_PART;
const v = (part, k) => part + Math.min(0.9, Math.max(0, k));
const LINE = v(P.lamp, 0.5);
const norm = x => {
  const l = Math.hypot(...x) || 1;
  return x.map(c => c / l);
};

/** Every fitting of the brief into `out`. */
export function lightFixtures(out) {
  // The floating ceilings.
  for (const { at: [x0, x1, z0, z1], ceil } of PANELS) box(out, [x0, ceil - PANEL_DROP[0], z0], [x1, ceil - PANEL_DROP[1], z1], P.ceiling);

  // Spots: a can proud of the ceiling, a baffle round its lens.
  for (const { p: [x, y, z], mesh } of LIGHTS) {
    if (mesh !== 'spot') continue;
    lathe(out, [x, y + 0.004, z], [0, -1, 0], [[0.046, -0.01], [0.046, 0.016], [0.02, 0.016], [0.02, 0.008]], P.frame, 24);
    lathe(out, [x, y + 0.004, z], [0, -1, 0], [[0.02, 0.008], [0, 0.008]], P.lamp, 16);
  }

  // The strips' own fittings.
  for (const s of STRIPS) {
    const { a, b, mesh } = s;
    const along = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const across = Math.abs(along[0]) > 0.5 ? [0, 0, 1] : [1, 0, 0];
    if (mesh === 'slot') {
      // A black housing 3 cm wide set up into the ceiling, its line under
      // it.
      const lo = [0, 1, 2].map(i => Math.min(a[i], b[i]) - across[i] * 0.015);
      const hi = [0, 1, 2].map(i => Math.max(a[i], b[i]) + across[i] * 0.015);
      box(out, [lo[0], a[1] - 0.005, lo[2]], [hi[0], a[1] + 0.03, hi[2]], P.frame);
      tube(out, add(a, [0, -0.011, 0]), add(b, [0, -0.011, 0]), 0.0055, LINE, 6);
    } else if (mesh === 'graze') {
      // A linear grazer sunk in the ground at the base's foot, its lens on
      // top.
      box(out, [Math.min(a[0], b[0]), Math.min(a[1], b[1]) - 0.06, a[2] - 0.04], [Math.max(a[0], b[0]), Math.max(a[1], b[1]) - 0.004, a[2] + 0.04], P.frame);
      tube(out, add(a, [0, -0.002, 0]), add(b, [0, -0.002, 0]), 0.006, LINE, 6);
    } else if (mesh === 'skirting') {
      tube(out, a, b, 0.0045, LINE, 6);
    } else if (mesh === 'rail') {
      tube(out, a, b, 0.004, LINE, 6);
    }
  }
  // The skirting's channels: a black board 8 cm tall on the wall, the line
  // in front of its top.
  for (const { a, b, n } of SKIRTING) {
    const wall = add(a, n, -0.03);
    const wallB = add(b, n, -0.03);
    const lo = [Math.min(wall[0], wallB[0]), wall[1] - 0.06, Math.min(wall[2], wallB[2])];
    const hi = [Math.max(wall[0], wallB[0]), wall[1] + 0.02, Math.max(wall[2], wallB[2])];
    const out16 = i => n[i] * 0.016;
    box(out, [lo[0] + Math.min(0, out16(0)), lo[1], lo[2] + Math.min(0, out16(2))], [hi[0] + Math.max(0, out16(0)), hi[1], hi[2] + Math.max(0, out16(2))], P.frame);
  }

  // ---- The cascade: each globe on its cord from a brass rose.
  const CU = CEILS.upper;
  for (const [x, z, y, r] of GLOBES) {
    lathe(out, [x, CU, z], [0, -1, 0], [[0.032, 0], [0.032, 0.012], [0, 0.014]], P.brass, 18);
    tube(out, [x, CU - 0.012, z], [x, y + r + 0.012, z], 0.0016, P.steel, 5);
    lathe(out, [x, y + r - 0.012, z], [0, 1, 0], [[0, 0.03], [0.018, 0.026], [0.024, 0.008], [0.02, 0]], P.brass, 16);
    ball(out, [x, y, z], r, P.lamp, 28, 16);
  }

  // ---- The linear pendant: a brushed-brass body, end caps, the opal
  // diffuser under it, two cables to brass canopies on the panel.
  {
    const { c, len, y } = LINEAR;
    obox(out, [c[0], y + 0.026, c[1]], [0.026, 0.026, len / 2], P.brass);
    obox(out, [c[0], y - 0.004, c[1]], [0.018, 0.004, len / 2 - 0.012], P.lamp);
    const under = panelUnder(CEILS.ground);
    for (const s of [-1, 1]) {
      const z = c[1] + s * (len / 2 - 0.18);
      tube(out, [c[0], y + 0.052, z], [c[0], under - 0.014, z], 0.0013, P.steel, 5);
      lathe(out, [c[0], under, z], [0, -1, 0], [[0.03, 0], [0.03, 0.014], [0, 0.016]], P.brass, 18);
    }
  }

  // ---- The closet's ring: brass, an opal ring under it, three cables.
  {
    const [cx, cy, cz] = RING.c;
    const ring = (rr, yy) => {
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const t = (i / 48) * Math.PI * 2;
        pts.push([cx + Math.cos(t) * rr, yy, cz + Math.sin(t) * rr]);
      }
      return pts;
    };
    sweep(out, ring(RING.r, cy + 0.012), 0.014, P.brass, { closed: true, seg: 10 });
    sweep(out, ring(RING.r - 0.004, cy - 0.012), 0.01, P.lamp, { closed: true, seg: 8 });
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2 + 0.5;
      const p = [cx + Math.cos(t) * RING.r, cy + 0.026, cz + Math.sin(t) * RING.r];
      tube(out, p, [cx, CU - 0.014, cz], 0.0012, P.steel, 5);
    }
    lathe(out, [cx, CU, cz], [0, -1, 0], [[0.06, 0], [0.06, 0.014], [0, 0.016]], P.brass, 24);
  }

  // ---- The bedroom's sconces: a plate on the panel, an arm out to a cone
  // shade tipped toward the bed and down, its lamp inside.
  for (const x of SCONCES.xs) {
    const plate = [x, SCONCES.y, SCONCES.z];
    lathe(out, plate, [0, 0, 1], [[0, 0], [0.055, 0], [0.055, 0.012], [0, 0.014]], P.brass, 24);
    const elbow = [x, SCONCES.y + 0.03, SCONCES.z + SCONCES.reach * 0.55];
    const { head, dir } = sconceAim(x);
    sweep(out, [add(plate, [0, 0, 0.012]), elbow, head], 0.0075, P.brass, { seg: 8 });
    ball(out, elbow, 0.011, P.brass, 10, 6);
    const top = add(head, dir, -0.035);
    lathe(out, top, dir, [[0.02, 0], [0.024, 0.01], [0.062, 0.11], [0.06, 0.112], [0.022, 0.012], [0.018, 0.004]], P.brass, 28);
    lathe(out, add(top, dir, 0.02), dir, [[0, 0], [0.022, 0]], P.lamp, 16);
  }

  // ---- Picture lights: a brass bar 12 cm off the wall on an arm, its
  // light under it.
  for (const { c, w, yaw } of PICTURE_LIGHTS) {
    const ax = axes(0, yaw);
    obox(out, c, [w / 2, 0.016, 0.028], P.brass, ax);
    obox(out, add(c, ax[1], -0.021), [w / 2 - 0.02, 0.004, 0.016], P.lamp, ax);
    const wall = add(c, ax[2], -0.13);
    tube(out, add(wall, ax[1], 0.03), add(c, ax[2], -0.028), 0.006, P.brass, 8);
    lathe(out, add(wall, ax[1], 0.03), ax[2], [[0, 0], [0.025, 0], [0.025, 0.01], [0, 0.012]], P.brass, 16);
  }

  // ---- The stair's step lights: a black hood over a lens, side by side
  // in the wall (not one over the other).
  for (const [x, y, z] of STEP_LIGHTS) {
    obox(out, [x + 0.008, y + 0.02, z], [0.008, 0.014, 0.07], P.frame);
    obox(out, [x + 0.004, y - 0.009, z], [0.004, 0.015, 0.06], P.lamp);
    for (const s of [-1, 1]) obox(out, [x + 0.006, y - 0.009, z + s * 0.065], [0.006, 0.015, 0.005], P.frame);
  }

  // ---- The mirrors' side bars: an opal rod, brass caps and arms.
  for (const m of MIRROR_BARS) {
    const bx = m.x + m.nx * 0.06;
    tube(out, [bx, m.y - m.h / 2, m.z], [bx, m.y + m.h / 2, m.z], 0.018, P.lamp, 14);
    for (const s of [-1, 1]) {
      const yy = m.y + (s * m.h) / 2;
      lathe(out, [bx, yy, m.z], [0, s, 0], [[0.02, 0], [0.02, 0.014], [0, 0.016]], P.brass, 14);
      tube(out, [m.x, yy + s * 0.008, m.z], [bx, yy + s * 0.008, m.z], 0.006, P.brass, 8);
    }
  }

  // ---- The loungers' lanterns: a black steel frame round an opal glass
  // cylinder.
  const deck = FLOORS.upper - 0.02;
  for (const [x, z] of LANTERNS) {
    box(out, [x - 0.1, deck, z - 0.1], [x + 0.1, deck + 0.025, z + 0.1], P.frame);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tube(out, [x + dx * 0.09, deck + 0.025, z + dz * 0.09], [x + dx * 0.09, deck + 0.38, z + dz * 0.09], 0.007, P.frame, 6);
    box(out, [x - 0.105, deck + 0.38, z - 0.105], [x + 0.105, deck + 0.41, z + 0.105], P.frame);
    lathe(out, [x, deck + 0.04, z], [0, 1, 0], [[0, 0], [0.065, 0], [0.065, 0.3], [0, 0.3]], P.lamp, 22);
  }

  // ---- The living room's side tables, a lamp on each; the reading
  // lamps by the study's and the bedroom's chairs; the fig in its pot.
  for (const [x, z] of SIDE_TABLES) {
    lathe(out, [x, FLOORS.ground - 0.02, z], [0, 1, 0], [[0, 0], [0.2, 0], [0.2, 0.02], [0.17, 0.04], [0.17, SIDE_TABLE_H - 0.03], [0.24, SIDE_TABLE_H - 0.03], [0.24, SIDE_TABLE_H], [0, SIDE_TABLE_H]], v(P.walnut, 0), 32);
    tableLamp(out, [x, FLOORS.ground - 0.02 + SIDE_TABLE_H, z]);
  }
  for (const c of FLOOR_LAMPS) floorLamp(out, c);
  {
    const [h, r] = FIG_POT;
    const base = [FIG[0], FLOORS.ground, FIG[1]];
    lathe(out, base, [0, 1, 0], [[0, 0.01], [r * 0.7, 0.01], [r * 0.72, 0], [r * 0.95, h * 0.6], [r, h - 0.02], [r + 0.01, h], [r - 0.015, h], [r - 0.02, h - 0.05]], v(P.ceramic, 0.8), 36);
    lathe(out, base, [0, 1, 0], [[r - 0.02, h - 0.05], [0, h - 0.06]], P.soil, 36);
    // The uplight in the soil, aimed up the stems.
    lathe(out, add(base, [0.05, h - 0.06, 0.04]), [0, 1, 0], [[0, 0], [0.03, 0], [0.03, 0.05], [0.022, 0.05], [0, 0.05]], P.frame, 14);
    lathe(out, add(base, [0.05, h - 0.06 + 0.05, 0.04]), [0, 1, 0], [[0.022, 0], [0, 0.001]], P.lamp, 12);
    fig(out, add(base, [0, h - 0.06, 0]), 1.75, 5);
  }
  return out;
}
