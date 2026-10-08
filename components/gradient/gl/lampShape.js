/**
 * (0.3.11) The desk lamp (ROADMAP.md, "The lamp is a theme toggle"): a
 * sprung, jointed anglepoise at the desk's back right corner. Lamp on is
 * night, lamp off is day, and its top half (the arms and the head) can be
 * dragged anywhere it reaches. Its pose, the light it throws, its shadow on
 * the desk, the bulb's flicker, and its outline on screen (the hit target)
 * and how a drag moves it. Shared by its own shader (lampShader.js), the
 * desk's and the devices' (the light), the renderer and the hit target.
 * Metres, from the desk's middle on the ground: x right, y up, z toward the
 * mountains.
 */
import { DESK_BOX, LID } from '../deskCamera';
import { LAPTOP } from './laptopShape';
import { BOOKS, STACK_H, TABLET } from './tabletShape';
import { PROPS_KEEP_OUT } from './propsShape';

const H = DESK_BOX.h;

export const LAMP = {
  // The base's middle, on the planks, in the back right corner.
  at: [0.45, H, 0.255],
  // Where its light falls at first: the pool's middle on the desk (x, z),
  // by the device's right side, where both closing shots see it. The arms
  // turn toward it.
  aim: [0.12, 0.03],
  base: { r: 0.066, h: 0.017 },
  // The lower arm's pivot over the desk, and each arm's length (the
  // classic pose: the elbow back over the base, the upper arm reaching
  // forward and down to the head).
  pivot: 0.052,
  arm: 0.24,
  // The head's joint at first: out along the arms' plane, up over the desk.
  head: [0.15, 0.25],
  // The shade: from its neck at the joint to its mouth, along its axis.
  shade: { len: 0.11, neck: 0.02, mouth: 0.056 },
  // The arms' twin rods: their radius and how far apart they run.
  rod: 0.0036,
  twin: 0.0095,
  // Enamel, a warm ivory; the bulb's light when it's on.
  paint: '#E4DACB',
  bulb: '#FFB86E',
  // The desk's wood as the bulb shows it: its own colour under a warm
  // light, not the scene's (which the night tints blue).
  wood: '#A26C42',
};

const unit = v => {
  const l = Math.hypot(...v);
  return v.map(x => x / l);
};
const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/**
 * A pose of the top half: `yaw` (radians, the arms' plane turned about the
 * base, 0 toward +x), `s` and `y` (metres: the head's joint out along the
 * plane from the base, and up from the desk). The shade keeps its tilt.
 */
export const LAMP_POSE = (() => {
  const u = [LAMP.aim[0] - LAMP.at[0], LAMP.aim[1] - LAMP.at[2]];
  return { yaw: Math.atan2(u[1], u[0]), s: LAMP.head[0], y: LAMP.head[1] };
})();
// How far the shade looks down from level: as it first aims at `aim`.
const TILT = (() => {
  const u = [Math.cos(LAMP_POSE.yaw), Math.sin(LAMP_POSE.yaw)];
  const hx = LAMP.at[0] + u[0] * LAMP.head[0];
  const hz = LAMP.at[2] + u[1] * LAMP.head[0];
  return Math.atan2(LAMP.head[1], Math.hypot(LAMP.aim[0] - hx, LAMP.aim[1] - hz));
})();

/**
 * The lamp in a pose, in the world: the arms' plane (`u` out along it,
 * `side` across), the joints (`pivot`, `elbow`, `head`), the shade's
 * `axis` (from its neck toward the pool), its `neck` and the `bulb`.
 */
export function lampAt(pose = LAMP_POSE) {
  const u = [Math.cos(pose.yaw), 0, Math.sin(pose.yaw)];
  const side = [-u[2], 0, u[0]];
  const inPlane = (s, y) => [LAMP.at[0] + u[0] * s, H + y, LAMP.at[2] + u[2] * s];
  const p0 = [0, LAMP.pivot];
  const j = [pose.s, pose.y];
  const d = [j[0] - p0[0], j[1] - p0[1]];
  const l = Math.hypot(...d);
  const m = [(p0[0] + j[0]) / 2, (p0[1] + j[1]) / 2];
  const up = Math.sqrt(Math.max(0, LAMP.arm * LAMP.arm - (l / 2) ** 2));
  // The elbow: the arms' meeting point above the line, back toward the base.
  const e = [m[0] - (d[1] / l) * up, m[1] + (d[0] / l) * up];
  const head = inPlane(...j);
  const axis = [u[0] * Math.cos(TILT), -Math.sin(TILT), u[2] * Math.cos(TILT)];
  const neck = add(head, axis, 0.012);
  return { u, side, pivot: inPlane(...p0), elbow: inPlane(...e), head, axis, neck, bulb: add(neck, axis, 0.055) };
}

