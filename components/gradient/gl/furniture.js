/**
 * (0.4.2) The house's furniture, each piece built as the real thing is
 * made: frames, plinths and legs; cushions stuffed and piped along their
 * seams; tops with eased edges; fittings in their own metals. Every piece
 * is placed by a centre on the floor and a turn (`yaw`, radians, from
 * facing +z), and pushes KIT_STRIDE vertices onto `out` (meshKit.js).
 * houseRooms.js furnishes the rooms with them; houseShader.js gives each
 * material its finish.
 */

import { HOUSE_PART } from './houseShape';
import { add, axes, box, grid, lathe, obox, scale, soft, sweep, tube } from './meshKit';

const P = HOUSE_PART;
/** A part with a variant (0 … 0.9): houseShader.js reads the fraction. */
export const v = (part, k) => part + Math.min(0.9, Math.max(0, k));

/** A local frame at c turned by yaw: `at(x, y, z)` a point in it, `ax` its
 * axes. */
function frame(c, yaw) {
  const ax = axes(0, yaw);
  return { ax, at: (x, y, z) => add(add(add(c, ax[0], x), ax[1], y), ax[2], z) };
}

/** Piping round a cushion's edge: a cord along a rounded rectangle, `hw`
 * by `hd`, round the frame's (x, z) at height y. */
function piping(out, f, y, hw, hd, r, part, round = 0.05) {
  const pts = [];
  const n = 6;
  for (const [cx, cz, a0] of [[hw, hd, 0], [-hw, hd, Math.PI / 2], [-hw, -hd, Math.PI], [hw, -hd, (3 * Math.PI) / 2]]) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push(f.at(cx - Math.sign(cx) * round + Math.cos(a) * round, y, cz - Math.sign(cz) * round + Math.sin(a) * round));
    }
  }
  sweep(out, pts, r, part, { closed: true, seg: 5 });
}

/** A stuffed cushion: soft, piped round its top and bottom seams. */
function cushion(out, f, x, y, z, hw, hh, hd, part, { tilt = 0, yaw = 0, pinch = 0.12, pipe = true, e1 = 0.3, e2 = 0.12 } = {}) {
  const ax = axes(tilt, yaw);
  const w = f.ax;
  // The cushion's own frame: the piece's, turned by its tilt and yaw.
  const turnTo = d => add(add(scale(w[0], d[0]), w[1], d[1]), w[2], d[2]);
  const cax = ax.map(turnTo);
  const c = f.at(x, y, z);
  soft(out, c, [hw, hh, hd], part, { e1, e2, pinch, ax: cax });
  // (A pillow, pinched to its corners, has no welt.)
  if (!pipe || pinch > 0.3) return;
  const cf = { ax: cax, at: (px, py, pz) => add(add(add(c, cax[0], px), cax[1], py), cax[2], pz) };
  for (const sy of [hh * 0.62, -hh * 0.62]) piping(out, cf, sy, hw * 0.97, hd * 0.95, 0.007, part, Math.min(hw, hd) * 0.35);
}

/**
 * A three-seat sofa, its back's middle at c: a low walnut plinth, a box
 * frame, track arms, three seat cushions and three back cushions, piped;
 * scatter cushions; a throw folded over an arm.
 */
export function sofa(out, c, yaw, { width = 2.9, fabric = v(P.fabric, 0.1) } = {}) {
  const f = frame(c, yaw);
  const hw = width / 2;
  const d = 0.98;
  obox(out, f.at(0, 0.06, d / 2), [hw - 0.04, 0.05, d / 2 - 0.04], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0.11, d / 2), [hw - 0.06, 0.004, d / 2 - 0.06], P.steel, f.ax);
  soft(out, f.at(0, 0.24, d / 2), [hw, 0.12, d / 2], fabric, { e1: 0.12, e2: 0.05, ax: f.ax });
  soft(out, f.at(0, 0.52, 0.09), [hw, 0.34, 0.09], fabric, { e1: 0.14, e2: 0.06, ax: f.ax });
  for (const sx of [-1, 1]) soft(out, f.at(sx * (hw - 0.1), 0.42, d / 2), [0.1, 0.24, d / 2], fabric, { e1: 0.14, e2: 0.1, ax: f.ax });
  const seat = (width - 0.4) / 3;
  for (let k = 0; k < 3; k++) {
    const x = -hw + 0.2 + seat * (k + 0.5);
    cushion(out, f, x, 0.44, 0.57, seat / 2 - 0.008, 0.08, 0.37, fabric);
    cushion(out, f, x, 0.72, 0.27, seat / 2 - 0.008, 0.25, 0.1, fabric, { tilt: 0.18, pinch: 0.2 });
  }
  [[-hw + 0.42, 0.3, v(P.cushion, 0.15), 0.25], [-hw + 0.78, -0.2, v(P.cushion, 0.6), 0.22], [hw - 0.5, 0.25, v(P.cushion, 0.35), 0.24]].forEach(([x, ty, part, s]) =>
    cushion(out, f, x, 0.74, 0.42, s, 0.06, s * 0.95, part, { tilt: 1.15, yaw: ty, pinch: 0.55, e1: 0.75, e2: 0.32 }),
  );
  // The throw: a folded blanket hanging over the right arm.
  const tx = hw - 0.1;
  grid(out, 10, 20, (u, w) => {
    const z = 0.25 + u * 0.5;
    let p;
    if (w < 0.35) p = [tx + 0.12 - (w / 0.35) * 0.02, 0.2 + (w / 0.35) * 0.47, z];
    else if (w < 0.65) {
      const a = ((w - 0.35) / 0.3) * Math.PI;
      p = [tx + Math.cos(a) * 0.115, 0.67 + Math.sin(a) * 0.04, z];
    } else p = [tx - 0.115 - ((w - 0.65) / 0.35) * 0.02, 0.67 - ((w - 0.65) / 0.35) * 0.28, z];
    p[0] += 0.006 * Math.sin(u * 19 + w * 7);
    return { p: f.at(...p), part: v(P.fabric, 0.45), s: u, t: w };
  }, f.ax[0]);
  for (const sx of [-1, 1]) for (const sz of [0.06, d - 0.06]) lathe(out, f.at(sx * (hw - 0.08), 0, sz), [0, 1, 0], [[0, 0], [0.018, 0], [0.024, 0.06]], v(P.walnut, 0), 10);
}

