// (0.4.56) The prebuilt house decodes to the same meshes, byte for byte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHouse } from '../components/gradient/gl/houseBuild.js';
import { encodeHouse, decodeHouse } from '../components/gradient/gl/houseBlob.js';

test('houseBlob round-trips the built house exactly', () => {
  const a = buildHouse();
  const blob = encodeHouse(a);
  const b = decodeHouse(blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength));
  const same = (x, y, path) => {
    if (ArrayBuffer.isView(x)) {
      assert.equal(y.constructor, x.constructor, path);
      assert.ok(Buffer.from(x.buffer, x.byteOffset, x.byteLength).equals(Buffer.from(y.buffer, y.byteOffset, y.byteLength)), path);
    } else if (x && typeof x === 'object') {
      assert.deepEqual(Object.keys(y).sort(), Object.keys(x).sort(), path);
      for (const k of Object.keys(x)) same(x[k], y[k], `${path}.${k}`);
    } else assert.equal(y, x, path);
  };
  same(a, b, 'meshes');
});
