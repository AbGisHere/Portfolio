import { mix, ridgeColour } from './gl/mistGeometry';
import { ease } from './orbit';
import { paletteAt } from './skyKeys';
import { SUNSET_COLOUR, SUNSET_MIX } from './sunLook';

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
  const out = ridges.map((rd, i) => {
    const s = ridgeScales([rd], c, h, cam)[0];
    return { s, foot: horizon + (1 + cam.rise) * s * (rd.base - c) };
  });
  return { rest: false, k: cam.k ?? 1, shift, horizon, ridges: out, front: out.length ? out[out.length - 1].foot : h };
}

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
 * A sun or moon under the descent, moved from its resting spot by its
 * recipe's `scroll.body` ({ dx, dy }: where it is on screen by `about` = 1,
 * relative to that spot, in shares of the height; −dy is up), on the
 * camera's clock and reach (`frame.k`). That's the net of the camera
 * tilting (the sky goes up by `frame.shift`) and the body's own move: the
 * sun ends lower in the sky, just clear of the far ridges, and deepens
 * toward the sunset colour (sunLook.js) as it sinks. It stays round and
 * keeps its size: it's at infinity, so the camera moving back doesn't
 * change it, and the low-sun flattening belongs to a real sunset (a switch).
 * `hidden` is where a disc is fully under the far ridge (orbit.js). Bodies
 * mid-switch (`look: false`) keep their switch look and only move: the arc
 * is orbit.js's, in the unscrolled sky, offset whole, never squeezed into
 * the visible sky, so a body can leave the top of the frame mid-arc.
 */
export function bodyAt(b, recipe, frame, { w, h, hidden, restY, look = true }) {
  const m = recipe?.scroll?.body;
  const dx = (m?.dx ?? 0) * h * frame.k;
  const dy = (m?.dy ?? 0) * h * frame.k;
  if (!dx && !dy) return b;
  // At rest the body stays clear of the frame's edges (the sun clamp); a
  // switch's arc keeps its full shape, off the frame and all.
  const r = b.r;
  const x = look ? Math.min(Math.max(b.x + dx, 1.5 * r), Math.max(w - 1.5 * r, w / 2)) : b.x + dx;
  const out = { ...b, x, y: b.y + dy };
  // How far it has sunk in the sky: its move, less the sky's.
  const sink = dy + frame.shift;
  if (look && b.face === 0 && sink > 0) {
    const low = clamp01(sink / Math.max(1, hidden - restY));
    out.col = mix(b.col, SUNSET_COLOUR, SUNSET_MIX * low);
    out.wash = 0.2 * low;
  }
  return out;
}

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
