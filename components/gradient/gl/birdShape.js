/**
 * (0.4.4) The birds' bodies, built in code per species, in the bird's own
 * frame (x to its right, y up, z ahead, metres, its body's middle at the
 * origin): a body, a head and bill, a tail, and two wings, each an inner
 * arm from the shoulder to the wrist and a hand from the wrist to the tip,
 * shaped to the species' outline, its trailing edge cut into feathers.
 *
 * Every vertex is BIRD_STRIDE floats: position (3), normal (3), `joint`
 * (0 the body, 1 the arm, 2 the hand) × side (±), the material, and its
 * place along the wing (0 shoulder … 1 tip). birdShader.js turns the arm
 * about the shoulder and the hand about the wrist as the wings beat and
 * fold.
 */

import { add, cross, unit } from './meshKit';

export const BIRD_STRIDE = 9;

/**
 * The species: their wings' joints (x of the shoulder and wrist, y, z),
 * span (half, metres), the arm's and the hand's chord, how swept the hand
 * is, the tail, how they fly (BIRD_FLIGHT, birdFlight.js reads these too).
 */
export const SPECIES = {
  // The barn swallow: small, long crescent wings swept back to points, a
  // deep fork in its tail; blue-black above, pale beneath.
  swallow: { body: [0.021, 0.02, 0.06], head: 0.016, half: 0.17, shoulder: [0.017, 0.006, 0.012], wrist: 0.065, chord: [0.055, 0.04], sweep: 0.5, tail: [0.07, 0.06, 0.9], fingers: 0 },
  // The red kite: long broad wings, six fingered primaries at the tips, a
  // long deeply forked rufous tail.
  kite: { body: [0.065, 0.06, 0.24], head: 0.045, half: 0.82, shoulder: [0.05, 0.02, 0.05], wrist: 0.36, chord: [0.38, 0.32], sweep: 0.12, tail: [0.3, 0.2, 0.4], fingers: 6 },
  // The greylag goose: a heavy body, a long neck, broad wings, a short tail.
  goose: { body: [0.12, 0.11, 0.42], head: 0.055, half: 0.8, shoulder: [0.08, 0.04, 0.08], wrist: 0.34, chord: [0.3, 0.2], sweep: 0.2, tail: [0.14, 0.12, 0.0], fingers: 4, neck: 0.42 },
  // (0.4.24) A butterfly's wings hinge on its body's axis (butterflies.js
  // builds it; only its joints here).
  butterfly: { shoulder: [0.002, 0, 0], wrist: 1 },
};

/** The materials (birdShader.js): the body above, its belly, the wings
 * above and below, the bill, the eye. */
export const BIRD_PART = { back: 0, belly: 1, wingTop: 2, wingUnder: 3, bill: 4, eye: 5 };

function tri(out, a, b, c, joint, part, along) {
  const n = unit(cross(add(b, a, -1), add(c, a, -1)));
  for (let i = 0; i < 3; i++) out.push(...[a, b, c][i], ...n, joint, part, along[i]);
}

/** An ellipsoid round c, half-sizes h, `top`/`under` its parts above and
 * below (the body, the head). */
function ellipsoid(out, c, h, top, under, nu = 14, nv = 8, joint = 0) {
  const P = (i, j) => {
    const th = (i / nu) * Math.PI * 2;
    const ph = -Math.PI / 2 + (j / nv) * Math.PI;
    return [c[0] + h[0] * Math.cos(ph) * Math.cos(th), c[1] + h[1] * Math.sin(ph), c[2] + h[2] * Math.cos(ph) * Math.sin(th)];
  };
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const [a, b, d, e] = [P(i, j), P(i + 1, j), P(i, j + 1), P(i + 1, j + 1)];
      const part = j < nv / 2 ? under : top;
      const quad = [[a, b, e], [a, e, d]];
      for (const [p, q, r] of quad) {
        // Smooth: each corner's own normal off the middle.
        for (const v of [p, q, r]) {
          const n = unit([(v[0] - c[0]) / (h[0] * h[0]), (v[1] - c[1]) / (h[1] * h[1]), (v[2] - c[2]) / (h[2] * h[2])]);
          out.push(...v, ...n, joint, part, 0);
        }
      }
    }
  }
}

/**
 * One wing on `side` (±1): the outline traced as a leading edge and a
 * trailing edge from the shoulder to the tip, filled in as strips; both
 * faces (the top's and the underside's materials), a slight camber.
 * Along it, the arm to the wrist, the hand beyond.
 */
