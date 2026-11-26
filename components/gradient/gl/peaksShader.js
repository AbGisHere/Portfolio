// (0.5.0) The opening in 3D (../peaks.js): the hero peak and the range
// round it, their feet lost in mist, under the afternoon or the night sky.
// The terrain, the mist and the sky are maths, so nothing is downloaded.
//
// Two passes (MistCanvas.jsx). The shape pass marches the view: where each
// pixel meets the ground (its distance, its normal, its snow, its
// hollowness, how high the ground rises toward the sun's and the moon's
// bearings) and how much mist lies in front of it, written into three
// float targets; it runs only when the camera or the frame's size changes.
// The light pass shades from those, with the body's shadows, the sky and
// the bodies: a switch only relights, so its frames are cheap. Where float
// targets can't be drawn into, one pass does both (PEAKS_ALL_FS).
//
// The look (the owner's references, 2026-11-19: Ama Dablam at dusk, the
// Dolomites, misty pine valleys): snow lit warm on the faces toward the
// body and cool in shade, dark rock showing through in bands, the lower
// slopes dissolving into soft mist, thin streaks of cloud in the sky lit
// from below near the horizon. The sky and the haze come from the scene's
// own palette (the recipe's six stops), so it stays one world with the 2D
// ridges and the desk.
import { BAKE, CLOUD, PEAKS, RIM_GLSL, SHELF, VALLEY } from '../peaks';

const f = x => (Number.isInteger(x) ? `${x}.` : `${x}`);
const peaks = PEAKS.map(([x, z, ht, r]) => `vec4(${f(x)}, ${f(z)}, ${f(ht)}, ${f(r)})`).join(', ');

export const PEAKS_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0., 1.); }`;
// (0.5.3) On the far plane: behind the meadow, the desk and the house,
// drawn only where none of them stands (as the 2D scene was).
export const PEAKS_FAR_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 1., 1.); }`;

const COMMON_CAM = `
precision highp float;
precision highp int;
uniform vec2 uRes;
// (0.5.13) 4, from the page: a loop bound the compiler can't fold.
uniform int uLoop4;
uniform vec3 uCam, uLook, uRight;
uniform float uFov;
// (0.5.3) Where the lens's axis meets the frame, in view units (0 but on
// the desk's camera, whose lens is shifted).
uniform vec2 uShift;
// (0.5.3) Where the rays start: 0, but on the desk's paths past the
// meadow's own ground (drawn in front), so none skims the grass.
uniform float uNear;
// (0.5.3) Skip 3D terrain raymarching when looking straight down or turned
// away toward the house: draw analytic meadow plane + real 3D sky only.
uniform float uSkipGeo;
// (0.5.7) The day's grade (1 by day, 0 by night): light and clear, not
// washed out: more colour and contrast on the final picture.
uniform float uGrade;
vec3 dayGrade(vec3 c) {
  float y = dot(c, vec3(.2126, .7152, .0722));
  vec3 g = mix(vec3(y), c, 1.04);
  g = (g - .5) * 1.1 + .52;
  return mix(c, clamp(g, 0., 1.), uGrade);
}
// The four bearings the ground's horizon is found for (../peaks.js BEARINGS).
uniform vec2 uBear[4];

// Hero peak centre (the full PEAK[] array lives in TERRAIN_BASE only so
// Mali never compiles a 12-vec4 constant table into light/mix/consts passes).
const vec2 HERO_XZ = vec2(${f(PEAKS[0][0])}, ${f(PEAKS[0][1])});
// The mist: its floor, and the height it thins out by.
const float MIST_BASE = ${f(CLOUD.base)};
const float MIST_RISE = ${f(CLOUD.rise)};
const mat2 M = mat2(.8, .6, -.6, .8);

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p, int oct) {
  float s = 0., a = .5;
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * noise(p); p = M * p * 2.02; a *= .5; }
  return s;
}
${RIM_GLSL}
// How much of a place is the sunlit meadow overlook around the desk.
float shelfD(vec2 p) { return rimD(p); }
float shelfMask(vec2 p) { return smoothstep(${f(SHELF.r + 45)}, ${f(SHELF.r)}, shelfD(p)); }
// Where a pattern lies on the ground: from above on gentle slopes, along
// the face (across it and up it) on steep ones, so nothing stretches down
// a cliff.
vec2 faceUV(vec3 p, vec3 n) {
  vec2 tg = normalize(vec2(-n.z, n.x) + 1e-5);
  float steep = smoothstep(.75, .35, n.y);
  return mix(p.xz, vec2(dot(p.xz, tg), p.y * 1.15), steep);
}
struct G { float t; vec3 n; float snow; float T; float mh; float ao; float hit; float strata; vec4 hor; };
vec3 camRight(vec3 f) {
  vec3 r = uRight - f * dot(uRight, f);
  float l = length(r);
  return l > 1e-4 ? r / l : normalize(cross(f, abs(f.y) > .99 ? vec3(0, 0, 1) : vec3(0, 1, 0)));
}
vec3 viewRay(out vec3 f, out vec3 r, out vec3 u, out float lens, out vec2 uv) {
  uv = (gl_FragCoord.xy * 2. - uRes) / uRes.y - uShift;
  f = normalize(uLook - uCam); r = camRight(f); u = cross(r, f);
  lens = 1. / tan(radians(uFov) * .5);
  return normalize(f * lens + uv.x * r + uv.y * u);
}
`;

// (0.5.30) Terrain split into minimal per-pass chunks so Mali / Galaxy S21
// never compiles dead march/geo/horizon/terrain2 code into bake/coarse/hor/shape-far.
const TERRAIN_BASE = `
const vec4 PEAK[${PEAKS.length}] = vec4[${PEAKS.length}](${peaks});
float ridged(vec2 p, int oct) {
  float s = 0., a = .5, w = 1.;
  for (int i = 0; i < 12; i++) {
    if (i >= oct) break;
    float n = 1. - abs(noise(p) * 2. - 1.);
    n *= n; s += n * a * w; w = clamp(n * 1.6, 0., 1.);
    p = M * p * 2.03; a *= .5;
  }
  return s;
}

// ---- the ground
float peak(vec2 p, vec4 P, float sc, float det) {
  // Four broad faces and the ridges between them (the owner, 2026-11-19:
  // not spires, not blobs; believable forms with rich erosion).
  vec2 q = mat2(.83, .56, -.56, .83) * (p - P.xy);
  float dd = mix(length(q) * 1.06, (abs(q.x) + abs(q.y)) * .77, .6) / P.w;
  float k = max(1. - dd, 0.);
  // A firm summit over flanks that fall away straight, then flare: neither
  // a spire nor a dome. The detail is in the erosion, not the outline.
  float prof = pow(k, 1.2) * 1.25 + k * .18;
  return 950. * sc + P.z * sc * prof * det;
}
// (0.5.3) Where a ray starts on the desk's paths: strictly upward rays jump
// cleanly past the flat meadow plateau straight toward the 3D mountains
// (so 1 m eye clearance never stalls the march over the shelf, while rays
// near horizontal still catch the valley and shelf cleanly with no gap).
float nearFor(vec3 rd) {
  if (uNear <= 0.) return 0.;
  if (rd.y > .0015) return ${f(SHELF.r * 0.88)};
  // (0.5.6) A ray skimming the plateau from eye height would spend every
  // step crawling over the grass and miss the mountains (a white line of
  // sky at the horizon): start it where it leaves the plateau's rim.
  if (uCam.y < ${f(SHELF.y + 85)} && rd.y > -.06) {
    float t = 0.;
    for (int i = 0; i < 40; i++) {
      if (rimD((uCam + rd * (t + 8.)).xz) > ${f(SHELF.r * 0.96)}) break;
      t += 8.;
    }
    return t;
  }
  return 0.;
}
// (0.5.3) The valley (../peaks.js VALLEY): how far a place is from its
// centre, how much of it lies inside its length, and its floor.
float valleyDist(vec2 p) { return abs(p.x - ${f(VALLEY.x)} - ${f(VALLEY.amp)} * sin(p.y / ${f(VALLEY.wave)})); }
float valleyLen(vec2 p) {
  return smoothstep(${f(VALLEY.head + 900)}, ${f(VALLEY.head)}, p.y)
    * smoothstep(${f(SHELF.z - 1500)}, ${f(SHELF.z - 650)}, p.y);
}
float terrain(vec2 p, int oct) {
  float d = length(p), ring = smoothstep(1100., 3400., d);
  float mask = .45 + .55 * noise(p / 3800. + vec2(3.1, 1.7));
  float valley = 380. + fbm(p / 1500., 3) * 420.;
  float range = .78 * ridged(p / 2800., oct) + .22 * fbm(p / 2600., min(oct, 5));
  float h = mix(valley, range * 3200. * mask + 450., ring);
  // Erosion: gullies and spurs down every face, finer as they go.
  float det = .8 + .36 * ridged(p / 560. + vec2(5.3, 2.1), min(oct, 9));
  for (int i = 0; i < ${PEAKS.length}; i++) h = max(h, peak(p, PEAK[i], i == 0 || i > 2 ? 1. : .62, det));
  // (0.5.3) Wide alpine valley trough between the meadow plateau and the
  // hero range: low enough for luminous valley mist to pool at the peaks'
  // feet, flanked by mountain walls on either side.
  float vd = valleyDist(p);
  // (0.5.5) No floor to see: the trough is all mountains, their spurs and
  // lesser peaks rising into the mist from deep below it.
  float vfloor = 650. + 1250. * ridged(p / 1700. + 5.3, min(oct, 6)) * (.45 + .55 * noise(p / 2300. + 2.)) * det;
  float wall = pow(smoothstep(${f(VALLEY.half)}, ${f(VALLEY.half + VALLEY.wall)}, vd), 1.35);
  float walls = max(h - vfloor, 0.) + 480. * (.6 + .4 * noise(p / 1300.)) * det;
  h = mix(h, vfloor + walls * wall, valleyLen(p));
  // The sunlit alpine meadow plateau where the desk and house stand.
  // Past the plateau's lip our own mountain rolls over (a grass shoulder,
  // ~7° at first) and steepens into cliffs down to the trough.
  float sx = max(shelfD(p) - ${f(SHELF.r)}, 0.);
  float spur = ${f(SHELF.y)} - (.12 * sx + .0009 * sx * sx)
    - 160. * det * smoothstep(25., 500., sx) * ridged(p / 420. + 7.7, min(oct, 7))
    - 55. * smoothstep(0., 90., sx) * ridged(p / 130. + 3.1, min(oct, 6))
    - 22. * smoothstep(0., 60., sx) * fbm(p / 60. + 2.3, min(oct, 5));
  // Hummocks and knolls on the shoulder, standing above the rim's line.
  spur += smoothstep(0., 60., sx) * (1. - smoothstep(250., 600., sx))
    * (22. * smoothstep(.45, .8, noise(p / 95. + 9.1)) + 7. * noise(p / 28. + 3.3));
  // (0.5.6) Never above the rim's line: from the plateau the edge is an
  // edge, not a ring of hills.
  spur = min(spur, ${f(SHELF.y)} - .06 * sx);
  // (0.5.6) A moat round our mountain: nothing near it stands as high as
  // the plateau (it never sits in a bowl); past it the range rises again,
  // close, behind the house and to the sides.
  float cap = ${f(SHELF.y)} - 520. * smoothstep(0., 380., sx) + 2600. * smoothstep(520., 1500., sx);
  h = min(h, cap + 60. * det * (noise(p / 230. + 2.9) - .5));
  h = max(h, spur);
  h = mix(h, ${f(SHELF.y)}, shelfMask(p));
  return h;
}
// (0.5.3) The ground and the mist's pattern baked once (PEAKS_BAKE_FS):
// a near box covering the whole hero range and a far box covering the
// plateau and distant ranges. Each texel stores height split in two (exact
// in half floats), mist noise, and coarse 3-octave height for instant AO.
uniform sampler2D uHN, uHF;
uniform float uBaked;
const vec4 BOX_N = vec4(${f(BAKE.near[0])}, ${f(BAKE.near[1])}, ${f(BAKE.near[2])}, 0.);
const vec4 BOX_F = vec4(${f(BAKE.far[0])}, ${f(BAKE.far[1])}, ${f(BAKE.far[2])}, 0.);
float mistNoise(vec2 xz) {
  vec2 q = xz / 1400.;
  return fbm(q + .5 * vec2(noise(q * 1.7 + 3.1), noise(q * 1.7 + 8.3)), 4);
}
vec4 bakedAt(vec2 p) {
  vec2 un = (p - BOX_N.xy) / BOX_N.z;
  if (all(greaterThan(un, vec2(.001))) && all(lessThan(un, vec2(.999)))) return textureLod(uHN, un, 0.);
  vec2 uf = (p - BOX_F.xy) / BOX_F.z;
  if (all(greaterThan(uf, vec2(.001))) && all(lessThan(uf, vec2(.999)))) return textureLod(uHF, uf, 0.);
  return vec4(-1e5);
}
// (0.5.11) The outer box: the march's ground (five octaves) out to the
// horizon, read, not worked out (the normals still work it out).
uniform sampler2D uHO;
uniform float uOuter;
const vec4 BOX_O = vec4(${f(BAKE.outer[0])}, ${f(BAKE.outer[1])}, ${f(BAKE.outer[2])}, 0.);
float H(vec2 p, int oct) {
  if (uBaked > .5) {
    vec4 b = bakedAt(p);
    if (b.x > -1e4) return b.x + b.y;
  }
  return terrain(p, oct);
}
// The march's ground: as H, but past the far box the outer bake while the
// ray is well above it (its texels round the crests off a little), the
// noise itself near the ground, so every hit is where it was.
float Hm(vec3 p, float t) {
  if (uBaked > .5) {
    vec4 b = bakedAt(p.xz);
    if (b.x > -1e4) return b.x + b.y;
    if (uOuter > .5) {
      vec2 uo = (p.xz - BOX_O.xy) / BOX_O.z;
      if (all(greaterThan(uo, vec2(.001))) && all(lessThan(uo, vec2(.999)))) {
        vec2 c = textureLod(uHO, uo, 0.).rg;
        float hb = c.x + c.y;
        if (p.y - hb > 60. + t * .004) return hb;
      }
    }
  }
  return terrain(p.xz, 5);
}
float Hcoarse(vec2 p) {
  if (uBaked > .5) {
    vec4 b = bakedAt(p);
    if (b.x > -1e4) return b.a * 1000.;
  }
  return terrain(p, 3);
}
float mistN(vec2 xz) {
  if (uBaked > .5) {
    vec4 b = bakedAt(xz);
    if (b.x > -1e4) return b.z;
  }
  return mistNoise(xz);
}
// Nothing stands above this: a ray past it, climbing, has missed.
const float CEILING = 4900.;
`;

