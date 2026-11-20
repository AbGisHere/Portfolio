#!/usr/bin/env node
/**
 * Renderer parity: screenshots the atmosphere drawn by two renderers (by
 * default the layered fallback and the WebGL renderer) at rest, per
 * viewport × theme × descent position (`?scroll=`), and diffs them.
 *
 *   node scripts/parity.mjs [--base URL] [--threshold 2] [--p99 24]
 *        [--viewports 393x852@2,1440x900@2] [--themes day,night]
 *        [--scrolls 0,0.5,1]
 *        [--settle 2500] [--sun-tolerance 1] [--a layers --b gl] [--grain]
 *        [--base-b URL] [--query k=v&k=v] [--query-a k=v] [--query-b k=v] [--quiet]
 *        [--desks 0,0.5,1] [--baseline DIR] [--save-baseline]
 *
 * (0.5.13) Three additions:
 * - A known gap is reported, not failed: layered against GL where the GL
 *   side drew the 3D opening (`data-opening="3d"`), which the fallback's
 *   2D stills can't match until they're redone (CLAUDE.md, 0.5.0).
 * - `--baseline DIR`: side a is the PNGs saved there (`--save-baseline`
 *   writes them from side b instead of comparing): GL against the last
 *   release, at the descent's stops and the desk's (`--desks`, pinned with
 *   `?desk=`), so a change that breaks a part (0.5.13's vanishing desk)
 *   fails here.
 * - After a real scroll (wheeled, not pinned) the 3D shape must be back at
 *   full size once it settles (`data-peaks-scale` 1; 0.5.13 draws it at
 *   half size only while the flight moves).
 *
 * First it loads home and the 404 with each renderer and switches the sky
 * once. Every page load fails on a console error or warning, a page error or
 * sideways overflow (scripts/lib/console.mjs).
 *
 * Writes scripts/out/parity/index.html (a | b | diff per case) and exits
 * non-zero if any case breaks a threshold. `--quiet` (as `npm run qa` runs
 * it) prints only failing cases, then one summary line. Contract: scripts/README.md.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import {
  OUT_DIR,
  ensureDir,
  parseArgs,
  readRenderer,
  sceneUrl,
  seedTheme,
  sleep,
  viewportsFrom,
} from './lib/harness.mjs';
import { overflowsX, watchConsole } from './lib/console.mjs';

const args = parseArgs();
const BASE = args.base ?? 'http://localhost:3001';
// `--base-b URL`: side b from another server (a build against a build).
const BASE_B = args['base-b'] ?? BASE;
const THRESHOLD = Number(args.threshold ?? 2); // mean abs diff, 0–255 scale
const P99 = Number(args.p99 ?? 24); // 99th-percentile per-pixel max-channel diff
const SETTLE = Number(args.settle ?? 2500);
const SUN_TOL = Number(args['sun-tolerance'] ?? 1); // CSS px
const A = args.a ?? 'layers';
const B = args.b ?? 'gl';
const QUIET = Boolean(args.quiet);
// Per-case lines: every one by hand, only failures under --quiet.
const say = (ok, line) => (!ok || !QUIET) && console.log(line);
const GRAIN = Boolean(args.grain); // off by default: random noise can't match pixel-for-pixel
// Extra query params: `--query` for both sides, `--query-a` / `--query-b` for
// one (e.g. `--a gl --b gl --query-b crest=cpu` compares the GL crest paths).
const params = q => Object.fromEntries(new URLSearchParams(typeof q === 'string' ? q : ''));
const QUERY = {
  a: { ...params(args.query), ...params(args['query-a']) },
  b: { ...params(args.query), ...params(args['query-b']) },
};
const THEMES = String(args.themes ?? 'day,night').split(',');
// Descent positions, pinned with `?scroll=` (components/scroll/descent.js).
const SCROLLS = String(args.scrolls ?? '0,0.5,1')
  .split(',')
  .map(Number);
const VIEWPORTS = viewportsFrom(args.viewports, [
  '393x852@2',
  '320x568@1',
  '852x393@1',
  '820x1180@1',
  '1440x900@2',
  '3440x1440@1',
  '1600x300@1',
]);

// (0.5.13) The desk's stops, pinned with `?desk=` (after the whole descent).
const DESKS = args.desks == null ? [] : String(args.desks).split(',').filter(Boolean).map(Number);
const BASELINE = args.baseline ? String(args.baseline) : null;
const SAVE_BASELINE = Boolean(args['save-baseline']);
const POSITIONS = [
  ...SCROLLS.map(scroll => ({ key: `s${scroll}`, query: { scroll: String(scroll) } })),
  ...DESKS.map(desk => ({ key: `d${desk}`, query: { scroll: '1', desk: String(desk) } })),
];

const OUT = ensureDir(args.out ? String(args.out) : join(OUT_DIR, BASELINE ? 'regress' : 'parity'));
if (BASELINE) ensureDir(BASELINE);

// Time-dependent motion, frozen the same way on both sides: `?freeze=1` asks
// each renderer to draw its veils at drift offset 0 and full opacity. CSS
// animations and transitions go too, so the sun hit target is measured at its
// final spot.
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important}`;

// Grain is random noise per load. With grain off (the default) `?grain=0`
// asks each renderer to skip it; either way Math.random is seeded so a
// renderer is repeatable.

function seedRandom() {
  let t = 0x9e3779b9;
  Math.random = () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Load one renderer, settle, freeze, screenshot, and measure the sun. */
