/**
 * (0.3.6) The desk: a wooden trestle table on the meadow, where the camera
 * comes down (ROADMAP.md, "0.3 — the desk"). Built in code rather than
 * modelled: planks (boxes) drawn instanced in the same context, under the
 * same camera as the grass and the trees, against the same depth, so the
 * blades and the trees stand behind and in front of it as they should.
 *
 * - **The table.** Five planks for the top with gaps between, laid across
 *   two A-frame trestles (two splayed legs each, a cleat under the top, a
 *   foot on the ground) joined by a stretcher. Each plank a little off its
 *   neighbours, as a hand-built table is.
 * - **The wood.** Lit live by the scene, like the trees' bark (no baked
 *   lightmaps: the sky's light is the day and the night), with its grain in
 *   the shader: growth rings from a pith off the plank, fine streaks along
 *   it, and worn, lighter edges.
 * - **Its shadow.** The top's, long and away from the low light, plus a
 *   soft dark under the table, multiplied into the ground (`DESK_SHADE_GLSL`
 *   shades the blades and flowers standing in it).
 */
import { DESK_BOX } from '../deskCamera';
import { TREE_STRIDE } from './treeShader';

const TOP_T = 0.035; // the top's thickness (metres)
const TOP_X = DESK_BOX.w / 2 + 0.03; // the top's half-length, with its overhang
const TRESTLE_X = DESK_BOX.w / 2 - 0.15;
const DESK_Z = DESK_BOX.d / 2;

// Seeded (fixed: one table for everyone).
function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The table as instances (`TREE_STRIDE` floats each): centre x, y, z, tilt
 * about x (radians); half-sizes x, y, z, seed; the grain's axis (0 x, 1 y,
 * 2 z, in the box's own frame), kind (0 wood, 2 the shadow), 0, 0. The
 * shadow comes last. Metres, the desk's centre on the ground at the origin.
 */
export function deskLayout() {
  const rnd = rand(0x7ab1e);
  const out = [];
  const box = (c, half, grain, tilt = 0) => out.push([...c, tilt, ...half, rnd(), grain, 0, 0, 0]);
  const H = DESK_BOX.h;
  // The top: five planks along x, gaps between.
  const n = 5;
  const gap = 0.008;
  const pw = (DESK_BOX.d - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const z = -DESK_Z + pw / 2 + i * (pw + gap);
    const lift = (rnd() - 0.5) * 0.003;
    box([(rnd() - 0.5) * 0.012, H - TOP_T / 2 + lift, z], [TOP_X + (rnd() - 0.5) * 0.01, TOP_T / 2, pw / 2 - 0.001], 0);
  }
  const under = H - TOP_T;
  for (const sx of [-1, 1]) {
    const x = sx * TRESTLE_X;
    // The cleat under the top, across it.
    box([x, under - 0.025, 0], [0.035, 0.025, DESK_Z - 0.04], 2);
    // The legs: from under the cleat, splayed out to the foot.
    const yTop = under - 0.05;
    const yFoot = 0.06;
    for (const sz of [-1, 1]) {
      const zTop = sz * 0.1;
      const zFoot = sz * 0.25;
      const len = Math.hypot(yTop - yFoot, zFoot - zTop);
      const tilt = Math.atan2(zFoot - zTop, yTop - yFoot) * -1;
      box([x, (yTop + yFoot) / 2, (zTop + zFoot) / 2], [0.03, len / 2 + 0.01, 0.028], 1, tilt);
    }
    // The foot, on the ground.
    box([x, 0.03, 0], [0.034, 0.03, DESK_Z - 0.03], 2);
  }
  // The stretcher between the trestles, its ends through the legs.
  box([0, 0.3, 0], [TRESTLE_X + 0.06, 0.045, 0.024], 0);
  // The shadow (its quad's bounds come from the light, in the shader).
  out.push([0, 0, 0, 0, TOP_X, H, DESK_Z, 0, 0, 2, 0, 0]);
  return { data: new Float32Array(out.flat()), wood: out.length - 1 };
}

/**
 * How far a point on the ground (x, z metres) lies in the desk's shadow
 * (0 … 1): the top's, cast away from the light (always low, beyond the
 * mountains; `uSunDir` toward it), and a soft dark right under it.
 */
