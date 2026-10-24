/**
 * (0.4.0) The house on the hill and the pool on its terrace (houseShape.js).
 * (0.4.1) Built in code in 3D like the desk: the lawn mound it stands on,
 * the house's boxes and its railing, one mesh, lit live by the sky (no
 * lightmaps) like the things on the desk (propsShader.js), its glass and
 * water mirroring the sky (laptopShader.js METAL_GLSL). The sun's shadows
 * come from its big boxes (HOUSE_OCCLUDERS), traced per pixel. By night
 * its windows are lit from inside and the pool from under the water.
 */

import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { METAL_GLSL } from './laptopShader';
import { HOUSE_BOXES, HOUSE_OCCLUDERS, HOUSE_PART, MOUND, RAILING, moundY } from './houseShape';
import { KIT_STRIDE, box, grid, tube } from './meshKit';

export const HOUSE_STRIDE = KIT_STRIDE;

const f = x => x.toFixed(4);
const v3 = a => `vec3(${a.map(f).join(', ')})`;

/** The mound, the house and its railing, as one mesh: `{ data, count }`.
 * Built once. */
export function houseMesh() {
  const out = [];
  // The mound: rings out from its top, a little past its foot so it meets
  // the meadow flat.
  const [cx, cz] = MOUND.at;
  const [rx, rz] = MOUND.r;
  grid(out, 40, 72, (u, v) => {
    const r = 1.12 * u ** 1.4;
    const a = v * Math.PI * 2;
    const x = cx + rx * r * Math.cos(a);
    const z = cz + rz * r * Math.sin(a);
    return { p: [x, moundY(x, z), z], part: HOUSE_PART.lawn, s: x, t: z };
  });
  for (const [lo, hi, part] of HOUSE_BOXES) box(out, lo, hi, HOUSE_PART[part], { bottom: false });
  for (const [p, q, r] of RAILING) tube(out, p, q, r, HOUSE_PART.steel, 8);
  const data = new Float32Array(out);
  return { data, count: data.length / HOUSE_STRIDE };
}

export const HOUSE_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;
layout(location = 3) in vec2 aST;

${CAMERA_GLSL}
out vec3 vWorld;
out vec3 vNorm;
out vec2 vST;
flat out int vPart;