async function capture(browser, vp, theme, renderer, side, pos) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
  });
  await seedTheme(context, theme);
  await context.addInitScript(seedRandom);
  const page = await context.newPage();
  const errors = watchConsole(page);

  const query = { ...(GRAIN ? { freeze: '1' } : { freeze: '1', grain: '0' }), ...pos.query, ...QUERY[side] };
  await page.goto(sceneUrl(side === 'b' ? BASE_B : BASE, renderer, query), { waitUntil: 'load' });
  await page.waitForSelector('[data-renderer]', { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE_CSS });
  await sleep(SETTLE);

  const painted = await readRenderer(page);
  const sun = await page.evaluate(() => {
    const btn = document.querySelector('button[data-sun-toggle]');
    if (!btn) return { error: 'no sun toggle' };
    const b = btn.getBoundingClientRect();
    const target = { x: b.left + b.width / 2, y: b.top + b.height / 2 };

    // Painted sun: the renderer's data-sun-cx/cy (CSS px, relative to the
    // [data-renderer] element's box).
    const host = document.querySelector('[data-sun-cx][data-sun-cy]');
    if (host) {
      const h = host.getBoundingClientRect();
      return {
        target,
        painted: { x: h.left + Number(host.dataset.sunCx), y: h.top + Number(host.dataset.sunCy) },
        via: 'data-sun-cx/cy',
      };
    }
    return { target, painted: null, via: 'none (renderer exposes no sun position)' };
  });
  // The hit target follows the painted sun at every scroll (0.2.3).
  if (sun.painted) {
    sun.offset = Math.hypot(sun.target.x - sun.painted.x, sun.target.y - sun.painted.y);
  }

  const overflow = await overflowsX(page);
  const opening = await page.evaluate(() => document.documentElement.dataset.opening ?? null);
  const png = await page.screenshot({ type: 'png' });
  await context.close();
  return { png, painted, sun, errors, overflow, opening };
}

/**
 * Diffs two PNGs inside a blank page (canvas getImageData), so no image
 * library is needed. Returns stats plus a heatmap PNG as a data URL.
 */
