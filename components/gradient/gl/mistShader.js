/**
 * One fullscreen fragment shader that composites the MIST scene in the
 * studio's paint order: sky → sun glow → sun → for each ridge (fill, crest
 * rim, veil) → air → grain. Geometry and colours arrive from mistGeometry.js
 * as uniforms and two small textures, so a frame is one draw call.
 *
 * All compositing is plain source-over in gamma-encoded sRGB, like SVG and
 * CSS, and lengths are in CSS px (the SVG's user units); `p` is the pixel
 * centre in those units, y down.
 *
 * The descent camera (../camera.js) arrives as uniforms too: the sky's shift
 * (uSkyShift), each ridge's scale (uScale: its blur and rim scale with it;
 * its crest, top, base and veil come already moved), the meadow below the
 * front ridge (uGround*) and the air following the front foot (uFront). At
 * `about` = 0 they're all identities, and the picture is 0.1's exactly.
 *
 * (0.3) The desk camera's pitch (../deskCamera.js): each screen pixel is
 * taken back to the 0.2 camera's image plane (`p`) and painted there as
 * before, the crests read between columns; a pixel whose ray leaves that
 * plane behind sees only the ground. The ground grid and the desk's grey box
 * are traced from the ray. With uPitched 0 nothing changes.
 */

import { DISC_ALPHA, DISC_LIFT, DISC_WHITE, LIMB_EDGE, LIMB_POWER, SET_BLOOM, SET_CORE, SET_LIFT, SET_WASH, SUN_GLOW } from '../sunLook';
import { hexToRgb } from '../colour';
import { WORLD_M } from '../deskCamera';

/** Shader features `?off=` can compile out, to profile what a frame costs
 * (harness only: without the flag, no define and no cost). */
export const OFF_FLAGS = ['skip', 'wash', 'bodies', 'ridges', 'slope', 'light', 'rim', 'meadow', 'veil', 'air', 'grain'];

export const MAX_RIDGES = 9; // "Ranges" tops out at 9

const f = v => v.toFixed(6);
const GLOW_N = SUN_GLOW.length;

export const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
// Profiling defines go on the next line (MistCanvas.jsx, \`?off=\`).
// @defines

#define MAX_RIDGES ${MAX_RIDGES}

