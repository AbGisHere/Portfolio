import { mix, ridgeBlur, ridgeColour, rimOpacity } from './gl/mistGeometry';
import { ease } from './orbit';
import { paletteAt } from './skyKeys';
import { MOONSET, SET_COLOUR, SET_HALO, SET_MIX } from './sunLook';

/**
 * The descent's camera over the mountains (the 0.2 stretch, ROADMAP.md "The
 * descent"), shared by both renderers: a pure function of the scroll progress
 * `about` (components/scroll/descent.js) and the recipe, read every frame and
 * never sprung. Each renderer turns what's here into its own terms: uniforms
 * (MistCanvas.jsx) or layer transforms and gradients (the layered fallback).
 *
 * The model. `layout` (gl/mistGeometry.js) already implies a ground plane
 * under the eye: the horizon sits at `c`, and ridge b's foot at `base_b`, so
 * the ridge stands at depth z_b = (h − c) / (base_b − c), in units of the
 * ground at the frame's foot (the front ridge ≈ 1, the far one ≈ 8).
 *
 * - **Drawing back** by `back` puts every ridge at z_b + back, so it's drawn
 *   at s_b = z_b / (z_b + back), about the vanishing point (the frame's centre
 *   line): near ridges shrink a lot and far ones barely (parallax), and each
 *   spans more of its noise across the frame, so more peaks come into view.
 * - **Climbing** by `rise` (share of the eye height) spreads the feet down
 *   the frame: a foot sits (1 + rise) × s_b × (base_b − c) below the horizon.
 *   Drawing back alone crowds the ridges onto the horizon and opens a wide
 *   field below them; climbing keeps the ranges filling the frame, stacked
 *   like an aerial view, with only a thin band of meadow under the front one.
 * - **Tilting down** shifts everything by `tilt` × h (a vertical shift; the
 *   keystone is ignored): the horizon, sky, sun and moon go up with it, so
 *   the sky ends as a strip at the top.
 *
 * So ridge b maps (x, y) → (w/2 + (x − w/2)·s_b, foot_b + (y − base_b)·s_b),
 * with foot_b = c − tilt·h + (1 + rise)·s_b·(base_b − c): one scale and one
 * translate per ridge, its veil included. Below the front ridge's foot is the
 * meadow (`groundPaint`). As the view opens, `more` ranges join in the gaps
 * between the recipe's (layout's `extra`), fading in. At `about` = 0 every
 * function here is the identity.
 */

/** How far the camera goes by `about` = 1, and `more`: how many ranges
 * join behind the far one as the view opens (mistGeometry.js `layout`'s
 * `extra`, capped at MAX_RANGES in all; they fade in, never pop). A recipe
 * can override any of these under `scroll.camera`. */
export const CAMERA = { back: 0.35, tilt: 0.26, rise: 0.75, more: 4 };

/** Under reduced motion the camera goes this share of the way. The time of
 * day (palette, sun and moon) still runs in full. */
export const REDUCED_CAMERA = 0.3;

/** The meadow: fog is q^GROUND_FOG, q = the ground's distance over the front
 * foot's (1 at the foot, smaller toward the viewer), and the near meadow is
 * the palette's front ridge colour leaned toward the recipe's `scroll.meadow`
 * by MEADOW_MIX. */
export const GROUND_FOG = 12;
export const MEADOW_MIX = 0.85;
/** Where the ground gradient's stops sit, as shares of the band from the
 * front foot down to the frame's foot (CSS can draw exactly these). */
export const GROUND_AT = [0, 0.3, 0.65, 1];

/** Wind over the meadow (GL; the layered port may approximate or skip it):
 * soft bright bands at constant ground depth travelling toward the viewer.
 * `amp` is the brightness swing, `bands` how many cycles per unit of the
 * ground's depth ratio, `speed` cycles a second. */
export const WIND = { amp: 0.06, bands: 24, speed: 0.2 };

const clamp01 = x => Math.min(1, Math.max(0, x));

/** The recipe's camera amounts, full. */
export const cameraOf = recipe => ({ ...CAMERA, ...recipe?.scroll?.camera });

/**
 * The camera at `about`: { back, tilt, rise, more, k }, eased in and out so
 * the move starts and lands gently. Mid-switch, `from` and the switch's
 * progress `e` blend in the outgoing recipe's amounts.
 */
