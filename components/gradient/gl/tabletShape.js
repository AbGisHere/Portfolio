/**
 * (0.3.10) The tablet on portrait frames (deskCamera.js `deviceFor`): its
 * size, how it leans on a stack of books, and the shadow and light they
 * throw on the desk. Shared by its own shader (tabletShader.js) and the
 * desk's (deskShader.js). Metres; the size of a 13-inch tablet, 3:4.
 */
import { DESK_BOX } from '../deskCamera';
import { LAPTOP } from './laptopShape';

const LEAN = (72 * Math.PI) / 180; // from the desk: the laptop's screen at 108° open

export const TABLET = {
  w: 0.2155, // across (x)
  d: 0.2816, // tall, foot to top, along the lean
  t: 0.0051, // thick
  corner: 0.0185,
  lean: LEAN,
  // Its foot's middle, the edge it stands on, on the planks: where its
  // screen's middle lands near the laptop's, so the path's end frames it.
  at: [0, DESK_BOX.h + 0.0004, 0.07],
  // The screen under the glass, centred, with a black border round it.
  screen: { w: 0.198, h: 0.264, r: 0.0105 },
  metal: LAPTOP.metal,
};

const { w: TW, d: TD, t: TT } = TABLET;
const COS = Math.cos(LEAN);
const SIN = Math.sin(LEAN);
/** Along the tablet, foot to top (`u`), and out of its screen (`n`). */
export const TABLET_U = [0, SIN, COS];
export const TABLET_N = [0, COS, -SIN];

/**
 * The books it leans on, bottom to top, in the desk's frame from the
 * tablet's foot: cloth hardbacks, long side across, each turned a little
 * (`yaw`), spines alternately to the camera (`spine` −1) and away, the
 * stack off to the right so it shows past the tablet's side. The top
 * one's front edge is where the tablet's back rests: above the tablet's
 * middle, so it can't tip back over them.
 */
const STACK = [
  { w: 0.245, d: 0.172, h: 0.036, yaw: 0.06, x: 0.062, back: 0.012, spine: -1, cloth: '#2f4a3a' },
  { w: 0.232, d: 0.16, h: 0.028, yaw: -0.09, x: 0.04, back: 0.006, spine: 1, cloth: '#6b2a26' },
  { w: 0.222, d: 0.15, h: 0.04, yaw: 0.03, x: 0.058, back: 0.01, spine: -1, cloth: '#283a5a' },
  { w: 0.205, d: 0.142, h: 0.024, yaw: -0.05, x: 0.046, back: 0.004, spine: 1, cloth: '#a8843c' },
  { w: 0.198, d: 0.135, h: 0.027, yaw: 0.11, x: 0.05, back: 0, spine: -1, cloth: '#d6ccb4' },
];

/** Each book with where it lies: `y` its foot, `z` its middle (from the
 * tablet's foot). */
export const BOOKS = (() => {
  const top = STACK.reduce((a, b) => a + b.h, 0);
  // The tablet's back face at the stack's top.
  const rest = top * (COS / SIN);
  let y = 0;
  return STACK.map(b => {
    // How far its nearest corner sits in front of its middle, turned.
    const reach = (Math.abs(Math.sin(b.yaw)) * b.w + Math.cos(b.yaw) * b.d) / 2;
    const book = { ...b, y, z: rest + b.back + reach };
    y += b.h;
    return book;
  });
})();

/** The top of the stack, and how far up the tablet its back rests on it. */
export const STACK_H = BOOKS.at(-1).y + BOOKS.at(-1).h;
export const REST_AT = STACK_H / SIN;

const f = x => x.toFixed(5);

/**
 * GLSL: how far a point (metres, from the tablet's foot) lies in the
 * tablet's and the books' shadow (0 … 1), from the light the laptop's
 * comes from (`laptopLight`), with the dark where they meet the desk; and
 * `tabletGlow`, its lit screen as a soft panel light, as `laptopGlow`;
 * `tabletAlong`, (0.3.11) the tablet's alone along any light L, up to `far`.
 * Needs LAPTOP_SHADE_GLSL (`laptopBox`, `laptopLight`).
 */
