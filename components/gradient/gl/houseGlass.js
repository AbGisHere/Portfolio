/**
 * (0.4.2) The house's glass and the pool's water, drawn last over a copy of
 * the frame (what's behind them, already lit), so each can bend what it
 * shows and mirror what it faces, as real dielectrics:
 *
 * - **Glass** (soda-lime, 12 mm, n ≈ 1.52 with dispersion): each pane a
 *   slab. Its reflectance from Fresnel's equations at the angle it's seen
 *   at, both faces summed (2R / (1 + R)), so a pane seen square on shows the
 *   room behind and one seen at a glance the sky; what comes through is
 *   shifted sideways by the slab per colour and tinted green along the path
 *   through it, deepest at an edge seen end on.
 * - **Water** (n 1.331 / 1.334 / 1.337 for red, green, blue): its surface
 *   the simulated field (poolWater.js), displaced and shaded from its
 *   slope. Each colour refracts on its own path down to the basin's floor
 *   or walls, so the tiles split at their edges where the water bends
 *   them; the light along each path is absorbed as water absorbs it (red
 *   first). The reflection is the mirrored house (houseReflect, when drawn)
 *   over the sky, by Fresnel.
 */

import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { METAL_GLSL } from './laptopShader';
import { GLASS_THICK, POOL } from './houseShape';
import { WATER } from './poolWater';
import { box, grid } from './meshKit';

const f = x => (Number.isInteger(x) ? `${x}.0` : x.toFixed(5));
const v2 = a => `vec2(${a.map(f).join(', ')})`;
const v3 = a => `vec3(${a.map(f).join(', ')})`;
const PMIN = [POOL.at[0] - POOL.w / 2, POOL.at[2] - POOL.d / 2];
const PMAX = [POOL.at[0] + POOL.w / 2, POOL.at[2] + POOL.d / 2];
const FLOOR_Y = POOL.at[1] - POOL.deep;

/** The indices: soda-lime glass and water, for red, green and blue. */
export const IOR = { glass: [1.5145, 1.5198, 1.5262], water: [1.3311, 1.3340, 1.3372] };

/**
 * The glass and the water as one mesh (`{ data, count, windows, rails,
 * water }`, each a [first, count] range): each pane a box, its part saying
 * which way it faces (0 its thin side along x, 1 along z; +2 for the
 * terrace's); the water a grid over the pool (part 4), displaced in the
 * vertex shader. The windows and the water are drawn first, the
 * terrace's glass over a fresh copy of them (it's in front of both).
 */
/**
 * A pane: its two broad faces with (s, t) running 0 … 1 across and up it,
 * its edges with (s, t) 0; the part says which way it faces (0 its thin
 * side along x, 1 along z; +2 for a balustrade's) and, in its fraction,
 * how wide it is (metres / 100), so the shader can draw its edges to the
 * millimetre.
 */
function pane(out, lo, hi, rail) {
  const alongX = hi[0] - lo[0] < hi[2] - lo[2];
  const wide = alongX ? hi[2] - lo[2] : hi[0] - lo[0];
  const part = (alongX ? 0 : 1) + (rail ? 2 : 0) + Math.min(0.099, wide / 100);
  const first = out.length;
  box(out, lo, hi, part);
  // Re-coordinate the broad faces: s across, t up, 0 … 1.
  for (let i = first; i < out.length; i += 9) {
    const n = alongX ? out[i + 3] : out[i + 5];
    if (Math.abs(n) < 0.5) {
      out[i + 7] = 0;
      out[i + 8] = 0;
      continue;
    }
    const a = alongX ? out[i + 2] : out[i];
    out[i + 7] = (a - (alongX ? lo[2] : lo[0])) / wide;
    out[i + 8] = (out[i + 1] - lo[1]) / (hi[1] - lo[1]);
  }
}

