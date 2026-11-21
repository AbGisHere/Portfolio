#!/usr/bin/env node
/**
 * Real phones and tablets (0.3.4): every shader program the atmosphere
 * builds, compiled and linked on one device per GPU family that matters
 * (Adreno old and new, Mali old and new, Exynos Xclipse, PowerVR, Apple),
 * on BrowserStack Automate's real devices. Desktop GPUs and emulators don't
 * show driver bugs: 0.3.1–0.3.3 shipped a grass program Adreno's linker
 * rejects, found on a real Xiaomi 12 Pro.
 *
 *   node --import ./scripts/lib/resolve-js.mjs scripts/devices.mjs
 *        [--base URL] [--path /?…] [--only <name,…>] [--list] [--quiet]
 *        [--climb [--theme day|night] [--query k=v&…]]
 *
 * Per device it opens the site at `--path` (default the house by night,
 * `/?contact=0.6&theme=night`; `&theme=day` for the day), then in the
 * page compiles and links each program from the repo's own shader sources
 * (the main scene, the crests, the grass, the meadow's paint, flowers and
 * foot mist), reads the GPU, WebGL2 and which renderer the site picked, and
 * screenshots the frame; then (0.5.26) opens the desk at rest and checks the
 * site built its grass list (`data-grass-list`, transform feedback), and
 * screenshots that too (`<device>-desk.png`). A device passes when it has
 * WebGL2, every program links (the grass's transform feedback run and read
 * back too), the grass list is built and the site runs on GL; one marked `expect: 'layers'` (no WebGL2)
 * passes when the site falls back to the layered scene.
 *
 * `--base` is the production server (default http://localhost:3001); a
 * localhost base goes through a BrowserStack Local tunnel. `--list` prints
 * the real mobile devices Automate offers (exact names for DEVICES).
 * Keys come from BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY, in the
 * environment or `.env.local` (never committed); without them it skips
 * (exit 0). Devices run one at a time (the plan has one parallel).
 * Detail (results.json, screenshots) goes to scripts/out/devices/; `--quiet`
 * prints only failures and the summary line. See scripts/README.md.
 *
 * `--climb` (0.4.39) times the pool climb instead, on each real device: it
 * reads the screen's refresh rate from a rAF loop on a blank page, opens the
 * house at `contact=0.35`, waits until the house is ready, then sweeps the camera
 * 0.35 → 0.80 → 0.35 → 0.80 (4 s each, like scripts/pool-sweep.mjs) and
 * records each frame's gap: fps, p95, p99, the worst, and the frames that
 * missed the screen's budget (over 1.5 refreshes). A device meets the goal
 * when its median sweep holds the screen's rate (60 on 60 Hz, 120 on
 * 120 Hz) within 5%. It also prints how long the house took to build and
 * to prepare on the GPU (0.4.40). Detail goes to scripts/out/devices-climb/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Builder } from 'selenium-webdriver';
import { Local } from 'browserstack-local';
import { PROGRAMS } from './lib/programs.mjs';

/**
 * One device per GPU family. `chip` is what it's here to cover; the run
 * reports the GPU it actually got (a model can ship with more than one).
 * Names and OS versions must match Automate's list (`--list`).
 */
