// (0.4.48) The house's leaves as instances (leafInstances.js): the vertex
// shader's sums (LEAF_GLSL, here in JS) give the leaves plantMesh.js meshed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEAF_INSTANCE_STRIDE, LEAF_TEMPLATES, leafSink, leafTemplate } from '../components/gradient/gl/leafInstances.js';
import { collectLeaves, fig, olive } from '../components/gradient/gl/plantMesh.js';

const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const l = Math.hypot(...a); return a.map(x => x / l); };

// One template vertex `d` of an instance `I`, as LEAF_GLSL computes it.
function vertex(I, d) {
  const p = I.slice(0, 3), dir = I.slice(3, 6), side = I.slice(6, 9);
  const [len, wid, cup, droop] = I.slice(9, 13);
  const [u, v, h, uA, uB, hA, hB, vC, vD] = d;
  const face = unit(crs(side, dir));
  const W = l => [0, 1, 2].map(c => dir[c] * l[0] + side[c] * l[1] + face[c] * l[2]);
  const half = wid * h;
  const q = p.map((x, c) => x + dir[c] * len * u + side[c] * half * v + face[c] * (cup * half * v * v - droop * len * u * u));
  const dh = hA - hB;
  const du = [len * (uA - uB), wid * dh * v, cup * wid * dh * v * v - droop * len * (uA * uA - uB * uB)];
  const dw = [0, half * (vC - vD), cup * half * (vC * vC - vD * vD)];
  const raw = crs(W(dw), W(du));
  let N = Math.hypot(...raw) > 1e-14 ? unit(raw) : face;
  if (N[0] * face[0] + N[1] * face[1] + N[2] * face[2] < 0) N = N.map(x => -x);
  return [...q, ...N, I[13], u, v];
}

test('leaf instances rebuild the meshed leaves', () => {
  const build = s => {
    collectLeaves(s);
    const out = [];
    olive(out, [0, 0, 0], 2.6, 7);
    fig(out, [1, 0, 0], 1.75, 5);
    collectLeaves(null);
    return out;
  };
  const meshed = build(null);
  const calls = [];
  const sink = leafSink();
  const rest = build({ add: (t, ...a) => { calls.push(t); sink.add(t, ...a); } });
  const packs = sink.pack();
  const tpls = LEAF_TEMPLATES.map(t => leafTemplate(...t));
  const next = new Map(packs.map(p => [p.template, 0]));
  // The leaves came out in call order; anything else (stems, the fig's
  // stalks) is in `rest`, in its order.
  const leafVerts = [];
  for (const t of calls) {
    const pk = packs.find(p => p.template === t);
    const i = next.get(t);
    next.set(t, i + 1);
    const I = Array.from(pk.data.subarray(i * LEAF_INSTANCE_STRIDE, (i + 1) * LEAF_INSTANCE_STRIDE));
    for (const j of tpls[t].indices) leafVerts.push(vertex(I, tpls[t].data.subarray(j * 9, j * 9 + 9)));
  }
  assert.ok(calls.length > 1000);
  assert.equal(meshed.length, rest.length + leafVerts.length * 9);
  // The meshed leaves and the rest interleave; match leaves in order.
  let r = 0, l = 0, worst = 0;
  for (let o = 0; o < meshed.length; o += 9) {
    if (r < rest.length && rest.slice(r, r + 9).every((x, k) => x === meshed[o + k])) { r += 9; continue; }
    const v = leafVerts[l++];
    for (let k = 0; k < 9; k++) worst = Math.max(worst, Math.abs(v[k] - meshed[o + k]));
  }
  assert.equal(l, leafVerts.length);
  // (The instances are float32, as the mesh was.)
  assert.ok(worst < 1e-5, `worst ${worst}`);
});