/** A lounge chair, its seat's middle at c: a walnut frame on splayed legs,
 * a deep stuffed seat and back, a cushion. */
export function loungeChair(out, c, yaw, fabric = v(P.fabric, 0.3)) {
  const f = frame(c, yaw);
  for (const sx of [-1, 1]) {
    sweep(out, [f.at(sx * 0.36, 0, 0.36), f.at(sx * 0.37, 0.25, 0.32), f.at(sx * 0.37, 0.58, 0.28), f.at(sx * 0.37, 0.6, -0.15)], 0.022, v(P.walnut, 0), { seg: 7 });
    sweep(out, [f.at(sx * 0.36, 0, -0.38), f.at(sx * 0.37, 0.25, -0.33), f.at(sx * 0.37, 0.6, -0.15)], 0.022, v(P.walnut, 0), { seg: 7 });
  }
  cushion(out, f, 0, 0.36, 0.04, 0.32, 0.09, 0.32, fabric);
  cushion(out, f, 0, 0.66, -0.3, 0.31, 0.27, 0.08, fabric, { tilt: 0.32, pinch: 0.2 });
  cushion(out, f, 0.06, 0.6, -0.12, 0.2, 0.05, 0.19, v(P.cushion, 0.15), { tilt: 1.2, yaw: 0.25, pinch: 0.55, e1: 0.75, e2: 0.32 });
}

/**
 * A solid top: flat faces and a rounded (bullnose) edge all round, as a
 * slab of wood or stone is eased. Its middle at the frame's (x, y, z),
 * half-sizes hw × hh × hd.
 */
function slab(out, f, x, y, z, hw, hh, hd, part) {
  // The flat top and bottom inside the edge's round; the edge a rod of the
  // slab's half-thickness run round it (its corners turned tight). (For a
  // top wider and deeper than it's thick.)
  const rc = Math.max(0.001, Math.min(0.006, hw - hh, hd - hh));
  obox(out, f.at(x, y, z), [hw - hh, hh, hd - hh - rc], part, f.ax);
  obox(out, f.at(x, y, z), [hw - hh - rc, hh, hd - hh], part, f.ax);
  const g = { ax: f.ax, at: (px, py, pz) => f.at(px + x, py, pz + z) };
  piping(out, g, y, hw - hh, hd - hh, hh, part, rc);
}

/** A curved panel between heights y0 and y1, bowed round the frame's
 * middle at radius r (its front toward +z) over `span` radians, `thick`
 * thick, at depth z: a chair's back. */
function curvedPanel(out, f, y0, y1, z, r, span, thick, part) {
  const face = (rad, flip) => grid(out, 16, 3, (u, w) => {
    const a = (u - 0.5) * span;
    return { p: f.at(Math.sin(a) * rad, y0 + (y1 - y0) * w, z - r + Math.cos(a) * rad), part, s: u, t: w };
  }, flip ? scale(f.ax[2], -1) : f.ax[2]);
  face(r, false);
  face(r - thick, true);
  for (const [y, up] of [[y1, f.ax[1]], [y0, scale(f.ax[1], -1)]]) {
    grid(out, 16, 1, (u, w) => {
      const a = (u - 0.5) * span;
      const rad = r - thick * w;
      return { p: f.at(Math.sin(a) * rad, y, z - r + Math.cos(a) * rad), part, s: u, t: w };
    }, up);
  }
}

/**
 * A dining chair at c, facing yaw: solid walnut, the front legs turned and
 * tapering, splayed a little; the back legs rising into the back's posts
 * with a rake; an apron round the seat and stretchers low between the
 * legs; a crowned seat cushion, welted; a back bowed round the sitter, its
 * front upholstered.
 */
export function chair(out, c, yaw, fabric = v(P.fabric, 0.6)) {
  const f = frame(c, yaw);
  const W = v(P.walnut, 0);
  const seatY = 0.44;
  // The front legs: tapered rounds, splayed out and forward.
  for (const sx of [-1, 1]) {
    const foot = f.at(sx * 0.215, 0, 0.215);
    const top = f.at(sx * 0.2, seatY - 0.02, 0.19);
    const ax = [top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]];
    const len = Math.hypot(...ax);
    lathe(out, foot, ax.map(x => x / len), [[0, 0], [0.013, 0], [0.019, len * 0.85], [0.02, len], [0, len]], W, 12);
  }
  // The back legs: from the floor, raked back, up through the seat into the
  // posts of the back.
  for (const sx of [-1, 1]) {
    sweep(out, [f.at(sx * 0.21, 0, -0.24), f.at(sx * 0.2, 0.22, -0.2), f.at(sx * 0.2, seatY, -0.18), f.at(sx * 0.195, 0.62, -0.2), f.at(sx * 0.19, 0.8, -0.24)], 0.016, W, { seg: 8 });
  }
  // The apron under the seat, and the stretchers.
  obox(out, f.at(0, seatY - 0.05, 0.19), [0.2, 0.03, 0.012], W, f.ax);
  obox(out, f.at(0, seatY - 0.05, -0.18), [0.2, 0.03, 0.012], W, f.ax);
  for (const sx of [-1, 1]) obox(out, f.at(sx * 0.2, seatY - 0.05, 0.005), [0.012, 0.03, 0.18], W, f.ax);
  for (const sx of [-1, 1]) tube(out, f.at(sx * 0.208, 0.16, 0.2), f.at(sx * 0.205, 0.16, -0.21), 0.009, W, 8);
  tube(out, f.at(-0.205, 0.2, 0.0), f.at(0.205, 0.2, 0.0), 0.009, W, 8);
  // The seat: a walnut pan, the cushion crowned on it and welted.
  obox(out, f.at(0, seatY - 0.012, 0.005), [0.215, 0.012, 0.205], W, f.ax);
  cushion(out, f, 0, seatY + 0.03, 0.01, 0.215, 0.035, 0.205, fabric, { e1: 0.3, e2: 0.14, pinch: 0.06 });
  // The back: a bowed walnut shell between the posts, padded in front.
  curvedPanel(out, f, 0.6, 0.82, -0.2, 0.55, 0.78, 0.014, W);
  curvedPanel(out, f, 0.62, 0.8, -0.186, 0.536, 0.72, 0.02, fabric);
}

