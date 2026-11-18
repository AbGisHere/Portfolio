/**
 * (0.4.56) The built house (houseWorker.js `build`) as one binary blob and
 * back, byte for byte: a JSON header of the object's shape, each typed
 * array replaced by its kind, offset and length, then the arrays' bytes,
 * each aligned to 8. Made at build time by scripts/house-prebuild.mjs
 * (public/house/house.bin.gz), read by the worker in place of building.
 */
const KINDS = { Float32Array, Uint32Array, Uint16Array, Uint8Array, Int8Array, Int16Array, Int32Array, Float64Array };
const MAGIC = 0x48424c42; // 'HBLB'

export function encodeHouse(value) {
  const arrays = [];
  let at = 0;
  const shape = v => {
    if (ArrayBuffer.isView(v)) {
      const kind = v.constructor.name;
      if (!KINDS[kind]) throw new TypeError(`houseBlob: ${kind}`);
      at = Math.ceil(at / 8) * 8;
      const d = { $a: kind, o: at, n: v.length };
      arrays.push([at, v]);
      at += v.byteLength;
      return d;
    }
    if (Array.isArray(v)) return v.map(shape);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]));
    return v;
  };
  const header = new TextEncoder().encode(JSON.stringify(shape(value)));
  const start = Math.ceil((8 + header.length) / 8) * 8;
  const out = new Uint8Array(start + at);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, header.length, true);
  out.set(header, 8);
  for (const [o, v] of arrays) out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), start + o);
  return out;
}

export function decodeHouse(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('houseBlob: not a house');
  const len = dv.getUint32(4, true);
  const shape = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, len)));
  const start = Math.ceil((8 + len) / 8) * 8;
  const back = v => {
    if (v && typeof v === 'object' && '$a' in v) {
      const K = KINDS[v.$a];
      // Each array its own buffer (the worker transfers them one by one).
      return new K(buffer.slice(start + v.o, start + v.o + v.n * K.BYTES_PER_ELEMENT));
    }
    if (Array.isArray(v)) return v.map(back);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, back(x)]));
    return v;
  };
  return back(shape);
}
