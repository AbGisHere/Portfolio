/**
 * (0.3.2) The meadow pass: what the ground gains under the desk camera,
 * drawn over the scene's ground in a small pass of its own, so the scene's
 * shader (mistShader.js) stays as it was. Kept out of that shader because
 * everything added to it slows every pixel of it, sky and all.
 *
 * - **Paint** (MEADOW_PAINT), blended `src·dst + dst·src`: it multiplies the
 *   ground by 2·src, so one pass can darken and brighten (×0 … ×2):
 *   - the broad layers, near and far: fields of light and shade, warmer and
 *     cooler; the grass seen from afar (clumps, strokes); the clouds'
 *     shadows and the wind rolling across, drifting on the wind's clock;
 *   - the undergrowth between the blades (within ~30 m): clumps and strokes
 *     leaning toward the grass's own colours;
 *   - the boot prints (bootPrint.js): the sole a shallow dent, the tread
 *     pressed deep, its edges roughened and speckled.
 *   All of it hazes with the ground into the painted 0.2 meadow.
 * - **Flowers** (MEADOW_FLOWERS), added: wildflowers in drifts, a dot of
 *   cream or yellow with a darker eye, only where they're over a pixel.
 *
 * Each layer reads the meadow's texture (meadowTexture.js) in world space
 * with the ground point's own screen derivatives, so it mipmaps: detail
 * averages out with distance instead of shimmering.
 */

import { WORLD_M } from '../deskCamera';
import { LIFE, MAX_PRINTS } from './footsteps';
import { BOOT_GLSL } from './bootPrint';

const f = v => v.toFixed(6);

/** The mist at the mountains' foot (MEADOW_FOOT): its top over the foot, a
 * share of the frame's height (least, plus as much again where it rises),
 * the ground-depth ratio it's thinned out by across the plain, its density. */
export const FOOT_MIST = { up: [0.012, 0.07], plain: 0.4, a: 0.78 };

export const MEADOW_VERTEX = `#version 300 es
void main() {
  vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  // Just short of the far plane: drawn after the grass with the depth test
  // on, every pixel a blade covers is skipped before it's shaded.
  gl_Position = vec4(v * 2.0 - 1.0, 0.99998, 1.0);
}
`;

const common = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uRes;           // canvas, device px
uniform vec2 uSize;          // frame, CSS px
uniform vec4 uPitch;         // cos, sin of the pitch, focal length (CSS px), zoom
uniform vec4 uPrin;          // optical centre on screen (xy) and on the virtual plane (zw)
uniform float uFront;        // the meadow's top on the virtual plane
uniform vec2 uEye;           // the camera's height and back, world units
uniform vec3 uCamM;          // the camera, metres from the desk's centre
uniform vec2 uHazeAt;        // metres: the ground's haze starts, it's all painted meadow
uniform sampler2D uMeadow;
uniform float uMeadowA;      // how much of the paint shows (0 where the descent starts)
uniform float uGrassT;       // the wind's clock, seconds
uniform float uWindA;        // the wind's strength (0: still)
uniform vec3 uGrassGround;
uniform vec3 uGrassMid;
uniform vec3 uGrassTip;
uniform vec3 uShade;         // the cloud shadows' tint
uniform vec3 uFlower;
uniform vec3 uBloom;
uniform vec4 uPrints[${MAX_PRINTS}]; // x, z (metres), heading, age (s)
uniform float uFoot[${MAX_PRINTS}];  // 1: a right boot, -1: a left
uniform int uPrintN;
${BOOT_GLSL}
out vec4 outColor;

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}

