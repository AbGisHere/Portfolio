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
export const CLOUD = { base: 1050, rise: 280 };

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
// button, stays in frame on any aspect; 0 is straight ahead, + left). The
// sun rests low on the right, the moon higher on the left.
export const BODIES = { sun: { el: 13, az: -0.62 }, moon: { el: 13, az: 0.58 } };
// How far under the horizon a body must be once it's out of its scene.
export const BELOW = -16;
// The latitude the sky turns at: its pole is this high behind the camera
// (which faces south, east on the left), so the bodies rise on the left and
// set on the right on arcs tilted to the horizon, as in a real timelapse.
const LAT = 42;

const isNight = recipe => recipe?.body === 'moon';
const rad = d => (d * Math.PI) / 180;

/** The direction toward a body, from its elevation and azimuth. */
export function lightDir({ el, az }, cam, w, h) {
  const half = Math.atan(Math.tan(rad(cam.fov) / 2) * (w / h));
  const f = norm(sub(cam.look, cam.pos));
  const e = rad(el);
  const a = Math.atan2(f[0], f[2]) + az * half;
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
}

// The sky's frame: south (the camera's heading, flat), east (its left), up.
function skyFrame(cam) {
  const f = norm(sub(cam.look, cam.pos));
  const south = norm([f[0], 0, f[2]]);
  const east = norm(cross([0, 1, 0], south));
  return { south, east };
}
const phi = rad(LAT);
// A direction's place on the turning sky: its declination and hour angle.
function toSky(dir, { south, east }) {
  const alt = Math.asin(Math.max(-1, Math.min(1, dir[1])));
  const A = Math.atan2(-dot(dir, east), dot(dir, south)); // from south, + west
  const dec = Math.asin(Math.sin(alt) * Math.sin(phi) - Math.cos(alt) * Math.cos(phi) * Math.cos(A));
  const H = Math.atan2(Math.sin(A), Math.cos(A) * Math.sin(phi) + Math.tan(alt) * Math.cos(phi));
  return { dec, H };
}
// And back: where a body at this declination and hour angle is.
function fromSky({ dec, H }, { south, east }) {
  const xe = -Math.cos(dec) * Math.sin(H);
  const yn = Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.cos(H) * Math.sin(phi);
  const zu = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(H) * Math.cos(phi);
  return [east[0] * xe - south[0] * yn, zu, east[2] * xe - south[2] * yn];
}
const altOf = d => (Math.asin(Math.max(-1, Math.min(1, d[1]))) * 180) / Math.PI;

/**
 * The sun and the moon, how much of the night shows, and which lights the
 * scene. The whole sky turns as one about its pole, always forward: a dusk
 * turns it on until the sun is down and the moon has risen to its place; a
 * dawn turns it on the rest of the way round, the moon setting on the right
 * and the sun rising on the left, crossing high and coming down to the
 * afternoon. Mid-switch (`orbit`, progress `e`) the turn is `e` of the way.
 */
export function peaksLightAt(recipe, orbit, e, cam, w, h) {
  const frame = skyFrame(cam);
  // Each body on the sky where the scene it belongs to holds it.
  const sunRest = toSky(lightDir(BODIES.sun, cam, w, h), frame);
  const moonRest = toSky(lightDir(BODIES.moon, cam, w, h), frame);
  // The dusk's turn: enough that the sun is well down and the moon, turned
  // back by as much, is well down by day.
  let dusk = Math.PI / 2;
  for (let d = rad(30); d <= rad(200); d += rad(1)) {
    const s = altOf(fromSky({ dec: sunRest.dec, H: sunRest.H + d }, frame));
    const m = altOf(fromSky({ dec: moonRest.dec, H: moonRest.H - d }, frame));
    if (s < BELOW && m < BELOW) {
      dusk = d;
      break;
    }
  }
  const toNight = isNight(orbit ? orbit.next : recipe);
  const fromNight = orbit ? isNight(orbit.prev) : toNight;
  const t = orbit && toNight !== fromNight ? clamp01(e) : 1;
  // The sky's turn from the day's: 0 by day, `dusk` by night, and a dawn
  // carries on from `dusk` to a full turn.
  const turn = !orbit || toNight === fromNight ? (toNight ? dusk : 0) : toNight ? dusk * t : dusk + (2 * Math.PI - dusk) * t;
  const sun = fromSky({ dec: sunRest.dec, H: sunRest.H + turn }, frame);
  const moon = fromSky({ dec: moonRest.dec, H: moonRest.H - dusk + turn }, frame);
  const night = toNight ? smooth(t) : 1 - smooth(t);
  const sunEl = altOf(sun);
  // The alpenglow: the sun's last (or first) light, pink on the snow.
  const glow = Math.max(0, 1 - Math.abs(sunEl - 1.5) / 6) * (sunEl > -2 ? 1 : 0);
  return { sun, moon, night, glow, by: sunEl >= altOf(moon) ? 'sun' : 'moon', rest: toNight ? 'moon' : 'sun' };
}

// The bearings the shape pass works the ground's horizon out for (as a
// share of the half-width, like a body's azimuth): across the frame and a
// little past it. Between them the light pass blends, so shadows follow a
// body across the sky.
export const BEARINGS = [-1.3, BODIES.sun.az, BODIES.moon.az, 1.3];

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
  const light = peaksLightAt(recipe, orbit, e, cam, w, h);
  const { sun, moon } = light;
  const a = 1 - smooth(clamp01((about - PEAKS_DROP) / (PEAKS_GONE - PEAKS_DROP)));
  // The button goes straight to where the incoming body comes to rest (as
  // over the 2D scene), and waits there for the switch to finish.
  const spot = toFrame(cam, lightDir(BODIES[light.rest], cam, w, h), w, h);
  // Flat bearings for the shape pass's horizons, and the light's own (as a
  // share of the half-width, + left).
  const half = Math.atan(Math.tan(rad(cam.fov) / 2) * (w / h));
  const f = norm(sub(cam.look, cam.pos));
  const head = Math.atan2(f[0], f[2]);
  const flat = az => [Math.sin(head + az * half), Math.cos(head + az * half)];
  const dir = light.by === 'sun' ? sun : moon;
  let off2 = Math.atan2(dir[0], dir[2]) - head;
  off2 = Math.atan2(Math.sin(off2), Math.cos(off2));
  return { cam, light, sun, moon, bearings: BEARINGS.map(flat), lightAz: off2 / half, dir, a, spot };
}
