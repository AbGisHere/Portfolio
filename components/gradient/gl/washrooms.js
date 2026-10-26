/**
 * (0.4.23) The washrooms' fittings, for the marble WC downstairs and the
 * en-suite: a wall-hung toilet on a marble-clad cistern ledge, a floating
 * vanity under one long mirror lit from behind, a walk-in shower, and the
 * marble cladding itself.
 *
 * - **Cladding** (`clad`): slabs of Italian marble a little proud of the
 *   walls and floor (houseShader.js: `marble` variant .3 a wall's slabs
 *   with their joins, .6 bookmatched, .85 the floor's, honed).
 * - **The toilet** (`toilet`): its cistern hidden in a marble ledge to a
 *   metre, a brass flush plate on it; a wall-hung bowl, hollow, its rim
 *   rolled; the seat; the lid up, leaning back on the ledge.
 * - **The vanity** (`longVanity`): a walnut unit floating on the wall, a
 *   marble top, vessel basins, taps from the wall; a mirror three times as
 *   wide as it's tall over it (furniture.js's `mirror`, so it has a probe),
 *   a strip of light behind its top and bottom edges, a glow under the
 *   unit.
 * - **The shower** (`walkInShower`): a marble wet wall with a lit niche,
 *   a rain head flush in the ceiling, a hand shower on a slide rail, its
 *   hose and mixer, a linear drain along the wet wall; glass on two sides
 *   (houseGlass.js panes), an open corner to walk in.
 */

import { HOUSE_PART } from './houseShape';
import { add, axes, box, lathe, obox, soft, sweep, tube } from './meshKit';
import { mirror, slabCut } from './furniture';

const P = HOUSE_PART;
const v = (part, k) => part + Math.min(0.9, Math.max(0, k));

const frame = (c, yaw) => {
  const ax = axes(0, yaw);
  return { ax, at: (x, y, z) => add(add(add(c, ax[0], x), ax[1], y), ax[2], z) };
};

/** A marble slab from lo to hi (a wall's or the floor's cladding). */
export const clad = (out, lo, hi, k = 0.3) => box(out, lo, hi, v(P.marble, k));

/** The toilet against the wall at c (its foot), facing yaw. */
export function toilet(out, c, yaw, ledge = 1.1) {
  const f = frame(c, yaw);
  // The ledge: the cistern's box clad in marble, its top a slab.
  obox(out, f.at(0, 0.52, 0.1), [ledge / 2, 0.52, 0.1], v(P.marble, 0.3), f.ax);
  // (0.4.27) Its top one piece, its veins along it (not the cladding's
  // slabs, whose join fell across it).
  obox(out, f.at(0, 1.055, 0.105), [ledge / 2 + 0.01, 0.015, 0.11], v(P.marble, slabCut(f.ax)), f.ax);
  // The flush plate: brass, two buttons.
  obox(out, f.at(0, 0.82, 0.203), [0.11, 0.075, 0.003], P.brass, f.ax);
  for (const s of [-1, 1]) obox(out, f.at(s * 0.052, 0.82, 0.208), [0.045, 0.06, 0.002], P.brass, f.ax);
  // The bowl, hung from the ledge: its outside, its hollow, its rim.
  const rimY = 0.42;
  const bz = 0.2 + 0.28;
  soft(out, f.at(0, rimY, bz), [0.185, 0.27, 0.28], P.ceramic, { e1: 0.55, e2: 0.65, ax: f.ax, nu: 40, nv: 12, lower: true });
  soft(out, f.at(0, rimY, bz + 0.01), [0.14, 0.2, 0.22], v(P.ceramic, 0.3), { e1: 0.6, e2: 0.7, ax: f.ax, nu: 40, nv: 12, lower: true, inside: true });
  const ring = (rx, rz, y, r, part) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const sp = (x, e) => Math.sign(x) * Math.abs(x) ** e;
      pts.push(f.at(rx * sp(Math.cos(a), 0.65), y, bz + 0.01 + rz * sp(Math.sin(a), 0.75)));
    }
    sweep(out, pts, r, part, { closed: true, seg: 8 });
  };
  ring(0.162, 0.25, rimY, 0.022, P.ceramic);
  // The seat on it, and its hinge.
  ring(0.162, 0.25, rimY + 0.03, 0.014, v(P.ceramic, 0.1));
  for (const s of [-1, 1]) lathe(out, f.at(s * 0.1, rimY + 0.03, 0.215), [1, 0, 0], [[0, 0], [0.012, 0], [0.012, 0.03], [0, 0.03]], v(P.steel, 0.5), 10);
  // The lid, up, leaning back on the ledge.
  soft(out, f.at(0, rimY + 0.04 + 0.25 * Math.cos(0.2), 0.235 - 0.25 * Math.sin(0.2) + 0.03), [0.175, 0.011, 0.25], v(P.ceramic, 0.1), { e1: 0.45, e2: 0.3, ax: axes(Math.PI / 2 + 0.2, yaw) });
}