const DEVICES = [
  // Adreno (Snapdragon), old to new: the 730 is the one whose linker
  // rejected the grass (0.3.1–0.3.3).
  { chip: 'Adreno 730 (Snapdragon 8 Gen 1)', deviceName: 'Samsung Galaxy S22 Ultra', osVersion: '12.0', browserName: 'chrome' }, // (0.5.0) replaces the Redmi Note 11 (Adreno 610), retired 2026-11-12; no budget Adreno is left
  { chip: 'Adreno 619 (mid)', deviceName: 'Motorola Moto G71 5G', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'Adreno 730', deviceName: 'OnePlus 11R', osVersion: '13.0', browserName: 'chrome' },
  { chip: 'Adreno 750', deviceName: 'OnePlus 13R', osVersion: '15.0', browserName: 'chrome' },
  { chip: 'Adreno 830', deviceName: 'Samsung Galaxy S25', osVersion: '15.0', browserName: 'chrome' },
  { chip: 'Adreno 840 or Xclipse 960', deviceName: 'Samsung Galaxy S26', osVersion: '16.0', browserName: 'chrome' },
  // Mali (most budget phones; Tensor) and Samsung's own Exynos GPUs, old
  // to new. Galaxy flagships ship with Exynos or Snapdragon by region: the
  // run records which one it got.
  { chip: 'Mali-G52 (old budget)', deviceName: 'Samsung Galaxy M32', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'Mali-G77 or Adreno 650 (Android 10)', deviceName: 'Samsung Galaxy S20', osVersion: '10.0', browserName: 'chrome' },
  { chip: 'Mali-G78 or Adreno 660', deviceName: 'Samsung Galaxy S21', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'Mali-G78 (Tensor G1)', deviceName: 'Google Pixel 6', osVersion: '12.0', browserName: 'chrome' },
  { chip: 'Xclipse 920 or Adreno 730', deviceName: 'Samsung Galaxy S22', osVersion: '12.0', browserName: 'chrome' },
  { chip: 'Mali-G710 (Tensor G2)', deviceName: 'Google Pixel 7', osVersion: '13.0', browserName: 'chrome' },
  { chip: 'Xclipse 940 or Adreno 750', deviceName: 'Samsung Galaxy S24', osVersion: '14.0', browserName: 'chrome' },
  { chip: 'Mali-G715 (Tensor G4)', deviceName: 'Google Pixel 9', osVersion: '15.0', browserName: 'chrome' },
  // PowerVR: old (budget MediaTek) and new (Tensor G5 on).
  { chip: 'Mali-G715 (Tensor G3)', deviceName: 'Google Pixel 8', osVersion: '14.0', browserName: 'chrome' }, // (0.5.0) replaces the Vivo Y21 (PowerVR), retired 2026-11-12; no PowerVR is left
  { chip: 'PowerVR (Tensor G5)', deviceName: 'Google Pixel 10', osVersion: '16.0', browserName: 'chrome' },
  { chip: 'Tensor G6', deviceName: 'Google Pixel 11', osVersion: '17.0', browserName: 'chrome' },
  // Android tablets, old to new.
  { chip: 'Adreno 730 (tablet, Android 12)', deviceName: 'Samsung Galaxy Tab S8', osVersion: '12.0', browserName: 'chrome' }, // (0.5.0) replaces the Tab S7, retired 2026-11-12
  { chip: 'Adreno 619 (budget tablet)', deviceName: 'Samsung Galaxy Tab A9 Plus', osVersion: '14.0', browserName: 'chrome' },
  { chip: 'Mali-G925 (tablet)', deviceName: 'Samsung Galaxy Tab S11', osVersion: '16.0', browserName: 'chrome' },
  // Samsung Internet, Samsung's own browser.
  { chip: 'Adreno 740 (Samsung Internet)', deviceName: 'Samsung Galaxy S23', osVersion: '13.0', browserName: 'samsung' },
  // Apple, newest to oldest. WebGL2 arrived in iOS 15: the ones before it
  // must get the layered fallback.
  { chip: 'Apple A20 (iOS 27)', deviceName: 'iPhone 18 Pro', osVersion: '27', browserName: 'safari' },
  { chip: 'Apple A16 (iOS 26)', deviceName: 'iPhone 15', osVersion: '26', browserName: 'safari' },
  { chip: 'Apple A15 (iOS 16)', deviceName: 'iPhone 13', osVersion: '16', browserName: 'safari' },
  { chip: 'Apple A15 (iOS 15)', deviceName: 'iPhone SE 2022', osVersion: '15', browserName: 'safari' },
  { chip: 'Apple M4 (iPad Pro, iPadOS 26)', deviceName: 'iPad Pro 13 2025', osVersion: '26', browserName: 'safari' },
  { chip: 'Apple A14 (iPad, iPadOS 16)', deviceName: 'iPad 10th', osVersion: '16', browserName: 'safari' },
  { chip: 'Apple A13 (iPad, iPadOS 15)', deviceName: 'iPad 9th', osVersion: '15', browserName: 'safari' },
  { chip: 'Apple A18 (iOS 18)', deviceName: 'iPhone 16e', osVersion: '18', browserName: 'safari' }, // (0.5.0) replaces the iPhone 11 (iOS 13), retired 2026-11-12; nothing under iOS 14 is left
  { chip: 'Apple A14 (iOS 14, no WebGL2)', deviceName: 'iPhone 12', osVersion: '14', browserName: 'safari', expect: 'layers' },
  { chip: 'Apple A12Z (iPad, iPadOS 14, no WebGL2)', deviceName: 'iPad Pro 12.9 2020', osVersion: '14', browserName: 'safari', expect: 'layers' },
];

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  args[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true;
}
const BASE = String(args.base ?? 'http://localhost:3001').replace(/\/$/, '');
const PATH = args.path ? String(args.path) : '/?contact=0.6&theme=night';
const QUIET = !!args.quiet;
const ONLY = args.only ? String(args.only).toLowerCase().split(',') : null;
const CLIMB = !!args.climb;
const THEME = args.theme === 'day' ? 'day' : 'night';
// Extra URL flags for the climb (profiling: `mirror=0`, `dpr=1`, …).
const QUERY = args.query ? `&${String(args.query).replace(/^[?&]/, '')}` : '';
const OUT = join('scripts', 'out', CLIMB ? 'devices-climb' : 'devices');
// (0.5.13) `--costs peaks-behind,house-colour-depth`: with --climb, the climb
// again with each pass skipped (`?skip=`), so each one's cost is a number
// per phone (phones have no GPU timers).
const COSTS = args.costs ? String(args.costs).split(',').filter(Boolean) : [];