async function diff(page, aPng, bPng) {
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
      if (ia.width !== ib.width || ia.height !== ib.height) {
        return { error: `size mismatch ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
      }
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

      const hist = new Uint32Array(256);
      const BS = 32;
      const bw = Math.ceil(W / BS);
      const bh = Math.ceil(H / BS);
      const blockSum = new Float64Array(bw * bh);
      const blockN = new Uint32Array(bw * bh);
      const heat = new ImageData(W, H);
      const hp = heat.data;
      let sum = 0;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const dr = Math.abs(pa[i] - pb[i]);
          const dg = Math.abs(pa[i + 1] - pb[i + 1]);
          const db = Math.abs(pa[i + 2] - pb[i + 2]);
          const mean = (dr + dg + db) / 3;
          const max = Math.max(dr, dg, db);
          sum += dr + dg + db;
          hist[max]++;
          const bi = ((y / BS) | 0) * bw + ((x / BS) | 0);
          blockSum[bi] += mean;
          blockN[bi]++;
          // Heatmap: the reference dimmed to grey, differences in hot red,
          // amplified ×8 so a few levels of drift are still visible.
          const lum = (pa[i] * 0.299 + pa[i + 1] * 0.587 + pa[i + 2] * 0.114) * 0.35;
          const hot = Math.min(255, max * 8);
          hp[i] = Math.min(255, lum + hot);
          hp[i + 1] = Math.max(0, lum - hot * 0.3);
          hp[i + 2] = Math.max(0, lum - hot * 0.3);
          hp[i + 3] = 255;
        }
      }

      const n = W * H;
      let acc = 0;
      let p99 = 255;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= n * 0.99) {
          p99 = v;
          break;
        }
      }
      let worst = { mean: -1, x: 0, y: 0 };
      for (let i = 0; i < blockSum.length; i++) {
        const m = blockSum[i] / blockN[i];
        if (m > worst.mean) worst = { mean: m, x: (i % bw) * BS, y: ((i / bw) | 0) * BS };
      }

      const c = new OffscreenCanvas(W, H);
      c.getContext('2d').putImageData(heat, 0, 0);
      const blob = await c.convertToBlob({ type: 'image/png' });
      const heatmap = await new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(blob);
      });

      return { width: W, height: H, mean: sum / (n * 3), p99, worst, heatmap };
    },
    {
      a: `data:image/png;base64,${aPng.toString('base64')}`,
      b: `data:image/png;base64,${bPng.toString('base64')}`,
    },
  );
}

const fmt = n => (n == null ? '—' : Number(n).toFixed(2));

// Pages beyond the pinned scenes: home and the 404, per renderer, each with
// one day/night switch, so a console error or warning on load or on the
// toggle fails parity (Chromium only; WebKit stays a manual check).
const PAGES = ['/', '/this-route-does-not-exist'];

async function checkPage(browser, renderer, path) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = watchConsole(page);
  const problems = [];
  const res = await page.goto(sceneUrl(new URL(path, BASE).toString(), renderer), { waitUntil: 'load' });
  if (path !== '/' && res?.status() !== 404) problems.push(`status ${res?.status()}, expected 404`);
  await page.waitForSelector('[data-renderer]', { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  const painted = await readRenderer(page);
  const sun = page.locator('button[data-sun-toggle]');
  if (await sun.count()) {
    await sun.click();
    await page
      .waitForFunction(() => !document.querySelector('button[data-sun-toggle][data-busy]'), null, { timeout: 10000 })
      .catch(() => problems.push('switch never finished (data-busy stuck)'));
    await sleep(300);
  } else problems.push('no sun toggle');
  if (await overflowsX(page)) problems.push('overflows sideways (scrollWidth > innerWidth)');
  await context.close();
  if (errors.length) problems.push(`console: ${errors.join(' | ')}`);
  return { painted, problems };
}

// (0.5.13) A real scroll into the flight, then rest: the shape must come
// back to full size (a half-size still would be a quality loss).
async function checkSettle(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = watchConsole(page);
  const problems = [];
  await page.goto(sceneUrl(BASE_B, 'gl', { grain: '0' }), { waitUntil: 'load' });
  await page.waitForSelector('[data-renderer]', { timeout: 15000 }).catch(() => {});
  await sleep(Math.max(SETTLE, 6000));
  await page.mouse.move(700, 450);
  let seenHalf = false;
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 80);
    await sleep(30);
    if ((await page.evaluate(() => document.documentElement.dataset.peaksScale)) === '0.5') seenHalf = true;
  }
  await sleep(2500);
  const scale = await page.evaluate(() => document.documentElement.dataset.peaksScale ?? null);
  if (scale !== null && scale !== '1') problems.push(`shape at ${scale} after the scroll settled (want 1)`);
  if (errors.length) problems.push(`console: ${errors[0]}`);
  await context.close();
  return { problems, scale, seenHalf };
}

async function main() {
  const browser = await chromium.launch();
  const differ = await (await browser.newContext()).newPage();
  const cases = [];
  let failed = 0;

  for (const renderer of [...new Set([A, B])]) {
    for (const path of PAGES) {
      const { painted, problems } = await checkPage(browser, renderer, path);
      if (problems.length) failed++;
      say(
        !problems.length,
        `${problems.length ? 'FAIL' : 'ok  '} ${`page ${renderer} ${path}`.padEnd(28)} ` +
          `painted ${painted}  load + switch: ${problems.length ? problems.join('; ') : 'no console errors, no overflow'}`,
      );
    }
  }

  {
    const { problems, scale, seenHalf } = await checkSettle(browser);
    if (problems.length) failed++;
    say(!problems.length, `${problems.length ? 'FAIL' : 'ok  '} ${'settle after a scroll'.padEnd(28)} shape ${scale ?? '—'} at rest${seenHalf ? ' (½ while moving)' : ''}${problems.length ? `  → ${problems.join('; ')}` : ''}`);
  }

  let gaps = 0;
  let saved = 0;
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const pos of POSITIONS) {
        const id = `${vp.name.replace('@', '-')}-${theme}-${pos.key}`;
        const b = await capture(browser, vp, theme, B, 'b', pos);
        const basePng = BASELINE && join(BASELINE, `${id}.png`);
        if (BASELINE && SAVE_BASELINE) {
          writeFileSync(basePng, b.png);
          saved++;
          say(true, `ok   ${id.padEnd(28)} baseline saved`);
          continue;
        }
        // (0.5.15) No baseline is a failure, not a silent save: a regress
        // run with nothing to compare against must not pass.
        if (BASELINE && !existsSync(basePng)) {
          failed++;
          say(false, `FAIL ${id.padEnd(28)} no baseline (run npm run baseline against the last release)`);
          continue;
        }
        const a = BASELINE
          ? { png: readFileSync(basePng), painted: 'baseline', sun: {}, errors: [], overflow: false, opening: null }
          : await capture(browser, vp, theme, A, 'a', pos);
        const d = await diff(differ, a.png, b.png);

        writeFileSync(join(OUT, `${id}-${A}.png`), a.png);
        writeFileSync(join(OUT, `${id}-${B}.png`), b.png);
        if (d.heatmap) {
          writeFileSync(join(OUT, `${id}-diff.png`), Buffer.from(d.heatmap.split(',')[1], 'base64'));
        }

        const problems = [];
        if (d.error) problems.push(d.error);
        else {
          if (d.mean > THRESHOLD) problems.push(`mean ${fmt(d.mean)} > ${THRESHOLD}`);
          if (d.p99 > P99) problems.push(`p99 ${d.p99} > ${P99}`);
        }
        for (const [label, cap] of [
          [A, a],
          [B, b],
        ]) {
          // (0.5.15) Not at the desk: there the lamp is the switch (LampToggle)
          // and the sun's button is left where the body went off-screen.
          if (!pos.key.startsWith('d') && cap.sun.offset != null && cap.sun.offset > SUN_TOL) {
            problems.push(`${label} sun target off by ${fmt(cap.sun.offset)}px`);
          }
          if (cap.errors.length) problems.push(`${label} console: ${cap.errors[0]}`);
          if (cap.overflow) problems.push(`${label} overflows sideways (scrollWidth > innerWidth)`);
        }
        // Both renderers must report the same painted sun (they move it alike).
        const pa = a.sun.painted;
        const pb = b.sun.painted;
        const drift = pa && pb ? Math.hypot(pa.x - pb.x, pa.y - pb.y) : null;
        if (drift != null && drift > SUN_TOL) problems.push(`painted sun ${A}/${B} apart by ${fmt(drift)}px`);
        // The known gap: the fallback's 2D stills against the 3D opening.
        const gap = !BASELINE && A === 'layers' && b.opening === '3d' && problems.length > 0 && problems.every(p => /^(mean|p99) |^painted sun /.test(p));
        if (gap) {
          gaps++;
          problems.length = 0;
        }
        if (problems.length) failed++;

        const row = {
          id,
          viewport: vp.name,
          theme,
          position: pos.key,
          gap,
          painted: { [A]: a.painted, [B]: b.painted },
          mean: d.mean,
          p99: d.p99,
          worst: d.worst,
          sun: { [A]: a.sun, [B]: b.sun },
          problems,
        };
        cases.push(row);
        say(
          !problems.length,
          `${problems.length ? 'FAIL' : gap ? 'gap ' : 'ok  '} ${id.padEnd(28)} ` +
            `painted ${A}=${a.painted} ${B}=${b.painted}  ` +
            `mean ${fmt(d.mean)}  p99 ${d.p99 ?? '—'}  worst32 ${fmt(d.worst?.mean)}  ` +
            `sun ${fmt(a.sun.offset)}/${fmt(b.sun.offset)}px` +
            (problems.length ? `  → ${problems.join('; ')}` : ''),
        );
      }
    }
  }
  await browser.close();

  writeFileSync(join(OUT, 'results.json'), JSON.stringify({ base: BASE, A, B, cases }, null, 2));
  writeFileSync(join(OUT, 'index.html'), report(cases));
  const total = cases.length + saved + PAGES.length * new Set([A, B]).size + 1;
  const worst = k => Math.max(0, ...cases.filter(c => !c.gap).map(c => c[k] ?? 0));
  const extra = `${gaps ? ` · ${gaps} known gap (fallback 2D vs the 3D opening)` : ''}${saved ? ` · ${saved} baseline saved` : ''}`;
  console.log(
    QUIET
      ? `${BASELINE ? 'regress' : 'parity'}: ${total - failed}/${total} passed${extra} · worst mean ${fmt(worst('mean'))}, p99 ${worst('p99')} · ${relative(process.cwd(), OUT)}`
      : `\n${total - failed}/${total} passed${extra} · report: ${join(OUT, 'index.html')}`,
  );
  process.exit(failed ? 1 : 0);
}

function report(cases) {
  const rows = cases
    .map(
      c => `<section class="${c.problems.length ? 'fail' : 'ok'}">
  <h2>${c.id} <span>${c.problems.length ? 'FAIL' : 'ok'}</span></h2>
  <p>painted: ${A}=${c.painted[A]} · ${B}=${c.painted[B]} · mean ${fmt(c.mean)} · p99 ${c.p99 ?? '—'} ·
     worst 32px block ${fmt(c.worst?.mean)} at (${c.worst?.x}, ${c.worst?.y}) ·
     sun offset ${A} ${fmt(c.sun[A].offset)}px (${c.sun[A].via ?? '—'}) / ${B} ${fmt(c.sun[B].offset)}px (${c.sun[B].via ?? '—'})</p>
  ${c.problems.length ? `<p class="why">${c.problems.join(' · ')}</p>` : ''}
  <div class="row">
    <figure><img src="${c.id}-${A}.png"><figcaption>${A}</figcaption></figure>
    <figure><img src="${c.id}-${B}.png"><figcaption>${B}</figcaption></figure>
    <figure><img src="${c.id}-diff.png"><figcaption>diff ×8</figcaption></figure>
  </div>
</section>`,
    )
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>Renderer parity</title>
<style>
body{font:14px/1.5 ui-monospace,monospace;background:#111;color:#eee;margin:24px}
section{margin:0 0 40px;padding:12px;border:1px solid #333}
section.fail{border-color:#ff5a1f}
h2{margin:0 0 4px;font-size:16px} h2 span{font-weight:400;color:#8b8b8f}
.fail h2 span,.why{color:#ff5a1f}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
figure{margin:0} img{width:100%;display:block;background:#000}
figcaption{color:#8b8b8f}
</style>
<h1>Renderer parity: ${A} vs ${B}</h1>
<p>Thresholds: mean ≤ ${THRESHOLD}/255 · p99 ≤ ${P99}/255 · sun ≤ ${SUN_TOL}px · grain ${GRAIN ? 'on' : 'off'}</p>
${rows}`;
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