/** A bar stool at c: a round padded seat, a steel ring and four legs. */
export function stool(out, c) {
  soft(out, add(c, [0, 0.72, 0]), [0.19, 0.045, 0.19], v(P.fabric, 0.3), { e1: 0.4, e2: 0.6 });
  lathe(out, add(c, [0, 0.66, 0]), [0, 1, 0], [[0.04, 0], [0.16, 0.0], [0.17, 0.02]], P.steel, 20);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    tube(out, add(c, [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2]), add(c, [Math.cos(a) * 0.12, 0.66, Math.sin(a) * 0.12]), 0.011, P.steel, 6);
  }
  sweep(out, Array.from({ length: 17 }, (_, i) => add(c, [Math.cos((i / 16) * Math.PI * 2) * 0.165, 0.25, Math.sin((i / 16) * Math.PI * 2) * 0.165])), 0.008, P.steel, { closed: true, seg: 5 });
}

/** A table at c: a solid top `w` × `d` with eased edges on two trestle ends
 * (or `legs`: four turned legs). */
export function table(out, c, yaw, { w = 2.4, d = 1.0, h = 0.75, top = v(P.walnut, 0), legs = false, thick = 0.045 } = {}) {
  const f = frame(c, yaw);
  slab(out, f, 0, h - thick / 2, 0, w / 2, thick / 2, d / 2, top);
  if (legs) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lathe(out, f.at(sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08)), [0, 1, 0], [[0, 0], [0.018, 0], [0.026, h - thick]], v(P.walnut, 0), 10);
    return;
  }
  for (const sx of [-1, 1]) {
    obox(out, f.at(sx * (w / 2 - 0.3), (h - thick) / 2, 0), [0.035, (h - thick) / 2, d / 2 - 0.12], v(P.walnut, 0), f.ax);
    obox(out, f.at(sx * (w / 2 - 0.3), 0.025, 0), [0.05, 0.025, d / 2 - 0.08], v(P.walnut, 0), f.ax);
  }
  obox(out, f.at(0, h - thick - 0.06, 0), [w / 2 - 0.3, 0.035, 0.02], v(P.walnut, 0), f.ax);
}

/** A low coffee table: a thick walnut slab on two panel ends. */
export function coffeeTable(out, c, yaw) {
  const f = frame(c, yaw);
  slab(out, f, 0, 0.36, 0, 0.65, 0.03, 0.4, v(P.walnut, 0));
  for (const sx of [-1, 1]) obox(out, f.at(sx * 0.5, 0.165, 0), [0.025, 0.165, 0.36], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0.09, 0), [0.475, 0.012, 0.32], v(P.walnut, 0), f.ax);
  // On it: books, a bowl, a candle.
  obox(out, f.at(-0.3, 0.405, 0.05), [0.17, 0.014, 0.12], v(P.book, 0.1), axes(0, yaw + 0.1));
  obox(out, f.at(-0.3, 0.432, 0.05), [0.14, 0.012, 0.1], v(P.book, 0.6), axes(0, yaw - 0.05));
  lathe(out, f.at(0.25, 0.39, -0.05), [0, 1, 0], [[0, 0], [0.06, 0.005], [0.12, 0.05], [0.13, 0.075], [0.122, 0.075], [0.11, 0.05], [0.05, 0.015], [0, 0.015]], P.ceramic, 24);
  lathe(out, f.at(0.0, 0.39, 0.22), [0, 1, 0], [[0, 0], [0.035, 0], [0.035, 0.09], [0, 0.09]], v(P.ceramic, 0.5), 16);
}

/** A rug from corner a to b (x, z) on the floor at y: its pile, a border
 * and a fringe (houseShader.js reads the pattern from s, t). */
export function rug(out, a, b, y, variant = 0) {
  grid(out, 6, 6, (u, w) => ({ p: [a[0] + (b[0] - a[0]) * u, y + 0.012, a[1] + (b[1] - a[1]) * w], part: v(P.rug, variant), s: u, t: w }));
  for (const z of [a[1], b[1]]) {
    for (let i = 0; i < 40; i++) {
      const x = a[0] + ((b[0] - a[0]) * (i + 0.5)) / 40;
      tube(out, [x, y + 0.005, z], [x + 0.004 * Math.sin(i * 3), y + 0.004, z + Math.sign(z - (a[1] + b[1]) / 2) * 0.07], 0.004, v(P.rug, variant), 4);
    }
  }
}

/** A floor lamp: a steel stem on a round foot, a linen drum shade. */
export function floorLamp(out, c) {
  lathe(out, c, [0, 1, 0], [[0, 0], [0.16, 0], [0.16, 0.015], [0.015, 0.03]], P.steel, 20);
  tube(out, add(c, [0, 0.02, 0]), add(c, [0, 1.45, 0]), 0.012, P.steel, 8);
  lathe(out, add(c, [0, 1.42, 0]), [0, 1, 0], [[0.21, 0], [0.19, 0.3]], P.lamp, 24);
  lathe(out, add(c, [0, 1.72, 0]), [0, -1, 0], [[0.185, 0], [0.205, 0.3]], P.lamp, 24);
}

