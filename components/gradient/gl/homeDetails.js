/**
 * (0.4.22) The things that make the house lived in: socket and switch
 * plates where they'd be used, a Home control display by the front door,
 * and a mini-bar on the terrace against the timber wall beside the
 * bedroom's glass.
 *
 * - **Plates** (`socket`, `lightSwitch`): one family, 86 mm square, 8 mm
 *   proud, brushed brass with eased edges; a socket's face a dark round
 *   well with its two pins' holes, a switch's a rocker. Sockets low on the
 *   walls by the sofa, the TV, the dining wall, above the kitchen's
 *   counter, the study's desk, and by each bed; switches by the doors.
 * - **The Home display** (`homeDisplay`): a slim tablet on a wall mount,
 *   its screen the house's controls (houseShader.js draws it: rooms as
 *   tiles, the lights on or off, the temperature), glowing a little.
 * - **The bar** (`miniBar`): a walnut counter with a stone top, a glass-
 *   fronted wine fridge under its end, two floating shelves of bottles on
 *   the timber over it, lit by strips under them, two stools before it.
 */

import { HOUSE_PART } from './houseShape';
import { add, ball, barPull, box, cross, lathe, obox, soft, tube, unit } from './meshKit';

const P = HOUSE_PART;
const v = (part, k) => part + Math.min(0.9, Math.max(0, k));

// A wall's frame at `at` facing `n` (unit, horizontal): x along the wall,
// y up, z out of it.
const wallFrame = (at, n) => {
  const z = unit(n);
  const x = unit(cross([0, 1, 0], z));
  return { ax: [x, [0, 1, 0], z], at: (px, py, pz) => add(add(add(at, x, px), [0, 1, 0], py), z, pz) };
};

function plate(out, f) {
  obox(out, f.at(0, 0, 0.004), [0.043, 0.043, 0.004], P.brass, f.ax);
  // Its eased edge: a slimmer step round the face.
  obox(out, f.at(0, 0, 0.0085), [0.04, 0.04, 0.0005], P.brass, f.ax);
}

/** A socket on the wall at `at`, facing `n`. */
export function socket(out, at, n) {
  const f = wallFrame(at, n);
  plate(out, f);
  lathe(out, f.at(0, 0, 0.009), f.ax[2], [[0.019, 0], [0.018, -0.004], [0, -0.004]], P.frame, 20);
  for (const s of [-1, 1]) lathe(out, f.at(s * 0.0095, 0, 0.0052), f.ax[2], [[0.0024, 0], [0, 0]], P.frame, 8);
}

/** A light switch at `at`, facing `n`: a rocker in its plate. */
export function lightSwitch(out, at, n) {
  const f = wallFrame(at, n);
  plate(out, f);
  obox(out, f.at(0, 0.004, 0.0105), [0.018, 0.026, 0.002], P.brass, [f.ax[0], unit(add(f.ax[1], f.ax[2], 0.08)), unit(add(f.ax[2], f.ax[1], -0.08))]);
}

/** The Home display on the wall at `at`, facing `n`: 25 × 18 cm, landscape. */
export function homeDisplay(out, at, n) {
  const f = wallFrame(at, n);
  // The mount, then the tablet: an aluminium shell, a black bezel, the
  // screen (houseShader.js's P.screen, variant .6: the controls).
  obox(out, f.at(0, 0, 0.006), [0.06, 0.04, 0.006], P.steel, f.ax);
  obox(out, f.at(0, 0, 0.016), [0.128, 0.093, 0.004], v(P.steel, 0.5), f.ax);
  obox(out, f.at(0, 0, 0.0205), [0.126, 0.091, 0.0005], P.frame, f.ax);
  obox(out, f.at(0, 0, 0.0216), [0.118, 0.083, 0.0006], v(P.screen, 0.6), f.ax);
}

/**
 * The mini-bar on the deck at y (its top), against the wall at z `wall`
 * (facing +z), from x0 to x1.
 */
