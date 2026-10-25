/**
 * (0.4.2) The house's rooms, as the plan has them (docs/parts/house.md):
 * the partitions and their doors, the floating stair and its void, the
 * curtains at the glass, and each room furnished (furniture.js). The shell
 * round them is houseMesh.js's.
 */

import { FLOOR, HOUSE_PART, MATCH_AXES, STOREY, TERRACE } from './houseShape';
import { add, axes, ball, barPull, box, grid, lathe, obox, sweep, tube } from './meshKit';
import { foldedStack, garment, scarf } from './garments';
import { homeDisplay, lightSwitch, socket } from './homeDetails';
import { clad, longVanity, toilet, walkInShower } from './washrooms';
import { bouquet } from './plantMesh';
import { CEILS, panelUnder } from './houseLightPlan';
import {
  bath, bed, bench, bookcase, canvas, chair, coffeeTable, console_, desk, door, dresser, floorLamp, island, placeSetting, vase, wineGlass,
  kitchenRun, loungeChair, marbleTable, mirror, pendant, picture, rug, sofa, stool, tallUnit, tv, v,
} from './furniture';

const P = HOUSE_PART;
const B = FLOOR;
const T = TERRACE;
const CEIL_G = B + STOREY - 0.35;
const CEIL_U = T + STOREY - 0.35;
const PART_T = 0.12;

/**
 * A partition from (x0, z0) to (x1, z1) (along x or z), floor y0 to ceiling
 * y1: plaster both sides, its door openings (`gaps`: [from, to] along it,
 * 2.2 m high) framed in walnut.
 */
function partition(out, [x0, z0], [x1, z1], y0, y1, gaps = []) {
  const alongX = z0 === z1;
  const [a, b] = alongX ? [Math.min(x0, x1), Math.max(x0, x1)] : [Math.min(z0, z1), Math.max(z0, z1)];
  const c = alongX ? z0 : x0;
  const piece = (s0, s1, t0, t1) => {
    if (s1 - s0 < 1e-3 || t1 - t0 < 1e-3) return;
    if (alongX) box(out, [s0, t0, c - PART_T / 2], [s1, t1, c + PART_T / 2], P.plaster);
    else box(out, [c - PART_T / 2, t0, s0], [c + PART_T / 2, t1, s1], P.plaster);
  };
  let at = a;
  // (The plaster stops a few millimetres inside each frame, never in the
  // plane of one of its faces.)
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    piece(at, g0 - 0.004, y0, y1);
    piece(g0 - 0.004, g1 + 0.004, y0 + 2.204, y1);
    // The frame: jambs and head, 6 cm walnut, proud of both faces.
    const fr = (s0, s1, t0, t1) => (alongX ? box(out, [s0, t0, c - PART_T / 2 - 0.01], [s1, t1, c + PART_T / 2 + 0.01], v(P.walnut, 0.5)) : box(out, [c - PART_T / 2 - 0.01, t0, s0], [c + PART_T / 2 + 0.01, t1, s1], v(P.walnut, 0.5)));
    fr(g0 - 0.06, g0, y0, y0 + 2.26);
    fr(g1, g1 + 0.06, y0, y0 + 2.26);
    fr(g0 - 0.06, g1 + 0.06, y0 + 2.2, y0 + 2.26);
    at = g1 + 0.004;
  }
  piece(at, b, y0, y1);
}

/** (0.4.4) A curtain's vertex: its place and normal tied back (by day),
 * the same drawn closed (by night), its material, and (s, t) on the cloth
 * (metres across, down). houseShader.js moves it between the two with the
 * night. */
export const CURTAIN_STRIDE = 15;

/**
 * The curtains: lined linen on ceiling tracks before the front glass, each
 * from x0 to x1, drawn back toward `to` (−1 its left end, 1 its right).
 * Pinch-pleated at the head; tied by day, the cloth gathers into a tight
 * stack, pinched at the tie-back a little below the middle, swagging out
 * below to the hem; (0.4.14) untied by night (the owner: "don't close the
 * curtains, just untie them"), it hangs straight from the head in a stack
 * of deep folds at the same end, a little fuller at the hem.
 */
const CURTAINS = [];