// This pixel's ray (world units, y up) and its point on the virtual plane
// (CSS px; y 1e7 where the ray leaves the plane behind), as mistShader.js
// casts them.
vec3 rayOf(out vec2 v) {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * uSize / uRes;
  vec2 uv = (p - uPrin.xy) / uPitch.w;
  float yv = uv.y * uPitch.x + uPitch.z * uPitch.y;
  float zv = uPitch.z * uPitch.x - uv.y * uPitch.y;
  v = zv <= 1e-3 * uPitch.z ? vec2(uPrin.z, 1e7) : uPrin.zw + uPitch.z * vec2(uv.x, yv) / zv;
  return vec3(uv.x, -yv, zv);
}

// How far toward the mountains' foot a virtual-plane row is: the ground's
// depth over the foot's (1 at the foot, smaller toward the camera).
float footQ(float vy) {
  return (uFront - uPrin.w) / max(vy - uPrin.w, 1e-3);
}

// This pixel's ground point (metres) and its distance, or false for the
// sky, the ridges and the desk.
bool groundHit(out vec2 gm, out float dist) {
  vec2 v;
  vec3 dir = rayOf(v);
  // Clamped, so the derivatives hold everywhere (they're taken by the caller).
  float t = uEye.x / max(-dir.y, 1e-4);
  gm = uCamM.xz + dir.xz * t * ${f(WORLD_M)};
  dist = t * length(dir) * ${f(WORLD_M)};
  if (!(dir.y < 0.0 && v.y > uFront)) return false;
  return true;
}

vec4 meadowTex(float scale, vec2 off, vec2 gm, vec2 gx, vec2 gy) {
  return textureGrad(uMeadow, gm / scale + off, gx / scale, gy / scale);
}
`;

export const MEADOW_PAINT = `${common}
// The broad layers, as a tint: four reads, every channel used. At 260 m the
// fields (R), their finer patches (A) and the biggest clumps (G); at 17 m
// and 3.3 m clumps (G) and strokes (B); at 640 m the clouds (R) and the
// gusts (A), drifting. Three clump sizes that don't divide each other, their
// contrast varying across the meadow, so no grid shows. Each shows while
// it's over a pixel; past that the mipmaps average it out.
vec3 broad(vec2 gm, vec2 gx, vec2 gy, float px) {
  vec2 wd = normalize(vec2(0.8, -0.6));
  float t = uGrassT;
  vec4 fields = meadowTex(260.0, vec2(0.0), gm, gx, gy);
  vec4 m1 = meadowTex(3.3, vec2(0.11), gm, gx, gy);
  vec4 m2 = meadowTex(17.0, vec2(0.7), gm, gx, gy);
  vec4 sky = meadowTex(640.0, vec2(0.21) - wd * t * 0.0016, gm, gx, gy);
  float pat = (fields.r - 0.5) * 1.1 + (fields.a - 0.5) * 0.7;
  vec3 k = vec3(1.0 + 0.45 * pat);
  k *= pat > 0.0 ? mix(vec3(1.0), vec3(1.08, 1.05, 0.86), min(pat * 1.6, 1.0)) : mix(vec3(1.0), vec3(0.92, 1.0, 1.08), min(-pat * 1.6, 1.0));
  float tf = m1.g * 0.35 + m2.g * 0.35 + fields.g * 0.3;
  float c = 0.25 + 0.5 * fields.a;
  k *= (1.0 + c * (tf - 0.3)) * (1.0 + 0.35 * (m1.b - 0.5)) * (1.0 + 0.3 * (m2.b - 0.5));
  k *= mix(vec3(1.0), vec3(1.04, 1.06, 0.92), smoothstep(0.35, 0.7, tf));
  k *= mix(vec3(1.0), uShade, smoothstep(0.5, 0.62, sky.r));
  float far = (0.5 + 0.5 * sin(dot(gm, wd) * 0.11 - t * 0.5)) * smoothstep(0.35, 0.7, sky.a) * (1.0 - smoothstep(4.0, 16.0, px));
  float near = (0.5 + 0.5 * sin(dot(gm, wd) * 1.3 - t * 1.6)) * smoothstep(0.3, 0.8, sky.a) * (1.0 - smoothstep(0.3, 1.2, px));
  return k * mix(vec3(1.0), vec3(1.16, 1.18, 1.08), max(far, near) * 0.55 * uWindA);
}