/** The pose a drag gives when it takes the head's joint to the world point
 * `w`: as near as the arms reach, over the desk. */
export function poseToward(w) {
  const rel = [w[0] - LAMP.at[0], w[1] - H, w[2] - LAMP.at[2]];
  const yaw = Math.atan2(rel[2], rel[0]);
  let s = clamp(Math.hypot(rel[0], rel[2]), 0.06, 0.4);
  let y = clamp(rel[1], 0.07, 0.42);
  // Within the arms' reach of the pivot (nearly straight at most), and not
  // folded flat.
  const dy = y - LAMP.pivot;
  const d = Math.hypot(s, dy);
  const k = clamp(d, 0.1, 2 * LAMP.arm * 0.96) / d;
  s *= k;
  y = LAMP.pivot + dy * k;
  // The head over the desk's top.
  const ux = Math.cos(yaw);
  const uz = Math.sin(yaw);
  const room = (lim, a, du) => (du > 1e-6 ? (lim - a) / du : du < -1e-6 ? (-lim - a) / du : Infinity);
  s = Math.min(s, room(DESK_BOX.w / 2 - 0.02, LAMP.at[0], ux), room(DESK_BOX.d / 2 - 0.02, LAMP.at[2], uz));
  return { yaw, s: Math.max(0.03, s), y };
}

/**
 * What the lamp can't pass through, as boxes ([lo, hi] corners, world),
 * per device (deskCamera.js `deviceFor`): the laptop's base and its open
 * lid; the tablet and its stack of books. A drag stops short of them
 * (`lampClear`), and the base and the stack shade the bulb's light
 * (`LAMP_BLOCK_GLSL`) as the lid's and the tablet's planes do.
 */
export const LAMP_KEEP_OUT = (() => {
  const box = (at, lo, hi) => [lo.map((v, i) => v + at[i]), hi.map((v, i) => v + at[i])];
  const L = LAPTOP;
  const hingeZ = L.d / 2 - L.hingeIn;
  const open = (LID.open * Math.PI) / 180;
  const lidTop = [hingeZ - Math.cos(open) * L.d, L.base + Math.sin(open) * L.d];
  const base = box(L.at, [-L.w / 2, 0, -L.d / 2], [L.w / 2, L.base + L.lid + 0.002, L.d / 2]);
  const lid = box(L.at, [-L.w / 2, 0, hingeZ - 0.012], [L.w / 2, lidTop[1] + 0.006, lidTop[0] + 0.008]);
  const T = TABLET;
  const slab = box(T.at, [-T.w / 2, 0, -0.004], [T.w / 2, Math.sin(T.lean) * T.d + 0.006, Math.cos(T.lean) * T.d + 0.008]);
  // The stack: round each book's turned outline.
  const xs = BOOKS.flatMap(b => [-1, 1].map(k => b.x + (k * (Math.cos(b.yaw) * b.w + Math.abs(Math.sin(b.yaw)) * b.d)) / 2));
  const zs = BOOKS.flatMap(b => [b.z - (Math.abs(Math.sin(b.yaw)) * b.w + Math.cos(b.yaw) * b.d) / 2, b.z + (Math.abs(Math.sin(b.yaw)) * b.w + Math.cos(b.yaw) * b.d) / 2]);
  const books = box(T.at, [Math.min(...xs), 0, Math.min(...zs)], [Math.max(...xs), STACK_H, Math.max(...zs)]);
  // (0.3.12) And the things on the desk, on either frame.
  return { laptop: [base, lid, ...PROPS_KEEP_OUT], tablet: [slab, books, ...PROPS_KEEP_OUT] };
})();

/** How far a point is outside a box (0 inside). */
const outside = ([lo, hi], p) => Math.hypot(...p.map((v, i) => Math.max(lo[i] - v, 0, v - hi[i])));

/**
 * Whether a pose keeps the lamp clear of the device's boxes and above the
 * desk: the arms (as rods), the shade (as spheres along it, widening to
 * its mouth) and the bulb.
 */