/** A table lamp at c: a ceramic base, a linen shade. */
export function tableLamp(out, c) {
  lathe(out, c, [0, 1, 0], [[0, 0], [0.07, 0], [0.08, 0.06], [0.03, 0.2], [0.012, 0.3]], v(P.ceramic, 0.5), 18);
  lathe(out, add(c, [0, 0.28, 0]), [0, 1, 0], [[0.15, 0], [0.11, 0.2]], P.lamp, 20);
}

/** A pendant at c (its shade's top), hung from the ceiling at `ceil`: a
 * cord and a spun shade, lit inside. */
export function pendant(out, c, ceil, r = 0.13) {
  tube(out, c, [c[0], ceil, c[2]], 0.003, P.steel, 6);
  lathe(out, c, [0, -1, 0], [[0.02, 0], [r * 0.4, r * 0.3], [r, r * 1.5]], P.brass, 28);
  lathe(out, add(c, [0, -r * 1.5, 0]), [0, 1, 0], [[r * 0.96, 0], [r * 0.35, r * 1.2]], P.lamp, 28);
}

/** A TV on a wall at c (its screen's middle), facing yaw: a thin black
 * body, a glass screen. */
export function tv(out, c, yaw, { w = 1.72, h = 0.98 } = {}) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0, -0.02), [w / 2, h / 2, 0.02], P.steel, f.ax);
  obox(out, f.at(0, 0, 0.0005), [w / 2 - 0.006, h / 2 - 0.006, 0.0005], P.screen, f.ax);
}

/** A low media console against a wall: walnut, three fronts, a plinth. */
export function console_(out, c, yaw, w = 2.2) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.27, 0), [w / 2, 0.2, 0.22], v(P.walnut, 0), f.ax);
  for (let k = 0; k < 3; k++) obox(out, f.at(-w / 2 + (w / 3) * (k + 0.5), 0.27, 0.222), [w / 6 - 0.006, 0.19, 0.002], v(P.walnut, 0.5), f.ax);
  obox(out, f.at(0, 0.035, -0.02), [w / 2 - 0.05, 0.035, 0.18], P.steel, f.ax);
}

/** A bed, its headboard's middle at c against a wall, facing yaw: an
 * upholstered headboard, the base, a mattress, the duvet draped over its
 * sides and foot and folded back at the top, pillows, a throw cushion. */
export function bed(out, c, yaw, { w = 1.8, l = 2.1 } = {}) {
  const f = frame(c, yaw);
  const hw = w / 2;
  soft(out, f.at(0, 0.62, 0.06), [hw + 0.12, 0.5, 0.06], v(P.fabric, 0.4), { e1: 0.18, e2: 0.08, ax: f.ax });
  for (let k = 0; k < 6; k++) tube(out, f.at(-hw + (w * (k + 0.5)) / 6, 0.24, 0.125), f.at(-hw + (w * (k + 0.5)) / 6, 1.0, 0.125), 0.006, v(P.fabric, 0.4), 6);
  obox(out, f.at(0, 0.18, 0.12 + l / 2), [hw, 0.1, l / 2], v(P.walnut, 0), f.ax);
  soft(out, f.at(0, 0.4, 0.12 + l / 2), [hw - 0.02, 0.12, l / 2 - 0.02], v(P.fabric, 0.9), { e1: 0.16, e2: 0.05, ax: f.ax });
  const top = 0.535;
  const zs = 0.85;
  const ze = 0.12 + l + 0.02;
  grid(out, 40, 34, (u, w2) => {
    let x = -hw - 0.22 + u * (w + 0.44);
    let z = zs + w2 * (ze - zs + 0.22);
    let y = top + 0.012 * Math.sin(x * 9 + z * 4) * Math.sin(z * 7) + 0.02 * Math.exp(-((z - zs - 0.25) ** 2) / 0.02);
    const ox = Math.max(-hw - x, x - hw, 0);
    const oz = Math.max(z - ze, 0);
    const o = Math.max(ox, oz);
    if (o > 0) {
      y -= o * 1.7 + 0.005 + 0.02 * Math.sin(z * 6 + x * 5) * Math.min(1, o * 8);
      if (ox > 0) x = Math.sign(x) * (hw + 0.035 * (1 - Math.exp(-ox * 40)));
      if (oz > 0) z = ze + 0.035 * (1 - Math.exp(-oz * 40));
    }
    return { p: f.at(x, y, z), part: v(P.fabric, 0.85), s: u, t: w2 };
  });
  soft(out, f.at(0, top + 0.02, zs + 0.03), [hw + 0.02, 0.035, 0.08], v(P.fabric, 0.85), { e1: 0.6, e2: 0.15, ax: f.ax });
  for (const px of [-hw / 2, hw / 2]) {
    cushion(out, f, px, top + 0.1, 0.32, hw / 2 - 0.06, 0.08, 0.16, v(P.cushion, 0.0), { tilt: 1.0, pinch: 0.5, e1: 0.75, e2: 0.32 });
    cushion(out, f, px, top + 0.05, 0.55, hw / 2 - 0.07, 0.07, 0.17, v(P.cushion, 0.0), { tilt: 0.35, pinch: 0.5, e1: 0.75, e2: 0.32 });
  }
  cushion(out, f, 0, top + 0.08, 0.68, 0.24, 0.05, 0.1, v(P.cushion, 0.15), { tilt: 0.6, yaw: 0.1, pinch: 0.5, e1: 0.75, e2: 0.32 });
}

