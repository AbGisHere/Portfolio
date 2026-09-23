/**
 * The GPU crest pass: renders each ridge's crest height per device-pixel
 * column into an R32F texture (`cols × MAX_RIDGES`, one row per ridge), which
 * the scene shader (mistShader.js) samples exactly as it samples the CPU
 * path's upload.
 *
 * Each fragment is one (column, ridge). It evaluates what mistGeometry.js's
 * `layout` + `sampleCrest` compute on the CPU: the ridge profile `Vl` at the
 * four control points around the column, height-locked to the frame (engine
 * patch 7), then the Catmull-Rom → Bézier segment through them (`Zs`). Lattice
 * hashes come from a precomputed table (hashTable.js), because the engine's
 * sin-based hash isn't portable in float32.
 */

import { MAX_RIDGES } from './mistShader';

export const CREST_VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const CREST_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

#define MAX_RIDGES ${MAX_RIDGES}

uniform highp sampler2D uHash; // R32F: lattice hashes, row = ridge * 4 + layer
uniform int uOrigin;           // integer cell at column 0 of uHash
uniform float uW;              // frame width, CSS px
uniform float uU;              // reference width, height × aspect (patch 7)
uniform float uX0;             // first control point's x (−3% of height)
uniform float uDx;             // control point spacing
uniform int uLast;             // index of the last control point (Q)
uniform float uDpr;            // device columns per CSS px
uniform float uN;              // noise offset, (seed + drift) × 0.73
uniform float uSharp;          // sharp / 100
uniform float uBase[MAX_RIDGES];
uniform float uL[MAX_RIDGES];   // crest lift above the base

out vec4 outCrest;

float hashAt(int cell, int row) {
  return texelFetch(uHash, ivec2(cell - uOrigin, row), 0).r;
}

// _o — 1D value noise, smoothstep-interpolated
float noise1(float e, int row) {
  float f = floor(e);
  int n = int(f);
  float a = e - f;
  float o = a * a * (3.0 - 2.0 * a);
  float s0 = hashAt(n, row);
  return s0 + (hashAt(n + 1, row) - s0) * o;
}

float octave(float e, float l, int row) {
  float p = noise1(e * l + uN, row) * 2.0 - 1.0;
  float m = 1.0 - abs(p);
  float f = 1.0 - p * p;
  return f + (m - f) * uSharp;
}

// Vl — ridge height profile at x (0..1 across the reference frame)
float profile(float e, int b) {
  float o = 1.7 + float(b) * 0.33;
  int row = b * 4;
  float c = 0.52 * octave(e, o, row) + 0.3 * octave(e, o * 2.15, row + 1) + 0.18 * octave(e, o * 4.4, row + 2);
  float d = 0.55 + 0.45 * pow(noise1(e * 1.13 + uN * 0.51, row + 3), 1.4);
  return pow(max(0.0, c), 1.0 + uSharp * 0.9) * d;
}

// The crest's y at control point i (CSS px)
float pointY(int i, int b) {
  float x = uX0 + float(i) * uDx;
  return uBase[b] - uL[b] * profile((x - uW * 0.5) / uU + 0.5, b);
}

void main() {
  int col = int(gl_FragCoord.x);
  int b = int(gl_FragCoord.y);
  float x = (float(col) + 0.5) / uDpr;
  int n = int(floor((x - uX0) / uDx));
  n = clamp(n, 0, uLast - 1);
  float u = clamp((x - (uX0 + float(n) * uDx)) / uDx, 0.0, 1.0);
  float a = pointY(max(n - 1, 0), b);
  float o = pointY(n, b);
  float s = pointY(n + 1, b);
  float r = pointY(min(n + 2, uLast), b);
  float c1 = o + (s - a) / 6.0;
  float c2 = s - (r - o) / 6.0;
  float v = 1.0 - u;
  outCrest = vec4(v * v * v * o + 3.0 * v * v * u * c1 + 3.0 * v * u * u * c2 + u * u * u * s, 0.0, 0.0, 1.0);
}
`;
