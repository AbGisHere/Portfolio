/**
 * (0.4.2) The house's rooms, as the plan has them (docs/parts/house.md):
 * the partitions and their doors, the floating stair and its void, the
 * curtains at the glass, and each room furnished (furniture.js). The shell
 * round them is houseMesh.js's.
 */

import { FLOOR, HOUSE_PART, STOREY, TERRACE } from './houseShape';
import { box, grid, lathe, tube } from './meshKit';
import {
  bath, bed, bedside, bench, bookcase, chair, clothesRail, coffeeTable, console_, desk, door, dresser, floorLamp, folded, island,
  kitchenRun, loungeChair, mirror, pendant, picture, rug, shower, sofa, stool, table, tableLamp, tallUnit, tv, v, vanity, wc,
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
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    piece(at, g0, y0, y1);
    piece(g0, g1, y0 + 2.2, y1);
    // The frame: jambs and head, 6 cm walnut, proud of both faces.
    const fr = (s0, s1, t0, t1) => (alongX ? box(out, [s0, t0, c - PART_T / 2 - 0.01], [s1, t1, c + PART_T / 2 + 0.01], v(P.walnut, 0.5)) : box(out, [c - PART_T / 2 - 0.01, t0, s0], [c + PART_T / 2 + 0.01, t1, s1], v(P.walnut, 0.5)));
    fr(g0 - 0.06, g0, y0, y0 + 2.26);
    fr(g1, g1 + 0.06, y0, y0 + 2.26);
    fr(g0 - 0.06, g1 + 0.06, y0 + 2.2, y0 + 2.26);
    at = g1;
  }
  piece(at, b, y0, y1);
}

/**
 * Curtains on a ceiling track from x0 to x1 at z (in front of glass facing
 * +z), from y0 (the track) to y1 (the hem): lined linen, pinch-pleated at
 * the head, falling in deep uneven folds that flare a little toward a
 * weighted hem; `gathered`, bunched tight.
 */
function curtain(out, x0, x1, z, y0, y1, gathered, seed) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const folds = Math.max(3, Math.round((x1 - x0) / (gathered ? 0.075 : 0.16)));
  const amp = gathered ? 0.07 : 0.055;
  const jit = Array.from({ length: folds + 2 }, () => 0.7 + 0.6 * rnd());
  box(out, [x0 - 0.05, y0, z - 0.03], [x1 + 0.05, y0 + 0.03, z + 0.03], v(P.steel, 0.5));
  grid(out, folds * 8, 28, (u, w) => {
    const y = y0 - 0.02 + (y1 - y0 + 0.02) * w;
    const fx = u * folds;
    const k = Math.floor(fx);
    const deep = amp * (jit[k] * (1 - (fx - k)) + jit[k + 1] * (fx - k));
    // The head: pleats pinched in groups of three, then the cloth falling
    // free below them.
    const head = Math.min(1, w / 0.06);
    const flare = 1 + 0.35 * w * w;
    const ph = fx * Math.PI * 2;
    const dz = Math.cos(ph) * deep * (0.35 + 0.65 * head) * flare;
    const dx = Math.sin(ph) * deep * 0.18 * head;
    // The hem: a turned-up band, weighted.
    const hem = w > 0.97 ? (w - 0.97) / 0.03 : 0;
    return { p: [x0 + (x1 - x0) * u + dx, y - hem * 0.01, z + dz + hem * 0.006 * Math.cos(ph)], part: P.curtain, s: u * (x1 - x0), t: (y1 - y0) * w };
  }, [0, 0, 1]);
}

