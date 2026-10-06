/**
 * (0.3.11) The desk lamp (lampShape.js), built in code as the laptop is:
 * turned (lathed) and tubed parts, placed once (nothing on it moves) and
 * drawn under the same camera and against the same depth.
 *
 * - **Enamel:** the base, the arms' twin rods and the shade's outside, a
 *   warm ivory with a glossy coat, lit by the scene.
 * - **Steel:** the springs, the knuckles and the turret.
 * - **The shade's inside** is white enamel lit by the bulb; **the bulb** is
 *   opal glass, glowing when the lamp's on (`uLamp`).
 */
import { LAMP, LAMP_POSE, lampAt } from './lampShape';
import { METAL_GLSL } from './laptopShader';
import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';

const f = x => x.toFixed(5);
const unit = v => {
  const l = Math.hypot(...v);
  return v.map(x => x / l);
};
const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Floats per vertex: position (3), normal (3), the part (0 enamel, 1 the
 * shade's inside, 2 steel, 3 the bulb, 4 a spring, 5 the shade's outside),
 * and how far along its own axis (metres: the springs' coils, the shade's lip). */
export const LAMP_STRIDE = 8;

/** Two unit vectors square to `a` and to each other. */
function basis(a) {
  const t = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = unit(cross(a, t));
  return [e1, cross(a, e1)];
}

/**
 * A profile turned about an axis from `o` along `a`: `prof` is [r, y] pairs
 * (y along the axis), its outside to the left as it runs (so outward when it
 * climbs, up when it runs in). Smooth normals, `seg` round.
 */
function lathe(out, o, a, prof, part, seg = 28) {
  const [e1, e2] = basis(a);
  const n = prof.map((p, i) => {
    const q = prof[Math.max(0, i - 1)];
    const r = prof[Math.min(prof.length - 1, i + 1)];
    const t = [r[0] - q[0], r[1] - q[1]];
    const l = Math.hypot(...t) || 1;
    return [t[1] / l, -t[0] / l];
  });
  const vert = (i, k) => {
    const phi = (k / seg) * Math.PI * 2;
    const e = add(e1.map(x => x * Math.cos(phi)), e2, Math.sin(phi));
    const [r, y] = prof[i];
    const pos = add(add(o, e, r), a, y);
    const nor = add(e.map(x => x * n[i][0]), a, n[i][1]);
    return [...pos, ...nor, part, y];
  };
  for (let i = 0; i + 1 < prof.length; i++) {
    for (let k = 0; k < seg; k++) {
      const v00 = vert(i, k);
      const v01 = vert(i, k + 1);
      const v10 = vert(i + 1, k);
      const v11 = vert(i + 1, k + 1);
      out.push(...v00, ...v10, ...v11, ...v00, ...v11, ...v01);
    }
  }
}

/** A rod from p to q, capped round. */
function tube(out, p, q, r, part, seg = 12) {
  const d = add(q, p, -1);
  const len = Math.hypot(...d);
  const prof = [[0, -r]];
  for (let i = 1; i < 4; i++) prof.push([r * Math.sin((i / 4) * (Math.PI / 2)), -r * Math.cos((i / 4) * (Math.PI / 2))]);
  prof.push([r, 0], [r, len]);
  for (let i = 1; i < 4; i++) prof.push([r * Math.cos((i / 4) * (Math.PI / 2)), len + r * Math.sin((i / 4) * (Math.PI / 2))]);
  prof.push([0, len + r]);
  lathe(out, p, unit(d), prof, part, seg);
}

/** The lamp in a pose (lampShape.js), placed: `{ data, count }`. Rebuilt
 * when it's dragged. */