/** The curtains' mesh: `{ data, count }` (CURTAIN_STRIDE floats a vertex). */
export function curtainMesh() {
  const out = [];
  for (const [x0, x1, z, y0, y1, to, seed] of CURTAINS) {
    let sd = seed;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const width = x1 - x0;
    const folds = Math.round(width / 0.15);
    const jit = Array.from({ length: folds + 2 }, () => 0.75 + 0.5 * rnd());
    const nu = folds * 8;
    const nv = 32;
    const H = y0 - y1;
    const tieW = 0.62;
    const end = to < 0 ? x0 : x1;
    const at = (u, w, tied) => {
      const fx = u * folds;
      const k = Math.floor(fx);
      const deepJ = jit[k] * (1 - (fx - k)) + jit[k + 1] * (fx - k);
      const ph = fx * Math.PI * 2;
      const head = Math.min(1, w / 0.05);
      const y = y0 - H * w;
      if (!tied) {
        // Untied: the stack hanging free, its folds as deep as the tied
        // column's, falling plumb and easing out toward the hem.
        const stack = 0.32 + 0.05 * Math.min(1, width / 3);
        const span = stack * (1 + 0.12 * w * w);
        const tph = u * 7 * Math.PI * 2 + deepJ;
        const amp = (0.05 + 0.012 * w) * (0.85 + 0.3 * deepJ);
        const offX = to < 0 ? end + span * u : end - span * (1 - u);
        return [offX + Math.sin(tph) * amp * 0.3, y, z - 0.05 + Math.cos(tph) * amp * (0.45 + 0.55 * head)];
      }
      // Tied: the whole width gathered into a column of deep folds at the
      // end it's tied to, cinched at the tie-back two thirds down, the cloth
      // blousing softly out over the tie and falling free below it to the
      // floor, wider at its hem.
      const aboveT = Math.min(1, w / tieW);
      const belowT = Math.max(0, w - tieW) / (1 - tieW);
      const waist = 0.12 + 0.02 * Math.min(1, width / 3);
      const span = w < tieW
        ? waist + (0.3 - waist) * (1 - aboveT) * (1 - aboveT) + 0.07 * Math.exp(-((aboveT - 0.82) ** 2) / 0.02)
        : waist + (0.36 - waist) * Math.sqrt(belowT);
      const bow = w < tieW ? 0.05 * Math.exp(-((aboveT - 0.82) ** 2) / 0.02) : 0.02 * Math.sin(belowT * Math.PI);
      // Seven deep folds across it, their depth the column's own, pinched at
      // the tie.
      const tph = u * 7 * Math.PI * 2 + deepJ;
      const amp = (w < tieW ? 0.04 + 0.02 * (1 - aboveT) : 0.035 + 0.035 * belowT) * (0.85 + 0.3 * deepJ) * (1 - 0.5 * Math.exp(-((w - tieW) ** 2) / 0.0008));
      const offX = to < 0 ? end + span * u : end - span * (1 - u);
      return [offX + Math.sin(tph) * amp * 0.35, y, z - 0.065 - bow + Math.cos(tph) * amp * (0.45 + 0.55 * head)];
    };
    const grid2 = [];
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const w = j / nv;
        grid2.push({ a: at(u, w, true), b: at(u, w, false), s: u * width, t: w * H });
      }
    }
    const G = (i, j) => grid2[Math.max(0, Math.min(nv, j)) * (nu + 1) + Math.max(0, Math.min(nu, i))];
    const nrm = (i, j, key) => {
      const du = [0, 1, 2].map(k => G(i + 1, j)[key][k] - G(i - 1, j)[key][k]);
      const dv = [0, 1, 2].map(k => G(i, j + 1)[key][k] - G(i, j - 1)[key][k]);
      let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
      const l = Math.hypot(...n) || 1;
      n = n.map(x => x / l);
      // Facing into the room (−z) on its front.
      return n[2] > 0 ? n.map(x => -x) : n;
    };
    const vert = (i, j) => {
      const g = G(i, j);
      return [...g.a, ...nrm(i, j, 'a'), HOUSE_PART.curtain, g.s, g.t, ...g.b, ...nrm(i, j, 'b')];
    };
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const q = [vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)];
        out.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
      }
    }
  }
  // The tie-backs: (0.4.19) a slim braided cord (it was a thick rope ring,
  // round and rigid, standing off the cloth), wrapped snug round the
  // gathered waist from the hook on the wall's side and back to it, sagging
  // a little at the front under its own weight; knotted at the hook, a
  // small tassel hanging from the knot; there by day. By night each lies
  // shrunk to nothing at the hook, in the hanging stack.
  for (const [x0, x1, z, y0, y1, to] of CURTAINS) {
    const H = y0 - y1;
    const yT = y0 - H * 0.62;
    const end = to < 0 ? x0 : x1;
    const waist = 0.12 + 0.02 * Math.min(1, (x1 - x0) / 3);
    const cx = end + (to < 0 ? 1 : -1) * waist / 2;
    const cz = z - waist * 0.25;
    const side = to < 0 ? -1 : 1;
    const hook = [end, yT, z + 0.02];
    const push = (p, n, s2, t2) => [...p, ...n, HOUSE_PART.rope, s2, t2, ...hook, ...n];
    const tri = (a, b, c) => out.push(...a, ...b, ...c);
    // The cord: from the hook (a = 0, the wall's side of the waist) round
    // the cloth and back, drawn in where the gathered cloth is narrow, its
    // three strands plaited (s along, t round, houseShader.js).
    const rx = waist / 2 + 0.016;
    const rz = 0.056;
    const ringAt = (a, r, dy) => {
      const at = a + (side < 0 ? Math.PI : 0);
      const sag = 0.018 * Math.pow(Math.max(0, Math.sin(a / 2)), 2) * (Math.sin(at) > 0 ? 1 : 0.4);
      const snug = 1 - 0.04 * Math.pow(Math.sin(a), 2);
      return [cx + Math.cos(at) * (rx * snug + r), yT + dy - sag, cz + Math.sin(at) * (rz * snug + r)];
    };
    const nA = 64;
    const nB = 6;
    for (let i = 0; i < nA; i++) {
      for (let k = 0; k < nB; k++) {
        const vtx = (ii, kk) => {
          const a = (ii / nA) * Math.PI * 2;
          const b = (kk / nB) * Math.PI * 2 + a * 9;
          const rr = 0.0045 * (1 + 0.18 * Math.abs(Math.sin(b * 1.5 + a * 27)));
          const at = a + (side < 0 ? Math.PI : 0);
          const p = ringAt(a, Math.cos(b) * rr, Math.sin(b) * rr);
          const n = [Math.cos(at) * Math.cos(b), Math.sin(b), Math.sin(at) * Math.cos(b)];
          return push(p, n, ii / nA * 24, kk / nB);
        };
        const [p, q, r2, t] = [vtx(i, k), vtx(i + 1, k), vtx(i + 1, k + 1), vtx(i, k + 1)];
        tri(p, q, r2);
        tri(p, r2, t);
      }
    }
    // The tassel: a wrapped head at the knot, then threads hanging from it,
    // each its own length, swaying apart a little toward their ends.
    const knot = [end - side * 0.004, yT - 0.006, cz + 0.012];
    const tube3 = (a, b, r, s2) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ux = Math.abs(d[1]) > 0.5 ? [1, 0, 0] : [0, 1, 0];
      const n0 = [d[1] * ux[2] - d[2] * ux[1], d[2] * ux[0] - d[0] * ux[2], d[0] * ux[1] - d[1] * ux[0]];
      const l0 = Math.hypot(...n0);
      const e1 = n0.map(x => x / l0);
      const ld = Math.hypot(...d);
      const e2 = [(d[1] * e1[2] - d[2] * e1[1]) / ld, (d[2] * e1[0] - d[0] * e1[2]) / ld, (d[0] * e1[1] - d[1] * e1[0]) / ld];
      for (let q = 0; q < 5; q++) {
        const [a0, a1] = [(q / 5) * Math.PI * 2, ((q + 1) / 5) * Math.PI * 2];
        const rim = (c0, ang) => c0.map((v, k2) => v + (e1[k2] * Math.cos(ang) + e2[k2] * Math.sin(ang)) * r);
        const nrm = ang => e1.map((v, k2) => v * Math.cos(ang) + e2[k2] * Math.sin(ang));
        const [p, q2, r2, t] = [push(rim(a, a0), nrm(a0), s2, 0), push(rim(a, a1), nrm(a1), s2, 0), push(rim(b, a1), nrm(a1), s2, 1), push(rim(b, a0), nrm(a0), s2, 1)];
        tri(p, q2, r2);
        tri(p, r2, t);
      }
    };
    // The knot: a few turns of the cord bunched at the hook.
    for (let t = 0; t < 3; t++) {
      const a0 = t * 2.1;
      const c0 = [knot[0] + Math.cos(a0) * 0.005, knot[1] + 0.004 * t - 0.004, knot[2] + Math.sin(a0) * 0.005];
      tube3([c0[0] - 0.008, c0[1], c0[2]], [c0[0] + 0.008, c0[1] + 0.003, c0[2]], 0.0055, t * 3);
    }
    // The tassel: a slim wrapped head under the knot, its threads falling
    // fine and close, each its own length.
    tube3([knot[0], knot[1] - 0.008, knot[2]], [knot[0], knot[1] - 0.03, knot[2]], 0.0075, 0);
    tube3([knot[0], knot[1] - 0.022, knot[2]], [knot[0], knot[1] - 0.026, knot[2]], 0.0085, 2);
    for (let n = 0; n < 30; n++) {
      const a = (n / 30) * Math.PI * 2;
      const top = [knot[0] + Math.cos(a) * 0.006, knot[1] - 0.03, knot[2] + Math.sin(a) * 0.006];
      const len = 0.075 + 0.015 * Math.sin(n * 2.7);
      tube3(top, [top[0] + Math.cos(a) * 0.006, top[1] - len, top[2] + Math.sin(a) * 0.006], 0.0011, n * 1.3);
    }
  }
  const data = new Float32Array(out);
  return { data, count: data.length / CURTAIN_STRIDE };
}

