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

/**
 * The lights by night: [x, y, z, radius (m), strength, kind, zone]. Kind 0
 * a lamp (shining every way), 1 a downlight outside (the soffit's, the
 * porch's), 3 one recessed in a room's ceiling (throwing down), 4 an
 * uplight, 5 a narrow spot (throwing down, tight). Zone: ZONES's, 0
 * outside. Strength 0 is a light that's off (its fitting dark too).
 */
/** (0.4.27) The bar's two spots in the soffit (x), over its counter's
 * middle (z). */
export const BAR_SPOTS = [4.25, 5.75];
export const BAR_SPOT_Z = PLAN.upper.z[1] + 0.04 + 0.3;

/** (0.4.6) The path's bollards (x, z). */
export const BOLLARDS = [[-0.95, -55.2], [0.95, -51.6], [-0.95, -48.0], [0.95, -44.4]];

/**
 * (0.4.27) The lights' colours, as their lamps' white points (not measured
 * Kelvin): `warm` about 2700 K, `candle` 2200 K, `amber` 2400 K, `clear`
 * 3000 K. ROOM_TONE is each zone's (ZONES; 0 outside), STRIP_TONE the
 * strips' (outside, only the bar's).
 */
export const TONE = {
  warm: [1.0, 0.71, 0.44],
  candle: [1.0, 0.6, 0.31],
  amber: [1.0, 0.63, 0.35],
  clear: [1.0, 0.8, 0.6],
};
export const ROOM_TONE = [TONE.warm, TONE.clear, TONE.warm, TONE.warm, TONE.candle, TONE.warm, TONE.clear, TONE.candle, TONE.warm];
export const STRIP_TONE = ROOM_TONE.map((t, i) => (i === 0 ? TONE.amber : t));

/**
 * (0.4.27) By day, how much of its night's light each room keeps on (ZONES;
 * 0 outside, whose lights are off by day): its lamps, pendants and strips,
 * not its ceiling's downlights (DAY_DOWN, only the washrooms', whose
 * windows are slots). The kitchen's under-cabinet light and the pendants,
 * the desk lamp, the bedside lamps, the wardrobe's rails; the guest room
 * and the landing off.
 */
export const ROOM_DAY = [0, 0.45, 0.55, 0.45, 0.35, 0.6, 0.45, 0, 0];
export const DAY_DOWN = [0, 0.45, 0, 0, 0, 0, 0.45, 0, 0];

