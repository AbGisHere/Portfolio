#!/usr/bin/env node
/**
 * (0.5.40) The opening's intro, checked: on a fresh load the camera holds in
 * the sky, tilts down and lands, and the frame it lands on must not change
 * when it comes to rest (the owner saw a half-size landing sharpen, 0.5.38).
 *
 * Per theme × viewport, on a fresh context (no `abg-intro-seen`):
 *  - the hold ends (`data-intro` → `tilt`) before the cap, and how long it took;
 *  - the tilt's frame times (info: fps, frames > 20 ms, the longest);
 *  - the landing: the frame at `data-intro=done` (A), 600 ms later (B) and
 *    600 ms after that (C). B→C is the mist's own drift; A→B may not exceed it
 *    by more than the slack (mean ≤ max(FLOOR, drift × RATIO));
 *  - no console errors or warnings, and the scroll held during the tilt.
 *
 * Usage: node scripts/intro.mjs [--base http://localhost:3000]
 *        [--viewports 1440x900@2,393x852@2] [--themes day,night] [--query k=v] [--quiet]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { watchConsole } from './lib/console.mjs';
import { gpuArgs } from './lib/dropout.mjs';
import { OUT_DIR, ensureDir, parseArgs, parseViewport, seedTheme } from './lib/harness.mjs';

const args = parseArgs(process.argv.slice(2));
const BASE = args.base ?? 'http://localhost:3000';
const QUIET = !!args.quiet;
const VIEWPORTS = String(args.viewports ?? '1440x900@2,393x852@2').split(',').map(parseViewport);
const THEMES = String(args.themes ?? 'day,night').split(',');
// Extra query for experiments (`--query bearuse=0`).
const QUERY = args.query ? `&${args.query}` : '';
const FLOOR = 0.8;
const RATIO = 1.6;
const HOLD_CAP_MS = 4000;
const OUT = ensureDir(join(OUT_DIR, 'intro'));

/** Mean channel difference (0–255) of two PNG buffers, in a blank page. */
async function meanDiff(page, a, b) {
  return page.evaluate(
    async ({ a, b }) => {
      const load = src =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const W = ia.width;
      const H = ia.height;
      const read = img => {
        const c = new OffscreenCanvas(W, H);
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, W, H).data;
      };
      const pa = read(ia);
      const pb = read(ib);
      let sum = 0;
      for (let i = 0; i < pa.length; i += 4) sum += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
      return sum / ((pa.length / 4) * 3);
    },
    { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` },
  );
}

const browser = await chromium.launch({ args: gpuArgs({}) });
const cases = [];
try {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const name = `${vp.width}x${vp.height}@${vp.dpr}-${theme}`;
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr });
      await seedTheme(context, theme);
      const page = await context.newPage();
      const problems = watchConsole(page);
      const t0 = Date.now();
      await page.goto(`${BASE}/?adapt=0${QUERY}`, { waitUntil: 'load' });
      const row = { name, theme, viewport: vp };
      try {
        await page.waitForFunction(() => document.documentElement.dataset.intro === 'tilt', null, { timeout: HOLD_CAP_MS + 15000, polling: 'raf' });
        row.holdMs = Date.now() - t0;
        // Frame times through the tilt, and a wheel that must not scroll.
        const [frames] = await Promise.all([
          page.evaluate(
            () =>
              new Promise(res => {
                const ts = [];
                const f = t => {
                  ts.push(t);
                  if (document.documentElement.dataset.intro === 'tilt') requestAnimationFrame(f);
                  else res(ts);
                };
                requestAnimationFrame(f);
              }),
          ),
          page.mouse.wheel(0, 600),
        ]);
        const gaps = frames.slice(1).map((t, i) => t - frames[i]);
        const span = frames.at(-1) - frames[0];
        row.tilt = {
          fps: gaps.length && span > 0 ? +((1000 * gaps.length) / span).toFixed(1) : 0,
          over20: gaps.filter(g => g > 20).length,
          max: gaps.length ? +Math.max(...gaps).toFixed(1) : 0,
        };
        row.scrollY = await page.evaluate(() => window.scrollY);
        const A = await page.screenshot();
        await page.waitForTimeout(600);
        const B = await page.screenshot();
        await page.waitForTimeout(600);
        const C = await page.screenshot();
        row.landing = +(await meanDiff(page, A, B)).toFixed(2);
        row.drift = +(await meanDiff(page, B, C)).toFixed(2);
        row.limit = +Math.max(FLOOR, row.drift * RATIO).toFixed(2);
        row.fails = [];
        if (row.holdMs > HOLD_CAP_MS + 1500) row.fails.push(`hold ${row.holdMs} ms`);
        if (row.landing > row.limit) {
          row.fails.push(`landing ${row.landing} > ${row.limit}`);
          writeFileSync(join(OUT, `${name}-land.png`), A);
          writeFileSync(join(OUT, `${name}-rest.png`), B);
        }
        if (row.scrollY !== 0) row.fails.push(`scrolled ${row.scrollY}px during the tilt`);
      } catch (e) {
        row.fails = [`no intro: ${e.message.split('\n')[0]}`];
      }
      if (problems.length) row.fails.push(...problems.slice(0, 3));
      cases.push(row);
      if (!QUIET || row.fails.length) {
        const t = row.tilt ? `tilt ${row.tilt.fps} fps (>20 ms ${row.tilt.over20}, max ${row.tilt.max})` : '';
        console.log(`${row.fails.length ? 'FAIL' : 'ok  '} ${name}: hold ${row.holdMs ?? '–'} ms · ${t} · landing ${row.landing ?? '–'} (drift ${row.drift ?? '–'})${row.fails.length ? ` — ${row.fails.join('; ')}` : ''}`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

writeFileSync(join(OUT, 'results.json'), JSON.stringify({ base: BASE, floor: FLOOR, ratio: RATIO, cases }, null, 2));
const failed = cases.filter(c => c.fails.length).length;
const worst = Math.max(...cases.map(c => c.tilt?.max ?? 0));
console.log(`intro: ${cases.length - failed}/${cases.length} passed · worst tilt frame ${worst.toFixed(1)} ms · ${OUT}`);
process.exit(failed ? 1 : 0);
