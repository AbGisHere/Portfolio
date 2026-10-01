/**
 * The 0.3 camera: the S from where the 0.2 pull-back leaves the camera down
 * onto the desk in the meadow and round to face it (ROADMAP.md, "The
 * descent"). Pure: a function of `desk` (the stretch's scroll progress, 0 … 1)
 * and the frame, read every frame and never sprung.
 *
 * The 0.2 camera (camera.js) is a camera with a vertical image plane and a
 * lens shift: `back` and `rise` move it, `tilt` shifts the image up. This one
 * keeps that model for everything far away (the ridges, the sky, the bodies
 * are all drawn on that virtual image plane, unchanged) and adds what 0.2
 * never needed: a real **pitch**. Rotating a camera about its centre maps its
 * image by a homography that doesn't depend on depth, so the shader takes
 * each screen pixel back to the virtual plane (`toVirtual`) and paints it as
 * before; rays that leave the plane behind (looking down past the vertical
 * plane's reach) only see the ground. Near things (the ground, the desk) are
 * traced from the ray itself.
 *
 * World units: the rest camera's eye height is 1 (camera.js's ground plane),
 * and one unit is WORLD_M metres, which sizes the desk. The 0.2 camera ends
 * about 64 m up: the descent really is one.
 */

import { depthOf, descentAt, frameAt, skyUnder } from './camera';
import { mix } from './colour';
import { DESK_STOPS } from '../scroll/stops';

/** Metres per world unit (the rest camera's eye height). */
export const WORLD_M = 40;

/** The desk, for now a grey box (metres): width (x), height, depth (z). */
export const DESK_BOX = { w: 1.2, h: 0.75, d: 0.7 };

/**
 * The path, as keyframes over `desk` (0 … 1), each channel eased through
 * them on a monotone cubic (no overshoot; a repeated key is a hold):
 * - `d`: metres from the camera to the desk along the view (+: the camera is
 *   on the mountains' side of the desk, −: past it, looking back at it).
 * - `y`: the camera's height over the ground, metres (eased in log space, so
 *   the drop from the sky to the desk reads at an even pace).
 * - `pitch`: degrees down, on top of the 0.2 lens shift.
 * - `centre`: how far the screen's optical centre has moved from the 0.2
 *   horizon row to the frame's middle (0 → 1): the lens shift going away.
 * - `zoom`: focal length over the 0.2 one (narrows at the very end).
 * Keys without `d` and `y` are where 0.2 ends (filled in from the descent:
 * `d0` is how far the desk is behind that camera). The two holds are the
 * scroll's stops (../scroll/stops.js): the end of the pull-back, the sun half
 * set, and the top-down shot.
 */
export const DESK_PATH = {
  d0: 60,
  keys: [
    // Where the pull-back ends, held.
    { at: 0, pitch: 0, centre: 0, zoom: 1 },
    { at: 0.05, pitch: 0, centre: 0, zoom: 1 },
    // Down first, looking ahead: the mountains stay in the frame while the
    // camera drops, then it tips over to look straight down.
    { at: 0.18, d: 34, y: 30, pitch: 18, centre: 0.3, zoom: 1 },
    { at: 0.32, d: 10, y: 10, pitch: 46, centre: 0.7, zoom: 1 },
    { at: 0.4, d: 3, y: 4.5, pitch: 78, centre: 0.95, zoom: 1 },
    // The top-down shot over the closed lid, held.
    { at: 0.46, d: 0, y: 2.6, pitch: 90, centre: 1, zoom: 1 },
    { at: 0.54, d: 0, y: 2.6, pitch: 90, centre: 1, zoom: 1 },
    { at: 0.68, d: -1.3, y: 1.9, pitch: 52, centre: 1, zoom: 1 },
    { at: 0.82, d: -1.0, y: 1.2, pitch: 18, centre: 0.9, zoom: 1.05 },
    // The reading position, held.
    { at: 0.92, d: -0.7, y: 1.02, pitch: 8, centre: 0.85, zoom: 1.15 },
    { at: 1, d: -0.7, y: 1.02, pitch: 8, centre: 0.85, zoom: 1.15 },
  ],
};

