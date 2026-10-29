import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRASS, GRASS_INSTANCES, grassRanges } from '../components/gradient/gl/grassShader.js';

const cam = { x: 1.23, y: 6, z: -40.7 };
const ordered = runs => runs.every(([first, count], i) => count > 0 && (i === 0 || first >= runs[i - 1][0] + runs[i - 1][1]));

test('grass runs: everything seen is one draw of every blade, nothing seen is none', () => {
  assert.deepEqual(grassRanges(cam, () => true), [[0, GRASS_INSTANCES]]);
  assert.deepEqual(grassRanges(cam, () => false), []);
});

test('grass runs keep the blades in order and cover every chunk the camera sees', () => {
  // Seen: boxes whose centre lies ahead of the camera (z below it).
  const seen = (lo, hi) => (lo[2] + hi[2]) / 2 < cam.z;
  const runs = grassRanges(cam, seen);
  assert.ok(ordered(runs));
  const drawn = id => runs.some(([first, count]) => id >= first && id < first + count);
  const per = GRASS.side * GRASS.side * GRASS.blades;
  for (let ring = 0; ring < GRASS.rings; ring++) {
    const c = GRASS.cell * 2 ** ring;
    const bz = Math.floor(cam.z / c) - GRASS.side / 2;
    for (let row = 0; row < GRASS.side; row++) {
      const centre = ((bz + row - 1) * c + (bz + row + 2) * c) / 2;
      if (centre < cam.z) assert.ok(drawn(ring * per + row * GRASS.side * GRASS.blades), `ring ${ring} row ${row}`);
    }
  }
  assert.ok(runs.reduce((n, [, count]) => n + count, 0) < GRASS_INSTANCES);
});

test('flower runs use the same layout rules', async () => {
  const { FLOWER_INSTANCES, flowerRanges } = await import('../components/gradient/gl/flowerShader.js');
  assert.deepEqual(flowerRanges(cam, () => true), [[0, FLOWER_INSTANCES]]);
  assert.deepEqual(flowerRanges(cam, () => false), []);
  assert.ok(ordered(flowerRanges(cam, (lo, hi) => (lo[0] + hi[0]) / 2 > cam.x)));
});
