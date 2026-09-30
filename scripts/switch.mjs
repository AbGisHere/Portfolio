/**
 * Switch smoothness: a day/night switch is one sky turn, so no frame of it
 * may jump against its neighbours (a "cut").
 *
 *   npm run build && npm run start -- -p 3001
 *   npm run switch -- --base http://localhost:3001
 *     [--renderers layers,gl] [--scrolls 0,0.5,1] [--viewport 1440x900@1]
 *     [--fps 30] [--after 1500] [--limit 3] [--live] [--steps] [--save]
 *
 * Per renderer × descent position (`?scroll=`) × direction (day → night,
 * night → day), on Playwright's fake clock (rAF and performance.now
 * stepped, so every run sees the same frames), with `?freeze=1&grain=0`:
 * it clicks the sun, captures a frame every 1/fps s through the switch and
 * `after` ms past its landing, and takes the mean absolute difference
 * (0–255) of each consecutive pair, over the ridges (below 45% of the
 * height), over the whole frame and over its worst block (`peak`). A step's ratio is its size over the
 * median of the (up to) six steps around it, floored at FLOOR (a palette
 * easing through 8-bit levels ticks unevenly, which a narrower window reads
 * as spikes); a cut is a step whose ratio passes `limit`. Then it reloads
 * on the landed theme and reports how far the fresh page is from the landed
 * frame (`reload`), for information only: by design neither renderer lands on a fresh load's
 * scene (GL's seed has moved on, the layered ridges keep the silhouette the
 * page loaded with).
 *
 * `--live` drops `?freeze=1`, so the veils drift and the wind runs (GL: on
 * the fake clock; the layered veils run on the compositor's own clock, so
 * its live runs are noisier).
 *
 * `--steps` prints every case's ridge steps; `--save` writes its frames to
 * scripts/out/switch/.
 *
 * Takes about ten minutes for the default 12 cases. Exits 1 on a cut or a
 * console error.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { OUT_DIR, ensureDir, parseArgs, parseViewport, sceneUrl, seedTheme } from './lib/harness.mjs';

const args = parseArgs();
const BASE = args.base ?? 'http://localhost:3001';
const RENDERERS = String(args.renderers ?? 'layers,gl').split(',');
const SCROLLS = String(args.scrolls ?? '0,0.5,1').split(',').map(Number);
const VP = parseViewport(String(args.viewport ?? '1440x900@1'));
const FPS = Number(args.fps ?? 30);
const AFTER = Number(args.after ?? 1500);
const LIMIT = Number(args.limit ?? 3);
const SAVE = Boolean(args.save);
const LIVE = Boolean(args.live);
const STEPS = Boolean(args.steps);
// Steps under this (0–255 mean) never count as a cut: a still frame's noise.
const FLOOR = 0.25;
const RIDGE_TOP = 0.45;
// A cut in one place (a distant range, say) barely moves a frame's mean,
// so each step is also judged by its worst BLOCK × BLOCK px block (`peak`).
const BLOCK = 64;
const DIRS = [
  { name: 'day→night', from: 'day' },
  { name: 'night→day', from: 'night' },
];

/** Mean abs difference of two PNGs, over the ridges and the whole frame. */
async function diffAll(page, pngs) {
  return page.evaluate(
    async ({ list, top, B }) => {
      const load = src =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const imgs = await Promise.all(list.map(load));
      const W = imgs[0].width;
      const H = imgs[0].height;
      const c = new OffscreenCanvas(W, H);
      const x = c.getContext('2d', { willReadFrequently: true });
      const px = imgs.map(img => {
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, W, H).data;
      });
      const y0 = Math.round(top * H);
      const out = [];
      for (let k = 1; k < px.length; k++) {
        const a = px[k - 1];
        const b = px[k];
        let all = 0;
        let low = 0;
        const cols = Math.ceil(W / B);
        const blocks = new Float64Array(cols * Math.ceil(H / B));
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
          const p = i / 4;
          const y = (p / W) | 0;
          all += d;
          if (y >= y0) low += d;
          blocks[((y / B) | 0) * cols + (((p % W) / B) | 0)] += d;
        }
        let peak = 0;
        for (const v of blocks) peak = Math.max(peak, v);
        out.push({ all: all / (3 * W * H), ridges: low / (3 * W * (H - y0)), peak: peak / (3 * B * B) });
      }
      return out;
    },
    { list: pngs.map(p => `data:image/png;base64,${p.toString('base64')}`), top: RIDGE_TOP, B: BLOCK },
  );
}

/** Worst step against its neighbours: [{ i, d, ratio }]. */
function spikes(steps) {
  return steps.map((d, i) => {
    const near = [i - 3, i - 2, i - 1, i + 1, i + 2, i + 3].filter(j => j >= 0 && j < steps.length).map(j => steps[j]);
    near.sort((p, q) => p - q);
    const med = near.length ? (near[(near.length - 1) >> 1] + near[near.length >> 1]) / 2 : 0;
    return { i, d, ratio: d / Math.max(med, FLOOR) };
  });
}