const down = (zone, ceil, pts, r = 5, k = 0.45) => pts.map(([x, z]) => [x, ceil - 0.05, z, r, k, 3, zone]);
export const HOUSE_LIGHTS = [
  // (0.4.27) Each room lit for what it's used for by night, not one amber
  // through the house (ROOM_TONE its colour). The living room the
  // brightest, its reading lamp the focus; the table under its pendant;
  // the kitchen down to its under-cabinet light, its cooking done.
  ...down(3, CEIL_G, [[-5.5, -66.0], [-3, -66.0], [-5.5, -69.3], [-3, -69.3]], 5, 0.55),
  ...down(3, CEIL_G, [[2.5, -65.5], [2.5, -70.3], [0, -67.5]], 5, 0.32),
  ...down(3, CEIL_G, [[3.4, -73.6], [5.6, -73.6], [3.4, -76.6], [5.6, -76.6]], 5, 0.2),
  ...down(3, CEIL_G, [[6.2, -65.0], [-5.8, -74.5]], 5, 0.28),
  [2.55, FLOOR + 1.8, -67.9, 4, 0.85, 0, 3],
  [4.4, FLOOR + 2.1, -74.9, 5, 0.5, 0, 3],
  [-7.2, FLOOR + 1.55, -70.3, 3.8, 0.8, 0, 3],
  // (0.4.23) The washrooms lit warm and strong: over the WC's toilet and
  // its vanity; over the en-suite's vanity, bath, toilet and shower.
  // (0.4.27) Clear and bright, a cleaner white than the rooms.
  ...down(1, CEIL_G, [[6.0, -70.4], [7.1, MATCH_AXES[0]], [5.6, -68.4]], 4, 0.7),
  // The study: only its desk lamp, someone working late.
  ...down(2, CEIL_G, [[-2, -76]], 5, 0),
  [-2.75, FLOOR + 1.1, -78.2, 3.6, 0.7, 0, 2],
  ...down(8, CEIL_U, [[-6.1, -73.0], [-6.1, -76.0], [-1, -78.1], [1.5, -78.1]], 5, 0.2),
  // The main bedroom: its ceiling off, the bedside lamps low and warm,
  // the wash behind the bed.
  ...down(4, CEIL_U, [[-2.5, -73.0], [0.8, -73.0], [-1, -74.8]], 5, 0),
  [-2.26, TERRACE + 1.29, -75.44, 3, 0.72, 0, 4],
  [0.36, TERRACE + 1.29, -75.44, 3, 0.72, 0, 4],
  // The wardrobe and the guest room nearly dark: nobody's in them.
  ...down(5, CEIL_U, [[-2.5, -76.65], [0.8, -76.65]], 3.5, 0),
  ...down(6, CEIL_U, [[3.3, -72.45], [4.6, -72.15], [4.3, -74.3], [6.8, -74.05], [6.6, -72.4]], 4, 0.7),
  ...down(7, CEIL_U, [[5.2, -76.9]], 4, 0),
  [6.31, TERRACE + 1.29, -78.38, 3, 0, 0, 7],
  // Two downlights in the porch's ceiling, under the cantilever.
  [-6.2, FLOOR + STOREY - 0.4, -60.8, 4.5, 0.6, 1, 0],
  [6.2, FLOOR + STOREY - 0.4, -60.8, 4.5, 0.6, 1, 0],
  // The soffit's downlights over the terrace.
  // (0.4.27) Its two over the bar dimmer, so the bar's own pools read.
  ...[-6, -2, 2, 6].map(x => [x, TERRACE + STOREY - 0.42, -69.8, 4.5, x === 6 ? 0.38 : 0.55, 1, 0]),
  // (0.4.27) Over the bar's counter, two narrow spots in the soffit (kind
  // 5, a tight cone): a pool of light each on its stone.
  ...BAR_SPOTS.map(x => [x, TERRACE + STOREY - 0.4, BAR_SPOT_Z, 3.2, 1.1, 5, 0]),
  // (0.4.6) Outside by night: uplights (kind 4, throwing up) grazing the
  // columns, the timber, the stone base, and into the olive; low bollards
  // along the path (kind 1).
  [-8.1, FLOOR + 0.05, -58.42, 4, 0.7, 4, 0],
  [8.1, FLOOR + 0.05, -58.42, 4, 0.7, 4, 0],
  [5.0, FLOOR + 0.05, -62.75, 4, 0.6, 4, 0],
  [7.4, FLOOR + 0.05, -62.75, 4, 0.6, 4, 0],
  // (0.4.22) Not where the bar stands (it has its own light).
  [7.4, TERRACE + 0.08, -70.75, 3.6, 0.55, 4, 0],
  [2.95, TERRACE + 0.08, -70.75, 3.6, 0.55, 4, 0],
  ...[-6, -3, 3, 6].map(x => [x, moundY(x, -56.9) + 0.05, -56.9, 3.5, 0.6, 4, 0]),
  // (0.4.17) The olive's on the deck beside its pot, aimed into the tree
  // (it sat on the old box's rim).
  [-6.52, TERRACE + 0.09, -59.05, 3, 0.6, 4, 0],
  ...BOLLARDS.map(([x, z]) => [x, moundY(x, z) + 0.55, z, 3.2, 0.55, 1, 0]),
];

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

// The bar's shelf strips' line: in front of its wall (homeDetails.js).
const BAR_STRIP_Z = PLAN.upper.z[1] + 0.04 + 0.2025;

/**
 * (0.4.6) The LED strips by night: [a (x, y, z), b, the way they shine
 * (x, y, z), radius, strength, zone]: under the kitchen's wall units and
 * along its toe-kicks and the island's, along the stair's treads, washing
 * the wall behind each bed's panel, under the nightstands, along the
 * bookcase. Each lights what's before it along its way, falling off from
 * its whole length. (`hidden`: its light only, its fittings drawn on their
 * own, as the stair's under each tread.)
 */