export function lampClear(pose, device = 'laptop') {
  const at = lampAt(pose);
  const pts = [];
  const along = (a, b, r, n) => {
    for (let i = 0; i <= n; i++) pts.push([add(a, add(b, a, -1), i / n), r]);
  };
  along(at.pivot, at.elbow, LAMP.twin + LAMP.rod, 8);
  along(at.elbow, at.head, LAMP.twin + LAMP.rod, 8);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([add(at.neck, at.axis, LAMP.shade.len * t), LAMP.shade.neck + (LAMP.shade.mouth - LAMP.shade.neck) * t]);
  }
  if (pts.some(([p, r]) => p[1] - r < H + 0.002)) return false;
  return !LAMP_KEEP_OUT[device].some(b => pts.some(([p, r]) => outside(b, p) < r));
}

/**
 * A drag's next pose: toward the world point `w` for the head (poseToward),
 * but stopping where the lamp would meet the device or the desk, as far
 * along the way from `from` (a pose that's clear) as it stays clear.
 */
export function poseFree(from, w, device = 'laptop') {
  const to = poseToward(w);
  if (lampClear(to, device)) return to;
  const a = lampAt(from).head;
  const b = lampAt(to).head;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const t = (lo + hi) / 2;
    if (lampClear(poseToward(add(a, add(b, a, -1), t)), device)) lo = t;
    else hi = t;
  }
  return lo > 0 ? poseToward(add(a, add(b, a, -1), lo)) : from;
}

/** The camera's ray through screen point (px, py) (CSS px) meets the plane
 * through `w` square to its view: the world point there. `P`, `cm` as for
 * lampHitOn. */
export function screenToWorld(P, cm, w, px, py) {
  const fz = P.zoom * P.f;
  const F = [0, -P.sin, P.cos];
  const D = [0, -P.cos, -P.sin];
  const dir = add(add(F, [1, 0, 0], (px - P.sx) / fz), D, (py - P.sy) / fz);
  const c = [cm.x, cm.y, cm.z];
  const t = (w[0] - c[0]) * F[0] + (w[1] - c[1]) * F[1] + (w[2] - c[2]) * F[2];
  return add(c, dir, t);
}

const f5 = x => x.toFixed(5);
/**
 * GLSL: (0.3.11) how much of the bulb's light at a world point the
 * device's solid boxes block (0 … 1): the laptop's base (`lampBlockBase`),
 * the tablet's stack of books (`lampBlockBooks`); the ray to the bulb
 * against the box, soft at its edge. Needs LAMP_LIGHT_GLSL.
 */
export const LAMP_BLOCK_GLSL = (() => {
  const b = (k, [lo, hi]) => `const vec3 ${k}_LO = vec3(${lo.map(f5).join(', ')});\nconst vec3 ${k}_HI = vec3(${hi.map(f5).join(', ')});`;
  return `${b('LAMP_BASE', LAMP_KEEP_OUT.laptop[0])}
${b('LAMP_BOOKS', LAMP_KEEP_OUT.tablet[1])}
float lampHitsBox(vec3 o, vec3 d, float far, vec3 lo, vec3 hi) {
  vec3 inv = 1.0 / d;
  vec3 t0 = (lo - o) * inv;
  vec3 t1 = (hi - o) * inv;
  vec3 tn = min(t0, t1);
  vec3 tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z);
  float b = min(min(tf.x, tf.y), tf.z);
  // How deep the ray passes through it (metres), softened to a few mm.
  return a < b && b > 0.0005 && a < far ? smoothstep(0.0, 0.004, b - max(a, 0.0)) : 0.0;
}
float lampBlockBase(vec3 w) { return lampHitsBox(w, lampFrom(w), lampFar(w), LAMP_BASE_LO, LAMP_BASE_HI); }
float lampBlockBooks(vec3 w) { return lampHitsBox(w, lampFrom(w), lampFar(w), LAMP_BOOKS_LO, LAMP_BOOKS_HI); }
`;
})();

const CONE = [Math.cos((52 * Math.PI) / 180), Math.cos((18 * Math.PI) / 180)];

const f = x => x.toFixed(5);
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const vec3 = v => `vec3(${v.map(f).join(', ')})`;

/**
 * GLSL: the bulb's light reaching a world point facing N (`lampLight`), as a
 * spot through the shade's mouth, falling off with distance; `uLamp` is its
 * colour times how bright it is (0: off), `uLampBulb` and `uLampAxis` where
 * the bulb is and where the shade points (lampAt). `lampFrom(w)`,
 * `lampFar(w)`: the direction and distance to the bulb; `LAMP_WOOD`, the
 * desk's wood as the bulb shows it.
 */
