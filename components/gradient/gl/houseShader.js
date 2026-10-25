/**
 * (0.4.0) The house on the hill and the pool on its terrace (houseShape.js).
 * (0.4.2) Its opaque surfaces, lit as physical materials: each part an
 * albedo, a roughness and a Fresnel reflectance (GGX with Schlick, the sky
 * mirrored by roughness: laptopShader.js METAL_GLSL), the sun through a
 * shadow map (houseShadow.js), the sky's light falling off inside the rooms
 * toward their backs. By night the rooms' lamps light them, and the outside
 * only through their openings; the soffit's downlights light the terrace;
 * the pool's light spills onto the coping. The glass and the water are drawn
 * after, over these (houseGlass.js).
 */

import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { METAL_GLSL } from './laptopShader';
import { FLOOR, HOUSE_LIGHTS, HOUSE_PART, HOUSE_STRIPS, PLAN, POOL, DAY_DOWN, MATCH_AXES, ROOF_DECK, ROOM_DAY, ROOM_TONE, STOREY, STRIP_TONE, TERRACE, WALL, ZONES } from './houseShape';
import { houseLayout } from './houseMesh';
import { TURNED_HAZE_GLSL } from '../deskCamera';
import { PROBE_GLSL } from './mirrorProbe';

export const HOUSE_STRIDE = 9;

const f = x => (Number.isInteger(x) ? `${x}.0` : x.toFixed(5));
const v3 = a => `vec3(${a.map(f).join(', ')})`;
const v2 = a => `vec2(${a.map(f).join(', ')})`;

/** The house's opaque mesh (`{ data, count, glass }`), built once. */
export const houseMesh = houseLayout;

export const HOUSE_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;
layout(location = 3) in vec2 aST;
layout(location = 4) in vec3 aPos2;   // (0.4.4) the curtains' other shape
layout(location = 5) in vec3 aNorm2;

${CAMERA_GLSL}
uniform mat4 uLightVP;
uniform vec2 uMirror;   // (0.4.2) on, and the water's height: drawn mirrored in it
uniform float uMorph;   // (0.4.4) how far toward the other shape (the curtains untied, 0.4.14)
out vec3 vWorld;
out vec3 vNorm;
out vec2 vST;
out vec4 vLight;
flat out int vPart;
flat out float vVar;

${PROJECT_GLSL}
void main() {
  vec3 pos = mix(aPos, aPos2, uMorph);
  vec3 nrm = uMorph > 0.0 ? normalize(mix(aNorm, aNorm2, uMorph) + 1e-5) : aNorm;
  vWorld = pos;
  vNorm = nrm;
  vST = aST;
  vPart = int(floor(aPart + 0.001));
  vVar = aPart - float(vPart);
  // Looked up a little off the surface, so it never shades itself; further
  // off where the light grazes it, where the map's texels stretch.
  vec3 Lv = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  vLight = uLightVP * vec4(pos + nrm * mix(0.03, 0.14, 1.0 - abs(dot(nrm, Lv))), 1.0);
  // Mirrored in the water, it's lit where it really is but seen where its
  // reflection is.
  vec3 at = pos;
  if (uMirror.x > 0.5) at.y = 2.0 * uMirror.y - at.y;
  gl_Position = project(at);
}
`;

const P = HOUSE_PART;
const G = PLAN.ground;
const U = PLAN.upper;
const top = FLOOR + STOREY - 0.35;
const utop = TERRACE + STOREY - 0.35;
// The rooms' insides (lo, hi), and their front openings (x0, x1, y0, y1, z).
export const ROOMS = [
  [[G.x[0] + WALL, FLOOR, G.z[0] + WALL], [G.x[1] - WALL, top, G.z[1] - WALL], [-7.4, 4.6, FLOOR, top, G.z[1]]],
  [[U.x[0] + WALL, TERRACE, U.z[0] + WALL], [U.x[1] - WALL, utop, U.z[1] - WALL], [-7.2, 2.6, TERRACE, utop, U.z[1]]],
];
const opening = i => `vec4(${ROOMS[i][2].slice(0, 4).map(f).join(', ')})`;

/** Shared by the opaque surfaces and the glass: the sun's shadow, the rooms,
 * the lamps by night. Needs METAL_GLSL's ggx. */
export const HOUSE_LIGHT_GLSL = `
const vec2 AO_DISC[12] = vec2[](vec2(-0.326, -0.406), vec2(-0.84, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621), vec2(0.962, -0.195), vec2(0.473, -0.48),
  vec2(0.519, 0.767), vec2(0.185, -0.893), vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
uniform highp sampler2DShadow uShadow;
uniform float uShadowOn;

${TURNED_HAZE_GLSL}

// Interleaved gradient noise (Jimenez): a per-pixel turn that reads as an
// even fine texture, not speckle.
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

bool inBox(vec3 p, vec3 lo, vec3 hi) {
  return all(greaterThanEqual(p, lo)) && all(lessThanEqual(p, hi));
}

// How much of the sun reaches here (0 … 1).
float sunShadow(vec4 lp) {
  if (uShadowOn < 0.5) return 1.0;
  vec3 q = lp.xyz / lp.w * 0.5 + 0.5;
  if (any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0)))) return 1.0;
  // 8 taps on a rotated disc (a Poisson set), turned per pixel so the
  // map's texels don't show as steps.
  const vec2 DISC[12] = vec2[](vec2(-0.326, -0.406), vec2(-0.84, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621), vec2(0.962, -0.195), vec2(0.473, -0.48),
    vec2(0.519, 0.767), vec2(0.185, -0.893), vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
  float a = ign(gl_FragCoord.xy) * 6.2832;
  mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));
  float s = 0.0;
  for (int i = 0; i < 8; i++) s += texture(uShadow, vec3(q.xy + rot * DISC[i] * ${f(1.6 / 2048)}, q.z));
  return s / 8.0;
}

// Which room a point is in (houseShape.js ZONES): 0 outside.
int roomOf(vec3 p) {
${ZONES.map(([lo, hi], i) => `  if (inBox(p, ${v3(lo)} - 0.03, ${v3(hi)} + 0.03)) return ${i + 1};`).join('\n')}
  return 0;
}

// (0.4.27) A room's middle (outside, the origin).
vec3 zoneMid(int z) {
${ZONES.map(([lo, hi], i) => `  if (z == ${i + 1}) return ${v3(lo.map((x, k) => (x + hi[k]) / 2))};`).join('\n')}
  return vec3(0.0);
}

// Whether a room looks out through the front glass.
bool fronts(int z) {
  return ${ZONES.map(([, , d], i) => (d === 1 ? `z == ${i + 1}` : null)).filter(Boolean).join(' || ')};
}

// Whether its daylight comes in at a window in the back wall.
bool backs(int z) {
  return ${ZONES.map(([, , d], i) => (d === 2 ? `z == ${i + 1}` : null)).filter(Boolean).join(' || ')};
}

// Whether a lamp at l in room at reaches p in room: the same room, or
// out through its floor's front opening (where the line between them
// crosses the glass's plane).
bool lampSees(vec3 l, vec3 p, int room, int at) {
  if (room == at) return true;
  if (room != 0 || !fronts(at)) return false;
  bool up = l.y > ${f(TERRACE)};
  vec4 o = up ? ${opening(1)} : ${opening(0)};
  float z = up ? ${f(ROOMS[1][2][4])} : ${f(ROOMS[0][2][4])};
  if (p.z <= z) return false;
  vec3 c = mix(l, p, (z - l.z) / (p.z - l.z));
  return c.x > o.x && c.x < o.y && c.y > o.z && c.y < o.w;
}

const vec4 LAMPS[${HOUSE_LIGHTS.length}] = vec4[](${HOUSE_LIGHTS.map(([x, y, z, r]) => `vec4(${f(x)}, ${f(y)}, ${f(z)}, ${f(r)})`).join(', ')});
const vec3 LAMP_K[${HOUSE_LIGHTS.length}] = vec3[](${HOUSE_LIGHTS.map(([, , , , s, k, z]) => `vec3(${f(s)}, ${f(k)}, ${f(z)})`).join(', ')});
// (0.4.27) Each light's colour, its room's (houseShape.js ROOM_TONE).
const vec3 LAMP_C[${HOUSE_LIGHTS.length}] = vec3[](${HOUSE_LIGHTS.map(l => v3(ROOM_TONE[l[6]])).join(', ')});
const vec3 ROOM_C[${ROOM_TONE.length}] = vec3[](${ROOM_TONE.map(v3).join(', ')});
const float ROOM_DAY[${ROOM_DAY.length}] = float[](${ROOM_DAY.map(f).join(', ')});
const float DAY_DOWN[${DAY_DOWN.length}] = float[](${DAY_DOWN.map(f).join(', ')});
const vec3 STRIP_C[${HOUSE_STRIPS.length}] = vec3[](${HOUSE_STRIPS.map(l => v3(STRIP_TONE[l[5]])).join(', ')});
const vec3 STRIP_A[${HOUSE_STRIPS.length}] = vec3[](${HOUSE_STRIPS.map(([a]) => v3(a)).join(', ')});
const vec3 STRIP_B[${HOUSE_STRIPS.length}] = vec3[](${HOUSE_STRIPS.map(([, b]) => v3(b)).join(', ')});
const vec3 STRIP_D[${HOUSE_STRIPS.length}] = vec3[](${HOUSE_STRIPS.map(([, , d]) => { const l = Math.hypot(...d); return v3(d.map(x => x / l)); }).join(', ')});
const vec3 STRIP_K[${HOUSE_STRIPS.length}] = vec3[](${HOUSE_STRIPS.map(([, , , r, k, z]) => v3([r, k, z])).join(', ')});