// The undergrowth, as a tint on the ground's own colour: clumps toward the
// grass's mid, strokes light and dark, their light ends toward its tips.
vec3 under(vec2 gm, vec2 gx, vec2 gy) {
  vec4 m = meadowTex(1.3, vec2(0.53), gm, gx, gy);
  vec3 g = max(uGrassGround, vec3(0.02));
  vec3 u = mix(vec3(1.0), uGrassMid / g, 0.55 * m.g);
  u *= 1.0 + 0.5 * (m.b - 0.5);
  return mix(u, uGrassTip / g, 0.35 * smoothstep(0.62, 0.9, m.b));
}

// The boot prints, as a tint: the sole a shallow dent, the tread deep and
// dark, speckled where the ground didn't take the press (left out where
// that's under a pixel). Pressed at once, held, faded over a print's life.
float speck(vec2 c) { return float(pcg(uint(int(c.x) + 50000) * 7919u ^ pcg(uint(int(c.y) + 50000)))) / 4294967295.0; }
vec3 boots(vec2 gm, float px) {
  float dent = 0.0;
  float deep = 0.0;
  for (int i = 0; i < ${MAX_PRINTS}; i++) {
    if (i >= uPrintN) break;
    vec4 pr = uPrints[i];
    vec2 o = gm - pr.xy;
    if (dot(o, o) > 0.04) continue;
    float str = min(pr.w / 0.06, 1.0) * (1.0 - smoothstep(0.7, ${f(LIFE)}, pr.w));
    if (str <= 0.0) continue;
    vec2 fwd = vec2(sin(pr.z), cos(pr.z));
    vec2 lr = vec2(dot(o, vec2(fwd.y, -fwd.x)) * uFoot[i], dot(o, fwd) + uBoot[0].x * 0.5);
    float grit = smoothstep(0.009, 0.003, px);
    float n = speck(floor(lr / 0.006) + float(i) * 17.0);
    float w = max(px, 0.0008);
    float sole = 1.0 - smoothstep(-w, w, bootOutline(lr) + (n - 0.5) * 0.004 * grit);
    float tread = (1.0 - smoothstep(-w, w, bootTread(lr) + (n - 0.5) * 0.003 * grit)) * (1.0 - uBoot[2].z * grit * step(n, 0.45));
    dent = max(dent, sole * str);
    deep = max(deep, tread * str * uBoot[2].w);
  }
  return mix(vec3(1.0), vec3(0.78, 0.76, 0.72), dent) * mix(vec3(1.0), vec3(0.42, 0.39, 0.34), deep);
}

