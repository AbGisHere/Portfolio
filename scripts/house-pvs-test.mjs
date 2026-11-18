// (0.4.44) housePvs.js matches the house it's for, and `keep` drops runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { houseLayout } from '../components/gradient/gl/houseMesh.js';
import { houseRanges, leafChecksum, packHouseMesh, runsChecksum, tagLampFittings } from '../components/gradient/gl/houseLights.js';
import { HOUSE_PVS } from '../components/gradient/gl/housePvs.js';

test('housePvs.js was made from the current house (else rerun scripts/house-pvs.mjs)', () => {
  const raw = houseLayout();
  tagLampFittings(raw.data);
  const { runs } = packHouseMesh(raw);
  assert.equal(HOUSE_PVS.runs, runs.first.length);
  assert.equal(HOUSE_PVS.checksum, runsChecksum(runs));
  for (const device of ['laptop', 'tablet']) assert.equal(HOUSE_PVS[device].length, runs.first.length);
  // (0.4.50) And the leaves' runs.
  const nLeaf = raw.leaves.reduce((n, L) => n + L.runs.first.length, 0);
  assert.equal(HOUSE_PVS.leaf.runs, nLeaf);
  assert.equal(HOUSE_PVS.leaf.checksum, leafChecksum(raw.leaves));
  for (const device of ['laptop', 'tablet']) assert.equal(HOUSE_PVS.leaf[device].length, nLeaf);
});

test('cacheUniforms sends a value only when it changes, per location', async () => {
  const { cacheUniforms } = await import('../components/gradient/gl/uniformCache.js');
  const sent = [];
  const gl = {};
  for (const n of ['uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniform1i', 'uniform2i', 'uniform3i', 'uniform4i', 'uniform1ui', 'uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv', 'uniform1iv', 'uniform2iv', 'uniform3iv', 'uniform4iv', 'uniformMatrix3fv', 'uniformMatrix4fv']) gl[n] = (...a) => sent.push([n, ...a]);
  cacheUniforms(gl);
  const a = {}, b = {};
  gl.uniform1f(a, 0.1); gl.uniform1f(a, 0.1); gl.uniform1f(b, 0.1); gl.uniform1f(a, 0.2);
  gl.uniform3fv(a, [1, 2, 3]); gl.uniform3fv(a, new Float32Array([1, 2, 3])); gl.uniform3fv(a, [1, 2, 4]);
  gl.uniformMatrix4fv(b, false, new Float32Array(16)); gl.uniformMatrix4fv(b, false, new Float32Array(16));
  gl.uniform3fv(a, new Float32Array(30)); gl.uniform3fv(a, new Float32Array(30));
  gl.uniform1f(null, 1);
  assert.equal(sent.length, 8);
});

test('houseRanges leaves out the runs keep drops, merging the rest in order', () => {
  const runs = { first: new Uint32Array([0, 6, 12, 18]), count: new Uint32Array([6, 6, 6, 6]), box: new Float32Array(24) };
  const all = () => true;
  assert.deepEqual(houseRanges(runs, all, { rooms: [], keep: new Uint8Array([1, 0, 1, 1]) }), [[0, 6], [12, 12]]);
  assert.deepEqual(houseRanges(runs, all, { rooms: [] }), [[0, 24]]);
});