// Single-pass 8-octave + 3-octave height: ONLY included in PEAKS_BAKE_FS.
const TERRAIN_BAKE = `
vec2 fbm2(vec2 p, int oct) {
  float s = 0., s3 = 0., a = .5;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * noise(p);
    if (i == 2) s3 = s;
    p = M * p * 2.02; a *= .5;
  }
  return vec2(s, oct <= 3 ? s : s3);
}
vec2 ridged2(vec2 p, int oct) {
  float s = 0., s3 = 0., a = .5, w = 1.;
  for (int i = 0; i < 12; i++) {
    if (i >= oct) break;
    float n = 1. - abs(noise(p) * 2. - 1.);
    n *= n; s += n * a * w; w = clamp(n * 1.6, 0., 1.);
    if (i == 2) s3 = s;
    p = M * p * 2.03; a *= .5;
  }
  return vec2(s, oct <= 3 ? s : s3);
}
vec2 terrain2(vec2 p) {
  float d = length(p), ring = smoothstep(1100., 3400., d);
  float mask = .45 + .55 * noise(p / 3800. + vec2(3.1, 1.7));
  float valley = 380. + fbm(p / 1500., 3) * 420.;
  vec2 range = .78 * ridged2(p / 2800., 8) + .22 * fbm2(p / 2600., 5);
  vec2 h = mix(vec2(valley), range * 3200. * mask + 450., ring);
  vec2 det = .8 + .36 * ridged2(p / 560. + vec2(5.3, 2.1), 8);
  for (int i = 0; i < ${PEAKS.length}; i++) {
    float sc = i == 0 || i > 2 ? 1. : .62;
    h.x = max(h.x, peak(p, PEAK[i], sc, det.x));
    h.y = max(h.y, peak(p, PEAK[i], sc, det.y));
  }
  float vd = valleyDist(p);
  float vn = .45 + .55 * noise(p / 2300. + 2.);
  vec2 vfloor = 650. + 1250. * ridged2(p / 1700. + 5.3, 6) * vn * det;
  float wall = pow(smoothstep(${f(VALLEY.half)}, ${f(VALLEY.half + VALLEY.wall)}, vd), 1.35);
  vec2 walls = max(h - vfloor, vec2(0.)) + 480. * (.6 + .4 * noise(p / 1300.)) * det;
  h = mix(h, vfloor + walls * wall, valleyLen(p));
  float sx = max(shelfD(p) - ${f(SHELF.r)}, 0.);
  float sm25 = smoothstep(25., 500., sx);
  float sm90 = smoothstep(0., 90., sx);
  float sm60 = smoothstep(0., 60., sx);
  float hum = sm60 * (1. - smoothstep(250., 600., sx))
    * (22. * smoothstep(.45, .8, noise(p / 95. + 9.1)) + 7. * noise(p / 28. + 3.3));
  vec2 spur = vec2(${f(SHELF.y)} - (.12 * sx + .0009 * sx * sx) + hum)
    - 160. * det * sm25 * ridged2(p / 420. + 7.7, 7)
    - 55. * sm90 * ridged2(p / 130. + 3.1, 6)
    - 22. * sm60 * fbm2(p / 60. + 2.3, 5);
  spur = min(spur, vec2(${f(SHELF.y)} - .06 * sx));
  float cap = ${f(SHELF.y)} - 520. * smoothstep(0., 380., sx) + 2600. * smoothstep(520., 1500., sx);
  float capN = noise(p / 230. + 2.9) - .5;
  h = min(h, vec2(cap) + 60. * det * capN);
  h = max(h, spur);
  h = mix(h, vec2(${f(SHELF.y)}), shelfMask(p));
  return h;
}
`;

// Coarse cone prepass: ONLY included in PEAKS_COARSE_FS.
const TERRAIN_COARSE = `
// (0.5.3) For the coarse pass: conservative cone reach against the baked
// heightfield so the full pass skips empty sky in one jump.
float coneReach(vec3 ro, vec3 rd, float tmax, float k) {
  // (0.5.29) Fast analytic exit for downward rays hitting the flat meadow
  // plateau (matches geo() — avoids 160 wasted march steps on the bottom
  // ~75% of the screen during desk top-down → laptop open!).
  if (rd.y < 0. && ro.y >= ${f(SHELF.y - 0.5)} && ro.y < ${f(SHELF.y + 85)}) {
    float tp = (${f(SHELF.y)} - ro.y) / rd.y;
    if (tp > 0. && shelfD((ro + rd * tp).xz) < ${f(SHELF.r * 0.97)}) return tp;
  }
  float t = max(1., nearFor(rd));
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - Hm(p, t);
    if (h < k * t + 6.) return t;
    if (t > tmax || (rd.y > 0. && p.y > CEILING)) return tmax;
    float kStep = (t < 2600. && p.z < ${f(SHELF.z - 200)}) ? .24 : .42;
    t += max(h * kStep, 1. + t * .0015);
  }
  return t;
}
`;

// Horizon elevation march: ONLY included in PEAKS_HOR_FS & PEAKS_ALL_FS.
const TERRAIN_HOR = `
// How high the ground rises toward a bearing, seen from p: the tangent of
// the horizon's elevation. A body below it is hidden, so the light pass
// shades with this instead of marching a shadow every frame.
float horizon(vec3 p, vec2 dir) {
  float m = -1., t = 15.;
  for (int i = 0; i < 18; i++) {
    vec2 q = p.xz + dir * t;
    float h = H(q, 3) - p.y;
    m = max(m, h / t);
    t *= 1.38;
    if (t > 16000.) break;
  }
  return m;
}
`;