/** A curtain's track (steel, on the ceiling), for the house's own mesh. */
function track(out, x0, x1, z, y) {
  box(out, [x0 - 0.05, y, z - 0.03], [x1 + 0.05, y + 0.03, z + 0.03], v(P.steel, 0.5));
}

/** The ground floor's rooms. `ix`, `iz`: its inside's x and z; `glass`
 * takes their panes (the stair's balustrade). */
export function groundRooms(out, ix, iz, glass) {
  const y = B + 0.02;
  CURTAINS.length = 0;
  // ---- Partitions (docs/parts/house.md).
  partition(out, [4.6, -66.0], [4.6, -71.5], B, CEIL_G);
  partition(out, [4.6, -67.5], [ix[1], -67.5], B, CEIL_G, [[5.0, 5.9]]);
  partition(out, [4.6, -71.5], [ix[1], -71.5], B, CEIL_G);
  partition(out, [-5.4, -73.0], [1.6, -73.0], B, CEIL_G, [[-0.6, 0.4]]);
  partition(out, [1.6, -73.0], [1.6, iz[0]], B, CEIL_G);
  partition(out, [-5.4, -73.0], [-5.4, iz[0]], B, CEIL_G);
  door(out, [5.0, -67.5], [1, 0], y, { open: 1.1 });
  // The study's door: glass in a walnut frame (its pane houseGlass.js's).
  door(out, [-0.6, -73.0], [1, 0], y, { open: -0.5, part: v(P.walnut, 0.5), thick: 0.05 });

  // ---- The foyer: the front door (in the timber panel, houseMesh.js), a
  // bench, a mirror over it, hooks with coats.
  bench(out, [7.3, B, -65.4], -Math.PI / 2, { w: 1.3, padded: true });
  mirror(out, [ix[1], B + 1.5, -65.4], -Math.PI / 2, 0.8, 1.1);
  // (0.4.21) A walnut hook rail on the wall, three brass hooks; two coats
  // on hangers and a scarf over the middle hook, clear of the mirror (they
  // were a row of rounded shapes on a rail, merging into one mass).
  box(out, [ix[1] - 0.022, B + 1.7, -64.95], [ix[1], B + 1.82, -63.55], v(P.walnut, 0.25));
  for (const z of [-63.85, -64.25, -64.65]) {
    sweep(out, [[ix[1] - 0.022, B + 1.76, z], [ix[1] - 0.07, B + 1.755, z], [ix[1] - 0.085, B + 1.78, z]], 0.005, P.brass, { seg: 6 });
    ball(out, [ix[1] - 0.085, B + 1.78, z], 0.007, P.brass, 8, 4);
  }
  garment(out, [ix[1] - 0.1, B + 1.68, -63.85], -Math.PI / 2, 'coat', 0.05, 3);
  garment(out, [ix[1] - 0.1, B + 1.68, -64.65], -Math.PI / 2, 'coat', 0.45, 7);
  scarf(out, [ix[1] - 0.075, B + 1.775, -64.25], -Math.PI / 2, 0.62, 2);
  rug(out, [5.0, -66.6], [7.5, -63.6], y, 0.5);

  // ---- The living room: the sofa facing the glass and the view, two
  // lounge chairs across from it, the TV on the side wall over a console,
  // a floor lamp, a coffee table on a rug.
  rug(out, [-7.3, -70.4], [-2.2, -65.6], y, 0);
  sofa(out, [-4.8, B, -70.9], 0, { width: 3.0 });
  coffeeTable(out, [-4.8, B, -68.4], 0);
  loungeChair(out, [-2.6, B, -66.6], Math.PI * 0.82);
  loungeChair(out, [-7.0, B, -66.7], -Math.PI * 0.8);
  floorLamp(out, [-7.2, B, -70.3]);
  console_(out, [ix[0] + 0.24, B, -68.2], Math.PI / 2, 2.0);
  tv(out, [ix[0] + 0.05, B + 1.45, -68.2], Math.PI / 2);
  bookcase(out, [-3.4, B, -72.935], 0, 3.8, 2.4, 17);

  // (0.4.22) Sockets where things plug in (by the console and the sofa, the
  // dining wall, over the kitchen's counter, the study's desk), switches by
  // the front door; the Home display by it, in the foyer.
  for (const z of [-67.3, -69.1, -70.6]) socket(out, [ix[0], B + 0.3, z], [1, 0, 0]);
  socket(out, [4.54, B + 0.3, -67.0], [-1, 0, 0]);
  for (const x of [3.2, 6.6]) socket(out, [x, B + 1.1, iz[0]], [0, 0, 1]);
  socket(out, [-2.6, B + 0.86, iz[0]], [0, 0, 1]);
  lightSwitch(out, [7.1, B + 1.05, iz[1]], [0, 0, -1]);
  lightSwitch(out, [7.2, B + 1.05, iz[1]], [0, 0, -1]);
  homeDisplay(out, [6.95, B + 1.42, -67.44], [0, 0, 1]);

  // ---- The dining room: a table for eight under a long pendant.
  // (0.4.27) Laid for two, not eight: across its end toward the garden,
  // their chairs pushed back a little and turned, a glass of wine each;
  // the rest of the table bare but for the flowers.
  marbleTable(out, [2.55, B, -67.9], Math.PI / 2, { w: 2.6, d: 1.05 });
  for (const z of [-68.85, -67.9]) {
    chair(out, [2.0, B, z], Math.PI / 2);
    chair(out, [3.1, B, z], -Math.PI / 2);
  }
  chair(out, [1.9, B, -66.98], Math.PI / 2 + 0.14);
  chair(out, [3.21, B, -66.92], -Math.PI / 2 - 0.09);
  chair(out, [2.55, B, -69.45], 0);
  chair(out, [2.55, B, -66.35], Math.PI);
  // (0.4.28) Its light a linear pendant over it (lightFixtures.js).
  // (0.4.20) A round stoneware vase in the middle (it was a plain angular
  // bottle).
  vase(out, [2.55, B + 0.75, -67.9], 0.3, v(P.ceramic, 0.8));
  // (0.4.26) Flowers in it: garden roses and eucalyptus.
  bouquet(out, [2.55, B + 0.75 + 0.3, -67.9], 11);
  placeSetting(out, [2.27, B + 0.75, -66.95], [-1, 0]);
  placeSetting(out, [2.83, B + 0.75, -66.95], [1, 0]);
  for (const [gx, gz] of [[2.47, -66.78], [2.63, -67.12]]) wineGlass(out, [gx, B + 0.75, gz]);
  // (0.4.27) Over it, a large calm painting: two fields stacked on a warm
  // ground, on canvas (it was a print the size of the rest).
  canvas(out, [4.54, B + 1.62, -68.7], -Math.PI / 2, 1.6, 1.1, 0.3);

  // ---- The WC (0.4.23): Italian marble on every wall and the floor, the
  // vanity's wall bookmatched; a wall-hung toilet on its marble ledge, a
  // floating vanity under a mirror three times as wide as it's tall.
  {
    const [wx0, wx1, wz0, wz1] = [4.66, ix[1], -71.44, -67.56];
    const top = CEIL_G - 0.005;
    const t = 0.015;
    clad(out, [wx0 + 0.004, B + 0.02, wz0 + 0.004], [wx1 - 0.004, B + 0.03, wz1 - 0.004], 0.85);
    clad(out, [wx0 + 0.004, B + 0.03, wz0 + 0.004], [wx0 + 0.004 + t, top, wz1 - 0.004]);
    // (0.4.27) The vanity's wall, bookmatched, cut round the slot window
    // over the mirror (houseMesh.js; the marble ran over its glass), as the
    // en-suite's is.
    const sl = [-71.1, -68.0, B + 1.7, CEIL_G - 0.35];
    for (const [y0, y1, a, b] of [[B + 0.03, sl[2], wz0 + 0.004, wz1 - 0.004], [sl[3], top, wz0 + 0.004, wz1 - 0.004], [sl[2], sl[3], wz0 + 0.004, sl[0]], [sl[2], sl[3], sl[1], wz1 - 0.004]]) clad(out, [wx1 - 0.004 - t, y0, a], [wx1 - 0.004, y1, b], 0.62);
    clad(out, [wx0 + 0.02, B + 0.03, wz0 + 0.004], [wx1 - 0.02, top, wz0 + 0.004 + t]);
    for (const [a, b, y0] of [[wx0 + 0.02, 4.99, B + 0.03], [5.91, wx1 - 0.02, B + 0.03], [4.99, 5.91, B + 2.23]]) clad(out, [a, y0, wz1 - 0.004 - t], [b, top, wz1 - 0.004]);
    toilet(out, [6.35, B + 0.03, wz0 + 0.02], 0);
    // (0.4.27) Centred under its slot window, on the bookmatch's join
    // (MATCH_AXES).
    longVanity(out, [wx1 - 0.02, B + 0.03, MATCH_AXES[0]], -Math.PI / 2, 1.2, 1);
  }

  // ---- The kitchen: the run along the back with its sink and hob, a tall
  // unit with the fridge up the side wall, the island and its stools.
  kitchenRun(out, [4.95, B, iz[0]], 0, 4.8);
  tallUnit(out, [ix[1], B, -73.6], -Math.PI / 2, 2.2, 2.6);
  island(out, [4.4, B, -74.9], 0, 2.8, 1.0);
  for (const x of [3.5, 4.4, 5.3]) stool(out, [x, B, -74.05]);
  // (0.4.28) Hung from the floating ceiling's panel.
  for (const x of [3.6, 4.4, 5.2]) pendant(out, [x, B + 2.4, -74.9], panelUnder(CEILS.ground), 0.13);

  // ---- The study: a desk at the wall, an office chair, shelves, a chair
  // to read in, a picture.
  desk(out, [-2.0, B, iz[0] + 0.36], 0, 1.8);
  bookcase(out, [1.48, B, -75.9], -Math.PI / 2, 2.6, 2.4, 29);
  loungeChair(out, [-4.4, B, -74.4], Math.PI * 0.75, v(P.fabric, 0.1));
  // (0.4.27) A pair of small contour maps, side by side.
  for (const [z, k] of [[-76.12, 0.64], [-76.68, 0.71]]) picture(out, [-5.32, B + 1.55, z], Math.PI / 2, 0.42, 0.56, k);
  rug(out, [-4.8, -77.8], [0.6, -73.8], y, 0.5);

  // ---- The stair: solid walnut treads cantilevered from a walnut
  // stringer on the wall (the steel that carries them hidden inside it),
  // each with its LED under the nosing; frameless glass up its open side,
  // and a rail on the wall on brackets.
  const run = 0.28;
  const rise = 0.2;
  const z0 = -72.2;
  const sx = ix[0] + 0.045;
  for (let i = 1; i <= 17; i++) {
    const z = z0 - (i - 1) * run;
    const y = B + i * rise;
    box(out, [sx, y - 0.07, z - 0.3], [ix[0] + 1.22, y, z], v(P.walnut, 0));
    // The LED tucked under its nosing, in an opal diffuser (0.4.17: 1.2 cm,
    // it was a 5 mm sliver that barely showed).
    box(out, [sx + 0.04, y - 0.082, z - 0.05], [ix[0] + 1.16, y - 0.07, z - 0.02], P.lamp + 0.5);
  }
  // The stringer: a plate 4.5 cm thick against the wall, its top and bottom
  // edges parallel to the stair's pitch.
  {
    const pitch = Math.atan2(rise, run);
    const len = Math.hypot(17 * run + 0.3, 17 * rise) + 0.2;
    const mid = [ix[0] + 0.0225, B + (17 * rise) / 2 - 0.02, z0 - (17 * run) / 2 + 0.1];
    const along = [0, Math.sin(pitch), -Math.cos(pitch)];
    const up = [0, Math.cos(pitch), Math.sin(pitch)];
    obox(out, mid, [0.0225, 0.2, len / 2], v(P.walnut, 0.2), [[1, 0, 0], up, along]);
  }
  // The open side: frameless laminated glass, a panel to a tread, each held
  // to its tread's edge by two small steel clamps, its top a metre over
  // the tread's nose.
  const ox = ix[0] + 1.215;
  for (let i = 1; i <= 17; i++) {
    const z = z0 - (i - 1) * run;
    const y = B + i * rise;
    glass.push([[ox - 0.006, y - 0.065, z - run + 0.003], [ox + 0.006, y + 0.92, z - 0.003], true]);
    for (const cz of [z - 0.06, z - run + 0.06]) box(out, [ox - 0.018, y - 0.06, cz - 0.02], [ox + 0.018, y - 0.015, cz + 0.02], v(P.steel, 0.5));
  }
  // A brushed-brass handrail over the glass (0.4.17, as the terrace's;
  // walnut before), sloped with the stair, on a short steel post clamped
  // to each panel's top, each post running into the rail (the rail ran on
  // its own line before, a slope off the posts', and floated 14 cm over the
  // lowest); it turns flat at the landing at a knuckle, a rounded end at
  // the foot.
  const railY = i => B + i * rise + 1.08;
  const railZ = i => z0 - (i - 1) * run - run / 2;
  const rail = i => [ox, railY(i), railZ(i)];
  tube(out, rail(-0.1), rail(17), 0.024, P.brass, 14);
  tube(out, rail(17), [ox, railY(17), railZ(17) - 0.35], 0.024, P.brass, 14);
  ball(out, rail(-0.1), 0.024, P.brass, 14, 8);
  ball(out, rail(17), 0.025, P.brass, 14, 8);
  for (let i = 1; i <= 17; i++) {
    const gy = B + i * rise + 0.92;
    box(out, [ox - 0.014, gy - 0.03, railZ(i) - 0.025], [ox + 0.014, gy + 0.005, railZ(i) + 0.025], v(P.steel, 0.5));
    tube(out, [ox, gy, railZ(i)], [ox, railY(i), railZ(i)], 0.007, v(P.steel, 0.5), 6);
  }
  // The wall's rail, on brackets.
  const wr = t => [ix[0] + 0.07, B + 0.9 + t * (17 * rise), z0 + 0.1 - t * (17 * run + 0.3)];
  tube(out, wr(0), wr(1), 0.02, P.steel, 8);
  for (let k = 1; k < 5; k++) {
    const p = wr(k / 5);
    tube(out, [ix[0] + 0.005, p[1] - 0.06, p[2]], [p[0], p[1] - 0.02, p[2]], 0.007, P.steel, 6);
  }

  // ---- Curtains at the glass: stacked at the ends and between the rooms.
  const cz = -63.42;
  for (const [x0, x1, to] of [[-7.35, -4.4, -1], [-4.4, -1.45, 1], [-1.35, 1.6, -1], [1.6, 4.55, 1]]) CURTAINS.push([x0, x1, cz, CEIL_G - 0.02, B + 0.01, to, 3 + CURTAINS.length * 7]);
  track(out, -7.35, 4.55, cz, CEIL_G - 0.03);
}