/** The ground floor's rooms. `ix`, `iz`: its inside's x and z. */
export function groundRooms(out, ix, iz) {
  const y = B + 0.02;
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
  for (let k = 0; k < 4; k++) {
    const z = -63.9 - k * 0.32;
    tube(out, [ix[1], B + 1.75, z], [ix[1] - 0.08, B + 1.78, z], 0.008, P.brass, 6);
  }
  clothesRail(out, [ix[1] - 0.25, -63.6], [ix[1] - 0.25, -64.9], B + 1.8, 11);
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
  bookcase(out, [-3.4, B, -72.55], Math.PI, 3.8, 2.4, 17);

  // ---- The dining room: a table for eight under a long pendant.
  table(out, [2.55, B, -67.9], Math.PI / 2, { w: 2.5, d: 1.0 });
  for (const z of [-68.85, -67.9, -66.95]) {
    chair(out, [2.0, B, z], Math.PI / 2);
    chair(out, [3.1, B, z], -Math.PI / 2);
  }
  chair(out, [2.55, B, -69.45], 0);
  chair(out, [2.55, B, -66.35], Math.PI);
  for (const z of [-68.5, -67.3]) pendant(out, [2.55, B + 2.05, z], CEIL_G, 0.16);
  lathe(out, [2.55, B + 0.75, -67.9], [0, 1, 0], [[0, 0], [0.05, 0], [0.06, 0.12], [0.03, 0.26], [0.025, 0.3]], v(P.ceramic, 0.8), 18);
  picture(out, [4.54, B + 1.6, -68.6], -Math.PI / 2, 1.2, 0.9, 0.2);

  // ---- The WC: a wall-hung WC, a basin, a mirror.
  wc(out, [6.4, B, -71.44], 0);
  vanity(out, [ix[1] - 0.01, B - 0.1, -69.0], -Math.PI / 2, 0.8, 1);

  // ---- The kitchen: the run along the back with its sink and hob, a tall
  // unit with the fridge up the side wall, the island and its stools.
  kitchenRun(out, [4.95, B, iz[0]], 0, 4.8);
  tallUnit(out, [ix[1], B, -73.6], -Math.PI / 2, 2.2, 2.6);
  island(out, [4.4, B, -74.9], 0, 2.8, 1.0);
  for (const x of [3.5, 4.4, 5.3]) stool(out, [x, B, -74.05]);
  for (const x of [3.6, 4.4, 5.2]) pendant(out, [x, B + 2.4, -74.9], CEIL_G, 0.13);

  // ---- The study: a desk at the wall, an office chair, shelves, a chair
  // to read in, a picture.
  desk(out, [-2.0, B, iz[0] + 0.36], 0, 1.8);
  bookcase(out, [1.48, B, -75.9], -Math.PI / 2, 2.6, 2.4, 29);
  loungeChair(out, [-4.4, B, -74.4], Math.PI * 0.75, v(P.fabric, 0.1));
  picture(out, [-5.32, B + 1.55, -76.4], Math.PI / 2, 1.0, 0.75, 0.6);
  rug(out, [-4.8, -77.8], [0.6, -73.8], y, 0.5);

  // ---- The stair: floating walnut treads up the left wall, a steel
  // handrail on the wall.
  for (let i = 1; i <= 17; i++) {
    const z = -72.2 - (i - 1) * 0.28;
    box(out, [ix[0], B + i * 0.2 - 0.06, z - 0.3], [ix[0] + 1.2, B + i * 0.2, z], v(P.walnut, 0));
  }
  tube(out, [ix[0] + 0.05, B + 0.9, -72.0], [ix[0] + 0.05, T + 0.9, -76.9], 0.02, P.steel, 8);

  // ---- Curtains at the glass: stacked at the ends and between the rooms.
  const cz = -63.42;
  curtain(out, -7.35, -6.25, cz, CEIL_G - 0.02, B + 0.01, true, 3);
  curtain(out, -0.2, 0.9, cz, CEIL_G - 0.02, B + 0.01, true, 5);
  curtain(out, 3.5, 4.55, cz, CEIL_G - 0.02, B + 0.01, true, 7);
}

/** The upper floor's rooms. `jx`, `jz`: its inside's x and z; `glass`
 * takes their panes (the stair void's, the shower's). */