export const HOUSE_STRIPS = [
  [[2.6, FLOOR + 1.44, -78.42], [4.85, FLOOR + 1.44, -78.42], [0, -1, 0.2], 1.6, 0.5, 3],
  [[2.6, FLOOR + 0.03, -78.15], [7.3, FLOOR + 0.03, -78.15], [0, -0.4, 1], 1.0, 0.3, 3],
  [[3.1, FLOOR + 0.03, -74.46], [5.7, FLOOR + 0.03, -74.46], [0, -0.4, 1], 1.0, 0.3, 3],
  [[3.1, FLOOR + 0.03, -75.34], [5.7, FLOOR + 0.03, -75.34], [0, -0.4, -1], 1.0, 0.3, 3],
  // (0.4.17) The stair's, under every tread: brighter and wider (they
  // barely showed by night).
  [[-7.12, FLOOR + 0.13, -72.05], [-7.12, FLOOR + 3.33, -76.53], [0, -1, 0], 1.7, 1.0, 3, true],
  [[-2.65, TERRACE + 1.38, -75.73], [0.75, TERRACE + 1.38, -75.73], [0, 1, 0.15], 1.4, 0.55, 4],
  [[3.65, TERRACE + 1.38, -78.71], [6.65, TERRACE + 1.38, -78.71], [0, 1, 0.15], 1.4, 0, 7],
  [[-2.5, TERRACE + 0.46, -75.44], [-2.0, TERRACE + 0.46, -75.44], [0, -1, 0], 0.9, 0.3, 4],
  [[0.1, TERRACE + 0.46, -75.44], [0.6, TERRACE + 0.46, -75.44], [0, -1, 0], 0.9, 0.3, 4],
  [[-5.25, FLOOR + 2.36, -72.6], [-1.55, FLOOR + 2.36, -72.6], [0, -1, 0.3], 1.5, 0.45, 3, true],
  [[-5.25, FLOOR + 1.16, -72.6], [-1.55, FLOOR + 1.16, -72.6], [0, -1, 0.3], 1.2, 0.35, 3, true],
  // (0.4.23) Behind the washrooms' mirrors and in the shower's niche.
  [[7.68, FLOOR + 1.7, MATCH_AXES[0] + 0.55], [7.68, FLOOR + 1.7, MATCH_AXES[0] - 0.55], [-1, 0.4, 0], 0.9, 0.6, 1, true],
  [[2.71, TERRACE + 2.0, -71.6], [2.71, TERRACE + 2.0, -73.3], [1, 0.4, 0], 1.0, 0.6, 6, true],
  [[6.3, TERRACE + 1.48, -74.8], [6.9, TERRACE + 1.48, -74.8], [0, -1, 0.3], 0.6, 0.5, 6, true],
  // (0.4.22) The terrace's bar: under its two shelves, and under its
  // counter's lip onto the deck.
  // (0.4.26) At the strips themselves, set in the shelves' undersides
  // (it was at the wall a centimetre under, lighting the shelf's own
  // underside hot: a pixel's row that came and went from the desk).
  // (0.4.27) Tight pools on the bottles, amber (STRIP_TONE).
  [[3.5, TERRACE + 1.425, BAR_STRIP_Z], [6.3, TERRACE + 1.425, BAR_STRIP_Z], [0, -1, 0.15], 0.9, 0.95, 0, true],
  [[3.5, TERRACE + 1.825, BAR_STRIP_Z], [6.3, TERRACE + 1.825, BAR_STRIP_Z], [0, -1, 0.15], 0.8, 0.7, 0, true],
  // (0.4.21) The wardrobe's, under the shelf over each rail, down its run.
  // (0.4.27) Left on low over the top rail only; the guest room's wash
  // off, and the toe-kicks and the nightstands' dimmer.
  [[-4.3, TERRACE + 2.07, -76.9], [2.4, TERRACE + 2.07, -76.9], [0, -1, -0.5], 1.3, 0.16, 5, true],
  [[-4.3, TERRACE + 1.11, -76.9], [2.4, TERRACE + 1.11, -76.9], [0, -1, -0.5], 1.0, 0, 5, true],
];

/** The bounds the sun's shadow map covers (houseShadow.js): everything the
 * house can shade. */
export const HOUSE_BOUNDS = { lo: [-13, 0, -92], hi: [13, TERRACE + STOREY + 0.6, -50] };