export function cameraAt(about, recipe, { reduced = false, from = null, e = 1 } = {}) {
  const k = ease(about) * (reduced ? REDUCED_CAMERA : 1);
  const a = cameraOf(recipe);
  const b = from ? cameraOf(from) : a;
  const at = key => (b[key] + (a[key] - b[key]) * e) * k;
  // `k`: how far along the camera is (0 … 1, or REDUCED_CAMERA at most).
  return { back: at('back'), tilt: at('tilt'), rise: at('rise'), more: at('more'), k };
}

export const cameraAtRest = cam => !cam || (cam.back === 0 && cam.tilt === 0 && cam.rise === 0 && !cam.more);

/**
 * The 0.2.1 descent (GL; the layered fallback still runs the 0.2.0 camera
 * above until it's ported). The same world model, taken literally: every
 * ridge is fixed terrain at depth z with a fixed silhouette, and the camera
 * only pulls back, climbs and tilts, so a ridge only moves and scales
 * (uniformly: its proportions hold). Nothing fades in. Instead:
 *
 * - **The conveyor.** Pulling back slides every ridge up the frame and
 *   smaller: the front ridge ends about where the second was, and so on down
 *   the line.
 * - **A new front ridge** (`ranges`, z < 1: terrain the camera pulls back
 *   over) starts `drop` × h under its place, wholly below the frame, and
 *   slides up into view from the bottom edge, fully opaque, as the drop eases
 *   out by `until` of the stretch, to become the new front one with the
 *   meadow at its foot.
 * - **Distant ranges** (z beyond the far ridge) rise from behind the ridge in
 *   front of them the same way: at the top of the page they're dropped under
 *   the far ridge's fill, and the climb opens the view over it.
 * - A range's `stretch` widens its silhouette (a fixed shape, so it keeps
 *   its proportions as it moves: the camera scales it uniformly).
 * - **Light follows the slot.** A ridge's `t` (colour, haze, blur, rim, veil
 *   opacity) comes from where its foot is on the frame, through the studio's
 *   own slot curve, so a ridge sliding back takes on the look of the slot it
 *   reaches, and the far ones merge into the haze by colour, not alpha.
 *
 * With `about` = 0 it's the studio's frame exactly (no extra ranges at all).
 */
export const DESCENT = {
  back: 0.4,
  tilt: 0.28,
  rise: 0.59,
  // z: depth (the frame's foot = 1); height: world height, share of the
  // frame's height at depth 1; drop/until: see above.
  ranges: [
    { z: 0.78, height: 0.4, stretch: 1.6, drop: 0.5, until: 0.85 },
    { z: 13, height: 1.4, drop: 0.3, until: 0.6 },
    { z: 20, height: 1.7, drop: 0.3, until: 0.6 },
    { z: 32, height: 2, drop: 0.3, until: 0.6 },
  ],
};

/** The recipe's 0.2.1 descent amounts (`scroll.descent` overrides). */
export const descentOf = recipe => ({ ...DESCENT, ...recipe?.scroll?.descent });

/** The camera at `about` for the 0.2.1 descent: { back, tilt, rise, k,
 * ranges }, blended mid-switch like `cameraAt`. */
export function descentAt(about, recipe, { reduced = false, from = null, e = 1 } = {}) {
  const k = ease(about) * (reduced ? REDUCED_CAMERA : 1);
  const a = descentOf(recipe);
  const b = from ? descentOf(from) : a;
  const at = key => b[key] + (a[key] - b[key]) * e;
  return {
    back: at('back') * k,
    tilt: at('tilt') * k,
    rise: at('rise') * k,
    more: 0,
    k,
    ranges: k > 0 ? a.ranges : null,
  };
}

/** The smallest scale any ridge reaches in the 0.2.1 descent (about = 1): what
 * the crest noise's range (the hash table) must cover. */
export function descentWidest(scene, h, recipes) {
  const back = Math.max(...recipes.map(r => descentOf(r).back));
  const zs = scene.ridges.map(rd => rd.z ?? depthOf(rd.base, scene.horizon, h));
  for (const r of recipes) for (const g of descentOf(r).ranges) zs.push(g.z);
  return Math.min(1, ...zs.map(z => z / (z + back)));
}

