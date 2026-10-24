/**
 * (0.4.0) The house on the hill behind the desk and the pool on its terrace
 * (ROADMAP.md, "0.4 — contact: the house and the pool"): where each part
 * stands and how big, in metres from the desk's centre (y up, z toward the
 * mountains, so the house is at −z, its front looking back at them over the
 * desk). The camera's last arcs (deskCamera.js CONTACT_PATH) are laid out
 * from these.
 *
 * (0.4.1) Built in 3D (houseShader.js meshes it): a lawn mound rising out of
 * the meadow, a stone base with steps up its front, a glazed ground floor,
 * its roof the terrace with the pool and a steel railing, a smaller upper
 * floor set back with its roof reaching out over the terrace. Modern, white
 * render, timber and dark frames.
 */

/** Which material each part is (houseShader.js). */
export const HOUSE_PART = {
  lawn: 0, stone: 1, render: 2, timber: 3, glass: 4, frame: 5, slab: 6, deck: 7, tile: 8, water: 9, steel: 10, coping: 11,
};

/** The mound: its top's middle (x, z), its half-widths (x, z) and height. */
export const MOUND = { at: [0, -74], r: [34, 28], h: 3.2 };

/** The mound's height over the meadow at (x, z): a smooth dome, flat at its
 * foot. */
export function moundY(x, z) {
  const s = Math.hypot((x - MOUND.at[0]) / MOUND.r[0], (z - MOUND.at[1]) / MOUND.r[1]);
  return s < 1 ? MOUND.h * (1 - s * s) ** 2 : 0;
}

/** The ground floor (the stone base's top) and the terrace, heights. */
export const FLOOR = 3.2;
export const TERRACE = FLOOR + 3.65;

/** The pool in the terrace: its water's middle, its size (x, z) and depth. */
export const POOL = { at: [0, TERRACE - 0.1, -66], w: 9, d: 4, deep: 1.3 };

const B = FLOOR;
const T = TERRACE;
const [px0, px1] = [POOL.at[0] - POOL.w / 2, POOL.at[0] + POOL.w / 2];
const [pz0, pz1] = [POOL.at[2] - POOL.d / 2, POOL.at[2] + POOL.d / 2];
// The coping round the pool, its width.
const CW = 0.35;

/** Glazing across a wall's face at z (facing +z), from x0 to x1, y0 to y1:
 * the glass, its frame and mullions `bay` apart. */
function glazing(out, x0, x1, y0, y1, z, bay) {
  out.push([[x0, y0, z - 0.06], [x1, y1, z - 0.02], 'glass']);
  const n = Math.max(1, Math.round((x1 - x0) / bay));
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    out.push([[x - 0.045, y0, z - 0.06], [x + 0.045, y1, z + 0.03], 'frame']);
  }
  out.push([[x0 - 0.045, y1 - 0.05, z - 0.06], [x1 + 0.045, y1 + 0.05, z + 0.03], 'frame']);
  out.push([[x0 - 0.045, y0 - 0.05, z - 0.06], [x1 + 0.045, y0 + 0.05, z + 0.03], 'frame']);
}