export function miniBar(out, y, wall, [x0, x1]) {
  const d = 0.55;
  const h = 0.92;
  const front = wall + d;
  // The counter: a walnut carcass on a recessed plinth, doors along its
  // front with brass pulls, a fridge at its right end; a stone top
  // overhanging the front.
  box(out, [x0 + 0.05, y, wall], [x1 - 0.05, y + 0.1, front - 0.06], P.frame);
  box(out, [x0, y + 0.1, wall], [x1, y + h - 0.04, front - 0.02], v(P.walnut, 0));
  const fx = x1 - 0.62;
  const doors = Math.round((fx - x0) / 0.5);
  const dw = (fx - x0) / doors;
  for (let k = 0; k < doors; k++) {
    const a = x0 + k * dw + 0.003;
    const b = a + dw - 0.006;
    box(out, [a, y + 0.104, front - 0.02], [b, y + h - 0.046, front - 0.001], v(P.walnut, 0.6));
    const px = k % 2 ? a + 0.05 : b - 0.05;
    barPull(out, [px, y + h - 0.32, front - 0.001], [px, y + h - 0.12, front - 0.001], [0, 0, 1], P.brass);
  }
  // The fridge: a steel frame round a dark glass door, its shelves of
  // bottles faintly behind it.
  box(out, [fx, y + 0.104, front - 0.02], [x1 - 0.003, y + h - 0.046, front - 0.006], P.steel);
  box(out, [fx + 0.03, y + 0.14, front - 0.006], [x1 - 0.033, y + h - 0.08, front - 0.002], P.screen);
  tube(out, [fx + 0.06, y + h - 0.12, front + 0.03], [fx + 0.06, y + 0.2, front + 0.03], 0.008, v(P.steel, 0.5), 8);
  for (const yy of [y + h - 0.12, y + 0.2]) tube(out, [fx + 0.06, yy, front - 0.002], [fx + 0.06, yy, front + 0.03], 0.005, v(P.steel, 0.5), 6);
  box(out, [x0 - 0.02, y + h - 0.04, wall], [x1 + 0.02, y + h, front + 0.04], v(P.marble, 0));
  // On it: a tray with two tumblers and a shaker, a bowl of lemons.
  box(out, [x0 + 0.5, y + h, wall + 0.2], [x0 + 0.85, y + h + 0.012, wall + 0.42], v(P.walnut, 0.2));
  for (const [tx, tz] of [[x0 + 0.58, wall + 0.3], [x0 + 0.66, wall + 0.34]]) lathe(out, [tx, y + h + 0.012, tz], [0, 1, 0], [[0, 0], [0.034, 0], [0.038, 0.09], [0.034, 0.09], [0.03, 0.006], [0, 0.006]], v(P.ceramic, 0.3), 20);
  lathe(out, [x0 + 0.77, y + h + 0.012, wall + 0.3], [0, 1, 0], [[0, 0], [0.04, 0], [0.045, 0.14], [0.03, 0.2], [0.018, 0.24], [0, 0.245]], v(P.steel, 0.5), 20);
  lathe(out, [x1 - 0.9, y + h, wall + 0.3], [0, 1, 0], [[0, 0], [0.06, 0], [0.13, 0.07], [0.135, 0.085], [0.125, 0.085], [0.06, 0.015], [0, 0.015]], v(P.ceramic, 0.5), 24);
  for (let k = 0; k < 4; k++) ball(out, [x1 - 0.9 + Math.cos(k * 1.7) * 0.05, y + h + 0.05 + (k === 3 ? 0.04 : 0), wall + 0.3 + Math.sin(k * 1.7) * 0.05], 0.035, P.fruit, 10, 6);
  // The shelves on the timber over it: walnut, floating, a strip of light
  // under each front, bottles and glasses along them.
  for (const [sy, seed] of [[y + 1.38, 3], [y + 1.78, 7]]) {
    box(out, [x0 + 0.15, sy, wall], [x1 - 0.15, sy + 0.035, wall + 0.24], v(P.walnut, 0.25));
    // (0.4.26) Set in a groove in the shelf's underside, its face 2 mm
    // below it: hung a centimetre under, it showed from the desk as a
    // sliver thinner than a pixel, there one frame and gone the next.
    box(out, [x0 + 0.17, sy - 0.002, wall + 0.19], [x1 - 0.17, sy + 0.012, wall + 0.215], v(P.lamp, 0.5));
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    let bx = x0 + 0.25;
    while (bx < x1 - 0.25) {
      const kind = rnd();
      const at = [bx, sy + 0.035, wall + 0.12];
      if (kind < 0.62) {
        // A bottle: wine's tall shoulders, a spirit's squat, a long neck.
        const tall = 0.26 + 0.08 * rnd();
        const r = kind < 0.3 ? 0.038 : 0.045;
        const shoulder = tall * (kind < 0.3 ? 0.62 : 0.55);
        lathe(out, at, [0, 1, 0], [[0, 0], [r, 0], [r, shoulder], [r * 0.4, shoulder + 0.05], [0.014, tall - 0.04], [0.016, tall - 0.035], [0.015, tall], [0, tall]], v(P.ceramic, rnd() < 0.5 ? 0.88 : 0.9), 18);
        bx += r * 2 + 0.03 + 0.03 * rnd();
      } else if (kind < 0.85) {
        // Two glasses, stemmed.
        for (const gx of [0, 0.08]) lathe(out, add(at, [gx, 0, 0]), [0, 1, 0], [[0, 0], [0.035, 0], [0.004, 0.006], [0.004, 0.09], [0.03, 0.12], [0.04, 0.17], [0.038, 0.17], [0.028, 0.12], [0, 0.11]], v(P.ceramic, 0.3), 18);
        bx += 0.2;
      } else {
        bx += 0.12;
      }
    }
  }
  // Two stools before it.
  for (const sx of [x0 + 0.85, x1 - 1.15]) {
    soft(out, [sx, y + 0.72, front + 0.35], [0.19, 0.045, 0.19], v(P.fabric, 0.3), { e1: 0.4, e2: 0.6 });
    lathe(out, [sx, y + 0.66, front + 0.35], [0, 1, 0], [[0.04, 0], [0.16, 0.0], [0.17, 0.02]], P.brass, 20);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      tube(out, [sx + Math.cos(a) * 0.2, y, front + 0.35 + Math.sin(a) * 0.2], [sx + Math.cos(a) * 0.12, y + 0.66, front + 0.35 + Math.sin(a) * 0.12], 0.011, P.frame, 6);
    }
  }
}