// The keys: the environment first, then .env.local.
const env = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2];
  }
}
const USER = env.BROWSERSTACK_USERNAME;
const KEY = env.BROWSERSTACK_ACCESS_KEY;
if (!USER || !KEY) {
  console.log('devices: skipped (no BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY in the environment or .env.local)');
  process.exit(0);
}

if (args.list) {
  const res = await fetch('https://api.browserstack.com/automate/browsers.json', {
    headers: { Authorization: `Basic ${Buffer.from(`${USER}:${KEY}`).toString('base64')}` },
  });
  if (!res.ok) {
    console.log(`devices: list failed (HTTP ${res.status})`);
    process.exit(1);
  }
  const rows = (await res.json()).filter(b => b.real_mobile);
  for (const b of rows.sort((x, y) => `${x.os}${x.device}`.localeCompare(`${y.os}${y.device}`))) {
    console.log(`${b.os.padEnd(8)} ${String(b.os_version).padEnd(6)} ${b.device}${b.browser ? ` (${b.browser})` : ''}`);
  }
  console.log(`devices: ${rows.length} real mobile devices`);
  process.exit(0);
}

// In the page: a WebGL2 context of its own, each program compiled and
// linked (logs kept), the GPU's name, and which renderer the site runs.
function probe(programs) {
  const out = { webgl2: false, gpu: null, renderer: null, programs: [], errors: [] };
  const host = document.querySelector('[data-renderer]');
  out.renderer = host ? host.getAttribute('data-renderer') : null;
  // Errors the page caught before and while the app ran (app/layout.jsx).
  out.errors = (window.__errors || []).slice(0, 5);
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return out;
  out.webgl2 = true;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  out.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  // (0.5.15) Float targets: with them the site never uses peaks-all.
  out.floatTargets = !!gl.getExtension('EXT_color_buffer_float');
  // (0.5.15) After a program fails, the rest go on in a fresh context: a
  // compiler giving up on one (the S21's Mali on peaks-all) must not fail
  // the ones after it. One context otherwise: a context per program took
  // iOS 15 Safari's session down.
  let ctx = gl;
  for (const [name, vsSrc, fsSrc, varyings] of programs) {
    const gl = ctx;
    if (!gl) { out.programs.push({ name, vs: false, fs: false, link: false, log: 'no WebGL2 context for this program' }); continue; }
    const stage = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return { s, ok: !!gl.getShaderParameter(s, gl.COMPILE_STATUS), log: gl.getShaderInfoLog(s) || '' };
    };
    const vs = stage(gl.VERTEX_SHADER, vsSrc);
    const fs = stage(gl.FRAGMENT_SHADER, fsSrc);
    let link = false;
    let log = '';
    if (vs.ok && fs.ok) {
      const p = gl.createProgram();
      gl.attachShader(p, vs.s);
      gl.attachShader(p, fs.s);
      if (varyings) gl.transformFeedbackVaryings(p, varyings, gl.SEPARATE_ATTRIBS);
      gl.linkProgram(p);
      link = !!gl.getProgramParameter(p, gl.LINK_STATUS);
      log = gl.getProgramInfoLog(p) || '';
      // (0.5.26) A program whose outputs the site reads back (the grass's
      // liveness pass): one pass of 64 instances, the rasterizer off, read
      // back. Any GL error, or no read, fails it.
      if (link && varyings) {
        try {
          while (gl.getError()) { /* clear */ }
          gl.useProgram(p);
          const lv = gl.getUniformLocation(p, 'uLive');
          if (lv) gl.uniform1i(lv, 1);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buf);
          gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 64 * 4, gl.STREAM_READ);
          const tf = gl.createTransformFeedback();
          gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buf);
          gl.vertexAttribI4ui(1, 0, 0, 0, 0);
          gl.enable(gl.RASTERIZER_DISCARD);
          gl.beginTransformFeedback(gl.POINTS);
          gl.drawArraysInstanced(gl.POINTS, 0, 1, 64);
          gl.endTransformFeedback();
          gl.disable(gl.RASTERIZER_DISCARD);
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
          gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
          const got = new Uint32Array(64);
          gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buf);
          gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, got);
          const err = gl.getError();
          if (err) { link = false; log = `transform feedback: GL error 0x${err.toString(16)}`; }
        } catch (e) {
          link = false;
          log = `transform feedback: ${String(e.message || e).slice(0, 200)}`;
        }
      }
    }
    out.programs.push({ name, vs: vs.ok, fs: fs.ok, link, log: (vs.log || fs.log || log).slice(0, 400) });
    if (!link) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      ctx = document.createElement('canvas').getContext('webgl2');
    }
  }
  return out;
}

