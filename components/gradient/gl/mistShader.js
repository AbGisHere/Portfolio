/**
 * One fullscreen fragment shader that composites the MIST scene in the SVG
 * engine's paint order: sky → sun glow → sun → for each ridge (fill, crest
 * rim, veil) → air → grain. Geometry and colours arrive from mistGeometry.js
 * as uniforms and two small textures, so a frame is one draw call.
 *
 * All compositing is plain source-over in gamma-encoded sRGB, like SVG and
 * CSS, and lengths are in CSS px (the SVG's user units); `p` is the pixel
 * centre in those units, y down.
 */

export const MAX_RIDGES = 9; // "Ranges" tops out at 9

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
uniform vec3 uSun;           // x, y, r
uniform vec3 uSunCol;
uniform sampler2D uCrest;    // R32F: crest y per device column, one row per ridge
uniform int uCount;
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

out vec4 outColor;

// Standard normal CDF (tanh approximation, |error| < 3e-4). The argument is
// clamped first: pixels far from an edge send x into the thousands, and some
// GPUs (and SwiftShader) return NaN from tanh() once exp() overflows.
float Phi(float x) {
  x = clamp(x, -6.0, 6.0);
  return 0.5 * (1.0 + tanh(0.7978845608 * (x + 0.044715 * x * x * x)));
}

vec3 over(vec3 dst, vec3 src, float a) { return mix(dst, src, clamp(a, 0.0, 1.0)); }

void main() {
  // Pixel centre in CSS px, y down like the SVG.
  float xPx = gl_FragCoord.x;
  vec2 p = vec2(xPx, uRes.y - gl_FragCoord.y) * uSize / uRes;

  // Sky: the gradient spans the full frame height.
  vec3 col = texture(uSky, vec2(p.y / uSize.y, 0.5)).rgb;

  // Sun glow: radial, colour at .4 fading linearly to 0 at 3.4r.
  float dSun = length(p - uSun.xy);
  col = over(col, uSunCol, 0.4 * max(0.0, 1.0 - dSun / (uSun.z * 3.4)));
  // Sun disc at .85, antialiased over a device pixel.
  col = over(col, uSunCol, 0.85 * clamp((uSun.z - dSun) * uDpr + 0.5, 0.0, 1.0));

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
    float crest = texelFetch(uCrest, ivec2(cx, i), 0).r;
    float slope = span > 0.0
      ? (texelFetch(uCrest, ivec2(cr, i), 0).r - texelFetch(uCrest, ivec2(cl, i), 0).r) / span
      : 0.0;
    float d = (p.y - crest) / sqrt(1.0 + slope * slope);
    float sigma = sqrt(uBlur[i] * uBlur[i] + aa * aa);

    // Fill: vertical gradient in user space from top to base, clamped past both.
    float t = clamp((p.y - uTop[i]) / max(1e-3, uBase[i] - uTop[i]), 0.0, 1.0);
    vec3 fill = t < 0.45
      ? mix(uFillA[i], uFillB[i], t / 0.45)
      : mix(uFillB[i], uFillC[i], (t - 0.45) / 0.55);
    col = over(col, fill, Phi(d / sigma) * fade);

    // Crest rim: a stroke centred on the curve, blurred with the ridge.
    float hw = uRimW * 0.5;
    float rim = Phi((d + hw) / sigma) - Phi((d - hw) / sigma);
    col = over(col, uRimCol[i], rim * uRimA[i] * fade);

    // Veil: radial gradient in the ellipse's box — .9 at the centre, .42 at
    // 55%, 0 at the rim — times the veil's (breathing) opacity.
    vec4 v = uVeil[i];
    float rho = length((p - v.xy) / v.zw);
    float va = rho < 0.55 ? mix(0.9, 0.42, rho / 0.55) : rho < 1.0 ? mix(0.42, 0.0, (rho - 0.55) / 0.45) : 0.0;
    col = over(col, uMist, va * uVeilA[i] * fade);
  }

  // Air: the mist colour rising from 0 to uAirA over the bottom 14%.
  float airTop = uSize.y * 0.86;
  col = over(col, uMist, p.y > airTop ? (p.y - airTop) / (uSize.y * 0.14) * uAirA : 0.0);

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