/** A ridge's depth t (0 far … 1 near; below 0 hazier still) from where its
 * foot sits between the horizon and the frame's foot, through the studio's
 * slot curve (base = c + ((b + 1) / r)^1.3 × d). */
export function slotT(foot, horizon, h, ranges) {
  const v = Math.max(0, (foot - horizon) / Math.max(1, h - horizon));
  return Math.min(1, Math.max(-1, (ranges * v ** (1 / 1.3) - 1) / Math.max(1e-3, ranges - 1)));
}

/** Ridge b's depth, z_b = (h − c) / (base_b − c). */
const depthOf = (base, c, h) => (h - c) / Math.max(1e-3, base - c);

/** Each ridge's scale under `cam` (all 1 at rest). */
export const ridgeScales = (ridges, c, h, cam) =>
  ridges.map(rd => (cameraAtRest(cam) ? 1 : depthOf(rd.base, c, h) / (depthOf(rd.base, c, h) + cam.back)));

/**
 * The frame under `cam`: { rest, shift, horizon, ridges: [{ s, foot }],
 * front }. `shift` is how far up the sky (and everything at infinity) goes,
 * `horizon` the ground's vanishing line, `front` the front ridge's foot:
 * the meadow's top edge (≥ h: no meadow).
 */
export function frameAt(scene, h, cam) {
  const c = scene.horizon;
  const { ridges } = scene;
  if (cameraAtRest(cam)) {
    return { rest: true, k: 0, shift: 0, horizon: c, ridges: ridges.map(rd => ({ s: 1, foot: rd.base })), front: h };
  }
  const shift = cam.tilt * h;
  const horizon = c - shift;
  // (0.2.1) A world range sits `drop` lower until its `until` of the
  // stretch (under the frame, or behind the far ridge), and each ridge's
  // light follows its slot (`slotT`). A `stretch`ed range is drawn that
  // much larger (its height is set that much lower in `layout`).
  // (0.2.2) Ranges beyond the recipe's far ridge step further into the haze
  // by depth (FAR_HAZE), and every ridge's idle drift is scaled so its flow
  // reads on screen as it does at the top (DRIFT_GAIN_MAX, `g`).
  const own = ridges.filter(rd => !rd.extra);
  const zFar = Math.max(...own.map(rd => depthOf(rd.base, c, h)));
  const lift = Math.min(...own.map(rd => rd.L ?? Infinity));
  const out = ridges.map(rd => {
    const s = ridgeScales([rd], c, h, cam)[0];
    const foot = horizon + (1 + cam.rise) * s * (rd.base - c);
    const u = rd.drop ? Math.min(1, (cam.k ?? 1) / (rd.until ?? 1)) : 1;
    const dropped = rd.drop ? rd.drop * h * (1 - u * u * (3 - 2 * u)) : 0;
    const z = rd.z ?? depthOf(rd.base, c, h);
    const far = z > zFar ? FAR_HAZE * Math.log2(z / zFar) : 0;
    const drawn = s * (rd.stretch ?? 1);
    const g = Math.min(DRIFT_GAIN_MAX, Math.max(1 / drawn, rd.L ? lift / (rd.L * drawn) : 1));
    // Ridges flatten into layers as the camera goes (mistGeometry.js
    // FAR_FOOT, FAR_VEIL): the distant ranges fully, the recipe's by how far
    // back they sit, so a crest that dips into a valley (a narrow portrait
    // frame shows few peaks) still reads as its own layer, not as haze.
    const t = slotT(foot, horizon, h, scene.ranges ?? 5) - far;
    const flat = z > zFar + 1e-6 ? 1 : (cam.k ?? 1) * clamp01(1 - t);
    return { s: drawn, foot: foot + dropped, t, g, flat };
  });
  return { rest: false, k: cam.k ?? 1, shift, horizon, ridges: out, front: out.length ? out[out.length - 1].foot : h };
}