// In the page (async: the last argument is the callback): the screen's
// rate, then the climb's frame gaps.
function climb(done) {
  const frames = (ms, each) => new Promise(resolve => {
    const gaps = []; const start = performance.now(); let last;
    function step(now) {
      if (last !== undefined) gaps.push(now - last);
      last = now;
      const t = Math.min(1, (now - start) / ms);
      each?.(t);
      if (t < 1) requestAnimationFrame(step); else resolve(gaps);
    }
    requestAnimationFrame(step);
  });
  const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  // Main-thread time inside the page's frame callbacks (the renderer re-asks
  // each frame, so it takes the wrapped one from the next frame on).
  const raf = window.requestAnimationFrame.bind(window);
  let cpu = 0;
  window.requestAnimationFrame = cb => raf(t => {
    const s = performance.now();
    try { cb(t); } finally { cpu += performance.now() - s; }
  });
  (async () => {
    const sweeps = [];
    for (const [from, to] of [[0.35, 0.8], [0.8, 0.35], [0.35, 0.8]]) {
      cpu = 0;
      const gaps = await frames(4000, t => window.__pinDescent({ about: 1, desk: 1, contact: from + (to - from) * t }));
      sweeps.push({ from, to, gaps, cpuPerFrame: cpu / gaps.length });
    }
    // With `profile=1` (MistCanvas's pass profiler), each pass's GPU time.
    const passes = {};
    for (const x of window.__houseProfile?.().samples ?? []) {
      if (x.name === 'frame' || x.gpuMs == null) continue;
      (passes[x.name] ??= []).push(x.gpuMs);
    }
    for (const k in passes) passes[k] = { n: passes[k].length, median: median(passes[k]) };
    done({ sweeps, passes, errors: (window.__errors || []).slice(0, 5) });
  })().catch(e => done({ error: String(e) }));
}
const stats = (gaps, hz) => {
  const s = [...gaps].sort((a, b) => a - b);
  const budget = 1000 / hz;
  return {
    fps: gaps.length * 1000 / gaps.reduce((a, b) => a + b, 0),
    p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)], max: s.at(-1),
    missed: s.filter(g => g > budget * 1.5).length, frames: s.length,
  };
};