async function open(browser, renderer, theme, scroll) {
  const context = await browser.newContext({
    viewport: { width: VP.width, height: VP.height },
    deviceScaleFactor: VP.dpr,
  });
  await seedTheme(context, theme);
  const page = await context.newPage();
  const errors = [];
  // (Chromium's note on the screenshots' own readbacks isn't the page's.)
  page.on(
    'console',
    m => (m.type() === 'error' || m.type() === 'warning') && !/GPU stall due to ReadPixels/.test(m.text()) && errors.push(m.text()),
  );
  page.on('pageerror', e => errors.push(String(e)));
  // Paused: time moves only on runFor, so a slow screenshot skips nothing.
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto(sceneUrl(BASE, renderer, { ...(LIVE ? {} : { freeze: '1' }), grain: '0', scroll: String(scroll) }), { waitUntil: 'load' });
  // Let the renderer load, build and settle (the GL spring, the masks).
  for (let i = 0; i < 40; i++) {
    await page.clock.runFor(100);
    const ok = await page.evaluate(
      r => {
        const el = document.querySelector('[data-renderer]');
        return el?.dataset.renderer === r && (r !== 'layers' || el.querySelector('[data-ready]') || el.dataset.ready != null);
      },
      renderer,
    );
    if (ok && i > 20) break;
  }
  await page.clock.runFor(2000);
  return { context, page, errors };
}

async function run(browser, renderer, scroll, dir) {
  const { context, page, errors } = await open(browser, renderer, dir.from, scroll);
  // Whole fake-clock frames (its rAF runs every 16 ms): 33.3 ms steps would
  // take one frame or two by turns, and read as jitter.
  const dt = Math.max(1, Math.round(1000 / FPS / 16)) * 16;
  // Two frames at rest first, so the switch's first step has neighbours.
  const shots = [];
  for (let i = 0; i < 3; i++) {
    if (i) await page.clock.runFor(dt);
    shots.push(await page.screenshot({ type: 'png' }));
  }
  await page.click('button[data-sun-toggle]');
  let t = 0;
  let landed = -1;
  // Through the switch (data-busy), then `AFTER` ms at rest.
  for (;;) {
    await page.clock.runFor(dt);
    t += dt;
    shots.push(await page.screenshot({ type: 'png' }));
    const busy = await page.evaluate(() => document.querySelector('button[data-sun-toggle]')?.dataset.busy != null);
    if (!busy && landed < 0) landed = t;
    if (landed >= 0 && t - landed >= AFTER) break;
    if (t > 12000) break;
  }
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await context.close();

  // In chunks: a long switch's frames at once run the diff page out of memory.
  const steps = [];
  for (let k = 0; k < shots.length - 1; k += 12) {
    steps.push(...(await diffAll(await blank(browser), shots.slice(k, k + 13))));
  }
  const fresh = await open(browser, renderer, theme, scroll);
  const reloadPng = await fresh.page.screenshot({ type: 'png' });
  errors.push(...fresh.errors);
  await fresh.context.close();
  const [reload] = await diffAll(await blank(browser), [shots[shots.length - 1], reloadPng]);

  if (SAVE) {
    const dirOut = ensureDir(join(OUT_DIR, 'switch', `${renderer}-${scroll}-${dir.from}`));
    shots.forEach((p, i) => writeFileSync(join(dirOut, `${String(i).padStart(3, '0')}.png`), p));
    writeFileSync(join(dirOut, 'reload.png'), reloadPng);
  }
  return { steps, reload, errors, landedAt: Math.round(landed / dt) };
}

let blankPage = null;
async function blank(browser) {
  if (!blankPage) blankPage = await (await browser.newContext()).newPage();
  return blankPage;
}

const browser = await chromium.launch();
let failed = false;
console.log(`switch  ${VP.name}${LIVE ? '  live' : ''}  ${FPS} fps  limit ×${LIMIT}  (step: mean abs 0–255; ratio: over its neighbours' median)`);
for (const renderer of RENDERERS) {
  for (const scroll of SCROLLS) {
    for (const dir of DIRS) {
      const { steps, reload, errors, landedAt } = await run(browser, renderer, scroll, dir);
      const worst = key => spikes(steps.map(s => s[key])).reduce((a, b) => (b.ratio > a.ratio ? b : a));
      const r = worst('ridges');
      const a = worst('all');
      const pk = worst('peak');
      const cut = r.ratio > LIMIT || a.ratio > LIMIT || pk.ratio > LIMIT;
      failed ||= cut || errors.length > 0;
      console.log(
        `${cut ? 'FAIL' : 'ok  '} ${renderer.padEnd(6)} scroll ${String(scroll).padEnd(3)} ${dir.name.padEnd(9)}` +
          `  ridges ×${r.ratio.toFixed(1)} (${r.d.toFixed(2)} @${r.i})  all ×${a.ratio.toFixed(1)} (${a.d.toFixed(2)} @${a.i})` +
          `  peak ×${pk.ratio.toFixed(1)} (${pk.d.toFixed(1)} @${pk.i})` +
          `  landed @${landedAt}  reload ${reload.all.toFixed(2)}${errors.length ? `  errors: ${errors.join(' | ')}` : ''}`,
      );
      if (STEPS) console.log(`       ${steps.map(s => s.ridges.toFixed(2)).join(' ')}`);
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
