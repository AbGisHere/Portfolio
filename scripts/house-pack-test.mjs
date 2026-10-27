import assert from 'node:assert/strict';
import { test } from 'node:test';
import { packCurtainMesh, packHouseMesh } from '../components/gradient/gl/houseLights.js';

const rawHouse = (data, lawn = 0) => ({ data, count: data.length / 9, lawn, glass: [], mirrors: [] });
const assertRoundTrip = (source, packed, stride) => {
  const expected = new Uint32Array(source.buffer, source.byteOffset, source.length);
  const vertices = new Uint32Array(packed.vertices.buffer, packed.vertices.byteOffset, packed.vertices.length);
  assert.equal(packed.indices.length * stride, expected.length);
  for (let i = 0; i < packed.indices.length; i++) {
    for (let w = 0; w < stride; w++) {
      assert.equal(vertices[packed.indices[i] * stride + w], expected[i * stride + w], `vertex ${i}, attribute ${w}`);
    }
  }
};

for (const stride of [9, 15]) {
  const pack = data => stride === 9 ? packHouseMesh(rawHouse(data, 3)) : packCurtainMesh({ data, count: data.length / stride });
  test(`${stride}-attribute indexing preserves original order and every attribute bit from a subarray`, () => {
    const backing = new Float32Array(6 * stride + 16);
    new Uint32Array(backing.buffer).fill(0xdeadbeef);
    const data = backing.subarray(8, 8 + 6 * stride);
    const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
    for (let v = 0; v < 3; v++) for (let w = 0; w < stride; w++) data[v * stride + w] = v * 10 + w / 4;
    bits.set(bits.subarray(0, 3 * stride), 3 * stride);
    // Equal positions but different normal/UV/material/morph data must not merge.
    bits[3 * stride + 3] = 0x80000000;
    bits[4 * stride + 7] = 0x7fc00001;
    bits[5 * stride + 7] = 0x7fc00002;
    const before = new Uint32Array(bits);
    const packed = pack(data);
    assertRoundTrip(data, packed, stride);
    assert.equal(packed.vertexCount, 6);
    assert.deepEqual(bits, before, 'packing does not mutate source');
    assert.equal(new Uint32Array(backing.buffer)[0], 0xdeadbeef, 'source prefix is not read as mesh data');
  });

  test(`${stride}-attribute indexing shares identical tuples without merging signed zero or morph poses`, () => {
    const data = new Float32Array(6 * stride);
    for (let v = 0; v < 3; v++) for (let w = 0; w < stride; w++) data[v * stride + w] = v * 10 + w;
    data.set(data.subarray(0, 3 * stride), 3 * stride);
    const packed = pack(data);
    assert.equal(packed.vertexCount, 3);
    assert.deepEqual([...packed.indices], [0, 1, 2, 0, 1, 2]);
    assertRoundTrip(data, packed, stride);
    new Uint32Array(data.buffer)[3 * stride] = 0x80000000;
    if (stride === 15) data[4 * stride + 14] += 1;
    const distinct = pack(data);
    assert.equal(distinct.vertexCount, stride === 15 ? 5 : 4);
    assertRoundTrip(data, distinct, stride);
  });

  test(`${stride}-attribute indexing grows beyond its initial hash capacity without losing unique vertices`, () => {
    const count = 6000;
    const data = new Float32Array(count * stride);
    for (let v = 0; v < count; v++) {
      data[v * stride] = v;
      data[v * stride + 1] = v % 17;
      data[v * stride + stride - 1] = v / 8;
    }
    const packed = pack(data);
    assert.equal(packed.vertexCount, count);
    assert.equal(packed.indices[count - 1], count - 1);
    assertRoundTrip(data, packed, stride);
  });
}

test('house keeps a lawn prefix and one complete solid range with no reflection or detail exclusions', () => {
  const data = new Float32Array(9 * 9);
  for (let v = 0; v < 9; v++) {
    data[v * 9] = v;
    data[v * 9 + 1] = v % 3;
    data[v * 9 + 2] = -v;
  }
  const raw = rawHouse(data, 3);
  const packed = packHouseMesh(raw);
  assert.equal(packed.indexCount, raw.count);
  assert.equal(packed.lawnChunk.offset, 0);
  assert.equal(packed.lawnChunk.count, 3);
  assert.equal(packed.chunks.length, 1);
  assert.equal(packed.chunks[0].offset, 3 * 4);
  assert.equal(packed.chunks[0].count, 6);
  assert.equal(packed.chunks[0].mirrorSkip, false);
  assert.equal('coarseCount' in packed.chunks[0], false);
  assert.deepEqual(packed.chunks[0].lo, [3, 0, -8]);
  assert.deepEqual(packed.chunks[0].hi, [8, 2, -3]);
  assert.equal(packed.glass, raw.glass);
  assert.equal(packed.mirrors, raw.mirrors);
  assertRoundTrip(data, packed, 9);
});

test('empty meshes and all-lawn meshes have no fabricated solid range', () => {
  const empty = packHouseMesh(rawHouse(new Float32Array(0)));
  assert.equal(empty.vertexCount, 0);
  assert.equal(empty.lawnChunk, null);
  assert.deepEqual(empty.chunks, []);
  const lawn = packHouseMesh(rawHouse(new Float32Array(27), 3));
  assert.equal(lawn.lawnChunk.count, 3);
  assert.deepEqual(lawn.chunks, []);
  assert.equal(packCurtainMesh({ data: new Float32Array(0), count: 0 }).count, 0);
});

test('selected material IDs retain distinct vertices while other materials still share exact tuples', () => {
  const data = new Float32Array(12 * 9);
  for (let v = 0; v < 12; v++) {
    data[v * 9 + 4] = 1;
    data[v * 9 + 6] = v < 6 ? 4.25 : 12.5;
  }
  const raw = rawHouse(data, 3);
  const normal = packHouseMesh(raw);
  assert.equal(normal.vertexCount, 2);
  const packed = packHouseMesh(raw, { uniqueParts: [4] });
  assert.equal(packed.vertexCount, 7);
  assert.deepEqual([...packed.indices], [0, 1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6]);
  assert.equal(packed.indexCount, 12);
  assert.equal(packed.lawnChunk.count, 3);
  assert.equal(packed.chunks[0].count, 9);
  assertRoundTrip(data, packed, 9);
});

test('material exclusions remain unshared after the hash and source tables grow', () => {
  const count = 6000;
  const data = new Float32Array(count * 9);
  for (let v = 0; v < count; v++) {
    data[v * 9] = v < 3000 ? v : 0;
    data[v * 9 + 6] = v < 3000 ? 12 : 4;
  }
  const packed = packHouseMesh(rawHouse(data), { uniqueParts: [4] });
  assert.equal(packed.vertexCount, count);
  assert.equal(new Set(packed.indices.subarray(3000)).size, 3000);
  assertRoundTrip(data, packed, 9);
});