/** The upper floor's rooms. `jx`, `jz`: its inside's x and z; `glass`
 * takes their panes (the stair void's, the shower's). */
export function upperRooms(out, glass, jx, jz) {
  const y = T + 0.07;
  // ---- Partitions.
  partition(out, [-4.5, -71.28], [-4.5, -77.5], T, CEIL_U, [[-74.6, -73.6]]);
  partition(out, [-4.5, -77.5], [2.6, -77.5], T, CEIL_U);
  partition(out, [-4.5, -75.8], [2.6, -75.8], T, CEIL_U, [[1.35, 2.25]]);
  partition(out, [2.6, -71.28], [2.6, jz[0]], T, CEIL_U, [[-74.6, -73.7], [-78.5, -77.6]]);
  partition(out, [2.6, -75.0], [jx[1], -75.0], T, CEIL_U);
  door(out, [-4.5, -73.6], [0, -1], y, { open: -1.2 });
  door(out, [1.35, -75.8], [1, 0], y, { open: 1.3 });
  door(out, [2.6, -73.7], [0, -1], y, { open: 1.2 });
  door(out, [2.6, -77.6], [0, -1], y, { open: 1.0 });

  // ---- The landing: the stair's void and its glass, a bench at the glass,
  // a picture.
  for (const [lo, hi] of [[[-6.2, y, -77.0], [-6.188, y + 1.0, -72.0]], [[jx[0], y, -72.012], [-6.2, y + 1.0, -72.0]]]) glass.push([lo, hi, true]);
  // (0.4.17) Capped in brass like the stair's rail and the terrace's: a
  // knuckle at the corner, a rounded end at each wall.
  const ry = y + 1.012;
  tube(out, [-6.194, ry, -77.0], [-6.194, ry, -72.006], 0.021, P.brass, 14);
  tube(out, [jx[0], ry, -72.006], [-6.194, ry, -72.006], 0.021, P.brass, 14);
  ball(out, [-6.194, ry, -72.006], 0.024, P.brass, 14, 8);
  ball(out, [-6.194, ry, -77.0], 0.021, P.brass, 14, 8);
  // (0.4.10) Against the bedroom's wall, facing the void, clear of the way
  // out to the terrace.
  bench(out, [-4.8, T, -76.3], Math.PI / 2, { w: 1.3, padded: true });
  // (0.4.27) A tall print: a disc over a horizon.
  picture(out, [jx[0] + 0.01, T + 1.6, -78.0], Math.PI / 2, 0.7, 1.0, 0.82);

  // ---- The main bedroom: the bed facing the glass, its tables and lamps,
  // an armchair at the glass, a dresser, a rug.
  rug(out, [-3.6, -75.6], [1.6, -72.0], y, 0.3);
  // (0.4.28) Brass sconces by it instead of the globes (lightFixtures.js).
  bed(out, [-0.95, y, -75.74], 0, { w: 1.9, l: 2.1, ceil: CEIL_U, pendants: false });
  // (0.4.22) A socket over each nightstand, on the panel; a switch by the
  // door, by the en-suite's.
  for (const x of [-2.26, 0.36]) socket(out, [x, y + 0.72, -75.645], [0, 0, 1]);
  lightSwitch(out, [-4.44, T + 1.1, -74.68], [1, 0, 0]);
  lightSwitch(out, [2.54, T + 1.1, -74.8], [-1, 0, 0]);
  loungeChair(out, [1.7, y, -72.2], Math.PI * 1.2, v(P.fabric, 0.3));
  dresser(out, [-4.38, y, -72.6], Math.PI / 2, 1.3);
  mirror(out, [-4.43, y + 1.55, -72.6], Math.PI / 2, 0.9, 1.0);
  // (0.4.27) Over the bed, a quiet long one: ridges into the haze.
  picture(out, [-0.95, y + 1.95, -75.72], 0, 1.4, 0.6, 0.5);

  // ---- The walk-in wardrobe (0.4.21): a run of walnut cabinetry along
  // its back wall, bays of long hanging, double hanging, and shelves over
  // drawers; brass rails, each lit by a strip under the shelf over it;
  // garments of every kind on hangers, spaced as they're kept; folded
  // knitwear on the shelves. (It was two bare rails of soft shapes.)
  wardrobeRun(out, y, -77.44, [-4.42, 2.52]);

  // ---- The en-suite (0.4.23): Italian marble on every wall and the
  // floor, bookmatched behind the vanity; a double vanity on the door's
  // wall under a mirror three times as wide as it's tall, a freestanding
  // bath by the front wall, a toilet on its ledge on the back wall, a
  // walk-in shower in the far corner (a wet wall with a lit niche, a rain
  // head, a hand shower, a linear drain, glass on two sides). (Its old
  // fittings overlapped, and it had no toilet.)
  {
    const [ex0, ex1, ez0, ez1] = [2.66, jx[1], -74.94, -71.28];
    const top = CEIL_U - 0.005;
    const t = 0.015;
    const f0 = y + 0.012;
    clad(out, [ex0 + 0.004, y, ez0 + 0.004], [ex1 - 0.004, f0, ez1 - 0.004], 0.85);
    for (const [a, b, y0, y1] of [[ez1 + 0.004 - 0.008, -73.69, f0, top], [-74.61, ez0 + 0.004, f0, top], [-73.69, -74.61, y + 2.21, top]]) clad(out, [ex0 + 0.004, y0, Math.min(a, b)], [ex0 + 0.004 + t, y1, Math.max(a, b)], 0.64);
    clad(out, [ex0 + 0.02, f0, ez0 + 0.004], [5.95, top, ez0 + 0.004 + t]);
    clad(out, [ex0 + 0.02, f0, ez1 - 0.004 - t], [ex1 - 0.02, top, ez1 - 0.004]);
    for (const [y0, y1, a, b] of [[f0, T + 1.5, ez0 + 0.02, ez1 - 0.02], [CEIL_U - 0.3, top, ez0 + 0.02, ez1 - 0.02], [T + 1.5, CEIL_U - 0.3, ez0 + 0.02, -74.6], [T + 1.5, CEIL_U - 0.3, -72.2, ez1 - 0.02]]) clad(out, [ex1 - 0.004 - t, y0, a], [ex1 - 0.004, y1, b]);
    longVanity(out, [ex0 + 0.02, f0, MATCH_AXES[1]], Math.PI / 2, 1.8, 2);
    bath(out, [4.6, f0, -72.15], 0);
    toilet(out, [4.3, f0, ez0 + 0.02], 0);
    walkInShower(out, glass, f0, [5.95, ex1 - 0.02], [ez0 + 0.004, -73.15], CEIL_U);
  }

  // ---- The guest bedroom: a bed, its table and lamp, a desk.
  bed(out, [5.15, y, jz[0] + 0.02], 0, { w: 1.5, l: 2.0, ceil: CEIL_U, stands: [false, true] });
  desk(out, [jx[1] - 0.4, y, -76.0], -Math.PI / 2, 1.2);
  socket(out, [6.26, y + 0.72, jz[0] + 0.115], [0, 0, 1]);
  socket(out, [jx[1], y + 0.86, -76.55], [-1, 0, 0]);

  // ---- Curtains at the glass.
  const cz = -71.42;
  for (const [x0, x1, to] of [[-7.1, -2.35, -1], [-2.35, 2.5, 1]]) CURTAINS.push([x0, x1, cz, CEIL_U - 0.02, T + 0.08, to, 11 + CURTAINS.length * 7]);
  track(out, -7.1, 2.5, cz, CEIL_U - 0.03);
}

