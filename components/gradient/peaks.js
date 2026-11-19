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
  // (0.5.5) Behind the house: the range around our own mountain.
  [-1500, -3600, 1500, 1300],
  [1700, -3900, 1350, 1200],
  [-3600, -2200, 1150, 1100],
  [4000, -2000, 1100, 1000],
  // (0.5.6) Closer behind the house: a near ring past its garden's drop.
  [-150, -2250, 1250, 950],
  [1150, -2450, 1150, 900],
  [-1350, -2050, 1050, 850],
  [2250, -1950, 1000, 850],
  [500, -3000, 1400, 1100],
];
// (0.5.3) The alpine valley between the sunlit meadow plateau and the hero
// range: aligned with the hero peak (x = 300) so the pull-back stays centred,
// with a broad mist-filled trough leading to the peaks' feet and mountain
// walls rising on either side.
export const VALLEY = { x: 300, amp: 0, wave: 3000, head: 1100, half: 1400, wall: 3400, rise: 0 };
export const valleyX = z => VALLEY.x + VALLEY.amp * Math.sin(z / VALLEY.wave);
// Where the desk stands: perched on a sunlit high-alpine meadow overlook
// right in front of the mountains (~7.4 km from the hero summit, ~5.5 km from
// its base), so the entire snowy Matterhorn peak (~7.7° elevation) towers
// close and dramatic right behind the meadow, trees and laptop lid.
const DESK_Z = -1200;
// The plateau's edge, ~10 m past the farthest trees each way (treeShader.js):
// r to the sides (the woodland belt's ends), lip in front of the desk
// (the copses, out to ~78 m), back behind the house (the belt, ~150 m).
export const SHELF = { x: valleyX(DESK_Z), z: DESK_Z, y: 1880, r: 115, lip: 90, back: 162 };
// (0.5.6) The plateau's rim as one GLSL function for every pass that draws
// on it (the terrain, the meadow's paint, the grass, the flowers): its
// distance in units of r (the rim is at r), lobed by its own noise, from a
// world point (x, z). Self-contained (rim-prefixed names).
const g = v => v.toFixed(6);
export const RIM_GLSL = `
float rimHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rimNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(rimHash(i), rimHash(i + vec2(1, 0)), u.x), mix(rimHash(i + vec2(0, 1)), rimHash(i + vec2(1, 1)), u.x), u.y);
}
// (Its lobes mirror across the desk's line, x: the meadow's passes run
// in a frame mirrored in x to the terrain's, and must meet the same rim.)
float rimD(vec2 p) {
  vec2 d = p - vec2(${g(SHELF.x)}, ${g(SHELF.z)});
  vec2 q = vec2(abs(d.x), d.y);
  d.y *= d.y > 0. ? ${g(SHELF.r / SHELF.lip)} : ${g(SHELF.r / SHELF.back)};
  return length(d) * (1. + .12 * (rimNoise(q / 160. + 4.1) - .5) + .05 * (rimNoise(q / 55. + 1.3) - .5));
}
// From the meadow's metres (the desk at 0; the passes' own frame).
float rimDm(vec2 m) { return rimD(m + vec2(${g(SHELF.x)}, ${g(SHELF.z)})); }
`;
// (0.5.3) The ground baked into textures once (gl/peaksShader.js): a near
// box covering BOTH the desk plateau, the entire valley and the hero massif
// in one seamless high-res map (7 m/texel at 2048²), plus a far horizon box.
export const BAKE = { near: [-7200, -7400, 15360], far: [-30000, -24000, 65536], nearN: 2048, farN: 1024 };
// The sea of clouds: its floor and the most its billows rise.
export const CLOUD = { base: 1050, rise: 280 };

// (0.5.3) The flight down: the whole `about` stretch, keyed like the
// desk's path (deskCamera.js), each channel on a monotone cubic. Facing
// the peaks, the camera pulls back and descends smoothly across the sunlit
// alpine valley directly onto the meadow overlook (at d=85 m, y=62 m, where
// every 3D tree is still behind the camera so nothing ever ghosts in).
const DROP = [
  { at: 0, y: 2900, z: 500, pitch: 5.1, fov: 60 },
  { at: 0.3, y: 2640, z: -150, pitch: 6.5, fov: 63 },
  { at: 0.65, y: 2240, z: -750, pitch: 9.5, fov: 69 },
  { at: 1, y: SHELF.y + 62, z: DESK_Z + 85, pitch: 14, fov: 79.6 },
];
// Where the desk's path takes over.
export const PEAKS_GONE = 1;