/** A vanity on the wall at c (its foot), facing yaw, `w` wide, its
 * basins; the mirror `w` × w / 3 over it. */
export function longVanity(out, c, yaw, w, basins = 1) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.62, 0.25), [w / 2, 0.2, 0.25], v(P.walnut, 0), f.ax);
  for (let k = 0; k < basins * 2; k++) {
    const dw = w / (basins * 2);
    obox(out, f.at(-w / 2 + dw * (k + 0.5), 0.62, 0.5 + 0.0105), [dw / 2 - 0.003, 0.195, 0.0095], v(P.walnut, 0.6), f.ax);
  }
  obox(out, f.at(0, 0.84, 0.26), [w / 2 + 0.01, 0.02, 0.26], v(P.marble, slabCut(f.ax)), f.ax);
  obox(out, f.at(0, 0.417, 0.25), [w / 2 - 0.05, 0.003, 0.2], P.lamp, f.ax);
  for (let k = 0; k < basins; k++) {
    const x = basins === 1 ? 0 : -w / 4 + (k * w) / 2;
    lathe(out, f.at(x, 0.86, 0.28), [0, 1, 0], [[0, 0], [0.09, 0], [0.19, 0.03], [0.21, 0.13], [0.205, 0.135], [0.185, 0.035], [0.09, 0.01], [0, 0.01]], P.ceramic, 36);
    sweep(out, [f.at(x, 1.16, 0.0), f.at(x, 1.16, 0.15), f.at(x, 1.13, 0.2)], 0.011, P.brass, { seg: 10 });
    for (const s of [-1, 1]) {
      lathe(out, f.at(x + s * 0.11, 1.12, 0.0), [0, 0, 1], [[0.025, 0], [0.025, 0.01], [0.012, 0.012], [0.012, 0.05], [0, 0.05]], P.brass, 14);
      // (0.4.31) Champagne-bronze cross-handle taps from the marble
      tube(out, f.at(x + s * 0.11 - 0.025, 1.12, 0.05), f.at(x + s * 0.11 + 0.025, 1.12, 0.05), 0.003, P.brass, 4);
      tube(out, f.at(x + s * 0.11, 1.12 - 0.025, 0.05), f.at(x + s * 0.11, 1.12 + 0.025, 0.05), 0.003, P.brass, 4);
    }
  }
  if (basins === 1) {
    // (0.4.31) WC: amber apothecary soap bottle with brass pump; walnut basket of three rolled waffle hand towels
    lathe(out, f.at(0.24, 0.86, 0.25), [0, 1, 0], [[0, 0], [0.024, 0], [0.024, 0.065], [0.01, 0.075], [0.01, 0.09], [0, 0.09]], v(P.ceramic, 0.85), 14);
    tube(out, f.at(0.24, 0.95, 0.25), f.at(0.24, 0.98, 0.25), 0.002, P.brass, 4);
    tube(out, f.at(0.24, 0.975, 0.25), f.at(0.24, 0.97, 0.275), 0.002, P.brass, 4);
    box(out, f.at(-0.35, 0.86, 0.18), f.at(-0.18, 0.91, 0.32), v(P.walnut, 0.2));
    soft(out, f.at(-0.29, 0.89, 0.25), [0.02, 0.02, 0.055], v(P.fabric, 0.9), { e1: 1, e2: 1, ax: f.ax });
    soft(out, f.at(-0.24, 0.89, 0.25), [0.02, 0.02, 0.055], v(P.fabric, 0.9), { e1: 1, e2: 1, ax: f.ax });
    soft(out, f.at(-0.265, 0.925, 0.25), [0.02, 0.02, 0.055], v(P.fabric, 0.9), { e1: 1, e2: 1, ax: f.ax });
  } else if (basins > 1) {
    // (0.4.31) En-suite: three folded white bath sheets in an open cubby under the vanity
    for (let i = 0; i < 3; i++) {
      soft(out, f.at(0, 0.46 + i * 0.038, 0.25), [0.18, 0.016, 0.14], v(P.fabric, 0.9), { e1: 0.6, e2: 0.6, ax: f.ax });
    }
  }
  const mh = w / 3;
  const my = 1.18 + 0.08 + mh / 2;
  mirror(out, f.at(0, my, 0.016), yaw, w, mh);
  // Light behind its top and bottom edges, onto the marble.
  for (const s of [-1, 1]) obox(out, f.at(0, my + s * (mh / 2 - 0.02), 0.009), [w / 2 - 0.06, 0.004, 0.006], P.lamp, f.ax);
}

