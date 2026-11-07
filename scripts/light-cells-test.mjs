import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIGHTS, STRIPS, ZONE_BOXES, lightCells, roomOfPoint } from '../components/gradient/gl/houseLights.js';
import { FLOOR, PLAN, STOREY, TERRACE } from '../components/gradient/gl/houseShape.js';

// Every light or strip that can illuminate a point is in its cell's list, in order.
test('a light cell lists every light and strip that reaches and illuminates any point in it, in their order', () => {
  const { lo, n, size, heads, list } = lightCells();
  assert.ok(list.length < 24000, `expected pruned light cell list < 24000, got ${list.length}`);
  let seed = 7;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const top = FLOOR + STOREY - 0.35;
  const utop = TERRACE + STOREY - 0.35;
  const open0 = [-7.4, 4.6, FLOOR, top, PLAN.ground.z[1]];
  const open1 = [-7.2, 2.6, TERRACE, utop, PLAN.upper.z[1]];
  const frontZones = new Set(ZONE_BOXES.filter(z => z.light === 1).map(z => z.id));
  const lampIlluminates = (l, p, room) => {
    if (l.k <= 0 || (l.day === 0 && l.night === 0)) return false;
    const dx = l.p[0] - p[0], dy = l.p[1] - p[1], dz = l.p[2] - p[2];
    const d = Math.hypot(dx, dy, dz);
    if (d > l.r) return false;
    if (l.zone !== room) {
      if (!(room === 0 && frontZones.has(l.zone))) return false;
      const o = l.p[1] > TERRACE ? open1 : open0;
      const gz = o[4];
      if (p[2] <= gz) return false;
      const t = (gz - l.p[2]) / (p[2] - l.p[2]);
      const cx = l.p[0] + (p[0] - l.p[0]) * t;
      const cy = l.p[1] + (p[1] - l.p[1]) * t;
      if (!(cx > o[0] && cx < o[1] && cy > o[2] && cy < o[3])) return false;
    }
    const Ldx = dx / Math.max(d, 1e-6), Ldy = dy / Math.max(d, 1e-6), Ldz = dz / Math.max(d, 1e-6);
    if (l.kind === 4 && -Ldy <= 0.55) return false;
    if (l.kind === 5 && Ldy <= 0.93) return false;
    if (l.kind === 6 || l.kind === 7) {
      const edge = l.kind === 6 ? 2 * l.cone - 1 : l.cone;
      if (-Ldx * l.dir[0] - Ldy * l.dir[1] - Ldz * l.dir[2] <= edge) return false;
    }
    return true;
  };
  const stripIlluminates = (s, p, room) => {
    if (s.k <= 0 || (s.day === 0 && s.night === 0) || s.zone !== room) return false;
    const ab = s.a.map((v, i) => s.b[i] - v);
    const t = Math.max(0, Math.min(1, ab.reduce((acc, v, i) => acc + (p[i] - s.a[i]) * v, 0) / (ab.reduce((acc, v) => acc + v * v, 0) || 1)));
    const c = s.a.map((v, i) => v + ab[i] * t);
    const d = Math.hypot(...p.map((v, i) => v - c[i]));
    if (d > s.r) return false;
    const front = (p[0] - c[0]) * s.d[0] + (p[1] - c[1]) * s.d[1] + (p[2] - c[2]) * s.d[2];
    return front > 0;
  };
  let checked = 0;
  for (let k = 0; k < 20000; k++) {
    const p = lo.map((v, a) => v + rand() * n[a] * size);
    const room = roomOfPoint(p[0], p[1], p[2]);
    const c = p.map((v, a) => Math.min(n[a] - 1, Math.floor((v - lo[a]) / size)));
    const h = (c[0] + n[0] * (c[1] + n[1] * c[2])) * 4;
    const lamps = [...list.subarray(heads[h], heads[h] + heads[h + 1])];
    const strips = [...list.subarray(heads[h + 2], heads[h + 2] + heads[h + 3])];
    for (const xs of [lamps, strips]) for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1]);
    LIGHTS.forEach((l, i) => { if (lampIlluminates(l, p, room)) { assert.ok(lamps.includes(i), `light ${i}`); checked++; } });
    STRIPS.forEach((s, i) => { if (stripIlluminates(s, p, room)) { assert.ok(strips.includes(i), `strip ${i}`); checked++; } });
  }
  assert.ok(checked > 1000);
});
