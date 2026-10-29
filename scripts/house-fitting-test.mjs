import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FITTING_PER_PIXEL, LIGHTS, tagLampFittings } from '../components/gradient/gl/houseLights.js';
import { HOUSE_PART } from '../components/gradient/gl/houseShape.js';

// One lamp triangle (9 floats a vertex: position, normal, part, st) per entry.
const lampTriangles = tris => {
  const data = new Float32Array(tris.length * 27);
  tris.forEach((tri, t) => tri.forEach((p, v) => {
    data.set([...p, 0, 1, 0, HOUSE_PART.lamp, 0, 0], t * 27 + v * 9);
  }));
  return data;
};
const tags = data => Array.from({ length: data.length / 27 }, (_, t) => [7, 16, 25].map(o => data[t * 27 + o]));
const near = (p, dx, dy) => [p[0] + dx, p[1] + dy, p[2]];

test('lamp triangles take one fitting, or per pixel where the nearest one changes inside them', () => {
  // Lights 69 and 70 are the nearest pair (0.62 m apart).
  const a = LIGHTS[69].p;
  const b = LIGHTS[70].p;
  const data = lampTriangles([
    [near(a, 0, 0.02), near(a, 0.02, 0), near(a, -0.02, 0)],
    [near(a, 0, 0.02), near(b, 0, 0.02), near(b, 0.02, 0)],
    [[0, -50, 0], [0.1, -50, 0], [0, -50, 0.1]],
  ]);
  tagLampFittings(data);
  assert.deepEqual(tags(data), [[69, 69, 69], [FITTING_PER_PIXEL, FITTING_PER_PIXEL, FITTING_PER_PIXEL], [-1, -1, -1]]);
});
