/**
 * (0.3.5) The meadow's trees under the desk camera: one lone tree by the
 * desk, off to the left, framing the closing shot, and a few copses out on
 * the meadow. Drawn after the grass and flowers, against the same depth.
 *
 * - **Layout.** Fixed (`treeLayout`, from a fixed seed): every visit has the
 *   same trees. The copses keep clear of the line over the desk, so the
 *   mountains behind it stay open.
 * - **Grown, not shaped.** Each tree grows from its seed (`grow`): a
 *   trunk wandering up and flared at the roots, splitting into a few limbs,
 *   each splitting again into branches and twigs, every split its own angle
 *   and length, a leader carrying on up, everything bending a little toward
 *   the light. Leaves grow only at the twigs, so a crown's outline is
 *   wherever its branches reach, with sky and branches showing through.
 * - **Wood.** Every segment a six-sided tube, fixed in the world like
 *   everything else (never turned to the camera), its radius matching at
 *   every joint, never under about a pixel; the bark ridged and fissured by
 *   noise wrapped round it, lit by its own surface, mossy at the foot.
 * - **Leaves.** Clusters, each a card of five pointed leaves round a stem,
 *   fixed in the world (they never reshuffle as the camera moves),
 *   swaying a little in place in the wind (never turning); lit by their own facing in three cel
 *   tones (shade, leaf, lit), darker underneath, translucent and glowing
 *   when the low light is behind them.
 * - **Shadows.** Each tree lays a long soft oval on the ground away from
 *   the light, multiplied in the meadow's shade colour; the lone tree's
 *   also falls on the grass and flowers (TREE_SHADE_GLSL).
 * - **Distance.** Hazed toward the mist at the mountains' foot. Dithered in
 *   with the meadow's paint (the descent's first frame is the 0.2 meadow),
 *   and out past where the meadow meets the mountains' foot (it would
 *   stand on the ridges).
 */

import { seeded } from './bootPrint';

const LONE = { x: -6.4, z: 9.5, h: 8, spread: 4.4, depth: 4, leaves: 22, leafSize: 0.47 };

// The copses: where each stands (metres from the desk), and how many trees.
// All within the closing shot's view and short of where the mountains'
// foot lies from it (~85 m), so the trees seen coming down are the ones
// standing round the desk at the end.
const COPSES = [
  [-26, 40, 4],
  [-40, 60, 5],
  [-20, 68, 3],
  [26, 46, 3],
  [40, 62, 5],
];

