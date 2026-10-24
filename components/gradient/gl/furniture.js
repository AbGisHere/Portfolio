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
import { add, axes, barPull, box, grid, lathe, lever, obox, scale, soft, sweep, tube } from './meshKit';

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

/**
 * A pillow round c, half-sizes `half` along `ax` (its thickness along
 * ax[1]): two faces of cloth sewn at their edges, so it's full in the middle
 * and thins to its seam; its sides drawn in a little between the corners,
 * which stand out as ears; the cloth creased in soft folds running in from
 * the edges toward the middle; a welt round the seam.
 */
export function pillow(out, c, half, part, ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
  const [hw, hh, hd] = half;
  const at = (u, w, sgn) => {
    // The plan: drawn in along each side, most at its middle.
    const x = hw * u * (1 - 0.07 * (1 - w * w));
    const z = hd * w * (1 - 0.07 * (1 - u * u));
    const fill = Math.pow(Math.max(0, 1 - u * u), 0.42) * Math.pow(Math.max(0, 1 - w * w), 0.42);
    // Creases from the edge in, strongest near it.
    const edge = Math.max(Math.abs(u), Math.abs(w));
    const crease = 0.12 * Math.sin(Math.atan2(w, u) * 11 + u * 3) * smooth01((edge - 0.45) / 0.5) * (1 - smooth01((edge - 0.97) / 0.03));
    const y = sgn * hh * (fill * (1 + 0.08 * Math.sin(u * 4.1 + w * 2.3)) + crease * fill * 0.6) + sgn * 0.0015;
    return add(add(add(c, ax[0], x), ax[1], y), ax[2], z);
  };
  for (const sgn of [1, -1]) {
    grid(out, 26, 26, (a, b) => ({ p: at(a * 2 - 1, b * 2 - 1, sgn), part, s: a, t: b }), sgn > 0 ? ax[1] : scale(ax[1], -1));
  }
  // The welt round its seam.
  const ring = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 4;
    const k = Math.floor(t);
    const f = t - k;
    const [u, w] = [[-1 + 2 * f, -1], [1, -1 + 2 * f], [1 - 2 * f, 1], [-1, 1 - 2 * f]][k];
    ring.push(at(u * 0.995, w * 0.995, 0));
  }
  sweep(out, ring, Math.min(hh * 0.12, 0.006), part, { closed: true, seg: 5 });
}

const smooth01 = x => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * A hardback standing on a shelf: its page block (paper, its edges the
 * fine lines of its leaves), the boards a few millimetres proud of it top,
 * bottom and fore-edge, the spine rounded over its back (toward +ax[2]),
 * its own cloth colour and a title band. c its middle; t, h, d its half
 * thickness, height and depth along ax.
 */
export function book(out, c, ax, t, h, d, part) {
  const at = (x, y, z) => add(add(add(c, ax[0], x), ax[1], y), ax[2], z);
  const board = Math.min(0.0018, t * 0.15);
  // The page block, set in from the boards' edges.
  obox(out, at(0, 0, -0.0035), [t - board, h - 0.003, d - 0.004], P.pages, ax);
  // The boards, either side.
  for (const sx of [-1, 1]) obox(out, at(sx * (t - board / 2), 0, -0.0015), [board / 2, h, d - 0.0015], part, ax);
  // The spine: rounded over the back, a little proud of the boards (t runs
  // up it 0 … 1, s across it, for its gilt and title, houseShader.js), and
  // the headcaps over its ends.
  const sp = (u, w) => at((t + 0.0004) * Math.sin((u - 0.5) * Math.PI), h * (w * 2 - 1), d - 0.004 + 0.006 * Math.cos((u - 0.5) * Math.PI));
  // (The spine is its own part, the book's colour: P.spine + its variant.)
  const spine = P.spine + (part - P.book);
  grid(out, 10, 1, (u, w) => ({ p: sp(u, w), part: spine, s: u, t: w }), ax[2]);
  for (const w of [0, 1]) {
    grid(out, 10, 1, (u, k) => ({ p: k ? at(0, h * (w * 2 - 1), d - 0.004) : sp(u, w), part, s: -1, t: -1 }), w ? ax[1] : scale(ax[1], -1));
  }
}