/**
 * A walk-in shower at the floor y in the corner from x0 to x1, its wet wall
 * on z0 (facing +z), out to z1; `ceil` the ceiling's height; `glass`
 * takes its panes. The open corner is at (x0, z1).
 */
export function walkInShower(out, glass, y, [x0, x1], [z0, z1], ceil) {
  // The wet wall: marble 12 cm proud, a niche in it, lit.
  const d = 0.12;
  const n = [x0 + 0.35, x0 + 0.95, y + 1.05, y + 1.4];
  const ww = (a, b, ya, yb) => box(out, [a, ya, z0], [b, yb, z0 + d], v(P.marble, 0.66));
  ww(x0, n[0], y, ceil - 0.005);
  ww(n[1], x1, y, ceil - 0.005);
  ww(n[0], n[1], y, n[2]);
  ww(n[0], n[1], n[3], ceil - 0.005);
  box(out, [n[0], n[2], z0], [n[1], n[3], z0 + 0.02], v(P.marble, 0.3));
  box(out, [n[0] + 0.02, n[3] - 0.012, z0 + 0.03], [n[1] - 0.02, n[3], z0 + 0.07], P.lamp);
  // Bottles in the niche.
  for (const [bx, h] of [[n[0] + 0.12, 0.2], [n[0] + 0.22, 0.17], [n[0] + 0.42, 0.14]]) lathe(out, [bx, n[2], z0 + 0.065], [0, 1, 0], [[0, 0], [0.03, 0], [0.032, h - 0.04], [0.012, h - 0.01], [0.012, h], [0, h]], v(P.ceramic, 0.5), 14);
  // The rain head, flush in the ceiling.
  const cx = (x0 + x1) / 2;
  const cz = (z0 + d + z1) / 2;
  box(out, [cx - 0.16, ceil - 0.012, cz - 0.16], [cx + 0.16, ceil, cz + 0.16], P.brass);
  // The hand shower on its rail, the hose to the mixer.
  const rx = x1 - 0.35;
  const fz = z0 + d;
  tube(out, [rx, y + 0.85, fz + 0.035], [rx, y + 1.95, fz + 0.035], 0.011, P.brass, 10);
  for (const yy of [y + 0.85, y + 1.95]) tube(out, [rx, yy, fz], [rx, yy, fz + 0.035], 0.008, P.brass, 8);
  obox(out, [rx, y + 1.72, fz + 0.05], [0.02, 0.03, 0.02], P.brass);
  tube(out, [rx, y + 1.62, fz + 0.075], [rx, y + 1.84, fz + 0.09], 0.014, P.brass, 10);
  lathe(out, [rx, y + 1.84, fz + 0.09], [0, 0.6, 0.8], [[0, 0], [0.045, 0], [0.045, 0.018], [0, 0.022]], P.brass, 18);
  const mx = x0 + 1.4;
  lathe(out, [mx, y + 1.05, fz], [0, 0, 1], [[0, 0], [0.075, 0], [0.075, 0.008], [0.06, 0.012], [0, 0.012]], P.brass, 24);
  tube(out, [mx, y + 1.05, fz + 0.012], [mx, y + 1.05, fz + 0.06], 0.012, P.brass, 10);
  tube(out, [mx, y + 1.05, fz + 0.06], [mx + 0.1, y + 1.05, fz + 0.06], 0.009, P.brass, 8);
  sweep(out, [[rx, y + 1.62, fz + 0.075], [rx - 0.02, y + 1.2, fz + 0.1], [rx - 0.15, y + 0.95, fz + 0.09], [mx + 0.05, y + 0.98, fz + 0.03], [mx, y + 1.0, fz + 0.012]], 0.007, v(P.steel, 0.5), { seg: 6 });
  // The linear drain along the wet wall.
  box(out, [x0 + 0.2, y, fz + 0.04], [x1 - 0.2, y + 0.004, fz + 0.1], v(P.steel, 0.5));
  for (let k = 0; k < 40; k++) {
    const gx = x0 + 0.22 + (k / 39) * (x1 - x0 - 0.44);
    box(out, [gx - 0.003, y + 0.004, fz + 0.045], [gx + 0.003, y + 0.005, fz + 0.095], P.frame);
  }
  // The glass: along its front from the wall back to the open corner, and
  // a return on its open side, leaving the corner to walk in.
  glass.push([[x0 + 0.65, y, z1 - 0.006], [x1 - 0.004, y + 2.05, z1 + 0.006], false]);
  glass.push([[x0 - 0.006, y, z0 + d], [x0 + 0.006, y + 2.05, z1 - 0.55], false]);
  box(out, [x0 + 0.65, y, z1 - 0.012], [x1 - 0.004, y + 0.02, z1 + 0.012], v(P.steel, 0.5));
  box(out, [x0 - 0.012, y, z0 + d], [x0 + 0.012, y + 0.02, z1 - 0.55], v(P.steel, 0.5));
}
