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
  oak: 10, fabric: 11, walnut: 12, steel: 13, book: 14, leaf: 15, planter: 16, soil: 17, lamp: 18, cushion: 19, rug: 20, bark: 21, screen: 22, art: 23, ceramic: 24, mirror: 25, brass: 26, clothes: 27, paper: 28, fruit: 29, curtain: 30, marble: 31, cord: 32, pages: 33, spine: 34, rope: 35, paver: 36, roof: 37, person: 38,
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
  // (0.4.12) The stone base's footprint, and its steps'.
  return p.x > -9.6 && p.x < 9.6 && p.y > -81.1 && (p.y < -57.45 || (abs(p.x) < 1.8 && p.y < -55.75));
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
// (0.4.17) 3.1 m front to back, its far side where it was: at 3.8 its
// coping ran 15 cm past the terrace's edge and through the glass.
export const POOL = { at: [0, TERRACE - 0.08, -61.05], w: 9, d: 3.1, deep: 1.1 };

/** The terrace's front edge: it reaches out past the ground floor's glass,
 * the pool in that cantilever, its basin the porch's roof. */
export const EDGE = -58.6;

/** How thick the glass is (metres): every pane, the windows' and the
 * terrace's (houseGlass.js, at its index 1.52). */
export const GLASS_THICK = 0.012;

/**
 * (0.4.27) The washrooms' bookmatches, each centred on what it's behind
 * (houseShader.js marble, variants .62, .64, .66): the WC's vanity, under
 * its slot window (z); the en-suite's double vanity (z); the shower's wet
 * wall, on its rain head (x).
 */
export const MATCH_AXES = [-69.55, -72.45, 6.825];

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

/** (0.4.6) The path's bollards (x, z). */
export const BOLLARDS = [[-0.95, -55.2], [0.95, -51.6], [-0.95, -48.0], [0.95, -44.4]];

/**
 * (0.4.26) The roof's deck: large-format porcelain pavers on pedestals in a
 * stack bond, `n` across x and z, inside the parapet's gravel margin.
 */
export const ROOF_DECK = (() => {
  const R = PLAN.roof;
  const x = [R.x[0] + 0.34, R.x[1] - 0.34];
  const z = [R.z[0] + 0.34, R.z[1] - 0.34];
  const n = [18, 16];
  return { x, z, n, cell: [(x[1] - x[0]) / n[0], (z[1] - z[0]) / n[1]] };
})();

/** The bounds the sun's shadow map covers (houseShadow.js): everything the
 * house can shade. */
export const HOUSE_BOUNDS = { lo: [-13, 0, -92], hi: [13, TERRACE + STOREY + 0.6, -50] };
