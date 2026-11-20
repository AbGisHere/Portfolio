/**
 * (0.5.16, H1) Bakes the house's lightmap ahead of time: loads the house
 * on a running production server (`--base`, default http://localhost:3001)
 * in Chromium on this machine's GPU, takes the bake the page stores
 * (lightmapCache.js), and writes it gzipped to
 * public/lightmap/lightmap.bin.gz, with its hash in
 * components/gradient/gl/lightmapBaked.js. Rerun whenever the unit test
 * says the shipped bake is stale (`npm run lightmap-bake -- --base URL`).
 *
 *   node --import ./scripts/lib/resolve-js.mjs scripts/lightmap-bake.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { parseArgs } from './lib/harness.mjs';
import { bakedLightmapHash } from '../components/gradient/gl/lightmapBaked.js';
import { LIGHTMAP_BOUNDS } from '../components/gradient/gl/houseShader.js';

const args = parseArgs();
const BASE = String(args.base ?? 'http://localhost:3001').replace(/\/$/, '');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/?contact=0.35&theme=night&lmbaked=0`);
  await page.waitForFunction(() => window.__debugHouse?.().lightmapCache?.stored != null, null, { timeout: 300000 });
  const info = await page.evaluate(() => window.__debugHouse().lightmapCache);
  if (!info.stored) throw new Error(`the page didn't store its bake (${JSON.stringify(info)})`);
  const b64 = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('portfolio-house-lightmap');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = open.result.transaction('lightmap').objectStore('lightmap').openCursor();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const v = req.result?.value;
        if (!v) return resolve(null);
        const u = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        let s = '';
        for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768));
        resolve(btoa(s));
      };
    };
  }));
  if (!b64) throw new Error('no stored bake found');
  const raw = Buffer.from(b64, 'base64');
  const [W, H] = LIGHTMAP_BOUNDS.size;
  if (raw.length !== W * H * 4 * 2) throw new Error(`bake is ${raw.length} bytes, expected ${W * H * 8}`);
  const gz = gzipSync(raw, { level: 9 });
  mkdirSync('public/lightmap', { recursive: true });
  writeFileSync('public/lightmap/lightmap.bin.gz', gz);
  const hash = bakedLightmapHash();
  const file = 'components/gradient/gl/lightmapBaked.js';
  writeFileSync(file, readFileSync(file, 'utf8').replace(/export const LIGHTMAP_BAKED = \{[^}]*\};/, `export const LIGHTMAP_BAKED = { hash: '${hash}' };`));
  console.log(`lightmap-bake: ${(raw.length / 1e6).toFixed(1)} MB → ${(gz.length / 1e6).toFixed(2)} MB gzipped · hash ${hash}`);
} finally {
  await browser.close();
}
