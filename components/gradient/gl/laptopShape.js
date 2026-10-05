/**
 * (0.3.8) The laptop's size, where it sits on the desk and the shadow it
 * casts: shared by its own shader (laptopShader.js), whose deck the open lid
 * shades, and the desk's (deskShader.js), whose top the whole laptop shades.
 * Metres; the size of a 14-inch MacBook Pro.
 */
import { DESK_BOX } from '../deskCamera';

export const LAPTOP = {
  w: 0.3126, // width (x)
  d: 0.2212, // depth (z)
  base: 0.0105, // the base's thickness
  lid: 0.0048, // the lid's
  corner: 0.011, // the corners' radius, seen from above
  hingeIn: 0.004, // the hinge, in from the base's back edge
  gap: 0.0004, // between the shut lid and the deck
  // Where the base's foot centre stands: on the planks (its feet lift it a
  // touch), a little toward the camera's side of the desk's middle.
  at: [0, DESK_BOX.h + 0.0012, -0.02],
};

const f = x => x.toFixed(5);

/**
 * GLSL: how far a point (metres, from `uAt`, the base's foot centre) lies in
 * the laptop's shadow (0 … 1), from the light (`uSunDir`, rising 0.55 for
 * every 1 across, as the desk's and trees' do). `laptopLid`: the lid's, a
 * plane through the hinge (`uLid`: its cos, sin open); `laptopBase`: the
 * base's, its outline along the ray from its foot to its deck, and the
 * dark right under it. Needs `uSunDir`, `uLid`.
 */
export const LAPTOP_SHADE_GLSL = `float laptopBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 laptopLight() { return normalize(vec3(uSunDir.x, 0.55, uSunDir.y)); }
float laptopLid(vec3 q) {
  vec3 L = laptopLight();
  vec3 h = vec3(0.0, ${f(LAPTOP.base + LAPTOP.gap + LAPTOP.lid / 2)}, ${f(LAPTOP.d / 2 - LAPTOP.hingeIn)});
  vec3 u = vec3(0.0, uLid.y, -uLid.x);
  vec3 n = vec3(0.0, uLid.x, uLid.y);
  float den = dot(L, n);
  if (abs(den) < 1e-4) return 0.0;
  float t = dot(h - q, n) / den;
  if (t <= 0.0) return 0.0;
  vec3 c = q + L * t - h;
  float s = 0.0015 + t * 0.025;
  float a = abs(c.x) - ${f(LAPTOP.w / 2)};
  float b = max(-dot(c, u) - ${f(LAPTOP.hingeIn)}, dot(c, u) - ${f(LAPTOP.d - LAPTOP.hingeIn)});
  return (1.0 - smoothstep(-s, s, a)) * (1.0 - smoothstep(-s, s, b));
}
float laptopBase(vec3 q) {
  vec3 L = laptopLight();
  vec2 half_ = vec2(${f(LAPTOP.w / 2)}, ${f(LAPTOP.d / 2)});
  float d = 1e3;
  for (int i = 0; i < 3; i++) {
    float up = ${f(LAPTOP.base)} * float(i) * 0.5 - q.y;
    if (up >= 0.0) d = min(d, laptopBox(q.xz + L.xz / L.y * up, half_, ${f(LAPTOP.corner)}));
  }
  float under = 1.0 - smoothstep(-0.004, 0.02, laptopBox(q.xz, half_, ${f(LAPTOP.corner)}));
  return max(1.0 - smoothstep(-0.003, 0.005, d), under * 0.7);
}
`;
