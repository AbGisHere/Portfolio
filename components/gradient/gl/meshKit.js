/**
 * (0.3.12) The primitives the desk's things are built from in code: turned
 * (lathed) profiles, rods, tubes swept along a path, boxes and surfaces
 * from a function. Shared by the lamp (lampShader.js) and the things on
 * the desk (propsShader.js).
 *
 * Every vertex is `KIT_STRIDE` floats: position (3), normal (3), the part
 * (which material), and two coordinates on the part (`s`, `t`: what each
 * primitive says), all pushed flat onto `out`, three vertices a triangle.
 */
export const KIT_STRIDE = 9;

export const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
export const scale = (a, k) => a.map(x => x * k);
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const unit = v => {
  const l = Math.hypot(...v);
  return v.map(x => x / l);
};
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Two unit vectors square to `a` and to each other. */
export function basis(a) {
  const t = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = unit(cross(a, t));
  return [e1, cross(a, e1)];
}

/**
 * A profile turned about an axis from `o` along `a`: `prof` is [r, y] pairs
 * (y along the axis), its outside to the left as it runs (so outward when it
 * climbs, up when it runs in). Smooth normals, `seg` round. `s`: y; `t`:
 * the turn (0 … 1).
 */
export function lathe(out, o, a, prof, part, seg = 28) {
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
    const e = add(scale(e1, Math.cos(phi)), e2, Math.sin(phi));
    const [r, y] = prof[i];
    const pos = add(add(o, e, r), a, y);
    const nor = add(scale(e, n[i][0]), a, n[i][1]);
    return [...pos, ...nor, part, y, k / seg];
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

/** A rod from p to q, capped round. `s`: along it, from p. */
export function tube(out, p, q, r, part, seg = 12) {
  const d = add(q, p, -1);
  const len = Math.hypot(...d);
  const prof = [[0, -r]];
  for (let i = 1; i < 4; i++) prof.push([r * Math.sin((i / 4) * (Math.PI / 2)), -r * Math.cos((i / 4) * (Math.PI / 2))]);
  prof.push([r, 0], [r, len]);
  for (let i = 1; i < 4; i++) prof.push([r * Math.cos((i / 4) * (Math.PI / 2)), len + r * Math.sin((i / 4) * (Math.PI / 2))]);
  prof.push([0, len + r]);
  lathe(out, p, unit(d), prof, part, seg);
}

/**
 * A round tube of radius `r` swept along `path` (points), open (its ends
 * capped by a ball) or `closed` (a loop). `s`: the distance along it.
 * The cross-section's frame is carried along (parallel transport), so it
 * never twists.
 */
export function sweep(out, path, r, part, { closed = false, seg = 10 } = {}) {
  const n = path.length;
  const at = i => path[closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))];
  const tan = path.map((_, i) => unit(add(at(i + 1), at(i - 1), -1)));
  let [e1] = basis(tan[0]);
  const frames = tan.map(t => {
    e1 = unit(add(e1, t, -dot(e1, t)));
    return [e1, cross(t, e1)];
  });
  let s = 0;
  const along = path.map((p, i) => (i ? (s += Math.hypot(...add(p, path[i - 1], -1))) : 0));
  const vert = (i, k) => {
    const phi = (k / seg) * Math.PI * 2;
    const [a, b] = frames[i % n];
    const e = add(scale(a, Math.cos(phi)), b, Math.sin(phi));
    return [...add(path[i % n], e, r), ...e, part, along[i % n], k / seg];
  };
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    for (let k = 0; k < seg; k++) {
      const v00 = vert(i, k);
      const v01 = vert(i, k + 1);
      const v10 = vert(i + 1, k);
      const v11 = vert(i + 1, k + 1);
      out.push(...v00, ...v10, ...v11, ...v00, ...v11, ...v01);
    }
  }
  if (!closed) {
    for (const i of [0, n - 1]) ball(out, path[i], r, part, Math.max(6, seg));
  }
}

/** A small ball (a rod's or a tube's end). */
export function ball(out, c, r, part, seg = 10) {
  const prof = [];
  for (let i = 0; i <= 6; i++) {
    const t = (i / 6) * Math.PI;
    prof.push([r * Math.sin(t), -r * Math.cos(t)]);
  }
  lathe(out, c, [0, 1, 0], prof, part, seg);
}

/**
 * A surface from `f(u, v)` (each 0 … 1) → `{ p, part, s, t }`, `nu` × `nv`
 * quads, its normals from its own slopes, turned toward `up` (a hint: which
 * side is its face).
 */
export function grid(out, nu, nv, f, up = [0, 1, 0]) {
  const at = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) at.push(f(i / nu, j / nv));
  const P = (i, j) => at[j * (nu + 1) + i];
  const vert = (i, j) => {
    const a = P(Math.min(nu, i + 1), j).p;
    const b = P(Math.max(0, i - 1), j).p;
    const c = P(i, Math.min(nv, j + 1)).p;
    const d = P(i, Math.max(0, j - 1)).p;
    // (Where a side shrinks to a point, as a disc's middle, its hint.)
    const raw = cross(add(c, d, -1), add(a, b, -1));
    let N = Math.hypot(...raw) > 1e-14 ? unit(raw) : unit(up);
    if (dot(N, up) < 0) N = scale(N, -1);
    const q = P(i, j);
    return [...q.p, ...N, q.part, q.s, q.t];
  };
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const v00 = vert(i, j);
      const v10 = vert(i + 1, j);
      const v01 = vert(i, j + 1);
      const v11 = vert(i + 1, j + 1);
      out.push(...v00, ...v10, ...v11, ...v00, ...v11, ...v01);
    }
  }
}

/** A box from `lo` to `hi` (axis-aligned in its own frame), flat faces.
 * `s`, `t`: the face's own coordinates (metres: x, z on the top and
 * bottom; along it and up on the sides). */
export function box(out, lo, hi, part, { top = part, bottom = true } = {}) {
  const [x0, y0, z0] = lo;
  const [x1, y1, z1] = hi;
  const quad = (a, b, c, d, N, pt, st) => {
    const v = (p, k) => [...p, ...N, pt, ...st[k]];
    out.push(...v(a, 0), ...v(b, 1), ...v(c, 2), ...v(a, 0), ...v(c, 2), ...v(d, 3));
  };
  quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], top, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  if (bottom) quad([x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [0, -1, 0], part, [[x0, z0], [x0, z1], [x1, z1], [x1, z0]]);
  quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], part, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  quad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], part, [[x1, y0], [x0, y0], [x0, y1], [x1, y1]]);
  quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], part, [[z1, y0], [z0, y0], [z0, y1], [z1, y1]]);
  quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], part, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]]);
}

/**
 * Places what was pushed from float `from` on: turned `yaw` about the
 * vertical (radians, x toward −z) and moved to `at`.
 */
export function place(out, from, at, yaw = 0) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (let i = from; i < out.length; i += KIT_STRIDE) {
    const [x, y, z, nx, ny, nz] = out.slice(i, i + 6);
    out[i] = at[0] + c * x + s * z;
    out[i + 1] = at[1] + y;
    out[i + 2] = at[2] - s * x + c * z;
    out[i + 3] = c * nx + s * nz;
    out[i + 4] = ny;
    out[i + 5] = -s * nx + c * nz;
  }
}