uniform vec2 uSize;          // frame, CSS px
uniform vec2 uRes;           // canvas, device px
uniform float uDpr;          // device px per CSS px (for antialiasing widths)
uniform sampler2D uSky;      // sky gradient, top → bottom
uniform int uBodies;         // 1 at rest, 2 while the sun and moon trade places
uniform vec3 uBody[2];       // x, y, r
uniform vec3 uBodyCol[2];
uniform float uBodyGlow[2];  // glow strength: 1 in the sky, 0 once under the ridges
uniform float uBodyA[2];     // disc opacity (the moon fades with daylight)
uniform float uBodyWash[2];  // how far the colour leans to the sky behind it
uniform float uBodyFace[2];  // 1: the moon (face shaded in), 0: the sun
uniform float uBodySquash[2]; // a low sun's flattening, share of its height
uniform vec2 uBodyHalo[2];   // glow spread: x wider, y taller (1, 1 at rest; camera.js bodyAt)
uniform float uBodySet[2];   // how far a body has set under the descent (0 at rest; sunLook.js SET_*)
uniform sampler2D uMoon;     // moonFace.js shade map, across the disc
uniform sampler2D uCrest;    // R32F: crest y per device column, one row per ridge
uniform int uCount;
uniform int uCrestRow[MAX_RIDGES]; // each ridge's row in uCrest (its noise index)
uniform float uTop[MAX_RIDGES];
uniform float uBase[MAX_RIDGES];
uniform vec3 uFillA[MAX_RIDGES];   // gradient stop at 0%
uniform vec3 uFillB[MAX_RIDGES];   // at 45%
uniform vec3 uFillC[MAX_RIDGES];   // at 100%
uniform vec3 uRimCol[MAX_RIDGES];
uniform float uRimA[MAX_RIDGES];
uniform float uBlur[MAX_RIDGES];   // Gaussian sigma, 0 = crisp
uniform float uFade[MAX_RIDGES];
// (0.2.2) The body's light on the ridges (sunLook.js RIDGE_LIGHT): per
// ridge, the crest light's strength and the shadow's (0.2.5: some at rest too).
uniform float uLitA[MAX_RIDGES];
uniform float uShadeA[MAX_RIDGES];
uniform vec3 uLitCol;         // the crest light's colour
uniform vec3 uShadeCol;       // the shadow's tint (the sky overhead's hue, max channel 1)
uniform vec3 uLitAt;          // the body's x, the light's spread (px), its depth below a crest (px)
uniform float uLitBase;       // share of the light away from the body
uniform vec4 uVeil[MAX_RIDGES];    // cx (drift applied), cy, rx, ry
uniform float uVeilA[MAX_RIDGES];
uniform float uRimW;
uniform vec3 uMist;
uniform float uAirA;
uniform sampler2D uGrain;    // 256² noise, tiled at 256 CSS px, nearest
uniform float uGrainA;
uniform float uSkyShift;     // the camera's tilt: the sky moves up this far, CSS px
uniform float uSkyScale;     // and is drawn this much denser (camera.js skyUnder; 1 at rest)
uniform float uScale[MAX_RIDGES]; // each ridge's camera scale (1 at rest)
uniform float uFront;        // the front ridge's foot: the meadow's top (≥ height: none)
uniform float uHorizon;      // the ground's vanishing line
uniform vec4 uGroundY;       // the meadow gradient's stops, y in CSS px (camera.js GROUND_AT)
uniform vec3 uGroundCol[4];
uniform vec3 uWind;          // amplitude, bands per unit depth ratio, phase (cycles)
// (0.3) The desk camera (../deskCamera.js pitchOf, deskBox).
uniform int uPitched;        // 1 under its pitch
uniform vec4 uPitch;         // cos, sin of the pitch, focal length (CSS px), zoom
uniform vec4 uPrin;          // optical centre on screen (xy) and on the virtual plane (zw)
uniform float uCm;           // the crest texture spans uCm × the frame, centred
uniform vec2 uEye;           // the camera's height and back, world units
uniform vec3 uBoxMin;        // the desk's box relative to the camera, world units,
uniform vec3 uBoxMax;        // y up, z forward
// (0.3) The closing shot's sky (../deskCamera.js skyLifeAt).
uniform float uLifeA;        // how far it has come in (0: none)
uniform vec2 uLifeMix;       // birds (day), stars (night)
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uBirdCol;
uniform float uSkyT;         // its clock, seconds
// (0.3.1) The meadow's ground under the desk camera.
uniform vec3 uCamM;          // the camera, metres from the desk's centre
uniform vec3 uGrassGround;   // the ground's colour up close
uniform vec3 uGrassFar;      // and where the blades are too small to see
uniform vec3 uGrassSky;      // the sky's tint on it (deskCamera.js grassLit)
uniform vec2 uHazeAt;        // metres: its haze starts, it's all painted meadow
uniform vec2 uDepthAB;       // perspective depth A, B (metres; grassShader.js)

out vec4 outColor;

// Standard normal CDF (tanh approximation, |error| < 3e-4). The argument is
// clamped first: pixels far from an edge send x into the thousands, and some
// GPUs (and SwiftShader) return NaN from tanh() once exp() overflows.
float Phi(float x) {
  x = clamp(x, -6.0, 6.0);
  return 0.5 * (1.0 + tanh(0.7978845608 * (x + 0.044715 * x * x * x)));
}

vec3 over(vec3 dst, vec3 src, float a) { return mix(dst, src, clamp(a, 0.0, 1.0)); }