/** A bedside table with a drawer, on steel legs. */
export function bedside(out, c, yaw) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.34, 0), [0.25, 0.16, 0.21], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0.34, 0.212), [0.235, 0.145, 0.002], v(P.walnut, 0.5), f.ax);
  obox(out, f.at(0, 0.38, 0.22), [0.06, 0.006, 0.008], P.brass, f.ax);
  for (const sx of [-0.21, 0.21]) for (const sz of [-0.17, 0.17]) tube(out, f.at(sx, 0, sz), f.at(sx, 0.18, sz), 0.01, P.steel, 6);
}

/** A chest of drawers: walnut, six drawers, brass pulls. */
export function dresser(out, c, yaw, w = 1.4) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.45, 0), [w / 2, 0.38, 0.24], v(P.walnut, 0), f.ax);
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 2; k++) {
      const x = -w / 4 + (k * w) / 2;
      const y = 0.2 + r * 0.25;
      obox(out, f.at(x, y, 0.242), [w / 4 - 0.008, 0.118, 0.002], v(P.walnut, 0.5), f.ax);
      obox(out, f.at(x, y + 0.06, 0.25), [0.07, 0.007, 0.008], P.brass, f.ax);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tube(out, f.at(sx * (w / 2 - 0.05), 0, sz * 0.19), f.at(sx * (w / 2 - 0.05), 0.07, sz * 0.19), 0.015, v(P.walnut, 0), 8);
}

/** A bench: a walnut top on two steel frames, or upholstered. */
export function bench(out, c, yaw, { w = 1.4, padded = false } = {}) {
  const f = frame(c, yaw);
  if (padded) cushion(out, f, 0, 0.42, 0, w / 2, 0.06, 0.2, v(P.fabric, 0.4));
  else slab(out, f, 0, 0.43, 0, w / 2, 0.025, 0.2, v(P.walnut, 0));
  for (const sx of [-1, 1]) {
    sweep(out, [f.at(sx * (w / 2 - 0.1), 0, -0.17), f.at(sx * (w / 2 - 0.1), 0.38, -0.17), f.at(sx * (w / 2 - 0.1), 0.38, 0.17), f.at(sx * (w / 2 - 0.1), 0, 0.17)], 0.012, P.steel, { seg: 6 });
  }
}

/** A desk at the wall: a walnut top on a steel frame, a drawer, a lamp,
 * a closed laptop, a mug, papers; an office chair. */
export function desk(out, c, yaw, w = 1.6) {
  const f = frame(c, yaw);
  slab(out, f, 0, 0.735, 0, w / 2, 0.018, 0.36, v(P.walnut, 0));
  for (const sx of [-1, 1]) {
    sweep(out, [f.at(sx * (w / 2 - 0.06), 0, -0.3), f.at(sx * (w / 2 - 0.06), 0.715, -0.3), f.at(sx * (w / 2 - 0.06), 0.715, 0.3), f.at(sx * (w / 2 - 0.06), 0, 0.3)], 0.014, P.steel, { seg: 6 });
  }
  obox(out, f.at(w / 2 - 0.35, 0.66, 0), [0.25, 0.05, 0.3], v(P.walnut, 0.5), f.ax);
  obox(out, f.at(-0.15, 0.762, 0.05), [0.16, 0.007, 0.11], v(P.steel, 0.5), axes(0, yaw - 0.12));
  lathe(out, f.at(0.35, 0.753, 0.0), [0, 1, 0], [[0, 0], [0.04, 0], [0.04, 0.095], [0.036, 0.095], [0.036, 0.008], [0, 0.008]], P.ceramic, 18);
  obox(out, f.at(0.15, 0.755, 0.12), [0.105, 0.002, 0.148], P.paper, axes(0, yaw + 0.2));
  // The desk lamp: a steel arm and a small shade.
  const base = f.at(-w / 2 + 0.2, 0.753, -0.22);
  lathe(out, base, [0, 1, 0], [[0, 0], [0.08, 0], [0.08, 0.015], [0.01, 0.02]], P.steel, 16);
  sweep(out, [add(base, [0, 0.02, 0]), add(base, [0, 0.38, 0]), add(add(base, f.ax[2], 0.22), [0, 0.45, 0])], 0.007, P.steel, { seg: 6 });
  lathe(out, add(add(base, f.ax[2], 0.25), [0, 0.47, 0]), [0, -1, 0], [[0.02, 0], [0.07, 0.09]], P.steel, 16);
  officeChair(out, f.at(0, 0, 0.6), yaw + Math.PI + 0.3);
}

/** An office chair: a five-star base on casters, a gas column, a padded
 * seat and a mesh back. */
export function officeChair(out, c, yaw) {
  const f = frame(c, yaw);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const tip = f.at(Math.cos(a) * 0.32, 0.07, Math.sin(a) * 0.32);
    tube(out, f.at(0, 0.1, 0), tip, 0.016, P.steel, 6);
    soft(out, add(tip, [0, -0.04, 0]), [0.025, 0.025, 0.025], P.steel, { e1: 1, e2: 1, nu: 10, nv: 6 });
  }
  tube(out, f.at(0, 0.1, 0), f.at(0, 0.44, 0), 0.025, v(P.steel, 0.5), 10);
  cushion(out, f, 0, 0.48, 0, 0.24, 0.045, 0.23, v(P.fabric, 0.3), { e1: 0.35, e2: 0.25, pinch: 0.1 });
  cushion(out, f, 0, 0.85, -0.24, 0.22, 0.25, 0.025, v(P.fabric, 0.3), { tilt: -0.15, e1: 0.4, e2: 0.4, pipe: false });
  tube(out, f.at(0, 0.5, -0.2), f.at(0, 0.7, -0.25), 0.015, P.steel, 6);
}

/** A kitchen run against a wall at c (its back's middle), w long: base
 * units with doors and a plinth, a stone top, a sink and tap, a hob, wall
 * units over it, an extractor, things on the counter. */