/** A stuffed cushion: soft, piped round its top and bottom seams. */
function cushion(out, f, x, y, z, hw, hh, hd, part, { tilt = 0, yaw = 0, pinch = 0.12, pipe = true, e1 = 0.3, e2 = 0.12 } = {}) {
  const ax = axes(tilt, yaw);
  const w = f.ax;
  // The cushion's own frame: the piece's, turned by its tilt and yaw.
  const turnTo = d => add(add(scale(w[0], d[0]), w[1], d[1]), w[2], d[2]);
  const cax = ax.map(turnTo);
  const c = f.at(x, y, z);
  // (A pillow, pinched to its corners, is sewn as one: pillow().)
  if (pinch > 0.3) return void pillow(out, c, [hw, hh, hd], part, cax);
  soft(out, c, [hw, hh, hd], part, { e1, e2, pinch, ax: cax });
  if (!pipe) return;
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
  // The scatter cushions: (0.4.19) each standing on the seat (0.52), its
  // top leaning back into the back cushions (they leaned forward, sunk
  // into the seat).
  [[-hw + 0.42, 0.3, v(P.cushion, 0.15), 0.25, 0.3], [-hw + 0.78, -0.2, v(P.cushion, 0.6), 0.22, 0.36], [hw - 0.5, 0.25, v(P.cushion, 0.35), 0.24, 0.26]].forEach(([x, ty, part, s, lean]) =>
    cushion(out, f, x, 0.52 + s * 0.95 * Math.cos(lean) - 0.015, 0.43 + 0.03 * (lean - 0.3), s, 0.06, s * 0.95, part, { tilt: Math.PI / 2 + lean, yaw: ty, pinch: 0.55, e1: 0.75, e2: 0.32 }),
  );
  // The throw: a folded blanket hanging over the right arm. (0.4.19)
  // Shaped round the arm's own section (its faces at tx ± 0.1, its top
  // 0.66, corners rounded) with a centimetre's clearance, and as thick as
  // a wool throw folded (two faces 8 mm apart, the hems rolled): it lay on
  // the arm's face, which broke through it.
  const tx = hw - 0.1;
  const cl = 0.012;
  const R = 0.05;
  const legs = [[tx + 0.1 + cl, 0.2], [tx + 0.1 + cl, 0.66 - R], [tx - 0.1 - cl, 0.66 - R], [tx - 0.1 - cl, 0.53]];
  // Along the section: down the outer leg, over two rounded corners and the
  // top, down the inner side to rest on the seat.
  const L1 = legs[1][1] - legs[0][1];
  const arc = (Math.PI / 2) * (R + cl);
  const flat = 0.2 - 2 * R;
  const L3 = legs[2][1] - legs[3][1];
  const total = L1 + 2 * arc + flat + L3;
  const section = t => {
    let d = t * total;
    if (d < L1) return [[tx + 0.1 + cl, 0.2 + d], [1, 0]];
    d -= L1;
    if (d < arc) {
      const a = (d / arc) * (Math.PI / 2);
      return [[tx + 0.1 - R + Math.cos(a) * (R + cl), 0.66 - R + Math.sin(a) * (R + cl)], [Math.cos(a), Math.sin(a)]];
    }
    d -= arc;
    if (d < flat) return [[tx + 0.1 - R - d, 0.66 + cl], [0, 1]];
    d -= flat;
    if (d < arc) {
      const a = Math.PI / 2 + (d / arc) * (Math.PI / 2);
      return [[tx - 0.1 + R + Math.cos(a) * (R + cl), 0.66 - R + Math.sin(a) * (R + cl)], [Math.cos(a), Math.sin(a)]];
    }
    d -= arc;
    return [[tx - 0.1 - cl, 0.66 - R - d], [-1, 0]];
  };
  const TH = 0.008;
  // In five pieces (the sides, the corners, the top), each faced its own
  // way out from the arm, so no normal turns inside out.
  const cuts = [0, L1, L1 + arc, L1 + arc + flat, L1 + 2 * arc + flat, total].map(d => d / total);
  for (const face of [1, -1]) {
    for (let k = 0; k < 5; k++) {
      const [w0, w1] = [cuts[k], cuts[k + 1]];
      const [, [mx, my]] = section((w0 + w1) / 2);
      const outward = add(scale(f.ax[0], mx), f.ax[1], my);
      grid(out, 12, Math.max(2, Math.round((w1 - w0) * 40)), (u, ww) => {
        const w = w0 + (w1 - w0) * ww;
        const z = 0.25 + u * 0.5;
        const [[x, y], [nx, ny]] = section(w);
        // Its folds: soft ripples down its fall, more toward the hems.
        const ripple = 0.006 * Math.sin(u * 19 + w * 7) * (0.4 + 0.6 * Math.abs(w * 2 - 1));
        const o = (face > 0 ? TH : 0) + ripple;
        return { p: f.at(x + nx * o, y + ny * o, z), part: v(P.fabric, 0.45), s: u, t: w };
      }, face > 0 ? outward : scale(outward, -1));
    }
  }
  // The hems, rolled.
  for (const w of [0, 1]) {
    const [[x, y], [nx, ny]] = section(w);
    tube(out, f.at(x + nx * TH / 2, y + ny * TH / 2, 0.25), f.at(x + nx * TH / 2, y + ny * TH / 2, 0.75), TH / 2 + 0.001, v(P.fabric, 0.45), 6);
  }
  for (const u of [0, 1]) {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const [[x, y], [nx, ny]] = section(k / 24);
      pts.push(f.at(x + nx * TH / 2, y + ny * TH / 2, 0.25 + u * 0.5));
    }
    sweep(out, pts, TH / 2 + 0.001, v(P.fabric, 0.45), { seg: 6 });
  }
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
  // (0.4.19) Standing on the seat, leaning back into the back cushion.
  cushion(out, f, 0.06, 0.45 + 0.19 * Math.cos(0.35) - 0.01, -0.19, 0.2, 0.05, 0.19, v(P.cushion, 0.15), { tilt: Math.PI / 2 + 0.35, yaw: 0.25, pinch: 0.55, e1: 0.75, e2: 0.32 });
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

