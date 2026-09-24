/**
 * A recipe's sky as a dense list of [offset 0..1, '#rrggbb'] stops.
 *
 * The studio draws straight oklab segments between its stops. Wherever the
 * slope changes sharply — a big step next to small ones, or a ramp that
 * lightens then darkens (moonlit's #3A4A6B → #33415F) — the eye reads the
 * corner as a line (Mach banding). This passes a monotone cubic
 * (Fritsch–Carlson) through the same stops instead: it hits every recipe
 * colour exactly at the studio's positions, never overshoots between them,
 * and has no corners. Flat tangents at the ends ease into the solid bands
 * above the first stop and below the last.
 *
 * Every sky path uses this — the GL renderer's sky texture, the SVG engine's
 * sky gradient (engine patch 6) and the CSS backdrop — so they can't diverge.
 */

// Stop positions: mid-band between the `divs` boundaries, as the studio does.
export function stopPositions(count, divs) {
  const inner =
    divs?.length === count - 1 ? divs : Array.from({ length: count - 1 }, (_, i) => (i + 1) / count);
  const edges = [0, ...inner, 1];
  return Array.from({ length: count }, (_, i) => (edges[i] + edges[i + 1]) / 2);
}

// sRGB hex <-> oklab's cube-root LMS space (a linear map of oklab, so
// interpolating here is interpolating in oklab).
const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);

export function hexToLms(hex) {
  const [r, g, b] = [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return [
    Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
    Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b),
  ];
}

export function lmsToHex([l, m, s]) {
  l **= 3;
  m **= 3;
  s **= 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    rgb
      .map(c => Math.max(0, Math.min(255, Math.round(toSrgb(c) * 255))).toString(16).padStart(2, '0'))
      .join('')
  );
}

// Fritsch–Carlson tangents for one channel: zero at extrema and at the ends,
// limited elsewhere so the curve stays monotone between neighbouring stops.
export function tangents(x, y) {
  const n = y.length;
  const d = x.slice(1).map((xi, i) => (y[i + 1] - y[i]) / (xi - x[i]));
  const m = y.map((_, i) => (i === 0 || i === n - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return m;
}

/**
 * @param {string[]} stops  recipe stops, top to bottom
 * @param {number[]} [divs] recipe band boundaries
 * @param {number} [perSegment] samples between neighbouring stops
 */
export function skyRamp(stops, divs, perSegment = 8) {
  if (stops.length < 2) return [[0, stops[0]], [1, stops[0]]];
  const x = stopPositions(stops.length, divs);
  const lms = stops.map(hexToLms);
  const channels = [0, 1, 2].map(k => lms.map(c => c[k]));
  const slopes = channels.map(y => tangents(x, y));

  const out = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const h = x[i + 1] - x[i];
    for (let j = 0; j < perSegment; j++) {
      const u = j / perSegment;
      const u2 = u * u;
      const u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;
      const c = channels.map(
        (y, k) => h00 * y[i] + h10 * h * slopes[k][i] + h01 * y[i + 1] + h11 * h * slopes[k][i + 1],
      );
      out.push([x[i] + h * u, j === 0 ? stops[i] : lmsToHex(c)]);
    }
  }
  out.push([x[x.length - 1], stops[stops.length - 1]]);
  return out;
}
