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
 * above is unchanged. The layered fallback builds it from the helpers at the
 * end of this file.
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
 * (0.2.2) The body's light on the ridges (GL; mistShader.js), by `low` as
 * above. (0.2.5) At rest it's already there, softer: `rest.a` of the crest
 * light and `rest.shade` of the shadow, the sun's light `rest.warm` of the
 * way from its own colour to SET_COLOUR, and the moon's `rest.moon` × as
 * strong as the sun's (not `moon`: its pale light needs more to show). Each
 * goes to its full setting value as the body sinks (`low`). Rather than tinting whole ridges, it lights
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
export const RIDGE_LIGHT = { rest: { a: 0.4, shade: 0.15, warm: 0.5, moon: 0.7 }, a: 0.3, mix: 0.3, spread: 0.25, base: 0.05, depth: 0.022, far: 0.3, shade: 0.3, veil: 0.25, moon: 0.35 };

// ---- the setting look as data for the layered fallback (0.2.6). Each
// mirrors a line of mistShader.js, which evaluates the same maths per pixel.
// Colours come back as 0–255 float RGB, mixed in gamma-encoded RGB like the
// shader's mix().

const rgbOf = c => (typeof c === 'string' ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c);
export const mixRGB = (a, b, t) => {
  const A = rgbOf(a);
  const B = rgbOf(b);
  return A.map((v, i) => v + (B[i] - v) * t);
};

/** [share of the extent, Gaussian] stops, exp(−u²) for u over 0…ext. */
export const gaussStops = (n, ext) =>
  Array.from({ length: n }, (_, k) => {
    const u = (ext * k) / (n - 1);
    return [k / (n - 1), Math.exp(-u * u)];
  });

/** The moon's glow to 3.4r, .4 × (1 − smoothstep): [share of 3.4r, opacity]. */
export const MOON_GLOW = Array.from({ length: 17 }, (_, k) => {
  const t = k / 16;
  return [t, 0.4 * (1 - t * t * (3 - 2 * t))];
});

/** A setting sun's disc (shader: `core`, `edge`), from its colour `bc` and `set`. */
export const setDisc = (bc, st) => ({
  core: mixRGB(bc, DISC_WHITE, DISC_LIFT + (SET_CORE - DISC_LIFT) * st),
  edge: mixRGB(bc, DISC_WHITE, DISC_LIFT + (SET_LIFT - DISC_LIFT) * st),
});

/**
 * The horizon wash (shader: `washA`, `washCol`): the last sun with `set` > 0
 * wins, as the shader's loop. Its opacity at a point is `peak` × exp(−u²),
 * u = (p − (x, y)) / (rx, ry). None (null) at rest.
 */
export function sunWash(bodies) {
  const b = bodies.filter(b => b && !b.face && b.set > 0).at(-1);
  if (!b) return null;
  return {
    x: b.x,
    y: b.y,
    rx: b.r * SET_WASH.wide,
    ry: b.r * SET_WASH.tall,
    peak: SET_WASH.a * b.set * b.alpha,
    col: mixRGB(b.col, DISC_WHITE, SET_WASH.lift),
  };
}

/** A rim's colour and opacity under `washA` of the wash (shader: `rimCol`, `rimA`). */
export const rimWash = (rim, rimA, washA, col) => ({
  col: mixRGB(rim, col, Math.min(1, (washA * SET_WASH.rim) / SET_WASH.a)),
  a: Math.min(1, rimA + (washA * SET_WASH.rimA) / SET_WASH.a),
});