/** A strip of thin boards along a polyline (a bent plywood part): each a
 * box from one point to the next, `wide` across (along `across`), `thick`
 * through. */
function strip(out, pts, across, wide, thick, part) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    const ay = d.map(x => x / len);
    const ax0 = across;
    const az = [ax0[1] * ay[2] - ax0[2] * ay[1], ax0[2] * ay[0] - ax0[0] * ay[2], ax0[0] * ay[1] - ax0[1] * ay[0]];
    obox(out, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [wide / 2, len / 2 + 0.002, thick / 2], part, [ax0, ay, az]);
  }
}

/**
 * A dining chair at c, facing yaw, after Wegner's wishbone: solid walnut,
 * the back legs curving up and back to meet a steam-bent top rail that
 * sweeps round the sitter into the arms; a Y-shaped splat of bent plywood
 * from the seat's back rail up to the rail; turned front legs; a seat of
 * woven paper cord on round rails, dished a little where it's sat in.
 */
export function chair(out, c, yaw) {
  const f = frame(c, yaw);
  const W = v(P.walnut, 0.2);
  const seatY = 0.43;
  for (const sx of [-1, 1]) {
    // The front legs: turned, tapering to the floor.
    const foot = f.at(sx * 0.24, 0, 0.225);
    const top = f.at(sx * 0.225, seatY + 0.01, 0.2);
    const ax = [top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]];
    const len = Math.hypot(...ax);
    lathe(out, foot, ax.map(x => x / len), [[0, 0], [0.012, 0], [0.018, len * 0.9], [0.017, len], [0, len]], W, 12);
    // The back legs: up from the floor, raked, into the rail.
    sweep(out, [f.at(sx * 0.235, 0, -0.25), f.at(sx * 0.222, 0.2, -0.215), f.at(sx * 0.215, seatY, -0.2), f.at(sx * 0.218, 0.58, -0.21), f.at(sx * 0.225, 0.7, -0.23)], 0.016, W, { seg: 10 });
  }
  // The steam-bent top rail: round the back, forward into the arms.
  const rail = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = Math.PI * (t - 0.5) * 1.15;
    rail.push(f.at(Math.sin(a) * 0.255, 0.71 - 0.02 * Math.abs(Math.sin(a)) ** 3, -0.33 * Math.cos(a) + 0.06 * Math.abs(Math.sin(a)) ** 4));
  }
  sweep(out, rail, 0.018, W, { seg: 10 });
  // The seat's round rails, and the cord woven across them.
  const corners = [f.at(-0.225, seatY, 0.2), f.at(0.225, seatY, 0.2), f.at(0.215, seatY, -0.2), f.at(-0.215, seatY, -0.2)];
  for (let k = 0; k < 4; k++) tube(out, corners[k], corners[(k + 1) % 4], 0.014, W, 8);
  grid(out, 12, 12, (u, w) => {
    const xw = 0.225 - 0.01 * w;
    const x = (u * 2 - 1) * xw;
    const z = 0.2 - 0.4 * w;
    const sag = 0.018 * Math.sin(Math.PI * u) * Math.sin(Math.PI * w);
    return { p: f.at(x, seatY + 0.012 - sag, z), part: P.cord, s: u, t: w };
  });
  // The Y: a stem from the seat's back rail, parting into two arms that
  // meet the rail either side of its middle.
  const stem = [f.at(0, seatY + 0.01, -0.205), f.at(0, 0.52, -0.25), f.at(0, 0.58, -0.28)];
  strip(out, stem, f.ax[0], 0.07, 0.012, W);
  for (const sx of [-1, 1]) strip(out, [f.at(0, 0.58, -0.28), f.at(sx * 0.05, 0.65, -0.305), f.at(sx * 0.1, 0.705, -0.315)], f.ax[0], 0.04, 0.012, W);
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

/**
 * A dining table at c: a Calacatta marble top, its edge eased, on two
 * sculpted walnut pedestals, oval in plan, squared off top and bottom.
 */
export function marbleTable(out, c, yaw, { w = 2.6, d = 1.05, h = 0.75 } = {}) {
  const f = frame(c, yaw);
  slab(out, f, 0, h - 0.016, 0, w / 2, 0.016, d / 2, v(P.marble, 0));
  for (const sx of [-1, 1]) {
    soft(out, f.at(sx * (w / 2 - 0.55), (h - 0.03) / 2, 0), [0.13, (h - 0.03) / 2, 0.3], v(P.walnut, 0), { e1: 0.08, e2: 0.55, ax: f.ax, nu: 36, nv: 10 });
  }
}

