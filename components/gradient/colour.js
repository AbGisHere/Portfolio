/**
 * Colour maths shared by every renderer: hex ↔ 8-bit RGB, gamma-encoded RGB
 * mixing (the shader's mix()), and oklab, in which the studio mixes its
 * colours (`mix`) and the sky ramps interpolate (skyRamp.js, skyKeys.js).
 */

/** '#rrggbb' → [r, g, b], 0–255. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A hex colour as 0…1 channels (the shader's uniforms). */
export const rgb01 = hex => hexToRgb(hex).map(c => c / 255);

/** [r, g, b] (0–255, may be fractional) → '#rrggbb', rounded and clamped. */
export const rgbToHex = c =>
  `#${c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')}`;

/** Two colours (hex or 0–255 RGB) mixed in gamma-encoded RGB, like the
 * shader's mix(): 0–255 float RGB, unrounded. */
export const mixRgb = (a, b, t) => {
  const A = typeof a === 'string' ? hexToRgb(a) : a;
  const B = typeof b === 'string' ? hexToRgb(b) : b;
  return A.map((v, i) => v + (B[i] - v) * t);
};

// sRGB transfer, one 0…1 channel each way.
const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);

/** sRGB hex → oklab's cube-root LMS space (a linear map of oklab, so
 * interpolating here is interpolating in oklab). */
export function hexToLms(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => toLinear(c / 255));
  return [
    Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
    Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b),
  ];
}

/** Cube-root LMS → rounded, clamped 8-bit sRGB. */
function lmsToRgb([l, m, s]) {
  l **= 3;
  m **= 3;
  s **= 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(c => Math.max(0, Math.min(255, Math.round(toSrgb(c) * 255))));
}

/** Cube-root LMS → '#rrggbb'. */
export const lmsToHex = lms => rgbToHex(lmsToRgb(lms));

// Je — sRGB hex to oklab
export function oklab(hex) {
  const [l, m, s] = hexToLms(hex);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// Lt — oklab to rounded 8-bit sRGB
export const fromOklab = (L, a, b) =>
  lmsToRgb([L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.291485548 * b]);

// q / Yn — mix two hex colours in oklab
export function mix(a, b, t) {
  const A = oklab(a);
  const B = oklab(b);
  return rgbToHex(fromOklab(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t));
}