// Full shape pass: ONLY included in PEAKS_GEO_FS & PEAKS_ALL_FS.
const TERRAIN_GEO = `
uniform float uMotion;
float march(vec3 ro, vec3 rd, float tmax, float t0) {
  float t = max(t0, 1.), tp = t, hp = 1.;
  bool gone = false;
  int maxSteps = uMotion > .5 ? 152 : 190;
  int binSteps = uMotion > .5 ? 3 : 5;
  for (int i = 0; i < 190; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * t;
    // Static baked heightfield (1 texture read/step): blazing fast and
    // completely rigid across scroll frames, with conservative Lipschitz
    // stepping so thin peaks never clip or morph.
    float h = p.y - Hm(p, t);
    if (h < .0012 * t) {
      // Binary search refinement for rock-solid silhouettes.
      float lo = tp, hi = t;
      for (int j = 0; j < 5; j++) {
        if (j >= binSteps) break;
        float mid = .5 * (lo + hi);
        vec3 pm = ro + rd * mid;
        if (pm.y - H(pm.xz, 5) < 0.) hi = mid;
        else lo = mid;
      }
      return .5 * (lo + hi);
    }
    if (t > tmax || (rd.y > 0. && p.y > CEILING)) { gone = true; break; }
    tp = t; hp = h;
    float kStep = (t < 2600. && p.z < ${f(SHELF.z - 200)}) ? .24 : .42;
    t += max(h * kStep, uMotion > .5 ? (.75 + t * .0016) : (.5 + t * .0014));
  }
  // Out of steps while still skimming the ground: only downward rays can
  // count as ground (an upward ray over the shelf must never fake a hit).
  return gone || rd.y >= 0. || hp > 40. + t * .02 ? -1. : t;
}
vec3 nrm(vec3 p, float t) {
  // Match central-difference step to the active bake box's texel spacing so
  // bilinear normals stay silky-smooth with zero square facets.
  vec2 un = (p.xz - BOX_N.xy) / BOX_N.z;
  bool inNear = all(greaterThan(un, vec2(.003))) && all(lessThan(un, vec2(.997)));
  float e = inNear ? max(8.0, t * .0016) : max(64.0, t * .004);
  int oc = t < 5000. ? 8 : 6;
  // (0.5.13) The four heights in a loop the compiler can't unroll (uLoop4
  // is 4): one copy of the terrain in the shader, not four (old Mali
  // compilers gave up on the shape pass). The same sums.
  float hs[4];
  for (int k = 0; k < uLoop4; k++) {
    vec2 o = k == 0 ? vec2(-e, 0) : k == 1 ? vec2(e, 0) : k == 2 ? vec2(0, -e) : vec2(0, e);
    hs[k] = H(p.xz + o, oc);
  }
  return normalize(vec3(hs[0] - hs[1], 2. * e, hs[2] - hs[3]));
}

// ---- the mist: soft banks pooled low in the alpine valley trough
float mistAt(vec3 p) {
  float hgt = (p.y - MIST_BASE) / MIST_RISE;
  if (hgt > 4.5) return 0.;
  float n = mistN(p.xz);
  // Its top heaps and dips. (0.5.6) One mist whatever the camera's height:
  // it once sank and thinned as the camera came down, so the flight saw
  // a different mist at every point of the scroll.
  float top = .55 + 2.7 * smoothstep(.35, .8, n);
  float body = smoothstep(top, top - 1.1, hgt);
  body *= smoothstep(-.32, .12, hgt);
  body *= .86;
  // Keep the meadow overlook around the desk clear of low cloud banks.
  body *= 1. - shelfMask(p.xz);
  float bill = noise(p.xz / 260. + hgt * .7);
  return body * (.55 + .45 * bill) * .0016;
}

G geo(vec3 rd, float tStart) {
  G g;
  g.n = vec3(0, 1, 0); g.snow = 0.; g.ao = 1.; g.strata = .5; g.hor = vec4(-1); g.T = 1.; g.mh = 0.;
  // (0.5.3) Fast analytic hit on the level sunlit meadow plateau around the
  // desk: zero raymarch steps and razor-clean flat ground (no noise lumps).
  if (rd.y < 0. && uCam.y >= ${f(SHELF.y - 0.5)} && uCam.y < ${f(SHELF.y + 85)}) {
    float tp = (${f(SHELF.y)} - uCam.y) / rd.y;
    vec3 pp = uCam + rd * tp;
    if (tp > 0. && shelfD(pp.xz) < ${f(SHELF.r * 0.97)}) {
      g.t = tp;
      g.hit = 1.;
      return g;
    }
  }
  float tn = nearFor(rd);
  // (0.5.10) The coarse pass saw only sky round this block (its cone
  // covers the block three times over): nothing to march.
  if (tStart >= 70000.) { g.t = -1.; g.hit = 0.; return g; }
  // The coarse start can't be trusted on a miss (a grazing ray, a thin
  // crest between its corners): look again from the eye. (0.5.13) Both
  // marches through one call in a loop (one copy of the march compiled).
  int tries = tStart > max(tn, 1.) ? 2 : 1;
  g.t = -1.;
  for (int k = 0; k < tries; k++) {
    g.t = march(uCam, rd, 80000., k == 0 ? max(tStart, tn) : max(tn, 1.));
    if (g.t >= 0.) break;
  }
  g.hit = g.t > 0. ? 1. : 0.;
  vec3 p = uCam + rd * max(g.t, 0.);
  if (g.hit > 0.) {
    g.n = nrm(p, g.t);
    vec3 n0 = g.n;
    float alt = p.y;
    float shf = shelfMask(p.xz);
    // Compute curvature/occlusion first: concave gullies (ao < 0.62) collect
    // snow and dark rock crevices; convex ribs (ao > 0.68) shear snow off.
    g.ao = mix(clamp(.62 + (alt - Hcoarse(p.xz)) / 320., .35, 1.), 1., shf);
    vec2 fu = faceUV(p, n0);
    // (0.5.29) Aperiodic alpine granite geology: broad fault-warped bedding
    // shifts, vertical couloir/buttress ribs, and diagonal fracture joints
    // (shared across strata, snow flutes, and tangent-space normal sculpting
    // so total noise cost stays lean at 120 fps).
    float warp = (fbm(p.xz / 340. + vec2(2.1, -1.3), 2) - .5) * 260.;
    float dip = alt + p.x * .22 - p.z * .14 + warp;
    float geoBand = smoothstep(.24, .78, fbm(vec2(dip / 140., fu.x / 480. + 1.7), 2));
    vec2 mq = vec2(fu.x / 52. + geoBand * 1.1, fu.y / 145.);
    vec2 jq = vec2((fu.x * .70 + dip * .32) / 50., (dip * .70 - fu.x * .23) / 94.);
    float m0Raw = fbm(mq, 2);
    float j0Raw = noise(jq);
    float rib = 1. - abs(2. * m0Raw - 1.);
    float joint = 1. - abs(2. * j0Raw - 1.);
    float strata = clamp(geoBand * .54 + rib * .28 + joint * .18, 0., 1.);
    g.strata = strata;
    // Anti-aliased tangent-space normal sculpting (horizontal across face +
    // vertical up face) so granite ribs, fracture facets, and wind-sculpted
    // snow flutes catch crisp 3D light without sub-pixel stipple aliasing.
    float pxW = max(g.t * 1.35 / max(uRes.y, 400.), .6);
    float aaMacro = smoothstep(78. * .5, 78. * .14, pxW);
    float aaMid   = smoothstep(28. * .5, 28. * .14, pxW);
    float aaFine  = smoothstep(12. * .5, 12. * .14, pxW);
    // Snow accumulation from slope, concave couloirs/gullies, angular granite
    // ribs, and altitude — sweeping crisp glacier flutes all the way to high
    // summits while exposing bold dark granite buttresses & fracture crags.
    float line = 1600. + fbm(p.xz / 650., 2) * 380. + 600. * shf - 620. * valleyLen(p.xz);
    float gully = clamp(.66 - g.ao, -.13, .24) * .78;
    float rockEdge = (rib - .52) * .13 + (m0Raw - .5) * .12 + (j0Raw - .5) * .06 + (geoBand - .5) * .06;
    float highCling = smoothstep(2250., 3350., alt) * .15;
    float fluteSnow = smoothstep(2000., 3100., alt) * smoothstep(.32, .72, 1. - rib) * .18;
    float holds = n0.y + gully + rockEdge + highCling + fluteSnow;
    float cliffCut = smoothstep(.11, .24, n0.y);
    g.snow = smoothstep(line - 150., line + 130., alt) * smoothstep(.35, .48, holds) * cliffCut;
    g.snow = max(g.snow, smoothstep(.52, .65, holds) * smoothstep(1380., 1680., alt - 600. * shf) * cliffCut);
    // Subtle wind-packed snow tucked into steep upper couloir cracks (never horizontal bars).
    float crackSnow = smoothstep(line + 140., line + 540., alt) * smoothstep(.54, .86, joint)
      * smoothstep(.18, .35, n0.y) * smoothstep(.48, .78, rib) * smoothstep(.65, .44, g.ao);
    g.snow = max(g.snow, crackSnow * .78);
    g.snow *= (1. - shf) * smoothstep(${f(SHELF.r * 3.5)}, ${f(SHELF.r * 8.)}, shelfD(p.xz));
    // Sculpted angular granite facets & soft wind-fluted snow drifts applied
    // in true tangent space (tg across face, bt up face).
    float flatMeadow = shf;
    float rockMask = (1. - flatMeadow) * smoothstep(26000., 1800., g.t);
    if (rockMask > .01) {
      vec3 tg = normalize(vec3(-n0.z, 0., n0.x) + vec3(1e-5, 0., 0.));
      vec3 bt = normalize(cross(n0, tg));
      // Macro vertical couloir flutes + diagonal granite fracture ribs (reuses m0Raw/joint).
      float m0 = m0Raw * .62 + joint * .38;
      float mx = fbm(mq + vec2(.24, 0.), 2) * .62 + (1. - abs(2. * noise(jq + vec2(.22, -.07)) - 1.)) * .38;
      float my = fbm(mq + vec2(0., .24), 2) * .62 + (1. - abs(2. * noise(jq + vec2(.09, .22)) - 1.)) * .38;
      float dU = (mx - m0) * 2.45 * aaMacro;
      float dV = (my - m0) * 1.65 * aaMacro;
      // Soft sweeping snow wind-flutes / drift ridges (for snow-covered slopes).
      float sdU = (mx - m0) * .80 * aaMacro;
      float sdV = (my - m0) * .56 * aaMacro;
      // Mid-scale chiseled granite blocks & diagonal cleavage planes (aperiodic).
      // Naturally anti-aliased by pxW (which scales with uRes.y) so rock detail
      // stays consistent while scrolling instead of popping in when scroll stops.
      if (aaMid > .01) {
        vec2 sq = vec2(fu.x / 26. + geoBand * .8, (fu.y * .85 + dip * .15) / 34.);
        float s0 = 1. - abs(2. * noise(sq) - 1.);
        float sx = 1. - abs(2. * noise(sq + vec2(.22, 0.)) - 1.);
        float sy = 1. - abs(2. * noise(sq + vec2(0., .22)) - 1.);
        dU += (sx - s0) * 1.25 * aaMid;
        dV += (sy - s0) * 1.05 * aaMid;
      }
      // Fine granite micro-crag ONLY when well-resolved by screen pixels.
      if (aaFine > .01) {
        vec2 fq = fu / 11.;
        float f0 = noise(fq), fx = noise(fq + vec2(.25, 0.)), fy = noise(fq + vec2(0., .25));
        dU += (fx - f0) * .58 * aaFine;
        dV += (fy - f0) * .58 * aaFine;
      }
      float uFinal = mix(dU, sdU, g.snow) * rockMask;
      float vFinal = mix(dV, sdV, g.snow) * rockMask;
      vec3 nn = normalize(n0 - (tg * uFinal + bt * vFinal));
      // Keep n.y >= 0.05 because o0 packs (n.x, n.z) and reconstructs +n.y.
      g.n = normalize(vec3(nn.x, max(nn.y, .05), nn.z));
    }
  }
  // The mist between the eye and what it sees: its depth (transmittance)
  // and how high in it the light was gathered (the light pass lights it).
  float end = g.hit > 0. ? g.t : 60000.;
  float tau = 0., hw = 0., w = 0.;
  float t0 = 0., t1 = end;
  float top = MIST_BASE + MIST_RISE * 4.5;
  float lo = MIST_BASE - MIST_RISE * .32;
  if (abs(rd.y) > 1e-4) {
    float ta = (top - uCam.y) / rd.y, tb = (lo - uCam.y) / rd.y;
    t0 = max(0., min(ta, tb));
    t1 = min(end, max(ta, tb));
  } else if (uCam.y > top || uCam.y < lo) t1 = 0.;
  if (t1 > t0) {
    // Keep all 14 mist steps in motion and gate low-variance Interleaved
    // Gradient Noise by step width dt so close mist stays silky smooth (no
    // 2×2 diagonal weave) while grazing far-valley mist avoids slicing bands
    // (leaving resting uMotion == 0 untouched).
    float dt = (t1 - t0) / 14.;
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
    float mJit = .5 + (ign - .5) * .5 * smoothstep(150., 600., dt);
    float j = (uMotion > .5 ? mJit : hash(gl_FragCoord.xy)) * dt;
    for (int i = 0; i < 14; i++) {
      vec3 q = uCam + rd * (t0 + j + dt * float(i));
      float dn = mistAt(q) * dt;
      float a = exp(-tau);
      tau += dn;
      hw += a * dn * clamp((q.y - MIST_BASE) / (MIST_RISE * 4.5), 0., 1.);
      w += a * dn;
      if (uMotion > .5 && tau > 6.5) break;
    }
  }
  g.T = exp(-tau);
  g.mh = w > 0. ? hw / w : 0.;
  return g;
}
`;
const COMMON_GEO = `${COMMON_CAM}\n${TERRAIN_BASE}\n${TERRAIN_GEO}`;
const COMMON_COARSE = `${COMMON_CAM}\n${TERRAIN_BASE}\n${TERRAIN_COARSE}`;
const COMMON_HOR = `${COMMON_CAM}\n${TERRAIN_BASE}\n${TERRAIN_HOR}`;
const COMMON_BAKE = `${COMMON_CAM}\n${TERRAIN_BASE}\n${TERRAIN_BAKE}`;
const COMMON_ALL = `${COMMON_CAM}\n${TERRAIN_BASE}\n${TERRAIN_HOR}\n${TERRAIN_GEO}`;