function wing(out, sp, side) {
  const [sx, sy, sz] = sp.shoulder;
  const n = 14;
  const lead = [];
  const trail = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = sx + (sp.half - sx) * u;
    const hand = Math.max(0, (x - sp.wrist) / (sp.half - sp.wrist));
    // The chord: the arm's, narrowing through the hand to the tip.
    const c = x < sp.wrist ? sp.chord[0] * (1 - 0.15 * (x - sx) / (sp.wrist - sx)) : sp.chord[1] * (1 - hand) ** (sp.fingers ? 0.35 : 0.8) + (sp.fingers ? 0.02 * sp.half : 0.004);
    // Swept: the hand's leading edge bends back.
    const back = sp.sweep * sp.half * hand * hand;
    const camber = 0.04 * c * Math.sin(Math.PI * Math.min(1, u * 1.3));
    lead.push([side * x, sy + camber, sz + 0.25 * c - back]);
    // The trailing edge cut into feathers: secondaries along the arm, the
    // primaries spread as fingers at a kite's or a goose's tip.
    const feather = sp.fingers && hand > 0.55 ? 0.6 * Math.abs(Math.sin(((hand - 0.55) / 0.45) * Math.PI * sp.fingers)) : 0.08 * Math.abs(Math.sin(u * Math.PI * 9));
    trail.push([side * x, sy, sz - 0.75 * c * (1 + 0.1 * feather) - back - 0.2 * c * hand * (sp.fingers ? 0 : 1)]);
  }
  for (let i = 0; i < n; i++) {
    const u0 = i / n;
    const u1 = (i + 1) / n;
    const x0 = sx + (sp.half - sx) * u0;
    const joint = (x0 < sp.wrist ? 1 : 2) * side;
    const [a, b, c, d] = [lead[i], lead[i + 1], trail[i + 1], trail[i]];
    const along = [u0, u1, u1];
    const top = side > 0 ? [a, b, c] : [a, c, b];
    const top2 = side > 0 ? [a, c, d] : [a, d, c];
    tri(out, ...top, joint, BIRD_PART.wingTop, along);
    tri(out, ...top2, joint, BIRD_PART.wingTop, [u0, u1, u0]);
    // The underside, a hair below.
    const dn = p => add(p, [0, -0.0015 * sp.half, 0]);
    tri(out, dn(top[0]), dn(top[2]), dn(top[1]), joint, BIRD_PART.wingUnder, [u0, u1, u1]);
    tri(out, dn(top2[0]), dn(top2[2]), dn(top2[1]), joint, BIRD_PART.wingUnder, [u0, u0, u1]);
  }
}

/** A tail: a fan (or, forked, two streamers) behind the body. */
function tail(out, sp) {
  const [w, l, fork] = sp.tail;
  const root = [0, 0, -sp.body[2] * 0.85];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t0 = i / n - 0.5;
    const t1 = (i + 1) / n - 0.5;
    const len = t => l * (1 + fork * (Math.abs(t) * 2) ** 2 - fork * 0.5);
    const p0 = add(root, [t0 * w, 0, -len(t0)]);
    const p1 = add(root, [t1 * w, 0, -len(t1)]);
    tri(out, root, p1, p0, 0, BIRD_PART.back, [0, 0, 0]);
    tri(out, add(root, [0, -0.001, 0]), add(p0, [0, -0.001, 0]), add(p1, [0, -0.001, 0]), 0, BIRD_PART.belly, [0, 0, 0]);
  }
}

/** A species' bird: `{ data, count }`. */
export function birdMesh(name) {
  const sp = SPECIES[name];
  const out = [];
  const [bw, bh, bl] = sp.body;
  ellipsoid(out, [0, 0, 0], [bw, bh, bl], BIRD_PART.back, BIRD_PART.belly);
  // The head, on a neck for the goose; the bill; the eyes.
  const neck = sp.neck ?? 0;
  const headAt = [0, bh * 0.4 + neck * 0.15, bl * 0.9 + neck];
  if (neck) {
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      ellipsoid(out, [0, bh * 0.2 + neck * 0.15 * t, bl * 0.75 + neck * t], [bw * 0.32, bw * 0.34, neck * 0.12], BIRD_PART.back, BIRD_PART.belly, 8, 6);
    }
  }
  ellipsoid(out, headAt, [sp.head * 0.85, sp.head * 0.8, sp.head], BIRD_PART.back, BIRD_PART.belly, 10, 6);
  const billBase = add(headAt, [0, -sp.head * 0.1, sp.head * 0.8]);
  const billTip = add(billBase, [0, -sp.head * 0.15, sp.head * (neck ? 1.4 : 0.7)]);
  const bwid = sp.head * (neck ? 0.35 : 0.3);
  tri(out, add(billBase, [-bwid, 0, 0]), add(billBase, [bwid, 0, 0]), billTip, 0, BIRD_PART.bill, [0, 0, 0]);
  tri(out, add(billBase, [bwid, -bwid * 0.6, 0]), add(billBase, [-bwid, -bwid * 0.6, 0]), billTip, 0, BIRD_PART.bill, [0, 0, 0]);
  tri(out, add(billBase, [-bwid, 0, 0]), billTip, add(billBase, [-bwid, -bwid * 0.6, 0]), 0, BIRD_PART.bill, [0, 0, 0]);
  tri(out, add(billBase, [bwid, 0, 0]), add(billBase, [bwid, -bwid * 0.6, 0]), billTip, 0, BIRD_PART.bill, [0, 0, 0]);
  for (const s of [-1, 1]) ellipsoid(out, add(headAt, [s * sp.head * 0.7, sp.head * 0.2, sp.head * 0.45]), [sp.head * 0.18, sp.head * 0.18, sp.head * 0.12], BIRD_PART.eye, BIRD_PART.eye, 6, 4);
  tail(out, sp);
  wing(out, sp, 1);
  wing(out, sp, -1);
  const data = new Float32Array(out);
  return { data, count: data.length / BIRD_STRIDE };
}

/** The wrist of a species' wing on its right (x, y, z): where the hand
 * turns about. */
export const wristOf = name => {
  const sp = SPECIES[name];
  return [sp.wrist, sp.shoulder[1], sp.shoulder[2]];
};