export function upperRooms(out, glass, jx, jz) {
  const y = T + 0.07;
  // ---- Partitions.
  partition(out, [-4.5, -71.28], [-4.5, -77.5], T, CEIL_U, [[-74.6, -73.6]]);
  partition(out, [-4.5, -77.5], [2.6, -77.5], T, CEIL_U);
  partition(out, [-4.5, -75.8], [2.6, -75.8], T, CEIL_U, [[-1.0, -0.1]]);
  partition(out, [2.6, -71.28], [2.6, jz[0]], T, CEIL_U, [[-74.6, -73.7], [-78.5, -77.6]]);
  partition(out, [2.6, -75.0], [jx[1], -75.0], T, CEIL_U);
  door(out, [-4.5, -73.6], [0, -1], y, { open: -1.2 });
  door(out, [-1.0, -75.8], [1, 0], y, { open: 1.3 });
  door(out, [2.6, -73.7], [0, -1], y, { open: 1.2 });
  door(out, [2.6, -77.6], [0, -1], y, { open: 1.0 });

  // ---- The landing: the stair's void and its glass, a bench at the glass,
  // a picture.
  for (const [lo, hi] of [[[-6.2, y, -77.0], [-6.188, y + 1.0, -72.0]], [[jx[0], y, -72.012], [-6.2, y + 1.0, -72.0]]]) glass.push([lo, hi, true]);
  bench(out, [-6.0, T, -71.85], 0, { w: 1.6, padded: true });
  picture(out, [jx[0] + 0.01, T + 1.6, -78.0], Math.PI / 2, 0.8, 1.0, 0.8);

  // ---- The main bedroom: the bed facing the glass, its tables and lamps,
  // an armchair at the glass, a dresser, a rug.
  rug(out, [-3.6, -75.6], [1.6, -72.0], y, 0.3);
  bed(out, [-0.95, y, -75.74], 0, { w: 1.9, l: 2.1 });
  for (const x of [-2.45, 0.55]) {
    bedside(out, [x, y, -75.45], 0);
    tableLamp(out, [x, y + 0.5, -75.45]);
  }
  loungeChair(out, [1.7, y, -72.2], Math.PI * 1.2, v(P.fabric, 0.3));
  dresser(out, [-4.38, y, -72.6], Math.PI / 2, 1.3);
  mirror(out, [-4.43, y + 1.55, -72.6], Math.PI / 2, 0.9, 1.0);
  picture(out, [-0.95, y + 1.95, -75.72], 0, 1.4, 0.6, 0.4);

  // ---- The walk-in wardrobe: rails of clothes, shelves of folded ones.
  clothesRail(out, [-4.3, -77.3], [0.0, -77.3], y + 1.9, 21);
  clothesRail(out, [-4.3, -77.3], [0.0, -77.3], y + 0.95, 23);
  for (let k = 0; k < 4; k++) {
    const sy = y + 0.3 + k * 0.42;
    box(out, [0.6, sy, -77.44], [2.5, sy + 0.02, -77.0], v(P.walnut, 0));
    for (let j = 0; j < 4; j++) folded(out, [0.85 + j * 0.45, sy + 0.02, -77.2], 3 + ((j + k) % 3), 31 + j * 3 + k);
  }

  // ---- The en-suite: stone-clad walls, a freestanding bath at the glass
  // side, a walk-in shower behind glass, a double vanity.
  const tileH = y + 2.4;
  box(out, [2.66, y, -74.94], [2.68, tileH, -71.3], v(P.tile, 0.5));
  box(out, [2.66, y, -74.96], [jx[1], tileH, -74.94], v(P.tile, 0.5));
  box(out, [jx[1] - 0.02, y, -74.94], [jx[1], tileH, -71.3], v(P.tile, 0.5));
  box(out, [2.66, y, -74.94], [jx[1], y + 0.005, -71.3], v(P.tile, 0.5));
  bath(out, [4.9, y, -72.2], 0);
  shower(out, [6.85, y, -74.3], 0, 1.6, 1.2);
  glass.push([[6.05, y, -73.7], [6.062, y + 2.0, -71.7], false]);
  vanity(out, [jx[1] - 0.02, y, -73.2], -Math.PI / 2, 1.6, 2);

  // ---- The guest bedroom: a bed, its table and lamp, a desk.
  bed(out, [5.2, y, jz[0] + 0.02], 0, { w: 1.5, l: 2.0 });
  bedside(out, [6.4, y, jz[0] + 0.3], 0);
  tableLamp(out, [6.4, y + 0.5, jz[0] + 0.3]);
  desk(out, [jx[1] - 0.4, y, -76.0], -Math.PI / 2, 1.2);

  // ---- Curtains at the glass.
  const cz = -71.42;
  curtain(out, -7.1, -6.3, cz, CEIL_U - 0.02, T + 0.08, true, 11);
  curtain(out, -4.4, -3.5, cz, CEIL_U - 0.02, T + 0.08, true, 13);
  curtain(out, 1.6, 2.5, cz, CEIL_U - 0.02, T + 0.08, true, 17);
}