export const LAMP_LIGHT_GLSL = `uniform vec3 uLamp;     // (0.3.11) the lamp's light: its colour × power (0: off)
uniform vec3 uLampBulb; // the bulb, and where the shade points
uniform vec3 uLampAxis;
const vec3 LAMP_WOOD = ${vec3(rgb(LAMP.wood))};
vec3 lampFrom(vec3 w) { return normalize(uLampBulb - w); }
float lampFar(vec3 w) { return length(uLampBulb - w); }
vec3 lampLight(vec3 w, vec3 N) {
  vec3 d = uLampBulb - w;
  float r2 = dot(d, d);
  vec3 l = d * inversesqrt(r2);
  float cone = smoothstep(${f(CONE[0])}, ${f(CONE[1])}, dot(-l, uLampAxis));
  return uLamp * (cone * 0.13 / (r2 + 0.015)) * max(dot(N, l), 0.0);
}
`;

/** The moving parts the lamp's shadow is cast from, for `uLampSeg` (pairs
 * of ends): the lower arm, the upper arm (each pair of rods as one), the
 * shade. */
export function lampSegments(at) {
  return new Float32Array([...at.pivot, ...at.elbow, ...at.elbow, ...at.head, ...at.neck, ...add(at.neck, at.axis, LAMP.shade.len * 0.75)]);
}
const SEG_R = [LAMP.twin * 0.9, LAMP.twin * 0.9, (LAMP.shade.neck + LAMP.shade.mouth) * 0.48];

/**
 * GLSL: how far a point on the desk's top (world) lies in the lamp's shadow
 * from the light the laptop's comes from (`laptopLight`): each part as a
 * capsule cast down along the light, softening and fading as it runs
 * (the sky's light, all round, fills in a long shadow); the turret, the
 * base's disc and its contact dark. Needs LAPTOP_SHADE_GLSL (`laptopLight`).
 */
export const LAMP_SHADE_GLSL = `uniform vec3 uLampSeg[6];
float lampSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0));
}
float lampCast(vec2 p, vec2 run, vec3 a, vec3 b, float r) {
  float ua = a.y - ${f(H)};
  float ub = b.y - ${f(H)};
  float s = 0.003 + 0.05 * (ua + ub);
  float d = lampSeg(p, a.xz - run * ua, b.xz - run * ub);
  return (1.0 - smoothstep(r - s, r + s, d)) * (1.0 - 0.9 * min(1.0, (ua + ub) / 0.5));
}
float lampShade(vec3 w) {
  vec3 L = laptopLight();
  vec2 run = L.xz / L.y;
  vec2 p = w.xz;
  float sh = lampCast(p, run, ${vec3([LAMP.at[0], H, LAMP.at[2]])}, ${vec3([LAMP.at[0], H + LAMP.pivot, LAMP.at[2]])}, 0.02);
  sh = max(sh, lampCast(p, run, uLampSeg[0], uLampSeg[1], ${f(SEG_R[0])}));
  sh = max(sh, lampCast(p, run, uLampSeg[2], uLampSeg[3], ${f(SEG_R[1])}));
  sh = max(sh, lampCast(p, run, uLampSeg[4], uLampSeg[5], ${f(SEG_R[2])}));
  float out_ = max(length(p - vec2(${f(LAMP.at[0])}, ${f(LAMP.at[2])})) - ${f(LAMP.base.r)}, 0.0);
  float halo = exp(-out_ / 0.01) * 0.8 + exp(-out_ / 0.035) * 0.25;
  return max(sh * 0.85, halo);
}
`;


/**
 * The bulb's flicker at `t` (seconds on the frame loop's clock): 1 steady,
 * dipping toward 0 in a stutter. Nothing on a schedule: each stutter waits
 * a random spell (exponential, ~22 s on average) and is a few fast dips of
 * random depth, from a generator seeded once per load (ROADMAP.md, "The
 * desk is alive"). Pure in `t` for a given seed.
 */
export function makeFlicker(seed = Math.random()) {
  let s = Math.floor(seed * 2 ** 31) || 1;
  const rand = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  const events = [];
  let until = 0;
  let next = 6 + rand() * 10;
  return t => {
    while (next < t + 2) {
      const n = 2 + Math.floor(rand() * 4);
      const dips = [];
      let at = next;
      for (let i = 0; i < n; i++) {
        const len = 0.03 + rand() * 0.07;
        dips.push([at, len, 0.35 + rand() * 0.55]);
        at += len + rand() * 0.09;
      }
      events.push(dips);
      until = at;
      next = until + 4 - 22 * Math.log(1 - rand() * 0.999);
    }
    while (events.length && events[0].at(-1)[0] + 1 < t) events.shift();
    let k = 1;
    for (const dips of events) {
      for (const [at, len, depth] of dips) {
        const x = (t - at) / len;
        if (x > 0 && x < 1) k = Math.min(k, 1 - depth * Math.sin(Math.PI * x));
      }
    }
    return k;
  };
}