/**
 * (0.2.2) The sky under the camera. Tilting down lifts the sky with the
 * horizon, which left the palette's horizon band (stops[2], the far ridge's
 * own colour) right behind the distant ranges: they merged into it, and the
 * sky strip at the end showed only the warm bands, never the cool top.
 * Instead the sky is redrawn over the strip above the horizon: the frame's
 * top shows the ramp at SKY.top and the horizon at SKY.horizon by the end
 * (stops sit at 1/12, 3/12 … of the ramp: .083 is stops[0], .25 stops[1]),
 * so the strip runs from the cool top down to the haze (stops[1], the colour
 * the distant ranges fade into), glowing behind the ranges. Both move on the
 * camera's clock; below the horizon the ramp carries on at the same density.
 * Returns { scale, shift } for `(y × scale + shift) / h`: 1 and the plain
 * tilt shift at rest.
 */
export const SKY = { top: 0.08, horizon: 0.24 };
export function skyAt(frame, h) {
  if (frame.rest) return { scale: 1, shift: frame.shift };
  const k = frame.k;
  const c = frame.horizon + frame.shift;
  const a = SKY.top * k * h;
  const b = c + (SKY.horizon * h - c) * k;
  return { scale: (b - a) / Math.max(1, frame.horizon), shift: a };
}

/**
 * (0.2.2) The ridges' colour under the descent, painted for the camera
 * rather than derived the studio's way (which mixes every ridge toward the
 * haze, so the ranges muddied into one wash as they multiplied). Aerial
 * perspective is the backbone: each ridge takes its body colour from a clean
 * ramp by its depth t (the slot it has reached, camera.js frameAt), front to
 * back through the palette's ridge stops, stops[5] (t = 1, deepest and
 * richest) → stops[4] (⅔) → stops[3] (⅓) → stops[2] (0, the far ridge), and
 * past it (t < 0, the distant ranges) on toward the haze, stops[1], which by
 * the end is the sky just above them (camera.js SKY): each range lighter,
 * cooler and softer than the one in front. Each still eases into the haze
 * at its foot (PAINT.foot, more for farther ranges), so the mist between the
 * ranges stays, and keeps a soft, lighter crest line (PAINT.rim, at PAINT.rimA
 * of the studio's opacity). Light is
 * a separate layer on top (sunLook.js RIDGE_LIGHT), never baked in here.
 * MistCanvas blends this in over the studio's colours on the camera's clock,
 * so the top of the page is untouched.
 */
export const PAINT = { crest: 0.1, foot: [0.2, 0.55], rim: 0.3, rimA: 0.5 };
/** Past the top every veil thins by up to this share (MistCanvas.jsx). */
export const DESCENT_VEIL = 0.5;
/** …and the air band at the frame's foot by up to this share, so the near
 * ridges keep their hue (the pale haze over them greyed them out). */
export const DESCENT_AIR = 0.5;

const RAMP_AT = [1, 2 / 3, 1 / 3, 0, -1];
export function paintTone(stops, t) {
  const ramp = [stops[5], stops[4], stops[3], stops[2], stops[1]];
  const x = Math.min(1, Math.max(-1, t));
  let j = 0;
  while (j < RAMP_AT.length - 2 && x < RAMP_AT[j + 1]) j++;
  return mix(ramp[j], ramp[j + 1], (RAMP_AT[j] - x) / (RAMP_AT[j] - RAMP_AT[j + 1]));
}

/** One ridge's paint under the descent (the shape `ridgePaint` returns). */
export function descentPaint(stops, rd, h) {
  const A = paintTone(stops, rd.t);
  const M = stops[1];
  const far = clamp01(1 - rd.t);
  const blur = ridgeBlur(rd.t, h);
  return {
    fill: [A, mix(A, M, PAINT.crest), mix(A, M, PAINT.foot[0] + (PAINT.foot[1] - PAINT.foot[0]) * far)],
    rim: mix(A, M, PAINT.rim),
    rimA: rimOpacity(rd.t) * PAINT.rimA,
    blur: blur > 0.4 ? blur : 0,
    fade: rd.fade,
  };
}

/** Two paints blended (oklab for colours), `k` of the way from a to b. */
export function blendPaint(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return {
    fill: a.fill.map((c, i) => mix(c, b.fill[i], k)),
    rim: mix(a.rim, b.rim, k),
    rimA: a.rimA + (b.rimA - a.rimA) * k,
    blur: a.blur + (b.blur - a.blur) * k,
    fade: b.fade,
  };
}

