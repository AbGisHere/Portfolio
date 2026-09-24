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
 *        [--query k=v&k=v] [--query-a k=v] [--query-b k=v]
 *
 * Writes scripts/out/parity/index.html (a | b | diff per case) and exits
 * non-zero if any case breaks a threshold. Contract: scripts/README.md.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

const args = parseArgs();
const BASE = args.base ?? 'http://localhost:3001';
const THRESHOLD = Number(args.threshold ?? 2); // mean abs diff, 0–255 scale
const P99 = Number(args.p99 ?? 24); // 99th-percentile per-pixel max-channel diff
const SETTLE = Number(args.settle ?? 2500);
const SUN_TOL = Number(args['sun-tolerance'] ?? 1); // CSS px
const A = args.a ?? 'layers';
const B = args.b ?? 'gl';
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

const OUT = ensureDir(join(OUT_DIR, 'parity'));

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
async function capture(browser, vp, theme, renderer, side, scroll) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
  });
  await seedTheme(context, theme);
  await context.addInitScript(seedRandom);
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));

  const query = { ...(GRAIN ? { freeze: '1' } : { freeze: '1', grain: '0' }), scroll: String(scroll), ...QUERY[side] };
  await page.goto(sceneUrl(BASE, renderer, query), { waitUntil: 'load' });
  await page.waitForSelector('[data-renderer]', { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE_CSS });
  await sleep(SETTLE);

  const painted = await readRenderer(page);
  const sun = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-pressed]');
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
  // Mid-descent the hit target stays put (and goes inert) while the painted
  // sun moves: only the resting frame checks the target against it.
  if (sun.painted && scroll === 0) {
    sun.offset = Math.hypot(sun.target.x - sun.painted.x, sun.target.y - sun.painted.y);
  }

  const png = await page.screenshot({ type: 'png' });
  await context.close();
  return { png, painted, sun, errors };
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

async function main() {
  const browser = await chromium.launch();
  const differ = await (await browser.newContext()).newPage();
  const cases = [];
  let failed = 0;

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const scroll of SCROLLS) {
        const id = `${vp.name.replace('@', '-')}-${theme}-s${scroll}`;
        const a = await capture(browser, vp, theme, A, 'a', scroll);
        const b = await capture(browser, vp, theme, B, 'b', scroll);
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
          if (cap.sun.offset != null && cap.sun.offset > SUN_TOL) {
            problems.push(`${label} sun target off by ${fmt(cap.sun.offset)}px`);
          }
          if (cap.errors.length) problems.push(`${label} console: ${cap.errors[0]}`);
        }
        // Both renderers must report the same painted sun (they move it alike).
        const pa = a.sun.painted;
        const pb = b.sun.painted;
        const drift = pa && pb ? Math.hypot(pa.x - pb.x, pa.y - pb.y) : null;
        if (drift != null && drift > SUN_TOL) problems.push(`painted sun ${A}/${B} apart by ${fmt(drift)}px`);
        if (problems.length) failed++;

        const row = {
          id,
          viewport: vp.name,
          theme,
          scroll,
          painted: { [A]: a.painted, [B]: b.painted },
          mean: d.mean,
          p99: d.p99,
          worst: d.worst,
          sun: { [A]: a.sun, [B]: b.sun },
          problems,
        };
        cases.push(row);
        console.log(
          `${problems.length ? 'FAIL' : 'ok  '} ${id.padEnd(28)} ` +
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
  console.log(`\n${cases.length - failed}/${cases.length} passed · report: ${join(OUT, 'index.html')}`);
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
