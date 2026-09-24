import { hexToLms, lmsToHex, tangents } from './skyRamp';

/**
 * A palette partway through a switch that passes through in-between skies.
 *
 * `keys` is [{ at, stops }, …] with `at` running 0 → 1 across the switch:
 * where the sky starts, any in-between palettes (a recipe's
 * `transition.via`, e.g. dawn and day on the way to dusk), and the target
 * scene. Each stop is blended through the keyframes in oklab, on the same
 * monotone cubic (Fritsch–Carlson) the sky ramp uses across the frame: every
 * keyframe colour is hit exactly, with no overshoot and no corner — a
 * straight blend would visibly jolt as it passes each keyframe.
 *
 * @param {{ at: number, stops: string[] }[]} keys sorted by `at`
 * @param {number} e progress, 0..1
 * @returns {string[]} hex stops
 */
export function paletteAt(keys, e) {
  if (keys.length === 1) return keys[0].stops;
  const x = keys.map(k => k.at);
  let i = 0;
  while (i < keys.length - 2 && e > x[i + 1]) i++;
  const h = x[i + 1] - x[i];
  const u = Math.min(1, Math.max(0, (e - x[i]) / h));
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return keys[0].stops.map((_, s) => {
    const lms = keys.map(k => hexToLms(k.stops[s]));
    const c = [0, 1, 2].map(k => {
      const y = lms.map(v => v[k]);
      const m = tangents(x, y);
      return h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1];
    });
    return lmsToHex(c);
  });
}