const smooth = t => t * t * (3 - 2 * t);
const clamp01 = x => Math.min(1, Math.max(0, x));

// A monotone cubic through keys (no overshoot; a repeated key holds).
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
      m[i] = m[i + 1] = 0;
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
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
}
const xs = DROP.map(k => k.at);
const on = (c, x) => monotone(xs, DROP.map(k => k[c]), x);

/** The opening's camera for the descent's `about` (0 at the top). */
export function peaksCameraAt(about) {
  const x = clamp01(about);
  const y = on('y', x);
  const z = on('z', x);
  const p = (on('pitch', x) * Math.PI) / 180;
  const vx = valleyX(z);
  const pos = [vx, y, z];
  return { pos, look: [vx, y - Math.sin(p) * 1000, z + Math.cos(p) * 1000], right: [-1, 0, 0], fov: on('fov', x) };
}

// The bodies: each one's resting elevation (degrees) and azimuth (as a
// share of the frame's half-width, so the body, which is the day/night
// button, stays in frame on any aspect; 0 is straight ahead, + left). The
// sun rests low on the right, the moon higher on the left.
// (0.5.7) The day is golden hour: the sun low (the owner, 2026-11-20).
export const BODIES = { sun: { el: 9, az: 0.58 }, moon: { el: 13, az: 0.58 } };
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
  // (0.5.7) The switch moves the bodies themselves (both rest on the left);
  // turning the whole sky about a pole sent the moon across before the
  // sun could rise, and the day waited for it.
  const toNight = isNight(orbit ? orbit.next : recipe);
  const fromNight = orbit ? isNight(orbit.prev) : toNight;
  const t = orbit && toNight !== fromNight ? clamp01(e) : 1;
  const down = BELOW - 2;
  // (0.5.7) A timelapse: the body going crosses the whole sky, from its
  // place on the left up over the frame to set off on the right; the one
  // coming rises on the left into its place as the other goes down. The
  // light, the sky and the clouds follow the sun.
  const cross = k => smooth(clamp01(k / 0.78));
  const rise = k => smooth(clamp01((k - 0.45) / 0.55));
  // Kept inside the frame: the arc tops out ~20° up (the top of the frame
  // is ~25°), and ends at the right-hand corner of the skyline.
  const across = (rest, u) =>
    lightDir({ el: rest.el + (down - rest.el) * u + 22 * Math.sin(Math.PI * u), az: rest.az + (-1 - rest.az) * u }, cam, w, h);
  // Up from the left-hand corner of the skyline into its place.
  const up = (rest, u) => lightDir({ el: down + (rest.el - down) * u, az: 1 + (rest.az - 1) * u }, cam, w, h);
  const switching = !!orbit && toNight !== fromNight;
  const sun = !switching ? (toNight ? up(BODIES.sun, 0) : up(BODIES.sun, 1)) : toNight ? across(BODIES.sun, cross(t)) : up(BODIES.sun, rise(t));
  const moon = !switching ? (toNight ? up(BODIES.moon, 1) : up(BODIES.moon, 0)) : toNight ? up(BODIES.moon, rise(t)) : across(BODIES.moon, cross(t));
  const sunEl = altOf(sun);
  // (0.5.7) How much of the night shows follows the sun itself, not the
  // switch's clock: day while it's above 4°, night once it's 14° down
  // (past nautical twilight), so one sky darkens and lightens, never two
  // skies crossfading.
  const night = 1 - smooth(clamp01((sunEl + 14) / 18));
  // The alpenglow: the sun's last (or first) light, pink on the snow.
  const glow = Math.max(0, 1 - Math.abs(sunEl - 1.5) / 6) * (sunEl > -2 ? 1 : 0);
  // (0.5.7) The day's grade: whole while the sun is at its height, gone by
  // the time it's 2° up, so the sunset keeps its own colours.
  const grade = smooth(clamp01((sunEl + 1) / 4));
  // How far through a switch (0 at rest): the clouds sweep with it.
  const sweep = switching ? t : 0;
  return { sun, moon, night, glow, grade, sweep, by: sunEl >= altOf(moon) ? 'sun' : 'moon', rest: toNight ? 'moon' : 'sun' };
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
  const r = cam.right ?? norm(cross(f, [0, 1, 0]));
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
export function peaksAt({ recipe, orbit = null, e = 1, about = 0, onDesk = false, w, h, off = false, desk = null }) {
  if (off || (onDesk && !desk)) return null;
  const cam = desk?.join ? joinCamera(peaksCameraAt(about), desk.join, desk.t) : desk ?? peaksCameraAt(about);
  // The sky is the top's, whatever the drop does to the lens: the bodies
  // and the shadows' bearings stay put on it.
  const top = peaksCameraAt(0);
  const light = peaksLightAt(recipe, orbit, e, top, w, h);
  const { sun, moon } = light;
  // Opaque all the way: under the white, nothing below it shows.
  const a = 1;
  // The button goes straight to where the incoming body comes to rest (as
  // over the 2D scene), and waits there for the switch to finish.
  const at = toFrame(cam, lightDir(BODIES[light.rest], top, w, h), w, h);
  const spot = at && cam.shift ? { x: at.x + (cam.shift[0] * h) / 2, y: at.y - (cam.shift[1] * h) / 2 } : at;
  // Flat bearings for the shape pass's horizons, and the light's own (as a
  // share of the half-width, + left).
  const half = Math.atan(Math.tan(rad(top.fov) / 2) * (w / h));
  const f = norm(sub(top.look, top.pos));
  const head = Math.atan2(f[0], f[2]);
  const flat = az => [Math.sin(head + az * half), Math.cos(head + az * half)];
  const dir = light.by === 'sun' ? sun : moon;
  let off2 = Math.atan2(dir[0], dir[2]) - head;
  off2 = Math.atan2(Math.sin(off2), Math.cos(off2));
  const behind = !!desk && !desk.join;
  // Looking straight down (desk/pool hold) or turned away toward the house:
  // no 3D mountains are in frame, so skip terrain raymarching completely and
  // draw only the real sky + flat meadow ground.
  const skipGeo = behind && !!cam.skipGeo;
  return { cam, light, sun, moon, bearings: BEARINGS.map(flat), lightAz: off2 / half, dir, a, spot, behind, skipGeo };
}

