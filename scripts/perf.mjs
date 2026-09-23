#!/usr/bin/env node
/**
 * Renderer performance: per renderer × viewport, times every frame of four
 * day/night switches and a stretch of idle, plus main-thread cost from CDP.
 *
 *   node scripts/perf.mjs [--base URL] [--renderers svg,gl]
 *        [--viewports 1440x900@2,393x852@2] [--switches 4] [--window 700]
 *        [--idle 3000] [--headed] [--query k=v&k=v]
 *
 * Prints a table and writes scripts/out/perf/perf-<timestamp>.json.
 * Absolute numbers depend on the machine and on headless GPU support; compare
 * renderers within one run, not across machines. See scripts/README.md.
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
  sleep,
  viewportsFrom,
} from './lib/harness.mjs';

const args = parseArgs();
const BASE = args.base ?? 'http://localhost:3001';
const RENDERERS = String(args.renderers ?? 'svg,gl').split(',');
const SWITCHES = Number(args.switches ?? 4);
const WINDOW = Number(args.window ?? 700); // ms recorded after each click
const IDLE = Number(args.idle ?? 3000);
// Extra query params for every page, e.g. `--query crest=cpu`.
const QUERY = Object.fromEntries(new URLSearchParams(typeof args.query === 'string' ? args.query : ''));
const VIEWPORTS = viewportsFrom(args.viewports, [
  '1440x900@2',
  '1728x1117@2',
  '393x852@2',
  '3440x1440@1',
]);

const OUT = ensureDir(join(OUT_DIR, 'perf'));

// CDP Performance metrics (seconds, cumulative); deltas give main-thread time
// spent per phase. Paint/raster isn't split out, but lands in TaskDuration.
const METRICS = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'];

async function metrics(cdp) {
  const { metrics: list } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(list.filter(m => METRICS.includes(m.name)).map(m => [m.name, m.value]));
}

const delta = (a, b) => Object.fromEntries(METRICS.map(k => [k, (b[k] - a[k]) * 1000]));

/** rAF intervals (and long tasks) for `ms`, optionally starting with a click. */
function recordFrames(page, ms, click) {
  return page.evaluate(
    async ({ ms, click }) => {
      const long = [];
      let po;
      try {
        po = new PerformanceObserver(l => l.getEntries().forEach(e => long.push(e.duration)));
        po.observe({ type: 'longtask' });
      } catch {}
      const ts = [];
      const t0 = performance.now();
      if (click) document.querySelector('button[aria-pressed]')?.click();
      await new Promise(resolve => {
        const tick = t => {
          ts.push(t);
          if (t - t0 < ms) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      await new Promise(r => setTimeout(r, 0)); // let the observer flush
      po?.disconnect();
      return { intervals: ts.slice(1).map((t, i) => t - ts[i]), long };
    },
    { ms, click },
  );
}

function summarise(intervals, long, ms) {
  const d = [...intervals].sort((a, b) => a - b);
  const q = p => d[Math.min(d.length - 1, Math.floor(d.length * p))] ?? 0;
  return {
    frames: d.length,
    fps: d.length ? (d.length / (d.reduce((s, x) => s + x, 0) / 1000)) : 0,
    p50: q(0.5),
    p95: q(0.95),
    max: d.at(-1) ?? 0,
    over20: d.filter(x => x > 20).length,
    longTasks: long.length,
    longTaskMs: long.reduce((s, x) => s + x, 0),
    windowMs: ms,
  };
}

async function measure(browser, vp, renderer) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('abg-theme', 'day');
    } catch {}
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  await page.goto(sceneUrl(BASE, renderer, QUERY), { waitUntil: 'load' });
  await page
    .waitForSelector('[data-renderer], svg.jg-mist-layers', { timeout: 15000 })
    .catch(() => {});
  await sleep(2500);
  const painted = await readRenderer(page);

  // Switches: day→night→day…, each recorded for WINDOW ms, with a pause so
  // the next one starts from rest.
  const m0 = await metrics(cdp);
  const all = [];
  const long = [];
  for (let i = 0; i < SWITCHES; i++) {
    const r = await recordFrames(page, WINDOW, true);
    all.push(...r.intervals);
    long.push(...r.long);
    await sleep(400);
  }
  const m1 = await metrics(cdp);
  const switching = {
    ...summarise(all, long, WINDOW * SWITCHES),
    mainThreadMs: delta(m0, m1),
  };

  // Idle: nothing clicked. Main-thread time here is the steady cost of the
  // veil drift (e.g. SVG repaint every frame), which runs the whole visit.
  await sleep(800);
  const m2 = await metrics(cdp);
  const idleRun = await recordFrames(page, IDLE, false);
  const m3 = await metrics(cdp);
  const idleDelta = delta(m2, m3);
  const idle = {
    ...summarise(idleRun.intervals, idleRun.long, IDLE),
    mainThreadMs: idleDelta,
    taskMsPerSec: (idleDelta.TaskDuration / IDLE) * 1000,
  };

  await context.close();
  return { renderer, painted, viewport: vp.name, switching, idle };
}

const n1 = x => x.toFixed(1);

async function main() {
  const browser = await chromium.launch({
    headless: !args.headed,
    args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'],
  });
  const results = [];
  for (const vp of VIEWPORTS) {
    for (const renderer of RENDERERS) {
      results.push(await measure(browser, vp, renderer));
    }
  }
  const gpu = await (async () => {
    const p = await browser.newPage();
    const info = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
      if (!gl) return 'no WebGL';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
    await p.close();
    return info;
  })();
  await browser.close();

  const head =
    'viewport       req  painted  │ switch: fps   p50   p95    max  >20ms  long(ms)  task(ms) │ idle: fps  >20ms  task ms/s';
  console.log(`GPU: ${gpu}\n${head}\n${'─'.repeat(head.length)}`);
  for (const r of results) {
    const s = r.switching;
    const i = r.idle;
    console.log(
      `${r.viewport.padEnd(14)} ${r.renderer.padEnd(4)} ${String(r.painted).slice(0, 7).padEnd(8)} │ ` +
        `${n1(s.fps).padStart(10)} ${n1(s.p50).padStart(5)} ${n1(s.p95).padStart(5)} ${n1(s.max).padStart(6)} ` +
        `${String(s.over20).padStart(6)} ${n1(s.longTaskMs).padStart(9)} ${n1(s.mainThreadMs.TaskDuration).padStart(9)} │ ` +
        `${n1(i.fps).padStart(9)} ${String(i.over20).padStart(6)} ${n1(i.taskMsPerSec).padStart(10)}`,
    );
  }

  const file = join(OUT, `perf-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ base: BASE, gpu, switches: SWITCHES, results }, null, 2));
  console.log(`\nwritten: ${file}`);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
