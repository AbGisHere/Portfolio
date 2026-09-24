import { useEffect, useRef, useState } from 'react';
import { mistOf, mix, sunColour } from './gl/mistGeometry';
import { paletteAt } from './skyKeys';
import { skyRamp } from './skyRamp';

/**
 * The sky turning between two scenes: the motion of a day/night switch, shared
 * by both renderers (the GL renderer calls these each frame; the SVG engine
 * through `useSkyOrbit`, engine patch 10).
 *
 * At rest a scene is its recipe, held by the spring. In a switch the sky turns
 * right to left — the viewer faces north, east on the right, west on the
 * left — on one sine ease-in-out lasting the target's `transition.ms`, and
 * everything keeps time with it:
 *
 * - The bodies ride one arc through both resting spots. The outgoing one
 *   carries on and sets behind the far ridge on the left; the incoming one
 *   rises from behind it on the right and climbs to its spot, in parallel.
 *   Dusk → night is the sun setting as the moon rises; night → dusk is the
 *   moon going over (fading out as the morning comes, never setting) while
 *   the sun comes up on the right and crosses the sky to its dusk spot. Both
 *   turn through the same angle, so they keep their distance, like a sky.
 * - The palette passes through the target's `transition.via` keyframes
 *   (dawn, day, late afternoon on the way to dusk; blue hour on the way to
 *   night). The ridges' colours come from the palette, so they're relit
 *   every frame with it.
 * - The geometry dials (ranges, horizon, haze, peaks, sharp, sun, seed) ease
 *   from wherever they were — the seed included, idle drift and all — to the
 *   target's, so the ridges reshape as the sun travels.
 */

/** How many leading entries of the spring vector are geometry. */
export const GEO = 7;

/** Where a disc is fully under the far ridge, the arc meets it at this angle
 * (radians) rather than straight down, so bodies slant in and out. */
export const SET_ANGLE = 0.3;

/** Past the resting spots — the legs into and out of the ridges — sideways
 * travel is stretched by this much: a setting sun slants further left. */
export const SET_SPREAD = 1.3;

export const ease = u => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
const smooth = (lo, hi, x) => ease((x - lo) / (hi - lo));

/** A body's resting x: mist.sun% of the width, clear of the edges (patch 8). */
export const restX = (pct, w, h) => Math.min(Math.max((pct / 100) * w, 0.078 * h), Math.max(w - 0.078 * h, w / 2));

/**
 * A switch from `prev` to `next`, starting from what was last painted.
 * @param {number[]} geo  the geometry dials as painted (seed including drift)
 * @param {string[]} stops the palette as painted
 */
export function beginOrbit(prev, next, geo, stops) {
  return {
    prev,
    next,
    dur: (next.transition?.ms ?? 1250) / 1000,
    geo: geo.slice(0, GEO),
    keys: [{ at: 0, stops }, ...(next.transition?.via ?? []), { at: 1, stops: next.stops }],
  };
}

/** The target's geometry dials, in spring-vector order. */
export function targetGeo(recipe) {
  const m = mistOf(recipe.mist);
  return [recipe.size ?? 50, recipe.glintHorizon ?? 0.42, m.haze, m.height, m.sharp, m.sun, m.seed];
}

/** Geometry dials and palette at eased progress `e`. */
export function orbitScene(orbit, e) {
  const to = targetGeo(orbit.next);
  return {
    geo: orbit.geo.map((v, i) => v + (to[i] - v) * e),
    stops: paletteAt(orbit.keys, e),
  };
}

/**
 * The two bodies at eased progress `e`, each { x, y, r, col, glow, alpha,
 * wash }: `glow` fades as the disc goes under (no halo left over the ridges),
 * `alpha` is the disc's opacity (the moon's), `wash` how far its colour leans
 * toward the sky right behind it (the renderer mixes that in).
 *
 * The arc is an ellipse through both resting spots, topping out
 * `transition.apex` of the height from the top and meeting the "fully hidden"
 * line (a radius and a quarter under the far ridge's base) at SET_ANGLE.
 *
 * @param {{x:number,y:number,r:number}} sun the target's resting sun
 * @param {{base:number}[]} ridges this frame's ridges (far first)
 */
