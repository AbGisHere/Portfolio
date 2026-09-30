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
 * Every sky path uses this — the GL renderer's sky texture, the layered
 * renderer's sky gradient and the CSS backdrop — so they can't diverge.
 */

import { hexToLms, lmsToHex, mix } from './colour';

// Stop positions: mid-band between the `divs` boundaries, as the studio does.
export function stopPositions(count, divs) {
  const inner =
    divs?.length === count - 1 ? divs : Array.from({ length: count - 1 }, (_, i) => (i + 1) / count);
  const edges = [0, ...inner, 1];
  return Array.from({ length: count }, (_, i) => (edges[i] + edges[i + 1]) / 2);
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

/**
 * The colour at `f` (0 top … 1 bottom) of a ramp from skyRamp(), mixed in
 * oklab between its samples. The layered renderer uses it for a body's
 * `wash`; the GL renderer samples its sky texture instead.
 */
export function rampAt(ramp, f) {
  const x = Math.min(1, Math.max(0, f));
  if (x <= ramp[0][0]) return ramp[0][1];
  for (let i = 1; i < ramp.length; i++) {
    if (x <= ramp[i][0]) {
      const [x0, c0] = ramp[i - 1];
      const [x1, c1] = ramp[i];
      return mix(c0, c1, (x - x0) / Math.max(1e-6, x1 - x0));
    }
  }
  return ramp[ramp.length - 1][1];
}