/**
 * (0.5.3) The desk's camera (deskCamera.js: metres from the desk, its
 * pitch, yaw, zoom and shifted lens, `P` from pitchOf) as the opening's,
 * the desk standing on the meadow's shelf, so the peaks behind it are the
 * ones the flight came down from. `shift` is where the lens's axis meets
 * the frame (view units: the frame's half-height is 1).
 */
function joinCamera(a, b, t) {
  const k = smooth(clamp01(t));
  const mix = (x, y) => x.map((v, i) => v + (y[i] - v) * k);
  const fa = norm(sub(a.look, a.pos));
  const fb = norm(sub(b.look, b.pos));
  const pos = mix(a.pos, b.pos);
  const f = norm(mix(fa, fb));
  const r = norm(mix(a.right ?? [-1, 0, 0], b.right ?? [-1, 0, 0]));
  return { pos, look: pos.map((v, i) => v + f[i] * 1000), right: r, fov: a.fov + (b.fov - a.fov) * k, shift: mix([0, 0], b.shift) };
}

export function deskPeaksCamera(m, cam, P, w, h) {
  const pos = [SHELF.x + m.x, SHELF.y + m.y, SHELF.z + m.z];
  const cp = Math.cos(cam.pitch);
  const yaw = cam.yaw ?? 0;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const dir = [sy * cp, -Math.sin(cam.pitch), cy * cp];
  // Exact right vector in peaks handedness (singularity-free at pitch = 90°).
  const right = [-cy, 0, sy];
  const F = P.zoom * P.f;
  const skipGeo = cam.pitch > rad(62);
  return {
    pos,
    look: pos.map((v, i) => v + dir[i] * 1000),
    right,
    fov: (2 * Math.atan(h / 2 / F) * 180) / Math.PI,
    shift: [(2 * P.sx - w) / h, (h - 2 * P.sy) / h],
    skipGeo,
  };
}
