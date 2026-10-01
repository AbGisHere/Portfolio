/**
 * (0.3.1) The meadow's grass under the desk camera: instanced blades in the
 * same WebGL2 context, after the scene's fullscreen pass, depth-tested
 * against what it wrote (the desk's box). One draw, no vertex data: every
 * blade comes from its instance number.
 *
 * - **Where.** Five rings of square cells around the camera's foot, each
 *   ring's cells twice the last's, snapped to the world grid so a blade
 *   never moves when the camera does. Each cell holds BLADES blades, placed
 *   by an integer hash of the cell and blade.
 * - **How many.** A target density falling with distance (DENSITY / d²,
 *   capped), shared between rings by a crossfade at each ring's edge. Each
 *   blade has its own threshold and grows in as the density passes it, so
 *   nothing pops as the camera moves. Farther blades are wider, so the
 *   meadow stays covered on screen. Past REACH there are none (the ground
 *   layer and its haze carry on).
 * - **Shape.** A tapered ribbon of SEGMENTS, bent as one arc of constant
 *   curvature (its length holds however far it bends): its own lean, the
 *   wind (rolling waves and gusts) and the footprints (pressed flat outward
 *   from the foot, then springing back).
 * - **Look.** Anime grass: three flat tone bands, root to tip, a little
 *   variation per blade, wind sheen on the tips, pressed blades in shade,
 *   hazed with distance into the painted meadow, grain on top.
 */

import { hexToRgb } from '../colour';
import { MAX_PRINTS } from './footsteps';

const f = v => v.toFixed(6);

export const GRASS = {
  rings: 5,
  // Cells per ring side, and the innermost ring's cell size (metres).
  side: 32,
  cell: 0.1,
  blades: 16,
  segments: 4,
  // Target blades per m² near the camera, and the fall-off (DENSITY / d²).
  cap: 600,
  density: 1600,
  // Metres from the camera past which the grass has faded out.
  reach: 32,
};

export const GRASS_INSTANCES = GRASS.rings * GRASS.side * GRASS.side * GRASS.blades;
export const GRASS_VERTS = GRASS.segments * 2 + 1;