/** Monotone cubic (Fritsch–Carlson) through (xs, ys), flat at both ends. */
function monotone(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  const dk = [];
  for (let i = 0; i < n - 1; i++) dk.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [0];
  for (let i = 1; i < n - 1; i++) m.push(dk[i - 1] * dk[i] <= 0 ? 0 : (dk[i - 1] + dk[i]) / 2);
  m.push(0);
  for (let i = 0; i < n - 1; i++) {
    if (dk[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / dk[i];
    const b = m[i + 1] / dk[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * dk[i];
      m[i + 1] = t * b * dk[i];
    }
  }
  let i = 0;
  while (x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
  );
}

/** The keys with the first one filled in from where 0.2 leaves the camera. */
function keysFrom(end) {
  const y = (1 + end.rise) * WORLD_M;
  return DESK_PATH.keys.map(k => (k.d == null ? { ...k, d: DESK_PATH.d0, y } : k));
}

/**
 * The camera at `desk` (> 0): the 0.2 camera's fields (`back`, `rise`,
 * `tilt`, `k`, `ranges`, for frameAt and the rest of sceneAt) plus `pitch`
 * (radians), `centre`, `zoom`, `eye` (height) and `ahead` (the desk's
 * distance in front of the camera), both in world units.
 */
export function deskCameraAt(desk, recipe, opts = {}) {
  const end = descentAt(1, recipe, opts);
  const keys = keysFrom(end);
  const xs = keys.map(k => k.at);
  const at = key => monotone(xs, keys.map(k => k[key]), desk);
  const d = at('d');
  const y = Math.exp(monotone(xs, keys.map(k => Math.log(k.y)), desk));
  const deskBack = end.back + DESK_PATH.d0 / WORLD_M;
  return {
    ...end,
    back: deskBack - d / WORLD_M,
    rise: y / WORLD_M - 1,
    pitch: (at('pitch') * Math.PI) / 180,
    centre: at('centre'),
    zoom: at('zoom'),
    eye: y / WORLD_M,
    // How far ahead of the camera the desk is (toward the mountains).
    ahead: -d / WORLD_M,
    end,
  };
}

/**
 * The frame under the 0.3 camera: frameAt with the camera's back and rise,
 * but each ridge keeps the look it had where 0.2 ended (its `t`, `flat`).
 * frameAt reads a ridge's look from its foot's slot on the frame, and coming
 * down to the ground every foot slides to the horizon: every range would
 * turn to haze.
 */
export function deskFrameAt(layout, h, cam) {
  const view = frameAt(layout, h, cam);
  const was = frameAt(layout, h, cam.end);
  view.ridges.forEach((rc, i) => {
    rc.t = was.ridges[i].t;
    rc.flat = was.ridges[i].flat;
  });
  view.desk = true;
  return view;
}

/**
 * The pitch as the shader takes it: the optical centre on screen (`sx`,
 * `sy`) and on the virtual plane (`vx`, `vy`, the 0.2 frame's horizon), the
 * focal length `f` (CSS px, the frame's: ground at depth 1 lands on its
 * foot), the zoom, and cos/sin of the pitch. Null at no pitch.
 */
export function pitchOf(cam, view, w, h) {
  if (!cam?.end) return null;
  const f = h - (view.horizon + cam.tilt * h);
  const vy = view.horizon;
  return {
    sx: w / 2,
    sy: vy + (h / 2 - vy) * cam.centre,
    vx: w / 2,
    vy,
    f,
    zoom: cam.zoom,
    cos: Math.cos(cam.pitch),
    sin: Math.sin(cam.pitch),
  };
}

/** A screen point on the virtual plane (null: the ray leaves it behind). */
export function toVirtual(P, x, y) {
  const u = (x - P.sx) / P.zoom;
  const v = (y - P.sy) / P.zoom;
  const yv = v * P.cos + P.f * P.sin;
  const zv = P.f * P.cos - v * P.sin;
  if (zv <= 1e-3 * P.f) return null;
  return { x: P.vx + (P.f * u) / zv, y: P.vy + (P.f * yv) / zv };
}

/** A virtual-plane point on screen (null: behind the camera), and how much
 * a length there is scaled on screen (`k`). */
export function toScreen(P, x, y) {
  const u = x - P.vx;
  const yv = y - P.vy;
  const v = yv * P.cos - P.f * P.sin;
  const z = yv * P.sin + P.f * P.cos;
  if (z <= 1e-3 * P.f) return null;
  const k = (P.zoom * P.f) / z;
  return { x: P.sx + k * u, y: P.sy + k * v, k };
}

/**
 * How much wider than the frame the virtual plane's ridge band reaches
 * across the screen (≥ 1): the crest texture covers that much (crestShader's
 * `uM`). Looked for along the screen's edges, wherever the ray still meets
 * the plane above `front` (the meadow's top: below it there are no ridges).
 */
export function pitchSpan(P, w, h, front) {
  if (!P) return 1;
  let m = 1;
  for (let i = 0; i <= 32; i++) {
    const y = (h * i) / 32;
    for (const x of [0, w]) {
      const q = toVirtual(P, x, y);
      if (q && q.y < front) m = Math.max(m, Math.abs(q.x - w / 2) / (w / 2));
    }
  }
  return Math.min(4, m);
}

/**
 * The box (the desk) relative to the camera, world units, y up, z forward
 * (toward the mountains): { min, max }.
 */
export function deskBox(cam) {
  const { w, h, d } = DESK_BOX;
  const z = cam.ahead;
  return {
    min: [-w / 2 / WORLD_M, -cam.eye, z - d / 2 / WORLD_M],
    max: [w / 2 / WORLD_M, h / WORLD_M - cam.eye, z + d / 2 / WORLD_M],
  };
}

/**
 * The smallest a ridge's crest is sampled at under the 0.3 camera (its scale
 * over the widest pitch span): what the crest noise's range must cover
 * there, like camera.js descentWidest for the pull-back.
 */
export function deskWidest(scene, h, recipe) {
  const end = descentAt(1, recipe);
  const deskBack = end.back + DESK_PATH.d0 / WORLD_M;
  const back = Math.max(...DESK_PATH.keys.filter(k => k.d != null).map(k => deskBack - k.d / WORLD_M));
  const zs = [...scene.ridges.map(rd => rd.z ?? depthOf(rd.base, scene.horizon, h)), ...end.ranges.map(g => g.z)];
  return Math.min(1, ...zs.map(z => z / (z + back))) / 4;
}

/** Where the scroll comes to rest (../scroll/stops.js), checked against the
 * path's holds: each must sit inside one. */
export const deskHolds = () =>
  DESK_STOPS.map(at => {
    const ks = DESK_PATH.keys;
    const i = ks.findIndex((k, j) => j + 1 < ks.length && k.at <= at && ks[j + 1].at >= at);
    return i >= 0 && ['d', 'y', 'pitch', 'centre', 'zoom'].every(c => ks[i][c] === ks[i + 1][c]);
  });

/**
 * (0.3) The sky's life in the closing shot: as the sky comes back behind
 * the desk it fills out, with a fuller gradient (more of the ramp between the
 * frame's top and the horizon), clouds, birds by day and stars at night.
 * `amount` fades it in over arc 2 (LIFE_IN).
 */
export const LIFE_IN = [0.62, 0.86];
export const DESK_SKY = { top: 0.03, horizon: 0.4 };

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How dark the scene is: 1 for a moon recipe. */
const nightOf = r => (r?.body === 'moon' ? 1 : 0);

/**
 * The sky's life at `desk`: { amount, birds, stars, cloud: [lit, shade],
 * bird } (colours as hex), or null where there's none. Mid-switch `prev`
 * and `e` blend the scenes' birds and stars.
 */
export function skyLifeAt(desk, recipe, stops, { prev = null, e = 1 } = {}) {
  const amount = smooth(LIFE_IN[0], LIFE_IN[1], desk);
  if (amount <= 0) return null;
  const night = prev ? nightOf(prev) + (nightOf(recipe) - nightOf(prev)) * e : nightOf(recipe);
  return {
    amount,
    birds: 1 - night,
    stars: night,
    cloud: [mix(stops[1], '#ffffff', 0.3 - 0.22 * night), mix(stops[3], stops[1], 0.45)],
    bird: mix(stops[5], '#000000', 0.35),
  };
}

/**
 * The sky under the 0.3 camera: camera.js skyUnder's, moved toward
 * DESK_SKY by the sky's life, measured from the frame's top (on the virtual
 * plane) to the horizon, so the sky behind the desk shows more of the ramp
 * than a plain top colour.
 */
export function deskSkyAt(view, h, pitch, life) {
  const base = skyUnder(view, h);
  if (!life || !pitch) return base;
  const top = toVirtual(pitch, pitch.sx, 0);
  if (!top || top.y >= view.horizon - 1) return base;
  const scale = ((DESK_SKY.horizon - DESK_SKY.top) * h) / (view.horizon - top.y);
  const shift = DESK_SKY.top * h - top.y * scale;
  const k = life.amount;
  return { scale: base.scale + (scale - base.scale) * k, shift: base.shift + (shift - base.shift) * k };
}
