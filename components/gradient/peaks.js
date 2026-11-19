/**
 * (0.5.0) The opening in 3D (ROADMAP.md, "0.5 — the opening hills in 3D:
 * the look brief"): the camera over the sea of clouds, the hero peak and
 * the range behind it, and the light of the afternoon or the night. Pure,
 * like sceneAt: the GL renderer maps what peaksAt returns to uniforms
 * (gl/peaksShader.js), and the terrain itself is maths in the shader, so
 * nothing is downloaded or built.
 *
 * World units are metres: x across, y up, z ahead (toward the peaks).
 */

// The peaks: [x, z, height, radius]. The hero in front, a massif on the
// left, a low ridge on the right (the owner's "calmer range", 2026-11-19).
export const PEAKS = [
  [300, 3300, 1500, 1500],
  [-1300, 3000, 1100, 1100],
  [1900, 3100, 1000, 1000],
];
// The sea of clouds: its floor and the most its billows rise.
export const CLOUD = { base: 1480, rise: 300 };

// Where the camera rests at the top, and where the drop into the cloud
// ends (the 2D scene takes over under it until 0.5.3 builds the rest).
const REST = { pos: [300, 2900, 500], look: [300, 2650, 3300], fov: 60 };
const DIVE = { pos: [300, 1560, 1250], look: [300, 1100, 3600], fov: 60 };
// The stretch of `about` the drop takes, and where the 3D scene is gone.
export const PEAKS_DROP = 0.3;
export const PEAKS_GONE = 0.38;

const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const clamp01 = x => Math.min(1, Math.max(0, x));

/** The opening's camera for the descent's `about` (0 at the top). */
export function peaksCameraAt(about) {
  const t = smooth(clamp01(about / PEAKS_DROP));
  return {
    pos: lerp3(REST.pos, DIVE.pos, t),
    look: lerp3(REST.look, DIVE.look, t),
    fov: lerp(REST.fov, DIVE.fov, t),
  };
}

// The bodies: each one's resting elevation (degrees) and azimuth (as a
// share of the frame's half-width, so the body, which is the day/night
// button, stays in frame on any aspect; 0 is straight ahead). The sun rests
// low on the right in the glow, as the 2D sun does; the moon high on the
// left. Out of its scene a body is under the range (BELOW). The colours are
// the scene's own palette (gl/peaksShader.js), which the switch already
// runs through its keyframes.
export const BODIES = { sun: { el: 9, az: -0.62 }, moon: { el: 13, az: 0.58 } };
export const BELOW = -16;

const isNight = recipe => recipe?.body === 'moon';

/**
 * Where the sun and the moon are, how much of the night shows, and the
 * light the scene is lit by. Mid-switch (`orbit` with prev and next,
 * progress `e`) the outgoing body sets behind the range on its side while
 * the incoming one rises on the other, overlapping a little in the middle,
 * so the click plays a dusk (or a dawn), never a slide.
 */
export function peaksLightAt(recipe, orbit = null, e = 1) {
  const toNight = isNight(orbit ? orbit.next : recipe);
  const fromNight = orbit ? isNight(orbit.prev) : toNight;
  const t = orbit && toNight !== fromNight ? clamp01(e) : 1;
  const out = lerp(1, 0, smooth(clamp01(t / 0.6)));
  const inn = smooth(clamp01((t - 0.4) / 0.6));
  const upSun = fromNight === toNight ? (toNight ? 0 : 1) : toNight ? out : inn;
  const upMoon = fromNight === toNight ? (toNight ? 1 : 0) : toNight ? inn : out;
  // Like a timelapse: each body slides sideways as it sinks or climbs, on a
  // curve (the sky's turn is tilted to the horizon), the sun setting down
  // to the right, the moon climbing up and to the right from low on the left.
  const sun = { el: lerp(BELOW, BODIES.sun.el, upSun), az: BODIES.sun.az - 0.34 * Math.pow(1 - upSun, 1.35) };
  const moon = { el: lerp(BELOW, BODIES.moon.el, upMoon), az: BODIES.moon.az + 0.3 * Math.pow(1 - upMoon, 1.35) };
  const night = toNight ? smooth(t) : 1 - smooth(t);
  // The alpenglow: the sun's last (or first) light, pink on the snow.
  const glow = Math.max(0, 1 - Math.abs(sun.el - 1.5) / 6) * (sun.el > -2 ? 1 : 0);
  // How far the sky has turned (for the clouds' drift through a switch).
  const lapse = night;
  return { sun, moon, night, glow, lapse, by: sun.el >= moon.el ? 'sun' : 'moon', rest: toNight ? 'moon' : 'sun' };
}

/** The direction toward a body, from its elevation and azimuth. */
export function lightDir({ el, az }, cam, w, h) {
  const half = Math.atan(Math.tan(((cam.fov * Math.PI) / 180) / 2) * (w / h));
  const f = norm(sub(cam.look, cam.pos));
  const e = (el * Math.PI) / 180;
  const a = Math.atan2(f[0], f[2]) + az * half;
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
}

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => {
  const l = Math.hypot(...a) || 1;
  return a.map(v => v / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A direction's place on a w × h frame (CSS px, y down), or null if behind. */
export function toFrame(cam, dir, w, h) {
  const f = norm(sub(cam.look, cam.pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const z = dot(dir, f);
  if (z <= 1e-4) return null;
  const k = 1 / Math.tan(((cam.fov * Math.PI) / 180) / 2) / z;
  return { x: w / 2 + dot(dir, r) * k * (h / 2), y: h / 2 - dot(dir, u) * k * (h / 2) };
}

/**
 * The opening for this frame, or null where it isn't drawn (past the drop,
 * on the desk or the contact path, or `?peaks=0`). `a` is its opacity: 1
 * over the clouds, fading out once the camera is inside them.
 */
export function peaksAt({ recipe, orbit = null, e = 1, about = 0, onDesk = false, w, h, off = false }) {
  if (off || onDesk || about >= PEAKS_GONE) return null;
  const cam = peaksCameraAt(about);
  const light = peaksLightAt(recipe, orbit, e);
  const sun = lightDir(light.sun, cam, w, h);
  const moon = lightDir(light.moon, cam, w, h);
  const a = 1 - smooth(clamp01((about - PEAKS_DROP) / (PEAKS_GONE - PEAKS_DROP)));
  // The button goes straight to where the incoming body comes to rest (as
  // over the 2D scene), and waits there for the switch to finish.
  const spot = toFrame(cam, lightDir(BODIES[light.rest], cam, w, h), w, h);
  // Their flat bearings, for the shape pass's horizons (they hold through a
  // switch).
  const flat = b => {
    const v = lightDir({ el: 0, az: b.az }, cam, w, h);
    return [v[0], v[2]];
  };
  return { cam, light, sun, moon, sunH: flat(BODIES.sun), moonH: flat(BODIES.moon), dir: light.by === 'sun' ? sun : moon, a, spot };
}
