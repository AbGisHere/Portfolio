/**
 * How the sun is drawn, shared by the GL shader and the layered fallback so
 * they can't drift apart. (The moon keeps its plain glow; its disc gets
 * moonFace.js instead.)
 *
 * - Glow: two layers composited, a tight bright halo hugging the disc and a
 *   wide faint haze, instead of one straight fade (which read as a soft box).
 *   Baked into piecewise-linear stops (distance in radii → opacity), so the
 *   shader and a CSS radial-gradient trace the same curve.
 * - Limb: the disc warms toward its edge, as a real sun does, darkening only
 *   in green and blue so it still stands clear of a pale sky. A multiplier
 *   on the disc colour, 1 at the centre.
 * - Low: near the ridges (sunset and sunrise alike) the disc squashes a
 *   little, like refraction flattens a real one, and deepens toward orange.
 */

const halo = x => (x <= 1 ? 0.2 : 0.2 * Math.max(0, 1 - (x - 1) / 0.9) ** 2);
const haze = x => 0.14 * Math.max(0, 1 - x / 6.5) ** 1.6;

/** How far the glow reaches, in radii. */
export const GLOW_EXTENT = 6.5;

/** [distance in radii, opacity] stops for the sun's glow. */
export const SUN_GLOW = [0, 1, 1.15, 1.3, 1.5, 1.7, 1.9, 2.3, 2.8, 3.4, 4.2, 5.2, 6.5].map(x => [
  x,
  1 - (1 - halo(x)) * (1 - haze(x)),
]);

/**
 * The disc is the brightest thing in the sky: fully opaque (the moon stays
 * at .85) and its colour lifted this far toward near-white, so it stands
 * clear of a pale dusk sky. The glow keeps the unlifted, warmer colour.
 */
export const DISC_LIFT = 0.6;
export const DISC_WHITE = '#FFFCF6';
export const DISC_ALPHA = 1;

/** The disc colour multiplier at the very edge (warmer: blue drops most). */
export const LIMB_EDGE = [1, 0.95, 0.88];
export const LIMB_POWER = 3;

/** The multiplier at `rho` (0 centre … 1 edge). */
export const limbAt = rho => LIMB_EDGE.map(c => 1 - (1 - c) * Math.min(1, rho) ** LIMB_POWER);

/** Stops for the limb as a CSS gradient (the shader evaluates it exactly). */
export const LIMB_STOPS = [0, 0.4, 0.6, 0.75, 0.85, 0.93, 1];

/** What a low sun's colour deepens toward, and how far at the horizon. */
export const SUNSET_COLOUR = '#F09A5E';
export const SUNSET_MIX = 0.45;

/** How much a sun at the horizon is flattened (share of its height). */
export const SQUASH = 0.16;
