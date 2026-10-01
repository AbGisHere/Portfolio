#!/usr/bin/env node
/**
 * Renderer performance: per renderer × viewport, times every frame of four
 * day/night switches, a stretch of idle and a scroll through the descent
 * (wheel down the page's track and back up, `about` 0 → 1 → 0), plus
 * main-thread cost from CDP.
 *
 *   node scripts/perf.mjs [--base URL] [--renderers layers,gl]
 *        [--viewports 1440x900@2,393x852@2] [--switches 4] [--window ms]
 *        [--idle 3000] [--scroll 1] [--headed] [--query k=v&k=v]
 *        [--gate [--min-fps 118] [--max-long 3] [--retries 1] [--dropout 0]]
 *        [--quiet]
 *
 * Prints a table and writes scripts/out/perf/perf-<timestamp>.json.
 *
 * `--gate` (run by `npm run qa`) makes it pass/fail: every scroll sweep must
 * hold `--min-fps` with at most `--max-long` frames over 20 ms, and no page
 * may log a console error or warning. By default it gates GL at 1440x900@2,
 * 1728x1117@2 and 393x852@2, and layers at 1440x900@2, 1792x1120@2 and
 * 393x852@2 (`--renderers`/`--viewports` replace that with their product),
 * with one switch and 1 s of idle per case. A failing case is measured again
 * up to `--retries` times, since a headless sweep on a busy machine drops
 * frames of its own. It also prints GL's drawing buffer against native at
 * 5K@2 and 6K@2, for information. Last, the dropout pass (`--dropout 0`
 * skips it): the layered renderer is scrolled under a capped GPU memory
 * budget per viewport (lib/dropout.mjs, DROPOUT_CASES), day and night, and
 * any frame with a dropped raster tile fails. Exits 1 if the gate fails.
 *
 * `--quiet` (as `npm run qa` runs it) prints only failing cases, then one
 * summary line.
 * Absolute numbers depend on the machine and on headless GPU support; compare
 * renderers within one run, not across machines. See scripts/README.md.
 */
import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
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
import { watchConsole } from './lib/console.mjs';
import { DROPOUT_CASES, describeBad, findDropout, gpuArgs, recordScroll, saveBadFrames } from './lib/dropout.mjs';

const args = parseArgs();
const BASE = args.base ?? 'http://localhost:3001';
const GATE = Boolean(args.gate);
const MIN_FPS = Number(args['min-fps'] ?? 118);
const MAX_LONG = Number(args['max-long'] ?? 3);
const RETRIES = Number(args.retries ?? 1);
const DROPOUT_ON = GATE && args.dropout !== '0';
const QUIET = Boolean(args.quiet);
const RENDERERS = String(args.renderers ?? 'layers,gl').split(',');
const SWITCHES = Number(args.switches ?? (GATE ? 1 : 4));
// ms recorded after each click; by default each switch is recorded for as
// long as it runs (until the sun button stops ignoring clicks).
const WINDOW = Number(args.window ?? 0);
const IDLE = Number(args.idle ?? (GATE ? 1000 : 3000));
// Scroll sweeps (down the descent track and back up); 0 skips them.
const SCROLLS = Number(args.scroll ?? 1);
// Extra query params for every page, e.g. `--query crest=cpu`.
const QUERY = Object.fromEntries(new URLSearchParams(typeof args.query === 'string' ? args.query : ''));
const VIEWPORTS = viewportsFrom(args.viewports, [
  '1440x900@2',
  '1728x1117@2',
  '393x852@2',
  '3440x1440@1',
]);

// What the gate holds each renderer to: the laptop panels each one ships on
// (GL at the MacBook Pro 16's default 1728x1117, layers at 1792x1120) and a
// phone. `--renderers`/`--viewports` replace it with their product.
const GATE_CASES = [
  ['gl', '1440x900@2'],
  ['gl', '1728x1117@2'],
  ['gl', '393x852@2'],
  ['layers', '1440x900@2'],
  ['layers', '1792x1120@2'],
  ['layers', '393x852@2'],
];
const CASES =
  GATE && !args.renderers && !args.viewports
    ? GATE_CASES.map(([renderer, vp]) => ({ renderer, vp: viewportsFrom(vp, [])[0] }))
    : VIEWPORTS.flatMap(vp => RENDERERS.map(renderer => ({ renderer, vp })));