const devices = DEVICES.filter(d => !ONLY || ONLY.some(o => d.deviceName.toLowerCase().includes(o) || d.chip.toLowerCase().includes(o)));
const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
const localIdentifier = local ? `portfolio-${randomUUID().slice(0, 8)}` : undefined;
let tunnel = null;
mkdirSync(OUT, { recursive: true });
if (local) {
  tunnel = new Local();
  await new Promise((resolve, reject) =>
    tunnel.start({ key: KEY, localIdentifier, forceLocal: 'true', logFile: join(OUT, 'local.log') }, err => (err ? reject(err) : resolve())),
  );
}
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const build = `devices v${version} ${new Date().toISOString().slice(0, 16)}`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const results = [];
try {
  for (const d of devices) {
    const row = { ...d, status: 'FAIL', gpu: null, failed: [], note: '' };
    let driver = null;
    try {
      driver = await new Builder()
        .usingServer('https://hub.browserstack.com/wd/hub')
        .withCapabilities({
          browserName: d.browserName,
          'bstack:options': {
            deviceName: d.deviceName,
            osVersion: d.osVersion,
            realMobile: 'true',
            userName: USER,
            accessKey: KEY,
            projectName: 'portfolio',
            buildName: build,
            sessionName: d.chip,
            ...(local ? { local: 'true', localIdentifier } : {}),
          },
        })
        .build();
    } catch (err) {
      row.status = 'unavailable';
      row.note = String(err.message ?? err).split('\n')[0].slice(0, 160);
      results.push(row);
      console.log(`n/a  ${d.deviceName} (${d.osVersion}): ${row.note}`);
      continue;
    }
    if (CLIMB) {
      try {
        if (d.expect === 'layers') {
          row.status = 'unavailable';
          row.note = 'no WebGL2 (layered fallback)';
          continue;
        }
        await driver.manage().setTimeouts({ script: 60000 });
        // The screen's rate, on a blank page: the site renders continuously
        // at the climb (wind, water), so its own frames can't show it.
        await driver.get('about:blank');
        const hz = await driver.executeAsyncScript(`const done = arguments[arguments.length - 1];
          const gaps = []; let last; const t0 = performance.now();
          (function step(now) { if (last !== undefined) gaps.push(now - last); last = now;
            if (now - t0 < 1500) requestAnimationFrame(step);
            else { gaps.sort((a, b) => a - b); done(Math.round(1000 / gaps[Math.floor(gaps.length / 2)])); } })(performance.now());`);
        await driver.get(`${BASE}/?contact=0.35&adapt=0&theme=${THEME}${QUERY}`);
        // The house builds and compiles on the device: up to three minutes.
        const ready = await driver.wait(async () =>
          driver.executeScript('return !!(window.__debugHouse && window.__debugHouse().ready);').catch(() => false), 180000).catch(() => false);
        if (!ready) throw new Error('house never ready');
        // (0.4.40) The two holds a visitor waits at: the house's build (the
        // closed laptop) and its GPU preparation (the open one), ms.
        const t = await driver.executeScript('return window.__debugHouse().times;');
        row.load = t?.loading !== undefined ? { build: t['mesh-ready'] - t.loading, prepare: t.ready - t['mesh-ready'], ready: t.ready } : null;
        const r = await driver.executeAsyncScript(`(${climb.toString()})(arguments[arguments.length - 1]);`);
        if (r.error) throw new Error(r.error);
        row.gpu = await driver.executeScript(`const gl = document.createElement('canvas').getContext('webgl2');
          const x = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : null;`);
        row.hz = hz;
        row.sweeps = r.sweeps.map(sw => ({ from: sw.from, to: sw.to, cpuPerFrame: sw.cpuPerFrame, ...stats(sw.gaps, hz) }));
        row.gaps = r.sweeps.map(sw => sw.gaps.map(g => Math.round(g * 10) / 10));
        row.passes = r.passes;
        const fps = [...row.sweeps.map(sw => sw.fps)].sort((a, b) => a - b)[1];
        row.fps = fps;
        row.costs = {};
        for (const pass of COSTS) {
          await driver.get(`${BASE}/?contact=0.35&adapt=0&theme=${THEME}${QUERY}&skip=${encodeURIComponent(pass)}`);
          const ok = await driver.wait(async () =>
            driver.executeScript('return !!(window.__debugHouse && window.__debugHouse().ready);').catch(() => false), 180000).catch(() => false);
          if (!ok) { row.costs[pass] = null; continue; }
          const rc = await driver.executeAsyncScript(`(${climb.toString()})(arguments[arguments.length - 1]);`);
          const f = rc.error ? null : [...rc.sweeps.map(sw => stats(sw.gaps, hz).fps)].sort((a, b) => a - b)[1];
          row.costs[pass] = f == null ? null : Math.round((f - fps) * 10) / 10;
        }
        if (COSTS.length) console.log(`  ${d.deviceName}: ${fps.toFixed(1)} fps; without ${Object.entries(row.costs).map(([k, v]) => `${k} ${v == null ? '—' : `${v >= 0 ? '+' : ''}${v}`}`).join(', ')}`);
        for (const e of r.errors) row.failed.push(`page error: ${e}`);
        if (fps < hz * 0.95) row.failed.push(`${fps.toFixed(1)} fps on a ${hz} Hz screen`);
        row.status = row.failed.length ? 'FAIL' : 'pass';
      } catch (err) {
        row.note = String(err.message ?? err).split('\n')[0].slice(0, 160);
        row.failed.push(`run: ${row.note}`);
      } finally {
        await driver.quit().catch(() => {});
        results.push(row);
        const sw = row.sweeps?.map(x => `${x.fps.toFixed(1)}fps cpu ${x.cpuPerFrame.toFixed(1)}ms p95 ${x.p95.toFixed(0)}ms missed ${x.missed}/${x.frames}`).join(' | ') ?? row.note;
        console.log(`${row.status === 'pass' ? 'ok  ' : row.status === 'unavailable' ? 'n/a ' : 'FAIL'} ${d.deviceName.padEnd(26)} ${String(row.hz ?? '-').padStart(3)} Hz · ${sw} · ${row.gpu ?? ''}`);
        const ranked = Object.entries(row.passes ?? {}).sort((a, b) => b[1].median - a[1].median);
        if (row.load) console.log(`       load: build ${(row.load.build / 1000).toFixed(1)} s · GPU preparation ${(row.load.prepare / 1000).toFixed(1)} s · ready ${(row.load.ready / 1000).toFixed(1)} s after opening`);
        if (ranked.length) console.log(`       GPU ms (median): ${ranked.map(([k, v]) => `${k} ${v.median.toFixed(1)} (n${v.n})`).join(' · ')}`);
      }
      continue;
    }
    try {
      const url = `${BASE}${PATH.startsWith('/') ? PATH : `/${PATH}`}`;
      await driver.get(url);
      await driver.sleep(8000);
      // (0.5.15) Slow phones (iOS 15) pick their renderer later than 8 s.
      await driver.wait(async () => driver.executeScript(
        "const h = document.querySelector('[data-renderer]'); return !!(h && h.getAttribute('data-renderer'));").catch(() => false), 120000).catch(() => false);
      // (0.4.41) A house view is screenshotted once the house is drawn, so a
      // phone GPU's lighting can be checked by eye (0.4.40's Adreno bug).
      if (await driver.executeScript('return !!window.__debugHouse;').catch(() => false)) {
        await driver.wait(async () =>
          driver.executeScript('return !!window.__debugHouse().ready;').catch(() => false), 180000).catch(() => false);
        await driver.sleep(2000);
      }
      // (0.5.15) Only the renderer and errors from the site: the whole probe
      // there failed on iOS 15's busy page (a server-side error), so a small
      // read, retried.
      const siteRead = () => driver.executeScript(
        "const h = document.querySelector('[data-renderer]'); return { renderer: h ? h.getAttribute('data-renderer') : null, errors: (window.__errors || []).slice(0, 5) };");
      let site = null;
      for (let i = 0; i < 3 && !site; i++) site = await siteRead().catch(async () => { await driver.sleep(3000); return null; });
      const shot = join(OUT, `${slug(d.deviceName)}.png`);
      writeFileSync(shot, await driver.takeScreenshot(), 'base64');
      row.shot = relative(process.cwd(), shot);
      // (0.5.26) The desk at rest: the site's grass list (only the blades
      // that grow, by transform feedback) must get built. Not in the climb
      // (its own pages).
      if (!CLIMB && site?.renderer === 'gl') {
        const deskUrl = `${BASE}/?desk=0.6${QUERY}`;
        await driver.get(deskUrl);
        const n = await driver.wait(async () => driver.executeScript(
          "const h = document.querySelector('[data-grass-list]'); return h ? h.getAttribute('data-grass-list') : null;").catch(() => null), 90000).catch(() => null);
        row.grassList = n == null ? null : Number(n);
        if (!(row.grassList > 0)) row.failed.push(`grass list not built at the desk (${n ?? 'none'})`);
        const deskShot = join(OUT, `${slug(d.deviceName)}-desk.png`);
        writeFileSync(deskShot, await driver.takeScreenshot(), 'base64');
        const deskErrors = await driver.executeScript('return (window.__errors || []).slice(0, 5);').catch(() => []);
        for (const e of deskErrors ?? []) row.failed.push(`desk page error: ${e}`);
      }
      // (0.5.13) The programs on a blank page, not beside the site's own
      // context (iOS and old Malis refused a second one). (0.5.15) After the
      // site, not before: on iOS 15 the probe's compiles left Safari unable
      // to run the site's page (every script call failed).
      // (0.5.15) On iOS 15 the probe's compiles can take Safari's session
      // down ("Unable to communicate to node"): the site's own result stands,
      // and the probe is noted as not run.
      const blank = await driver.get('about:blank')
        .then(() => driver.executeScript(`return (${probe.toString()})(arguments[0]);`, PROGRAMS))
        .catch(err => ({ webgl2: false, probeError: String(err.message ?? err).split('\n')[0].slice(0, 120) }));
      const r = blank?.webgl2 ? { ...blank, renderer: site?.renderer, errors: site?.errors } : { ...site, programs: [] };
      row.gpu = r?.gpu;
      row.renderer = r?.renderer;
      row.programs = r?.programs;
      // (The probe can come back without an errors list, as on the iPhone
      // SE 2022: log what it did return rather than throw.)
      if (!Array.isArray(r?.errors)) console.log(`  ${d.deviceName}: probe returned ${JSON.stringify(r)?.slice(0, 300)}`);
      row.errors = r?.errors ?? [];
      for (const e of row.errors) row.failed.push(`page error: ${e}`);
      if (d.expect === 'layers') {
        // No WebGL2 here: the site must fall back to the layered scene.
        if (r?.renderer !== 'layers') row.failed.push(`site renderer ${r?.renderer ?? 'none'} (expected layers)`);
      } else {
        // (0.5.13) Where the site itself runs on GL but the probe gets no
        // second WebGL2 context (iOS and old Malis under memory pressure),
        // the programs can't be checked here: noted, not failed.
        if (!r?.webgl2) {
          if (r?.renderer === 'gl') row.note = blank?.probeError ? `probe not run (${blank.probeError}); the site runs on GL` : 'probe: no second WebGL2 context (the site runs on GL)';
          else row.failed.push('no WebGL2');
        }
        // (0.5.15) peaks-all is only the fallback for GPUs without float
        // targets; where they exist a rejection is noted, not failed.
        const unused = p => p.name === 'peaks-all' && r?.floatTargets;
        for (const p of r?.programs ?? []) if (!p.link && unused(p)) row.note = 'peaks-all rejected (unused here: float targets)';
        for (const p of r?.programs ?? []) if (!p.link && !unused(p)) row.failed.push(`${p.name} (${!p.vs ? 'vertex' : !p.fs ? 'fragment' : 'link'}${p.log ? `: ${p.log.split('\n')[0]}` : ''})`);
        if (r?.renderer !== 'gl') row.failed.push(`site renderer ${r?.renderer ?? 'none'}`);
      }
      row.status = row.failed.length ? 'FAIL' : 'pass';
      await driver.executeScript(
        `browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: { status: row.status === 'pass' ? 'passed' : 'failed', reason: row.failed.join('; ').slice(0, 250) || 'all programs link' } })}`,
      ).catch(() => {});
    } catch (err) {
      row.note = String(err.message ?? err).split('\n')[0].slice(0, 160);
      row.failed.push(`run: ${row.note}`);
    } finally {
      await driver.quit().catch(() => {});
    }
    results.push(row);
    const line = `${row.status === 'pass' ? 'ok  ' : 'FAIL'} ${d.chip.padEnd(36)} ${d.deviceName} ${d.osVersion} · ${row.gpu ?? 'no GPU'}`;
    if (row.status !== 'pass') console.log(`${line}\n       ${row.failed.join('\n       ')}\n       ${row.shot ?? ''}`);
    else if (!QUIET) console.log(line);
  }
} finally {
  if (tunnel) await new Promise(resolve => tunnel.stop(resolve));
}

const file = join(OUT, 'results.json');
const json = JSON.stringify({ base: BASE, build, ...(CLIMB ? { climb: true, theme: THEME, query: QUERY, costs: COSTS } : {}), results }, null, 2);
writeFileSync(file, json);
// (0.5.13) Each run kept too (a retry no longer overwrites a run's logs).
writeFileSync(join(OUT, `results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), json);
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const na = results.filter(r => r.status === 'unavailable').length;
console.log(`devices: ${passed}/${passed + failed} devices passed${na ? ` · ${na} unavailable` : ''} · ${relative(process.cwd(), file)}`);
process.exit(failed ? 1 : 0);