/** The house's boxes: [lo, hi, part]. */
export const HOUSE_BOXES = (() => {
  const out = [];
  // The stone base, half sunk in the mound, its top a paved forecourt.
  out.push([[-9, 0.2, -81], [9, B, -58], 'stone']);
  // Steps down the base's front to the lawn.
  for (let i = 0; i < 10; i++) out.push([[-1.3, 0.2, -58 + i * 0.3], [1.3, B - (i + 1) * 0.18, -58 + (i + 1) * 0.3], 'stone']);
  // The ground floor: render, a timber panel at one end, glass across the
  // rest of its front, and a slit window down each side.
  out.push([[-8, B, -79], [8, B + 3.3, -63], 'render']);
  out.push([[5, B, -63.02], [8, B + 3.3, -62.96], 'timber']);
  glazing(out, -7.2, 5, B + 0.08, B + 3.12, -62.94, 1.53);
  out.push([[7.98, B + 0.5, -73], [8.04, B + 2.9, -66], 'glass']);
  out.push([[-8.04, B + 0.5, -73], [-7.98, B + 2.9, -66], 'glass']);
  // The terrace's slab, round the pool's hole.
  const sy = [B + 3.3, T];
  out.push([[-8.4, sy[0], -79.4], [8.4, sy[1], pz0], 'slab']);
  out.push([[-8.4, sy[0], pz1], [8.4, sy[1], -62.6], 'slab']);
  out.push([[-8.4, sy[0], pz0], [px0, sy[1], pz1], 'slab']);
  out.push([[px1, sy[0], pz0], [8.4, sy[1], pz1], 'slab']);
  // The pool: its tiled basin, and the water a little under the rim.
  const fl = T - POOL.deep;
  out.push([[px0, fl - 0.05, pz0], [px1, fl, pz1], 'tile']);
  out.push([[px0, fl, pz0], [px0 + 0.02, T, pz1], 'tile']);
  out.push([[px1 - 0.02, fl, pz0], [px1, T, pz1], 'tile']);
  out.push([[px0, fl, pz0], [px1, T, pz0 + 0.02], 'tile']);
  out.push([[px0, fl, pz1 - 0.02], [px1, T, pz1], 'tile']);
  out.push([[px0 + 0.02, POOL.at[1] - 0.02, pz0 + 0.02], [px1 - 0.02, POOL.at[1], pz1 - 0.02], 'water']);
  // The coping round it, and the deck's boards round that.
  const dy = [T, T + 0.05];
  out.push([[px0 - CW, dy[0], pz0 - CW], [px1 + CW, dy[1] + 0.01, pz0], 'coping']);
  out.push([[px0 - CW, dy[0], pz1], [px1 + CW, dy[1] + 0.01, pz1 + CW], 'coping']);
  out.push([[px0 - CW, dy[0], pz0], [px0, dy[1] + 0.01, pz1], 'coping']);
  out.push([[px1, dy[0], pz0], [px1 + CW, dy[1] + 0.01, pz1], 'coping']);
  out.push([[-8.4, dy[0], pz1 + CW], [8.4, dy[1], -62.6], 'deck']);
  out.push([[-8.4, dy[0], -71], [8.4, dy[1], pz0 - CW], 'deck']);
  out.push([[-8.4, dy[0], pz0 - CW], [px0 - CW, dy[1], pz1 + CW], 'deck']);
  out.push([[px1 + CW, dy[0], pz0 - CW], [8.4, dy[1], pz1 + CW], 'deck']);
  // The upper floor, set back off the terrace: render, timber, glass.
  out.push([[-8, T, -79], [8, T + 3, -71], 'render']);
  out.push([[3, T, -71.02], [8, T + 3, -70.96], 'timber']);
  glazing(out, -7, 3, T + 0.1, T + 2.8, -70.94, 2);
  // Its roof, reaching out over the terrace.
  out.push([[-8.8, T + 3, -79.8], [8.8, T + 3.3, -69.2], 'slab']);
  return out;
})();

/** The railing round the terrace's open sides: posts, a top rail and two
 * rails under it, as [from, to, radius] (houseShader.js tubes them). */
export const RAILING = (() => {
  const out = [];
  const y0 = T + 0.05;
  const hgt = 1.05;
  const z = -62.75;
  const x = 8.25;
  const run = [[-x, -70.95], [-x, z], [x, z], [x, -70.95]];
  for (let i = 0; i < run.length - 1; i++) {
    const [a, b] = [run[i], run[i + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.round(len / 1.5);
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      const px = a[0] + (b[0] - a[0]) * t;
      const pz = a[1] + (b[1] - a[1]) * t;
      out.push([[px, y0, pz], [px, y0 + hgt, pz], 0.022]);
    }
    out.push([[a[0], y0 + hgt, a[1]], [b[0], y0 + hgt, b[1]], 0.028]);
    for (const h of [0.38, 0.7]) out.push([[a[0], y0 + h, a[1]], [b[0], y0 + h, b[1]], 0.009]);
  }
  return out;
})();

/** What casts the house's shadows (its big boxes: [lo, hi]). */
export const HOUSE_OCCLUDERS = [
  [[-9, 0.2, -81], [9, B, -58]],
  [[-8, B, -79], [8, B + 3.3, -63]],
  // (The slab a little under its top, so the pool's water isn't inside it.)
  [[-8.4, B + 3.3, -79.4], [8.4, T - 0.2, -62.6]],
  [[-8, T, -79], [8, T + 3, -71]],
  [[-8.8, T + 3, -79.8], [8.8, T + 3.3, -69.2]],
];
