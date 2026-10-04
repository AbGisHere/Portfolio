/**
 * (0.3.5) Wildflowers in the grass under the desk camera: instanced like the
 * blades (grassShader.js), drawn just after them against the same depth.
 * One draw, no vertex data: every flower comes from its instance number.
 *
 * - **Where.** Three rings of world-snapped cells around the camera's foot
 *   (a flower never moves when the camera does), SLOTS flowers a cell,
 *   placed by an integer hash. They grow in the meadow's drifts, the same
 *   ones its painted flowers keep to (meadowTexture.js, A at 30 m), with a
 *   few strays between. Each has its own threshold and grows in as the
 *   density passes it, so nothing pops; past FADE they've faded out and the
 *   meadow pass's painted flowers carry on (MEADOW_FLOWERS, faded in over
 *   the same metres).
 * - **Kinds.** Daisies (cream petals round a yellow eye), buttercups (five
 *   glossy yellow petals) and, taller, clover-like pom-poms in the recipe's
 *   `petal`. Buttercups and daisies gather in patches of their own.
 * - **Shape.** A thin stem bent as one arc, like a blade: its own lean, the
 *   wind, the footprints (PUSH_SUM). The head follows the stem's tip: the
 *   daisy's and buttercup's a disc facing up (leaning a little toward the
 *   light), so from above they're open faces and from the side they
 *   foreshorten; the pom-pom faces the camera.
 * - **Look.** Lit like the grass (the sky's tint, the body's light glowing
 *   through from behind), hazed with distance, grain on top.
 */

import { PRINTS_GLSL, PUSH_SUM } from './grassShader';
import { TREE_SHADE_GLSL } from './treeShader';
import { DESK_SHADE_GLSL } from './deskShader';

const f = v => v.toFixed(6);

export const FLOWERS = {
  rings: 3,
  // Cells per ring side, and the innermost ring's cell size (metres).
  side: 16,
  cell: 0.5,
  slots: 6,
  // Flowers per m² in a drift, and between drifts.
  drift: 7,
  stray: 0.5,
  // Metres from the camera over which they fade out (the painted flowers
  // fade in over the same).
  fade: [9, 13],
  // The drifts' scale (metres) in the meadow's texture: MEADOW_FLOWERS's.
  driftScale: 30,
};

export const FLOWER_INSTANCES = FLOWERS.rings * FLOWERS.side * FLOWERS.side * FLOWERS.slots;
// Three stem segments (two triangles each), then the head's two.
const STEM_SEGS = 3;
export const FLOWER_VERTS = STEM_SEGS * 6 + 6;

