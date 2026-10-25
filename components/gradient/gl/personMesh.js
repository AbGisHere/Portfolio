/**
 * (0.4.24) The person who walks from the desk to the house: the design,
 * not yet the walk. Stylised, small in the frame, never a likeness: seen
 * from behind and at a distance, so the silhouette, the proportions and
 * the clothes carry it, not a face.
 *
 * - **Proportions:** 1.78 m, about seven and a half heads; shoulders
 *   0.44 m, hips 0.34 m; long legs, the waist at 1.05 m.
 * - **Clothes:** an off-white linen shirt, untucked, its sleeves rolled to
 *   the forearm, the collar open; navy chinos to the ankle; tan leather
 *   shoes; dark hair, short. Skin a warm mid tone. (A robe or a towel for
 *   the pool is still open.)
 * - **Built on a skeleton** (`POSES`, `personMesh(pose)`): every limb a
 *   tapered form between two joints of a pose (pelvis, spine, neck, head;
 *   shoulders, elbows, wrists; hips, knees, ankles, toes), the clothes
 *   over them, so the walk to come only moves the joints: `stand`, and two
 *   poses of a stride for the walk's keys (`stride`, its contact; `pass`,
 *   the passing pose).
 *
 * Its parts are the house's (HOUSE_PART.person, houseShader.js), so it's
 * lit as the house is. Facing +z, its feet at the origin.
 */

import { HOUSE_PART } from './houseShape';
import { add, ball, cross, soft, sweep, tube, unit } from './meshKit';

const P = HOUSE_PART;
const v = k => P.person + k;
export const SKIN = v(0.1);
export const HAIR = v(0.3);
export const SHIRT = v(0.5);
export const TROUSERS = v(0.7);
export const SHOES = v(0.9);

/**
 * The poses: each joint (x, y, z, metres; +z its front). A stride's front
 * foot is its right.
 */
const base = {
  pelvis: [0, 1.0, 0], spine: [0, 1.25, 0], chest: [0, 1.36, 0], neck: [0, 1.52, 0], head: [0, 1.66, 0],
  shL: [-0.2, 1.46, 0], elL: [-0.24, 1.17, -0.01], wrL: [-0.25, 0.92, 0.02],
  shR: [0.2, 1.46, 0], elR: [0.24, 1.17, -0.01], wrR: [0.25, 0.92, 0.02],
  hipL: [-0.095, 0.96, 0], knL: [-0.1, 0.52, 0.02], anL: [-0.1, 0.09, -0.01], toL: [-0.1, 0.02, 0.15],
  hipR: [0.095, 0.96, 0], knR: [0.1, 0.52, 0.02], anR: [0.1, 0.09, -0.01], toR: [0.1, 0.02, 0.15],
};
const pose = d => ({ ...base, ...d });
export const POSES = {
  stand: base,
  // The contact: the right heel down ahead, the left toe pushing off
  // behind, the arms swung against them.
  stride: pose({
    pelvis: [0, 0.98, 0], spine: [0, 1.23, 0.01], chest: [0, 1.34, 0.02], neck: [0, 1.5, 0.03], head: [0, 1.64, 0.04],
    elL: [-0.24, 1.18, 0.12], wrL: [-0.24, 0.95, 0.24], elR: [0.24, 1.17, -0.12], wrR: [0.25, 0.94, -0.2],
    knR: [0.1, 0.55, 0.22], anR: [0.1, 0.1, 0.36], toR: [0.1, 0.06, 0.52],
    knL: [-0.1, 0.52, -0.1], anL: [-0.1, 0.16, -0.36], toL: [-0.1, 0.02, -0.24],
  }),
  // The passing pose: the left leg swinging through, its knee bent.
  pass: pose({
    pelvis: [0, 1.01, 0], spine: [0, 1.26, 0.005], chest: [0, 1.37, 0.01], neck: [0, 1.53, 0.015], head: [0, 1.67, 0.02],
    knL: [-0.1, 0.56, 0.12], anL: [-0.1, 0.2, -0.04], toL: [-0.1, 0.15, 0.1],
  }),
};

/** A tapered limb from a to b, r0 to r1, flattened by `flat` (its depth to
 * its width) about `side` (the way its width runs). */
function limb(out, a, b, r0, r1, part, n = 12) {
  const pts = [];
  for (let i = 0; i <= 4; i++) pts.push(add(a, add(b, a, -1), i / 4));
  for (let i = 0; i < 4; i++) tube(out, pts[i], pts[i + 1], r0 + ((r1 - r0) * (i + 0.5)) / 4, part, n);
  ball(out, a, r0, part, n, 6);
  ball(out, b, r1, part, n, 6);
}