export function glassMesh(glass) {
  const out = [];
  const ranges = {};
  const mark = (name, from) => (ranges[name] = [from, out.length / 9 - from]);

  for (const rail of [false, true]) {
    const from = out.length / 9;
    for (const [lo, hi, r] of glass) {
      if (r !== rail) continue;
      pane(out, lo, hi, rail);
    }
    mark(rail ? 'rails' : 'windows', from);
  }
  const from = out.length / 9;
  grid(out, 180, 76, (u, w) => ({ p: [PMIN[0] + 0.02 + u * (POOL.w - 0.04), POOL.at[1], PMIN[1] + 0.02 + w * (POOL.d - 0.04)], part: 4, s: u, t: w }));
  mark('water', from);
  const data = new Float32Array(out);
  return { data, count: data.length / 9, ...ranges };
}

export const GLASS_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;
layout(location = 3) in vec2 aST;

${CAMERA_GLSL}
uniform sampler2D uWater;
uniform float uWaterOn;
out vec3 vWorld;
out vec3 vNorm;
out vec2 vST;
flat out int vPart;
flat out float vWide;

${PROJECT_GLSL}
void main() {
  vPart = int(floor(aPart + 0.001));
  vWide = (aPart - float(vPart)) * 100.0;
  vST = aST;
  vec3 p = aPos;
  // The water stands where the field has it.
  if (vPart == 4) p.y += textureLod(uWater, aST, 0.0).r * uWaterOn;
  vWorld = p;
  vNorm = aNorm;
  gl_Position = project(p);
}
`;

export const GLASS_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uSun;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uWood;
uniform float uNight;
uniform sampler2D uScene;    // the frame behind, as drawn
uniform sampler2D uWater;    // the water's field (r: height, metres)
uniform float uWaterOn;
uniform float uWaterT;
uniform sampler2D uReflect;  // the house mirrored in the water (a: there)
uniform float uReflectOn;
uniform vec3 uSky;

in vec3 vWorld;
in vec3 vNorm;
in vec2 vST;
flat in int vPart;
flat in float vWide;
out vec4 outColor;

${METAL_GLSL}
${PROJECT_GLSL}

// Where a world point lands on the frame (0 … 1).
vec2 screenOf(vec3 w) {
  vec4 c = project(w);
  return clamp(c.xy / max(c.w, 1e-4) * 0.5 + 0.5, vec2(0.001), vec2(0.999));
}

// Fresnel's reflectance for unpolarised light from air into n, at cos ci.
float fresnel(float ci, float n) {
  float st = sqrt(max(0.0, 1.0 - ci * ci)) / n;
  if (st >= 1.0) return 1.0;
  float ct = sqrt(1.0 - st * st);
  float rs = (ci - n * ct) / (ci + n * ct);
  float rp = (n * ci - ct) / (n * ci + ct);
  return 0.5 * (rs * rs + rp * rp);
}

// The sky and what's round it, mirrored along R, and the body's glint.
// What's out there along R, as a mirror shows it: the sky, and toward the
// mountains their ranges against it (a far one hazed into the sky, a nearer
// one darker), the meadow below the horizon, and the body's glint.
vec3 mirrored(vec3 R, float a) {
  vec3 Ls = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  vec3 c = envAt(R);
  float az = atan(R.x, R.z);
  float facing = smoothstep(-0.1, 0.35, R.z);
  float far = 0.035 + 0.05 * envNoise(vec2(az * 5.0, 1.0)) + 0.02 * envNoise(vec2(az * 17.0, 3.0));
  float near = 0.015 + 0.04 * envNoise(vec2(az * 3.3 + 7.0, 5.0)) + 0.015 * envNoise(vec2(az * 11.0, 9.0));
  vec3 farCol = mix(uEnvLow, uEnvTop, 0.35) * 0.82;
  vec3 nearCol = mix(uEnvTop * 0.55, uWood * 0.7, 0.35);
  if (R.y > 0.0 && R.y < far) c = mix(c, farCol, facing);
  if (R.y > 0.0 && R.y < near) c = mix(c, nearCol, facing);
  if (R.y <= 0.0) c = mix(uWood * 0.8, mix(uEnvLow, uWood, 0.6), exp(R.y * 12.0));
  c *= mix(1.0, 0.35, uNight);
  return c + uSun * pow(max(dot(R, Ls), 0.0), 1.0 / max(a, 1e-3)) * 3.0 * (1.0 - 0.7 * uNight);
}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  vec3 I = -V;
  vec2 here = screenOf(vWorld);
  vec3 col;
  if (vPart == 4) {
    // ---- The water. Its slope from the field, and a fine ripple over it.
    vec2 uv = (vWorld.xz - ${v2(PMIN)}) / ${v2([POOL.w, POOL.d])};
    vec2 e = vec2(1.0 / ${WATER.nx}.0, 1.0 / ${WATER.nz}.0);
    vec2 slope = vec2(texture(uWater, uv + vec2(e.x, 0.0)).r - texture(uWater, uv - vec2(e.x, 0.0)).r,
      texture(uWater, uv + vec2(0.0, e.y)).r - texture(uWater, uv - vec2(0.0, e.y)).r) / (2.0 * e * ${v2([POOL.w, POOL.d])}) * uWaterOn;
    vec2 w = vWorld.xz * 2.3 + uWaterT * vec2(0.06, 0.04);
    slope += (vec2(noise2(w), noise2(w + 17.0)) - 0.5) * 0.035 + (vec2(noise2(w * 3.1 + 5.0), noise2(w * 3.1 - 9.0)) - 0.5) * 0.015;
    N = normalize(vec3(-slope.x, 1.0, -slope.y));
    float ci = max(dot(N, V), 1e-3);
    // Each colour down its own path to the basin's floor or walls.
    vec3 through;
    vec3 Fr;
    for (int c = 0; c < 3; c++) {
      float n = c == 0 ? ${f(IOR.water[0])} : c == 1 ? ${f(IOR.water[1])} : ${f(IOR.water[2])};
      vec3 d = refract(I, N, 1.0 / n);
      float t = (${f(FLOOR_Y)} - vWorld.y) / min(d.y, -1e-3);
      if (d.x > 1e-4) t = min(t, (${f(PMAX[0])} - vWorld.x) / d.x);
      if (d.x < -1e-4) t = min(t, (${f(PMIN[0])} - vWorld.x) / d.x);
      if (d.z > 1e-4) t = min(t, (${f(PMAX[1])} - vWorld.z) / d.z);
      if (d.z < -1e-4) t = min(t, (${f(PMIN[1])} - vWorld.z) / d.z);
      vec3 hit = vWorld + d * max(t, 0.0);
      float s = texture(uScene, screenOf(hit))[c];
      // Absorbed along the way down and back up toward the light's way in
      // (pure water: a = 0.34, 0.056, 0.012 per metre), and a little light
      // scattered back toward the eye from the water itself.
      float a = c == 0 ? 0.34 : c == 1 ? 0.056 : 0.012;
      float path = t + (vWorld.y - hit.y);
      float keep = exp(-a * path * 1.6);
      float glow = (c == 0 ? 0.02 : c == 1 ? 0.1 : 0.13) * (1.0 - exp(-path * 0.5)) * mix(1.0, 0.6, uNight);
      through[c] = s * keep + glow * (uEnvTop[c] * 0.5 + uEnvLow[c] * 0.5);
      Fr[c] = fresnel(ci, n);
    }
    vec3 R = reflect(I, N);
    vec3 refl = mirrored(R, 0.0025);
    if (uReflectOn > 0.5) {
      // The house mirrored, where it's there, nudged by the surface's slope.
      vec4 m = texture(uReflect, here + slope * 0.03);
      refl = mix(refl, m.rgb, m.a);
    }
    col = mix(through, refl, Fr);
  } else {
    // ---- A pane of glass. Its faces are the panes' broad sides; seen
    // through its edge, it's the glass's own green.
    bool rail = vPart >= 2;
    int axis = vPart % 2;
    bool face = axis == 0 ? abs(N.x) > 0.5 : abs(N.z) > 0.5;
    vec3 Ng = dot(N, V) < 0.0 ? -N : N;
    // Toughened glass isn't quite flat: the rollers leave a faint wave
    // across it (~30 cm), and it's never perfectly true, so reflections
    // waver along a pane and break a little between panes.
    float wave = face ? sin(vWorld.y * 21.0 + (vWorld.x + vWorld.z) * 0.7) * 0.0035 + (envNoise(vWorld.xz * 0.8 + vWorld.y * 0.6) - 0.5) * 0.004 : 0.0;
    if (face) Ng = normalize(Ng + vec3(0.0, wave, 0.0) + (axis == 0 ? vec3(0.0, 0.0, wave * 0.6) : vec3(wave * 0.6, 0.0, 0.0)));
    float ci = max(abs(dot(Ng, V)), 1e-3);
    vec3 tang = I - dot(I, Ng) * Ng;
    vec3 side = length(tang) > 1e-5 ? normalize(tang) : vec3(0.0);
    vec3 through;
    vec3 Rs;
    for (int c = 0; c < 3; c++) {
      float n = c == 0 ? ${f(IOR.glass[0])} : c == 1 ? ${f(IOR.glass[1])} : ${f(IOR.glass[2])};
      float si = sqrt(max(0.0, 1.0 - ci * ci));
      float ct = sqrt(max(1e-4, 1.0 - si * si / (n * n)));
      // The slab's sideways shift of the ray (t sin θi (1 − cos θi / (n cos θt)))
      // and the path inside it.
      float shift = ${f(GLASS_THICK)} * si * (1.0 - ci / (n * ct));
      float path = face ? ${f(GLASS_THICK)} / ct : 0.6;
      vec2 at = here + (screenOf(vWorld - side * shift) - here) + vec2(0.0, wave * 0.35);
      float s = texture(uScene, at)[c];
      // Float glass's iron: a faint green that deepens along the path.
      float a = c == 0 ? 3.2 : c == 1 ? 1.1 : 2.4;
      float r = fresnel(ci, n);
      Rs[c] = 2.0 * r / (1.0 + r);
      through[c] = s * exp(-a * path) * (1.0 - Rs[c]);
    }
    vec3 refl = mirrored(reflect(I, Ng), 0.002);
    col = through + refl * Rs;
    // A little dust on it, catching the light, more toward its foot.
    col += (uEnvTop * 0.5 + uSun * 0.3) * (0.008 + 0.012 * envNoise(vWorld.xy * 9.0 + vWorld.z * 7.0)) * (rail ? 1.0 + 1.5 * exp(-(vWorld.y - ${f(POOL.at[1])}) * 6.0) : 1.0) * mix(1.0, 0.3, uNight);
    // Laminated: two sheets on an interlayer, a faint grey-green through it.
    col *= vec3(0.93, 0.965, 0.95);
    // Its edges, drawn to the millimetre (whatever the pixels): the
    // polished edge seen end on, the glass's own deep green, and at it the
    // light bent by the edge's arris, what's behind shifted and dimmed. The
    // balustrade's top edge catches the sky and the sun as a bright line.
    vec3 edgeCol = texture(uScene, here).rgb * vec3(0.22, 0.4, 0.34) + vec3(0.1, 0.24, 0.2) * (uEnvTop * 0.6 + uSun * 0.5) * mix(1.0, 0.35, uNight);
    if (!face) col = edgeCol + refl * 0.08;
    else {
      float px = max(vWide * fwidth(vST.x), 1e-5);
      float dEdge = min(vST.x, 1.0 - vST.x) * vWide;
      float side = 1.0 - smoothstep(0.012, 0.012 + px * 1.5, dEdge);
      float near = 1.0 - smoothstep(0.012, 0.035, dEdge);
      if (near > 0.0) {
        vec2 bend = (vST.x < 0.5 ? -1.0 : 1.0) * vec2(dFdx(vST.x), dFdy(vST.x)) / max(length(vec2(dFdx(vST.x), dFdy(vST.x))), 1e-6) * 0.004;
        col = mix(col, texture(uScene, here + bend * near).rgb * 0.8 * vec3(0.85, 0.95, 0.9) + refl * Rs, near * 0.6);
      }
      col = mix(col, edgeCol, side);
      if (rail) {
        float pyH = max(1.01 * fwidth(vST.y), 1e-5);
        float dTop = (1.0 - vST.y) * 1.01;
        float lip = 1.0 - smoothstep(0.0, 0.006 + pyH * 1.5, dTop);
        col = mix(col, (uEnvTop * 1.2 + uSun * 0.6) * mix(1.0, 0.4, uNight) * vec3(0.8, 0.95, 0.9), lip * 0.8);
      }
    }
  }
  outColor = vec4(col, 1.0);
}
`;
