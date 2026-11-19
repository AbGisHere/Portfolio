/**
 * (0.4.13) The house's mesh and its curtains' (houseMesh.js, houseRooms.js),
 * built off the main thread when the visitor approaches the desk or enters
 * the house directly. Readiness holds cover unfinished preparation. Answers
 * one message with both meshes, transferring their buffers without copying.
 *
 * (0.4.44) Kept in the browser (IndexedDB) after the first build, so a
 * return visit skips it. The key is this worker's own script URL: the
 * bundler names it by a hash of its content, which holds all the mesh's
 * code, so any change to the house builds afresh. Older entries are
 * dropped. Any failure (private mode, quota, no IndexedDB) just builds.
 * The message `{ cache: false }` (`?housecache=0`) skips it both ways.
 *
 * (0.4.57) It also reads the baked lightmap kept beside it (lightmapCache.js)
 * under its own URL and the message's `lightmap` (the bake's hash; null:
 * `?lmcache=0`), sent with the mesh as `lightmapData`, with `key` (that URL)
 * for the page to store a fresh bake under.
 */
import { buildHouse } from './houseBuild';
import { decodeHouse } from './houseBlob';
import { loadStoredLightmap } from './lightmapCache';

const DB = 'portfolio-house';
const STORE = 'mesh';

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const done = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onerror = tx.onabort = () => reject(tx.error);
});

const read = async (db, key) => new Promise((resolve, reject) => {
  const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
  req.onsuccess = () => resolve(req.result ?? null);
  req.onerror = () => reject(req.error);
});

// (Stored before the buffers are transferred: `put` clones them at once.)
const write = (db, key, value) => {
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.clear();
  store.put(value, key);
  return done(tx);
};

// (0.4.56) The house built at build time (scripts/house-prebuild.mjs),
// fetched and unzipped in place of building, where it's quicker: not in
// dev (its file may be stale), not on Save-Data or a slow link, and only
// where the browser can unzip a stream. Any failure builds. The query is
// this worker's own URL (its content hash), so a new house is fetched
// fresh past any HTTP cache.
const prebuilt = async () => {
  if (process.env.NODE_ENV !== 'production' || typeof DecompressionStream === 'undefined') return null;
  const c = self.navigator?.connection;
  if (c && (c.saveData || (c.effectiveType && c.effectiveType !== '4g'))) return null;
  const res = await fetch(`/house/house.bin.gz?w=${encodeURIComponent(self.location.pathname)}`);
  if (!res.ok || !res.body) return null;
  const buf = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const meshes = decodeHouse(buf);
  return meshes?.house?.vertices && meshes.house.tables && meshes.house.leaves && meshes.curtains?.vertices ? meshes : null;
};

const build = async () => {
  if (self.__noPrebuilt !== true) {
    try {
      const m = await prebuilt();
      if (m) return m;
    } catch {
      // built below
    }
  }
  return buildHouse();
};

const send = ({ house, curtains }, cached, key, lightmapData) => self.postMessage(
  { house, curtains, cached, key, lightmapData },
  [...(lightmapData ? [lightmapData.buffer] : []), house.vertices.buffer, house.tables.normals.buffer, house.tables.scalars.buffer, house.indices.buffer, house.runs.first.buffer, house.runs.count.buffer, house.runs.box.buffer, house.runs.variant.buffer, ...house.leaves.flatMap(l => [l.data.buffer, l.runs.first.buffer, l.runs.count.buffer, l.runs.box.buffer]), curtains.vertices.buffer, curtains.indices.buffer],
);

// (Only inside a worker: the unit tests import every module here.)
if (typeof self !== 'undefined') {
  self.onmessage = async e => {
    const useCache = e.data?.cache !== false && typeof indexedDB !== 'undefined';
    const key = self.location.href;
    // (Read beside the mesh; null on any failure.)
    const lightmap = e.data?.lightmap ? loadStoredLightmap(`${key}#${e.data.lightmap}`) : Promise.resolve(null);
    let db = null;
    if (useCache) {
      try {
        db = await open();
        const hit = await read(db, key);
        if (hit?.house?.vertices && hit.house.tables && hit.house.leaves && hit?.curtains?.vertices) {
          send(hit, true, key, await lightmap);
          self.postMessage({ stored: true });
          return;
        }
      } catch {
        db = null;
      }
    }
    self.__noPrebuilt = e.data?.prebuilt === false;
    const meshes = await build();
    let stored = null;
    if (db) {
      try {
        stored = write(db, key, meshes);
      } catch {
        stored = null;
      }
    }
    send(meshes, false, key, await lightmap);
    // (The page ends this worker only once the store is written.)
    await stored?.catch(() => {});
    self.postMessage({ stored: true });
  };
}