export const FLOWER_VERTEX = `#version 300 es
precision highp float;
precision highp int;

uniform vec4 uPitch;    // cos, sin of the pitch, focal length (CSS px), zoom
uniform vec4 uScreen;   // optical centre on screen (xy), frame size (zw), CSS px
uniform vec3 uCam;      // the camera, metres from the desk's centre (y up, z forward)
uniform vec2 uDepthAB;  // perspective depth: A, B (metres)
uniform float uT;       // the wind's clock, seconds
uniform float uWindA;   // the wind's strength (0: still)
uniform vec2 uSunDir;   // where the light comes from across the ground (x, z)
uniform float uPxCss;   // one device pixel, CSS px
uniform vec4 uTreeShadow; // the lone tree's shadow (treeShader.js)
uniform sampler2D uMeadow;

out vec2 vUV;          // across the head (-1 … 1); the stem: (side, t)
flat out float vKind;  // 0 stem, 1 daisy, 2 buttercup, 3 pom-pom
out float vVar;
out float vDist;
out float vFront;      // the head's face toward the camera (-1 … 1)
out float vLit;        // the head's face toward the light (-1 … 1)
out float vBack;       // how far the camera looks toward the light past it
out float vPress;
out float vSpin;
out float vTree;   // in the lone tree's or the desk's shadow (0 … 1)

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

${PRINTS_GLSL}
${TREE_SHADE_GLSL}${DESK_SHADE_GLSL}

// Projected as the scene's pitched camera sees it (grassShader.js): clip
// space linear in the camera's coordinates, no divide.
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
  int per = ${FLOWERS.side * FLOWERS.side * FLOWERS.slots};
  int ring = gl_InstanceID / per;
  int r = gl_InstanceID - ring * per;
  int cell = r / ${FLOWERS.slots};
  int fi = r - cell * ${FLOWERS.slots};
  float c = ${f(FLOWERS.cell)} * exp2(float(ring));
  ivec2 at = ivec2(floor(uCam.xz / c)) - ${FLOWERS.side / 2} + ivec2(cell % ${FLOWERS.side}, cell / ${FLOWERS.side});
  uint s = pcg(uint(at.x) * 7919u ^ pcg(uint(at.y) * 104729u ^ pcg(uint(ring * 8 + fi) + 51u)));
  vec2 pos = (vec2(at) + vec2(rnd(s), rnd(s))) * c;

  // Which ring owns this spot (a crossfade at each edge), and how many grow
  // here: the drifts, the strays between, fading out with distance.
  float m = max(abs(pos.x - uCam.x), abs(pos.y - uCam.z));
  float edge = ${f(FLOWERS.cell * FLOWERS.side / 2)} * exp2(float(ring));
  float inner = ring == 0 ? 0.0 : edge * 0.5;
  float own = (ring == 0 ? 1.0 : smoothstep(inner * 0.9, inner, m)) - smoothstep(edge * 0.9, edge, m);
  vec2 rel = pos - uCam.xz;
  float d = length(vec3(rel.x, uCam.y, rel.y));
  float drift = smoothstep(0.45, 0.7, textureLod(uMeadow, pos / ${f(FLOWERS.driftScale)}, 0.0).a);
  float want = (${f(FLOWERS.stray)} + ${f(FLOWERS.drift)} * drift) * (1.0 - smoothstep(${f(FLOWERS.fade[0])}, ${f(FLOWERS.fade[1])}, d));
  float p = own * want * c * c / ${f(FLOWERS.slots)};
  float grow = clamp((p - rnd(s)) / 0.1, 0.0, 1.0);
  vec3 q0 = vec3(rel.x, -uCam.y, rel.y);
  float z0 = -q0.y * uPitch.y + q0.z * uPitch.x;
  float fz = uPitch.w * uPitch.z;
  // A device pixel at the root, in metres.
  float pxM = z0 > 0.0 ? uPxCss * z0 / fz : 1.0;
  if (grow <= 0.0 || z0 <= 0.0 || pxM > 0.03) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // The kind: buttercups and daisies each in patches of their own, the
  // taller pom-poms scattered through both.
  float patchK = vnoise(pos * 0.45 + 31.0);
  float kr = rnd(s);
  float kind = kr < 0.13 ? 3.0 : (rnd(s) < smoothstep(0.25, 0.75, patchK) ? 2.0 : 1.0);
  float var = rnd(s);
  float hgt = kind == 3.0 ? 0.36 + 0.2 * rnd(s) : kind == 2.0 ? 0.26 + 0.16 * rnd(s) : 0.2 + 0.14 * rnd(s);
  hgt *= grow;
  float rad = (kind == 3.0 ? 0.03 : kind == 2.0 ? 0.026 : 0.04) * (0.8 + 0.4 * rnd(s)) * mix(0.4, 1.0, grow);
  float yaw = rnd(s) * 6.2831853;
  vec2 face = vec2(sin(yaw), cos(yaw));
  vec2 bend = face * (0.05 + 0.25 * rnd(s));
  float spin = rnd(s) * 6.2831853;

  // The wind, as on the blades (stiffer stems, a head that nods).
  vec2 wd = normalize(vec2(0.8, -0.6));
  float wave = 0.5 + 0.5 * sin(dot(pos, wd) * 1.3 - uT * 1.6);
  float gust = vnoise(pos * 0.25 - wd * uT * 0.4);
  bend += uWindA * (wd * (0.12 + 0.45 * wave * gust) + face * 0.06 * sin(uT * 4.0 + var * 40.0));

  // The footprints (grassShader.js): pressed flat and leaning away.
${PUSH_SUM}
  bend += push.xy;
  float squash = push.w;
  hgt *= 1.0 - 0.8 * squash;

  // The stem: one arc of constant curvature, length hgt.
  float phi = min(length(bend) * 1.3, 1.5);
  vec2 bd = length(bend) > 1e-5 ? normalize(bend) : face;
  int v = gl_VertexID;
  // A stem at least a device pixel wide (no shimmer far off).
  float sw = max(0.0035, pxM * 0.9);
  vec3 w;
  vFront = 1.0;
  vLit = 0.0;
  if (v < ${STEM_SEGS * 6}) {
    int seg = v / 6;
    int k = v - seg * 6;
    // Two triangles per segment: (0,0) (1,0) (0,1) / (1,0) (1,1) (0,1).
    int up = (k == 2 || k == 4 || k == 5) ? 1 : 0;
    float sd = (k == 1 || k == 3 || k == 4) ? 0.5 : -0.5;
    float t = float(seg + up) / ${f(STEM_SEGS)};
    float ang = phi * t;
    float off = phi < 1e-3 ? hgt * phi * t * t * 0.5 : hgt * (1.0 - cos(ang)) / phi;
    float y = phi < 1e-3 ? hgt * t : hgt * sin(ang) / phi;
    vec2 toCam = normalize(-rel + vec2(1e-5));
    vec2 across = vec2(toCam.y, -toCam.x);
    w = vec3(pos.x + bd.x * off + across.x * sd * sw, y, pos.y + bd.y * off + across.y * sd * sw);
    vUV = vec2(sd * 2.0, t);
    vKind = 0.0;
  } else {
    int k = v - ${STEM_SEGS * 6};
    vec2 cn = vec2((k == 1 || k == 3 || k == 4) ? 1.0 : -1.0, (k == 2 || k == 4 || k == 5) ? 1.0 : -1.0);
    // The stem's tip and the way it points there.
    float off = phi < 1e-3 ? hgt * phi * 0.5 : hgt * (1.0 - cos(phi)) / phi;
    float y = phi < 1e-3 ? hgt : hgt * sin(phi) / phi;
    vec3 tip = vec3(pos.x + bd.x * off, y, pos.y + bd.y * off);
    vec3 tang = vec3(bd.x * sin(phi), cos(phi), bd.y * sin(phi));
    // Never under a pixel and a half across.
    float R = max(rad, pxM * 1.5);
    vec3 a1;
    vec3 a2;
    vec3 n;
    if (kind == 3.0) {
      // The pom-pom faces the camera.
      a1 = vec3(1.0, 0.0, 0.0);
      a2 = vec3(0.0, uPitch.x, uPitch.y);
      n = vec3(0.0, uPitch.y, -uPitch.x);
      tip += tang * R * 0.7;
    } else {
      // The disc faces up along the stem, turned partly toward the eye (as
      // flowers are drawn: from the side a face, not a sliver), a little
      // toward the light and its own way.
      n = normalize(tang + normalize(uCam - tip) * 0.8 + vec3(uSunDir.x, 0.0, uSunDir.y) * 0.2 + vec3(face.x, 0.0, face.y) * 0.2);
      a1 = normalize(cross(n, abs(n.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
      a2 = cross(n, a1);
      tip += n * 0.004;
    }
    w = tip + (a1 * cn.x + a2 * cn.y) * R;
    vUV = cn;
    vKind = kind;
    vec3 toEye = normalize(uCam - tip);
    vFront = dot(n, toEye);
    vLit = dot(n, normalize(vec3(-uSunDir.x, 0.6, -uSunDir.y)));
  }
  gl_Position = project(w);
  vVar = var;
  vDist = d;
  vTree = max(treeShade(pos, uTreeShadow), deskShade(pos));
  vBack = clamp(dot(normalize(rel + vec2(1e-5)), uSunDir), 0.0, 1.0);
  vPress = push.z;
  vSpin = spin;
}
`;

