// (0.4.44) housePvs.js matches the house it's for, and `keep` drops runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { houseLayout } from '../components/gradient/gl/houseMesh.js';
import { houseRanges, packHouseMesh, runsChecksum, tagLampFittings } from '../components/gradient/gl/houseLights.js';
import { HOUSE_PVS } from '../components/gradient/gl/housePvs.js';

test('housePvs.js was made from the current house (else rerun scripts/house-pvs.mjs)', () => {
  const raw = houseLayout();
  tagLampFittings(raw.data);
  const { runs } = packHouseMesh(raw);
  assert.equal(HOUSE_PVS.runs, runs.first.length);
  assert.equal(HOUSE_PVS.checksum, runsChecksum(runs));
  for (const device of ['laptop', 'tablet']) assert.equal(HOUSE_PVS[device].length, runs.first.length);
});

test('houseRanges leaves out the runs keep drops, merging the rest in order', () => {
  const runs = { first: new Uint32Array([0, 6, 12, 18]), count: new Uint32Array([6, 6, 6, 6]), box: new Float32Array(24) };
  const all = () => true;
  assert.deepEqual(houseRanges(runs, all, { rooms: [], keep: new Uint8Array([1, 0, 1, 1]) }), [[0, 6], [12, 12]]);
  assert.deepEqual(houseRanges(runs, all, { rooms: [] }), [[0, 24]]);
});