// The lamps' light at p (normal N, to the eye V), by night: diffuse and a
// soft highlight of roughness a. (0.4.27) With \`day\`, only the room's own
// lights, as many and as strong as it keeps on by day (ROOM_DAY).
vec3 lampsAt(vec3 p, vec3 N, vec3 V, float a, int room, bool day) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${HOUSE_LIGHTS.length}; i++) {
    // (A light that's off.)
    if (LAMP_K[i].x <= 0.0) continue;
    vec3 l = LAMPS[i].xyz;
    vec3 d = l - p;
    float r = length(d);
    int kind = int(LAMP_K[i].y + 0.5);
    int at = int(LAMP_K[i].z + 0.5);
    float on = 1.0;
    if (day) {
      if (at != room) continue;
      on = kind == 3 ? DAY_DOWN[room] : ROOM_DAY[room];
      if (on <= 0.0) continue;
    }
    // Every lamp in a room fills all of it a little, bounced off its walls.
    if (at != 0 && room == at) sum += LAMP_C[i] * LAMP_K[i].x * 0.04 * on;
    if (r > LAMPS[i].w) continue;
    // The soffit's and the porch's downlights light only outside.
    if (at == 0 && room != 0) continue;
    if (at != 0 && !lampSees(l, p, room, at)) continue;
    vec3 Ld = d / r;
    float fall = pow(clamp(1.0 - pow(r / LAMPS[i].w, 4.0), 0.0, 1.0), 2.0) / (1.0 + r * r * 0.08);
    // A downlight throws down, in a cone.
    if (kind == 1 || kind == 3) fall *= mix(0.12, 1.0, smoothstep(0.25, 0.8, Ld.y));
    // (0.4.6) An uplight throws up, a narrow beam grazing what it's under.
    if (kind == 4) fall *= smoothstep(0.55, 0.9, -Ld.y) * 1.6;
    // (0.4.27) A spot throws a tight pool straight down, its edge soft.
    if (kind == 5) fall *= smoothstep(0.93, 0.985, Ld.y) * 2.4;
    vec3 H = normalize(Ld + V);
    float spec = ggx(max(dot(N, H), 0.0), max(a * a, 0.02)) * 0.05;
    // (With a share of its light bounced round the room, from every side.)
    sum += LAMP_C[i] * LAMP_K[i].x * on * fall * (max(dot(N, Ld), 0.0) + spec + (at == 0 ? (kind == 5 ? 0.0 : 0.05) : 0.3));
  }
  // (0.4.6) The LED strips: each lights what's before it along its way,
  // from its nearest point.
  for (int i = 0; i < ${HOUSE_STRIPS.length}; i++) {
    int at = int(STRIP_K[i].z + 0.5);
    if (room != at || STRIP_K[i].y <= 0.0 || (day && (at == 0 || ROOM_DAY[at] <= 0.0))) continue;
    vec3 a = STRIP_A[i];
    vec3 ab = STRIP_B[i] - a;
    vec3 c = a + ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    vec3 d = c - p;
    float r = length(d);
    if (r > STRIP_K[i].x) continue;
    vec3 Ld = d / max(r, 1e-4);
    float fall = pow(clamp(1.0 - pow(r / STRIP_K[i].x, 2.0), 0.0, 1.0), 2.0) / (1.0 + r * r * 2.0);
    fall *= smoothstep(-0.1, 0.6, dot(-Ld, STRIP_D[i]));
    // (0.4.26) Nothing behind the face it shines from: not the shelf
    // it's set in.
    fall *= smoothstep(0.0, 0.015, dot(p - c, STRIP_D[i]));
    sum += STRIP_C[i] * STRIP_K[i].y * (day ? ROOM_DAY[at] : 1.0) * fall * max(dot(N, Ld), 0.0);
  }
  return sum * 1.35;
}