// The meadow at p (below uFront): camera.js groundPaint's stops, linear in
// sRGB between them as CSS draws them, then the wind: soft bright bands at
// constant ground depth, fading out toward the front foot where they'd crowd.
vec3 meadow(vec2 p) {
  vec3 g = p.y < uGroundY.y ? mix(uGroundCol[0], uGroundCol[1], (p.y - uGroundY.x) / max(1e-3, uGroundY.y - uGroundY.x))
    : p.y < uGroundY.z ? mix(uGroundCol[1], uGroundCol[2], (p.y - uGroundY.y) / max(1e-3, uGroundY.z - uGroundY.y))
    : mix(uGroundCol[2], uGroundCol[3], clamp((p.y - uGroundY.z) / max(1e-3, uGroundY.w - uGroundY.z), 0.0, 1.0));
  if (uWind.x > 0.0) {
    float dy = max(1.0, p.y - uHorizon);
    float q = (uFront - uHorizon) / dy;              // depth over the front foot's
    float gx = (p.x - uSize.x * 0.5) / dy * (uFront - uHorizon) / uSize.y; // across, same units
    // Bands of constant depth rolling toward the viewer, bent a little, lit
    // in gusts: patches that wander across as the bands pass.
    float wave = sin(6.2831853 * (q * uWind.y + uWind.z + 0.3 * sin(gx * 2.1)));
    float gust = smoothstep(0.25, 0.95, 0.5 + 0.5 * sin(gx * 4.3 + q * 9.0 - 6.2831853 * uWind.z * 0.37));
    g *= 1.0 + uWind.x * wave * gust * clamp((1.0 - q) * 12.0, 0.0, 1.0);
  }
  return g;
}

// The sun's two-layer glow (sunLook.js): opacity at x radii, piecewise-linear
// through the same stops the layered fallback's CSS gradient uses.
const float GLOW_X[${GLOW_N}] = float[](${SUN_GLOW.map(([x]) => f(x)).join(', ')});
const float GLOW_A[${GLOW_N}] = float[](${SUN_GLOW.map(([, a]) => f(a)).join(', ')});
float sunGlow(float x) {
  if (x >= GLOW_X[${GLOW_N - 1}]) return 0.0;
  for (int k = 1; k < ${GLOW_N}; k++) {
    if (x <= GLOW_X[k]) return mix(GLOW_A[k - 1], GLOW_A[k], (x - GLOW_X[k - 1]) / (GLOW_X[k] - GLOW_X[k - 1]));
  }
  return 0.0;
}
const vec3 LIMB_EDGE = vec3(${LIMB_EDGE.map(f).join(', ')});
const vec3 DISC_WHITE = vec3(${hexToRgb(DISC_WHITE).map(c => f(c / 255)).join(', ')});

// (0.3) Hashes and value noise for the closing sky: integer hashing, so
// every GPU draws the same clouds, stars and flocks.
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float h1(ivec2 c) { return float(pcg(uint(c.x) * 1973u ^ pcg(uint(c.y) + 40503u))) / 4294967295.0; }
float vnoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = x - i;
  f = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(i);
  return mix(mix(h1(c), h1(c + ivec2(1, 0)), f.x), mix(h1(c + ivec2(0, 1)), h1(c + ivec2(1, 1)), f.x), f.y);
}
float fbm(vec2 x) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(x);
    x = x * 2.03 + vec2(17.1, 3.7);
    a *= 0.5;
  }
  return v / 0.9375;
}
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

