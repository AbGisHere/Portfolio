/**
 * (0.4.0) The house on the hill and the pool on its balcony, as grey boxes
 * (houseShape.js): flat-shaded, lit by the sky like the things on the desk
 * (propsShader.js), with no shadows yet. They stand for where the real house
 * goes, so the camera's last arcs (deskCamera.js CONTACT_PATH) can be laid
 * out and judged first.
 */

import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { HOUSE_BOXES, HOUSE_PART } from './houseShape';
import { KIT_STRIDE, box } from './meshKit';

export const HOUSE_STRIDE = KIT_STRIDE;

/** The boxes, as one mesh: `{ data, count }`. Built once. */
export function houseMesh() {
  const out = [];
  for (const [lo, hi, part] of HOUSE_BOXES) box(out, lo, hi, HOUSE_PART[part], { bottom: false });
  const data = new Float32Array(out);
  return { data, count: data.length / HOUSE_STRIDE };
}

export const HOUSE_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;

${CAMERA_GLSL}
out vec3 vNorm;
flat out int vPart;

${PROJECT_GLSL}
void main() {
  vNorm = aNorm;
  vPart = int(aPart + 0.5);
  gl_Position = project(aPos);
}
`;

export const HOUSE_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uSky;
uniform float uNight;

in vec3 vNorm;
flat in int vPart;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNorm);
  // The grey boxes: the hill a little green, the roof darker, the pool's
  // water blue.
  vec3 base = vPart == 0 ? vec3(0.50, 0.55, 0.47)
    : vPart == 2 ? vec3(0.42)
    : vPart == 3 ? vec3(0.70)
    : vPart == 4 ? vec3(0.36, 0.56, 0.66)
    : vec3(0.62);
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  float lam = dot(N, L);
  vec3 lit = mix(0.55, 1.1, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.15 + 0.25 * uNight) * mix(1.0, 0.3, uNight);
  outColor = vec4(base * lit, 1.0);
}
`;