/** A low coffee table: a thick walnut slab on two panel ends. */
export function coffeeTable(out, c, yaw) {
  const f = frame(c, yaw);
  slab(out, f, 0, 0.36, 0, 0.65, 0.03, 0.4, v(P.walnut, 0));
  for (const sx of [-1, 1]) obox(out, f.at(sx * 0.5, 0.165, 0), [0.025, 0.165, 0.36], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0.09, 0), [0.475, 0.012, 0.32], v(P.walnut, 0), f.ax);
  // On it: books, a bowl, a candle.
  for (const [y, hw, hd, k, ty] of [[0.405, 0.17, 0.12, 0.1, 0.1], [0.432, 0.14, 0.1, 0.6, -0.05]]) {
    const a = axes(0, yaw + ty);
    book(out, f.at(-0.3, y, 0.05), [a[1], a[2], a[0]], 0.013, hd, hw, v(P.book, k));
  }
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

/** (0.4.14) A cabinet door's thickness, and how far it stands off the
 * carcass on its hinges (metres): real ones, not a skin on it, so the two
 * never share a plane (which flickers from across the garden). */
const DOOR = 0.019;
const HINGE = 0.002;
/** The middle (z) of a door on a carcass whose front is at `z`. */
const doorZ = z => z + HINGE + DOOR / 2;
/** (0.4.18) A brass bar pull on a front in furniture frame `f`, from
 * (x, y) to (x, y) on its face at depth `z` (barPull, meshKit.js). */
const pullOn = (out, f, [ax0, ay0], [ax1, ay1], z) => barPull(out, f.at(ax0, ay0, z), f.at(ax1, ay1, z), f.ax[2], P.brass);

/** A TV on a wall at c (its screen's middle), facing yaw: a thin black
 * body, a glass screen. */
export function tv(out, c, yaw, { w = 1.72, h = 0.98 } = {}) {
  const f = frame(c, yaw);
  // (0.4.14) The glass set in the bezel, 2 mm behind its lip and 6 mm
  // clear of the body (they shared a plane within a millimetre, which
  // flickers from across the garden).
  const bz = 0.006;
  obox(out, f.at(0, 0, -0.023), [w / 2, h / 2, 0.017], P.steel, f.ax);
  for (const s of [-1, 1]) {
    obox(out, f.at(s * (w / 2 - bz / 2), 0, -0.002), [bz / 2, h / 2, 0.004], P.steel, f.ax);
    obox(out, f.at(0, s * (h / 2 - bz / 2), -0.002), [w / 2 - bz, bz / 2, 0.004], P.steel, f.ax);
  }
  obox(out, f.at(0, 0, -0.003), [w / 2 - bz - 0.0005, h / 2 - bz - 0.0005, 0.003], P.screen, f.ax);
}

/** A low media console against a wall: walnut, three fronts, a plinth. */
export function console_(out, c, yaw, w = 2.2) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.27, 0), [w / 2, 0.2, 0.22], v(P.walnut, 0), f.ax);
  for (let k = 0; k < 3; k++) obox(out, f.at(-w / 2 + (w / 3) * (k + 0.5), 0.27, doorZ(0.22)), [w / 6 - 0.006, 0.19, DOOR / 2], v(P.walnut, 0.5), f.ax);
  obox(out, f.at(0, 0.035, -0.02), [w / 2 - 0.05, 0.035, 0.18], P.steel, f.ax);
}

/**
 * A bed, its middle against a wall at c, facing yaw, as a good hotel's is:
 * a wall panel behind it, channel-tufted, running behind the nightstands;
 * an upholstered base floating on a recessed black plinth; a tailored
 * mattress, welted; a duvet with its thickness, draped over the sides and
 * the foot and turned back at the top; a wool throw across
 * the foot; pillows in three sizes, euro squares upright against the panel;
 * floating walnut nightstands on the panel; glass globe pendants on cords
 * from the ceiling at `ceil` either side.
 */