/** Where a world point lands on screen (CSS px) and its depth, under the
 * desk camera (deskShader.js PROJECT_GLSL): `P` the pitch ({ cos, sin, f,
 * zoom, sx, sy }), `cm` the camera in metres. */
function project(P, cm, w) {
  const q = [w[0] - cm.x, w[1] - cm.y, w[2] - cm.z];
  const zp = -q[1] * P.sin + q[2] * P.cos;
  const vp = -q[1] * P.cos - q[2] * P.sin;
  const fz = P.zoom * P.f;
  return { x: P.sx + (fz * q[0]) / zp, y: P.sy + (fz * vp) / zp, z: zp, k: fz / zp };
}

/** The convex hull of 2D points, anticlockwise on screen (y down). */
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = list => {
    const h = [];
    for (const q of list) {
      while (h.length >= 2 && cross(h.at(-2), h.at(-1), q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...half(p), ...half(p.reverse())];
}

/** The world circle round `c` square to `n`, of radius `r`, as n points. */
function ring(c, n, r, count = 12) {
  const t = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = unit([n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]]);
  const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return add(add(c, e1, r * Math.cos(a)), e2, r * Math.sin(a));
  });
}

/**
 * The lamp's outline on screen, for its hit target: every part (the base,
 * the turret, both arms, the shade) as a convex shape, with a disc round
 * the shade that keeps a small lamp a usable touch target (44 px across).
 * `{ x, y, w, h }` the box round it all, `path` the outline in the box
 * (SVG, for a clip-path), `r` the shade's radius (px). Null when any of it
 * is behind the camera.
 */
export function lampHitOn(P, cm, pose = LAMP_POSE) {
  const at = lampAt(pose);
  const base = [LAMP.at[0], H, LAMP.at[2]];
  const shapes = [];
  const shape = pts => {
    const s = pts.map(w => project(P, cm, w));
    if (s.some(q => q.z <= 0.05)) return false;
    shapes.push(hull(s.map(q => [q.x, q.y])));
    return true;
  };
  // A rod on screen: its ends' discs, at least 6 px across.
  const rod = (a, b, r) => {
    const pa = project(P, cm, a);
    const pb = project(P, cm, b);
    if (pa.z <= 0.05 || pb.z <= 0.05) return false;
    const pts = [];
    for (const q of [pa, pb]) {
      const rr = Math.max(3, q.k * r);
      for (let i = 0; i < 10; i++) pts.push([q.x + rr * Math.cos((i / 10) * Math.PI * 2), q.y + rr * Math.sin((i / 10) * Math.PI * 2)]);
    }
    shapes.push(hull(pts));
    return true;
  };
  const tip = add(at.neck, at.axis, LAMP.shade.len);
  const ok =
    shape([...ring(base, [0, 1, 0], LAMP.base.r, 16), ...ring(add(base, [0, 1, 0], LAMP.base.h), [0, 1, 0], LAMP.base.r, 16)]) &&
    rod(base, at.pivot, 0.014) &&
    rod(at.pivot, at.elbow, LAMP.twin + LAMP.rod) &&
    rod(at.elbow, at.head, LAMP.twin + LAMP.rod) &&
    shape([...ring(add(at.neck, at.axis, -0.016), at.axis, 0.012, 8), ...ring(at.neck, at.axis, LAMP.shade.neck), ...ring(tip, at.axis, LAMP.shade.mouth + 0.003, 16)]);
  if (!ok) return null;
  const c = project(P, cm, add(at.neck, at.axis, LAMP.shade.len * 0.45));
  const r = c.k * 0.06;
  if (r < 22) shapes.push(hull(Array.from({ length: 16 }, (_, i) => [c.x + 22 * Math.cos((i / 16) * Math.PI * 2), c.y + 22 * Math.sin((i / 16) * Math.PI * 2)])));
  const all = shapes.flat();
  const x = Math.floor(Math.min(...all.map(q => q[0])));
  const y = Math.floor(Math.min(...all.map(q => q[1])));
  const w = Math.ceil(Math.max(...all.map(q => q[0]))) - x;
  const h = Math.ceil(Math.max(...all.map(q => q[1]))) - y;
  // One winding for every shape, so where they overlap they add (nonzero).
  const path = shapes
    .map(s => `M${s.map(q => `${(q[0] - x).toFixed(1)} ${(q[1] - y).toFixed(1)}`).join('L')}Z`)
    .join('');
  return { x, y, w, h, path, r, cx: c.x, cy: c.y };
}
