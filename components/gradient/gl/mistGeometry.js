/**
 * The MIST scene's maths, ported one-for-one from the gradient studio's
 * generated SVG engine (deleted in 0.1.8, still in git history before it,
 * with our aspect lock and sun clamp patches) so every renderer draws the
 * same picture from the same recipe; the sky comes from the shared
 * skyRamp.js. The minified names each function came from are noted beside
 * it: if the studio's MIST ever changes, diff a fresh export against those.
 *
 * Everything here is plain JS and runs on the CPU while the scene is moving.
 * The ridge crests (`layout`'s control points + `sampleCrest`) are the
 * exception where float render targets exist: crestShader.js computes those on
 * the GPU, and this CPU version is the fallback and the reference it matches.
 * The GPU does the per-pixel work in mistShader.js.
 */

import { skyRamp } from '../skyRamp';

// ---------------------------------------------------------------- colour

// be
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

// Je — sRGB hex to oklab
function oklab(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const d = c / 255;
    return d <= 0.04045 ? d / 12.92 : Math.pow((d + 0.055) / 1.055, 2.4);
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// Lt — oklab to rounded 8-bit sRGB
function fromOklab(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(i => {
    const c = i <= 0.0031308 ? i * 12.92 : 1.055 * Math.pow(Math.max(0, i), 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(c * 255)));
  });
}

// q / Yn — mix two hex colours in oklab
export function mix(a, b, t) {
  const A = oklab(a);
  const B = oklab(b);
  return toHex(fromOklab(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t));
}