// (0.5.30) Atmosphere & frame constants split out so PEAKS_CONSTS_FS never
// compiles ground(), sky(), stars(), drawSun(), or drawMoon() on Mali.
const SHADE_ATMO = `
uniform float uByMoon;
uniform vec3 uSunDir, uMoonDir, uLightDir;
uniform vec3 uStops[6];
uniform vec3 uBody;
uniform float uNight, uGlow, uA;

vec3 S[6];
vec3 LIGHT;

// ---- the air, as real skies are lit: the body's light scattered by air
// (Rayleigh: blue overhead, white toward the horizon) and haze (Mie: the
// glow round the body), reddened through the air it crosses, so the same
// model gives the afternoon, the gold and orange of sunset, the blue
// twilight after it and the pink Belt of Venus opposite. Worked in
// physical light, then brought to the screen (ACES), so the sky, the snow
// and the mist share one light.
const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float BM = 3.5e-6;
const float HR = 8000.;
const float HM = 1200.;
const float PI = 3.14159265;
const float SUN_I = 20.;
const float MOON_I = .0045;
float airmass(float y) {
  float z = degrees(acos(clamp(y, -1., 1.)));
  return 1. / max(cos(radians(min(z, 90.))) + .15 * pow(max(93.885 - z, .4), -1.253), .028);
}
// Ozone, high up: it takes the green out of a low sun's light, which is why
// real sunsets go orange and magenta, and twilight deep blue.
const vec3 OZONE = vec3(.65e-6, 1.88e-6, .085e-6) * 9000.;
vec3 tau0() { float a = uCam.y; return BR * HR * exp(-a / HR) + vec3(BM * HM * exp(-a / HM) * 1.1) + OZONE; }
// (0.5.10) What's the same for every pixel, worked once a pixel in
// lightParts, not at every use.
vec3 TAU0, SKYL, BODYL, SUNL;
// A body's light where it reaches (reddened by the air on the way), and
// fading out as it goes under.
vec3 reach(vec3 L, float I) { return I * exp(-TAU0 * airmass(max(L.y, 0.) + .004)) * smoothstep(-.1, .02, L.y); }
// (0.5.17) The air's depths at the camera and each body's light at the top
// of it: the same for every pixel, worked once a frame (frameConsts).
vec3 TR, TM, LITS, LITM;
vec3 bodyLit(vec3 L, float I) { return I * exp(-TAU0 * airmass(max(L.y, 0.) + .004) * .9) * smoothstep(-.07, .01, L.y); }
vec3 scatter(vec3 rd, vec3 L, float I, vec3 lit) {
  float mu = dot(rd, L);
  float phR = 3. / (16. * PI) * (1. + mu * mu);
  float g = .76;
  float phM = (1. - g * g) / (4. * PI * pow(1. + g * g - 2. * g * mu, 1.5));
  vec3 tR = TR, tM = TM;
  vec3 tau = (tR + tM) * airmass(max(rd.y, 0.) + .01);
  vec3 oz = exp(-OZONE * airmass(max(rd.y, 0.) + .01) * .5);
  vec3 ph = (tR * phR + tM * phM) / (tR + tM);
  vec3 c = lit * ph * (1. - exp(-tau)) * oz;
  // Twilight: after the body is down the sky stays lit from above the
  // horizon, overhead longest, blue, until it is some 10° under.
  float tw = smoothstep(-.18, -.02, L.y) * (1. - smoothstep(0., .08, L.y));
  c += I * vec3(.0005, .0011, .0028) * tw * (.4 + .6 * smoothstep(0., .6, rd.y));
  return c;
}
float EXPO;
vec3 MOON_TINT, CLD_SUN, CLD_MOON, CLD_ZEN;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
// By night the eye loses colour and sees blue (the Purkinje shift): moonlit
// snow silver-blue, the sky navy, as in night photographs.
vec3 toScreen(vec3 c) {
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(c, l * vec3(.55, .72, 1.18), smoothstep(.3, 1., uNight) * .75);
  // (0.5.7) A low sun's light balanced warm, never olive: less green,
  // a touch more red, while it's within ~8° of the horizon.
  float lowSun = smoothstep(.17, .07, uSunDir.y) * smoothstep(-.08, .0, uSunDir.y);
  vec3 o = aces(c * EXPO);
  float lo = dot(o, vec3(.2126, .7152, .0722));
  return max(mix(vec3(lo), o, 1.18), 0.);
}
// The sky in physical light.
vec3 skyRaw(vec3 rd) {
  vec3 c = scatter(rd, uSunDir, SUN_I, LITS) + scatter(rd, uMoonDir, MOON_I, LITM);
  // The Belt of Venus: a pink band low opposite a sun at the horizon, over
  // the blue of the earth's own shadow.
  vec2 rf = normalize(rd.xz + 1e-5), sf = normalize(uSunDir.xz + 1e-5);
  float opp = pow(max(-dot(rf, sf), 0.), 1.5);
  float low = smoothstep(.12, -.01, uSunDir.y) * smoothstep(-.12, -.01, uSunDir.y);
  c += SUN_I * vec3(.011, .005, .0065) * opp * low * exp(-pow((rd.y - .07) / .045, 2.));
  // The night's own glow: airglow low down, the dark above.
  c += vec3(.0006, .0009, .0021) * (1. + 3. * exp(-max(rd.y, 0.) * 7.));
  return c;
}
// The body's light on the ground and the sky's in the shade, on screen.
vec3 bodyLight() { return toScreen(reach(uLightDir, uByMoon > .5 ? MOON_I : SUN_I) * (uByMoon > .5 ? .8 : .11)) * 1.25 * (uByMoon > .5 ? vec3(.8, .9, 1.15) : vec3(1.)); }
vec3 sunLit() { vec3 b = BODYL; if (uByMoon > .5) return b; float l = dot(b, vec3(.2126, .7152, .0722)); return mix(vec3(l), b, .18) * vec3(1.02, 1., .97); }
vec3 skyLight() { return toScreen(skyRaw(normalize(vec3(0., 1., 0.) + uLightDir * .3)) * .55); }
void frameConsts() {
  for (int i = 0; i < 6; i++) S[i] = pow(uStops[i], vec3(2.2));
  LIGHT = mix(pow(uBody, vec3(2.2)), vec3(1.), .15 * (1. - uNight));
  EXPO = 1.25 * pow(16., uNight);
  TAU0 = tau0();
  TR = BR * HR * exp(-uCam.y / HR); TM = vec3(BM * HM * exp(-uCam.y / HM));
  LITS = bodyLit(uSunDir, SUN_I); LITM = bodyLit(uMoonDir, MOON_I);
  BODYL = bodyLight(); SUNL = sunLit(); SKYL = skyLight();
  vec3 trM = exp(-TAU0 * airmass(max(uMoonDir.y, 0.) + .004));
  MOON_TINT = trM / max(max(trM.r, trM.g), 1e-3);
  CLD_SUN = reach(normalize(uSunDir + vec3(0., .05, 0.)), SUN_I);
  CLD_MOON = reach(uMoonDir, MOON_I);
  CLD_ZEN = skyRaw(vec3(0., 1., 0.));
}
`;