// Clouds: two banks, a low far one and a higher near one, each drifting at
// its own pace (parallax) and slowly changing shape (a warped noise that
// moves with time), thinned in patches so the sky has gaps. Haze takes them
// toward the sky's own colour, most near the horizon, so they sit in the air
// rather than on it. Then stars: faint, twinkling, higher up and out from
// behind the clouds.
vec3 skyLife(vec3 col, vec2 p) {
  float alt = (uHorizon - p.y) / uSize.y;
  float x = p.x / uSize.y;
  float cover = 0.0;
  for (int k = 0; k < 2; k++) {
    float near = float(k);
    float lo = mix(0.02, 0.12, near);
    float hi = mix(0.22, 0.62, near);
    float band = smoothstep(lo, lo + 0.08, alt) * (1.0 - smoothstep(hi - 0.15, hi, alt));
    if (band <= 0.0) continue;
    float t = uSkyT * mix(0.004, 0.009, near);
    vec2 q = vec2(x * mix(2.2, 1.1, near) + t + near * 7.3, alt * mix(9.0, 4.5, near));
    q += 0.45 * vec2(vnoise(q * 0.6 + vec2(0.0, uSkyT * 0.02)), vnoise(q * 0.6 + vec2(4.1, -uSkyT * 0.017)));
    float n = fbm(q);
    float patchy = smoothstep(0.3, 0.65, vnoise(vec2(x * 0.7 + t * 0.5 + near * 3.0, near * 11.0)));
    float c = smoothstep(0.47, 0.7, n) * band * patchy;
    vec3 cc = mix(uCloudShade, uCloudLit, smoothstep(0.55, 0.8, n) * (0.6 + 0.4 * smoothstep(lo, hi, alt)));
    float haze = mix(0.55, 0.3, near) + 0.3 * (1.0 - smoothstep(0.0, 0.25, alt));
    col = mix(col, mix(cc, col, haze), c * 0.9 * uLifeA);
    cover = max(cover, c);
  }
  if (uLifeMix.y > 0.0) {
    float cell = uSize.y * 0.018;
    vec2 g = p / cell;
    ivec2 id = ivec2(floor(g));
    float r = h1(id);
    if (r > 0.86) {
      vec2 at = vec2(h1(id + ivec2(7, 3)), h1(id + ivec2(1, 9)));
      float d = length(fract(g) - at) * cell;
      float size = 0.5 + 1.1 * h1(id + ivec2(5, 5));
      float tw = 0.65 + 0.35 * sin(uSkyT * (1.5 + 2.0 * r) + r * 40.0);
      float a = (1.0 - smoothstep(size * 0.4, size, d)) * smoothstep(0.03, 0.25, alt) * (1.0 - cover) * tw;
      col = mix(col, vec3(1.0, 0.97, 0.9), a * 0.9 * uLifeMix.y * uLifeA);
    }
  }
  return col;
}

// Birds by day. Four flocks, each on its own long cycle: it crosses for part
// of it (at its own speed, height and heading, at a new depth each time)
// and is away for the rest, so they come irregularly. A flock is one to
// seven birds in a loose scatter, each beating its wings at its own rate and
// gliding now and then. Depth sets the size and the haze: far birds are
// small, soft and taken toward the sky behind them.
vec3 birds(vec3 col, vec2 p, float aa) {
  for (int f = 0; f < 4; f++) {
    float period = 38.0 + 40.0 * h1(ivec2(f, 991));
    float u = uSkyT / period + h1(ivec2(f, 17));
    ivec2 id = ivec2(f, int(floor(u)));
    float travel = 0.5 + 0.4 * h1(id + ivec2(6, 2));
    float ph = fract(u) / travel;
    if (ph > 1.0) continue;
    float z = h1(id + ivec2(9, 4));
    float dir = h1(id + ivec2(3, 1)) > 0.5 ? 1.0 : -1.0;
    float s = uSize.y * mix(0.0095, 0.004, z);
    float y0 = uHorizon - uSize.y * (0.06 + 0.24 * h1(id + ivec2(2, 8)))
      + uSize.y * 0.025 * (vnoise(vec2(uSkyT * 0.08, float(f) * 5.0)) - 0.5);
    float x0 = mix(-0.15, 1.15, dir > 0.0 ? ph : 1.0 - ph) * uSize.x;
    if (abs(p.x - x0) > s * 22.0 || abs(p.y - y0) > s * 14.0) continue;
    int n = 1 + int(h1(id + ivec2(4, 4)) * 7.0);
    float haze = 0.25 + 0.55 * z;
    vec3 bc = mix(uBirdCol, col, haze);
    float soft = aa * 1.5 + s * 0.06 * (1.0 + z);
    for (int b = 0; b < 7; b++) {
      if (b >= n) break;
      ivec2 bid = ivec2(f * 16 + b, id.y);
      float bt = uSkyT + 10.0 * h1(bid + ivec2(8, 8));
      vec2 c = vec2(x0, y0) + s * vec2(
        -dir * (float(b) * 2.6 + 3.0 * h1(bid)) + 0.8 * sin(bt * 0.31),
        (h1(bid + ivec2(1, 1)) - 0.5) * 9.0 + 0.7 * sin(bt * 0.47));
      // Flapping, eased in and out of glides (wings held a little up).
      float flap = smoothstep(0.35, 0.6, vnoise(vec2(bt * 0.3, float(b) * 3.1 + float(f))));
      float fl = mix(-0.3, sin(bt * 6.2831853 * (2.6 + 1.4 * h1(bid + ivec2(2, 2)))), flap);
      vec2 q = (p - c) / s;
      q.x = abs(q.x);
      vec2 elbow = vec2(0.5, -0.12 - 0.32 * fl);
      vec2 tip = vec2(1.05, 0.05 - 0.6 * fl);
      float d = min(seg(q, vec2(0.0, 0.08), elbow), seg(q, elbow, tip)) * s;
      float a = 1.0 - smoothstep(0.0, soft * 2.0, d - max(0.4, s * 0.085));
      col = mix(col, bc, a * 0.9 * uLifeMix.x * uLifeA);
    }
  }
  return col;
}