// Se — WCAG relative luminance
function luminance(hex) {
  const f = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// ---------------------------------------------------------------- recipe helpers

// je / oa
const MIST_DEFAULTS = { haze: 50, height: 50, sharp: 55, sun: 64, drift: 55, seed: 7 };
export const mistOf = m => ({ ...MIST_DEFAULTS, ...Object.fromEntries(Object.entries(m ?? {}).filter(([, v]) => v != null)) });

// Gt — piecewise-linear dial: 0 → a, 50 → b, 100 → c
const dial = (v, a, b, c) => (v <= 50 ? a + ((b - a) * v) / 50 : b + ((c - b) * (v - 50)) / 50);

// Ul — "Ranges" slider (size) to a ridge count, fractional
const rangeCount = (size = 50) => 3 + (Math.max(0, Math.min(100, size)) / 100) * 6;

// vn — the haze / air colour
export const mistColour = stops => stops[1] ?? stops[0];

// tr — sun colour: the brightest stop, lifted toward white
export function sunColour(stops) {
  const bright = stops.reduce((best, c) => (luminance(c) > luminance(best) ? c : best), stops[0]);
  return luminance(bright) < 0.5 ? mix(bright, '#F7F4EE', 0.72) : mix(bright, '#FFFFFF', 0.35);
}

// sa — a ridge's base colour at depth t (0 far … 1 near)
export function ridgeColour(stops, t, haze = MIST_DEFAULTS.haze) {
  const ramp = stops.length > 2 ? stops.slice(2) : stops;
  // t < 0: the descent's extra far ranges (`layout`'s `extra`), the far
  // ridge's colour further into the haze.
  const o = Math.max(0, t) * (ramp.length - 1);
  const i = Math.floor(o);
  const c = mix(ramp[i], ramp[Math.min(ramp.length - 1, i + 1)], o - i);
  return mix(c, mistColour(stops), Math.min(0.82, (1 - t) * dial(haze, 0.15, 0.42, 0.7)));
}

// nr — how far a ridge's foot fades into the haze
export const ridgeFootMix = (t, haze = MIST_DEFAULTS.haze) => Math.min(0.98, (0.95 - 0.4 * t) * dial(haze, 0.85, 1, 1.12));
/** (0.2.2) The foot fade a distant range eases to under the descent (its
 * `flat`, camera.js frameAt): each holds its colour as a flat layer down to
 * the range in front of it, so the layers step instead of dissolving into
 * one band of haze. */
export const FAR_FOOT = 0.5;
/** (0.2.2) …and its veil thins by this share, so the mist at its feet
 * doesn't bury the layer in front of it. */
export const FAR_VEIL = 0.5;
// Qs / er — the lit rim along a ridge's crest
export const rimColour = (stops, t, haze) => mix(ridgeColour(stops, t, haze), mistColour(stops), 0.8);
// (Past the far ridge, t < 0: the descent's distant ranges keep the far
// ridge's rim, so each still reads as its own crest in the haze.)
export const rimOpacity = t => 0.2 + 0.22 * Math.max(0, t);
// Pt — Gaussian blur (stdDeviation, CSS px) on the far ridges; applied when > .4.
// (Past the far ridge it eases off again, to .4 of the far ridge's, so the
// distant crests stay distinct lines in the haze rather than smearing into
// one band.)
export const ridgeBlur = (t, h) => (t < 0 ? Math.max(0.4, 1 + t) : (1 - t) * (1 - t)) * 0.006 * h;
// ar — opacity the air gradient reaches at the frame's foot
export const airOpacity = (haze = MIST_DEFAULTS.haze) => dial(haze, 0.08, 0.26, 0.44);

/**
 * What each ridge is painted with, from this frame's palette: the fill's three
 * gradient stops (top, 45%, base), the crest rim's colour and opacity, the
 * blur (Gaussian sigma, CSS px; 0 = crisp) and the fade (a fractional last
 * range). Shared by every renderer that composites the ridges itself (the GL
 * shader, the layered fallback).
 */
export function ridgePaint(stops, ridges, haze, h) {
  const M = mistColour(stops);
  return ridges.map(rd => {
    const A = ridgeColour(stops, rd.t, haze);
    const blur = ridgeBlur(rd.t, h);
    const foot = ridgeFootMix(rd.t, haze);
    return {
      fill: [A, mix(A, M, 0.16), mix(A, M, rd.flat ? foot + (FAR_FOOT - foot) * rd.flat : foot)],
      rim: rimColour(stops, rd.t, haze),
      rimA: rimOpacity(rd.t),
      blur: blur > 0.4 ? blur : 0,
      fade: rd.fade,
    };
  });
}

/** A veil's opacity for a ridge at depth t (as `layout` sets it). Past the
 * far ridge (t < 0) it holds the far ridge's, or the veils would bury the
 * distant ranges. */
export const veilAlpha = (t, haze = MIST_DEFAULTS.haze, fade = 1) =>
  Math.min(0.92, (0.62 - 0.34 * Math.max(0, t)) * dial(haze, 0.25, 1, 1.6)) * fade;

/** The crest rim's stroke width, CSS px. */
export const rimWidth = h => Math.max(1, h * 0.0035);

/** The grain layer's opacity (FINISH · Noise). */
export const grainOpacity = recipe => (Math.max(0, Math.min(100, recipe.grain ?? 0)) / 100) * 0.5;

/** Scale on the veils' animation durations from the recipe's `speed`. */
export const veilSpeedScale = speed => (speed == null || speed <= 0 ? 1 : 50 / Math.max(1, speed));

// ---------------------------------------------------------------- ridge noise

// Hl
const hash = e => {
  const t = Math.sin(e) * 43758.5453;
  return t - Math.floor(t);
};

// _o — 1D value noise, smoothstep-interpolated
function noise1(e, t) {
  const n = Math.floor(e);
  const a = e - n;
  const o = a * a * (3 - 2 * a);
  const s = r => hash(r * 127.1 + t * 311.7);
  return s(n) + (s(n + 1) - s(n)) * o;
}

// Vl — ridge height profile at x (0..1 across the reference frame)
function ridgeProfile(e, t, n, sharp = MIST_DEFAULTS.sharp) {
  const o = 1.7 + t * 0.33;
  const s = t * 7.31 + 13.7;
  const r = sharp / 100;
  const i = (l, u) => {
    const p = noise1(e * l + n, u) * 2 - 1;
    const m = 1 - Math.abs(p);
    const f = 1 - p * p;
    return f + (m - f) * r;
  };
  const c = 0.52 * i(o, s) + 0.3 * i(o * 2.15, s + 1.77) + 0.18 * i(o * 4.4, s + 3.31);
  const d = 0.55 + 0.45 * Math.pow(noise1(e * 1.13 + n * 0.51, s + 5.2), 1.4);
  return Math.pow(Math.max(0, c), 1 + r * 0.9) * d;
}

// ---------------------------------------------------------------- scene layout

const POINTS = 110; // jo

/**
 * Xs — ridges, veils and sun for a w × h (CSS px) frame. `aspect` is the
 * recipe's studio canvas aspect (the aspect lock: ridges are height-locked and
 * sampled around the frame centre; the sun is clamped off the edges).
 * `crests: false` skips the control points (`ys`) when the GPU crest pass
 * (crestShader.js) computes them instead; everything else is unchanged.
 *
 * `scales` (the descent camera, ../camera.js): each ridge's scale about the
 * vanishing point. A ridge drawn smaller spans more of its noise across the
 * frame, so its control points run `E` extra spacings past each end (`ys[0]`
 * is point −E). With no scales, or all 1, it's the studio's layout exactly.
 *
 * `extra` (the descent camera, as it opens the view): up to that many more
 * ranges (fractional, the last fading in; at most MAX_RANGES in all), each
 * in a gap between two of the recipe's, farthest gap first: the ranges a
 * nearer one hid until the camera climbed. Each sits at the geometric mean
 * of its neighbours' depths, a little lower than them, coloured between
 * them. Every ridge carries `noise`, the index its noise is hashed with (its
 * own, so a ridge keeps its silhouette as ranges join), and `extra` on the
 * new ones. Ridges stay in paint order, far first.
 */
export const MAX_RANGES = 9;
export const EXTRA_LOW = 0.8; // an extra range's height, share of its neighbours'
export const crestExtension = (s, w, h, dx) =>
  s >= 1 ? 0 : Math.max(0, Math.ceil(((1 / s - 1) * (w / 2 + 0.03 * h)) / dx - 1e-9));

export function layout(w, h, { size, horizon = 0.42, mist, aspect, crests = true, scales = null, extra = 0, ranges = null, drift = null }) {
  const U = aspect ? h * aspect : w;
  const Q = Math.max(POINTS, Math.ceil((POINTS * w) / U));
  const r = rangeCount(size);
  const count = Math.ceil(r - 0.001);
  const c = Math.max(0.14, Math.min(0.62, horizon)) * h;
  const d = h - c;
  const lift = dial(mist.height, 0.35, 1, 1.9);
  const hazeK = dial(mist.haze, 0.25, 1, 1.6);
  const seed = mist.seed * 0.73;

  // The descent's extra ranges: how many (the last fractional).
  const more = count > 1 ? Math.max(0, Math.min(extra, MAX_RANGES - count, count - 1)) : 0;
  const m = more > 0 ? Math.ceil(more - 0.001) : 0;
  const x0 = -0.03 * h;
  const dx = (w + 0.06 * h) / Q;

  const ridges = [];
  for (let b = 0; b < count; b++) {
    const t = Math.min(1, b / Math.max(1e-4, r - 1));
    const fade = Math.max(0, Math.min(1, r - b));
    const base = c + Math.pow((b + 1) / r, 1.3) * d;
    const L = (0.12 + 0.26 * t) * d * lift * 1.35;
    ridges.push({ x0, dx, Q, U, L, ys: null, E: 0, cx: w / 2, top: base - L, base, t, fade, noise: b });
  }

  const veils = ridges.map((ridge, b) => {
    const gap = ridge.base - (b === 0 ? c : ridges[b - 1].base);
    const first = b === 0;
    return {
      cx: (b % 2 === 0 ? 0.32 : 0.68) * w + Math.sin(b * 2.1) * 0.06 * w,
      cy: ridge.base + (first ? gap * 0.22 : 0),
      rx: 0.62 * Math.max(w, U),
      ry: first ? Math.max(0.085 * h, gap * 0.95) : Math.max(0.05 * h, gap * 0.6),
      a: Math.min(0.92, (0.62 - 0.34 * ridge.t) * hazeK) * ridge.fade,
    };
  });

  // Extra ranges into the gaps, far gap first; then all in paint order.
  if (m) {
    const own = ridges.slice();
    const depth = rd => d / Math.max(1e-3, rd.base - c);
    for (let j = 0; j < m; j++) {
      const a = own[j];
      const n = own[j + 1];
      const noise = count + j;
      const base = c + d / Math.sqrt(depth(a) * depth(n));
      const L = EXTRA_LOW * Math.sqrt(a.L * n.L);
      const t = (a.t + n.t) / 2;
      const fade = Math.max(0, Math.min(1, more - j));
      const at = ridges.indexOf(n);
      ridges.splice(at, 0, { x0, dx, Q, U, L, ys: null, E: 0, cx: w / 2, top: base - L, base, t, fade, noise, extra: true });
      veils.splice(at, 0, {
        cx: (noise % 2 === 0 ? 0.32 : 0.68) * w + Math.sin(noise * 2.1) * 0.06 * w,
        cy: base,
        rx: 0.62 * Math.max(w, U),
        ry: Math.max(0.05 * h, (base - a.base) * 0.6),
        a: Math.min(0.92, (0.62 - 0.34 * t) * hazeK) * fade,
      });
    }
  }

  // The descent's world ranges (camera.js DESCENT.ranges): ridges placed by
  // depth `z` (the frame's foot = 1) and world height (`height` × h at depth
  // 1), which the camera brings into view by geometry alone — from below the
  // frame (z < 1) or from behind the far ridge (z beyond it). Each has its
  // own noise index; all ridges then go in depth order, far first.
  if (ranges?.length) {
    ranges.forEach((g, j) => {
      const base = c + d / g.z;
      // A `stretch` widens the silhouette: drawn `stretch` × larger by the
      // camera (camera.js frameAt), so its height is set that much lower.
      const L = (g.height * h) / g.z / (g.stretch ?? 1);
      const noise = count + j;
      ridges.push({ x0, dx, Q, U, L, ys: null, E: 0, cx: w / 2, top: base - L, base, t: 0, fade: 1, noise, extra: true, z: g.z, stretch: g.stretch ?? 1, drop: g.drop ?? 0, until: g.until ?? 1 });
      veils.push({
        cx: (noise % 2 === 0 ? 0.32 : 0.68) * w + Math.sin(noise * 2.1) * 0.06 * w,
        cy: base,
        rx: 0.62 * Math.max(w, U),
        // (A distant range's veil is as shallow as the range: the resting
        // floor of .05h would bury it.)
        ry: Math.max(g.z > 1 ? 0.012 * h : 0.05 * h, (0.6 * d) / g.z),
        a: 0,
      });
    });
    const order = ridges.map((rd, i) => i).sort((a, b) => ridges[a].base - ridges[b].base);
    const rs = order.map(i => ridges[i]);
    const vs = order.map(i => veils[i]);
    ridges.splice(0, ridges.length, ...rs);
    veils.splice(0, veils.length, ...vs);
  }

  // Crests: each ridge's control points, over its scaled span (`scales` is
  // in this final order). `drift` ({ offset, gains }, the idle drift, gains
  // in this order too) adds offset × gain to each ridge's seed; with no gains
  // it's mist.seed + offset for all, as ever.
  if (crests) {
    ridges.forEach((rd, i) => {
      const E = scales ? crestExtension(scales[i] ?? 1, w, h, dx) : 0;
      const ys = new Float64Array(Q + 1 + 2 * E);
      const n = drift ? (mist.seed + drift.offset * (drift.gains?.[i] ?? 1)) * 0.73 : seed;
      for (let I = -E; I <= Q + E; I++) {
        const X = x0 + I * dx;
        ys[I + E] = rd.base - rd.L * ridgeProfile((X - w / 2) / U + 0.5, rd.noise, n, mist.sharp);
      }
      rd.ys = ys;
      rd.E = E;
    });
  }

  const sunX = aspect
    ? Math.min(Math.max((mist.sun / 100) * w, 0.078 * h), Math.max(w - 0.078 * h, w / 2))
    : (mist.sun / 100) * w;
  const sun = { x: sunX, y: Math.max(0.1 * h, c - 0.11 * h), r: 0.052 * h };

  return { ridges, veils, sun, horizon: c, ranges: r };
}

/**
 * Zs — the crest as the engine draws it: a Catmull-Rom spline through the
 * points, written as cubic Béziers. Points are evenly spaced in x, so on every
 * interior segment x(τ) is linear and τ follows from x directly. Writes the
 * crest's y (CSS px) at each device-pixel column centre into `out`.
 *
 * `cam` ({ s, foot }, from ../camera.js) draws the ridge scaled by `s` about
 * the frame's centre line with its foot at `foot`: a column samples the
 * curve at its source x, and the height is scaled onto the new foot.
 * crestShader.js does exactly this on the GPU.
 */
export function sampleCrest(ridge, columns, dpr, out, offset = 0, cam = null) {
  const { x0, dx, ys, E = 0, cx, base } = ridge;
  const last = ys.length - 1;
  const moved = cam && (cam.s !== 1 || cam.foot !== base);
  for (let col = 0; col < columns; col++) {
    const x = moved ? cx + ((col + 0.5) / dpr - cx) / cam.s : (col + 0.5) / dpr;
    // Point indices run −E … Q + E; `ys[k]` holds point k − E.
    let n = Math.floor((x - x0) / dx) + E;
    n = n < 0 ? 0 : n > last - 1 ? last - 1 : n;
    const u = Math.min(1, Math.max(0, (x - (x0 + (n - E) * dx)) / dx));
    const a = ys[n > 0 ? n - 1 : 0];
    const o = ys[n];
    const s = ys[n + 1];
    const r = ys[n + 2 <= last ? n + 2 : last];
    const c1 = o + (s - a) / 6;
    const c2 = s - (r - o) / 6;
    const v = 1 - u;
    const y = v * v * v * o + 3 * v * v * u * c1 + 3 * v * u * u * c2 + u * u * u * s;
    out[offset + col] = moved ? cam.foot + (y - base) * cam.s : y;
  }
}

/**
 * The sky gradient as CSS paints it — the shared smooth ramp (skyRamp.js),
 * blended linearly in sRGB between its dense stops and padded
 * past the ends — baked into `size` RGBA texels.
 */
export function bakeSky(stops, divs, size, out) {
  const list = skyRamp(stops, divs).map(([p, c]) => [p, hexToRgb(c)]);
  let k = 0;
  for (let i = 0; i < size; i++) {
    const y = (i + 0.5) / size;
    while (k < list.length - 2 && y > list[k + 1][0]) k++;
    let rgb;
    if (y <= list[0][0]) rgb = list[0][1];
    else if (y >= list[list.length - 1][0]) rgb = list[list.length - 1][1];
    else {
      const [p0, c0] = list[k];
      const [p1, c1] = list[k + 1];
      const f = (y - p0) / Math.max(1e-6, p1 - p0);
      rgb = c0.map((v, j) => v + (c1[j] - v) * f);
    }
    out[i * 4] = Math.round(rgb[0]);
    out[i * 4 + 1] = Math.round(rgb[1]);
    out[i * 4 + 2] = Math.round(rgb[2]);
    out[i * 4 + 3] = 255;
  }
}

// ---------------------------------------------------------------- veil drift

// CSS `ease-in-out` = cubic-bezier(.42, 0, .58, 1), solved for y at x.
function easeInOut(x) {
  const bez = (t, p1, p2) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 20; i++) {
    const v = bez(t, 0.42, 0.58);
    if (Math.abs(v - x) < 1e-5) break;
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return bez(t, 0, 1);
}

// An `infinite alternate` CSS animation's eased progress at `phase` (cycles).
export function alternate(phase) {
  const k = Math.floor(phase);
  const f = phase - k;
  return easeInOut(k % 2 === 0 ? f : 1 - f);
}

/**
 * The engine's per-veil CSS animation timing: drift duration (s, before the
 * speed scale) and amplitude (px). Both come from the target drift, not the
 * sprung one, exactly as the SVG's inline custom properties do.
 */
export function veilTiming(i, drift, w) {
  const E = 1.7 - (1.4 * drift) / 100;
  const N = 0.02 + (0.08 * drift) / 100;
  return {
    duration: Number(((30 + i * 9) * E).toFixed(1)),
    amp: Number(((i % 2 === 0 ? 1 : -1) * w * N).toFixed(0)),
  };
}