export function bed(out, c, yaw, { w = 1.8, l = 2.1, ceil = 3.2, stands = [true, true] } = {}) {
  const f = frame(c, yaw);
  const hw = w / 2;
  const panel = w + 1.5;
  // The panel: vertical channels of upholstery, side by side.
  const n = Math.round(panel / 0.15);
  const cw = panel / n;
  for (let k = 0; k < n; k++) soft(out, f.at(-panel / 2 + cw * (k + 0.5), 0.7, 0.05), [cw / 2 - 0.002, 0.62, 0.045], v(P.fabric, 0.4), { e1: 0.12, e2: 0.7, ax: f.ax, nu: 16, nv: 6 });
  obox(out, f.at(0, 0.04, 0.05), [panel / 2, 0.04, 0.045], P.steel, f.ax);
  // The base on its shadow-gap plinth.
  obox(out, f.at(0, 0.045, 0.1 + l / 2), [hw - 0.1, 0.045, l / 2 - 0.1], P.steel, f.ax);
  soft(out, f.at(0, 0.21, 0.1 + l / 2), [hw + 0.03, 0.12, l / 2 + 0.02], v(P.fabric, 0.4), { e1: 0.1, e2: 0.05, ax: f.ax, nu: 40, nv: 10 });
  // The mattress, tailored, welted top and bottom.
  cushion(out, f, 0, 0.46, 0.1 + l / 2, hw - 0.01, 0.125, l / 2 - 0.02, v(P.fabric, 0.9), { e1: 0.14, e2: 0.05, pinch: 0.02 });
  // The duvet: a quilt 4 cm thick, its upper face and its lower, draped
  // over the mattress from below the pillows, hanging over its sides and
  // foot; a gentle crumple across it.
  const top = 0.6;
  const zs = 0.78;
  const ze = 0.1 + l;
  const drape = (u, w2, below) => {
    let x = -hw - 0.24 + u * (w + 0.48);
    let z = zs + w2 * (ze - zs + 0.24);
    const crumple = 0.012 * Math.sin(x * 7 + z * 3) * Math.sin(z * 6 + x) + 0.006 * Math.sin(x * 19 + z * 13);
    let y = top + crumple - (below ? 0.04 : 0);
    const ox = Math.max(-hw - x, x - hw, 0);
    const oz = Math.max(z - ze, 0);
    const o = Math.max(ox, oz);
    if (o > 0) {
      const roll = 1 - Math.exp(-o * 30);
      y -= o * 1.55 + 0.01 * Math.sin(z * 5 + x * 4) * Math.min(1, o * 6);
      const outBy = 0.045 * roll - (below ? 0.04 : 0);
      if (ox > 0) x = Math.sign(x) * (hw + outBy);
      if (oz > 0) z = ze + outBy;
    }
    return [x, y, z];
  };
  for (const below of [false, true]) {
    grid(out, 44, 38, (u, w2) => ({ p: f.at(...drape(u, w2, below)), part: v(P.fabric, 0.85), s: u, t: w2 }), below ? scale(f.ax[1], -1) : f.ax[1]);
  }
  // Turned back at the top.
  cushion(out, f, 0, top + 0.02, zs + 0.06, hw + 0.03, 0.035, 0.09, v(P.fabric, 0.85), { e1: 0.6, e2: 0.12, pipe: false });
  // The throw across the foot, in a wool of its own.
  grid(out, 30, 16, (u, w2) => {
    let x = -hw - 0.2 + u * (w + 0.4);
    const z = ze - 0.55 + w2 * 0.42;
    // (Laid over the duvet's crumple, never into it.)
    let y = top + 0.04 + 0.004 * Math.sin(x * 11);
    const ox = Math.max(-hw - x, x - hw, 0);
    if (ox > 0) {
      y -= ox * 1.55;
      x = Math.sign(x) * (hw + 0.075 * (1 - Math.exp(-ox * 30)));
    }
    return { p: f.at(x, y, z), part: v(P.fabric, 0.45), s: u, t: w2 };
  });
  // The pillows: euro squares upright, sleeping pillows before them, a
  // cushion. (0.4.19) Each rests where it's held: its foot on the mattress
  // (0.585), its top leaning back against what's behind it, the euros the
  // panel, the sleeping pillows the euros, the cushion the sleeping
  // pillows. (They leaned forward, tops toward the foot, their lower edges
  // sunk into the mattress: the owner's "downward shift".) `lean`: off
  // upright toward the panel; tilt π/2 + lean stands a pillow so.
  const bedTop = 0.585;
  const rest = (lean, half, sink) => [bedTop + half * Math.cos(lean) - sink, Math.PI / 2 + lean];
  for (const px of [-hw / 2, hw / 2]) {
    const [ey, et] = rest(0.28, 0.3, 0.02);
    cushion(out, f, px, ey, 0.19, hw / 2 - 0.04, 0.07, 0.3, v(P.cushion, 0.45), { tilt: et, pinch: 0.45, e1: 0.72, e2: 0.28 });
    const [sy, st] = rest(0.96, 0.2, -0.035);
    cushion(out, f, px * 0.98, sy, 0.43, hw / 2 - 0.06, 0.075, 0.2, v(P.cushion, 0.0), { tilt: st, yaw: px > 0 ? -0.03 : 0.03, pinch: 0.5, e1: 0.75, e2: 0.3 });
  }
  const [cy, ct] = rest(0.62, 0.11, -0.02);
  cushion(out, f, 0.02, cy, 0.56, 0.24, 0.06, 0.11, v(P.cushion, 0.15), { tilt: ct, yaw: 0.06, pinch: 0.5, e1: 0.8, e2: 0.35 });
  // The nightstands, floating on the panel, a drawer each; the pendants.
  [-1, 1].forEach((sx, k) => {
    const x = sx * (hw + 0.36);
    if (stands[k]) {
      obox(out, f.at(x, 0.48, 0.3), [0.25, 0.09, 0.2], v(P.walnut, 0), f.ax);
      obox(out, f.at(x, 0.48, doorZ(0.5)), [0.235, 0.075, DOOR / 2], v(P.walnut, 0.5), f.ax);
      pullOn(out, f, [x - 0.07, 0.48], [x + 0.07, 0.48], doorZ(0.5) + DOOR / 2);
      lathe(out, f.at(x - 0.1, 0.57, 0.28), [0, 1, 0], [[0, 0], [0.05, 0], [0.05, 0.02], [0, 0.02]], v(P.book, 0.3), 12);
    }
    const g = f.at(x, 1.22, 0.3);
    tube(out, add(g, [0, 0.12, 0]), [g[0], ceil, g[2]], 0.002, P.steel, 6);
    lathe(out, add(g, [0, 0.11, 0]), [0, 1, 0], [[0.02, 0], [0.02, 0.03]], P.brass, 10);
    soft(out, g, [0.11, 0.11, 0.11], P.lamp, { e1: 1, e2: 1, nu: 20, nv: 12 });
  });
}

