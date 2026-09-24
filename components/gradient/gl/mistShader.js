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
 */

import { DISC_ALPHA, DISC_LIFT, DISC_WHITE, LIMB_EDGE, LIMB_POWER, SUN_GLOW } from '../sunLook';
import { hexToRgb } from './mistGeometry';

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
uniform vec4 uVeil[MAX_RIDGES];    // cx (drift applied), cy, rx, ry
uniform float uVeilA[MAX_RIDGES];
uniform float uRimW;
uniform vec3 uMist;
uniform float uAirA;
uniform sampler2D uGrain;    // 256² noise, tiled at 256 CSS px, nearest
uniform float uGrainA;
uniform float uSkyShift;     // the camera's tilt: the sky moves up this far, CSS px
uniform float uScale[MAX_RIDGES]; // each ridge's camera scale (1 at rest)
uniform float uFront;        // the front ridge's foot: the meadow's top (≥ height: none)
uniform float uHorizon;      // the ground's vanishing line
uniform vec4 uGroundY;       // the meadow gradient's stops, y in CSS px (camera.js GROUND_AT)
uniform vec3 uGroundCol[4];
uniform vec3 uWind;          // amplitude, bands per unit depth ratio, phase (cycles)

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

void main() {
  // Pixel centre in CSS px, y down like the SVG.
  float xPx = gl_FragCoord.x;
  vec2 p = vec2(xPx, uRes.y - gl_FragCoord.y) * uSize / uRes;

  // Sky: the gradient spans the full frame height.
  vec3 col = texture(uSky, vec2((p.y + uSkyShift) / uSize.y, 0.5)).rgb;

  // Sun and moon (both mid-switch), then the disc at .85, antialiased over a
  // device pixel. The moon: glow radial at .4 fading linearly to 0 at 3.4r,
  // disc multiplied by its face (seas and craters). The sun (sunLook.js):
  // two-layer glow, disc darker and warmer toward the limb, flattened low.
  for (int i = 0; i < 2; i++) {
    if (i >= uBodies) break;
    float r = uBody[i].z;
    vec2 q = p - uBody[i].xy;
    float d = length(q);
    bool moon = uBodyFace[i] > 0.5;
    vec3 bc = mix(uBodyCol[i], texture(uSky, vec2(clamp((uBody[i].y + uSkyShift) / uSize.y, 0.0, 1.0), 0.5)).rgb, uBodyWash[i]);
    float glow = moon ? 0.4 * max(0.0, 1.0 - d / (r * 3.4)) : sunGlow(d / r);
    col = over(col, bc, uBodyGlow[i] * glow);
    // The disc: an ellipse, r wide and r·(1 - squash) tall.
    vec2 e = q / vec2(r, r * (1.0 - uBodySquash[i]));
    float rho = length(e);
    vec3 dc = moon
      ? bc * texture(uMoon, e * 0.5 + 0.5).r
      : mix(bc, DISC_WHITE, ${f(DISC_LIFT)}) * mix(vec3(1.0), LIMB_EDGE, pow(min(rho, 1.0), ${f(LIMB_POWER)}));
    float da = moon ? 0.85 : ${f(DISC_ALPHA)};
    col = over(col, dc, da * uBodyA[i] * clamp((1.0 - rho) * r * uDpr + 0.5, 0.0, 1.0));
  }

  // Antialiasing width, as a Gaussian of ~half a device pixel.
  float aa = 0.5 / uDpr;
  int cols = textureSize(uCrest, 0).x;
  int cx = clamp(int(xPx), 0, cols - 1);
  int cl = max(cx - 1, 0);
  int cr = min(cx + 1, cols - 1);
  float span = float(cr - cl) * uSize.x / uRes.x;

  for (int i = 0; i < MAX_RIDGES; i++) {
    if (i >= uCount) break;
    float fade = uFade[i];

    // Signed distance to the crest (positive below it), corrected for slope
    // so the blurred and antialiased edges keep an even width on steep flanks.
    int row = uCrestRow[i];
    float crest = texelFetch(uCrest, ivec2(cx, row), 0).r;
    float slope = span > 0.0
      ? (texelFetch(uCrest, ivec2(cr, row), 0).r - texelFetch(uCrest, ivec2(cl, row), 0).r) / span
      : 0.0;
    float d = (p.y - crest) / sqrt(1.0 + slope * slope);
    float bl = uBlur[i] * uScale[i];
    float sigma = sqrt(bl * bl + aa * aa);

    // Fill: vertical gradient in user space from top to base, clamped past both.
    float t = clamp((p.y - uTop[i]) / max(1e-3, uBase[i] - uTop[i]), 0.0, 1.0);
    vec3 fill = t < 0.45
      ? mix(uFillA[i], uFillB[i], t / 0.45)
      : mix(uFillB[i], uFillC[i], (t - 0.45) / 0.55);
    col = over(col, fill, Phi(d / sigma) * fade);

    // Crest rim: a stroke centred on the curve, blurred with the ridge.
    float hw = uRimW * 0.5 * uScale[i];
    float rim = Phi((d + hw) / sigma) - Phi((d - hw) / sigma);
    col = over(col, uRimCol[i], rim * uRimA[i] * fade);

    // The meadow, in front of every ridge and under the front one's veil.
    if (i == uCount - 1 && p.y > uFront) col = meadow(p);

    // Veil: radial gradient in the ellipse's box — .9 at the centre, .42 at
    // 55%, 0 at the rim — times the veil's (breathing) opacity.
    vec4 v = uVeil[i];
    float rho = length((p - v.xy) / v.zw);
    float va = rho < 0.55 ? mix(0.9, 0.42, rho / 0.55) : rho < 1.0 ? mix(0.42, 0.0, (rho - 0.55) / 0.45) : 0.0;
    col = over(col, uMist, va * uVeilA[i] * fade);
  }

  // Air: the mist colour rising from 0 to uAirA over the 14% of the height
  // above the front foot (the frame's foot at rest), then thinning out over
  // the meadow (camera.js airAt).
  float airTop = uSize.y * 0.86 + (uFront < uSize.y ? uFront - uSize.y : 0.0);
  float air = p.y > uFront
    ? uAirA * (1.0 - (p.y - uFront) / max(1.0, uSize.y - uFront))
    : p.y > airTop ? (p.y - airTop) / (uSize.y * 0.14) * uAirA : 0.0;
  col = over(col, uMist, air);

  // Grain: CSS mix-blend-mode overlay at uGrainA, texels one CSS px square.
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(p), 256.0));
    float n = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * n, 1.0 - 2.0 * (1.0 - col) * (1.0 - n), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }

  outColor = vec4(col, 1.0);
}
`;