export const GRASS_VERTEX = `#version 300 es
precision highp float;
precision highp int;

uniform vec4 uPitch;    // cos, sin of the pitch, focal length (CSS px), zoom
uniform vec4 uScreen;   // optical centre on screen (xy), frame size (zw), CSS px
uniform vec3 uCam;      // the camera, metres from the desk's centre (y up, z forward)
uniform vec2 uDepthAB;  // perspective depth: A, B (metres)
uniform float uT;       // the wind's clock, seconds
uniform float uWindA;   // the wind's strength (0: still)
uniform vec4 uPrints[${MAX_PRINTS}]; // x, z (metres), heading, age (s)
uniform int uPrintN;
uniform float uRebound; // 1: prints spring back past upright; 0: they just ease back
uniform vec2 uSunDir;   // where the light comes from across the ground (x, z)
uniform float uPxCss;   // one device pixel, CSS px

out float vT;
out float vVar;
out float vPress;
out float vSheen;
out float vDist;
out float vFace;   // how far the blade faces the light (-1 … 1)
out float vHue;    // the blade's own lean in colour: -1 bluer … 1 yellower
out float vBack;   // how far the camera looks toward the light past it (0 … 1)

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float rnd(inout uint s) {
  s = pcg(s);
  return float(s) / 4294967295.0;
}
float h2(vec2 c) { return float(pcg(uint(int(c.x)) * 1973u ^ pcg(uint(int(c.y)) + 40503u))) / 4294967295.0; }
float vnoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = x - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y);
}

// A print's push on its blades over its life: pressed at once, held, then
// springing back (past upright and settling) or, under reduced motion,
// easing back.
float footStrength(float a) {
  if (a < 0.06) return a / 0.06;
  float b = a - 0.7;
  if (b < 0.0) return 1.0;
  if (uRebound < 0.5) return max(0.0, 1.0 - b / 2.0);
  return exp(-1.8 * b) * cos(4.2 * b);
}

void main() {
  int per = ${GRASS.side * GRASS.side * GRASS.blades};
  int ring = gl_InstanceID / per;
  int r = gl_InstanceID - ring * per;
  int cell = r / ${GRASS.blades};
  int bi = r - cell * ${GRASS.blades};
  float c = ${f(GRASS.cell)} * exp2(float(ring));
  ivec2 at = ivec2(floor(uCam.xz / c)) - ${GRASS.side / 2} + ivec2(cell % ${GRASS.side}, cell / ${GRASS.side});
  uint s = pcg(uint(at.x) * 9781u ^ pcg(uint(at.y) * 6271u ^ pcg(uint(ring * 16 + bi))));
  vec2 pos = (vec2(at) + vec2(rnd(s), rnd(s))) * c;

  // Which ring owns this spot (a crossfade at each edge), and the density.
  float m = max(abs(pos.x - uCam.x), abs(pos.y - uCam.z));
  float edge = ${f(GRASS.cell * GRASS.side / 2)} * exp2(float(ring));
  float inner = ring == 0 ? 0.0 : edge * 0.5;
  float own = (ring == 0 ? 1.0 : smoothstep(inner * 0.9, inner, m)) - smoothstep(edge * 0.9, edge, m);
  vec2 rel = pos - uCam.xz;
  float d = length(vec3(rel.x, uCam.y, rel.y));
  float want = min(${f(GRASS.cap)}, ${f(GRASS.density)} / (d * d)) * (1.0 - smoothstep(${f(GRASS.reach * 0.6)}, ${f(GRASS.reach)}, d));
  float p = own * want * c * c / ${f(GRASS.blades)};
  float grow = clamp((p - rnd(s)) / 0.08, 0.0, 1.0);
  if (grow <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float widen = clamp(sqrt(${f(GRASS.cap)} / max(want, 1.0)), 1.0, 3.0);
  // A blade under about a pixel tall on screen is left out: it would only
  // shimmer, and the ground's far colour already reads as grass there.
  vec3 q0 = vec3(rel.x, -uCam.y, rel.y);
  float z0 = -q0.y * uPitch.y + q0.z * uPitch.x;
  if (z0 > 0.0 && 0.16 * uPitch.w * uPitch.z / z0 < uPxCss) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // The blade: height in tufts, its own lean and facing.
  // Short, even grass (a gentle swell in height across the meadow only),
  // every blade its own: a kind (mostly ordinary blades, some broad leaves,
  // some tall thin wisps), then its own height, width, taper (pointed to
  // blunt), curl, a tip that may lean off its centre line, and a twist.
  float swell = 0.9 + 0.2 * vnoise(pos * 0.6);
  float kind = rnd(s);
  float tall = kind > 0.92 ? 1.6 : kind < 0.1 ? 0.7 : 1.0;
  float broad = kind > 0.92 ? 0.6 : kind < 0.1 ? 1.7 : 1.0;
  float r1 = rnd(s);
  float h = (0.07 + 0.17 * r1 * r1) * tall * swell * grow;
  float yaw = rnd(s) * 6.2831853;
  vec2 face = vec2(sin(yaw), cos(yaw));
  vec2 bend = face * (0.1 + 0.5 * rnd(s));
  float var = rnd(s);
  float wide = (0.6 + 0.9 * rnd(s)) * broad;
  float taper = 0.4 + 0.8 * rnd(s);
  float skew = (rnd(s) - 0.5) * 0.6;
  float twist = (rnd(s) - 0.5) * 1.2;
  float hue = rnd(s) * 2.0 - 1.0;

  // The wind: waves rolling across the meadow, in gusts, and a flutter.
  vec2 wd = normalize(vec2(0.8, -0.6));
  float wave = 0.5 + 0.5 * sin(dot(pos, wd) * 1.3 - uT * 1.6);
  float gust = vnoise(pos * 0.25 - wd * uT * 0.4);
  float sheen = wave * gust;
  bend += uWindA * (wd * (0.2 + 0.7 * sheen) + face * 0.05 * sin(uT * 7.0 + var * 40.0));

  // The footprints: blades under a foot pressed flat outward from it, those
  // around it leaning away, all springing back as the print ages.
  float press = 0.0;
  for (int i = 0; i < ${MAX_PRINTS}; i++) {
    if (i >= uPrintN) break;
    vec4 pr = uPrints[i];
    vec2 o = pos - pr.xy;
    vec2 fwd = vec2(sin(pr.z), cos(pr.z));
    vec2 lr = vec2(dot(o, vec2(fwd.y, -fwd.x)), dot(o, fwd));
    float e = length(lr / vec2(0.06, 0.13));
    float k = (1.0 - smoothstep(0.8, 2.3, e)) * footStrength(pr.w);
    vec2 out_ = length(o) > 1e-4 ? normalize(o) : face;
    bend += out_ * k * 1.6;
    press = max(press, k);
  }

  // Along the blade: one arc of constant curvature, length h.
  int v = gl_VertexID;
  float t = v >= ${GRASS.segments * 2} ? 1.0 : float(v / 2) / ${f(GRASS.segments)};
  float side = v >= ${GRASS.segments * 2} ? 0.0 : (v % 2 == 0 ? -0.5 : 0.5);
  float phi = min(length(bend) * 1.4, 1.5);
  vec2 bd = length(bend) > 1e-5 ? normalize(bend) : face;
  float ang = phi * t;
  float off = phi < 1e-3 ? h * phi * t * t * 0.5 : h * (1.0 - cos(ang)) / phi;
  float y = phi < 1e-3 ? h * t : h * sin(ang) / phi;
  // The ribbon turns partly toward the camera, so no blade goes edge-on.
  vec2 toCam = normalize(-rel + vec2(1e-5));
  vec2 across = normalize(mix(vec2(face.y, -face.x), vec2(toCam.y, -toCam.x), 0.6));
  // The twist turns the ribbon along its length.
  float tw = twist * t;
  across = vec2(across.x * cos(tw) - across.y * sin(tw), across.x * sin(tw) + across.y * cos(tw));
  float wdt = 0.022 * widen * wide * pow(1.0 - t, taper);
  // The tip leans off the centre line (skew), so no two points match.
  float lean = skew * 0.022 * widen * wide * t * t;
  vec3 w = vec3(pos.x + bd.x * off + across.x * (side * wdt + lean), y, pos.y + bd.y * off + across.y * (side * wdt + lean));

  // Projected as the scene's pitched camera sees it (deskCamera.js toScreen).
  vec3 q = w - uCam;
  float yd = -q.y;
  float zp = yd * uPitch.y + q.z * uPitch.x;
  float vp = yd * uPitch.x - q.z * uPitch.y;
  // Clip space, linear in the camera's coordinates (no divide here), so a
  // blade reaching behind the camera is clipped, not flung across the frame.
  float fz = uPitch.w * uPitch.z;
  gl_Position = vec4(
    (uScreen.x / uScreen.z * 2.0 - 1.0) * zp + 2.0 * fz * q.x / uScreen.z,
    (1.0 - uScreen.y / uScreen.w * 2.0) * zp - 2.0 * fz * vp / uScreen.w,
    uDepthAB.x * zp + uDepthAB.y,
    zp);

  vT = t;
  vVar = var;
  vHue = hue;
  vFace = dot(bd, -uSunDir);
  vBack = clamp(dot(normalize(rel + vec2(1e-5)), uSunDir), 0.0, 1.0);
  vPress = press;
  vSheen = sheen * uWindA;
  vDist = d;
}
`;