/** A bedside table with a drawer, on steel legs. */
export function bedside(out, c, yaw) {
  const f = frame(c, yaw);
  obox(out, f.at(0, 0.34, 0), [0.25, 0.16, 0.21], v(P.walnut, 0), f.ax);
  obox(out, f.at(0, 0.34, doorZ(0.21)), [0.235, 0.145, DOOR / 2], v(P.walnut, 0.5), f.ax);
  pullOn(out, f, [-0.06, 0.38], [0.06, 0.38], doorZ(0.21) + DOOR / 2);
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
      obox(out, f.at(x, y, doorZ(0.24)), [w / 4 - 0.008, 0.118, DOOR / 2], v(P.walnut, 0.5), f.ax);
      pullOn(out, f, [x - 0.07, y + 0.06], [x + 0.07, y + 0.06], doorZ(0.24) + DOOR / 2);
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
    obox(out, f.at(x, 0.48, doorZ(0.6)), [w / n / 2 - 0.004, 0.375, DOOR / 2], v(P.walnut, 0.6), f.ax);
    pullOn(out, f, [x - Math.min(0.16, w / n / 2 - 0.06), 0.8], [x + Math.min(0.16, w / n / 2 - 0.06), 0.8], doorZ(0.6) + DOOR / 2);
  }
  soft(out, f.at(0, 0.88, 0.31), [w / 2 + 0.01, 0.02, 0.32], v(P.marble, 0), { e1: 0.12, e2: 0.02, ax: f.ax, nu: 40, nv: 6 });
  // The sink, sunk in the top, and its tap.
  // (0.4.14) Its rim 5 mm proud of the stone, the basin's top under it.
  obox(out, f.at(-w / 4, 0.78, 0.31), [0.38, 0.1, 0.2], v(P.steel, 0.5), f.ax);
  obox(out, f.at(-w / 4, 0.9025, 0.31), [0.36, 0.0025, 0.18], v(P.steel, 0.6), f.ax);
  sweep(out, [f.at(-w / 4, 0.9, 0.05), f.at(-w / 4, 1.2, 0.05), f.at(-w / 4, 1.26, 0.15), f.at(-w / 4, 1.2, 0.24)], 0.012, v(P.steel, 0.5), { seg: 8 });
  // The hob, and the extractor over it.
  obox(out, f.at(w / 4, 0.904, 0.3), [0.38, 0.004, 0.26], P.screen, f.ax);
  for (const [hx, hz, r] of [[-0.18, -0.08, 0.1], [0.18, -0.08, 0.08], [-0.18, 0.12, 0.08], [0.18, 0.12, 0.1]]) {
    sweep(out, Array.from({ length: 21 }, (_, i) => f.at(w / 4 + hx + Math.cos((i / 20) * Math.PI * 2) * r, 0.911, 0.3 + hz + Math.sin((i / 20) * Math.PI * 2) * r)), 0.002, v(P.steel, 0.6), { closed: true, seg: 4 });
  }
  obox(out, f.at(w / 4, 1.9, 0.25), [0.45, 0.04, 0.25], v(P.steel, 0.5), f.ax);
  // Wall units over the sink's side.
  obox(out, f.at(-w / 4, 1.85, 0.18), [w / 4 - 0.05, 0.4, 0.18], v(P.walnut, 0), f.ax);
  for (let k = 0; k < 3; k++) obox(out, f.at(-w / 2 + 0.05 + (w / 2 - 0.1) * ((k + 0.5) / 3), 1.85, doorZ(0.36)), [(w / 2 - 0.1) / 6 - 0.004, 0.39, DOOR / 2], v(P.walnut, 0.5), f.ax);
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
  for (let k = 0; k < 4; k++) obox(out, f.at(-w / 2 + 0.04 + ((w - 0.08) * (k + 0.5)) / 4, 0.48, doorZ(d / 2 - 0.08)), [(w - 0.08) / 8 - 0.004, 0.37, DOOR / 2], v(P.walnut, 0.5), f.ax);
  obox(out, f.at(0, 0.91, 0), [w / 2, 0.025, d / 2], v(P.marble, 0), f.ax);
  for (const sx of [-1, 1]) obox(out, f.at(sx * (w / 2 - 0.025), 0.445, 0), [0.025, 0.445, d / 2], v(P.marble, 0), f.ax);
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
    obox(out, f.at(-w / 2 + (w / n) * (k + 0.5), h / 2, doorZ(0.6)), [w / n / 2 - 0.004, h / 2 - 0.01, DOOR / 2], v(P.walnut, 0.6), f.ax);
    const px = -w / 2 + (w / n) * (k + 0.5) + (k % 2 ? -1 : 1) * (w / n / 2 - 0.05);
    pullOn(out, f, [px, h * 0.48 - 0.3], [px, h * 0.48 + 0.3], doorZ(0.6) + DOOR / 2);
  }
}