/** (0.2.2) How far each range beyond the recipe's far ridge steps into the
 * haze: its `t` drops by FAR_HAZE per doubling of depth past the far ridge's,
 * so the distant ranges read as separate layers, each paler than the last. */
export const FAR_HAZE = 0.4;

/**
 * (0.2.2) The idle drift (the ridges' breathing, MistCanvas.jsx) is in noise
 * units, so its motion on screen scales with a ridge's drawn size: under the
 * camera the recipe's ridges shrink to s ≈ .7–.95, and the distant ranges,
 * with a world lift ∝ 1/z, barely moved at all. Each ridge's drift is scaled
 * by `g` (frameAt): 1/s, so a ridge flows as many px as it did at the top, and
 * at least enough that its crest moves as far as the recipe's far ridge does
 * at rest; capped at DRIFT_GAIN_MAX (the hash table's slack covers it). All
 * 1 at rest.
 */
export const DRIFT_GAIN_MAX = 2.5;

/** Each ridge's drift gain in `frame` (paint order), or null at rest. */
export const driftGains = frame => (frame.rest ? null : frame.ridges.map(rc => rc.g ?? 1));

/** The smallest scale each ridge reaches over the whole stretch (about = 1,
 * full camera): what the crest noise's range (the hash table) must cover. */
export function widestScales(scene, h, recipes) {
  return scene.ridges.map(rd =>
    Math.min(1, ...recipes.map(r => ridgeScales([rd], scene.horizon, h, cameraAt(1, r))[0])),
  );
}

/** A veil ({ cx, cy, rx, ry, a }) moved with its ridge; `amp` (its drift) scales too. */
export function veilAt(v, ridge, rc, w) {
  if (rc.s === 1 && rc.foot === ridge.base) return v;
  return {
    ...v,
    cx: w / 2 + (v.cx - w / 2) * rc.s,
    cy: rc.foot + (v.cy - ridge.base) * rc.s,
    rx: v.rx * rc.s,
    ry: v.ry * rc.s,
  };
}

/**
 * The palette at `about`: the recipe's `scroll.keys` (absolute palettes at
 * `at` of the stretch) after `base`, the palette the scene would rest on,
 * through the same monotone cubic in oklab a switch uses (skyKeys.js).
 */
export function scrollPalette(base, recipe, about) {
  const keys = recipe?.scroll?.keys;
  if (!keys?.length || about <= 0) return base;
  return paletteAt([{ at: 0, stops: base }, ...keys], about);
}

/** The palette at `about` mid-switch: both scenes' overlays on the switch's
 * palette, blended on its progress `e`, so a switch started a little way down
 * doesn't pop. */
export function scrollPaletteSwitch(base, prev, next, about, e) {
  if (about <= 0) return base;
  const a = scrollPalette(base, prev, about);
  const b = scrollPalette(base, next, about);
  return a.map((c, i) => (e <= 0 ? c : e >= 1 ? b[i] : mix(c, b[i], e)));
}

/**
 * A sun or moon under the descent (0.2.2: it sets). Its gap to the horizon
 * (the ground's vanishing line, `frame.horizon`) closes on the camera's clock
 * and reach (`frame.k`) from the resting one to its recipe's `scroll.body.set`
 * radii below it by `about` = 1 (positive: the centre ends under the line, so
 * the ranges on the horizon cover the lower part of the disc), while `dx`
 * (share of the height) leans it the way it sets. The camera tilting down
 * still lifts the sky, but the ridges climb faster than the body does, so the
 * crests close in on it and take it: it reads as setting, not floating at a
 * fixed gap. It stays round and keeps its size (it's at infinity; the low-sun
 * flattening belongs to a switch), and the sun deepens toward the sunset
 * colour (sunLook.js) as it sinks. Bodies mid-switch (`look: false`) keep
 * their switch look and only move: the arc is orbit.js's, in the unscrolled
 * sky, offset whole, so a body can leave the top of the frame mid-arc.
 */
