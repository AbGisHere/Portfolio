/**
 * (0.4.4) The birds (birdShape.js, birdFlight.js), drawn instanced, a
 * species a draw: each wing's arm turned about the shoulder and its hand
 * about the wrist as it beats (the hand lagging the arm), swept back as it
 * glides; the body banked, climbed and headed along its path. Lit by the
 * sky: the sun on them, the sky's light from above, the light through the
 * wings' feathers when it's behind them; hazed with distance like the
 * trees.
 */

import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { BIRD_PART, SPECIES } from './birdShape';


export const BIRD_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aJoint;
layout(location = 3) in vec2 aPart;   // material, place along the wing
layout(location = 4) in vec4 iA;      // x, y, z, yaw
layout(location = 5) in vec4 iB;      // climb, bank, beat, sweep
layout(location = 6) in vec4 iC;      // scale, seed

${CAMERA_GLSL}
uniform vec3 uShoulder;
uniform float uWrist;
uniform highp int uKind;
out vec3 vWorld;
out vec3 vNorm;
out float vAlong;
flat out int vPart;
flat out float vSeed;

${PROJECT_GLSL}

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

void main() {
  vPart = int(aPart.x + 0.5);
  vAlong = aPart.y;
  vSeed = iC.y;
  if (iC.x <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  if (uKind == 4) {
    // (0.4.26) A firefly's glow (fireflies.js): a disc facing the camera,
    // 3 cm across or five CSS pixels, whichever is bigger, its halo out
    // to three times that.
    vec4 c = project(iA.xyz);
    float r = max(uPitch.w * uPitch.z * length(viewOf(vec3(0.015, 0.0, 0.0))) / max(c.w, 1e-4), 2.5);
    c.xy += aPos.xy * r * 3.0 * 2.0 / uScreen.zw * c.w;
    vWorld = iA.xyz;
    vNorm = vec3(aPos.xy * 3.0, iB.z);
    gl_Position = c;
    return;
  }
  vec3 p = aPos;
  vec3 n = aNorm;
  float side = sign(aJoint);
  float j = abs(aJoint);
  float beat = iB.z;
  float sweep = iB.w;
  if (j > 0.5) {
    vec3 S = vec3(side * uShoulder.x, uShoulder.y, uShoulder.z);
    vec3 W = vec3(side * uWrist, uShoulder.y, uShoulder.z);
    if (j > 1.5) {
      // The hand: lags the arm through the beat, folds further back.
      mat3 h = rotY(side * sweep * 0.7) * rotZ(side * beat * 0.55);
      p = W + h * (p - W);
      n = h * n;
    }
    // The arm about the shoulder: raised and lowered, swept back.
    mat3 a = rotY(side * sweep * 0.45) * rotZ(side * beat);
    p = S + a * (p - S);
    n = a * n;
  }
  // The bird: banked, climbed, headed.
  mat3 body = rotY(iA.w) * rotX(-iB.x) * rotZ(-iB.y);
  vec3 w = iA.xyz + body * (p * iC.x);
  vWorld = w;
  vNorm = body * n;
  gl_Position = project(w);
}
`;

const BP = BIRD_PART;
export const BIRD_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform highp int uKind;      // 0 swallow, 1 kite, 2 goose, 3 a butterfly (0.4.24), 4 a firefly (0.4.26)
uniform vec3 uSun;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uHaze;
uniform float uNight;
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vWorld;
in vec3 vNorm;
in float vAlong;
flat in int vPart;
flat in float vSeed;
out vec4 outColor;

void main() {
  if (uKind == 4) {
    // (0.4.26) The firefly's light: a bright core, a soft halo, added on.
    float d = length(vNorm.xy);
    float glow = (exp(-d * d * 1.4) * 2.4 + exp(-d * d * 0.3) * 0.4) * vNorm.z;
    if (glow < 0.004) discard;
    outColor = vec4(vec3(0.78, 1.0, 0.32) * glow * smoothstep(9.0, 2.0, d * d), 1.0);
    return;
  }
  vec3 N = normalize(vNorm);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  bool wing = vPart == ${BP.wingTop} || vPart == ${BP.wingUnder};
  vec3 alb;
  float gloss = 0.0;
  if (uKind == 0) {
    // The swallow: glossy steel-blue above, a rufous throat and a cream
    // belly; the wings' undersides smoky.
    alb = vPart == ${BP.back} || vPart == ${BP.wingTop} ? vec3(0.05, 0.07, 0.16) : vPart == ${BP.belly} ? vec3(0.86, 0.75, 0.62) : vPart == ${BP.wingUnder} ? vec3(0.32, 0.3, 0.3) : vec3(0.02);
    gloss = vPart == ${BP.back} || vPart == ${BP.wingTop} ? 0.6 : 0.0;
  } else if (uKind == 1) {
    // The red kite: rufous, a pale grey head, the wings' tips black and a
    // pale patch under each hand.
    alb = vPart == ${BP.back} ? vec3(0.56, 0.26, 0.12) : vPart == ${BP.belly} ? vec3(0.62, 0.33, 0.18) : vec3(0.48, 0.27, 0.15);
    if (vPart == ${BP.wingUnder} && vAlong > 0.55 && vAlong < 0.78) alb = vec3(0.86, 0.84, 0.8);
    if (wing && vAlong > 0.82) alb = vec3(0.06, 0.05, 0.05);
    if (vPart == ${BP.bill}) alb = vec3(0.85, 0.7, 0.2);
  } else if (uKind == 3) {
    // (0.4.24) A butterfly, its kind by its seed: a painted lady (orange,
    // the forewing's tip black and spotted white), a cabbage white (a
    // dark tip, a spot), a common blue (a pale fringe), a brimstone
    // (sulphur, an orange dot); the undersides paler, the body dark.
    int sp = int(fract(vSeed * 0.618) * 4.0);
    bool hindW = vPart == ${BP.wingUnder};
    float r = vAlong;
    if (!wing) alb = vec3(0.06, 0.05, 0.05);
    else if (sp == 0) {
      alb = mix(vec3(0.85, 0.42, 0.12), vec3(0.55, 0.22, 0.08), smoothstep(0.1, 0.0, r));
      if (!hindW && r > 0.62) alb = vec3(0.05);
      if (!hindW && r > 0.7 && fract(r * 9.0) > 0.6) alb = vec3(0.92);
      if (hindW && r > 0.55 && fract(r * 12.0) < 0.3) alb = vec3(0.08);
    } else if (sp == 1) {
      alb = vec3(0.94, 0.93, 0.88);
      if (!hindW && r > 0.75) alb = vec3(0.16, 0.16, 0.17);
      if (!hindW && abs(r - 0.5) < 0.06) alb = vec3(0.14);
    } else if (sp == 2) {
      alb = mix(vec3(0.32, 0.45, 0.85), vec3(0.15, 0.2, 0.45), smoothstep(0.75, 0.92, r));
      if (r > 0.93) alb = vec3(0.92);
    } else {
      alb = vec3(0.93, 0.86, 0.3);
      if (abs(r - 0.45) < 0.05) alb = vec3(0.9, 0.5, 0.15);
    }
    if (!gl_FrontFacing && wing) alb = mix(alb, vec3(0.85, 0.8, 0.7), 0.35);
  } else {
    // The greylag: grey-brown, paler beneath, its wings' tips dark, an
    // orange bill.
    alb = vPart == ${BP.belly} || vPart == ${BP.wingUnder} ? vec3(0.62, 0.6, 0.56) : vec3(0.42, 0.39, 0.35);
    if (wing && vAlong > 0.8) alb = vec3(0.18, 0.17, 0.16);
    if (vPart == ${BP.bill}) alb = vec3(0.92, 0.52, 0.22);
  }
  if (vPart == ${BP.eye}) alb = vec3(0.01);
  // Each a little its own.
  alb *= 0.9 + 0.2 * fract(vSeed * 13.7);
  float lam = max(dot(N, L) * 0.8 + 0.2, 0.0);
  vec3 sky = mix(uEnvLow, uEnvTop, 0.5 + 0.5 * N.y);
  vec3 col = alb * (uSun * lam * 1.1 + sky * 0.6) * mix(1.0, 0.3, uNight);
  // The light through the feathers, the sun behind the wing.
  if (wing) col += alb * uSun * pow(max(dot(-V, L), 0.0), 3.0) * 0.9 * (1.0 - vAlong * 0.3);
  // A swallow's back catches the sky like a blue-black gloss.
  vec3 H = normalize(L + V);
  col += gloss * uSun * pow(max(dot(N, H), 0.0), 40.0) * 0.5 + gloss * sky * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.3;
  // Hazed with distance, toward the air at the horizon.
  float dist = length(uCam - vWorld);
  col = mix(col, uHaze, 0.85 * smoothstep(40.0, 420.0, dist));
  if (uGrainA > 0.0) {
    ivec2 gi = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, gi, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;

/** A species' joints for the vertex stage: its shoulder (x, y, z) and its
 * wrist's x. */
export const jointsOf = name => ({ shoulder: SPECIES[name].shoulder, wrist: SPECIES[name].wrist });