const SHADE = `${SHADE_ATMO}
uniform sampler2D uFlow;
// Noise from the flow texture (five octaves baked in): one or two reads,
// not a dozen noise sums.
float tn(vec2 p) { return texture(uFlow, p).r; }
float tn2(vec2 p) { return texture(uFlow, p).r * .62 + texture(uFlow, p * 2.73 + .37).g * .38; }
uniform vec3 uGrassGround, uGrassFar, uGrassSky;

// The moon's near side (public/moon.jpg: NASA's LRO map, public domain,
// projected onto a disc); until it has loaded, the drawn one stands in.
uniform sampler2D uMoonTex;
uniform float uMoonReady;
// The light's shadow: the body against the ground's horizon toward it.
uniform float uLightAz;
uniform vec4 uBearAz;
float shadow(G g) {
  float tl = uLightDir.y / max(length(uLightDir.xz), 1e-4);
  // The horizon toward the light: blended between the bearings either side.
  float a = clamp(uLightAz, uBearAz.x, uBearAz.w);
  float th = a < uBearAz.y ? mix(g.hor.x, g.hor.y, (a - uBearAz.x) / (uBearAz.y - uBearAz.x))
           : a < uBearAz.z ? mix(g.hor.y, g.hor.z, (a - uBearAz.y) / (uBearAz.z - uBearAz.y))
           : mix(g.hor.z, g.hor.w, (a - uBearAz.z) / (uBearAz.w - uBearAz.z));
  return smoothstep(-.035, .035, tl - th);
}

uniform float uLapse;

vec3 sky(vec3 rd) {
  vec3 c = skyRaw(rd);
  // (0.5.7) As in the references: deep blue overhead and away from the
  // sun, gold only toward it and along the horizon.
  float toward = pow(max(dot(rd, uSunDir), 0.), 3.);
  c *= mix(vec3(1.), vec3(.62, .9, 1.45), smoothstep(-.02, .45, rd.y) * (1. - toward) * (1. - uNight));
  // The sun melting into the sky round it: the air near it pales to its
  // own warm white, wide and soft.
  float near = pow(max(dot(rd, uSunDir), 0.), 60.) * .9 + pow(max(dot(rd, uSunDir), 0.), 12.) * .35;
  c = mix(c, max(c, vec3(dot(c, vec3(.33))) * vec3(1.45, 1.42, 1.32)), near * smoothstep(-.05, .02, uSunDir.y));
  // High cloud on a layer 9 km up, so it crowds toward the horizon as real
  // cloud does: patches of fibrous cirrus and soft altocumulus with clear
  // sky between, combed (not smeared) by the wind, sweeping across through
  // a switch (the timelapse). Thin, so the sky shows through; silvered
  // toward the body; lit by the body's light up where it floats, so it
  // burns orange and pink after the ground has gone into shadow.
  if (rd.y > .005) {
    vec2 sp = rd.xz * (9000. / rd.y) / 9000.;
    // (0.5.7) A switch sweeps the clouds across and back: at rest they're
    // always the first load's.
    vec2 q = mat2(.94, .34, -.34, .94) * sp + vec2(1.6, .3) * .6 * sin(uLapse * 3.14159265);
    float cover = smoothstep(.42, .7, tn(q * .05 + .3));
    vec2 w = q + .6 * (texture(uFlow, q * .15 + .7).rg - .5) * 2.;
    float fib = tn2(vec2(w.x * .17, w.y * .5));
    float soft = tn2(w * .3 + .45);
    float dens = smoothstep(.48, .78, mix(fib, soft, .35)) * cover;
    dens *= smoothstep(.005, .06, rd.y);
    float a = clamp(dens * .75, 0., .8);
    float fwd = pow(max(dot(rd, uSunDir), 0.), 14.);
    vec3 lit = CLD_SUN * (.05 + .9 * fwd) * (.75 + .25 * soft) * vec3(1.02, 1., .96) + CLD_MOON * .12;
    vec3 cc = lit + CLD_ZEN * .5;
    c = mix(c, cc, a);
  }
  return toScreen(c);
}
// (0.5.40) The Milky Way: a band on a great circle tilted across the sky
// the intro opens on (it passes near the up-view's middle, low and slanting
// at rest): a soft glow, warmer where it's dense, cut by dark dust lanes,
// and faint stars crowding into it (\`core\`, read by stars()).
const vec3 MW_POLE = vec3(.8, -.35, .3);
vec3 milkyWay(vec3 rd, out float core) {
  vec3 P = normalize(MW_POLE);
  vec3 e1 = normalize(cross(P, vec3(0., 1., 0.)));
  vec3 e2 = cross(P, e1);
  float lat = dot(rd, P);
  float lon = atan(dot(rd, e2), dot(rd, e1));
  float width = .2 + .07 * noise(vec2(lon * 1.7, 3.1));
  float lw = lat / width;
  core = exp(-1.6 * lw * lw);
  if (core < .01) return vec3(0.);
  // Star clouds: patchy, at three scales, brighter toward the middle.
  vec2 q = vec2(lon * 5., lat * 14.);
  float cloud = noise(q * .8 + .3) * .5 + noise(q * 2.1 + 1.7) * .3 + noise(q * 5.3 + 4.4) * .2;
  // Dust lanes: long and soft, wandering about the middle line.
  float mid = lat - .05 * width * (noise(vec2(lon * 2.3, 7.7)) - .5) * 4.;
  float lane = smoothstep(.35, .7, noise(vec2(lon * 3.2, 1.3)) * .7 + noise(vec2(lon * 8., lat * 20.)) * .3) * exp(-6. * (mid / width) * (mid / width));
  float glow = core * smoothstep(.15, .85, cloud) * (1. - .6 * lane);
  vec3 col = mix(vec3(.5, .58, .82), vec3(.9, .82, .7), smoothstep(.45, .9, cloud) * core);
  return col * glow * .05;
}
vec3 stars(vec3 rd) {
  float core;
  vec3 c = milkyWay(rd, core);
  for (int l = 0; l < 3; l++) {
    float sc = l == 0 ? 160. : l == 1 ? 340. : 700.;
    vec3 q = rd * sc, id = floor(q), fq = fract(q) - .5;
    if (hash3(id + float(l) * 17.) < (l == 0 ? .975 : l == 1 ? .94 : .9 - .16 * core)) continue;
    vec3 jit = vec3(hash3(id + 1.3), hash3(id + 2.7), hash3(id + 4.1)) - .5;
    float d = length(fq - jit * .6);
    float b = l == 0 ? 1.2 + 2.5 * pow(hash3(id + 9.1), 3.) : l == 1 ? .35 + .6 * pow(hash3(id + 9.1), 3.) : .24;
    vec3 tint = mix(vec3(1., .82, .66), vec3(.75, .84, 1.), hash3(id + 5.5));
    c += tint * b * 1.4 * (smoothstep(.08, 0., d) + (l == 0 ? .25 * exp(-d * 14.) : 0.));
  }
  // Fewer near the moon (its glow outshines them) and down low (the air).
  return c * smoothstep(.02, .22, rd.y) * (1. - .8 * pow(max(dot(rd, uMoonDir), 0.), 20.));
}

// The haze between the eye and the far ranges: the horizon's colours, the
// way the 2D ridges fade layer by layer.
vec3 haze(vec3 c, vec3 rd, float t) {
  // (0.5.7) By day, aerial perspective, not fog: a thinner, bluer veil, so
  // far ranges go blue, not white.
  float k = 1. - exp(-max(t - 2500., 0.) / mix(30000., 46000., uGrade));
  // Toward a low sun the veil is lit gold.
  float sunward = pow(max(dot(normalize(rd.xz), normalize(uSunDir.xz)), 0.), 6.) * smoothstep(.25, .02, uSunDir.y) * smoothstep(-.06, .01, uSunDir.y);
  float amt = clamp(k + .1 * sunward, 0., mix(.85, .5, 1. - uNight));
  if (amt <= 1e-4) return c;
  vec3 to = toScreen(skyRaw(normalize(vec3(rd.x, max(rd.y, mix(.02, .16, 1. - uNight)), rd.z))));
  to = mix(to, to * vec3(1.04, 1.02, 1.), sunward);
  return mix(c, to, amt);
}

// Exact meadow palette matching mistShader.js & grassShader.js (in linear light),
// with soft sunlit rolling pasture variation matching MEADOW_PAINT's mean tone
// so there is zero shade shift when MEADOW_PAINT adds fine grass detail.
vec3 shelfMeadow(vec2 xz, float dist, vec3 rd) {
  vec3 srgb = mix(uGrassGround, uGrassFar, smoothstep(4., 24., dist)) * mix(vec3(1.), uGrassSky, .25);
  // Subtle broad sunlit/dappled meadow variation matched to MEADOW_PAINT's average brightness.
  float broad = tn(xz / 340.) * .6 + tn(xz / 110. + .31) * .4;
  float mid = tn(xz / 38. + .13) * .55 + tn(xz / 14. + .61) * .45;
  float modK = mix(1., .84 + .32 * broad, smoothstep(22., 75., dist) * (1. - smoothstep(320., 900., dist)));
  modK *= mix(1., .86 + .28 * mid, smoothstep(6., 30., dist) * (1. - smoothstep(500., 1400., dist)));
  srgb *= modK;
  // Up close: tufts, blades' streaks and bare patches at 0.3–12 m, faded
  // by the pixel's footprint so nothing shimmers far off.
  float near = 1. - smoothstep(30., 140., dist);
  if (near > 0.) {
    vec2 q = xz * vec2(1., .55);
    float tuft = tn(xz / 12.) * .45 + tn(xz / 3.4 + .17) * .35 + tn(q / .9 + .53) * .2;
    float blade = tn(vec2(xz.x / .35, xz.y / 1.6) + .71);
    float fine = mix(1., .78 + .42 * tuft, near) * mix(1., .9 + .2 * blade, near * (1. - smoothstep(8., 40., dist)));
    srgb *= fine;
    srgb = mix(srgb, srgb * vec3(1.06, 1.02, .82), near * smoothstep(.62, .8, tuft) * .6);
  }
  srgb = mix(srgb, srgb * vec3(1.08, 1.03, .78), smoothstep(.6, .85, mid) * .35 * (1. - smoothstep(500., 1400., dist)));
  vec3 lin = pow(max(srgb, vec3(0.)), vec3(2.2));
  // Subtle alpine horizon haze far off (never muddy, never dark).
  return haze(lin, rd, dist);
}

vec3 ground(G g, vec3 rd) {
  // Under deep mist nothing of the ground shows: skip its light.
  if (g.T < .004) return vec3(0);
  vec3 p = uCam + rd * g.t;
  float shf = shelfMask(p.xz);
  // On the flat sunlit meadow plateau around the desk (or when looking
  // straight down / away toward the house), match mistShader.js cleanly so
  // grass blades, trees, and MEADOW_PAINT stitch with zero seam.
  if (uSkipGeo > .5 || (shf > .98 && p.y <= ${f(SHELF.y + 3)})) {
    return shelfMeadow(p.xz, g.t, rd);
  }
  vec3 n = g.n;
  float alt = p.y;
  vec2 fu = faceUV(p, n);
  float strata = g.strata;
  // (0.5.29) Layered alpine granite & dark slate: cool dark gneiss in deep
  // clefts, crisp grey-granite bands, subtle warm mineral veins on sunlit faces,
  // and fine-grained talus/scree on moderate lower aprons.
  float bandVar = noise(fu / 135. + vec2(1.4, 3.7));
  float vein = noise(vec2(fu.x / 68., fu.y / 38. + strata * 2.2));
  vec3 darkSlate = vec3(.095, .10, .118);
  vec3 midGranite = vec3(.25, .245, .24);
  vec3 paleGranite = vec3(.41, .395, .375);
  vec3 rock = mix(darkSlate, midGranite, smoothstep(.18, .62, strata));
  rock = mix(rock, paleGranite, smoothstep(.58, .88, strata) * (.45 + .55 * bandVar));
  // Subtle warm mineral ochre/iron strata streaks & darker vertical fracture clefts.
  rock *= mix(vec3(.92, .94, .98), vec3(1.06, 1.01, .94), smoothstep(.42, .78, vein));
  float cleft = smoothstep(.62, .38, g.ao) * smoothstep(.55, .22, strata);
  rock *= 1. - .34 * cleft;
  // Scree/talus apron where steep cliffs shed loose grey rock onto moderate slopes.
  float scree = smoothstep(2350., 1650., alt) * smoothstep(.46, .68, n.y) * smoothstep(.86, .66, n.y) * (1. - g.snow);
  rock = mix(rock, vec3(.23, .225, .22) * (.88 + .24 * bandVar), scree * .5);
  // Alpine evergreen foothills on gentler lower slopes.
  float pine = smoothstep(1900., 1450., alt + noise(p.xz / 90.) * 220.) * smoothstep(.52, .76, n.y);
  rock = mix(rock, vec3(.042, .088, .058), pine);
  // Sunlit alpine pasture on low valley floors & plateau shoulders.
  float lawn = smoothstep(${f(SHELF.y - 520)}, ${f(SHELF.y - 260)}, alt + noise(p.xz / 140.) * 120.)
    * smoothstep(${f(SHELF.r * 2.2)}, ${f(SHELF.r * 1.4)}, shelfD(p.xz)) * smoothstep(.62, .85, n.y);
  lawn = max(lawn, shf);
  vec3 grass = mix(vec3(.11, .19, .065), vec3(.16, .25, .08), noise(p.xz / 120.) * .6 + noise(p.xz / 420.) * .4);
  rock = mix(rock, grass, lawn * (1. - shf));
  // Snow keeps subtle cool shadow-subsurface tone so sunlit faces never blow flat white.
  vec3 snowAlb = mix(vec3(.86, .88, .92), vec3(.93, .945, .965), 1. - uNight);
  snowAlb *= .96 + .04 * noise(fu / 85.);
  vec3 alb = mix(rock, snowAlb, g.snow);
  float dif = max(dot(n, uLightDir), 0.);
  float sh = dif > 0. ? shadow(g) : 0.;
  // Snow scatters light internally in crevices so shaded flutes stay cool glacier-blue
  // rather than harsh dark ink lines.
  float effAO = mix(g.ao, sqrt(g.ao), g.snow * .52);
  // Shaded snow takes the sky's light paler than rock does (it scatters
  // inside itself): a soft grey-blue, not a saturated blue.
  vec3 sk = SKYL;
  vec3 skSnow = mix(vec3(dot(sk, vec3(.2126, .7152, .0722))), sk, .58) * 1.28;
  // (0.5.7) By day the sun carries the scene: stronger direct light against
  // a cooler, lower sky fill, so lit faces glow warm and shade goes blue.
  // (0.5.29) Directional sky-hemisphere gradient (sun-side sky slightly warmer
  // & brighter than anti-solar blue sky) gives backlit granite ribs & shaded
  // snow flutes genuine warm-vs-cool 3D modeling even in full shadow.
  float skySide = dot(n.xz, normalize(uLightDir.xz + 1e-4));
  vec3 skyDir = mix(vec3(.88, .94, 1.08), vec3(1.12, 1.04, .92), .5 + .5 * skySide);
  vec3 amb = mix(sk, skSnow, g.snow) * (.50 + .50 * n.y) * effAO
    * mix(vec3(1.), vec3(.52, .67, 1.) * skyDir * (1. + .22 * skySide), 1. - uNight);
  // (0.5.8) By night the hero peak alone stays legible (text will sit by
  // it): a cool moonlit fill on its faces, the snow catching most; the
  // rest of the range keeps the night.
  float hero = smoothstep(2200., 780., length(p.xz - HERO_XZ));
  amb += uNight * hero * vec3(.07, .09, .14) * (.6 + .4 * g.snow) * (.5 + .5 * n.y) * effAO;
  vec3 c = alb * (SUNL * dif * sh * mix(1., 1.92, 1. - uNight) + amb);
  // (0.5.9) By day too the hero stands apart: a touch more light on it.
  c += (1. - uNight) * hero * alb * SKYL * vec3(.85, .9, 1.) * .55 * (.5 + .5 * n.y) * effAO;
  c *= 1. + .12 * hero * (1. - uNight);
  // Bounce: with the body ahead, faces toward the viewer are backlit, so
  // sunlit mist and snowfields throw warm luminous light back onto them,
  // giving sculpted 3D relief even when viewed from the meadow below.
  vec2 back = normalize(-rd.xz + 1e-4);
  float facing = max(dot(normalize(n.xz + 1e-4), back), 0.) * (1. - n.y * .45);
  float lowness = smoothstep(MIST_BASE + MIST_RISE * 7., MIST_BASE, alt);
  vec3 bounce = BODYL * mix(vec3(1.), vec3(1., .92, .82), .45) * (.22 + .28 * lowness);
  c += alb * bounce * facing * (1. - dif * sh * .85) * effAO;
  // Snow is matte: no sheen, only a faint glitter of crystals in the light.
  c += g.snow * BODYL * dif * sh * step(.997, hash(floor(p.xz * 1.7 + p.y * .9))) * .4;
  // (0.5.29) Soft highlight shoulder on sunlit peaks so front-lit snow behind
  // the house stays bright crisp alpine white while preserving 3D ridge/flute relief.
  vec3 over = max(c - vec3(.74), vec3(0.));
  c = min(c, vec3(.74)) + over / (1. + over * 1.15);
  // (0.5.9) ... and clear of the haze the rest of the range sits back in.
  c = haze(c, rd, g.t * (1. - .7 * hero));
  // Below the mist's floor the ground fades into it: never a seen valley floor.
  // (0.5.6) In drifts, never a level grey sheet: its depth wanders and it
  // thickens and thins across the trough.
  float sink = smoothstep(MIST_BASE - 60., MIST_BASE - 480., alt + 220. * (noise(p.xz / 380. + 6.2) - .5));
  c = mix(c, SKYL * 1.35 + BODYL * .12, (.45 + .4 * noise(p.xz / 900. + 1.7)) * sink);
  // Smoothly transition into exact shelf meadow palette as we approach the plateau.
  // (0.5.6) And its grass carries on over the rim, down the shoulder's
  // gentle top, shaded by its slope, before the rock breaks through.
  // Rock breaks through it in outcrops and along the steeper breaks.
  float crop = smoothstep(.42, .62, noise(p.xz / 22. + 3.7) * .65 + noise(p.xz / 7. + 1.1) * .35 + (.9 - n.y) * 1.6);
  float edge = smoothstep(${f(SHELF.r * 1.6)}, ${f(SHELF.r * 1.02)}, shelfD(p.xz)) * smoothstep(.62, .86, n.y)
    * smoothstep(${f(SHELF.y - 110)}, ${f(SHELF.y - 30)}, alt + noise(p.xz / 40.) * 30.) * (1. - crop);
  float gw = max(shf, edge);
  if (gw > .001) {
    vec3 sm = shelfMeadow(p.xz, g.t, rd);
    float slope = clamp(.55 + .45 * dot(n, uLightDir) / max(uLightDir.y, .25), .55, 1.1);
    c = mix(c, sm * mix(slope, 1., shf), gw);
  }
  return c;
}

// The mist, lit: its tops catch the body's light, its depths take the sky's
// and the shade's; toward the body it glows (light through it).
vec3 mistLit(G g, vec3 rd) {
  // Mist is bright: water droplets scatter nearly all the light that falls
  // on them. Its tops take the body's light and the sky's, white; its
  // depths only the sky's, a soft grey-blue; toward the body it glows
  // (light through it).
  float fwd = pow(max(dot(rd, uLightDir), 0.), 5.);
  vec3 bl = BODYL;
  vec3 sun = mix(bl, vec3(dot(bl, vec3(.3, .5, .2))), .7);
  vec3 sk = SKYL;
  vec3 lo = sk * 1.35 + sun * .12;
  vec3 hi = sun * .72 + sk * 1.05;
  return mix(lo, hi, smoothstep(.05, .75, g.mh)) + sun * vec3(1.02, 1., .96) * fwd * .4;
}

// A body as the 2D scene draws it: a soft disc 10.4% of the frame's height
// across (the button's size, SunToggle.module.css), round on the frame.
vec3 drawSun(vec3 c, vec2 uv, vec3 f, vec3 r, vec3 u, float lens) {
  float z = dot(uSunDir, f);
  if (z <= 0. || uSunDir.y <= -.12) return c;
  vec2 sp = vec2(dot(uSunDir, r), dot(uSunDir, u)) * lens / z;
  // (0.5.7) Stylised, like the desk: a flat painted disc, its colour the
  // light's (gold low, cream high), a soft lighter heart, a clean edge and
  // two flat rings of glow. No rays, no limb darkening.
  float alt = uSunDir.y;
  vec2 dv = uv - sp;
  dv.y *= 1. + .18 * smoothstep(.06, 0., alt);
  float R = .104 * lens / 1.7320508, d = length(dv) / R, px = 2.5 / uRes.y / R;
  float up = smoothstep(-.12, -.02, alt);
  float high = smoothstep(.02, .25, alt);
  // (0.5.7) As in the owner's references: a small white-hot core, a wide
  // gold glow along the horizon, and a starburst of thin rays of uneven
  // length, all added to the sky.
  float hot = 1. - smoothstep(.12, .7, d);
  vec3 coreC = vec3(1., .98, .9);
  vec3 warm = mix(vec3(1., .9, .66), vec3(1., .96, .84), high);
  vec2 wide = dv / R * vec2(.35, 1.2);
  float wd = length(wide);
  float glow = .75 * exp(-d * 1.5) + .5 * exp(-d * .4) + .22 * exp(-d * .14) + .1 * exp(-wd * .1);
  float ang = atan(dv.y, dv.x);
  float rays = 0.;
  for (int k = 0; k < 2; k++) {
    float N = k == 0 ? 14. : 9.;
    float a0 = ang / 6.2831853 * N + (k == 0 ? 0. : .37);
    float id = floor(a0 + .5);
    float off = (a0 - id) * 6.2831853 / N * d;
    float len = 1.6 + 4.5 * hash(vec2(id, float(k) * 7.1));
    rays += exp(-off * off / (.006 + .004 * d)) * exp(-d / len) * (k == 0 ? .26 : .16);
  }
  rays *= smoothstep(.4, 1.1, d);
  // Gold where it's strong (mixed in, so it reads gold, not grey-beige
  // over the blue), white at the heart.
  c = mix(c, warm * 1.05, clamp(up * glow * .75, 0., .85));
  c += vec3(1., .95, .85) * up * .35 * exp(-d * .9);
  c += mix(warm, coreC, .5) * up * rays * mix(1., .6, high);
  c = mix(c, coreC, up * hot);
  return c;
}
// The moon as it is: its near side's seas where they are (Imbrium, Serenity,
// Tranquillity, Crisis, Fertility, Nectar, Clouds, Moisture, the Ocean of
// Storms, the Sea of Cold), its bright young craters (Tycho with its rays,
// Copernicus, Kepler, Aristarchus), the highlands pocked with old ones, a
// waxing gibbous phase with a soft terminator, and its halo.
float sea(vec2 q, vec2 c, vec2 r, float rot) {
  vec2 d = q - c;
  d = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * d;
  float e = length(d / r);
  return smoothstep(1.08, .82, e + .22 * (fbm(q * 7. + c * 3., 3) - .5));
}
vec3 drawMoon(vec3 c, vec2 uv, vec3 f, vec3 r, vec3 u, float lens) {
  float z = dot(uMoonDir, f);
  if (z <= 0. || uMoonDir.y <= -.12) return c;
  vec2 sp = vec2(dot(uMoonDir, r), dot(uMoonDir, u)) * lens / z;
  float R = .104 * lens / 1.7320508;
  float malt = uMoonDir.y;
  vec2 q = (uv - sp) / R;
  q.y *= 1. + .18 * smoothstep(.06, 0., malt);
  float d = length(q), px = 2.5 / uRes.y / R;
  float up = smoothstep(-.12, -.02, uMoonDir.y);
  // (0.5.13) Off the disc only its halo: the disc's colour is never mixed in.
  if (d >= 1. + px) {
    float high0 = smoothstep(.02, .3, malt);
    float o0 = d - 1.;
    vec3 haloC0 = mix(vec3(.9, .68, .4), vec3(.85, .76, .52), high0);
    return c + haloC0 * up * (.2 * exp(-o0 * 3.5) + .07 * exp(-o0 * .7) + .035 * exp(-o0 * .15));
  }
  // (0.5.7) Stylised, like the desk: a flat cream disc, its seas in one
  // flat cooler tone with soft edges (from the real map where it's
  // loaded), a few bright craters, a clean terminator, a flat halo.
  float mare = 0.;
  if (uMoonReady > .5) {
    float lum = dot(texture(uMoonTex, vec2(q.x, -q.y) * .5 + .5).rgb, vec3(.3, .55, .15));
    mare = smoothstep(.56, .3, lum);
  } else {
    mare = max(mare, sea(q, vec2(-.34, .36), vec2(.3, .25), .3));
    mare = max(mare, sea(q, vec2(.14, .38), vec2(.15, .14), 0.));
    mare = max(mare, sea(q, vec2(.3, .14), vec2(.2, .16), .5));
    mare = max(mare, sea(q, vec2(-.15, -.33), vec2(.17, .13), .4));
    mare = max(mare, sea(q, vec2(-.62, .05), vec2(.24, .42), .15));
  }
  // (0.5.7) A warm gold moon (the owner, 2026-11-20).
  vec3 col = mix(vec3(.98, .9, .66), vec3(.74, .66, .48), mare * .85);
  col += vec3(.06) * smoothstep(.07, .03, length(q - vec2(-.12, -.68)));
  col += vec3(.05) * smoothstep(.05, .02, length(q - vec2(-.27, .12)));
  // The phase: waxing gibbous, lit from the right; the dark side a touch
  // lighter than the sky (earthshine), the line between them clean.
  vec3 sn = vec3(q, sqrt(max(1. - d * d, 0.)));
  // (0.5.7) Full (the owner, 2026-11-20).
  float lit = 1.;
  // (Its dark side is the sky's own colour, a breath lighter: earthshine.)
  vec3 dark = c * .9 + vec3(.014, .017, .026);
  col = mix(dark, col, lit);
  // Low, warmer (amber to honey); high, cream.
  float high = smoothstep(.02, .3, malt);
  col *= mix(mix(MOON_TINT, vec3(1.), .4), vec3(1.), high);
  // Its light in the air round it, added: a soft aureole and the sky
  // lifted wide round it, cool high, warm low.
  float o = max(d - 1., 0.);
  vec3 haloC = mix(vec3(.9, .68, .4), vec3(.85, .76, .52), high);
  c += haloC * up * (.2 * exp(-o * 3.5) + .07 * exp(-o * .7) + .035 * exp(-o * .15));
  float edge = 1. - smoothstep(.93 - px, 1. + px, d);
  return mix(c, col, up * edge);
}

// The light, in two parts: what's there (the ground or the sky, with the
// bodies) and the mist before it, with how much of the first shows
// through. The composite (PEAKS_MIX_FS) moves the mist over them each frame.
// (0.5.13) The same for every pixel of a frame: worked once a frame into a
// 16-texel float target (PEAKS_CONSTS_FS; 0.5.17: 16) and read back here, where there.
uniform sampler2D uConsts;
uniform float uHaveConsts;
void lightParts(G g, vec3 rd, vec2 uv, vec3 f, vec3 r, vec3 u, float lens, out vec3 base, out vec3 mist) {
  if (uHaveConsts > .5) {
    for (int i = 0; i < 6; i++) S[i] = texelFetch(uConsts, ivec2(i, 0), 0).rgb;
    LIGHT = texelFetch(uConsts, ivec2(6, 0), 0).rgb;
    EXPO = texelFetch(uConsts, ivec2(7, 0), 0).r;
    TAU0 = texelFetch(uConsts, ivec2(8, 0), 0).rgb;
    BODYL = texelFetch(uConsts, ivec2(9, 0), 0).rgb;
    SUNL = texelFetch(uConsts, ivec2(10, 0), 0).rgb;
    SKYL = texelFetch(uConsts, ivec2(11, 0), 0).rgb;
    TR = texelFetch(uConsts, ivec2(12, 0), 0).rgb;
    TM = texelFetch(uConsts, ivec2(13, 0), 0).rgb;
    LITS = texelFetch(uConsts, ivec2(14, 0), 0).rgb;
    LITM = texelFetch(uConsts, ivec2(15, 0), 0).rgb;
    MOON_TINT = texelFetch(uConsts, ivec2(16, 0), 0).rgb;
    CLD_SUN = texelFetch(uConsts, ivec2(17, 0), 0).rgb;
    CLD_MOON = texelFetch(uConsts, ivec2(18, 0), 0).rgb;
    CLD_ZEN = texelFetch(uConsts, ivec2(19, 0), 0).rgb;
  } else frameConsts();
  if (g.hit > 0.) base = ground(g, rd);
  else {
    base = sky(rd);
    if (uNight > .65) base += stars(rd) * smoothstep(.65, 1., uNight);
    base = drawSun(base, uv, f, r, u, lens);
    base = drawMoon(base, uv, f, r, u, lens);
  }
  mist = g.T < .9999 ? mistLit(g, rd) : vec3(0.);
}
`;

