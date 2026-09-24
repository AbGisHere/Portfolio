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

/**
 * (0.2.2) Setting under the descent (camera.js bodyAt), by `low`, how far the
 * body has set (0 at rest … 1 at the end of the stretch). None of it applies
 * at rest (the shader takes the resting path exactly), so the resting look
 * above is unchanged. GL only for now; the layered fallback gets it in 0.2.4.
 *
 * The setting sun is built in layers, so it reads as light, not a sticker:
 * - its colour leans toward a gold SET_COLOUR by SET_MIX (never toward the
 *   sky behind it: it stays its own light, paler and brighter than the sky);
 * - a hot core that stays near-white / pale gold (lifted SET_CORE toward
 *   white) while the limb warms outward to gold-orange (lifted only
 *   SET_LIFT), on a smoothstep across the disc, times the resting limb;
 * - a tight bloom just outside the disc's edge (SET_BLOOM: peak opacity `a`
 *   at the edge, a Gaussian `out` radii wide) so the edge isn't crisp;
 * - the resting two-layer glow, spread `wide` × wider and `flat` × flatter
 *   and `gain` brighter (SET_HALO);
 * - a very wide, faint wash hugging the horizon (SET_WASH: a Gaussian `wide`
 *   radii across and `tall` radii high, peak `a`, in the sun's colour lifted
 *   `lift` toward white), which tints the sky, lights
 *   the ridge rims under it (`rim`: tint, `rimA`: extra rim opacity) and
 *   spills over the crests (`spill`: its share painted over the ridges).
 * Every falloff is smooth (Gaussian or smoothstep): no Mach bands.
 *
 * The setting moon (MOONSET) warms toward a soft ember amber as it sinks (its
 * glow with it, since both take its colour; the face still multiplies in, so
 * the seas and craters read), dims a touch, and its glow spreads a little
 * wider and lower. At rest it's the moon as ever.
 */
export const SET_COLOUR = '#F8B45E';
export const SET_MIX = 0.5;
export const SET_CORE = 0.8;
export const SET_LIFT = 0.18;
export const SET_BLOOM = { a: 0.5, out: 0.3 };
export const SET_HALO = { wide: 0.7, flat: 0.25, gain: 0.25 };
export const SET_WASH = { a: 0.3, wide: 18, tall: 2.4, lift: 0.35, rim: 0.7, rimA: 0.35, spill: 0.12 };
export const MOONSET = { colour: '#E8A868', mix: 0.6, dim: 0.04, wide: 0.25, flat: 0.1, gain: 0.1 };

/**
 * (0.2.2) The setting body's light on the ridges (GL; mistShader.js), by
 * `low` as above: none at rest. Rather than tinting whole ridges, it lights
 * them: a warm alpenglow along each crest (colour: SET_COLOUR leaned `mix`
 * into the haze), strongest near the body's x (a Gaussian `spread` × the
 * frame's width, `base` of it everywhere) and fading `depth` × the height
 * below the crest (scaled with the ridge), `a` at most, the far ranges
 * catching up to `far` × more of it; below, the body falls into a cool,
 * soft shadow (multiplied by the sky overhead's hue, stops[0] scaled to its
 * brightest channel), `shade` at most, so the ridges keep their detail and
 * never go near-black. The veils and air
 * between the ranges take the light's colour by `veil`, so the gaps glow
 * softly. The moon's is `moon` × as strong, in its own pale light.
 */
export const RIDGE_LIGHT = { a: 0.3, mix: 0.3, spread: 0.25, base: 0.05, depth: 0.022, far: 0.3, shade: 0.3, veil: 0.25, moon: 0.35 };