/**
 * (0.4.21) The walk-in wardrobe's run, along its back wall at z `back`
 * from x0 to x1 on the floor at y: bays between walnut uprights, 60 cm
 * deep, 2.4 m tall, on a recessed plinth, a top over them; each bay long
 * hanging (coats, dresses), double hanging (shirts and knits over
 * trousers), or shelves of folded things over a bank of drawers.
 */
function wardrobeRun(out, y, back, [x0, x1]) {
  const D = 0.6;
  const H = 2.4;
  const t = 0.025;
  const W = v(P.walnut, 0.25);
  const front = back + D;
  const kinds = ['long', 'double', 'shelves', 'double', 'long', 'shelves', 'double', 'long'];
  const widths = [0.9, 0.9, 0.7, 0.9, 0.9, 0.7, 0.9, x1 - x0 - 5.9];
  box(out, [x0, y, back], [x1, y + H, back + 0.012], W);
  box(out, [x0, y, back + 0.05], [x1, y + 0.08, front - 0.05], v(P.walnut, 0));
  box(out, [x0 - 0.01, y + H - t, back], [x1 + 0.01, y + H, front + 0.01], W);
  let x = x0;
  let seed = 41;
  const rail = (a, b, ry) => {
    tube(out, [a + 0.01, ry, back + D / 2], [b - 0.01, ry, back + D / 2], 0.012, P.brass, 10);
    for (const e of [a + 0.01, b - 0.01]) box(out, [e - 0.004, ry - 0.02, back + D / 2 - 0.02], [e + (e < (a + b) / 2 ? 0.01 : -0.004) + 0.004, ry + 0.02, back + D / 2 + 0.02], P.brass);
  };
  // A light strip under a shelf's front edge, an opal diffuser.
  const strip = (a, b, sy) => box(out, [a + 0.02, sy - 0.002, front - 0.06], [b - 0.02, sy + 0.01, front - 0.035], P.lamp + 0.5);
  const shelf = (a, b, sy) => box(out, [a, sy, back + 0.012], [b, sy + t, front - 0.01], W);
  const hangRow = (a, b, ry, pick) => {
    rail(a, b, ry);
    let gx = a + 0.07;
    let i = 0;
    while (gx < b - 0.06) {
      const [kind, col] = pick(i, seed);
      garment(out, [gx, ry - 0.085, back + D / 2], Math.PI / 2 + (((seed * 7) % 10) - 5) * 0.01, kind, col, seed);
      seed += 3;
      gx += kind === 'coat' ? 0.11 : kind === 'knit' ? 0.09 : 0.075;
      gx += ((seed * 13) % 10) * 0.003;
      i++;
    }
  };
  kinds.forEach((kind, bay) => {
    const a = x;
    const b = x + widths[bay];
    box(out, [a, y, back], [a + t, y + H, front], W);
    if (kind === 'long') {
      shelf(a + t, b, y + 2.02);
      strip(a + t, b, y + 2.02);
      hangRow(a + t, b, y + 1.9, i => [i % 3 === 1 ? 'dress' : 'coat', [0.05, 0.45, 0.9, 0.62, 0.2][(i + bay) % 5]]);
    } else if (kind === 'double') {
      shelf(a + t, b, y + 2.02);
      strip(a + t, b, y + 2.02);
      hangRow(a + t, b, y + 1.9, i => [i % 4 === 3 ? 'knit' : 'shirt', [0.3, 0.95, 0.35, 0.78, 0.0, 0.5][(i + bay) % 6]]);
      shelf(a + t, b, y + 1.06);
      strip(a + t, b, y + 1.06);
      hangRow(a + t, b, y + 0.95, i => ['trousers', [0.05, 0.85, 0.45, 0.15][(i + bay) % 4]]);
    } else {
      // Drawers, three, then shelves of folded things, lit.
      for (let d = 0; d < 3; d++) {
        const dy = y + 0.1 + d * 0.24;
        box(out, [a + t + 0.002, dy, front - 0.02], [b - 0.002, dy + 0.232, front], v(P.walnut, 0.5));
        barPull(out, [(a + b) / 2 - 0.09, dy + 0.17, front], [(a + b) / 2 + 0.09, dy + 0.17, front], [0, 0, 1], P.brass);
      }
      for (let r = 0; r < 4; r++) {
        const sy = y + 0.82 + r * 0.37;
        shelf(a + t, b, sy);
        if (r > 0) strip(a + t, b, sy);
        const mid = (a + b) / 2;
        for (const [dx, n] of [[-0.17, 3 + ((r + bay) % 3)], [0.17, 2 + ((r * 2 + bay) % 3)]]) foldedStack(out, [mid + dx, sy + t, back + 0.32], 0, n, 60 + bay * 7 + r * 3 + dx * 10);
      }
    }
    x = b;
  });
  box(out, [x1 - t, y, back], [x1, y + H, front], W);
}