// The coarse pass, at a quarter of the size each way: how far each ray
// gets before it is near the ground (a little short of it, so the full
// pass, starting there, never steps over a ridge a coarse ray missed).
export const PEAKS_COARSE_FS = `#version 300 es
${COMMON_COARSE}
uniform vec2 uFull;
out vec4 o;
void main() {
  // This texel's block of 4 × 4 full pixels: its centre, in the full
  // frame's view coordinates.
  vec2 uv = (gl_FragCoord.xy * 4. * 2. - uFull) / uFull.y - uShift;
  vec3 f = normalize(uLook - uCam), r = camRight(f), u = cross(r, f);
  float lens = 1. / tan(radians(uFov) * .5);
  // (0.5.29) Single center-ray conservative cone (15 px angular radius > 5×
  // the 2.83 px half-diagonal of a 4×4 block): 4× faster coarse prepass with
  // identical march accuracy (and geo()'s 2-try fallback guards any miss).
  vec3 rd = normalize(f * lens + uv.x * r + uv.y * u);
  float cone = 4. * 3.75 * 2. / (uFull.y * lens);
  float best = coneReach(uCam, rd, 80000., cone);
  o = vec4(best * .9 * .001, 0., 0., 1.);
}`;

// Each pixel's ground horizon toward the four bearings, at half the size
// each way (the shadows are soft; the light pass reads it filtered).
export const PEAKS_HOR_FS = `#version 300 es
${COMMON_HOR}
uniform sampler2D uG0;
// (0.5.13) Which bearings the light reads this frame (1) — while the camera
// moves only those are marched; all four once it settles.
uniform vec4 uBearUse;
out vec4 o;
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy) * 2;
  vec4 a = texelFetch(uG0, px, 0);
  if (a.x <= 0.) { o = vec4(-1); return; }
  vec2 uv = (vec2(px) + .5) * 2. / uRes - 1.;
  uv.x *= uRes.x / uRes.y;
  uv -= uShift;
  vec3 f = normalize(uLook - uCam), r = camRight(f), u = cross(r, f);
  vec3 rd = normalize(f / tan(radians(uFov) * .5) + uv.x * r + uv.y * u);
  vec3 n = vec3(a.y, sqrt(max(1. - a.y * a.y - a.z * a.z, 0.)), a.z);
  vec3 p = uCam + rd * a.x * 1000. + n * 3.;
  if (p.y <= ${f(SHELF.y + 6)} && shelfMask(p.xz) > .95) { o = vec4(-1); return; }
  o = vec4(uBearUse.x > .5 ? horizon(p, uBear[0]) : -1., uBearUse.y > .5 ? horizon(p, uBear[1]) : -1.,
           uBearUse.z > .5 ? horizon(p, uBear[2]) : -1., uBearUse.w > .5 ? horizon(p, uBear[3]) : -1.);
}`;