export function bodyAt(b, recipe, frame, { w, h, restY, look = true }) {
  const m = recipe?.scroll?.body;
  const k = frame.k;
  if (!m || frame.rest || !k) return b;
  const r = b.r;
  // How far it has set: the gap closes slowly at first, then takes it
  // (SET_EASE), so the crests catch it late in the stretch, not halfway.
  const low = clamp01(k) ** SET_EASE;
  // The resting gap (negative: above the line) and the one it ends on.
  const g0 = restY - (frame.horizon + frame.shift);
  const g1 = (m.set ?? 0) * r;
  const dx = (m.dx ?? 0) * h * k;
  // At rest the body stays clear of the frame's edges (the sun clamp); a
  // switch's arc keeps its full shape, off the frame and all.
  const x = look ? Math.min(Math.max(b.x + dx, 1.5 * r), Math.max(w - 1.5 * r, w / 2)) : b.x + dx;
  const out = { ...b, x, y: b.y - frame.shift + (g1 - g0) * low };
  // Only a painted body takes the setting look. Both renderers also ask
  // for a bare position mid-switch (where the resting body will land, for the
  // hit target): that probe carries no colour, only x/y/r.
  if (!look || b.col == null) return out;
  // Its setting look (sunLook.js): the sun warms (hot core, gold-orange
  // limb, bloom, a low wash along the horizon: the shader builds those from
  // `set`), the moon barely changes; both glows spread low.
  const set = b.face === 0 ? { ...SET_HALO, colour: SET_COLOUR, mix: SET_MIX, dim: 0 } : MOONSET;
  out.col = mix(b.col, set.colour, set.mix * low);
  out.halo = [1 + set.wide * low, 1 - set.flat * low];
  out.glow = b.glow * (1 + set.gain * low);
  out.alpha = b.alpha * (1 - set.dim * low);
  out.set = low;
  return out;
}

/** How the body's set follows the camera: low = k^SET_EASE. */
export const SET_EASE = 1.6;

/**
 * The meadow below the front ridge: { top, stops: [[y, hex], …] }, a vertical
 * gradient in CSS px (piecewise-linear in sRGB, as CSS draws it; the GL
 * shader traces the same stops), or null when none shows. It starts at the
 * colour the front ridge's fill has below its foot (`foot`, fill[2]), so the
 * seam doesn't show, fogs toward the viewer by ground distance, and ends at
 * the meadow colour. Painted over the front ridge, under its veil (the mist
 * bank at its feet), then the air (`airAt`) over both.
 */
export function groundPaint(stops, meadow, foot, frame, h, haze) {
  const top = frame.front;
  if (top >= h) return null;
  const near = mix(ridgeColour(stops, 1, haze), meadow ?? stops[stops.length - 1], MEADOW_MIX);
  const H = frame.horizon;
  return {
    top,
    stops: GROUND_AT.map(f => {
      const y = top + (h - top) * f;
      const q = (top - H) / Math.max(1e-3, y - H);
      return [y, mix(near, foot, q ** GROUND_FOG)];
    }),
  };
}

/** (0.2.2) The haze (ATMOSPHERE · Haze, `mist.haze`) at `about`: it thins
 * from the resting value toward the recipe's `scroll.haze` by the end, so the
 * ridges darken toward silhouettes and the veils and air thin as evening
 * comes. Mid-switch both scenes' targets blend on the switch's progress `e`. */
export function scrollHaze(base, prev, next, e, about) {
  const a = prev?.scroll?.haze ?? base;
  const b = next?.scroll?.haze ?? base;
  return base + (a + (b - a) * e - base) * clamp01(about);
}

/** The meadow tint mid-switch. */
export const meadowOf = (prev, next, e) => {
  const a = prev?.scroll?.meadow;
  const b = next?.scroll?.meadow;
  return a && b ? mix(a, b, e) : (b ?? a);
};

/**
 * The air band (the mist rising at the frame's foot) under the descent: it
 * follows the front ridge's foot, rising to its full opacity over 14% of the
 * height above it as at rest, then thinning to nothing at the frame's foot
 * over the meadow. Returns its opacity at y, given the air's full opacity.
 */
export function airAt(y, frame, h, airA) {
  const top = frame.front - 0.14 * h;
  if (y <= frame.front) return y > top ? ((y - top) / (0.14 * h)) * airA : 0;
  return airA * (1 - (y - frame.front) / Math.max(1, h - frame.front));
}