void main() {
  vec2 gm;
  float dist;
  bool hit = groundHit(gm, dist);
  vec2 gx = dFdx(gm);
  vec2 gy = dFdy(gm);
  if (!hit) discard;
  float px = length(abs(gx) + abs(gy));
  vec3 k = broad(gm, gx, gy, px);
  vec3 near = mix(vec3(1.0), k, uMeadowA);
  float u = 1.0 - smoothstep(10.0, 30.0, dist);
  if (u > 0.0) near *= mix(vec3(1.0), under(gm, gx, gy), u);
  if (uPrintN > 0 && px < 0.05) near *= boots(gm, px);
  // Far off the pattern thins out, and toward the mountains' foot it's gone:
  // the plain lies smooth into the foot's mist (MEADOW_FOOT).
  vec2 v;
  rayOf(v);
  float plain = 1.0 - smoothstep(0.3, 0.8, footQ(v.y));
  vec3 far = mix(vec3(1.0), k, uMeadowA * plain * (1.0 - smoothstep(400.0, 3000.0, dist)));
  vec3 m = mix(near, far, smoothstep(uHazeAt.x, uHazeAt.y, dist));
  outColor = vec4(clamp(m * 0.5, 0.0, 1.0), 1.0);
}
`;

export const MEADOW_FLOWERS = `${common}
uniform vec2 uFlowerNear; // metres: the grass's own flowers fade out over these (0.3.5)
void main() {
  vec2 gm;
  float dist;
  bool hit = groundHit(gm, dist);
  vec2 gx = dFdx(gm);
  vec2 gy = dFdy(gm);
  float px = length(abs(gx) + abs(gy));
  float fl = (1.0 - smoothstep(0.012, 0.03, px)) * (1.0 - smoothstep(uHazeAt.x, uHazeAt.y, dist)) * smoothstep(uFlowerNear.x, uFlowerNear.y, dist);
  if (!hit || fl <= 0.0) discard;
  vec2 c = floor(gm / 0.35);
  uint hs = pcg(uint(int(c.x) + 70000) * 4099u ^ pcg(uint(int(c.y) + 70000)));
  float drift = meadowTex(30.0, vec2(0.0), gm, gx, gy).a;
  if (float(hs) / 4294967295.0 >= 0.16 * smoothstep(0.45, 0.7, drift)) discard;
  uint h2 = pcg(hs);
  vec2 at = (c + 0.2 + 0.6 * vec2(float(h2 & 1023u), float((h2 >> 10) & 1023u)) / 1023.0) * 0.35;
  float r = 0.012 + 0.01 * float((h2 >> 20) & 15u) / 15.0;
  float d = length(gm - at);
  float a = (1.0 - smoothstep(r - px * 0.5, r + px * 0.5, d)) * fl * uMeadowA;
  if (a <= 0.0) discard;
  vec3 fc = ((h2 >> 24) & 3u) == 0u ? uBloom : uFlower;
  fc = mix(fc * 0.7, fc, smoothstep(r * 0.2, r * 0.45, d));
  // Added over the ground, so it lifts the ground's own colour to the
  // flower's (the ground there about the grass's root to mid).
  vec3 base = mix(uGrassGround, uGrassMid, 0.4);
  outColor = vec4(max(fc - base, 0.0) * a, 1.0);
}
`;

// The mist at the mountains' foot, blended over (premultiplied): where the
// front ridge's fill met the ground in a ruled line, the ridges now stand in
// a low bank of haze that the plain runs into. Its top rises and dips along
// the range and drifts on the wind's clock; it thins up the ridges and
// across the plain toward the camera.
export const MEADOW_FOOT = `${common}
uniform vec3 uFootMist;
void main() {
  vec2 v;
  vec3 dir = rayOf(v);
  float x = v.x / uSize.y;
  float t = uGrassT * 0.006;
  float n = textureLod(uMeadow, vec2(x * 0.45 + t, 0.31), 0.0).r * 0.6 + textureLod(uMeadow, vec2(x * 1.6 - t * 1.7, 0.73), 0.0).a * 0.4;
  float s = (v.y - uFront) / uSize.y;
  float a;
  if (s < 0.0) {
    // Up the ridges: the bank's top, rising and dipping along the range.
    float top = ${f(FOOT_MIST.up[0])} + ${f(FOOT_MIST.up[1])} * smoothstep(0.35, 0.7, n);
    a = pow(max(0.0, 1.0 + s / top), 2.2);
  } else {
    // Across the plain: thinning toward the camera, in loose drifts.
    float q = footQ(v.y);
    a = pow(smoothstep(${f(FOOT_MIST.plain)}, 1.0, q), 2.0) * (0.6 + 0.4 * textureLod(uMeadow, vec2(x * 0.7 - t, q * 3.0), 0.0).r);
  }
  a *= ${f(FOOT_MIST.a)} * uMeadowA;
  if (a <= 0.002) discard;
  outColor = vec4(uFootMist * a, a);
}
`;