// (0.5.3) The bake: one box's texels — exact ground height (split in r+g),
// mist noise (b), and coarse 3-octave height (a) for instant AO.
export const PEAKS_BAKE_FS = `#version 300 es
${COMMON_BAKE}
uniform vec4 uBox;
out vec4 o;
void main() {
  vec2 p = uBox.xy + gl_FragCoord.xy * uBox.w;
  // (0.5.11) The outer box (uBox.z 1): the march's five octaves, heights only.
  if (uBox.z > .5) {
    float h5 = terrain(p, 5);
    float a5 = floor(h5 / 32. + .5) * 32.;
    o = vec4(a5, h5 - a5, 0., 0.);
    return;
  }
  vec2 h2 = terrain2(p);
  float a = floor(h2.x / 32. + .5) * 32.;
  o = vec4(a, h2.x - a, mistNoise(p), h2.y * .001);
}`;

// The shape pass: two targets (o0: RGBA16F, o1: RGBA8 holding T, mh, ao, strata).
export const PEAKS_GEO_FS = `#version 300 es
${COMMON_GEO}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform sampler2D uCoarse;
// (0.5.28) When marching behind the house at reduced scale (where full-res
// aoPass.depth cannot attach), skip pixels whose block in uPeakAO is covered
// by solid house/lawn (< 9000 m vs clear 1e4).
uniform sampler2D uPeakAO;
uniform float uPeakAOOn;
uniform float uPeakAOScale;
uniform ivec2 uPeakAOSize;
// (0.5.30) Temporal reprojection while scrolling (P2/R): reuse valid interior
// mountain pixels from the previous frame with rotation+parallax refinement
// and 4-neighbor silhouette guards so edges & newly revealed areas march fresh.
uniform float uReprojOn;
uniform sampler2D uPrevG0, uPrevG1;
uniform vec3 uPrevCam, uPrevF, uPrevR, uPrevU;
uniform float uPrevLens;
uniform vec2 uPrevShift, uPrevRes;
// (0.5.30, 0.5.33) Temporal reprojection helper kept in its own function scope
// so its registers do not overlap with geo() on small-register mobile GPUs
// (e.g. Adreno 619).
bool tryReproj(vec3 rd, float lens, float coarseT, out vec4 out0, out vec4 out1) {
  float z0 = dot(rd, uPrevF);
  if (z0 <= 1e-4) return false;
  vec2 pUv0 = vec2(dot(rd, uPrevR), dot(rd, uPrevU)) * (uPrevLens / z0);
  ivec2 px0 = ivec2(floor(((pUv0 + uPrevShift) * uPrevRes.y + uPrevRes) * .5));
  if (!all(greaterThanEqual(px0, ivec2(2))) || !all(lessThan(px0, ivec2(uPrevRes) - 2))) return false;
  float t0 = texelFetch(uPrevG0, px0, 0).x * 1000.;
  if (t0 <= 350.) return false;
  vec3 d1 = (uCam + rd * t0) - uPrevCam;
  float z1 = dot(d1, uPrevF);
  if (z1 <= 1e-4) return false;
  vec2 pUv1 = vec2(dot(d1, uPrevR), dot(d1, uPrevU)) * (uPrevLens / z1);
  ivec2 px1 = ivec2(floor(((pUv1 + uPrevShift) * uPrevRes.y + uPrevRes) * .5));
  if (!all(greaterThanEqual(px1, ivec2(2))) || !all(lessThan(px1, ivec2(uPrevRes) - 2))) return false;
  vec4 pA = texelFetch(uPrevG0, px1, 0);
  float t1 = pA.x * 1000.;
  if (t1 <= 350.) return false;
  float nL = texelFetch(uPrevG0, px1 + ivec2(-1, 0), 0).x;
  float nR = texelFetch(uPrevG0, px1 + ivec2(1, 0), 0).x;
  float nD = texelFetch(uPrevG0, px1 + ivec2(0, -1), 0).x;
  float nU = texelFetch(uPrevG0, px1 + ivec2(0, 1), 0).x;
  float minN = min(min(nL, nR), min(nD, nU));
  float maxN = max(max(nL, nR), max(nD, nU));
  if (minN <= .35 || (maxN - minN) >= pA.x * .09) return false;
  vec2 qUv = ((vec2(px1) + .5) * 2. - uPrevRes) / uPrevRes.y - uPrevShift;
  vec3 pRd = normalize(uPrevF * uPrevLens + qUv.x * uPrevR + qUv.y * uPrevU);
  vec3 w1 = uPrevCam + pRd * t1;
  vec3 toW = w1 - uCam;
  float tNew = length(toW);
  float pxAng = 2.8 / max(uRes.y * lens, 200.);
  vec3 dDir = toW / tNew - rd;
  if (tNew <= 350. || tNew >= coarseT * 1.35 || abs(tNew - t1) >= tNew * .05
      || dot(dDir, dDir) >= pxAng * pxAng
      || abs(w1.y - H(w1.xz, 5)) >= max(16., tNew * .006)) return false;
  out0 = vec4(tNew * .001, pA.y, pA.z, pA.w);
  out1 = texelFetch(uPrevG1, px1, 0);
  return true;
}
void main() {
  if (uPeakAOOn > .5) {
    float inv = 1. / max(uPeakAOScale, .25);
    ivec2 b = ivec2(floor(gl_FragCoord.xy * inv));
    int span = max(int(ceil(inv)) - 1, 1);
    ivec2 mx = uPeakAOSize - 1;
    float d0 = texelFetch(uPeakAO, min(b, mx), 0).r;
    float d1 = texelFetch(uPeakAO, min(b + ivec2(span, 0), mx), 0).r;
    float d2 = texelFetch(uPeakAO, min(b + ivec2(0, span), mx), 0).r;
    float d3 = texelFetch(uPeakAO, min(b + ivec2(span, span), mx), 0).r;
    if (max(max(d0, d1), max(d2, d3)) < 9000.) {
      o0 = vec4(-.001, 0., 1., 0.);
      o1 = vec4(1., 0., 1., .5);
      return;
    }
  }
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  // (0.5.30) Analytic meadow plateau hit runs BEFORE temporal reprojection so
  // distant mountains from the previous frame can never bleed over the plateau.
  if (rd.y < 0. && uCam.y >= ${f(SHELF.y - 0.5)} && uCam.y < ${f(SHELF.y + 85)}) {
    float tp = (${f(SHELF.y)} - uCam.y) / rd.y;
    if (tp > 0. && shelfD((uCam + rd * tp).xz) < ${f(SHELF.r * 0.97)}) {
      o0 = vec4(tp * .001, 0., 0., 0.);
      o1 = vec4(1., 0., 1., .5);
      return;
    }
  }
  float coarseT = texelFetch(uCoarse, ivec2(gl_FragCoord.xy) / 4, 0).x * 1000.;
  if (uReprojOn > .5 && coarseT > 300. && coarseT < 70000.) {
    vec4 r0, r1;
    if (tryReproj(rd, lens, coarseT, r0, r1)) {
      o0 = r0;
      o1 = r1;
      return;
    }
  }
  G g = geo(rd, coarseT);
  o0 = vec4(g.t * .001, g.n.x, g.n.z, g.snow);
  o1 = vec4(g.T, g.mh, g.ao, g.strata);
}`;

