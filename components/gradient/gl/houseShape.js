/**
 * (0.4.0) The house on the hill behind the desk and the pool on its balcony
 * (ROADMAP.md, "0.4 — contact: the house and the pool"), as grey boxes for
 * now: where each stands and how big, in metres from the desk's centre (y
 * up, z toward the mountains, so the house is at −z, looking back at them
 * over the desk). The camera's last arcs (deskCamera.js CONTACT_PATH) are
 * laid out from these; the real house replaces the boxes in later 0.4.x.
 */

/** Which material each box is (houseShader.js). */
export const HOUSE_PART = { hill: 0, wall: 1, roof: 2, deck: 3, pool: 4 };

/** The pool on the balcony: its water's middle, its size (x, z). */
export const POOL = { at: [0, 6.02, -64.5], w: 7, d: 3.6 };

/** The boxes: [lo, hi, part]. */
export const HOUSE_BOXES = [
  // The hill the house stands on: a low mound under it.
  [[-18, 0, -92], [18, 2.4, -55], 'hill'],
  // The ground floor, its roof the balcony.
  [[-7, 2.4, -79], [7, 6, -60], 'wall'],
  // The upper floor, set back off the balcony, and its roof.
  [[-7, 6, -79], [7, 9.4, -68.5], 'wall'],
  [[-7.6, 9.4, -79.6], [7.6, 9.8, -67.9], 'roof'],
  // The balcony's deck, and the pool's water a hair over it.
  [[-7, 6, -68.5], [7, 6.01, -60], 'deck'],
  [[POOL.at[0] - POOL.w / 2, 6.01, POOL.at[2] - POOL.d / 2], [POOL.at[0] + POOL.w / 2, POOL.at[1], POOL.at[2] + POOL.d / 2], 'pool'],
];