const norm = v => {
  const l = Math.hypot(...v) || 1;
  return v.map(c => c / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// A direction `ang` radians off `dir`, turned `az` round it.
const turn = (dir, ang, az) => {
  const t1 = norm(cross(dir, Math.abs(dir[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0]));
  const t2 = cross(dir, t1);
  const [c, s] = [Math.cos(ang), Math.sin(ang)];
  return norm(dir.map((d, i) => d * c + (t1[i] * Math.cos(az) + t2[i] * Math.sin(az)) * s));
};

/**
 * Every trunk and branch, every leaf cluster, then every tree's shadow, as
 * instance data: 12 floats each. Returns { data, wood, parts } (how many
 * are wood; how many come before the shadows).
 * - wood (kind 0): a its foot x, y, z, half-width; b its end x, y, z,
 *   half-width
 * - shadow (kind 2): a the foot x, 0, z, the crown's spread; b its height
 * - leaf cluster (kind 3): a its centre x, y, z, size; b its facing x, y,
 *   z, spin
 * - c, for all: kind, seed, the tree's foot x, z
 */
export function treeLayout() {
  const rnd = seeded(0x7ee5);
  const woods = [];
  const leafs = [];
  const shadows = [];
  const tree = ({ x, z, h, spread, depth, leaves, leafSize }) => {
    const bark = rnd();
    const wood = (a, b, wa, wb) => woods.push([...a, wa, ...b, wb, 0, bark, x, z]);
    const leaf = (p, n) => leafs.push([...p, leafSize * (0.8 + 0.4 * rnd()), ...n, rnd() * Math.PI * 2, 3, rnd(), x, z]);
    // One branch from p along dir, in a few bending segments; then its own
    // branches, or, at the twigs, its leaves.
    const grow = (p, dir, len, rad, d) => {
      const segs = d < 2 ? 3 : 2;
      const pts = [p];
      let at = p;
      let dr = dir;
      for (let i = 1; i <= segs; i++) {
        dr = norm(dr.map((v, k) => v + (rnd() - 0.5) * 0.35 + (k === 1 ? 0.1 : 0)));
        const next = at.map((v, k) => v + dr[k] * (len / segs));
        wood(at, next, rad * (1 - 0.3 * ((i - 1) / segs)), rad * (1 - 0.3 * (i / segs)));
        pts.push(next);
        at = next;
      }
      if (d >= depth) {
        // Leaves round the twig's end and along it, facing out and up.
        const n = leaves;
        for (let i = 0; i < n; i++) {
          const t = 0.35 + 0.65 * Math.sqrt(rnd());
          const base = pts[0].map((v, k) => v + (at[k] - v) * t);
          const off = norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]).map(v => v * len * 0.45 * rnd());
          const pos = base.map((v, k) => v + off[k]);
          leaf(pos, norm(dr.map((v, k) => v * 0.5 + off[k] / (len * 0.45 + 1e-6) * 0.6 + (k === 1 ? 0.5 : 0))));
        }
        return;
      }
      // A leader carrying on, and one or two branching off, each its own
      // angle round it.
      const kids = 2 + (rnd() < 0.55 ? 1 : 0);
      const az0 = rnd() * Math.PI * 2;
      for (let c = 0; c < kids; c++) {
        const lead = c === 0;
        const from = pts[lead ? segs : Math.max(1, Math.round(segs * (0.45 + 0.55 * rnd())))];
        const nd = turn(dr, lead ? 0.15 + 0.2 * rnd() : 0.5 + 0.45 * rnd(), az0 + c * 2.4 + rnd() * 0.6);
        grow(from, nd, len * (lead ? 0.72 : 0.6 + 0.15 * rnd()), rad * (lead ? 0.7 : 0.55), d + 1);
      }
    };
    // The trunk: one smooth curve from the roots up to where the limbs
    // part, flared at its foot, its radius matching at every joint.
    const trunkH = h * (0.32 + 0.1 * rnd());
    const base = Math.max(0.14, h * 0.032);
    const lean = [(rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12];
    const ph = rnd() * Math.PI * 2;
    const at = y => {
      const t = Math.max(0, y) / trunkH;
      const sway = Math.sin(t * 2.6 + ph) * 0.06 * h * 0.05 * 2;
      return [x + lean[0] * y + sway, y, z + lean[1] * y + Math.cos(t * 2.1 + ph) * 0.04 * h * 0.05 * 2];
    };
    const radius = y => base * (1.15 - 0.4 * Math.max(0, y) / trunkH + 0.95 * Math.exp(-Math.max(0, y) / 0.35));
    const ys = [-0.2, 0.15, 0.5, trunkH * 0.3, trunkH * 0.55, trunkH * 0.8, trunkH];
    for (let k = 0; k < ys.length - 1; k++) wood(at(ys[k]), at(ys[k + 1]), radius(ys[k]), radius(ys[k + 1]));
    const top = at(trunkH);
    // The limbs: three to five, spread round the trunk's top.
    const limbs = 3 + Math.floor(rnd() * 3);
    const az0 = rnd() * Math.PI * 2;
    for (let l = 0; l < limbs; l++) {
      grow(top, turn([0, 1, 0], 0.35 + 0.55 * rnd(), az0 + l * 2.39996 + rnd() * 0.5), (h - trunkH) * (0.55 + 0.2 * rnd()), radius(trunkH) * 0.85, 1);
    }
    shadows.push([x, 0, z, spread, h, 0, 0, 0, 2, rnd(), x, z]);
  };
  tree(LONE);
  for (const [cx, cz, n] of COPSES) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 6 * Math.sqrt(rnd());
      const h = 6 + 5 * rnd();
      tree({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, h, spread: h * 0.42, depth: 3, leaves: 11, leafSize: 0.8 });
    }
  }
  // Nearest first from the closing shot's camera, where the lone tree is
  // biggest: the depth test then skips the leaves behind before shading them.
  const from = ([a, b, c]) => Math.hypot(a, b - 1, c + 0.7);
  woods.sort((a, b) => from(a) - from(b));
  leafs.sort((a, b) => from(a) - from(b));
  return { data: new Float32Array([...woods, ...leafs, ...shadows].flat()), wood: woods.length, parts: woods.length + leafs.length };
}