export const FLOWER_FRAGMENT = `#version 300 es
precision highp float;

uniform vec3 uMid;
uniform vec3 uTip;
uniform vec3 uFlower;    // the daisy's petals
uniform vec3 uBloom;     // the buttercup, the daisy's eye
uniform vec3 uPetal;     // the pom-pom
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uShade;     // the meadow's shade (the tree's shadow, multiplied)
uniform vec3 uHaze;
uniform vec2 uHazeAt;
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec2 vUV;
flat in float vKind;
in float vVar;
in float vDist;
in float vFront;
in float vLit;
in float vBack;
in float vPress;
in float vTree;
in float vSpin;
out vec4 outColor;

void main() {
  vec3 col;
  float press = clamp(vPress, 0.0, 1.0);
  if (vKind == 0.0) {
    // The stem: the grass's colours, a shade deeper.
    col = mix(uMid * 0.8, uTip * 0.85, vUV.y);
    col *= mix(vec3(1.0), uSky, 0.25);
  } else {
    float r = length(vUV);
    float ang = atan(vUV.y, vUV.x) + vSpin;
    float aa = fwidth(r);
    float back = step(vFront, 0.0);
    float edge;
    if (vKind == 1.0) {
      // The daisy: eleven to fifteen petals, rounded at the tips, round a
      // domed yellow eye.
      float np = floor(11.0 + vVar * 5.0);
      float petal = abs(cos(ang * np * 0.5));
      float rim = mix(0.42, 1.0, pow(petal, 0.35));
      edge = rim - r;
      float eye = 0.3 - r;
      vec3 pc = mix(uFlower * 0.82, uFlower, smoothstep(0.3, 0.75, r));
      // A crease down each petal.
      pc *= 1.0 - 0.06 * (1.0 - smoothstep(0.0, 0.25, petal)) * step(0.3, r);
      vec3 ec = mix(uBloom, uBloom * 0.6, smoothstep(0.05, 0.3, r));
      col = mix(pc, ec, smoothstep(-aa, aa, eye) * (1.0 - back));
      // From behind: green sepals at the middle, the petals' backs dimmer.
      col = mix(col, back > 0.5 ? (r < 0.32 ? uMid : col * 0.8) : col, back);
    } else if (vKind == 2.0) {
      // The buttercup: five broad petals, glossy, a darker heart.
      float petal = abs(cos(ang * 2.5));
      float rim = mix(0.72, 1.0, pow(petal, 0.6));
      edge = rim - r;
      col = mix(uBloom * 0.72, uBloom, smoothstep(0.1, 0.6, r));
      col = mix(col, uMid * 0.9 + uBloom * 0.2, (1.0 - smoothstep(0.12, 0.2, r)));
      // The gloss: a bright streak on the petals toward the light.
      float gloss = smoothstep(0.55, 0.95, petal) * smoothstep(0.35, 0.6, r) * (1.0 - smoothstep(0.75, 0.95, r));
      col = mix(col, min(col * 1.45 + 0.08, vec3(1.0)), gloss * clamp(vLit, 0.0, 1.0) * (1.0 - back));
      col = mix(col, uBloom * 0.6, back * 0.7);
    } else {
      // The pom-pom: a fringed ball, lit as a sphere, green at its foot.
      float fringe = 0.86 + 0.14 * abs(sin(ang * 9.0 + vVar * 20.0)) * abs(cos(ang * 4.0));
      edge = fringe - r;
      float nz = sqrt(max(0.0, 1.0 - r * r));
      float lit = 0.5 + 0.5 * dot(normalize(vec3(vUV * vec2(1.0, -1.0), nz)), normalize(vec3(0.3, -0.5, 0.8)));
      col = uPetal * mix(0.72, 1.08, smoothstep(0.35, 0.75, lit));
      col = mix(col, uMid, (1.0 - smoothstep(-0.85, -0.45, vUV.y)) * 0.8);
    }
    if (edge < 0.0) discard;
    // The face toward the light a little brighter (a step, not a ramp).
    col *= 0.9 + 0.12 * smoothstep(-0.1, 0.2, vLit);
    col *= mix(vec3(1.0), uSky, 0.2);
  }
  // The body's light glowing through from behind, as on the blades.
  col = mix(col, col * uSun * 1.6, (0.15 + 0.4 * vBack) * (vKind == 0.0 ? vUV.y * vUV.y : 0.6) * (1.0 - press));
  col *= 0.9 + 0.2 * vVar;
  col *= 1.0 - 0.4 * press;
  col *= mix(vec3(1.0), uShade, vTree * 0.8);
  col = mix(col, uHaze, smoothstep(uHazeAt.x, uHazeAt.y, vDist));
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float n = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * n, 1.0 - 2.0 * (1.0 - col) * (1.0 - n), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;