export const DESK_SHADE_GLSL = `float deskShade(vec2 p) {
  vec2 s = normalize(uSunDir + vec2(1e-5));
  // The light rises 0.55 for every 1 across (treeShader.js), so the top's
  // shadow lies H / 0.55 away from it.
  vec2 q = p + s * ${(DESK_BOX.h / 0.55).toFixed(4)};
  vec2 e = abs(q) - vec2(${TOP_X.toFixed(4)}, ${DESK_Z.toFixed(4)});
  float thrown = 1.0 - smoothstep(-0.06, 0.1, max(e.x, e.y));
  vec2 u = abs(p) - vec2(${TOP_X.toFixed(4)}, ${DESK_Z.toFixed(4)});
  float under = (1.0 - smoothstep(-0.15, 0.2, max(u.x, u.y))) * 0.6;
  return max(thrown, under);
}
`;

const CAMERA_GLSL = `uniform vec4 uPitch;    // cos, sin of the pitch, focal length (CSS px), zoom
uniform vec4 uScreen;   // optical centre on screen (xy), frame size (zw), CSS px
uniform vec3 uCam;      // the camera, metres from the desk's centre (y up, z forward)
uniform vec2 uDepthAB;
uniform vec2 uSunDir;
`;

export const DESK_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;

${CAMERA_GLSL}
out vec3 vLocal;       // in the box's own frame (metres), for the grain
out vec3 vHalf;
out vec3 vWorld;
out vec3 vNorm;
flat out float vGrain;
flat out float vSeed;
flat out float vKind;

// Projected as the scene's camera sees it (treeShader.js).
vec4 project(vec3 w) {
  vec3 q = w - uCam;
  float zp = -q.y * uPitch.y + q.z * uPitch.x;
  float vp = -q.y * uPitch.x - q.z * uPitch.y;
  float fz = uPitch.w * uPitch.z;
  return vec4(
    (uScreen.x / uScreen.z * 2.0 - 1.0) * zp + 2.0 * fz * q.x / uScreen.z,
    (1.0 - uScreen.y / uScreen.w * 2.0) * zp - 2.0 * fz * vp / uScreen.w,
    uDepthAB.x * zp + uDepthAB.y,
    zp);
}

