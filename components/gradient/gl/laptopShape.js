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
  // The screen on the lid's face: its size, and how far down from the lid's
  // free edge it starts.
  screen: { w: 0.2965, h: 0.1925, top: 0.0075 },
  // (0.3.9) One finish by day and by night, space black: the night only
  // darkens it through its light (the owner, 2026-10-05).
  metal: '#303033',
};

const f = x => x.toFixed(5);

const SCR = LAPTOP.screen;
const HINGE_Y = LAPTOP.base + LAPTOP.gap;
const HINGE_Z = LAPTOP.d / 2 - LAPTOP.hingeIn;
// The screen's middle, from the hinge, in the lid's own frame (along it).
const SCR_FROM_HINGE = LAPTOP.d / 2 - SCR.top - SCR.h / 2 + HINGE_Z;

/**
 * GLSL: how far a point (metres, from `uAt`, the base's foot centre) lies in
 * the laptop's shadow (0 … 1), from the light (`uSunDir`, rising 0.55 for
 * every 1 across, as the desk's and trees' do). `laptopLid`: the lid's, a
 * plane through the hinge (`uLid`: its cos, sin open); `laptopBase`: the
 * base's, its outline along the ray from its foot to its deck, and the
 * dark right under it. `laptopGlow`: (0.3.9) how much of the screen's light
 * reaches a point facing N, the lit screen as one soft panel (cosine at
 * both ends, over the distance squared), nothing under the base.
 * `laptopLidAlong`: (0.3.11) the lid's, along any light L, up to `far`
 * (the lamp's). Needs `uSunDir`, `uLid`.
 */
export const LAPTOP_SHADE_GLSL = `float laptopBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 laptopLight() { return normalize(vec3(uSunDir.x, 0.55, uSunDir.y)); }
float laptopLidAlong(vec3 q, vec3 L, float far) {
  vec3 h = vec3(0.0, ${f(LAPTOP.base + LAPTOP.gap + LAPTOP.lid / 2)}, ${f(LAPTOP.d / 2 - LAPTOP.hingeIn)});
  vec3 u = vec3(0.0, uLid.y, -uLid.x);
  vec3 n = vec3(0.0, uLid.x, uLid.y);
  float den = dot(L, n);
  if (abs(den) < 1e-4) return 0.0;
  float t = dot(h - q, n) / den;
  if (t <= 0.0 || t >= far) return 0.0;
  vec3 c = q + L * t - h;
  float s = 0.0015 + t * 0.025;
  float a = abs(c.x) - ${f(LAPTOP.w / 2)};
  float b = max(-dot(c, u) - ${f(LAPTOP.hingeIn)}, dot(c, u) - ${f(LAPTOP.d - LAPTOP.hingeIn)});
  return (1.0 - smoothstep(-s, s, a)) * (1.0 - smoothstep(-s, s, b));
}
float laptopLid(vec3 q) { return laptopLidAlong(q, laptopLight(), 1e9); }
float laptopBase(vec3 q) {
  vec3 L = laptopLight();
  vec2 half_ = vec2(${f(LAPTOP.w / 2)}, ${f(LAPTOP.d / 2)});
  // Shut, the lid stacks on the base, so the shadow runs from its top;
  // open, the lid casts its own (laptopLid). The edge softens as it runs
  // away from the laptop (the sky's light, from all round, fills it in).
  float top = ${f(LAPTOP.base)} + ${f(LAPTOP.gap + LAPTOP.lid)} * (1.0 - smoothstep(0.05, 0.3, uLid.y));
  float sh = 0.0;
  for (int i = 0; i < 4; i++) {
    float up = top * float(i) / 3.0 - q.y;
    if (up < 0.0) continue;
    float s = 0.002 + up * 0.35;
    sh = max(sh, 1.0 - smoothstep(-s, s, laptopBox(q.xz + L.xz / L.y * up, half_, ${f(LAPTOP.corner)})));
  }
  float under = 1.0 - smoothstep(-0.004, 0.02, laptopBox(q.xz, half_, ${f(LAPTOP.corner)}));
  // (0.3.9) And a soft dark halo where it meets the desk, the light from
  // low down blocked by its sides.
  float out_ = max(laptopBox(q.xz, half_, ${f(LAPTOP.corner)}), 0.0);
  float halo = exp(-out_ / 0.012) * 0.8 + exp(-out_ / 0.04) * 0.25;
  return max(max(sh, under * 0.7), halo);
}
float laptopGlow(vec3 q, vec3 N) {
  vec3 c = vec3(0.0, ${f(HINGE_Y)} + ${f(SCR_FROM_HINGE)} * uLid.y, ${f(HINGE_Z)} - ${f(SCR_FROM_HINGE)} * uLid.x);
  vec3 ns = vec3(0.0, -uLid.x, -uLid.y);
  vec3 d = c - q;
  float r2 = dot(d, d);
  vec3 dn = d * inversesqrt(r2);
  float a = ${f(SCR.w * SCR.h)};
  float off = smoothstep(0.0, 0.006, laptopBox(q.xz, vec2(${f(LAPTOP.w / 2)}, ${f(LAPTOP.d / 2)}), ${f(LAPTOP.corner)})) + step(${f(LAPTOP.base - 0.001)}, q.y);
  return max(dot(ns, -dn), 0.0) * max(dot(N, dn), 0.0) * a / (3.14159 * r2 + a) * min(off, 1.0);
}
`;
