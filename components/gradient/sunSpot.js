/**
 * Where the sun (or moon) is painted: its centre in CSS px of the scene, the
 * same numbers as `data-sun-cx` / `data-sun-cy`. Outside React, like the
 * descent's progress (../scroll/descent.js): the renderer that paints writes
 * it every rebuild, and the hit target (SunToggle) reads it and moves itself,
 * so it sits on the painted body at any scroll without a render.
 *
 * At rest that's the body as painted; mid-switch, where the incoming one will
 * land. Null until a renderer has painted (the toggle then places itself from
 * the recipe, in CSS).
 */

let spot = null;
const listeners = new Set();

export const getSunSpot = () => spot;

export function publishSunSpot(x, y) {
  if (spot && Math.abs(spot.x - x) < 0.01 && Math.abs(spot.y - y) < 0.01) return;
  spot = { x, y };
  for (const fn of listeners) fn(spot);
}

export function subscribeSunSpot(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