// The light pass, reading them.
const READ_G = `
uniform sampler2D uG0, uG1, uG2;
uniform float uReady, uReveal;
// (0.5.13) The shape's size against the frame's (½ while the flight moves).
uniform float uGeoScale;
// (0.5.17) The frame's own size against the canvas's (½ while the climb
// moves): uGeoScale is then the shape's against the frame's.
uniform float uFrameScale;
uniform vec2 uHorMax;
G readG(vec3 rd) {
  if (uSkipGeo > .5 || uReady < .5) {
    G s; s.t = -1.; s.n = vec3(0, 1, 0); s.snow = 0.; s.T = 1.; s.mh = 0.; s.ao = 1.; s.hit = 0.; s.strata = .5; s.hor = vec4(-1);
    if ((uSkipGeo > .5 || uNear > 0.) && rd.y < -.0005 && uCam.y >= ${f(SHELF.y - 0.5)}) {
      s.t = max((${f(SHELF.y)} - uCam.y) / rd.y, .1);
      s.hit = 1.;
    }
    return s;
  }
  // (0.5.30) Eye/climb-height analytic meadow hit matching horizonClipY() scissor:
  // ONLY triggers when the intersection point is strictly inside the plateau rim
  // (never past the rim over the valley!).
  if (uNear > 0. && rd.y < -.06 && uCam.y >= ${f(SHELF.y - 0.5)} && uCam.y <= ${f(SHELF.y + 17)}) {
    float tp = (${f(SHELF.y)} - uCam.y) / rd.y;
    if (tp > 0. && shelfD((uCam + rd * tp).xz) < ${f(SHELF.r * 0.97)}) {
      G s; s.t = tp; s.n = vec3(0, 1, 0); s.snow = 0.; s.T = 1.; s.mh = 0.; s.ao = 1.; s.hit = 1.; s.strata = .5; s.hor = vec4(-1);
      return s;
    }
  }
  ivec2 px = ivec2(gl_FragCoord.xy * uGeoScale);
  vec4 a = texelFetch(uG0, px, 0), b = texelFetch(uG1, px, 0);
  G g;
  g.t = a.x * 1000.; g.n = vec3(a.y, sqrt(max(1. - a.y * a.y - a.z * a.z, 0.)), a.z); g.snow = a.w;
  g.T = b.x; g.mh = b.y; g.ao = b.z; g.hit = a.x > 0. ? 1. : 0.; g.strata = b.w;
  g.hor = g.hit > 0. ? texture(uG2, min(gl_FragCoord.xy / uRes * uGeoScale * uFrameScale, uHorMax)) : vec4(-1.);
  return g;
}`;

// The mist's motion: a wind field from a small tiling noise texture
// (uFlow, made once on the CPU), sampled where the ray crosses the mist's
// middle, rolling on with the clock and faster through a switch (the
// timelapse), so the banks drift and part. Three texture reads a pixel.
const FLOW = `
uniform float uT, uLapseMix;
float mistFlow(vec3 rd) {
  float mid = MIST_BASE + MIST_RISE * 1.2;
  if (rd.y >= -.002) return 1.;
  vec2 p = (uCam + rd * ((mid - uCam.y) / rd.y)).xz;
  // One wind (all of it drifts the same way, the larger forms slower), read
  // at three scales turned to unrelated angles, so the texture's repeat
  // never lines up into a pattern.
  float clock = uT * .05 + uLapseMix * 1.8;
  vec2 wind = normalize(vec2(1., .32)) * clock;
  vec2 q1 = mat2(.82, .57, -.57, .82) * (p / 5600.) + wind * .35;
  vec2 q2 = mat2(.36, -.93, .93, .36) * (p / 2300.) + wind * .7;
  vec2 q3 = mat2(-.6, .8, -.8, -.6) * (p / 900.) + wind * 1.2;
  vec2 warp = texture(uFlow, q1 * .7 + .13).rg - .5;
  float a = texture(uFlow, q1 + warp * .35).r;
  float b = texture(uFlow, q2 + warp * .25).g;
  float c = texture(uFlow, q3).r;
  float v = a * .5 + b * .33 + c * .17;
  return mix(.25, 2.2, smoothstep(.3, .72, v));
}
vec3 compose(vec3 base, vec3 mist, float T0, vec3 rd) {
  float T = T0 < .9999 ? pow(T0, mistFlow(rd)) : T0;
  return mix(mist, base, T);
}`;

// The light pass: both parts into two targets (the mist's transmittance,
// square-rooted for its precision, in the second's alpha).
export const PEAKS_FS = `#version 300 es
${COMMON_CAM}
${SHADE}
${READ_G}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = readG(rd);
  vec3 base, mist;
  lightParts(g, rd, uv, f, r, u, lens, base, mist);
  o0 = vec4(pow(base, vec3(1. / 2.2)), 1.);
  o1 = vec4(pow(mist, vec3(1. / 2.2)), sqrt(g.T));
}`;

// The composite, every frame: the two parts and the mist's motion.
export const PEAKS_MIX_FS = `#version 300 es
${COMMON_CAM}
uniform sampler2D uFlow;
${FLOW}
uniform sampler2D uBase, uMist;
uniform float uA;
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 base = texelFetch(uBase, px, 0).rgb;
  vec4 m = texelFetch(uMist, px, 0);
  vec3 c = m.a > .9999 ? base : pow(compose(pow(base, vec3(2.2)), pow(m.rgb, vec3(2.2)), m.a * m.a, rd), vec3(1. / 2.2));
  c += (hash(gl_FragCoord.xy) - .5) / 255.;
  o = vec4(dayGrade(c) * uA, uA);
}`;

// The light and the composite in one, for the drop (the camera moving).
export const PEAKS_LIT_FS = `#version 300 es
${COMMON_CAM}
${SHADE}
${READ_G}
${FLOW}
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = readG(rd);
  vec3 base, mist;
  lightParts(g, rd, uv, f, r, u, lens, base, mist);
  // (0.5.6) From the plateau, the gorge's mist seen edge-on past the rim
  // is in the far ranges' shade, not a white line along the horizon.
  if (uNear > 0. && g.t > 250.) mist = mix(mist, mist * .55, smoothstep(-.06, -.004, rd.y));
  // (0.5.33) Match PEAKS_FS's RGBA8 [0, 1] range before compose() at the
  // opening (uNear <= 0) so switching between peaksKept and P.direct never
  // introduces a 1-frame highlight seam on bright day frames.
  vec3 lin = uNear <= 0. ? compose(clamp(base, 0., 1.), clamp(mist, 0., 1.), g.T, rd) : compose(base, mist, g.T, rd);
  // The first load: the mountains fade in over the sky that was there.
  if (g.hit > 0. && uReveal < 1. && uSkipGeo < .5 && uNear <= 0.) lin = mix(sky(rd), lin, uReveal);
  vec3 c = pow(lin, vec3(1. / 2.2)) + (hash(gl_FragCoord.xy) - .5) / 255.;
  o = vec4(dayGrade(c) * uA, uA);
}`;

// (0.5.13) The frame's constants (lightParts), one texel each.
export const PEAKS_CONSTS_FS = `#version 300 es
${COMMON_CAM}
${SHADE_ATMO}
out vec4 o;
void main() {
  frameConsts();
  int i = int(gl_FragCoord.x);
  vec3 v = i < 6 ? S[min(i, 5)] : i == 6 ? LIGHT : i == 7 ? vec3(EXPO) : i == 8 ? TAU0 : i == 9 ? BODYL : i == 10 ? SUNL : i == 11 ? SKYL : i == 12 ? TR : i == 13 ? TM : i == 14 ? LITS : i == 15 ? LITM : i == 16 ? MOON_TINT : i == 17 ? CLD_SUN : i == 18 ? CLD_MOON : CLD_ZEN;
  o = vec4(v, 1.);
}`;

// Both in one, where float targets can't be drawn into.
export const PEAKS_ALL_FS = `#version 300 es
${COMMON_ALL}
${SHADE}
${FLOW}
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = geo(rd, 1.);
  vec3 p0 = uCam + rd * max(g.t, 0.) + g.n * 3.;
  g.hor = g.hit > 0. ? vec4(horizon(p0, uBear[0]), horizon(p0, uBear[1]), horizon(p0, uBear[2]), horizon(p0, uBear[3])) : vec4(-1);
  vec3 base, mist;
  lightParts(g, rd, uv, f, r, u, lens, base, mist);
  vec3 c = pow(compose(base, mist, g.T, rd), vec3(1. / 2.2)) + (hash(gl_FragCoord.xy) - .5) / 255.;
  o = vec4(dayGrade(c) * uA, uA);
}`;


// The mist's wind field: 128² tiling value-noise fbm, two channels, made
// once (about a millisecond) so the composite reads it instead of working
// noise out per pixel.
export function flowNoise(N = 128) {
  const out = new Uint8Array(N * N * 4);
  const grid = (seed, g) => {
    const v = new Float32Array(g * g);
    let x = seed * 2654435761;
    for (let i = 0; i < v.length; i++) {
      x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0;
      v[i] = x / 4294967296;
    }
    return v;
  };
  const sample = (v, g, u, w) => {
    const x = u * g, y = w * g;
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a, b) => v[((b % g) + g) % g * g + (((a % g) + g) % g)];
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const octaves = [4, 8, 16, 32, 64].map((g, k) => [g, grid(k + 1, g), grid(k + 11, g)]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let r = 0, gch = 0, amp = 0.5, tot = 0;
      for (const [g, va, vb] of octaves) {
        r += amp * sample(va, g, x / N, y / N);
        gch += amp * sample(vb, g, x / N, y / N);
        tot += amp;
        amp *= 0.5;
      }
      const o = (y * N + x) * 4;
      out[o] = (r / tot) * 255;
      out[o + 1] = (gch / tot) * 255;
      out[o + 2] = 0;
      out[o + 3] = 255;
    }
  return out;
}
