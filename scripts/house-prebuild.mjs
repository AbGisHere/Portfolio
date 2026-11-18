/**
 * (0.4.56) The house built at build time (`npm run build`'s prebuild):
 * the same meshes houseWorker.js builds in the browser, as one gzipped
 * blob (houseBlob.js) at public/house/house.bin.gz. Made fresh on every
 * build from the same source, so it can't go stale; not committed. The
 * worker fetches it in place of building, and builds on any failure.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildHouse } from '../components/gradient/gl/houseBuild.js';
import { encodeHouse } from '../components/gradient/gl/houseBlob.js';

const t = Date.now();
const blob = encodeHouse(buildHouse());
const gz = gzipSync(blob, { level: 9 });
const dir = fileURLToPath(new URL('../public/house/', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(dir + 'house.bin.gz', gz);
console.log(`house-prebuild: ${(blob.length / 1e6).toFixed(1)} MB → ${(gz.length / 1e6).toFixed(1)} MB gzipped, ${Date.now() - t} ms`);