export function orbitBodies(orbit, e, { w, h, sun, ridges }) {
  const pa = mistOf(orbit.prev.mist).sun;
  const pb = mistOf(orbit.next.mist).sun;
  const xa = restX(pa, w, h);
  const xb = restX(pb, w, h);
  const cx = (xa + xb) / 2;
  const hidden = ridges[0] ? ridges[0].base + 1.25 * sun.r : sun.y + 3 * sun.r;
  const top = Math.min(sun.y, (orbit.next.transition?.apex ?? 0.12) * h);
  const sa = Math.sin(SET_ANGLE);
  const cy = (hidden - top * sa) / (1 - sa);
  const ry = Math.max(1, cy - top);
  const rest0 = Math.max(SET_ANGLE + 0.01, Math.asin(Math.min(1, Math.max(0, (cy - sun.y) / ry))));
  const rx = Math.abs(xb - xa) / 2 / Math.cos(rest0);
  const edge = rx * Math.cos(rest0);
  // Angles run SET_ANGLE (hidden, east/right) → π/2 (top) → π − SET_ANGLE
  // (hidden, west/left).
  const angleAt = (x, fallback) => (x > cx ? rest0 : x < cx ? Math.PI - rest0 : fallback);
  const from = angleAt(xa, Math.PI - rest0);
  const to = angleAt(xb, rest0);
  // 0 night … 1 day, for the moon's paleness.
  const daylight = orbit.next.body === 'sun' ? e : orbit.prev.body === 'sun' ? 1 - e : 1;

  const at = (a, recipe, going) => {
    const y = cy - ry * Math.sin(a);
    const low = Math.min(1, Math.max(0, (y - sun.y) / Math.max(1, hidden - sun.y)));
    const moon = recipe.body === 'moon';
    const c = rx * Math.cos(a);
    return {
      x: cx + (Math.abs(c) > edge ? Math.sign(c) * (edge + (Math.abs(c) - edge) * SET_SPREAD) : c),
      y,
      r: sun.r,
      col: sunColour(recipe.stops),
      glow: (1 - low) ** 2,
      // The moon lingers faintly as the sun comes up (a 6 a.m. moon) and is
      // gone before dawn turns to day; in the evening it's full once it's
      // clear of the ridges.
      alpha: moon ? (going ? 1 - smooth(0, 0.3, e) : smooth(0, 0.5, e)) : 1,
      // Pale in a bright sky (moon); warming toward the horizon (sun).
      wash: moon ? 0.6 * daylight : 0.5 * low,
    };
  };
  return [
    at(from + (Math.PI - SET_ANGLE - from) * e, orbit.prev, true), // going
    at(SET_ANGLE + (to - SET_ANGLE) * e, orbit.next, false), // coming
  ];
}

/**
 * The SVG engine's clock for a switch (engine patch 10). Call every render
 * with the target recipe and what's being painted now; returns null at rest,
 * or { orbit, e } mid-switch, re-rendering each frame until it lands. The GL
 * renderer keeps its own clock (it only runs while the scene is visible).
 */
export function useSkyOrbit(recipe, geo, stops) {
  // The engine may hand over a fresh recipe object each render, so a scene
  // change is told by content, not identity.
  const key = recipe ? `${recipe.name}|${recipe.stops.join()}` : '';
  const state = useRef({ key, recipe, orbit: null, t0: 0, geo, stops });
  const [, tick] = useState(0);
  const s = state.current;
  if (key !== s.key) {
    // Starts from what was last painted (the previous render's values).
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    s.orbit = reduce ? null : beginOrbit(s.recipe, recipe, s.geo, s.stops);
    s.t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    s.recipe = recipe;
    s.key = key;
  }
  const running = !!s.orbit;
  useEffect(() => {
    if (!running) return undefined;
    let raf = requestAnimationFrame(function f() {
      tick(n => n + 1);
      if (state.current.orbit) raf = requestAnimationFrame(f);
    });
    return () => cancelAnimationFrame(raf);
  }, [running, key]);
  if (!s.orbit) {
    s.geo = geo;
    s.stops = stops;
    return null;
  }
  const u = (performance.now() - s.t0) / 1000 / s.orbit.dur;
  if (u >= 1) {
    // Landed. Hold the target until the spring (which carries the resting
    // scene) has settled on it too, so handing back doesn't nudge anything.
    const tg = targetGeo(recipe);
    const settled = geo.every((v, i) => v === tg[i]) && stops.every((c, i) => c.toLowerCase() === recipe.stops[i].toLowerCase());
    if (settled) {
      s.orbit = null;
      s.geo = geo;
      s.stops = stops;
      return null;
    }
  }
  const e = ease(u);
  const scene = orbitScene(s.orbit, e);
  s.geo = scene.geo;
  s.stops = scene.stops;
  return { orbit: s.orbit, e, ...scene };
}

/**
 * The sky's colour at `f` (0 top … 1 bottom) of the frame, from the same ramp
 * every renderer paints. The SVG engine uses it for a body's `wash`; the GL
 * renderer samples its sky texture instead.
 */
export function skyAt(stops, divs, f) {
  const ramp = skyRamp(stops, divs);
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
