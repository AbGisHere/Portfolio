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

test('grass and flower cull=true drops under-house, phantom-mound, and beyond-reach chunks in order', async () => {
  const { FLOWER_INSTANCES, flowerRanges } = await import('../components/gradient/gl/flowerShader.js');
  // Over the house ([-9.59, 9.59] x [-81.09, -57.46]): inner rings under the house are skipped.
  const houseCam = { x: 0, y: 8, z: -69 };
  const hRuns = grassRanges(houseCam, () => true, true);
  assert.ok(ordered(hRuns));
  const hCount = hRuns.reduce((n, [, count]) => n + count, 0);
  assert.ok(hCount > 0 && hCount < GRASS_INSTANCES);

  // Away from the house mound (z = 0), tight moundY bounds keep hi[1] below 1 m instead of 3.8 m.
  const flatCam = { x: 0, y: 4, z: 0 };
  const aboveGround = (lo, hi) => hi[1] > 2.0 && hi[2] > -20;
  assert.deepEqual(grassRanges(flatCam, aboveGround, true), []);

  const fRuns = flowerRanges(cam, () => true, true);
  assert.ok(ordered(fRuns));
  const fCount = fRuns.reduce((n, [, count]) => n + count, 0);
  assert.ok(fCount > 0 && fCount < FLOWER_INSTANCES);
});

test('treeRanges merges visible sectors in order and covers every instance when all seen', async () => {
  const { TREE_STRIDE, treeLayout, treeRanges } = await import('../components/gradient/gl/treeShader.js');
  const t = treeLayout(0.42);
  assert.deepEqual(treeRanges(t.woodRuns, () => true), [[0, t.wood]]);
  assert.deepEqual(treeRanges(t.leafRuns, () => true), [[0, t.parts - t.wood]]);
  assert.deepEqual(treeRanges(t.shadowRuns, () => true), [[0, t.data.length / TREE_STRIDE - t.parts]]);
  assert.deepEqual(treeRanges(t.woodRuns, () => false), []);
  // Viewing only the south meadow (z > 0) drops all house-mound and rear-grove tree sectors (z < -60).
  const southWood = treeRanges(t.woodRuns, (lo, hi) => hi[2] > 0);
  assert.ok(ordered(southWood));
  const southCount = southWood.reduce((n, [, count]) => n + count, 0);
  assert.ok(southCount > 0 && southCount < t.wood);
});