const STACK_C = [BOOKS.reduce((a, b) => a + b.x, 0) / BOOKS.length, BOOKS.reduce((a, b) => a + b.z, 0) / BOOKS.length];
// Round the stack: its widest book's half diagonal, and how far the books
// sit off their middle.
const STACK_R = Math.max(...BOOKS.map(b => Math.hypot(b.w, b.d) / 2 + Math.hypot(b.x - STACK_C[0], b.z - STACK_C[1])));

export const TABLET_SHADE_GLSL = `${BOOKS.map(
  (b, i) => `float book${i}(vec2 p) {
  p -= vec2(${f(b.x)}, ${f(b.z)});
  return laptopBox(vec2(p.x * ${f(Math.cos(b.yaw))} + p.y * ${f(Math.sin(b.yaw))}, p.y * ${f(Math.cos(b.yaw))} - p.x * ${f(Math.sin(b.yaw))}), vec2(${f(b.w / 2)}, ${f(b.d / 2)}), 0.002);
}`,
).join('\n')}
float tabletAlong(vec3 q, vec3 L, float far) {
  vec3 u = vec3(${TABLET_U.map(f).join(', ')});
  vec3 n = vec3(${TABLET_N.map(f).join(', ')});
  vec3 h = n * ${f(TT / 2)} + u * ${f(TD / 2)};
  float den = dot(L, n);
  if (abs(den) < 1e-4) return 0.0;
  float t = dot(h - q, n) / den;
  if (t <= 0.0 || t >= far) return 0.0;
  vec3 c = q + L * t - h;
  float s = 0.0015 + t * 0.025;
  return 1.0 - smoothstep(-s, s, laptopBox(vec2(c.x, dot(c, u)), vec2(${f(TW / 2)}, ${f(TD / 2)}), ${f(TABLET.corner)}));
}
float tabletShade(vec3 q) {
  vec3 L = laptopLight();
  vec2 run = L.xz / L.y;
  float sh = 0.0;
  float halo = 0.0;
  // Each book's footprint at its top, middle and foot, cast along the
  // light, softening as it runs; only near the stack and its shadow (a
  // capsule from the stack along the light, as wide as the stack).
  vec2 pa = q.xz - vec2(${f(STACK_C[0])}, ${f(STACK_C[1])});
  vec2 ba = -run * ${f(STACK_H)};
  float near = length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
  if (near < ${f(STACK_R + 0.002 + STACK_H * 0.35)}) {
    float up;
    ${BOOKS.flatMap((b, i) =>
      [0, 1, 2].map(k => `up = ${f(b.y + b.h - (k * b.h) / 2)} - q.y; sh = max(sh, 1.0 - smoothstep(-0.002 - up * 0.35, 0.002 + up * 0.35, book${i}(q.xz + run * up)));`),
    ).join('\n    ')}
  }
  // And the dark round the bottom one, where it meets the desk.
  float out_ = max(book0(q.xz), 0.0);
  halo = exp(-out_ / 0.012) * 0.8 + exp(-out_ / 0.04) * 0.25;
  // The tablet: a plane through its middle, along the light to it.
  sh = max(sh, tabletAlong(q, L, 1e9));
  // Where its foot stands, a thin dark line.
  float foot = laptopBox(vec2(q.x, q.z + ${f(TT * SIN / 2)}), vec2(${f(TW / 2 - 0.004)}, ${f(TT * SIN / 2)}), 0.002);
  halo = max(halo, exp(-max(foot, 0.0) / 0.004) * 0.75);
  return max(sh, halo);
}
float tabletGlow(vec3 q, vec3 N) {
  vec3 ns = vec3(${TABLET_N.map(f).join(', ')});
  vec3 c = vec3(0.0, ${f(TABLET_U[1] * TD / 2 + TABLET_N[1] * TT)}, ${f(TABLET_U[2] * TD / 2 + TABLET_N[2] * TT)});
  vec3 d = c - q;
  float r2 = dot(d, d);
  vec3 dn = d * inversesqrt(r2);
  float a = ${f(TABLET.screen.w * TABLET.screen.h)};
  return max(dot(ns, -dn), 0.0) * max(dot(N, dn), 0.0) * a / (3.14159 * r2 + a);
}
`;