export function lampMesh(pose = LAMP_POSE) {
  const out = [];
  const { at, base, rod, twin, shade } = LAMP;
  const at_ = lampAt(pose);
  const { pivot, elbow, head, neck: NECK, bulb: BULB } = at_;
  const up = [0, 1, 0];
  // The base: a weighted round foot, its edge rounded, a step up to a
  // collar, and the turret the arms pivot on.
  const R = base.r;
  const bh = base.h;
  const foot = [[0, 0], [R - 0.004, 0], [R - 0.001, 0.001], [R, 0.004], [R, bh - 0.005], [R - 0.0015, bh - 0.0012], [R - 0.005, bh]];
  foot.push([0.036, bh + 0.002], [0.032, bh + 0.007], [0.027, bh + 0.008], [0, bh + 0.008]);
  lathe(out, at, up, foot, 0, 40);
  tube(out, add(at, up, bh + 0.006), add(pivot, up, -0.004), 0.011, 2);
  // The arms: each a pair of rods either side of the plane, and the
  // knuckles across them at the joints.
  const side = at_.side;
  for (const s of [-1, 1]) {
    tube(out, add(pivot, side, s * twin), add(elbow, side, s * twin), rod, 0);
    tube(out, add(elbow, side, s * twin), add(head, side, s * twin), rod, 0);
  }
  for (const j of [pivot, elbow, head]) tube(out, add(j, side, -twin - 0.006), add(j, side, twin + 0.006), 0.0068, 2, 14);
  // The upper arm's tail past the elbow, as the real one's linkage.
  const back = unit(add(elbow, head, -1));
  for (const s of [-1, 1]) tube(out, add(elbow, side, s * twin * 0.55), add(add(elbow, back, 0.05), side, s * twin * 0.55), rod * 0.85, 0);
  // The springs: either side, from the turret up along the lower arm.
  const along = unit(add(elbow, pivot, -1));
  const sOut = 0.016;
  for (const s of [-1, 1]) {
    const a = add(add(at, up, bh + 0.018), side, s * sOut);
    const b = add(add(pivot, along, 0.095), side, s * (twin + 0.003));
    tube(out, a, b, 0.0034, 4, 10);
  }
  // The yoke from the head's joint to the shade's neck.
  tube(out, head, NECK, 0.006, 2, 10);
  // The shade: a domed back, a cone out to a rolled lip, its inside.
  const a = at_.axis;
  const nk = shade.neck;
  const L = shade.len;
  const mo = shade.mouth;
  const outer = [[0, -0.016]];
  for (let i = 1; i <= 5; i++) {
    const t = (i / 5) * (Math.PI / 2);
    outer.push([nk * Math.sin(t), -0.016 * Math.cos(t)]);
  }
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    // A bell, not a straight cone: flaring toward the mouth.
    outer.push([nk + (mo - nk) * (0.55 * t + 0.45 * t * t), L * t]);
  }
  outer.push([mo + 0.0025, L + 0.002], [mo + 0.0015, L + 0.004]);
  lathe(out, NECK, a, outer, 5, 36);
  const inner = [[mo + 0.0015, L + 0.004], [mo - 0.0015, L + 0.002]];
  for (let i = 8; i >= 0; i--) {
    const t = i / 8;
    inner.push([Math.max(0.001, nk + (mo - nk) * (0.55 * t + 0.45 * t * t) - 0.0015), L * t]);
  }
  inner.push([0, 0]);
  lathe(out, NECK, a, inner, 1, 36);
  // The bulb: an opal globe in the shade's throat.
  const bulb = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI;
    bulb.push([0.026 * Math.sin(t), -0.026 * Math.cos(t)]);
  }
  lathe(out, BULB, a, bulb, 3, 20);
  const data = new Float32Array(out);
  return { data, count: data.length / LAMP_STRIDE };
}

export const LAMP_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;
layout(location = 3) in float aAlong;

${CAMERA_GLSL}
out vec3 vWorld;
out vec3 vNorm;
out float vAlong;
flat out int vPart;

${PROJECT_GLSL}
void main() {
  vWorld = aPos;
  vNorm = aNorm;
  vAlong = aAlong;
  vPart = int(aPart + 0.5);
  gl_Position = project(vWorld);
}
`;

export const LAMP_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uPaint;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uWood;
uniform vec3 uLamp;     // the bulb's light: its colour × power (0: off)
uniform vec3 uLampBulb; // where the bulb is
uniform float uNight;
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vWorld;
in vec3 vNorm;
in float vAlong;
flat in int vPart;
out vec4 outColor;

${METAL_GLSL}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  float lam = dot(N, L);
  vec3 lit = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.12 + 0.08 * max(N.y, 0.0) + 0.25 * uNight) * mix(1.0, 0.42, uNight);
  // The pool on the desk, thrown back up onto what faces down.
  vec3 bounce = uLamp * 0.06 * max(-N.y, 0.0) * smoothstep(${f(LAMP.at[1] + 0.25)}, ${f(LAMP.at[1])}, vWorld.y);
  vec3 col;
  if (vPart == 0 || vPart == 5) {
    // Enamel: the paint lit by the scene, under a glossy coat.
    gSat = 0.6;
    gSpec = 0.2;
    col = uPaint * (lit * 0.92 + bounce) + shine(N, V, L, 0.22, 0.045) * 0.9;
    gSat = 1.0;
    gSpec = 0.12;
    // In against the desk.
    col *= mix(0.6, 1.0, smoothstep(${f(LAMP.at[1])}, ${f(LAMP.at[1] + 0.006)}, vWorld.y));
    // The shade's rolled lip, lit from inside by the bulb.
    if (vPart == 5) col += uLamp * 0.5 * smoothstep(${f(LAMP.shade.len - 0.006)}, ${f(LAMP.shade.len + 0.003)}, vAlong);
  } else if (vPart == 1) {
    // The shade's inside: white enamel, lit by the bulb in its throat.
    vec3 b = uLampBulb - vWorld;
    float near = 0.0012 / (dot(b, b) + 0.0004);
    col = vec3(0.92, 0.9, 0.86) * (lit * 0.7 + uLamp * near * max(dot(N, normalize(b)), 0.15));
  } else if (vPart == 2 || vPart == 4) {
    // Steel: brushed, bright; a spring's coils, dark between the turns.
    gSat = 0.4;
    float coil = vPart == 4 ? smoothstep(-0.4, 0.8, sin(vAlong * 6.28318 / 0.0022)) : 1.0;
    col = (vec3(0.5, 0.5, 0.52) * (lit * 0.35 + bounce) + shine(N, V, L, 0.18, 0.6)) * mix(0.6, 1.0, coil);
    gSat = 1.0;
  } else {
    // The bulb: opal glass, its light when on.
    col = vec3(0.85, 0.83, 0.8) * lit * 0.6 + shine(N, V, L, 0.1, 0.05) * 0.5 + uLamp * 2.4;
  }
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;