export function kitchenRun(out, c, yaw, w) {
  const f = frame(c, yaw);
  const n = Math.round(w / 0.6);
  obox(out, f.at(0, 0.05, 0.28), [w / 2, 0.05, 0.27], P.steel, f.ax);
  obox(out, f.at(0, 0.48, 0.3), [w / 2, 0.38, 0.3], v(P.walnut, 0), f.ax);
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (w / n) * (k + 0.5);
    obox(out, f.at(x, 0.48, 0.602), [w / n / 2 - 0.004, 0.375, 0.002], v(P.walnut, 0.5), f.ax);
    obox(out, f.at(x, 0.83, 0.61), [w / n / 2 - 0.05, 0.004, 0.006], P.brass, f.ax);
  }
  soft(out, f.at(0, 0.88, 0.31), [w / 2 + 0.01, 0.02, 0.32], v(P.slab, 0.6), { e1: 0.12, e2: 0.02, ax: f.ax, nu: 40, nv: 6 });
  // The sink, sunk in the top, and its tap.
  obox(out, f.at(-w / 4, 0.8, 0.31), [0.38, 0.1, 0.2], v(P.steel, 0.5), f.ax);
  obox(out, f.at(-w / 4, 0.901, 0.31), [0.36, 0.0012, 0.18], v(P.steel, 0.6), f.ax);
  sweep(out, [f.at(-w / 4, 0.9, 0.05), f.at(-w / 4, 1.2, 0.05), f.at(-w / 4, 1.26, 0.15), f.at(-w / 4, 1.2, 0.24)], 0.012, v(P.steel, 0.5), { seg: 8 });
  // The hob, and the extractor over it.
  obox(out, f.at(w / 4, 0.902, 0.3), [0.38, 0.002, 0.26], P.screen, f.ax);
  for (const [hx, hz, r] of [[-0.18, -0.08, 0.1], [0.18, -0.08, 0.08], [-0.18, 0.12, 0.08], [0.18, 0.12, 0.1]]) {
    sweep(out, Array.from({ length: 21 }, (_, i) => f.at(w / 4 + hx + Math.cos((i / 20) * Math.PI * 2) * r, 0.905, 0.3 + hz + Math.sin((i / 20) * Math.PI * 2) * r)), 0.002, v(P.steel, 0.6), { closed: true, seg: 4 });
  }
  obox(out, f.at(w / 4, 1.9, 0.25), [0.45, 0.04, 0.25], v(P.steel, 0.5), f.ax);
  // Wall units over the sink's side.
  obox(out, f.at(-w / 4, 1.85, 0.18), [w / 4 - 0.05, 0.4, 0.18], v(P.walnut, 0), f.ax);
  for (let k = 0; k < 3; k++) obox(out, f.at(-w / 2 + 0.05 + (w / 2 - 0.1) * ((k + 0.5) / 3), 1.85, 0.362), [(w / 2 - 0.1) / 6 - 0.004, 0.39, 0.002], v(P.walnut, 0.5), f.ax);
  // On the counter: a board, a bowl of lemons, a kettle, a bottle.
  obox(out, f.at(w / 4 - 0.65, 0.915, 0.35), [0.2, 0.012, 0.14], v(P.walnut, 0.5), axes(0, yaw + 0.3));
  lathe(out, f.at(-w / 4 - 0.7, 0.9, 0.3), [0, 1, 0], [[0, 0], [0.06, 0.005], [0.13, 0.07], [0.135, 0.09], [0.125, 0.09], [0.08, 0.04], [0, 0.03]], P.ceramic, 22);
  for (let k = 0; k < 5; k++) soft(out, f.at(-w / 4 - 0.7 + Math.cos(k * 1.3) * 0.05, 0.98 + (k > 2 ? 0.04 : 0), 0.3 + Math.sin(k * 1.3) * 0.05), [0.035, 0.03, 0.03], P.fruit, { e1: 0.9, e2: 0.9, nu: 12, nv: 8 });
  lathe(out, f.at(w / 4 + 0.6, 0.9, 0.45), [0, 1, 0], [[0, 0], [0.08, 0], [0.09, 0.08], [0.07, 0.19], [0.03, 0.22], [0, 0.23]], v(P.steel, 0.5), 20);
  lathe(out, f.at(-w / 2 + 0.25, 0.9, 0.12), [0, 1, 0], [[0, 0], [0.035, 0], [0.035, 0.2], [0.012, 0.26], [0.012, 0.3], [0, 0.3]], v(P.ceramic, 0.8), 16);
}

/** A kitchen island: base units, a stone top with waterfall ends. */
export function island(out, c, yaw, w = 2.8, d = 1.0) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.45, 0), [w / 2 - 0.04, 0.45, d / 2 - 0.08], v(P.walnut, 0), f.ax);
  for (let k = 0; k < 4; k++) obox(out, f.at(-w / 2 + 0.04 + ((w - 0.08) * (k + 0.5)) / 4, 0.48, d / 2 - 0.078), [(w - 0.08) / 8 - 0.004, 0.37, 0.002], v(P.walnut, 0.5), f.ax);
  obox(out, f.at(0, 0.91, 0), [w / 2, 0.025, d / 2], v(P.slab, 0.6), f.ax);
  for (const sx of [-1, 1]) obox(out, f.at(sx * (w / 2 - 0.025), 0.445, 0), [0.025, 0.445, d / 2], v(P.slab, 0.6), f.ax);
  // A bowl, a vase of stems.
  lathe(out, f.at(0.5, 0.935, 0), [0, 1, 0], [[0, 0], [0.08, 0], [0.16, 0.08], [0.17, 0.1], [0.16, 0.1], [0.07, 0.03], [0, 0.03]], v(P.ceramic, 0.5), 24);
  lathe(out, f.at(-0.6, 0.935, 0.1), [0, 1, 0], [[0, 0], [0.06, 0], [0.07, 0.1], [0.04, 0.25], [0.03, 0.3], [0, 0.3]], v(P.ceramic, 0.8), 18);
}