/** The person in a pose, for the house's pass: { data, count }. */
export function personMesh(name = 'stride') {
  const J = POSES[name];
  const out = [];
  const mid = (a, b, t = 0.5) => add(a, add(b, a, -1), t);
  // The head and the hair: a head a little longer than wide, hair short
  // over its crown and back, the ears; the neck.
  soft(out, J.head, [0.078, 0.112, 0.092], SKIN, { e1: 0.7, e2: 0.85, nu: 24, nv: 14 });
  soft(out, add(J.head, [0, 0.035, -0.012]), [0.084, 0.09, 0.097], HAIR, { e1: 0.6, e2: 0.85, nu: 24, nv: 12, lower: false });
  for (const s of [-1, 1]) soft(out, add(J.head, [s * 0.077, -0.005, -0.005]), [0.012, 0.028, 0.018], SKIN, { e1: 0.8, e2: 0.8, nu: 8, nv: 6 });
  limb(out, J.neck, add(J.head, [0, -0.08, -0.01]), 0.052, 0.048, SKIN);
  // The shirt's body: chest to below the belt, loose; the collar open.
  const torso = (y, w, d, at) => soft(out, at, [w, y, d], SHIRT, { e1: 0.35, e2: 0.55, nu: 28, nv: 12 });
  torso(0.13, 0.205, 0.125, mid(J.chest, J.neck, 0.15));
  torso(0.15, 0.19, 0.12, mid(J.spine, J.chest, 0.3));
  torso(0.12, 0.185, 0.118, add(J.pelvis, [0, 0.08, 0]));
  const collar = [];
  for (let i = 0; i <= 12; i++) {
    // Round the neck's back from one side of the open front to the other.
    const a = Math.PI * (0.22 + 1.56 * (i / 12));
    collar.push(add(J.neck, [Math.sin(a) * 0.066, -0.012 - 0.018 * Math.cos(a), -Math.cos(a) * 0.062]));
  }
  sweep(out, collar, 0.012, SHIRT, { seg: 6 });
  // The arms: the shoulder in the shirt, the sleeve rolled to the
  // forearm, the forearm bare, the hand.
  for (const s of ['L', 'R']) {
    const sh = J['sh' + s];
    const el = J['el' + s];
    const wr = J['wr' + s];
    limb(out, sh, el, 0.058, 0.046, SHIRT);
    const roll = mid(el, wr, 0.25);
    limb(out, el, roll, 0.05, 0.048, SHIRT);
    tube(out, mid(el, wr, 0.2), mid(el, wr, 0.3), 0.054, SHIRT, 12);
    limb(out, roll, wr, 0.036, 0.028, SKIN);
    const hand = add(wr, unit(add(wr, el, -1)), 0.07);
    soft(out, mid(wr, hand), [0.026, 0.06, 0.042], SKIN, { e1: 0.6, e2: 0.7, nu: 12, nv: 8, ax: axisAlong(add(hand, wr, -1)) });
  }
  // The trousers: the seat over the hips, each leg tapering to the ankle,
  // a little break over the shoe.
  soft(out, add(J.pelvis, [0, -0.02, 0]), [0.175, 0.1, 0.115], TROUSERS, { e1: 0.4, e2: 0.6, nu: 28, nv: 10 });
  for (const s of ['L', 'R']) {
    const hp = J['hip' + s];
    const kn = J['kn' + s];
    const an = J['an' + s];
    limb(out, hp, kn, 0.085, 0.06, TROUSERS);
    limb(out, kn, add(an, [0, 0.03, 0]), 0.058, 0.048, TROUSERS);
    // The shoe: a heel, the vamp toward the toe, its sole.
    const to = J['to' + s];
    const along = unit(add(to, an, -1));
    const shoeMid = mid(an, to, 0.45);
    soft(out, add(shoeMid, [0, -0.015, 0]), [0.048, 0.042, 0.145], SHOES, { e1: 0.45, e2: 0.5, nu: 18, nv: 8, ax: axisAlong(along, true) });
    soft(out, add(shoeMid, [0, -0.052, 0]), [0.05, 0.008, 0.15], P.person + 0.97, { e1: 0.2, e2: 0.4, nu: 18, nv: 4, ax: axisAlong(along, true) });
  }
  const data = new Float32Array(out);
  return { data, count: data.length / 9 };
}

// Axes for a soft form whose length (its y, or its z with `forward`) runs
// along d.
function axisAlong(d, forward = false) {
  const n = unit(d);
  if (forward) {
    const x = unit(cross([0, 1, 0], n));
    const y = cross(n, x);
    return [x, y, n];
  }
  const x = unit(cross(n, Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const z = cross(x, n);
  return [x, n, z];
}