export const GRASS_FRAGMENT = `#version 300 es
precision highp float;

uniform vec3 uRoot;
uniform vec3 uMid;
uniform vec3 uTip;
uniform vec3 uSun;       // the body's light on the grass
uniform vec3 uSky;       // the sky's tint overhead (max channel 1)
uniform vec3 uHaze;      // the painted meadow far off
uniform vec2 uHazeAt;    // metres: haze starts, haze is whole
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;  // CSS px per device px (the grain's texels)
uniform float uResY;      // canvas height, device px (the grain runs y down)

in float vT;
in float vVar;
in float vPress;
in float vSheen;
in float vDist;
in float vFace;
in float vBack;
in float vHue;
out vec4 outColor;

void main() {
  // Root to tip in one soft run, so the blades merge into the ground (the
  // root's colour) and into each other. A pressed blade loses its tip's
  // light: it lies in the foot's shade.
  float press = clamp(vPress, 0.0, 1.0);
  vec3 col = mix(uRoot, uMid, smoothstep(0.0, 0.55, vT));
  col = mix(col, uTip, smoothstep(0.45, 1.0, vT) * (1.0 - press));
  // Each blade a touch lighter or darker, yellower or bluer: the palette
  // holds, no two blades quite match.
  col *= 0.9 + 0.2 * vVar;
  col *= vHue > 0.0 ? mix(vec3(1.0), vec3(1.07, 1.05, 0.86), vHue) : mix(vec3(1.0), vec3(0.93, 1.0, 1.08), -vHue);
  // The scene's light: the sky's tint everywhere, the side facing the body
  // a little brighter, and the tips glowing in its colour when the light is
  // behind them (the low evening sun through the grass, the moon's rim).
  col *= mix(vec3(1.0), uSky, 0.25) * (0.9 + 0.1 * vFace);
  col = mix(col, col * uSun * 1.7, vT * vT * (0.25 + 0.45 * vBack) * (1.0 - press));
  // Wind sheen on the tips; pressed blades in shade.
  col = mix(col, min(col * 1.25, vec3(1.0)), vSheen * vT * vT * 0.4);
  col *= 1.0 - 0.45 * press;
  col = mix(col, uHaze, smoothstep(uHazeAt.x, uHazeAt.y, vDist));
  // The scene's grain (mistShader.js), when it's drawn in GL.
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float n = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * n, 1.0 - 2.0 * (1.0 - col) * (1.0 - n), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;

/** The grass's haze, metres: whole by the time the 0.2 meadow is all there
 * is (the camera starts the descent ~64 m up). */
export const GRASS_HAZE = [8, 58];

export const rgb01f = hex => hexToRgb(hex).map(c => c / 255);
