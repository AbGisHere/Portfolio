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
 */
import { houseLayout } from './houseMesh';
import { curtainMesh } from './houseRooms';
import { packCurtainMesh, packHouseMesh, tagLampFittings } from './houseLights';

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

const build = () => {
  const rawHouse = houseLayout();
  tagLampFittings(rawHouse.data);
  return { house: packHouseMesh(rawHouse), curtains: packCurtainMesh(curtainMesh()) };
};

const send = ({ house, curtains }, cached) => self.postMessage(
  { house, curtains, cached },
  [house.vertices.buffer, house.indices.buffer, house.runs.first.buffer, house.runs.count.buffer, house.runs.box.buffer, curtains.vertices.buffer, curtains.indices.buffer],
);

// (Only inside a worker: the unit tests import every module here.)
if (typeof self !== 'undefined') {
  self.onmessage = async e => {
    const useCache = e.data?.cache !== false && typeof indexedDB !== 'undefined';
    const key = self.location.href;
    let db = null;
    if (useCache) {
      try {
        db = await open();
        const hit = await read(db, key);
        if (hit?.house?.vertices && hit?.curtains?.vertices) {
          send(hit, true);
          self.postMessage({ stored: true });
          return;
        }
      } catch {
        db = null;
      }
    }
    const meshes = build();
    let stored = null;
    if (db) {
      try {
        stored = write(db, key, meshes);
      } catch {
        stored = null;
      }
    }
    send(meshes, false);
    // (The page ends this worker only once the store is written.)
    await stored?.catch(() => {});
    self.postMessage({ stored: true });
  };
}
