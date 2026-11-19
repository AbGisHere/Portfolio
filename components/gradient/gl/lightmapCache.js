/**
 * (0.4.57) The house's baked lightmap (houseLightmap.js), kept in the
 * browser (IndexedDB) after the first bake, so a return visit uploads it
 * in place of baking it. Its key is the house worker's URL (the mesh's
 * content hash, as the mesh's own store) plus `hashParts` of everything
 * else the bake reads: its shaders, LIGHTMAP_BOUNDS, the lights' data, the
 * bake's code and the GPU and browser it ran on. Only the newest entry is
 * kept. Any failure bakes as before; `?lmcache=0` skips it both ways.
 *
 * The texels are kept as the texture holds them, half floats, so the
 * upload is bit for bit the bake: read back as floats (exact from half)
 * and turned back with `f32ToF16Exact`, which refuses any value a half
 * can't hold (a texture kept at more than half precision bakes as before).
 */

const DB = 'portfolio-house-lightmap';
const STORE = 'lightmap';

/** Two 32-bit lanes (FNV-1a and a multiply-xorshift) over strings and typed
 * arrays, each part prefixed by its kind and length: 16 hex digits. */
export function hashParts(parts) {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  const byte = x => {
    a = Math.imul(a ^ x, 0x01000193);
    b = Math.imul(b ^ x, 0x5bd1e995);
    b ^= b >>> 15;
  };
  const word = x => {
    byte(x & 255);
    byte((x >>> 8) & 255);
    byte((x >>> 16) & 255);
    byte(x >>> 24);
  };
  for (const p of parts) {
    if (typeof p === 'string') {
      byte(1);
      word(p.length);
      for (let i = 0; i < p.length; i++) {
        const c = p.charCodeAt(i);
        byte(c & 255);
        byte(c >>> 8);
      }
    } else if (ArrayBuffer.isView(p)) {
      const u8 = new Uint8Array(p.buffer, p.byteOffset, p.byteLength);
      byte(2);
      word(u8.length);
      for (let i = 0; i < u8.length; i++) byte(u8[i]);
    } else {
      const s = JSON.stringify(p) ?? 'undefined';
      byte(3);
      word(s.length);
      for (let i = 0; i < s.length; i++) byte(s.charCodeAt(i) & 255);
    }
  }
  const hex = x => (x >>> 0).toString(16).padStart(8, '0');
  return hex(a) + hex(b);
}

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** A half float's bits as a float (exact). */
export function f16ToF32(h) {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >>> 10) & 31;
  const m = h & 1023;
  if (e === 0) return s * m * 2 ** -24;
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * 2 ** (e - 15);
}

/**
 * `src[from … to)` (floats) into `dst` as half floats' bits, only where
 * each is exactly a half (finite or not, subnormals and -0 included).
 * Returns false at the first value a half can't hold.
 */
export function f32ToF16Exact(src, dst, from = 0, to = src.length) {
  for (let i = from; i < to; i++) {
    f32[0] = src[i];
    const x = u32[0];
    const sign = (x >>> 16) & 0x8000;
    const e = (x >>> 23) & 255;
    const m = x & 0x7fffff;
    let h;
    if (e === 255) {
      if (m) return false; // NaN: no exact payload to keep
      h = sign | 0x7c00;
    } else if (e === 0) {
      if (m) return false; // a float subnormal is below every half
      h = sign;
    } else if (e > 142) {
      return false; // past the half's range
    } else if (e >= 113) {
      if (m & 0x1fff) return false;
      h = sign | ((e - 112) << 10) | (m >>> 13);
    } else {
      // A half subnormal: value = (1.m) · 2^(e-127) = k · 2^-24.
      const shift = 126 - e; // bits of the 24-bit significand dropped
      if (shift > 24) return false;
      const sig = m | 0x800000;
      if (sig & ((1 << shift) - 1)) return false;
      h = sign | (sig >>> shift);
    }
    dst[i] = h;
  }
  return true;
}

/** Whether `data` (half bits, RGBA) is a whole bake: its size, and alpha 1
 * in every texel (the bake writes 1 everywhere; a failed read is zeros). */
export function validLightmap(data, width, height) {
  if (!(data instanceof Uint16Array) || data.length !== width * height * 4) return false;
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0x3c00) return false;
  return true;
}

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

/** The stored bake under `key`, or null (none, or any failure). */
export async function loadStoredLightmap(key) {
  if (!key || typeof indexedDB === 'undefined') return null;
  try {
    const db = await open();
    try {
      const hit = await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
      return hit instanceof Uint16Array ? hit : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Keep `data` under `key`, dropping older bakes. Never throws. */
export async function storeLightmap(key, data) {
  if (!key || typeof indexedDB === 'undefined') return false;
  try {
    const db = await open();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.clear();
        store.put(data, key);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
      return true;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}
