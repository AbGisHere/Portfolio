// (0.4.56) The prebuilt house decodes to the same meshes, byte for byte.
// (0.4.57) And its packed vertices unpack to the float ones, bit for bit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { houseLayout } from '../components/gradient/gl/houseMesh.js';
import { curtainMesh } from '../components/gradient/gl/houseRooms.js';
import { CURTAIN_STRIDE, HOUSE_STRIDE, packCurtainMesh, packHouseMesh, tagLampFittings } from '../components/gradient/gl/houseLights.js';
import { packMeshes } from '../components/gradient/gl/houseBuild.js';
import { PACKED_WORDS, unpackVertices } from '../components/gradient/gl/houseVertices.js';
import { encodeHouse, decodeHouse } from '../components/gradient/gl/houseBlob.js';

// buildHouse(), with the float vertices kept to compare.
const raw = houseLayout();
tagLampFittings(raw.data);
const floats = { house: packHouseMesh(raw), curtains: packCurtainMesh(curtainMesh()) };
const before = { house: floats.house.vertices, curtains: floats.curtains.vertices };
const a = packMeshes({ house: { ...floats.house }, curtains: { ...floats.curtains } });

const bytes = v => Buffer.from(v.buffer, v.byteOffset, v.byteLength);

test('the house packs to 20 bytes a vertex and unpacks exactly', () => {
  assert.equal(a.house.vertices.length, (before.house.length / HOUSE_STRIDE) * PACKED_WORDS);
  assert.ok(bytes(unpackVertices(a.house.vertices, HOUSE_STRIDE, a.house.tables)).equals(bytes(before.house)));
  assert.ok(bytes(unpackVertices(a.curtains.vertices, CURTAIN_STRIDE, a.house.tables)).equals(bytes(before.curtains)));
});

test('houseBlob round-trips the built house exactly', () => {
  const blob = encodeHouse(a);
  const b = decodeHouse(blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength));
  const same = (x, y, path) => {
    if (ArrayBuffer.isView(x)) {
      assert.equal(y.constructor, x.constructor, path);
      assert.ok(bytes(x).equals(bytes(y)), path);
    } else if (x && typeof x === 'object') {
      assert.deepEqual(Object.keys(y).sort(), Object.keys(x).sort(), path);
      for (const k of Object.keys(x)) same(x[k], y[k], `${path}.${k}`);
    } else assert.equal(y, x, path);
  };
  same(a, b, 'meshes');
});
