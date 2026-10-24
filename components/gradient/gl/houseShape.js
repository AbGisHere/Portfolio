/**
 * (0.4.0) The house on the hill behind the desk and the pool on its terrace
 * (ROADMAP.md, "0.4 — contact: the house and the pool"): where each part
 * stands and how big, in metres from the desk's centre (y up, z toward the
 * mountains, so the house is at −z, its front looking back at them over the
 * desk). The camera's last arcs (deskCamera.js CONTACT_PATH) are laid out
 * from these.
 *
 * (0.4.2) Built as a real building: walls with thickness and openings (so
 * the glass sits back in reveals), rooms inside them furnished and lit, a
 * terrace with frameless glass, loungers and a tree in a pot, a pool with
 * steps down into it. houseMesh.js meshes it; houseShader.js lights it;
 * houseGlass.js draws its glass and water.
 */

/**
 * The materials (houseShader.js). A part's number is its material; its
 * fraction, a variant of it (a book's colour, a cushion's).
 */
export const HOUSE_PART = {
  lawn: 0, stone: 1, render: 2, timber: 3, frame: 4, slab: 5, deck: 6, tile: 7, plaster: 8, ceiling: 9,
  oak: 10, fabric: 11, walnut: 12, steel: 13, book: 14, leaf: 15, planter: 16, soil: 17, lamp: 18, cushion: 19, rug: 20, bark: 21, screen: 22, art: 23, ceramic: 24, mirror: 25, brass: 26, clothes: 27, paper: 28, fruit: 29, curtain: 30,
};

/** The mound: its top's middle (x, z), its half-widths (x, z) and height. */
export const MOUND = { at: [0, -72], r: [40, 32], h: 3.2 };

/** The mound's height over the meadow at (x, z): a smooth dome, flat at its
 * foot. */
export function moundY(x, z) {
  const s = Math.hypot((x - MOUND.at[0]) / MOUND.r[0], (z - MOUND.at[1]) / MOUND.r[1]);
  return s < 1 ? MOUND.h * (1 - s * s) ** 2 : 0;
}

/** (0.4.2) The same in GLSL, for the grass that grows on it, and whether a
 * point of ground is under the house's stone base (where none grows). */
export const MOUND_GLSL = `float moundY(vec2 p) {
  float s = length((p - vec2(${MOUND.at[0].toFixed(2)}, ${MOUND.at[1].toFixed(2)})) / vec2(${MOUND.r[0].toFixed(2)}, ${MOUND.r[1].toFixed(2)}));
  return s < 1.0 ? ${MOUND.h.toFixed(3)} * (1.0 - s * s) * (1.0 - s * s) : 0.0;
}
bool underHouse(vec2 p) {
  return p.x > -9.6 && p.x < 9.6 && p.y > -81.1 && p.y < -55.7;
}
`;

/** The ground floor (the stone base's top), the floor-to-floor heights, the
 * terrace (the upper floor). */
export const FLOOR = 3.6;
export const STOREY = 3.6;
export const TERRACE = FLOOR + STOREY;

/** The walls' thickness: render outside, plaster in. */
export const WALL = 0.28;

/** The house's plan (x, z) per floor: the ground floor's box and the upper
 * floor's, set back. */
export const PLAN = {
  ground: { x: [-8, 8], z: [-79, -63] },
  upper: { x: [-8, 8], z: [-79, -71] },
  roof: { x: [-8.9, 8.9], z: [-79.9, -68.6] },
};

/** The pool in the terrace: its water's middle, its size (x, z), depth, and
 * how far the water lies under the coping. */
export const POOL = { at: [0, TERRACE - 0.08, -60.7], w: 9, d: 3.8, deep: 1.1 };

/** The terrace's front edge: it reaches out past the ground floor's glass,
 * the pool in that cantilever, its basin the porch's roof. */
export const EDGE = -58.6;

/** How thick the glass is (metres): every pane, the windows' and the
 * terrace's (houseGlass.js, at its index 1.52). */
export const GLASS_THICK = 0.012;

const CEIL_G = FLOOR + STOREY - 0.35;
const CEIL_U = TERRACE + STOREY - 0.35;