void main() {
  int k = gl_VertexID % 6;
  int f = gl_VertexID / 6;
  vec2 cn = vec2((k == 1 || k == 3 || k == 4) ? 1.0 : -1.0, (k == 2 || k == 4 || k == 5) ? 1.0 : -1.0);
  vKind = aC.y;
  vGrain = aC.x;
  vSeed = aB.w;
  vHalf = aB.xyz;
  if (aC.y > 1.5) {
    // The shadow: a quad on the ground over the table and where its shadow
    // falls (the fragment stage shapes it). One face only.
    if (f > 0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    vec2 s = normalize(uSunDir + vec2(1e-5));
    vec2 far = -s * aB.y / 0.55;
    vec2 c = far * 0.5;
    vec2 hs = vec2(aB.x, aB.z) + abs(far) * 0.5 + 0.35;
    vec3 w = vec3(c.x + cn.x * hs.x, 0.0, c.y + cn.y * hs.y);
    vWorld = w;
    vLocal = w;
    vNorm = vec3(0.0, 1.0, 0.0);
    gl_Position = project(w);
    return;
  }
  // A box: face f (+x, -x, +y, -y, +z, -z), corner cn.
  int ax = f / 2;
  float sg = (f % 2 == 0) ? 1.0 : -1.0;
  vec3 n = vec3(ax == 0 ? sg : 0.0, ax == 1 ? sg : 0.0, ax == 2 ? sg : 0.0);
  vec3 u = ax == 0 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 v = ax == 2 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vec3 lp = (n + cn.x * u + cn.y * v) * aB.xyz;
  vLocal = lp;
  float ct = cos(aA.w);
  float st = sin(aA.w);
  mat3 tilt = mat3(1.0, 0.0, 0.0, 0.0, ct, st, 0.0, -st, ct);
  vec3 w = aA.xyz + tilt * lp;
  vWorld = w;
  vNorm = tilt * n;
  gl_Position = project(w);
}
`;

export const DESK_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uWood;
uniform vec3 uSky;      // the sky's tint overhead
uniform vec3 uShadow;   // the meadow's shade (multiplied)
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vLocal;
in vec3 vHalf;
in vec3 vWorld;
in vec3 vNorm;
flat in float vGrain;
flat in float vSeed;
flat in float vKind;
out vec4 outColor;

${DESK_SHADE_GLSL}
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float h3(ivec3 c) { return float(pcg(uint(c.x) * 73856093u ^ uint(c.y) * 19349663u ^ uint(c.z) * 83492791u)) / 4294967295.0; }
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = x - i;
  f = f * f * (3.0 - 2.0 * f);
  ivec3 c = ivec3(i);
  float a = mix(mix(h3(c), h3(c + ivec3(1, 0, 0)), f.x), mix(h3(c + ivec3(0, 1, 0)), h3(c + ivec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(h3(c + ivec3(0, 0, 1)), h3(c + ivec3(1, 0, 1)), f.x), mix(h3(c + ivec3(0, 1, 1)), h3(c + ivec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}

void main() {
  vec3 col;
  if (vKind > 1.5) {
    float k = deskShade(vWorld.xz);
    outColor = vec4(mix(vec3(1.0), uShadow, k * 0.8), 1.0);
    return;
  }
  // The grain: along the board, and across it (the end grain shows rings).
  vec3 p = vLocal;
  float along = vGrain < 0.5 ? p.x : vGrain < 1.5 ? p.y : p.z;
  vec2 across = vGrain < 0.5 ? p.yz : vGrain < 1.5 ? p.xz : p.xy;
  // Rings round a pith off the board, wobbling along it.
  vec2 pith = vec2(0.12 + 0.2 * vSeed, -0.05 - 0.15 * fract(vSeed * 7.0)) * (vSeed > 0.5 ? 1.0 : -1.0);
  // The log tapers and bends, so its rings drift across the board along
  // it: cut flat, they show as arches (cathedral grain), not stripes.
  pith += vec2(0.0, along * (0.06 + 0.05 * fract(vSeed * 13.0)) + 0.025 * sin(along * 3.1 + vSeed * 20.0));
  float wob = noise3(vec3(along * 2.2, across * 9.0 + vSeed * 50.0)) * 0.012 + sin(along * 1.9 + vSeed * 20.0) * sin(along * 0.7 + vSeed * 9.0) * 0.01;
  float r = length(across - pith) + wob;
  float ring = fract(r * 70.0);
  float lines = smoothstep(0.55, 0.95, ring) * (1.0 - smoothstep(0.95, 1.0, ring));
  float streak = noise3(vec3(along * 4.0 + vSeed * 9.0, across * 140.0));
  float tone = 0.95 + 0.09 * sin(along * 2.3 + across.x * 11.0 + vSeed * 30.0) * sin(along * 0.9 + across.y * 7.0 + vSeed * 12.0);
  // Each board its own: some paler, some darker, a little warmer or not.
  vec3 board = vec3(0.86 + 0.26 * fract(vSeed * 17.0)) * vec3(1.0, 0.97 + 0.06 * fract(vSeed * 29.0), 0.94 + 0.1 * fract(vSeed * 37.0));
  col = uWood * board * tone * (1.0 - 0.28 * lines) * (0.92 + 0.12 * streak);
  // Worn edges: a little lighter where hands and weather rub.
  vec3 e = vHalf - abs(p);
  vec3 an = abs(normalize(vNorm));
  float edge = min(an.x > 0.5 ? 1.0 : e.x, min(an.y > 0.5 ? 1.0 : e.y, an.z > 0.5 ? 1.0 : e.z));
  col *= 1.0 + 0.16 * (1.0 - smoothstep(0.0, 0.006, edge));
  // Lit by the scene: the low body's light, the sky's from above; under
  // the top, in its shade.
  vec3 N = normalize(vNorm);
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  float lam = dot(N, L);
  col *= mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam));
  col *= mix(vec3(1.0), uSky, 0.25 + 0.15 * max(N.y, 0.0));
  float underTop = step(vWorld.y, ${(DESK_BOX.h - TOP_T - 0.001).toFixed(4)}) * (1.0 - smoothstep(0.0, 0.2, max(abs(vWorld.x) - ${TOP_X.toFixed(4)}, abs(vWorld.z) - ${DESK_Z.toFixed(4)})));
  col *= mix(1.0, mix(0.55, 0.85, smoothstep(0.0, ${DESK_BOX.h.toFixed(2)}, ${DESK_BOX.h.toFixed(2)} - vWorld.y)), underTop);
  // The top in the light catches a sheen of the sky.
  col += uSky * 0.05 * smoothstep(0.5, 1.0, N.y);
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;

export const DESK_STRIDE = TREE_STRIDE;