/**
 * A bookcase against a wall: solid walnut, a grid of compartments (bays
 * ~0.8 m wide between full-height uprights, shelves at their own heights per
 * bay), a plinth and a top; most compartments filled with books standing
 * (some leaning on a bookend), a few with books laid flat in a stack, now
 * and then one left for a single thing (a bowl, a small sculpture, a
 * framed print propped).
 */
export function bookcase(out, c, yaw, w, h, seed = 1) {
  const f = frame(c, yaw);
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const W = v(P.walnut, 0.25);
  const D = 0.36;
  const t = 0.025;
  obox(out, f.at(0, h / 2, 0.01), [w / 2, h / 2, 0.01], W, f.ax);
  obox(out, f.at(0, 0.04, D / 2), [w / 2, 0.04, D / 2 - 0.02], W, f.ax);
  obox(out, f.at(0, h - t / 2, D / 2), [w / 2 + 0.01, t / 2, D / 2 + 0.005], W, f.ax);
  const bays = Math.max(1, Math.round(w / 0.8));
  const bw = w / bays;
  for (let k = 0; k <= bays; k++) obox(out, f.at(-w / 2 + k * bw, h / 2, D / 2), [t / 2, h / 2, D / 2], W, f.ax);
  let things = 0;
  for (let k = 0; k < bays; k++) {
    const x0 = -w / 2 + k * bw + t / 2;
    const x1 = x0 + bw - t;
    // This bay's shelves: 3 to 5, offset bay to bay.
    const n = 4 + (k % 2) + (rnd() < 0.3 ? -1 : 0);
    const ys = [0.08];
    for (let r = 1; r < n; r++) ys.push(0.08 + ((h - 0.08 - t) * r) / n + (k % 2 ? 0.06 : -0.04));
    ys.push(h - t);
    for (let r = 1; r < ys.length - 1; r++) obox(out, f.at((x0 + x1) / 2, ys[r], D / 2), [(x1 - x0) / 2, t / 2, D / 2 - 0.005], W, f.ax);
    for (let r = 0; r < ys.length - 1; r++) {
      const y = ys[r] + t / 2;
      const room = ys[r + 1] - ys[r] - t;
      const roll = rnd();
      if (roll < 0.12 && things < Math.ceil(bays * 0.8)) {
        // One thing alone in it.
        things++;
        const cx = (x0 + x1) / 2 + (rnd() - 0.5) * 0.2;
        const kind = rnd();
        if (kind < 0.4) lathe(out, f.at(cx, y, 0.18), [0, 1, 0], [[0, 0], [0.07, 0], [0.13, 0.06], [0.135, 0.075], [0.125, 0.075], [0.06, 0.02], [0, 0.02]], v(P.ceramic, 0.5), 22);
        else if (kind < 0.7) {
          soft(out, f.at(cx, y + 0.11, 0.18), [0.05, 0.11, 0.05], v(P.ceramic, 0.8), { e1: 0.6, e2: 1, ax: f.ax, nu: 16, nv: 10 });
        } else picture(out, f.at(cx, y + Math.min(0.17, room / 2), 0.05), yaw, 0.26, Math.min(0.32, room - 0.04), rnd());
        continue;
      }
      if (roll < 0.3) {
        // A stack laid flat, something small on it.
        let sy = y;
        const sx = x0 + 0.08 + rnd() * (x1 - x0 - 0.4);
        for (let b = 0; b < 4 + Math.floor(rnd() * 4); b++) {
          const th = 0.025 + 0.02 * rnd();
          const fa = axes(0, yaw + (rnd() - 0.5) * 0.12);
          book(out, f.at(sx + 0.13 + (rnd() - 0.5) * 0.02, sy + th / 2, 0.19), [fa[1], fa[0], fa[2]], th / 2, 0.12 + 0.04 * rnd(), 0.1 + 0.03 * rnd(), v(P.book, rnd()));
          sy += th;
        }
        // And standing books beside it.
        let x = sx + 0.32;
        while (x < x1 - 0.04) {
          const bwid = 0.02 + 0.03 * rnd();
          const bh = Math.min(room - 0.02, 0.2 + 0.1 * rnd());
          book(out, f.at(x + bwid / 2, y + bh / 2, 0.19), f.ax, bwid / 2, bh / 2, 0.1 + 0.04 * rnd(), v(P.book, rnd()));
          x += bwid + 0.002;
        }
        continue;
      }
      // Books standing, filling it, sometimes short of the end with the
      // last few leaning.
      let x = x0 + 0.005;
      const stop = roll < 0.5 ? x1 - 0.12 - rnd() * 0.2 : x1 - 0.005;
      while (x < stop) {
        const bwid = 0.018 + 0.032 * rnd();
        const bh = Math.min(room - 0.02, 0.19 + 0.13 * rnd());
        book(out, f.at(x + bwid / 2, y + bh / 2, 0.19), f.ax, bwid / 2, bh / 2, 0.1 + 0.04 * rnd(), v(P.book, rnd()));
        x += bwid + 0.0015;
      }
      if (roll < 0.5) {
        for (let b = 0; b < 3; b++) {
          const bh = Math.min(room - 0.04, 0.22 + 0.06 * rnd());
          const lean = 0.22 + 0.06 * b;
          const cx = x + 0.05 + b * 0.03 + Math.sin(lean) * bh / 2;
          book(out, f.at(cx, y + (Math.cos(lean) * bh) / 2, 0.19), [f.ax[0].map((q, i) => q * Math.cos(lean) - f.ax[1][i] * Math.sin(lean)), f.ax[1].map((q, i) => q * Math.cos(lean) + f.ax[0][i] * Math.sin(lean)), f.ax[2]], 0.014, bh / 2, 0.11, v(P.book, rnd()));
        }
      }
    }
  }
}