/** A tall unit against a wall: fridge and pantry doors, full height. */
export function tallUnit(out, c, yaw, w, h) {
  const f = frame(c, yaw);
  obox(out, f.at(0, h / 2, 0.3), [w / 2, h / 2, 0.3], v(P.walnut, 0), f.ax);
  const n = Math.round(w / 0.6);
  for (let k = 0; k < n; k++) {
    obox(out, f.at(-w / 2 + (w / n) * (k + 0.5), h / 2, 0.602), [w / n / 2 - 0.004, h / 2 - 0.01, 0.002], v(P.walnut, 0.5), f.ax);
    obox(out, f.at(-w / 2 + (w / n) * (k + 0.5) + (k % 2 ? -1 : 1) * (w / n / 2 - 0.05), h * 0.48, 0.615), [0.006, 0.3, 0.008], P.brass, f.ax);
  }
}

/** A bookcase against a wall: walnut, its shelves full of books, a few
 * things between them. */
export function bookcase(out, c, yaw, w, h, seed = 1) {
  const f = frame(c, yaw);
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  obox(out, f.at(0, h / 2, 0.02), [w / 2, h / 2, 0.02], v(P.walnut, 0), f.ax);
  for (const sx of [-1, 1]) obox(out, f.at(sx * (w / 2 - 0.015), h / 2, 0.2), [0.015, h / 2, 0.18], v(P.walnut, 0), f.ax);
  const rows = Math.round(h / 0.38);
  for (let r = 0; r <= rows; r++) obox(out, f.at(0, r * (h / rows), 0.2), [w / 2, 0.012, 0.18], v(P.walnut, 0), f.ax);
  for (let r = 0; r < rows; r++) {
    const y = r * (h / rows) + 0.012;
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.08) {
      if (rnd() < 0.07) {
        lathe(out, f.at(x + 0.08, y, 0.2), [0, 1, 0], [[0, 0], [0.05, 0], [0.06, 0.1], [0.03, 0.18], [0, 0.18]], v(P.ceramic, rnd()), 14);
        x += 0.2;
        continue;
      }
      const bw = 0.02 + 0.03 * rnd();
      const bh = 0.2 + 0.1 * rnd();
      const lean = rnd() < 0.05 ? 0.25 : 0;
      obox(out, f.at(x + bw / 2, y + bh / 2, 0.2), [bw / 2, bh / 2, 0.1 + 0.04 * rnd()], v(P.book, rnd()), lean ? axes(lean, yaw) : f.ax);
      x += bw + 0.002;
    }
  }
}

/** A picture on a wall at c, facing yaw: a walnut frame, a mount, a print. */
export function picture(out, c, yaw, w, h, variant = 0) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0, 0.015), [w / 2, h / 2, 0.015], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0, 0.0305), [w / 2 - 0.03, h / 2 - 0.03, 0.0005], P.paper, f.ax);
  obox(out, f.at(0, 0, 0.031), [w / 2 - 0.1, h / 2 - 0.1, 0.0005], v(P.art, variant), f.ax);
}

/** A mirror on a wall at c, facing yaw, in a thin brass frame. */
export function mirror(out, c, yaw, w, h) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0, 0.012), [w / 2, h / 2, 0.012], P.brass, f.ax);
  obox(out, f.at(0, 0, 0.0245), [w / 2 - 0.015, h / 2 - 0.015, 0.0005], P.mirror, f.ax);
}

/** A WC on the floor at c against a wall behind it: a wall-hung bowl, a
 * seat, its flush plate. */
export function wc(out, c, yaw) {
  const f = frame(c, yaw);
  soft(out, f.at(0, 0.32, 0.28), [0.18, 0.12, 0.27], P.ceramic, { e1: 0.5, e2: 0.6, ax: f.ax });
  soft(out, f.at(0, 0.445, 0.3), [0.18, 0.012, 0.25], v(P.ceramic, 0.3), { e1: 0.4, e2: 0.6, ax: f.ax });
  obox(out, f.at(0, 0.95, 0.005), [0.12, 0.08, 0.005], v(P.steel, 0.5), f.ax);
}

/** A vanity at a wall: a floating walnut unit, a stone top, basins on it,
 * taps from the wall, a mirror over it. */
export function vanity(out, c, yaw, w = 1.4, basins = 1) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.62, 0.25), [w / 2, 0.2, 0.25], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0.84, 0.26), [w / 2 + 0.01, 0.02, 0.26], v(P.slab, 0.6), f.ax);
  for (let k = 0; k < basins; k++) {
    const x = basins === 1 ? 0 : -w / 4 + (k * w) / 2;
    lathe(out, f.at(x, 0.86, 0.28), [0, 1, 0], [[0, 0], [0.12, 0], [0.2, 0.12], [0.195, 0.125], [0.12, 0.012], [0, 0.012]], P.ceramic, 28);
    sweep(out, [f.at(x, 1.1, 0.0), f.at(x, 1.1, 0.16), f.at(x, 1.08, 0.2)], 0.01, P.brass, { seg: 8 });
    mirror(out, f.at(x, 1.6, 0), yaw, 0.7, 0.9);
  }
}

/** A freestanding bath at c: a deep oval tub, its hollow, a floor tap. */
export function bath(out, c, yaw) {
  const f = frame(c, yaw);
  const rim = 0.6;
  soft(out, f.at(0, rim, 0), [0.85, rim, 0.42], P.ceramic, { e1: 0.3, e2: 0.6, ax: f.ax, nu: 48, nv: 12, lower: true });
  soft(out, f.at(0, rim, 0), [0.79, 0.5, 0.36], v(P.ceramic, 0.3), { e1: 0.55, e2: 0.6, ax: f.ax, nu: 48, nv: 12, lower: true, inside: true });
  // The rolled rim between them.
  const ring = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const sp = (x, e) => Math.sign(x) * Math.abs(x) ** e;
    ring.push(f.at(0.82 * sp(Math.cos(a), 0.6), rim, 0.39 * sp(Math.sin(a), 0.6)));
  }
  sweep(out, ring, 0.03, P.ceramic, { closed: true, seg: 8 });
  sweep(out, [f.at(0.95, 0, 0.0), f.at(0.95, 0.85, 0), f.at(0.85, 0.92, 0), f.at(0.75, 0.86, 0)], 0.016, P.brass, { seg: 8 });
}