${PROJECT_GLSL}
void main() {
  vWorld = aPos;
  vNorm = aNorm;
  vST = aST;
  vPart = int(aPart + 0.5);
  gl_Position = project(aPos);
}
`;

const P = HOUSE_PART;
export const HOUSE_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uWood;     // what the glass mirrors below the horizon: the lawn
uniform vec3 uLawn;     // the lawn: the grass's colour from afar
uniform vec3 uLawnTip;
uniform vec3 uHaze;     // what the meadow hazes into with distance
uniform vec2 uHazeAt;   // over these distances (metres)
uniform float uNight;
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vWorld;
in vec3 vNorm;
in vec2 vST;
flat in int vPart;
out vec4 outColor;

${METAL_GLSL}

// Whether the ray from p toward the light meets one of the house's big
// boxes (a slab test each).
bool shadowed(vec3 p, vec3 L) {
  vec3 inv = 1.0 / L;
${HOUSE_OCCLUDERS.map(([lo, hi]) => `  {
    vec3 a = (${v3(lo)} - p) * inv;
    vec3 b = (${v3(hi)} - p) * inv;
    vec3 n = min(a, b);
    vec3 x = max(a, b);
    float t0 = max(max(n.x, n.y), n.z);
    float t1 = min(min(x.x, x.y), x.z);
    if (t1 > max(t0, 0.0)) return true;
  }`).join('\n')}
  return false;
}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  float lam = dot(N, L);
  // In the house's shadow, lit as if turned away.
  if (lam > -0.2 && shadowed(vWorld + N * 0.04, L)) lam = -0.2;
  vec3 lit = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.12 + 0.08 * max(N.y, 0.0) + 0.25 * uNight) * mix(1.0, 0.26, uNight);
  // Each face's own coordinates (metres): x or z along it, y up it (the
  // tops: x and z).
  vec2 st = vST;
  vec3 col;
  if (vPart == ${P.lawn}) {
    // At its foot the mound frays into the meadow (which shows where it's
    // left out), so there's no line round it.
    if (vWorld.y < 0.25 * noise2(vWorld.xz * 0.9) + 0.04 * hash2(floor(gl_FragCoord.xy))) discard;
    // Mown lawn: the grass's colour from afar, in faint stripes down the
    // slope, mottled.
    float stripe = smoothstep(0.35, 0.65, abs(fract(st.x / 3.0) - 0.5) * 2.0);
    float mott = noise2(st * 0.6) * 0.6 + noise2(st * 3.1) * 0.4;
    vec3 c = uLawn * (0.95 + 0.04 * stripe + 0.08 * mott);
    // Darker in against the house's base.
    float foot = 1.0 - smoothstep(0.0, 2.5, max(abs(vWorld.x) - 9.0, max(vWorld.z + 58.0, -81.0 - vWorld.z)));
    // Lit like the meadow round it (mistShader.js's ground): the grass's
    // far colour under the sky, hazing a little with distance,
    // with only the slope's light on top.
    float relief = mix(0.85, 1.08, smoothstep(-0.2, 0.6, dot(N, L) - dot(vec3(0.0, 1.0, 0.0), L)));
    c *= mix(vec3(1.0), uSky, 0.25) * relief * (1.0 - 0.3 * foot);
    col = mix(c, uHaze, 0.35 * smoothstep(uHazeAt.x, uHazeAt.y, length(uCam - vWorld)));
  } else if (vPart == ${P.stone}) {
    // Coursed stone: blocks of a warm grey, each a little its own.
    float row = floor(st.y / 0.32);
    float blk = floor(st.x / 0.9 + 0.5 * mod(row, 2.0));
    vec3 c = vec3(0.6, 0.56, 0.5) * (0.85 + 0.25 * hash2(vec2(blk, row)));
    float joint = max(1.0 - smoothstep(0.0, 0.02, abs(fract(st.y / 0.32) - 0.5) * 0.32 - 0.14), 0.0);
    if (N.y > 0.5) { c = vec3(0.66, 0.62, 0.56) * (0.9 + 0.15 * noise2(vWorld.xz * 1.3)); joint = 0.0; }
    col = c * (1.0 - 0.35 * joint) * lit;
  } else if (vPart == ${P.render}) {
    col = vec3(0.9, 0.87, 0.81) * (0.96 + 0.06 * noise2(st * 2.0)) * lit;
  } else if (vPart == ${P.timber}) {
    // Vertical cladding: boards 14 cm wide, each its own shade.
    float b = floor(st.x / 0.14);
    vec3 c = vec3(0.5, 0.32, 0.2) * (0.8 + 0.35 * hash2(vec2(b, 7.0)));
    c *= 0.9 + 0.15 * noise2(vec2(b * 3.0, st.y * 6.0));
    c *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.012, abs(fract(st.x / 0.14) - 0.5) * 0.14 - 0.058));
    col = c * lit;
  } else if (vPart == ${P.glass}) {
    // The sky mirrored over a dim room; by night the room lit, a pane at a
    // time, some brighter than others.
    gSat = 0.8;
    gSpec = 0.4;
    float pane = floor((vWorld.x + vWorld.z) / 1.6);
    vec3 room = vec3(0.09, 0.1, 0.11) * (0.8 + 0.4 * hash2(vec2(pane, 2.0)));
    vec3 glow = vec3(1.0, 0.72, 0.42) * (0.45 + 0.55 * hash2(vec2(pane, 5.0))) * (0.6 + 0.4 * smoothstep(0.0, 2.5, st.y - floor(st.y / 3.5) * 3.5));
    room = mix(room * lit, glow * 0.85, uNight);
    col = room + shine(N, V, L, 0.04, 0.06) * mix(1.0, 0.35, uNight);
  } else if (vPart == ${P.frame}) {
    col = vec3(0.13, 0.135, 0.14) * lit + shine(N, V, L, 0.35, 0.04) * 0.4;
  } else if (vPart == ${P.slab}) {
    col = vec3(0.8, 0.78, 0.74) * (0.95 + 0.08 * noise2(st * 1.5)) * lit;
  } else if (vPart == ${P.deck}) {
    // Decking: boards along x, 14 cm, with dark gaps.
    float b = floor(st.y / 0.14);
    vec3 c = vec3(0.55, 0.38, 0.25) * (0.82 + 0.3 * hash2(vec2(b, 3.0)) + 0.1 * noise2(vec2(st.x * 0.8, b)));
    c *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.01, abs(fract(st.y / 0.14) - 0.5) * 0.14 - 0.062));
    col = c * lit;
  } else if (vPart == ${P.tile} || vPart == ${P.water}) {
    // The pool's tiles (25 cm, pale aqua with white grout) and, through the
    // water, the same tiles, deepened and tinted, the sky mirrored over
    // them more as the view lowers; by night lit from under the water.
    vec2 tq = vPart == ${P.water} ? vWorld.xz : st;
    vec2 g = abs(fract(tq / 0.25) - 0.5) * 0.25;
    float grout = 1.0 - smoothstep(0.004, 0.009, min(g.x, g.y));
    vec3 tile = mix(vec3(0.42, 0.74, 0.8), vec3(0.88, 0.94, 0.94), grout * 0.7);
    if (vPart == ${P.tile}) col = tile * lit;
    else {
      vec2 w = vWorld.xz * 1.7;
      vec3 Nw = normalize(vec3(noise2(w) - 0.5, 9.0, noise2(w + 17.0) - 0.5));
      float nv = max(dot(Nw, V), 0.0);
      float fr = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
      vec3 under = tile * vec3(0.55, 0.8, 0.85) * lit;
      under = mix(under, vec3(0.3, 0.85, 0.95) * 0.7, uNight * 0.75);
      gSat = 0.9;
      gSpec = 0.6;
      col = mix(under, envAt(reflect(-V, Nw)) * mix(1.0, 0.5, uNight), fr) + uSun * pow(max(dot(reflect(-L, Nw), V), 0.0), 80.0) * 0.6 * (1.0 - uNight);
    }
  } else if (vPart == ${P.steel}) {
    col = vec3(0.55, 0.56, 0.58) * 0.5 * lit + shine(N, V, L, 0.25, 0.6) * 0.6;
  } else {
    col = vec3(0.86, 0.82, 0.75) * (0.95 + 0.08 * noise2(vWorld.xz * 3.0)) * lit;
  }
  if (uGrainA > 0.0) {
    ivec2 gi = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, gi, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;