// (0.4.27) How a fitting at p glows: as its light is set (the nearest
// light's colour and strength, a strip's within a few centimetres), so
// one that's off is dark and a dimmed one dim; \`day\` how much of it is on
// by day.
vec3 fittingGlow(vec3 p, int room, out float day) {
  float best = 1.0;
  vec3 glow = ROOM_C[room];
  day = room == 0 ? 0.0 : ROOM_DAY[room];
  for (int i = 0; i < ${HOUSE_LIGHTS.length}; i++) {
    float r = length(LAMPS[i].xyz - p);
    if (r < best) {
      best = r;
      glow = LAMP_C[i] * min(LAMP_K[i].x / 0.42, 1.15);
      int at = int(LAMP_K[i].z + 0.5);
      day = at == 0 ? 0.0 : int(LAMP_K[i].y + 0.5) == 3 ? DAY_DOWN[at] : ROOM_DAY[at];
    }
  }
  for (int i = 0; i < ${HOUSE_STRIPS.length}; i++) {
    vec3 a = STRIP_A[i];
    vec3 ab = STRIP_B[i] - a;
    float r = length(a + ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0) - p);
    if (r < min(best, 0.08)) {
      best = r;
      glow = STRIP_C[i] * min(STRIP_K[i].y / 0.42, 1.15);
      day = ROOM_DAY[int(STRIP_K[i].z + 0.5)];
    }
  }
  return glow;
}
`;

/** (0.4.2) The house's depth along the view, for the ambient occlusion
 * (houseShader's own vertex stage; R16F). */
export const HOUSE_DEPTH_FRAGMENT = `#version 300 es
precision highp float;
${CAMERA_GLSL}
uniform vec2 uMirror;
in vec3 vWorld;
flat in int vPart;
out vec4 outColor;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // (Where the lawn frays into the meadow, as the shading pass leaves it.)
  if (vPart == ${HOUSE_PART.lawn} && vWorld.y < 1.0 * pow(hash2(floor(gl_FragCoord.xy)), 0.7)) discard;
  vec3 q = viewOf(vWorld - uCam);
  outColor = vec4(-q.y * uPitch.y + q.z * uPitch.x, 0.0, 0.0, 1.0);
}
`;

export const HOUSE_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uWood;     // what a surface mirrors below the horizon: the lawn
uniform vec3 uLawn;     // the lawn: the grass's colour from afar
uniform vec3 uLawnNear; // (0.4.12) and near, between the blades (the meadow's)
uniform vec3 uHaze;     // what the meadow hazes into with distance
uniform vec2 uHazeAt;   // over these distances (metres)
uniform float uNight;
uniform sampler2D uCaustics; // the sun on the pool's floor (houseGlass.js)
uniform float uCausticsOn;
uniform vec2 uMirror;
uniform sampler2D uAO;   // (0.4.2) the house's depth along the view
uniform float uAOOn;
uniform vec2 uAORes;     // the frame in device pixels
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;
${PROBE_GLSL}
in vec3 vWorld;
in vec3 vNorm;
in vec2 vST;
in vec4 vLight;
flat in int vPart;
flat in float vVar;
out vec4 outColor;

${METAL_GLSL}
${HOUSE_LIGHT_GLSL}

// (0.4.26) Five octaves of noise2: the marble's folded layers.
float fbm5(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * noise2(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s / 0.97;
}

// Boards: which board a coordinate is on, and how far into the dark of the
// gap at its edge (w the board's width, g the gap's).
// (Filtered: where a board is only a few pixels wide its gaps fade to
// their average, so they never alias into moiré.)
vec2 boards(float x, float w, float g) {
  float b = floor(x / w);
  float e = abs(fract(x / w) - 0.5) * w;
  float px = fwidth(x);
  float gap = smoothstep(w * 0.5 - g - px, w * 0.5 - g * 0.3 + px, e);
  float seen = 1.0 - smoothstep(w * 0.08, w * 0.3, px);
  return vec2(b, mix(g / w * 1.4, gap, seen));
}

// How much of a pattern of period p can be seen at this pixel (1 sharp,
// 0 finer than a pixel or two: show its average).
float detail(float p, vec2 q) {
  return 1.0 - smoothstep(p * 0.15, p * 0.45, length(fwidth(q)));
}

// (0.4.2) Ambient occlusion: how much of the open sky and the room's
// bounced light reaches here, from the depths round this pixel (a disc of
// ~22 cm in the world, turned per pixel): neighbours standing just in front
// of it (within 30 cm: in contact, not merely nearer) are what shade a
// corner, a seam, the floor under a sofa.
float ambientAt(int room) {
  if (uAOOn < 0.5) return 1.0;
  vec3 q = viewOf(vWorld - uCam);
  float z = -q.y * uPitch.y + q.z * uPitch.x;
  // (Out of doors and far off, contact shadows are too small to see.)
  if (room == 0 && z > 14.0) return 1.0;
  vec2 uv = gl_FragCoord.xy / uAORes;
  float r = 0.22 * uPitch.w * uPitch.z / max(z, 0.05) / uScreen.z;
  float a = ign(gl_FragCoord.xy + 17.0) * 6.2832;
  mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 asp = vec2(1.0, uScreen.z / uScreen.w);
  float occ = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 o = rot * AO_DISC[i] * r * (0.25 + 0.75 * fract(float(i) * 0.618)) * asp;
    float dz = z - texture(uAO, uv + o).r;
    occ += smoothstep(0.015, 0.05, dz) * (1.0 - smoothstep(0.12, 0.3, dz));
  }
  return 1.0 - 0.75 * occ / 8.0;
}

// The pool's tiles (25 cm, pale aqua, white grout).
vec3 poolTile(vec2 q) {
  vec2 g = abs(fract(q / 0.25) - 0.5) * 0.25;
  float px = length(fwidth(q));
  float grout = mix(0.1, 1.0 - smoothstep(0.003 - px, 0.007 + px, 0.125 - max(g.x, g.y)), 1.0 - smoothstep(0.03, 0.09, px));
  return mix(vec3(0.36, 0.68, 0.76), vec3(0.86, 0.92, 0.92), grout * 0.8);
}

const vec3 BOOKS[10] = vec3[](vec3(0.55, 0.16, 0.12), vec3(0.15, 0.24, 0.38), vec3(0.78, 0.7, 0.52), vec3(0.2, 0.32, 0.22),
  vec3(0.1, 0.1, 0.11), vec3(0.7, 0.45, 0.18), vec3(0.85, 0.82, 0.76), vec3(0.42, 0.22, 0.3), vec3(0.3, 0.42, 0.48), vec3(0.6, 0.3, 0.2));

void main() {
  // (Only what stands above the water is mirrored in it, and never the
  // rooms behind the glass: too dim to show in it.)
  if (uMirror.x > 0.5 && (vWorld.y < uMirror.y || roomOf(vWorld) != 0)) discard;
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  if (uMirror.x > 0.5) V = normalize(vec3(uCam.x, 2.0 * uMirror.y - uCam.y, uCam.z) - vWorld);
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  vec2 st = vST;
  float k = vVar * 10.0;
  // The material: albedo, roughness, F0 (metals take their albedo), light
  // of its own.
  vec3 alb = vec3(0.8);
  float rough = 0.8;
  float f0 = 0.04;
  float metal = 0.0;
  vec3 emit = vec3(0.0);
  if (vPart == ${P.lawn}) {
    // At its foot the mound frays into the meadow (which shows where it's
    // left out), so there's no line round it. (0.4.12) Over its first metre
    // of height, finely dithered, so the meadow gives way to it over metres
    // of ground rather than at a ragged edge.
    if (vWorld.y < 1.0 * pow(hash2(floor(gl_FragCoord.xy)), 0.7)) discard;
    // (0.4.12) The meadow's own colour, as the ground under the camera
    // takes it (mistShader.js): between the blades near, the grass from
    // afar farther; unmown, so no stripes.
    float mott = noise2(st * 0.6) * 0.6 + noise2(st * 3.1) * 0.4;
    // (×1.15: the meadow pass's tint over the ground, on average.)
    alb = mix(uLawnNear, uLawn, smoothstep(4.0, 24.0, length(uCam - vWorld))) * (0.94 + 0.12 * mott) * 1.15;
    rough = 1.0;
  } else if (vPart == ${P.stone}) {
    // Coursed stone, blocks each a little their own, raked joints; the
    // forecourt's flags and the coping laid flat.
    float row = floor(st.y / 0.32);
    float sx = st.x / 0.9 + 0.5 * mod(row, 2.0);
    vec3 c = vec3(0.6, 0.56, 0.5) * (0.82 + 0.28 * hash2(vec2(floor(sx), row) + k));
    float jy = 0.16 - abs(fract(st.y / 0.32) - 0.5) * 0.32;
    float jx = 0.45 - abs(fract(sx) - 0.5) * 0.9;
    float joint = 1.0 - smoothstep(0.004, 0.011, min(jy, jx));
    if (N.y > 0.5) {
      vec2 fq = vWorld.xz / vec2(0.9, 0.6);
      vec2 fe = 0.5 - abs(fract(fq) - 0.5);
      c = vec3(0.68, 0.64, 0.58) * (0.86 + 0.2 * hash2(floor(fq))) * (0.92 + 0.12 * noise2(vWorld.xz * 2.3));
      joint = 1.0 - smoothstep(0.006, 0.016, min(fe.x * 0.9, fe.y * 0.6));
    }
    alb = c * (1.0 - 0.45 * joint);
    rough = vVar > 0.75 ? 0.55 : 0.85;
  } else if (vPart == ${P.paver}) {
    // Honed limestone, laid in a stretcher bond of 90 × 60 cm slabs with
    // 3 mm joints, each slab cut from its own part of the bed: a warm grey
    // beige, its tone, its fossil pitting and its faint bedding lines its
    // own; joints a little sunk and dark with the dirt in them; the slabs
    // not quite level with each other; a sheen where the light grazes.
    vec2 q = abs(N.y) > 0.5 ? vWorld.xz : vec2(vWorld.x + vWorld.z, vWorld.y);
    float row = floor(q.y / 0.6);
    vec2 g = vec2(q.x / 0.9 + 0.5 * mod(row, 2.0), q.y / 0.6);
    vec2 cell = floor(g);
    vec2 e = (0.5 - abs(fract(g) - 0.5)) * vec2(0.9, 0.6);
    float px = length(fwidth(q));
    float joint = 1.0 - smoothstep(0.0015, 0.0035 + px, min(e.x, e.y));
    float tone = hash2(cell);
    vec3 base = mix(vec3(0.7, 0.66, 0.58), vec3(0.6, 0.58, 0.53), tone) * (0.94 + 0.08 * hash2(cell + 9.0));
    float bed = 0.5 + 0.5 * sin((q.y * 0.4 + q.x * 0.1 + noise2(q * 1.3 + cell) * 0.6) * 40.0);
    float mott = noise2(q * 3.0 + cell * 5.0) * 0.6 + noise2(q * 11.0) * 0.4;
    float pits = step(0.92, noise2(q * 55.0 + cell)) * detail(0.004, q);
    alb = base * (0.93 + 0.07 * mott) * (0.97 + 0.04 * bed * detail(0.01, q)) * (1.0 - 0.35 * pits);
    alb = mix(alb, vec3(0.28, 0.26, 0.23), joint * detail(0.008, q));
    // Each slab's own tilt, and its arrises eased at the joint.
    vec2 tilt = (vec2(hash2(cell + 3.0), hash2(cell + 7.0)) - 0.5) * 0.012;
    if (abs(N.y) > 0.5) N = normalize(N + vec3(tilt.x, 0.0, tilt.y) + vec3(sign(fract(g.x) - 0.5) * (1.0 - smoothstep(0.0, 0.01, e.x)), 0.0, sign(fract(g.y) - 0.5) * (1.0 - smoothstep(0.0, 0.01, e.y))) * 0.25);
    rough = 0.55 + 0.25 * mott;
    f0 = 0.04;
  } else if (vPart == ${P.render}) {
    alb = vec3(0.9, 0.87, 0.82) * (0.95 + 0.07 * noise2(st * 3.0) + 0.03 * noise2(st * 40.0));
    rough = 0.92;
  } else if (vPart == ${P.timber}) {
    vec2 b = boards(st.x, 0.14, 0.008);
    alb = vec3(0.47, 0.3, 0.19) * (0.78 + 0.36 * hash2(vec2(b.x, 7.0))) * (0.88 + 0.18 * noise2(vec2(b.x * 3.0, st.y * 9.0)));
    alb *= 1.0 - 0.6 * b.y;
    rough = 0.62;
  } else if (vPart == ${P.frame}) {
    alb = vec3(0.09, 0.095, 0.1);
    rough = 0.35;
    metal = 1.0;
  } else if (vPart == ${P.slab}) {
    // Concrete; the counters' quartz smooth and pale; the fascia's band.
    alb = vVar > 0.5 ? vec3(0.9, 0.89, 0.86) : vec3(0.76, 0.74, 0.7) * (0.92 + 0.1 * noise2(st * 1.7) + 0.04 * noise2(st * 23.0));
    if (vVar > 0.2 && vVar < 0.5) alb *= 0.86;
    rough = vVar > 0.5 ? 0.18 : 0.88;
  } else if (vPart == ${P.deck}) {
    // Oiled hardwood decking, weathered: boards 14.5 cm with 6 mm gaps,
    // staggered end joints, each board its own tone; a grain that streams
    // along it round knots, the end grain darker at the joints, two screws
    // at every joist. Rough, so it scatters the light rather than mirrors
    // it: only a faint sheen at a glance, where the oil sits.
    vec2 b = boards(st.y, 0.145, 0.006);
    float off = hash2(vec2(b.x, 1.0)) * 2.4;
    float run = st.x + off;
    float jn = floor(run / 2.4);
    float along = fract(run / 2.4) * 2.4;
    float joint = 1.0 - smoothstep(0.002, 0.006, min(along, 2.4 - along));
    vec2 id = vec2(b.x, jn);
    float across = fract(st.y / 0.145);
    float wob = noise2(vec2(run * 0.7, across * 3.0 + id.x)) * 1.6 + noise2(vec2(run * 3.0, across * 9.0)) * 0.25;
    float grain = 0.5 + 0.5 * sin((across * 26.0 + wob * 4.0) * 3.14159);
    grain = mix(0.3, pow(grain, 3.0), detail(0.01, st));
    vec3 tone = mix(vec3(0.42, 0.29, 0.19), vec3(0.56, 0.4, 0.27), hash2(id));
    tone = mix(tone, vec3(0.5, 0.47, 0.42), 0.18 + 0.2 * noise2(vec2(run * 0.3, b.x)));
    alb = tone * (0.86 + 0.18 * grain) * (0.93 + 0.1 * noise2(vec2(run * 0.4, across * 1.5 + id.x)));
    float screw = 0.0;
    for (int jj = -1; jj <= 1; jj++) {
      float jx = (floor(st.x / 0.6) + float(jj)) * 0.6;
      for (int sc = 0; sc < 2; sc++) {
        vec2 sp = vec2(jx, b.x * 0.145 + (sc == 0 ? 0.03 : 0.115));
        screw = max(screw, 1.0 - smoothstep(0.003, 0.0045, length(vec2(st.x, st.y) - sp)));
      }
    }
    alb = mix(alb, vec3(0.12, 0.11, 0.1), screw * detail(0.02, st));
    alb *= 1.0 - 0.75 * b.y;
    alb *= 1.0 - 0.35 * joint;
    // Each board cups a little, its edges up: the light catches its middle.
    N = normalize(N + vec3(0.0, 0.0, (across - 0.5) * 0.06));
    rough = 0.82;
    f0 = 0.03;
  } else if (vPart == ${P.tile}) {
    vec2 tq = abs(N.y) > 0.5 ? vWorld.xz : (abs(N.x) > 0.5 ? vWorld.zy : vWorld.xy);
    if (vVar > 0.3) {
      // Large-format stone tiles (60 × 120 cm, 2 mm joints), honed: a warm
      // grey with its own veining, each tile cut from its own part.
      vec2 g = tq / vec2(1.2, 0.6);
      vec2 cell = floor(g);
      vec2 e = abs(fract(g) - 0.5);
      float joint = 1.0 - smoothstep(0.0015, 0.003, min((0.5 - e.x) * 1.2, (0.5 - e.y) * 0.6));
      float vein = smoothstep(0.82, 0.98, noise2(tq * 3.0 + cell * 7.0 + noise2(tq * 9.0) * 1.5));
      alb = mix(vec3(0.72, 0.69, 0.64), vec3(0.62, 0.59, 0.55), hash2(cell)) * (0.94 + 0.08 * noise2(tq * 14.0));
      alb = mix(alb, vec3(0.86, 0.84, 0.8), vein * 0.5) * (1.0 - 0.4 * joint);
      rough = 0.35;
    } else {
      alb = poolTile(tq);
      rough = 0.15;
    }
    f0 = 0.05;
  } else if (vPart == ${P.plaster}) {
    alb = vec3(0.93, 0.91, 0.88);
    rough = 0.95;
  } else if (vPart == ${P.ceiling}) {
    alb = vec3(0.95, 0.94, 0.92);
    rough = 0.95;
  } else if (vPart == ${P.oak}) {
    vec2 b = boards(vWorld.z, 0.19, 0.003);
    alb = vec3(0.6, 0.43, 0.28) * (0.85 + 0.25 * hash2(vec2(b.x, 2.0))) * (0.9 + 0.15 * noise2(vec2(vWorld.x * 2.0, b.x * 7.0)));
    alb *= 1.0 - 0.4 * b.y;
    rough = 0.38;
  } else if (vPart == ${P.fabric}) {
    // Upholstery: woven, so a fine basket of threads, and a soft sheen
    // that rises toward the edges as cloth's fibres catch the light there.
    alb = k < 2.0 ? vec3(0.56, 0.53, 0.49) : k < 3.5 ? vec3(0.2, 0.27, 0.35) : k < 5.0 ? vec3(0.52, 0.33, 0.24) : k < 7.0 ? vec3(0.33, 0.37, 0.3) : k < 8.7 ? vec3(0.9, 0.9, 0.88) : vec3(0.88, 0.88, 0.86);
    vec3 wq = vWorld * 700.0;
    float weave = mix(0.5, 0.5 + 0.5 * sin(wq.x + wq.y) * sin(wq.z - wq.y), detail(0.009, vWorld.xy + vWorld.zz));
    alb *= (0.94 + 0.08 * weave) * (0.95 + 0.08 * noise2(vWorld.xz * 40.0 + vWorld.y * 30.0));
    emit = alb * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.12 * (1.0 - uNight * 0.7);
    rough = 1.0;
    f0 = 0.02;
  } else if (vPart == ${P.walnut}) {
    // American black walnut, oiled: straight grain streaming along the
    // board, a cathedral figure (nested arches) where the cut crosses the
    // rings, chocolate heartwood with lighter streaks of sap, open pores
    // as fine dark flecks; the fronts and drawers a shade lighter.
    vec2 q = st;
    if (abs(N.y) > 0.5) q = vWorld.xz;
    // (0.4.18) A door's and a tall front's grain runs up it (variant .6;
    // it ran across, so the rings banded it every 2.4 cm).
    else if (vVar > 0.55) q = q.yx;
    float along = q.x;
    float across = q.y;
    // The rings unevenly spaced, wandering as a sawn board's do.
    float wav = noise2(vec2(along * 0.8, across * 3.0)) * 0.06 + noise2(vec2(along * 4.0, across * 9.0)) * 0.01 + noise2(vec2(along * 0.15, across * 1.3)) * 0.05;
    float ring = across + wav + 0.05 * pow(abs(fract(along * 0.35) - 0.5), 2.0) * 8.0 * smoothstep(0.3, 0.7, noise2(vec2(floor(along * 0.35), 3.0)));
    float lines = 0.5 + 0.5 * sin(ring * 260.0);
    lines = mix(0.5, pow(lines, 4.0), detail(0.006, q));
    float streak = smoothstep(0.55, 0.85, noise2(vec2(along * 0.25, across * 14.0)));
    // (0.4.27) Its pores long along the grain and fine across it (they
    // were the other way: close to, dashes cut across it), each tapered,
    // staggered row by row.
    vec2 pc = vec2(along * 160.0 + hash2(vec2(floor(across * 900.0), 7.0)), across * 900.0);
    float pore = step(0.93, hash2(floor(pc))) * smoothstep(0.5, 0.2, abs(fract(pc.x) - 0.5)) * smoothstep(0.5, 0.25, abs(fract(pc.y) - 0.5));
    float pores = pore * detail(0.0015, q);
    vec3 heart = vec3(0.23, 0.145, 0.09);
    vec3 light = vec3(0.4, 0.27, 0.17);
    alb = mix(heart, light, 0.22 + 0.25 * lines + 0.35 * streak) * (1.0 - 0.35 * pores);
    alb *= vVar > 0.15 && vVar < 0.35 ? 0.95 : vVar > 0.35 ? 1.12 : 1.0;
    rough = 0.42 - 0.12 * lines;
    f0 = 0.04;
  } else if (vPart == ${P.steel}) {
    // Black steel; brushed stainless at the sink.
    alb = vVar > 0.3 ? vec3(0.62, 0.62, 0.6) : vec3(0.05, 0.05, 0.055);
    rough = vVar > 0.3 ? 0.28 : 0.4;
    metal = 1.0;
  } else if (vPart == ${P.book} || vPart == ${P.spine}) {
    // Book cloth: its own colour, a fine weave; on the spine (soft's t runs
    // up it) gilt rules near the head and the tail and a title block, a
    // shade off the cloth, between.
    alb = BOOKS[int(k + 0.5) % 10] * (0.9 + 0.15 * hash2(floor(vVar * 977.0) + vec2(3.0)));
    float wv = mix(0.5, 0.5 + 0.5 * sin(vWorld.x * 2200.0) * sin(vWorld.y * 2200.0 + vWorld.z * 2200.0), detail(0.002, vWorld.xy + vWorld.zz));
    alb *= 0.93 + 0.08 * wv;
    rough = 0.7;
    float sp = st.y;
    if (vPart == ${P.spine}) {
      // Each spine its own design: a dark label with gilt title, a pale
      // paper label, or bare cloth; gilt rules at the head and tail; the
      // title a run of gilt letters across the spine's middle, the author
      // below, the publisher's mark at the tail.
      float id = floor(vVar * 977.0);
      float kind = hash2(vec2(id, 7.0));
      float across = abs(st.x - 0.5);
      float rules = step(abs(sp - 0.06), 0.006) + step(abs(sp - 0.085), 0.003) + step(abs(sp - 0.94), 0.006) + step(abs(sp - 0.915), 0.003);
      vec3 gold = vec3(0.86, 0.69, 0.35);
      float cy = 0.55 + 0.1 * (hash2(vec2(id, 2.0)) - 0.5);
      float lh = 0.18 + 0.1 * hash2(vec2(id, 3.0));
      float inLabel = step(abs(sp - cy), lh * 0.5) * step(across, 0.42);
      vec3 ink = gold;
      if (kind < 0.35) alb = mix(alb, alb * 0.35, inLabel);
      else if (kind < 0.6) { alb = mix(alb, vec3(0.86, 0.82, 0.72), inLabel); ink = vec3(0.12, 0.1, 0.08); }
      // Letters: short strokes in lines down the label, set across.
      float row = (sp - (cy - lh * 0.4)) / (lh * 0.8);
      float letters = step(0.35, fract(sp * 110.0)) * step(hash2(vec2(id, floor(sp * 110.0))), 0.8);
      float title = letters * step(0.0, row) * step(row, 1.0) * step(across, 0.22) * (kind < 0.6 ? 1.0 : 0.0);
      float author = step(0.4, fract(sp * 140.0)) * step(abs(sp - 0.3), 0.06) * step(across, 0.16);
      float mark = step(length(vec2(across * 3.0, (sp - 0.82) * 12.0)), 0.25);
      float detailSeen = detail(0.003, st * vec2(0.03, 0.25));
      alb = mix(alb, ink, (title + author * 0.8 + mark) * detailSeen);
      alb = mix(alb, gold, rules * detailSeen);
      float shiny = (title + rules + mark) * detailSeen * (ink == gold ? 1.0 : 0.0);
      rough = mix(rough, 0.28, shiny);
      f0 = mix(0.04, 0.6, shiny);
      // The spine's round darkens toward its edges.
      alb *= 0.8 + 0.2 * sin(st.x * 3.14159);
    }
  } else if (vPart == ${P.pages}) {
    // The page block's edges: the leaves' fine lines, cream, a little
    // uneven, darker toward the boards.
    float lines = mix(0.6, 0.5 + 0.5 * sin((vWorld.x + vWorld.z) * 4200.0 + vWorld.y * 300.0), detail(0.0015, vWorld.xz));
    alb = vec3(0.9, 0.86, 0.76) * (0.88 + 0.12 * lines) * (0.95 + 0.06 * noise2(vWorld.xy * 90.0));
    rough = 0.9;
  } else if (vPart == ${P.leaf}) {
    // Leaves: both sides theirs (the underside's own colour); a midrib
    // and, on the fig, veins off it; the olive grey-green over silver, the
    // fig dark and glossy, the box small and bright on its dark core.
    bool top = gl_FrontFacing;
    if (!top) N = -N;
    float rib = 1.0 - smoothstep(0.0, 0.08, abs(st.y));
    if (vVar < 0.12) {
      alb = top ? vec3(0.26, 0.31, 0.2) : vec3(0.55, 0.58, 0.52);
      rough = top ? 0.55 : 0.8;
    } else if (vVar < 0.25) {
      // The olive's crown as a mass: grey-green, broken by the light
      // through it.
      alb = vec3(0.3, 0.35, 0.25) * (0.7 + 0.5 * noise2(vWorld.xz * 20.0 + vWorld.y * 14.0));
      rough = 0.7;
    } else if (vVar > 0.35 && vVar < 0.55) {
      float vein = 1.0 - smoothstep(0.0, 0.05, abs(fract(st.x * 7.0 - abs(st.y) * 1.6) - 0.5) * 0.6 - 0.27);
      alb = (top ? vec3(0.09, 0.2, 0.07) : vec3(0.2, 0.3, 0.15)) * (1.0 + 0.5 * rib + 0.25 * vein * smoothstep(0.1, 0.4, abs(st.y)));
      rough = top ? 0.28 : 0.6;
      f0 = 0.05;
    } else if (vVar < 0.35) {
      // Grass, lavender's and rosemary's leaves: a blue-green, paler beneath.
      alb = (top ? vec3(0.27, 0.36, 0.26) : vec3(0.42, 0.48, 0.4)) * (0.85 + 0.25 * hash2(floor(vWorld.xz * 40.0)));
      rough = 0.6;
    } else if (vVar > 0.55 && vVar < 0.65) {
      // The grass's plumes: straw.
      alb = vec3(0.78, 0.68, 0.48) * (0.85 + 0.2 * hash2(floor(vWorld.xy * 80.0)));
      rough = 0.8;
    } else if (vVar > 0.985) {
      // (0.4.26) A rose's petals (the vase's, plantMesh.js bouquet): each
      // rose its own cream to blush, deeper toward the petal's base, a
      // soft sheen.
      float tint = hash2(floor(vWorld.xz * 14.0) + 2.0);
      alb = mix(vec3(0.95, 0.93, 0.88), vec3(0.93, 0.7, 0.68), smoothstep(0.35, 0.9, tint)) * (0.82 + 0.18 * smoothstep(0.0, 0.6, st.x));
      rough = 0.55;
    } else if (vVar > 0.94) {
      // (0.4.16) A coneflower's cone: rust, darker at its base.
      alb = vec3(0.36, 0.17, 0.06) * (0.75 + 0.4 * hash2(floor(vWorld.xz * 300.0)));
      rough = 0.85;
    } else if (vVar > 0.88) {
      // Its petals: a warm pink, deeper toward the cone.
      alb = mix(vec3(0.55, 0.2, 0.36), vec3(0.8, 0.42, 0.58), smoothstep(0.0, 0.7, st.x));
      rough = 0.6;
    } else if (vVar > 0.8) {
      // Lavender's flowers.
      alb = vec3(0.42, 0.32, 0.62) * (0.85 + 0.25 * hash2(floor(vWorld.xz * 90.0)));
      rough = 0.7;
    } else if (vVar < 0.72) {
      alb = vec3(0.14, 0.3, 0.1) * (0.8 + 0.4 * hash2(floor(vWorld.xz * 60.0)));
      rough = 0.45;
    } else {
      alb = vec3(0.04, 0.08, 0.03);
      rough = 0.9;
    }
    alb *= 0.92 + 0.12 * rib;
  } else if (vPart == ${P.bark}) {
    // The olive's bark grey and fissured; the fig's stems green-brown.
    alb = vVar < 0.3 ? vec3(0.36, 0.33, 0.28) * (0.7 + 0.5 * noise2(vec2(st.x * 40.0, st.y * 6.0))) : vec3(0.3, 0.27, 0.16);
    rough = 0.85;
  } else if (vPart == ${P.curtain}) {
    // Lined linen curtains: both faces cloth, a loose slubbed weave, a
    // little sheen at a glance; the light behind them comes through
    // (below, with the light).
    if (!gl_FrontFacing) N = -N;
    vec2 wq = vec2(st.x * 900.0, st.y * 900.0);
    float weave = mix(0.5, 0.5 + 0.25 * sin(wq.x) + 0.25 * sin(wq.y), detail(0.007, st));
    float slub = noise2(vec2(st.x * 60.0, st.y * 2.0)) * 0.6 + noise2(vec2(st.x * 4.0, st.y * 140.0)) * 0.4;
    alb = vec3(0.93, 0.91, 0.86) * (0.95 + 0.05 * weave) * (0.95 + 0.07 * slub);
    emit = alb * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.1 * (1.0 - uNight * 0.7);
    rough = 1.0;
    f0 = 0.02;
  } else if (vPart == ${P.marble}) {
    // Calacatta marble, polished: a warm white, clouded faintly grey, with
    // the long branching veins that run through a block (grey, here and
    // there touched with gold), finer threads off them.
    // (0.4.23) On a wall its face's own plane, not the floor's (the veins
    // ran in streaks down a wall); cladding (variant .3 and up) cut into
    // slabs 1.2 × 2.4 m on the walls, 1.2 m square on the floor, with a
    // fine join between, the floor honed; .6 bookmatched (each pair of
    // slabs mirrored about their join).
    vec2 w2 = abs(N.y) > 0.5 ? vWorld.xz : abs(N.x) > 0.5 ? vWorld.zy : vWorld.xy;
    // (0.4.27) A piece cut from one slab (variant under .25) has its veins
    // laid along its length, as a stone yard cuts it: .0 along x, .1 along
    // z; .2 the island's, along x, its waterfall ends cut from the same
    // slab as its top, so a vein runs over the edge and on down.
    bool cut = vVar < 0.25;
    if (cut && vVar > 0.16 && abs(N.x) > 0.5) w2 = vec2(vWorld.x + sign(N.x) * (${f(FLOOR + 0.935)} - vWorld.y), vWorld.z);
    if (cut && vVar > 0.06 && vVar < 0.16) w2 = w2.yx;
    float joint = 0.0;
    if (vVar > 0.25) {
      // (0.4.27) Set out as a mason would: the floor's squares centred on
      // the room; the walls' slabs floor to ceiling (no join across them),
      // one centred on the room's middle, or a bookmatch's join on what
      // it's behind (MATCH_AXES).
      vec3 mid = zoneMid(roomOf(vWorld));
      float fl = vWorld.y > ${f(TERRACE - 0.1)} ? ${f(TERRACE + 0.07)} : ${f(FLOOR + 0.02)};
      vec2 slab = abs(N.y) > 0.5 ? vec2(1.2) : vec2(1.2, 3.4);
      int mk = int(floor((vVar - 0.6) * 50.0 + 0.5));
      float ax = mk == 1 ? ${f(MATCH_AXES[0])} : mk == 2 ? ${f(MATCH_AXES[1])} : ${f(MATCH_AXES[2])};
      bool matched = vVar > 0.55 && vVar < 0.8;
      w2 -= abs(N.y) > 0.5 ? mid.xz - 0.6 : vec2(matched ? ax - 1.2 : (abs(N.x) > 0.5 ? mid.z : mid.x) - 0.6, fl);
      vec2 cell = w2 / slab;
      vec2 fq = fract(cell);
      vec2 jd = min(fq, 1.0 - fq) * slab;
      joint = 1.0 - smoothstep(0.0008, 0.0018 + fwidth(w2.x) * 0.5, min(jd.x, jd.y));
      if (vVar > 0.55 && vVar < 0.8) {
        float pair = floor(cell.x * 0.5);
        float lx = cell.x - pair * 2.0;
        w2.x = (pair * 2.0 + 1.0 - abs(lx - 1.0)) * slab.x;
      }
    }
    // (0.4.26) The veins as real Calacatta's: not waves but the contours
    // of the stone's own warped layers, a level line through a folded
    // field, so they meander, fork and rejoin. One flow down the slab's
    // diagonal; bold main veins of uneven width (a dark core, a soft grey
    // halo bleeding into the white), broken here and there and touched
    // with gold in places; finer veins branching between them; hairline
    // threads faintest of all. Each drawn to its pixel's share, so none
    // crawls from across the room.
    vec2 q = (cut ? mat2(0.99, -0.12, 0.12, 0.99) : mat2(0.8, -0.6, 0.6, 0.8)) * (w2 * 0.85);
    q.x *= 0.42;
    vec2 wp = q + vec2(fbm5(q * 1.3), fbm5(q * 1.3 + 7.3)) * 1.7;
    float n1 = fbm5(wp * 0.9);
    float v1 = abs(n1 - 0.5);
    float w1 = 0.006 + 0.02 * noise2(q * 2.0 + 4.0);
    float core = 1.0 - smoothstep(w1 * 0.3, w1 + fwidth(n1), v1);
    float halo = 1.0 - smoothstep(0.0, w1 * 7.0 + 0.02, v1);
    float run = smoothstep(0.22, 0.55, noise2(q * 0.9 + 3.0));
    float n2 = fbm5(wp * 2.4 + 5.0);
    float second = (1.0 - smoothstep(0.0, 0.005 + fwidth(n2), abs(n2 - 0.5))) * smoothstep(0.35, 0.7, noise2(q * 1.7 + 11.0));
    float n3 = fbm5(wp * 6.5 + 2.0);
    float thread = (1.0 - smoothstep(0.0, 0.003 + fwidth(n3), abs(n3 - 0.5))) * min(1.0, 0.006 / max(fwidth(n3), 1e-4));
    float cloud = fbm5(q * 2.2 + 9.0);
    alb = vec3(0.955, 0.945, 0.925) * (0.95 + 0.07 * cloud);
    vec3 vc = mix(vec3(0.36, 0.36, 0.38), vec3(0.6, 0.5, 0.34), smoothstep(0.6, 0.78, noise2(q * 0.5 + 4.0)));
    alb = mix(alb, mix(alb, vc, 0.5), halo * 0.35 * run);
    alb = mix(alb, vc, core * 0.8 * run);
    alb = mix(alb, mix(alb, vc, 0.7), second * 0.5);
    alb = mix(alb, mix(alb, vc, 0.6), thread * 0.28);
    alb *= 1.0 - 0.35 * joint;
    rough = vVar > 0.8 ? 0.22 : 0.07;
    f0 = 0.045;
  } else if (vPart == ${P.cord}) {
    // Paper cord woven over the seat's rails, wrapped in from its four
    // edges: in each quarter the cords run toward the middle, a basket
    // over-and-under between them.
    vec2 q = st - 0.5;
    bool side = abs(q.x) > abs(q.y);
    float along = side ? q.y : q.x;
    float cords = fract(along * 60.0);
    float over = step(0.5, fract((side ? q.x : q.y) * 60.0 + floor(along * 60.0) * 0.5));
    float rope = smoothstep(0.0, 0.3, cords) * smoothstep(1.0, 0.7, cords);
    alb = vec3(0.76, 0.66, 0.48) * (0.6 + 0.4 * rope) * (0.88 + 0.12 * over) * (0.95 + 0.08 * noise2(vWorld.xz * 90.0));
    alb *= 1.0 - 0.45 * (1.0 - smoothstep(0.42, 0.5, max(abs(q.x), abs(q.y))) * 0.0);
    rough = 0.85;
  } else if (vPart == ${P.rope}) {
    // Jute rope and its tassel: twisted strands (s along, t round), the
    // threads' fine lines down the tassel.
    float strand = 0.5 + 0.5 * sin(st.x * 6.2832 * 6.0 + st.y * 6.2832);
    alb = vec3(0.72, 0.6, 0.42) * (0.75 + 0.3 * strand) * (0.9 + 0.12 * noise2(vWorld.xy * 300.0));
    rough = 0.9;
  } else if (vPart == ${P.ceramic}) {
    // Glazed ceramic: white, or (by its variant) a stoneware glaze.
    alb = vVar < 0.2 ? vec3(0.93, 0.92, 0.89) : vVar < 0.4 ? vec3(0.86, 0.85, 0.83) : vVar < 0.7 ? vec3(0.55, 0.42, 0.33) : vec3(0.28, 0.36, 0.34);
    rough = vVar > 0.2 && vVar < 0.4 ? 0.3 : 0.12;
    f0 = 0.045;
    // (0.4.27) Red wine, seen through its glass: near black, a garnet
    // where it's thin; glossy.
    if (vVar > 0.83 && vVar < 0.86) {
      alb = vec3(0.24, 0.025, 0.045);
      rough = 0.06;
      f0 = 0.05;
    }
    // (0.4.22) Bottle glass: deep green, or amber; glossy.
    if (vVar > 0.86) {
      alb = vVar > 0.89 ? vec3(0.3, 0.13, 0.03) : vec3(0.03, 0.09, 0.05);
      rough = 0.05;
      f0 = 0.05;
    }
  } else if (vPart == ${P.mirror}) {
    alb = vec3(0.92, 0.93, 0.92);
    rough = 0.02;
    metal = 1.0;
  } else if (vPart == ${P.brass}) {
    alb = vec3(0.8, 0.62, 0.36);
    rough = 0.3;
    metal = 1.0;
  } else if (vPart == ${P.clothes} && vVar > 0.92) {
    // (0.4.26) The pool towel: a flat-woven cotton, navy and white in
    // bands across its length, a fine rib, its fringed ends paler.
    float band = step(0.5, fract(st.x * 1.6));
    alb = mix(vec3(0.1, 0.14, 0.26), vec3(0.9, 0.88, 0.84), band) * (0.93 + 0.07 * sin(st.y * 400.0));
    rough = 1.0;
    f0 = 0.02;
  } else if (vPart == ${P.clothes}) {
    alb = k < 2.0 ? vec3(0.12, 0.14, 0.2) : k < 4.0 ? vec3(0.85, 0.84, 0.8) : k < 5.5 ? vec3(0.4, 0.36, 0.3) : k < 7.0 ? vec3(0.55, 0.2, 0.17) : k < 8.5 ? vec3(0.2, 0.2, 0.21) : vec3(0.5, 0.56, 0.6);
    alb *= 0.92 + 0.1 * noise2(vWorld.xy * 50.0);
    rough = 1.0;
    f0 = 0.02;
  } else if (vPart == ${P.paper}) {
    alb = vec3(0.95, 0.94, 0.9);
    rough = 0.9;
  } else if (vPart == ${P.fruit}) {
    alb = vec3(0.85, 0.7, 0.12) * (0.9 + 0.15 * noise2(vWorld.xz * 80.0));
    rough = 0.35;
  } else if (vPart == ${P.screen}) {
    // The TV's screen, off: black glass, a mirror at a glance.
    alb = vec3(0.012, 0.013, 0.016);
    rough = 0.05;
    f0 = 0.045;
    if (vVar > 0.5) {
      // (0.4.22) The Home display, on: the house's controls over a deep
      // wallpaper, a header, then the rooms as tiles in a grid, a few lit
      // (their lights on: warm and bright, a glowing dot), the rest dim;
      // a wide tile for the climate, its dial.
      vec2 q = st;
      vec3 ui = mix(vec3(0.05, 0.08, 0.16), vec3(0.08, 0.2, 0.24), smoothstep(-0.09, 0.09, q.x + q.y * 0.6));
      float head = 1.0 - smoothstep(0.0, 0.001, abs(q.y - 0.066) - 0.004) ;
      ui = mix(ui, vec3(0.85), head * step(abs(q.x + 0.075), 0.03));
      vec2 cell = vec2(0.054, 0.04);
      vec2 g = (q - vec2(-0.108, -0.072)) / cell;
      vec2 gi = floor(g);
      if (gi.x >= 0.0 && gi.x < 4.0 && gi.y >= 0.0 && gi.y < 3.0) {
        vec2 c = (gi + 0.5) * cell + vec2(-0.108, -0.072);
        vec2 o = abs(q - c) - (cell * 0.5 - vec2(0.004)) + 0.006;
        float tile = 1.0 - smoothstep(-0.0004, 0.0004, length(max(o, 0.0)) - 0.006);
        float on = step(0.55, fract(sin(dot(gi, vec2(12.9898, 78.233))) * 43758.5453));
        bool climate = gi.y == 2.0 && gi.x >= 2.0;
        vec3 tc = climate ? vec3(0.22, 0.3, 0.34) : on > 0.5 ? vec3(0.95, 0.88, 0.7) : vec3(0.2, 0.23, 0.28);
        float dot_ = 1.0 - smoothstep(0.0055, 0.0065, length(q - c - vec2(-0.012, 0.006)));
        tc = mix(tc, on > 0.5 && !climate ? vec3(1.0, 0.72, 0.25) : vec3(0.75), dot_ * (climate ? 0.0 : 1.0));
        if (climate) {
          vec2 cc = vec2(-0.108 + 3.0 * cell.x, -0.072 + 2.5 * cell.y);
          float ring = 1.0 - smoothstep(0.0008, 0.0016, abs(length(q - cc) - 0.012));
          tc = mix(tc, vec3(0.95, 0.6, 0.3), ring * step(-0.4, atan(q.y - cc.y, q.x - cc.x) * 0.3));
        }
        ui = mix(ui, tc, tile * 0.92);
      }
      alb = ui * 0.15;
      emit = ui * 0.85;
      rough = 0.08;
    }
  } else if (vPart == ${P.art}) {
    // (0.4.27) A print under glass, or a painting on canvas (st.x past 2):
    // st its place across it (0 … 1 each way), its width to its height
    // folded into st.y (furniture.js artCoords). Each is one of five kinds
    // of picture by its variant, so the walls aren't one print recoloured:
    // soft fields of colour; stacked fields, their edges feathered, as
    // painted; ridges going back into the haze under a low sun; a survey's
    // contour lines; a single disc over a horizon.
    bool canvas = st.x > 1.5;
    float ak = floor(st.y * 0.5);
    vec2 uv = vec2(st.x - (canvas ? 2.0 : 0.0), st.y - ak * 2.0);
    float A = max(ak / 8.0, 0.1);
    vec2 pa = vec2(uv.x * A, uv.y);
    vec3 paper = vec3(0.9, 0.87, 0.8);
    vec3 ink;
    if (vVar < 0.2) {
      // (0.4.20) Soft fields of two colours drifting over the paper, a
      // third in a band.
      vec2 q = pa * 2.4 + vVar * 17.0;
      float fld = noise2(q * 0.8) * 0.6 + noise2(q * 2.1) * 0.4;
      int pk = int(floor(fract(vVar * 13.7) * 2.999));
      vec3 ca = pk == 0 ? vec3(0.72, 0.45, 0.32) : pk == 1 ? vec3(0.78, 0.62, 0.3) : vec3(0.22, 0.27, 0.42);
      vec3 cb = pk == 0 ? vec3(0.32, 0.4, 0.46) : pk == 1 ? vec3(0.45, 0.52, 0.4) : vec3(0.82, 0.74, 0.6);
      vec3 cc = pk == 0 ? vec3(0.9, 0.8, 0.62) : pk == 1 ? vec3(0.3, 0.26, 0.22) : vec3(0.7, 0.36, 0.28);
      ink = mix(ca, cb, smoothstep(0.4, 0.62, fld + 0.25 * sin(q.x * 1.1 + q.y * 0.7)));
      ink = mix(ink, cc, smoothstep(0.03, 0.0, abs(fract(q.y * 0.21 + fld * 0.3) - 0.5) - 0.12) * 0.8);
      ink = mix(paper, ink, 0.8);
    } else if (vVar < 0.4) {
      // Two fields stacked on a warm ground, their edges feathered and
      // breathing, the paint dragged across in strokes.
      float n = fbm5(pa * 7.0 + vVar * 31.0);
      float drag = noise2(vec2(pa.x * 4.0, pa.y * 70.0)) - 0.5;
      float edge = 0.007 + 0.012 * n;
      float mx = 0.075;
      float sx = min(pa.x - mx, A - mx - pa.x);
      float top = smoothstep(-edge, edge, min(sx, min(uv.y - 0.5, 0.925 - uv.y)) + 0.012 * (n - 0.5));
      float bot = smoothstep(-edge, edge, min(sx, min(uv.y - 0.075, 0.44 - uv.y)) + 0.012 * (n - 0.5));
      ink = vec3(0.55, 0.46, 0.39) * (0.94 + 0.1 * n);
      ink = mix(ink, vec3(0.8, 0.62, 0.47) * (0.92 + 0.14 * n + 0.06 * drag), top);
      ink = mix(ink, vec3(0.31, 0.31, 0.26) * (0.9 + 0.2 * n + 0.08 * drag), bot);
    } else if (vVar < 0.6) {
      // Ridges going back into the haze, each paler than the one before
      // it, under a low sun in a warm sky.
      float px = max(fwidth(uv.y), 1e-4);
      ink = mix(vec3(0.9, 0.76, 0.62), vec3(0.64, 0.68, 0.74), smoothstep(0.35, 1.0, uv.y));
      float sd = length(pa - vec2(A * 0.68, 0.64)) - 0.075;
      ink = mix(ink, vec3(0.95, 0.62, 0.42), 1.0 - smoothstep(-px, px, sd));
      for (int i = 0; i < 5; i++) {
        float t = float(i) / 4.0;
        float h = 0.6 - 0.12 * float(i) + 0.11 * (fbm5(vec2(pa.x * (1.6 + t * 1.4) + float(i) * 3.7, vVar * 9.0 + float(i))) - 0.5);
        vec3 c = mix(vec3(0.74, 0.67, 0.64), vec3(0.17, 0.19, 0.23), t * t * 0.9 + t * 0.1);
        ink = mix(ink, c, 1.0 - smoothstep(-px, px, uv.y - h));
      }
      ink = mix(paper, ink, 0.92);
    } else if (vVar < 0.75) {
      // A survey's contours in sepia, every fifth drawn heavier, the low
      // ground washed blue; seen too small, the lines' average.
      float f = fbm5(pa * 2.3 + vVar * 23.0) * 13.0;
      float w = max(fwidth(f), 1e-4);
      float d = abs(fract(f + 0.5) - 0.5);
      float bold = step(mod(floor(f + 0.5), 5.0), 0.5);
      float line = 1.0 - smoothstep(w * (0.5 + bold * 0.7), w * (1.5 + bold * 0.7), d);
      line = mix(0.12 + 0.08 * bold, line, clamp(1.6 - w * 2.5, 0.0, 1.0));
      ink = mix(paper, vec3(0.74, 0.79, 0.8), smoothstep(4.6, 4.2, f) * 0.8);
      ink = mix(ink, vec3(0.36, 0.27, 0.2), line * (0.65 + 0.3 * bold));
    } else {
      // A single disc, terracotta, its pigment mottled, over a charcoal
      // horizon; the ground below it a grey wash.
      float px = max(fwidth(uv.y), 1e-4);
      float n = fbm5(pa * 11.0 + vVar * 5.0);
      float d = length(pa - vec2(A * 0.5, 0.6)) - min(0.24, A * 0.34);
      ink = paper;
      ink = mix(ink, vec3(0.71, 0.66, 0.6) * (0.95 + 0.08 * n), 1.0 - smoothstep(-px, px, uv.y - 0.27));
      ink = mix(ink, vec3(0.2, 0.2, 0.21), (1.0 - smoothstep(-px, px, abs(uv.y - 0.285) - 0.012)) * step(0.06, pa.x) * step(pa.x, A - 0.06));
      ink = mix(ink, vec3(0.74, 0.38, 0.25) * (0.9 + 0.2 * n), 1.0 - smoothstep(-px, px, d));
    }
    alb = ink;
    if (canvas) {
      // Paint on linen: matte, its weave in it close to.
      alb *= 0.96 + 0.07 * (hash2(floor((vWorld.xy + vWorld.zy) * 700.0)) - 0.5) * detail(0.0014, vWorld.xy + vWorld.zy);
      rough = 0.82;
      f0 = 0.03;
    } else {
      // Under glass: a faint sheen.
      rough = 0.14;
      f0 = 0.04;
    }
  } else if (vPart == ${P.planter}) {
    if (vVar > 0.3) {
      alb = vec3(0.6, 0.35, 0.23);
    } else if (vVar > 0.1) {
      // Board-formed concrete: the planks' marks across it (15 cm), each
      // board's grain printed faintly, a tie hole now and then, warm grey.
      vec2 q = abs(N.y) > 0.5 ? vWorld.xz : st;
      float plank = floor(q.y / 0.15);
      float seam = 1.0 - smoothstep(0.0, 0.004, abs(fract(q.y / 0.15) - 0.5) * 0.15 - 0.071);
      float grainB = noise2(vec2(q.x * 3.0, q.y * 60.0 + plank * 5.0));
      alb = vec3(0.52, 0.5, 0.47) * (0.88 + 0.1 * hash2(vec2(plank, 3.0)) + 0.08 * grainB) * (1.0 - 0.25 * seam * detail(0.02, q));
      float tie = step(length(vec2(fract(q.x / 0.6) - 0.5, fract(q.y / 0.45) - 0.5) * vec2(0.6, 0.45)), 0.012);
      alb *= 1.0 - 0.5 * tie * detail(0.02, q);
    } else alb = vec3(0.42, 0.4, 0.38) * (0.92 + 0.1 * noise2(st * 3.0));
    rough = 0.85;
  } else if (vPart == ${P.person}) {
    // (0.4.24) The person (personMesh.js): skin, hair, an off-white linen
    // shirt (a slub across it), navy chinos (a twill), tan leather shoes,
    // their soles.
    if (vVar < 0.2) {
      alb = vec3(0.62, 0.43, 0.32);
      rough = 0.55;
    } else if (vVar < 0.4) {
      alb = vec3(0.07, 0.05, 0.04);
      rough = 0.7;
    } else if (vVar < 0.6) {
      alb = vec3(0.9, 0.88, 0.83) * (0.93 + 0.08 * noise2(vWorld.xy * vec2(300.0, 40.0)));
      rough = 0.9;
    } else if (vVar < 0.8) {
      alb = vec3(0.1, 0.13, 0.22) * (0.9 + 0.1 * sin((vWorld.x + vWorld.y) * 900.0));
      rough = 0.85;
    } else if (vVar < 0.95) {
      alb = vec3(0.45, 0.27, 0.14);
      rough = 0.4;
    } else {
      alb = vec3(0.86, 0.84, 0.78);
      rough = 0.8;
    }
  } else if (vPart == ${P.roof}) {
    // (0.4.26) The roof: its deck of large porcelain pavers (ROOF_DECK),
    // each its own pale warm grey, a fine aggregate in it, a little
    // weathered toward its edges, the open joints between them dark; or
    // the margin's basalt gravel.
    if (vVar < 0.5) {
      vec2 q = (vWorld.xz - ${v2([ROOF_DECK.x[0], ROOF_DECK.z[0]])}) / ${v2(ROOF_DECK.cell)};
      vec2 id = floor(q);
      vec2 e = min(fract(q), 1.0 - fract(q)) * ${v2(ROOF_DECK.cell)};
      float px = length(fwidth(vWorld.xz));
      // The joints, 6 mm: their share of a pixel once they're thinner
      // than one, so they never crawl.
      float joint = (1.0 - smoothstep(0.0, px, min(e.x, e.y) - 0.003)) * min(1.0, 0.006 / max(px, 1e-4));
      float tone = hash2(id + 3.0);
      alb = vec3(0.76, 0.74, 0.7) * (0.9 + 0.12 * tone) * (0.95 + 0.06 * noise2(vWorld.xz * 9.0 + id * 3.1));
      alb *= 1.0 - 0.05 * (1.0 - smoothstep(0.0, 0.12, min(e.x, e.y)));
      alb *= 0.96 + 0.06 * mix(0.5, hash2(floor(vWorld.xz * 160.0)), detail(0.01, vWorld.xz));
      alb = mix(alb, vec3(0.1, 0.1, 0.1), joint * 0.9);
      rough = 0.78;
    } else {
      alb = vec3(0.24, 0.24, 0.25) * (0.75 + 0.45 * mix(0.5, hash2(floor(vWorld.xz * 90.0)), detail(0.02, vWorld.xz)) + 0.1 * noise2(vWorld.xz * 8.0));
      rough = 0.95;
    }
  } else if (vPart == ${P.soil}) {
    // (0.4.16) Dark mulch, its bark chips catching the light.
    float chip = noise2(vWorld.xz * 70.0);
    alb = vec3(0.16, 0.11, 0.08) * (0.7 + 0.4 * noise2(vWorld.xz * 30.0)) * (0.8 + 0.6 * smoothstep(0.62, 0.8, chip));
    rough = 1.0;
  } else if (vPart == ${P.lamp}) {
    // A shade or a bulb: lit from inside by night.
    alb = vec3(0.92, 0.9, 0.85);
    rough = 0.6;
    // (0.4.27) As its own light is set, by night and by day.
    float dayOn;
    vec3 glow = fittingGlow(vWorld, roomOf(vWorld), dayOn);
    emit = glow * 2.4 * (uNight + dayOn * (1.0 - uNight));
    // (0.4.26) A strip of light (variant .5, about a centimetre) smaller
    // than a pixel is in only some of them, and which ones changes as the
    // camera moves: it's given what the pixel would average to (its share
    // of it, the rest the dark round it), so it doesn't sparkle along its
    // length from across the garden.
    if (vVar > 0.4) {
      float cover = clamp(0.012 / max(length(fwidth(vWorld)), 1e-5), 0.0, 1.0);
      // (Seen edge-on, a pixel spans metres of it: its share is nothing.)
      alb = mix(vec3(0.12), alb, cover);
      emit *= cover * cover;
    }
  } else if (vPart == ${P.cushion}) {
    alb = k < 0.5 ? vec3(0.9, 0.88, 0.84) : k < 2.0 ? vec3(0.74, 0.56, 0.25) : k < 4.5 ? vec3(0.3, 0.35, 0.4) : vec3(0.86, 0.82, 0.74);
    alb *= 0.94 + 0.08 * noise2(vWorld.xz * 30.0 + vWorld.y * 20.0);
    rough = 1.0;
    f0 = 0.02;
  } else if (vPart == ${P.rug}) {
    // A wool rug: a dense pile (fine noise, its tufts catching the light),
    // a border band in from its edge, a soft field; the fringe the warp's
    // ends.
    vec2 q = st;
    float edge = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float band = smoothstep(0.04, 0.045, edge) - smoothstep(0.075, 0.08, edge);
    float pile = noise2(vWorld.xz * 220.0) * 0.5 + noise2(vWorld.xz * 60.0) * 0.5;
    vec3 field = vVar < 0.2 ? vec3(0.62, 0.57, 0.5) : vVar < 0.4 ? vec3(0.5, 0.46, 0.44) : vec3(0.33, 0.36, 0.38);
    vec3 border = vVar < 0.2 ? vec3(0.34, 0.27, 0.22) : vec3(0.82, 0.8, 0.74);
    alb = mix(field, border, band) * (0.86 + 0.22 * pile);
    rough = 1.0;
    f0 = 0.02;
    N = normalize(N + vec3(noise2(vWorld.xz * 300.0) - 0.5, 0.0, noise2(vWorld.xz * 300.0 + 7.0) - 0.5) * 0.35);
  }

  // (0.4.26) Where the normal turns within a pixel (a brass rail or a
  // frame's slip seen from the desk), one sample of it would flash the
  // highlight on and off as the camera moves: the highlight is widened by
  // how much the normal varies across the pixel (geometric specular
  // anti-aliasing), which is what the pixel would show on average.
  vec3 dN = fwidth(normalize(vNorm));
  rough = sqrt(min(1.0, rough * rough + min(0.45, 2.0 * dot(dN, dN))));
  // And where it turns right round within one or two (the rail is two
  // pixels tall from the desk), each row would take a different slice of
  // the tube's light: it's lit as its average, its normal bent toward the
  // eye.
  N = normalize(mix(N, V, smoothstep(0.3, 1.0, length(dN)) * 0.85));

  // ---- The light.
  int room = roomOf(vWorld);
  float shade = sunShadow(vLight);
  float sun = max(dot(N, L), 0.0) * shade;
  // The sky's light: from above outside; inside, what comes in at the glass,
  // falling off toward the room's back.
  float open = 1.0;
  if (room != 0) {
    float fz = vWorld.y < ${f(TERRACE - 0.1)} ? ${f(G.z[1])} : ${f(U.z[1])};
    float bz = ${f(G.z[0])};
    // (0.4.9) A room with a wall of glass is full of daylight: what comes
    // straight in near the glass, and the light bounced round it everywhere
    // else (walls, floor and ceiling all pale), so even its back is bright.
    open = fronts(room) ? 0.75 + 0.75 * exp(-(fz - vWorld.z) * 0.12) * (0.6 + 0.4 * max(N.z, 0.0))
      : backs(room) ? 0.6 + 0.6 * exp(-(vWorld.z - bz) * 0.25) * (0.6 + 0.4 * max(-N.z, 0.0)) : 0.5;
    // The rooms off the stair and the hall borrow it too.
    open = max(open, 0.55);
  }
  vec3 skyLight = mix(uEnvLow * 0.75 + uWood * 0.25, uEnvTop, 0.5 + 0.5 * N.y) * mix(vec3(1.0), uSky, 0.3);
  // Inside, the daylight has bounced off the floor, the walls and the
  // ceiling first: it comes in warmer and less coloured by the sky.
  if (room != 0) skyLight = mix(skyLight, vec3(dot(skyLight, vec3(0.3, 0.55, 0.15))) * vec3(1.06, 1.0, 0.9), 0.65) * 1.6;
  float dim = mix(1.0, 0.3, uNight);
  vec3 lamps = uNight > 0.0 ? lampsAt(vWorld, N, V, rough, room, false) * uNight : vec3(0.0);
  // (0.4.23) The washrooms keep their lights on by day too (they've only
  // a slot of window; they were dim), less than by night. (0.4.27) And
  // every room in use its lamps (ROOM_DAY).
  if (uNight < 1.0 && room != 0) lamps += lampsAt(vWorld, N, V, rough, room, true) * (1.0 - uNight);
  float ao = ambientAt(room);
  open *= ao;
  lamps *= mix(1.0, ao, 0.7);
  vec3 col;
  bool mirrored = false;
  if (vPart == ${P.lawn}) {
    // The lawn lit like the meadow round it, the house's shadow and the
    // lamps' spill on top.
    float relief = mix(0.85, 1.08, smoothstep(-0.2, 0.6, dot(N, L) - L.y));
    vec3 c = alb * mix(vec3(1.0), uSky, 0.25) * relief * mix(0.55, 1.0, shade);
    // (0.4.12) Hazed as the meadow round it is (TURNED_HAZE).
    col = mix(c, uHaze, turnedHaze(length(uCam - vWorld))) + alb * lamps;
  } else {
    vec3 F0 = mix(vec3(f0), alb, metal);
    vec3 H = normalize(L + V);
    float nv = max(dot(N, V), 1e-3);
    float lh = max(dot(L, H), 0.0);
    float a = max(rough * rough, 0.02);
    vec3 Fs = F0 + (1.0 - F0) * pow(1.0 - lh, 5.0);
    vec3 spec = Fs * ggx(max(dot(N, H), 0.0), a) * 0.25 / max(lh * lh, 0.1) * sun;
    vec3 Fv = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0) * (1.0 - rough * 0.7);
    vec3 R = reflect(-V, N);
    vec3 env = mix(envAt(R), (uEnvTop + uEnvLow) * 0.5, rough * 0.85) * open * dim;
    // Inside, what a surface mirrors is the room: the glass and the sky
    // past it toward the front, the walls and their light elsewhere.
    if (room != 0) {
      vec3 walls = vec3(0.92, 0.9, 0.86) * (skyLight * 0.35 * dim + lamps * 0.35);
      env = mix(walls, mix(envAt(R), (uEnvTop + uEnvLow) * 0.5, rough * 0.85) * dim, smoothstep(0.1, 0.6, R.z));
    }
    // The sun on the pool's floor is focused by the water (the caustics
    // map), and by night the pool's own light is down there.
    vec3 sunCol = uSun;
    bool under = vPart == ${P.tile} && vWorld.y < ${f(POOL.at[1])};
    if (under && uCausticsOn > 0.5) {
      vec2 uv = (vWorld.xz - ${v2([POOL.at[0] - POOL.w / 2, POOL.at[2] - POOL.d / 2])}) / ${v2([POOL.w, POOL.d])};
      sunCol *= texture(uCaustics, clamp(uv, 0.0, 1.0)).rgb;
    }
    vec3 diffuse = (sunCol * sun * 1.05 + skyLight * 0.62 * open) * dim + lamps;
    if (under) diffuse += vec3(0.35, 0.85, 1.0) * 0.9 * uNight;
    col = alb * (1.0 - metal) * diffuse * (1.0 - Fv * 0.5) + Fv * env + spec * sunCol * dim * 3.0 + emit;
    // (0.4.18) A mirror shows its room, from its probe (mirrorProbe.js),
    // a touch darker and greener than what it sees, as silvered glass is.
    if (vPart == ${P.mirror} && uProbeOn > 0.5) {
      int k = probeOf(vWorld);
      if (k >= 0) {
        col = probeLook(vWorld, R, k) * vec3(0.9, 0.93, 0.91) + spec * sunCol * dim;
        mirrored = true;
      }
    }
    // A curtain lets the light behind it through: the day at the glass,
    // the lamps in the room by night.
    if (vPart == ${P.curtain}) col += alb * ((uSun * max(dot(-N, L), 0.0) * shade + skyLight) * 0.28 * dim + lamps * 0.25);
    // A leaf lets the light through it: lit from behind, it glows its own
    // yellow-green.
    if (vPart == ${P.leaf} && vVar < 0.72) col += alb * vec3(1.4, 1.6, 0.6) * (uSun * max(dot(-N, L), 0.0) * shade * dim + lamps * 0.4) * 0.6;
  }
  // By night the pool's light spills onto the terrace round it.
  if (uNight > 0.0 && vWorld.y > ${f(TERRACE - 0.3)} && room == 0) {
    vec2 o = max(abs(vWorld.xz - ${v2([POOL.at[0], POOL.at[2]])}) - ${v2([POOL.w / 2, POOL.d / 2])}, 0.0);
    col += alb * vec3(0.25, 0.75, 0.85) * 0.5 * uNight * exp(-length(o) * 0.9) * (0.4 + 0.6 * max(N.y, 0.0));
  }
  // (0.4.6) By night the lamps' light rolls off toward white rather than
  // clipping (a film's shoulder), so a lit wall keeps its gradient and only
  // the lamps themselves burn.
  // (A mirror's probe was drawn with it already.)
  if (uNight > 0.0 && !mirrored) col = mix(col, (1.0 - exp(-col * 1.35)) * 1.08, uNight * (1.0 - step(0.5, length(emit))));
  if (uGrainA > 0.0) {
    ivec2 gi = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, gi, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;