/** A walk-in shower: a stone tray, a glass screen (houseGlass.js pane), a
 * rain head and its arm. */
export function shower(out, c, yaw, w = 1.4, d = 1.1, ceil = 3.2) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.012, 0), [w / 2, 0.012, d / 2], v(P.tile, 0.5), f.ax);
  sweep(out, [f.at(0, 2.2, -d / 2), f.at(0, 2.25, -d / 2 + 0.05), f.at(0, 2.25, 0)], 0.01, P.brass, { seg: 6 });
  lathe(out, f.at(0, 2.25, 0), [0, -1, 0], [[0, 0], [0.15, 0], [0.15, 0.01], [0, 0.01]], P.brass, 24);
  void ceil;
}

/** Clothes on a rail, from a to b at height y: hangers, and garments of
 * their own lengths and colours. */
export function clothesRail(out, a, b, y, seed = 3) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  tube(out, [a[0], y, a[1]], [b[0], y, b[1]], 0.012, v(P.steel, 0.5), 8);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dir = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  for (let t = 0.08; t < len - 0.05; t += 0.06 + rnd() * 0.05) {
    const p = [a[0] + dir[0] * t, a[1] + dir[1] * t];
    const long = 0.6 + rnd() * 0.6;
    const yaw = Math.atan2(dir[0], dir[1]) + Math.PI / 2 + (rnd() - 0.5) * 0.2;
    soft(out, [p[0], y - 0.05 - long / 2, p[1]], [0.24, long / 2, 0.025 + 0.02 * rnd()], v(P.clothes, rnd()), { e1: 0.4, e2: 0.5, pinch: 0.2, ax: axes(0, yaw) });
  }
}

/** Folded clothes on a shelf: a stack of soft slabs at c. */
export function folded(out, c, n, seed = 5) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let y = c[1];
  for (let k = 0; k < n; k++) {
    const hh = 0.02 + 0.015 * rnd();
    soft(out, [c[0] + (rnd() - 0.5) * 0.02, y + hh, c[2]], [0.16, hh, 0.13], v(P.clothes, rnd()), { e1: 0.35, e2: 0.15, ax: axes(0, (rnd() - 0.5) * 0.1) });
    y += hh * 2;
  }
}

/** A sun lounger: its teak frame and slats from z0 toward +z at x, the
 * back raised, a stuffed piped cushion over the seat and the back, a
 * rolled towel. */
export function lounger(out, x, z0, y) {
  const W = 0.7;
  const L = 2.0;
  for (const sx of [-W / 2, W / 2 - 0.05]) {
    box(out, [x + sx, y + 0.22, z0], [x + sx + 0.05, y + 0.3, z0 + L], v(P.walnut, 0.2));
    for (const z of [z0 + 0.05, z0 + L - 0.1]) box(out, [x + sx, y, z], [x + sx + 0.05, y + 0.22, z + 0.05], v(P.walnut, 0.2));
  }
  for (let k = 0; k < 13; k++) box(out, [x - W / 2 + 0.04, y + 0.27, z0 + 0.62 + k * 0.105], [x + W / 2 - 0.04, y + 0.3, z0 + 0.62 + k * 0.105 + 0.08], v(P.walnut, 0.2));
  const tilt = 0.7;
  const bc = [x, y + 0.3 + Math.sin(tilt) * 0.3, z0 + 0.6 - Math.cos(tilt) * 0.3];
  obox(out, bc, [W / 2 - 0.03, 0.015, 0.32], v(P.walnut, 0.2), axes(-tilt));
  const f = { ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], at: (px, py, pz) => [px, py, pz] };
  cushion(out, f, x, y + 0.36, z0 + 1.32, W / 2 - 0.04, 0.05, 0.69, v(P.cushion, 0), { e1: 0.3, e2: 0.1, pinch: 0.08 });
  cushion(out, f, bc[0], bc[1] + Math.cos(tilt) * 0.06, bc[2] + Math.sin(tilt) * 0.06, W / 2 - 0.04, 0.045, 0.33, v(P.cushion, 0), { tilt: -tilt, e1: 0.3, e2: 0.1, pinch: 0.08 });
  soft(out, [x, y + 0.48, z0 + 0.42], [0.23, 0.07, 0.08], v(P.cushion, 0.4), { e1: 0.8, e2: 0.6, ax: axes(-tilt) });
}

/** A door in an opening: its frame (jambs and head), the leaf on its hinge
 * at `hinge` (x, z), swung open by `open` radians from closing along
 * `dir` (its width's way, unit x, z), a lever handle. */
export function door(out, hinge, dir, y0, { w = 0.9, h = 2.2, open = 0.6, part = v(P.walnut, 0.5), thick = 0.04 } = {}) {
  const yaw = Math.atan2(dir[0], dir[1]) - Math.PI / 2 + open;
  const ax = axes(0, yaw);
  const c = add([hinge[0], y0 + h / 2, hinge[1]], ax[0], w / 2);
  obox(out, c, [w / 2, h / 2, thick / 2], part, ax);
  for (const sz of [-1, 1]) {
    const hc = add(add(c, ax[0], w / 2 - 0.08), ax[2], sz * (thick / 2 + 0.03));
    tube(out, add(hc, [0, -0.05, 0]), add(add(hc, [0, -0.05, 0]), ax[0], -0.12), 0.009, P.brass, 6);
  }
}
