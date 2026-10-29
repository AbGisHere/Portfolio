import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIGHTS, STRIPS, lightCells } from '../components/gradient/gl/houseLights.js';

// Every light or strip in reach of a point is in its cell's list, in order.
test('a light cell lists every light and strip that reaches any point in it, in their order', () => {
  const { lo, n, size, heads, list } = lightCells();
  let seed = 7;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const segment = (p, a, b) => {
    const ab = a.map((v, i) => b[i] - v);
    const t = Math.max(0, Math.min(1, ab.reduce((s, v, i) => s + (p[i] - a[i]) * v, 0) / (ab.reduce((s, v) => s + v * v, 0) || 1)));
    return Math.hypot(...p.map((v, i) => v - (a[i] + ab[i] * t)));
  };
  let checked = 0;
  for (let k = 0; k < 20000; k++) {
    const p = lo.map((v, a) => v + rand() * n[a] * size);
    const c = p.map((v, a) => Math.min(n[a] - 1, Math.floor((v - lo[a]) / size)));
    const h = (c[0] + n[0] * (c[1] + n[1] * c[2])) * 4;
    const lamps = [...list.subarray(heads[h], heads[h] + heads[h + 1])];
    const strips = [...list.subarray(heads[h + 2], heads[h + 2] + heads[h + 3])];
    for (const xs of [lamps, strips]) for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1]);
    LIGHTS.forEach((l, i) => { if (Math.hypot(...p.map((v, a) => v - l.p[a])) <= l.r) { assert.ok(lamps.includes(i), `light ${i}`); checked++; } });
    STRIPS.forEach((s, i) => { if (segment(p, s.a, s.b) <= s.r) { assert.ok(strips.includes(i), `strip ${i}`); checked++; } });
  }
  assert.ok(checked > 1000);
});