/** The lone tree's shadow on the grass and flowers (the copses' are past
 * where blades grow): its foot x, z, length, half-width (metres). */
export const LONE_SHADOW = [LONE.x, LONE.z, LONE.h * 1.4, LONE.spread];

/**
 * How far a point on the ground (x, z metres) lies in a tree's shadow
 * (0 … 1): a long soft oval from its foot away from the light (the body is
 * always low, beyond the mountains). `uTreeShadow`: foot x, z, length,
 * half-width; `uSunDir` toward the body.
 */
export const TREE_SHADE_GLSL = `float treeShade(vec2 p, vec4 sh) {
  vec2 s = -normalize(uSunDir + vec2(1e-5));
  vec2 o = p - sh.xy;
  float hl = sh.z * 0.5 + sh.w * 0.3;
  float u = (dot(o, s) - sh.z * 0.5 + sh.w * 0.3) / hl;
  float v = dot(o, vec2(-s.y, s.x)) / sh.w;
  return 1.0 - smoothstep(0.55, 1.0, length(vec2(u, v)));
}
`;

export const TREE_STRIDE = 12;

// The camera, shared by both stages: a point's depth.
const CAMERA_GLSL = `uniform vec4 uPitch;    // cos, sin of the pitch, focal length (CSS px), zoom
uniform vec4 uScreen;   // optical centre on screen (xy), frame size (zw), CSS px
uniform vec3 uCam;      // the camera, metres from the desk's centre (y up, z forward)
uniform vec2 uDepthAB;
uniform vec2 uSunDir;

// The camera's depth of a world point (metres along the view).
float depthOf(vec3 w) {
  vec3 q = w - uCam;
  return -q.y * uPitch.y + q.z * uPitch.x;
}
`;

export const TREE_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;

${CAMERA_GLSL}
uniform float uT;
uniform float uWindA;
uniform float uFarM;    // metres from the camera to the mountains' foot (huge when it's above the frame)
uniform float uA;       // faded in with the meadow's paint

out vec2 vUV;
flat out float vKind;
out float vHaze;
out float vFade;
out float vBack;
out float vSeed;
out float vWy;         // a trunk's height in the world (its bark)
out vec3 vNorm;        // a leaf cluster's facing
out vec3 vView;        // from the camera to it