// A crest between columns (column x, fractional under the pitch only: whole
// columns read exactly as texelFetch).
float crestAt(float x, int row) {
  int i = int(floor(x));
  int n = textureSize(uCrest, 0).x - 1;
  float a = texelFetch(uCrest, ivec2(min(i, n), row), 0).r;
  float u = x - float(i);
  if (u == 0.0) return a;
  return mix(a, texelFetch(uCrest, ivec2(min(i + 1, n), row), 0).r, u);
}

void main() {
  // Pixel centre in CSS px, y down like the SVG.
  float xPx = gl_FragCoord.x;
  vec2 p = vec2(xPx, uRes.y - gl_FragCoord.y) * uSize / uRes;
  // (The screen's own pixel, for the grain.)
  vec2 ps = p;

  // Antialiasing width, as a Gaussian of ~half a device pixel.
  float aa = 0.5 / uDpr;
  int cols = textureSize(uCrest, 0).x;
  float cx = float(clamp(int(xPx), 0, cols - 1));
  float cm = 1.0;

  // (0.3) Under the desk camera's pitch: the ray (y down, z forward, before
  // the pitch), and this pixel on the 0.2 camera's plane. A ray that leaves
  // the plane behind only meets the ground: it goes far below everything.
  vec3 ray = vec3(0.0);
  if (uPitched == 1) {
    vec2 uv = (p - uPrin.xy) / uPitch.w;
    float yv = uv.y * uPitch.x + uPitch.z * uPitch.y;
    float zv = uPitch.z * uPitch.x - uv.y * uPitch.y;
    ray = vec3(uv.x, yv, zv);
    if (zv <= 1e-3 * uPitch.z) p = vec2(uPrin.z, 1e7);
    else {
      p = uPrin.zw + uPitch.z * vec2(uv.x, yv) / zv;
      aa *= uPitch.z / (uPitch.w * zv);
    }
    cm = uCm;
    cx = clamp(((p.x - uSize.x * 0.5) / cm + uSize.x * 0.5) * uRes.x / uSize.x - 0.5, 0.0, float(cols - 1));
  }
  float cl = max(cx - 1.0, 0.0);
  float cr = min(cx + 1.0, float(cols - 1));
  float span = (cr - cl) * uSize.x / uRes.x * cm;

  // (0.2.4) The ridges are opaque and painted back to front, so a pixel
  // deep inside one ridge's body shows nothing from behind it: its fill's
  // edge is Phi(6) there (Phi clamps at 6), exactly 1 in float32, and
  // replaces everything painted before. Find the nearest such ridge,
  // front to back, and start there: the sky, the bodies and the ridges
  // behind it are never computed. Below the front ridge's foot the meadow
  // replaces everything anyway. The depth is tested unslanted first (it's
  // never smaller than the slope-corrected one), so a pixel in the sky pays
  // one crest read per ridge.
  int first = -1;
#ifndef OFF_SKIP
  if (uCount > 0 && p.y > uFront) first = uCount - 1;
  for (int i = MAX_RIDGES - 1; i >= 0 && first < 0; i--) {
    if (i >= uCount || uFade[i] < 1.0) continue;
    int row = uCrestRow[i];
    float bl = uBlur[i] * uScale[i];
    float deep = 6.0 * sqrt(bl * bl + aa * aa);
    float dy = p.y - crestAt(cx, row);
    if (dy < deep) continue;
    float slope = span > 0.0
      ? (crestAt(cr, row) - crestAt(cl, row)) / span
      : 0.0;
    if (dy / sqrt(1.0 + slope * slope) >= deep) first = i;
  }
#endif

  // Sky: the gradient spans the full frame height.
  vec3 col = first < 0 ? texture(uSky, vec2((p.y * uSkyScale + uSkyShift) / uSize.y, 0.5)).rgb : vec3(0.0);
  if (uLifeA > 0.0 && first < 0) col = skyLife(col, p);

  // A setting sun's wash (sunLook.js SET_WASH): a very wide, faint Gaussian
  // hugging the horizon that tints the sky here, then lights the ridge rims
  // under it and spills over the crests. None at rest.
  float washA = 0.0;
  vec3 washCol = vec3(0.0);
#ifndef OFF_WASH
  for (int i = 0; i < 2; i++) {
    if (i >= uBodies || uBodySet[i] <= 0.0 || uBodyFace[i] > 0.5) continue;
    vec2 u = (p - uBody[i].xy) / (uBody[i].z * vec2(${f(SET_WASH.wide)}, ${f(SET_WASH.tall)}));
    washA = ${f(SET_WASH.a)} * uBodySet[i] * uBodyA[i] * exp(-min(dot(u, u), 40.0));
    washCol = mix(uBodyCol[i], DISC_WHITE, ${f(SET_WASH.lift)});
  }
  col = over(col, washCol, washA);
#endif

  // Sun and moon (both mid-switch), then the disc at .85, antialiased over a
  // device pixel. The moon: glow radial at .4 easing to 0 at 3.4r (a
  // smoothstep: a straight fade left a Mach band at its rim; the layered
  // fallback traces it in stops, sunLook.js MOON_GLOW),
  // disc multiplied by its face (seas and craters). The sun (sunLook.js):
  // two-layer glow, disc darker and warmer toward the limb, flattened low.
#ifndef OFF_BODIES
  for (int i = 0; i < 2; i++) {
    if (i >= uBodies || first >= 0) break;
    float r = uBody[i].z;
    vec2 q = p - uBody[i].xy;
    float d = length(q);
    bool moon = uBodyFace[i] > 0.5;
    vec3 bc = mix(uBodyCol[i], texture(uSky, vec2(clamp((uBody[i].y * uSkyScale + uSkyShift) / uSize.y, 0.0, 1.0), 0.5)).rgb, uBodyWash[i]);
    // A setting body's glow spreads low along the horizon (uBodyHalo).
    float dg = uBodyHalo[i] == vec2(1.0) ? d : length(q / uBodyHalo[i]);
    float glow = moon ? 0.4 * (1.0 - smoothstep(0.0, r * 3.4, dg)) : sunGlow(dg / r);
    col = over(col, bc, uBodyGlow[i] * glow);
    // The disc: an ellipse, r wide and r·(1 - squash) tall.
    vec2 e = q / vec2(r, r * (1.0 - uBodySquash[i]));
    float rho = length(e);
    float st = moon ? 0.0 : uBodySet[i];
    vec3 limb = mix(vec3(1.0), LIMB_EDGE, pow(min(rho, 1.0), ${f(LIMB_POWER)}));
    vec3 dc;
    if (moon) dc = bc * texture(uMoon, e * 0.5 + 0.5).r;
    else if (st > 0.0) {
      // Setting: a hot core that stays near-white, the limb warming outward.
      vec3 core = mix(bc, DISC_WHITE, mix(${f(DISC_LIFT)}, ${f(SET_CORE)}, st));
      vec3 edge = mix(bc, DISC_WHITE, mix(${f(DISC_LIFT)}, ${f(SET_LIFT)}, st));
      dc = mix(core, edge, smoothstep(0.0, 1.0, min(rho, 1.0))) * limb;
    } else dc = mix(bc, DISC_WHITE, ${f(DISC_LIFT)}) * limb;
    float da = moon ? 0.85 : ${f(DISC_ALPHA)};
    col = over(col, dc, da * uBodyA[i] * clamp((1.0 - rho) * r * uDpr + 0.5, 0.0, 1.0));
    // Setting: a tight bloom just past the disc's edge, so it isn't crisp.
    if (st > 0.0 && rho > 1.0) {
      float x = (rho - 1.0) / ${f(SET_BLOOM.out)};
      col = over(col, mix(bc, DISC_WHITE, 0.5), ${f(SET_BLOOM.a)} * st * uBodyA[i] * exp(-min(x * x, 40.0)));
    }
  }
#endif

#ifndef OFF_RIDGES
  for (int i = 0; i < MAX_RIDGES; i++) {
    if (i >= uCount) break;
    if (i < first) continue;
    float fade = uFade[i];

    // Signed distance to the crest (positive below it), corrected for slope
    // so the blurred and antialiased edges keep an even width on steep flanks.
    int row = uCrestRow[i];
    float crest = crestAt(cx, row);
#ifdef OFF_SLOPE
    float slope = 0.0;
#else
    float slope = span > 0.0
      ? (crestAt(cr, row) - crestAt(cl, row)) / span
      : 0.0;
#endif
    float d = (p.y - crest) / sqrt(1.0 + slope * slope);
    float bl = uBlur[i] * uScale[i];
    float sigma = sqrt(bl * bl + aa * aa);

    // (0.2.4) Phi clamps at ±6, so past 6 sigma from the crest the edges are
    // exact constants: above it the fill adds nothing (Phi(-6) is 0) and the
    // rim's two edges cancel, so neither is computed there.
    float far = 6.0 * sigma;
    // Fill: vertical gradient in user space from top to base, clamped past both.
    if (d > -far) {
      float t = clamp((p.y - uTop[i]) / max(1e-3, uBase[i] - uTop[i]), 0.0, 1.0);
      vec3 fill = t < 0.45
        ? mix(uFillA[i], uFillB[i], t / 0.45)
        : mix(uFillB[i], uFillC[i], (t - 0.45) / 0.55);
      // The body's light: along the crest, strongest toward the body, the
      // body below falling into cool, soft shadow. Warm as the body sets.
      // The light is screened on (it brightens toward the warm colour, never
      // greys the violet); the shadow multiplies the body by the sky's cool hue.
#ifndef OFF_LIGHT
      if (uLitA[i] > 0.0) {
        float edge = exp(-max(0.0, p.y - crest) / max(1.0, uLitAt.z * uScale[i]));
        float sx = (p.x - uLitAt.x) / uLitAt.y;
        float toward = uLitBase + (1.0 - uLitBase) * exp(-min(sx * sx, 40.0));
        fill *= mix(vec3(1.0), uShadeCol, uShadeA[i] * (1.0 - edge));
        fill = 1.0 - (1.0 - fill) * (1.0 - uLitCol * (uLitA[i] * edge * toward));
      }
#endif
      col = over(col, fill, Phi(d / sigma) * fade);
    }

#ifndef OFF_RIM
    // Crest rim: a stroke centred on the curve, blurred with the ridge.
    float hw = uRimW * 0.5 * uScale[i];
    if (abs(d) < hw + far) {
      float rim = Phi((d + hw) / sigma) - Phi((d - hw) / sigma);
      // A setting sun's wash lights the rims under it (none at rest).
      vec3 rimCol = washA > 0.0 ? mix(uRimCol[i], washCol, min(1.0, washA * ${f(SET_WASH.rim / SET_WASH.a)})) : uRimCol[i];
      float rimA = washA > 0.0 ? min(1.0, uRimA[i] + washA * ${f(SET_WASH.rimA / SET_WASH.a)}) : uRimA[i];
      col = over(col, rimCol, rim * rimA * fade);
    }
#endif

    // The meadow, in front of every ridge and under the front one's veil.
#ifndef OFF_MEADOW
    if (i == uCount - 1 && p.y > uFront) col = meadow(p);
#endif

    // Veil: radial gradient in the ellipse's box — .9 at the centre, .42 at
    // 55%, 0 at the rim — times the veil's (breathing) opacity.
#ifndef OFF_VEIL
    vec4 v = uVeil[i];
    float rho = length((p - v.xy) / v.zw);
    // (Nothing outside its ellipse.)
    if (rho < 1.0) {
      float va = rho < 0.55 ? mix(0.9, 0.42, rho / 0.55) : mix(0.42, 0.0, (rho - 0.55) / 0.45);
      col = over(col, uMist, va * uVeilA[i] * fade);
    }
#endif
  }
#endif

  // A setting sun's light spilling over the crests along the horizon.
  if (washA > 0.0) col = over(col, washCol, washA * ${f(SET_WASH.spill)});

  // Air: the mist colour rising from 0 to uAirA over the 14% of the height
  // above the front foot (the frame's foot at rest), then thinning out over
  // the meadow (the layered air band traces the same).
#ifndef OFF_AIR
  float airTop = uSize.y * 0.86 + (uFront < uSize.y ? uFront - uSize.y : 0.0);
  float air = p.y > uFront
    ? uAirA * (1.0 - (p.y - uFront) / max(1.0, uSize.y - uFront))
    : p.y > airTop ? (p.y - airTop) / (uSize.y * 0.14) * uAirA : 0.0;
  col = over(col, uMist, air);
#endif

  // (0.3) Birds, in front of the ridges.
  if (uLifeA > 0.0 && uLifeMix.x > 0.0 && p.y < uFront) col = birds(col, p, aa);
  // (0.3.1) The ground under the desk camera: the meadow's own ground near
  // (in clumps), hazing out into the painted 0.2 meadow by GRASS_HAZE's far
  // end, so from where the descent starts it's that meadow exactly. The
  // grass stands on it (grassShader.js). Then the desk's grey box, which
  // writes its depth so the grass behind it stays hidden.
  float depth = 1.0;
  if (uPitched == 1) {
    vec3 dir = vec3(ray.x, -ray.y, ray.z);
    if (dir.y < 0.0 && p.y > uFront) {
      float t = uEye.x / -dir.y;
      float dist = t * length(dir) * ${f(WORLD_M)};
      // Near, the ground between the blades; farther, where the blades are
      // too small to see, the colour the grass reads as from afar.
      vec3 near = mix(uGrassGround, uGrassFar, smoothstep(4.0, 24.0, dist)) * mix(vec3(1.0), uGrassSky, 0.25);
      col = mix(near, col, smoothstep(uHazeAt.x, uHazeAt.y, dist));
    }
    vec3 inv = 1.0 / (dir + vec3(1e-9));
    vec3 t0 = uBoxMin * inv;
    vec3 t1 = uBoxMax * inv;
    vec3 tn3 = min(t0, t1);
    vec3 tf3 = max(t0, t1);
    float tn = max(max(tn3.x, tn3.y), tn3.z);
    float tf = min(min(tf3.x, tf3.y), tf3.z);
    if (tn < tf && tn > 0.0) {
      float shade = tn == tn3.y ? 0.66 : tn == tn3.z ? 0.5 : 0.4;
      col = vec3(shade);
      vec3 hit = tn * dir;
      float zp = (-hit.y * uPitch.y + hit.z * uPitch.x) * ${f(WORLD_M)};
      depth = 0.5 * (uDepthAB.x + uDepthAB.y / zp) + 0.5;
    }
  }

  // Grain: CSS mix-blend-mode overlay at uGrainA, texels one CSS px square.
#ifndef OFF_GRAIN
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(ps), 256.0));
    float n = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * n, 1.0 - 2.0 * (1.0 - col) * (1.0 - n), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
#endif

  outColor = vec4(col, 1.0);
  gl_FragDepth = depth;
}
`;