// Sharpness (info until 0.2.11 sets a rule): GL's drawing buffer against the
// native pixel count on large panels, where MAX_PIXELS caps it.
const SHARP_VIEWPORTS = viewportsFrom(null, ['2560x1440@2', '3008x1692@2']);

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
      if (click) document.querySelector('button[data-sun-toggle]')?.click();
      await new Promise(resolve => {
        const tick = t => {
          ts.push(t);
          const busy = document.querySelector('button[data-sun-toggle][data-busy]');
          const more = ms ? t - t0 < ms : t - t0 < 150 || (busy && t - t0 < 10000);
          if (more) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      await new Promise(r => setTimeout(r, 0)); // let the observer flush
      po?.disconnect();
      return { intervals: ts.slice(1).map((t, i) => t - ts[i]), long, ms: ts[ts.length - 1] - t0 };
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
  const errors = watchConsole(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  await page.goto(sceneUrl(BASE, renderer, QUERY), { waitUntil: 'load' });
  await page
    .waitForSelector('[data-renderer]', { timeout: 15000 })
    .catch(() => {});
  await sleep(2500);
  const painted = await readRenderer(page);

  // Switches: day→night→day…, each recorded for its whole run (or WINDOW ms),
  // with a pause so the next one starts from rest.
  const m0 = await metrics(cdp);
  const all = [];
  const long = [];
  let recorded = 0;
  for (let i = 0; i < SWITCHES; i++) {
    const r = await recordFrames(page, WINDOW, true);
    all.push(...r.intervals);
    long.push(...r.long);
    recorded += r.ms;
    await sleep(400);
  }
  const m1 = await metrics(cdp);
  const switching = {
    ...summarise(all, long, recorded),
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

  // Scroll: wheel down the whole descent track and back up, recording every
  // frame. The painted sun's centre (data-sun-cy) confirms the camera moved.
  let scroll = null;
  if (SCROLLS > 0) {
    await page.mouse.move(vp.width / 2, vp.height / 2);
    const cy = () => page.evaluate(() => Number(document.querySelector('[data-renderer]')?.dataset.sunCy ?? NaN));
    const track = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const cy0 = await cy();
    const m4 = await metrics(cdp);
    await page.evaluate(() => {
      const rec = (window.__scrollRec = { ts: [], long: [], on: true });
      try {
        rec.po = new PerformanceObserver(l => l.getEntries().forEach(e => rec.long.push(e.duration)));
        rec.po.observe({ type: 'longtask' });
      } catch {}
      const tick = t => {
        rec.ts.push(t);
        if (rec.on) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    let cyMid = cy0;
    const steps = Math.max(20, Math.ceil(track / 60));
    for (let k = 0; k < SCROLLS; k++) {
      for (const dir of [1, -1]) {
        for (let i = 0; i < steps; i++) {
          await page.mouse.wheel(0, dir * 60);
          await sleep(16);
        }
        await sleep(900); // let the smoothing land
        if (dir === 1) cyMid = await cy();
      }
    }
    const rec = await page.evaluate(() => {
      const r = window.__scrollRec;
      r.on = false;
      r.po?.disconnect();
      return { intervals: r.ts.slice(1).map((t, i) => t - r.ts[i]), long: r.long, ms: r.ts.at(-1) - r.ts[0] };
    });
    const m5 = await metrics(cdp);
    scroll = {
      ...summarise(rec.intervals, rec.long, rec.ms),
      mainThreadMs: delta(m4, m5),
      sunCy: [cy0, cyMid, await cy()],
    };
  }

  await context.close();
  return { renderer, painted, viewport: vp.name, switching, idle, scroll, errors };
}

/** The gate's verdict on one measured case: a list of problems. */
function gateProblems(r) {
  const out = [];
  if (r.painted !== r.renderer) out.push(`painted ${r.painted}`);
  if (!r.scroll) out.push('no scroll sweep');
  else {
    if (r.scroll.fps < MIN_FPS) out.push(`scroll ${n1(r.scroll.fps)} fps < ${MIN_FPS}`);
    if (r.scroll.over20 > MAX_LONG) out.push(`${r.scroll.over20} frames > 20 ms (max ${MAX_LONG})`);
  }
  if (r.errors.length) out.push(`console: ${r.errors.join(' | ')}`);
  return out;
}

/** GL's drawing buffer against native (CSS px × DPR), per large viewport. */
async function sharpness(browser) {
  const rows = [];
  for (const vp of SHARP_VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
    });
    const page = await context.newPage();
    await page.goto(sceneUrl(BASE, 'gl', { freeze: '1', adapt: '0' }), { waitUntil: 'load' });
    await page.waitForSelector('[data-renderer="gl"] canvas', { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const m = await page.evaluate(() => {
      const c = document.querySelector('[data-renderer="gl"] canvas');
      return c && { w: c.width, h: c.height, nw: Math.round(innerWidth * devicePixelRatio), nh: Math.round(innerHeight * devicePixelRatio) };
    });
    await context.close();
    rows.push({ viewport: vp.name, ...(m ?? {}) });
  }
  return rows;
}

const n1 = x => x.toFixed(1);

/**
 * The dropout pass: the layered renderer, wheel-scrolled down the track and
 * back under each case's GPU memory cap (one browser per cap: the flag is
 * browser-wide), screencast and searched for dropped tiles. Bad frames go
 * to scripts/out/perf/dropout/<case>/ (NNN-marked.png outlines the blocks).
 */
async function dropoutPass() {
  const rows = [];
  for (const mem of [...new Set(DROPOUT_CASES.map(c => c.mem))]) {
    const browser = await chromium.launch({ headless: !args.headed, args: gpuArgs({ mem }) });
    const decodePage = await (await browser.newContext()).newPage();
    for (const c of DROPOUT_CASES.filter(c => c.mem === mem)) {
      const vp = viewportsFrom(c.viewport, [])[0];
      for (const theme of ['day', 'night']) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.dpr,
        });
        await context.addInitScript(t => {
          try {
            localStorage.setItem('abg-theme', t);
          } catch {}
        }, theme);
        const page = await context.newPage();
        const errors = watchConsole(page);
        await page.goto(sceneUrl(BASE, 'layers', { grain: '0', adapt: '0' }), { waitUntil: 'load' });
        await page
          .waitForFunction(() => document.querySelector('[data-renderer="layers"] [data-ready], [data-renderer="layers"][data-ready]'), null, {
            timeout: 20000,
          })
          .catch(() => errors.push('layers never ready'));
        await sleep(1500); // Lenis loads when idle; the masks decode
        const cdp = await context.newCDPSession(page);
        const rec = await recordScroll(page, cdp);
        await context.close();
        const found = await findDropout(decodePage, rec.frames, { phases: rec.phases });
        const dir = join(OUT, 'dropout', `${vp.name}-${theme}`);
        await saveBadFrames(decodePage, rec.frames, found.bad, dir);
        rows.push({ viewport: vp.name, theme, mem, frames: rec.frames.length, bad: found.bad, errors, dir });
      }
    }
    await browser.close();
  }
  return rows;
}

async function main() {
  const browser = await chromium.launch({
    headless: !args.headed,
    args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'],
  });
  const results = [];
  for (const { vp, renderer } of CASES) {
    let r = await measure(browser, vp, renderer);
    // Gate: a failing case gets another go (headless sweeps on a busy machine
    // drop frames of their own); the last try counts.
    for (let t = 0; GATE && t < RETRIES && gateProblems(r).length; t++) {
      if (!QUIET) console.log(`retry  ${vp.name} ${renderer}: ${gateProblems(r).join('; ')}`);
      r = { ...(await measure(browser, vp, renderer)), retried: t + 1 };
    }
    results.push(r);
  }
  const sharp = GATE ? await sharpness(browser) : null;
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
  const dropout = DROPOUT_ON ? await dropoutPass() : null;

  const file = join(OUT, `perf-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const slim = dropout?.map(({ bad, ...d }) => ({ ...d, bad: describeBad(bad) }));
  writeFileSync(file, JSON.stringify({ base: BASE, gpu, switches: SWITCHES, results, sharpness: sharp, dropout: slim }, null, 2));
  const say = QUIET ? () => {} : console.log;

  const head =
    'viewport       req  painted  │ switch: fps   p50   p95    max  >20ms  long(ms)  task(ms) │ idle: fps  >20ms  task ms/s │ scroll: fps   p95    max  >20ms  sun y top→bottom→top';
  say(`GPU: ${gpu}\n${head}\n${'─'.repeat(head.length)}`);
  for (const r of results) {
    const s = r.switching;
    const i = r.idle;
    say(
      `${r.viewport.padEnd(14)} ${r.renderer.padEnd(4)} ${String(r.painted).slice(0, 7).padEnd(8)} │ ` +
        `${n1(s.fps).padStart(10)} ${n1(s.p50).padStart(5)} ${n1(s.p95).padStart(5)} ${n1(s.max).padStart(6)} ` +
        `${String(s.over20).padStart(6)} ${n1(s.longTaskMs).padStart(9)} ${n1(s.mainThreadMs.TaskDuration).padStart(9)} │ ` +
        `${n1(i.fps).padStart(9)} ${String(i.over20).padStart(6)} ${n1(i.taskMsPerSec).padStart(10)}` +
        (r.scroll
          ? ` │ ${n1(r.scroll.fps).padStart(11)} ${n1(r.scroll.p95).padStart(5)} ${n1(r.scroll.max).padStart(6)} ` +
            `${String(r.scroll.over20).padStart(6)}  ${r.scroll.sunCy.map(n1).join('→')}`
          : ''),
    );
  }

  for (const r of results) {
    if (r.errors.length && !GATE) console.log(`console ${r.viewport} ${r.renderer}: ${r.errors.join(' | ')}`);
  }

  let failed = 0;
  if (GATE) {
    say(`\ngate: scroll ≥ ${MIN_FPS} fps, ≤ ${MAX_LONG} frames > 20 ms, no console errors`);
    for (const r of results) {
      const problems = gateProblems(r);
      if (problems.length) failed++;
      (problems.length ? console.log : say)(
        `${problems.length ? 'FAIL' : 'ok  '} ${r.viewport.padEnd(12)} ${r.renderer.padEnd(6)} ` +
          `scroll ${n1(r.scroll?.fps ?? 0)} fps, ${r.scroll?.over20 ?? '—'} > 20 ms` +
          (r.retried ? ` (retry ${r.retried})` : '') +
          (problems.length ? `  → ${problems.join('; ')}` : ''),
      );
    }
    say('\nsharpness (info): GL drawing buffer against native');
    const pct = s => (s.w ? `${((100 * s.w) / s.nw).toFixed(0)}%` : 'no GL canvas');
    for (const s of sharp) {
      say(`info ${s.viewport.padEnd(12)} ${s.w ? `${s.w}x${s.h} of ${s.nw}x${s.nh} (${pct(s)} per axis)` : pct(s)}`);
    }
    let dropped = 0;
    if (dropout) {
      say('\ndropout: layers under a capped GPU memory budget, no dropped tiles');
      for (const d of dropout) {
        const bad = d.bad.length || d.errors.length;
        if (bad) dropped++;
        (bad ? console.log : say)(
          `${bad ? 'FAIL' : 'ok  '} ${d.viewport.padEnd(12)} ${d.theme.padEnd(6)}cap ${d.mem} MB  ` +
            `${d.bad.length} of ${d.frames} frames dropped tiles` +
            (d.errors.length ? `  console: ${d.errors.join(' | ')}` : '') +
            (d.bad.length ? `  → ${relative(process.cwd(), d.dir)}` : ''),
        );
      }
    }
    const fps = results.map(r => r.scroll?.fps ?? 0);
    const summary =
      `gate ${results.length - failed}/${results.length} passed, min scroll ${n1(Math.min(...fps))} fps` +
      (dropout ? ` · dropout ${dropout.length - dropped}/${dropout.length} clean` : '') +
      ` · sharpness (info) ${sharp.map(s => `${s.viewport} ${pct(s)}`).join(', ')}`;
    failed += dropped;
    console.log(QUIET ? `perf: ${summary} · ${relative(process.cwd(), file)}` : `\n${summary}`);
  } else if (QUIET) console.log(`perf: ${results.length} cases · ${relative(process.cwd(), file)}`);

  say(`\nwritten: ${file}`);
  if (failed) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