/**
 * The rooms as the light knows them (docs/parts/house.md): [lo, hi, light]
 * boxes, the first that holds a point its room; `light`, where its daylight
 * comes in: 1 the front glass (its lamps' light goes out there too), 2 a
 * window in the back wall, 0 only side slots or none. A room's index + 1 is
 * its zone (0 outside).
 */
export const ZONES = [
  [[4.66, FLOOR, -71.44], [7.72, CEIL_G, -67.56], 0], // 1 the WC
  [[-5.34, FLOOR, -78.72], [1.54, CEIL_G, -73.06], 2], // 2 the study
  [[-7.72, FLOOR, -78.72], [7.72, CEIL_G, -63.28], 1], // 3 the ground floor, open plan
  [[-4.44, TERRACE, -75.74], [2.54, CEIL_U, -71.28], 1], // 4 the main bedroom
  [[-4.44, TERRACE, -77.44], [2.54, CEIL_U, -75.86], 0], // 5 the wardrobe
  [[2.66, TERRACE, -74.94], [7.72, CEIL_U, -71.28], 0], // 6 the en-suite
  [[2.66, TERRACE, -78.72], [7.72, CEIL_U, -75.06], 2], // 7 the guest bedroom
  [[-7.72, TERRACE, -78.72], [7.72, CEIL_U, -71.28], 1], // 8 the landing and the hall
];

/**
 * The lights by night: [x, y, z, radius (m), strength, kind, zone]. Kind 0
 * a lamp (shining every way), 1 a downlight outside (the soffit's, the
 * porch's), 3 one recessed in a room's ceiling (throwing down). Zone:
 * ZONES's, 0 outside.
 */
const down = (zone, ceil, pts, r = 5, k = 0.45) => pts.map(([x, z]) => [x, ceil - 0.05, z, r, k, 3, zone]);
export const HOUSE_LIGHTS = [
  ...down(3, CEIL_G, [[-5.5, -66.0], [-3, -66.0], [-5.5, -69.3], [-3, -69.3], [2.5, -65.5], [2.5, -70.3], [3.4, -73.6], [5.6, -73.6], [3.4, -76.6], [5.6, -76.6], [6.2, -65.0], [-5.8, -74.5], [0, -67.5]]),
  [2.55, FLOOR + 1.8, -67.9, 5, 0.7, 0, 3],
  [4.4, FLOOR + 2.1, -74.9, 5, 0.7, 0, 3],
  [-7.2, FLOOR + 1.55, -70.3, 3.5, 0.7, 0, 3],
  ...down(1, CEIL_G, [[6.2, -69.5]], 4),
  ...down(2, CEIL_G, [[-2, -76]]),
  [-2.75, FLOOR + 1.1, -78.2, 2.5, 0.5, 0, 2],
  ...down(8, CEIL_U, [[-6.1, -73.0], [-6.1, -76.0], [-1, -78.1], [1.5, -78.1]]),
  ...down(4, CEIL_U, [[-2.5, -73.0], [0.8, -73.0], [-1, -74.8]]),
  [-2.45, TERRACE + 0.85, -75.45, 2.5, 0.55, 0, 4],
  [0.55, TERRACE + 0.85, -75.45, 2.5, 0.55, 0, 4],
  ...down(5, CEIL_U, [[-2.5, -76.65], [0.8, -76.65]], 3.5),
  ...down(6, CEIL_U, [[4, -72.6], [6.4, -72.6], [5.2, -74.2]], 4),
  ...down(7, CEIL_U, [[5.2, -76.9]], 4),
  [6.4, TERRACE + 0.85, -78.4, 2.5, 0.5, 0, 7],
  // Two downlights in the porch's ceiling, under the cantilever.
  [-6.2, FLOOR + STOREY - 0.4, -60.8, 4.5, 0.6, 1, 0],
  [6.2, FLOOR + STOREY - 0.4, -60.8, 4.5, 0.6, 1, 0],
  // The soffit's downlights over the terrace.
  ...[-6, -2, 2, 6].map(x => [x, TERRACE + STOREY - 0.42, -69.8, 4.5, 0.55, 1, 0]),
];

/** The bounds the sun's shadow map covers (houseShadow.js): everything the
 * house can shade. */
export const HOUSE_BOUNDS = { lo: [-13, 0, -92], hi: [13, TERRACE + STOREY + 0.6, -50] };