/** A picture on a wall at c, facing yaw: a walnut frame, a mount, a print. */
export function picture(out, c, yaw, w, h, variant = 0) {
  const f = frame(c, yaw);
  // (0.4.14) Built as a frame is: a walnut moulding 3 cm deep round a
  // back board, the mount laid in it and the print on the mount, each
  // clear of the next by millimetres (not half of one, which flickers from
  // across the garden).
  const m = 0.03;
  obox(out, f.at(0, 0, 0.004), [w / 2 - 0.002, h / 2 - 0.002, 0.004], v(P.walnut, 0), f.ax);
  for (const s of [-1, 1]) {
    obox(out, f.at(s * (w / 2 - m / 2), 0, 0.015), [m / 2, h / 2, 0.015], v(P.walnut, 0), f.ax);
    obox(out, f.at(0, s * (h / 2 - m / 2), 0.015), [w / 2 - m, m / 2, 0.015], v(P.walnut, 0), f.ax);
  }
  obox(out, f.at(0, 0, 0.012), [w / 2 - m - 0.001, h / 2 - m - 0.001, 0.004], P.paper, f.ax);
  obox(out, f.at(0, 0, 0.0195), [w / 2 - 0.1, h / 2 - 0.1, 0.0015], v(P.art, variant), f.ax);
}

/** (0.4.18) Every mirror the mesh has (its glass's middle and its facing),
 * for its probe (mirrorProbe.js); houseLayout empties it first. */
export const MIRRORS = [];

/** A mirror on a wall at c, facing yaw, in a thin brass frame. */
export function mirror(out, c, yaw, w, h) {
  const f = frame(c, yaw);
  MIRRORS.push({ c: f.at(0, 0, 0.017), n: f.ax[2] });
  // (0.4.14) The glass set in the frame's rebate, behind its lip.
  const m = 0.015;
  obox(out, f.at(0, 0, 0.004), [w / 2 - 0.002, h / 2 - 0.002, 0.004], P.brass, f.ax);
  for (const s of [-1, 1]) {
    obox(out, f.at(s * (w / 2 - m / 2), 0, 0.012), [m / 2, h / 2, 0.012], P.brass, f.ax);
    obox(out, f.at(0, s * (h / 2 - m / 2), 0.012), [w / 2 - m, m / 2, 0.012], P.brass, f.ax);
  }
  obox(out, f.at(0, 0, 0.014), [w / 2 - m - 0.001, h / 2 - m - 0.001, 0.003], P.mirror, f.ax);
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
export function door(out, hinge, dir, y0, { w = 0.9, h = 2.2, open = 0.6, part = v(P.walnut, 0.6), thick = 0.04 } = {}) {
  const yaw = Math.atan2(dir[0], dir[1]) - Math.PI / 2 + open;
  const ax = axes(0, yaw);
  // Hung a little in from the jamb (its gap), and a little short of the
  // floor and the head, as a door is.
  const at = [hinge[0] + dir[0] * 0.012, hinge[1] + dir[1] * 0.012];
  w -= 0.02;
  h -= 0.012;
  const c = add([at[0], y0 + 0.006 + h / 2, at[1]], ax[0], w / 2);
  obox(out, c, [w / 2, h / 2, thick / 2], part, ax);
  // (0.4.18) A lever on a rose each side, 7 cm in from the free edge at
  // a metre up, reaching toward the hinge (it was a rod floating 3 cm off
  // the leaf).
  for (const sz of [-1, 1]) {
    const hc = add(add(add(c, ax[0], w / 2 - 0.07), ax[2], sz * (thick / 2)), [0, 1.0 - (0.006 + h / 2), 0]);
    lever(out, hc, scale(ax[2], sz), scale(ax[0], -1), P.brass);
  }
}