// Projected as the scene's camera sees it (grassShader.js): clip space
// linear in the camera's coordinates, so a point behind it is clipped.
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
  int k = gl_VertexID;
  vec2 cn = vec2((k == 1 || k == 3 || k == 4) ? 1.0 : -1.0, (k == 2 || k == 4 || k == 5) ? 1.0 : -1.0);
  vec2 foot = aC.zw;
  float far = length(foot - uCam.xz);
  vHaze = 0.92 * smoothstep(6.0, 130.0, far);
  // A tree standing past where the meadow meets the mountains' foot would
  // stand on the ridges, so it fades out there (dithered, as it fades in
  // with the meadow).
  vFade = uA * (1.0 - smoothstep(uFarM * 0.92, uFarM, far));
  if (vFade <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vKind = aC.x;
  vSeed = aC.y;
  vUV = cn;
  vWy = 0.0;
  vNorm = vec3(0.0, 1.0, 0.0);
  vView = vec3(0.0, 0.0, 1.0);
  vec3 w;
  if (aC.x > 1.5 && aC.x < 2.5) {
    // A shadow: an oval on the ground from the foot, away from the light,
    // in true perspective (it lies flat).
    vec2 sd = -normalize(uSunDir + vec2(1e-5));
    vec2 ac = vec2(-sd.y, sd.x);
    float len = aB.x * 1.4;
    float hl = len * 0.5 + aA.w * 0.3;
    vec2 c = aA.xz + sd * (len * 0.5 - aA.w * 0.3);
    vec2 p = c + sd * cn.x * hl + ac * cn.y * aA.w;
    w = vec3(p.x, 0.0, p.y);
  } else if (aC.x > 2.5) {
    // A leaf cluster: a card fixed in the world at its own angle (seen from
    // above, its top; from the side, its edge), swaying a little in place
    // with the wind, never turning.
    vec3 c = aA.xyz;
    vec3 n = aB.xyz;
    // Fewer, larger clusters where they're small on screen: the crown
    // stays as full, for far less overdraw (half under ~8 px, under a third
    // under ~4 px).
    float pxs = aA.w * uPitch.z * uPitch.w / max(depthOf(c), 0.01);
    float keep = pxs < 4.0 ? 0.3 : pxs < 8.0 ? 0.5 : 1.0;
    if (fract(aC.y * 7.13) >= keep) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    float size = aA.w * inversesqrt(keep);
    vec2 wd = normalize(vec2(0.8, -0.6));
    float flt = uWindA * sin(uT * 2.3 + aC.y * 40.0);
    c.xz += wd * uWindA * 0.06 * sin(uT * 0.9 + aC.y * 6.0) + wd * 0.03 * aA.w * flt;
    vec3 t1 = normalize(cross(n, abs(n.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(n, t1);
    float sp = aB.w;
    vec3 e1 = t1 * cos(sp) + t2 * sin(sp);
    vec3 e2 = -t1 * sin(sp) + t2 * cos(sp);
    w = c + (e1 * cn.x + e2 * cn.y) * size;
    vNorm = n;
    vView = normalize(c - uCam);
  } else if (aC.x < 0.5) {
    // Wood: a six-sided tube from a to b (36 vertices: six sides of two
    // triangles), a sliver longer at each end to close the joints.
    vec3 a = aA.xyz;
    vec3 b = aB.xyz;
    vec3 ax = normalize(b - a);
    vec3 e1 = normalize(cross(ax, abs(ax.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 e2 = cross(ax, e1);
    int sideI = k / 6;
    int corner = k - sideI * 6;
    float cx = (corner == 1 || corner == 3 || corner == 4) ? 1.0 : 0.0;
    float cy = (corner == 2 || corner == 4 || corner == 5) ? 1.0 : 0.0;
    float th = (float(sideI) + cx) * 1.0471976;
    float len = max(length(b - a), 1e-3);
    float t = cy > 0.5 ? 1.0 + aB.w * 0.3 / len : -aA.w * 0.3 / len;
    vec3 m = mix(a, b, t);
    vec3 nrm = cos(th) * e1 + sin(th) * e2;
    // Never under about a pixel across (twigs far off would shimmer).
    float px = max(depthOf(m), 0.01) / (uPitch.z * uPitch.w);
    w = m + nrm * max(mix(aA.w, aB.w, clamp(t, 0.0, 1.0)), 0.5 * px);
    vUV = vec2(th, t);
    vNorm = nrm;
    vWy = w.y + length(w.xz - foot) * 0.7;
  }
  gl_Position = project(w);
  vBack = clamp(dot(normalize(foot - uCam.xz + vec2(1e-5)), uSunDir), 0.0, 1.0);
}
`;

export const TREE_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uShadeC;   // the crown's three tones
uniform vec3 uLeaf;
uniform vec3 uLit;
uniform vec3 uBark;
uniform vec3 uSun;      // the body's light
uniform vec3 uSky;      // the sky's tint overhead
uniform vec3 uHaze;     // the mist at the mountains' foot
uniform vec3 uShadow;   // the meadow's shade (multiplied)
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec2 vUV;
flat in float vKind;
in float vHaze;
in float vFade;
in float vBack;
in float vSeed;
in float vWy;
in vec3 vNorm;
in vec3 vView;
out vec4 outColor;

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
  // Fading in or out: dithered (4×4 ordered), the tree being opaque.
  const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 bq = ivec2(gl_FragCoord.xy) & 3;
  if (vFade < 1.0 && vFade * 16.0 <= BAYER[bq.y * 4 + bq.x] + 0.5) discard;
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  vec3 col;
  if (vKind > 1.5 && vKind < 2.5) {
    // A shadow, multiplied into the ground: soft, its edge a little uneven.
    float ang = atan(vUV.y, vUV.x);
    float d = length(vUV) + 0.06 * sin(ang * 5.0 + vSeed * 30.0);
    float k = (1.0 - smoothstep(0.55, 1.0, d)) * (1.0 - vHaze) * 0.8 * vFade;
    outColor = vec4(mix(vec3(1.0), uShadow, k), 1.0);
    return;
  }
  if (vKind > 2.5) {
    // A leaf cluster: five pointed leaves fanned from a stem at the card's
    // foot, each its own tone and tilt, a midrib down it.
    vec2 q = vUV;
    float hit = -1.0;
    float across = 0.0;
    // (The fan is fixed; each card's own spin turns it in the world.)
    const vec2 FAN[5] = vec2[5](vec2(0.9458, 0.3248), vec2(0.5810, 0.8139), vec2(-0.0000, 1.0000), vec2(-0.5810, 0.8139), vec2(-0.9458, 0.3248));
    const float REACH[5] = float[5](1.25, 1.5, 1.75, 1.5, 1.25);
    vec2 r = q - vec2(0.0, -0.95);
    for (int i = 0; i < 5; i++) {
      vec2 ax = FAN[i];
      float along = dot(r, ax) / REACH[i];
      float side = dot(r, vec2(-ax.y, ax.x));
      float u = clamp((along - 0.08) / 0.92, 0.0, 1.0);
      float wdt = 0.96 * u * (1.0 - u) * (1.0 + 0.3 * (0.5 - u));
      if (along > 0.08 && along < 1.0 && abs(side) < wdt) {
        hit = float(i);
        across = side / max(wdt, 1e-3);
      }
    }
    if (hit < 0.0) discard;
    float lv = fract(vSeed * 91.0 + hit * 0.53);
    vec3 N = normalize(vNorm + 0.35 * vec3(lv - 0.5, 0.0, fract(lv * 7.0) - 0.5));
    float l = dot(N, L) + (lv - 0.5) * 0.25;
    col = mix(uShadeC, uLeaf, smoothstep(-0.25, -0.12, l));
    col = mix(col, uLit, smoothstep(0.3, 0.42, l));
    col = mix(col, col * (1.0 + 0.3 * uSky), smoothstep(0.2, 0.8, N.y) * 0.5);
    col *= mix(0.72, 1.0, smoothstep(-0.8, 0.4, vNorm.y));
    // Translucent: the low light through a leaf seen against it.
    float through = pow(max(dot(vView, L), 0.0), 2.0) * smoothstep(-0.1, 0.5, dot(N, vView) + 0.3);
    col = mix(col, mix(uLit, uSun, 0.35) * 1.15, through * 0.5);
    col *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.12, abs(across)));
    col *= 0.9 + 0.2 * lv;
    col *= mix(vec3(1.0), uSky, 0.22);
  } else if (vKind < 0.5) {
    // Bark: lit by the tube's own surface, ridged and fissured up its
    // length (noise wrapped round it, so no seam), mossy at the foot.
    vec3 bn = normalize(vNorm);
    float lam = dot(bn, L);
    col = uBark * mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam));
    vec2 ring = vec2(cos(vUV.x), sin(vUV.x));
    float ridge = noise3(vec3(ring * 1.3 + vSeed * 40.0, vWy * 0.9));
    float fine = noise3(vec3(ring * 3.4 + vSeed * 17.0, vWy * 3.5));
    col *= 0.82 + 0.3 * smoothstep(0.35, 0.7, ridge * 0.7 + fine * 0.3);
    col *= 1.0 - 0.35 * smoothstep(0.62, 0.75, fine);
    col = mix(col, uShadeC * 1.15, (1.0 - smoothstep(0.0, 0.6, vWy)) * 0.45);
    col *= mix(vec3(1.0), uSky, 0.25);
  }
  col = mix(col, uHaze, vHaze);
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;
