#!/usr/bin/env node
/**
 * Real-phone profile (0.5.32): how the site actually runs on a handful of
 * real phones and tablets (BrowserStack Automate, the keys in `.env.local`),
 * at rest and moving, beyond `devices`' pass/fail. Per device, one session:
 *
 *   - screen: its refresh rate (rAF on a blank page), the GPU, the DPR;
 *   - load: renderer picked, house mesh-ready and ready (ms after opening),
 *     the JS heap where the browser reports it (Chrome);
 *   - rest (4 s each, after the scene settles): opening, desk, pool by
 *     night, pool by day: frames drawn per second, GL calls a drawn frame,
 *     main-thread ms a frame, the late frames;
 *   - moving (the camera pinned along the path, as a scroll would): the
 *     flight down (about 0→1), the desk and the laptop opening (desk 0→1),
 *     the pool climb (contact .35→.8→.35), the whole path, and the whole
 *     path again at the end (heat): fps, p50/p95/max, frames over 1.5
 *     refreshes, main-thread ms a frame;
 *   - switch: the day/night switch at the opening (the sun clicked): its
 *     worst frame and the late frames;
 *   - errors the page logged.
 *
 *   node --import ./scripts/lib/resolve-js.mjs scripts/device-profile.mjs
 *        [--base URL] [--only <name,…>] [--theme night|day]
 *
 * Phones give pages no GPU timers, so this reads frame gaps, not GPU ms.
 * Detail (one JSON, every gap) goes to scripts/out/device-profile/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Builder } from 'selenium-webdriver';
import { Local } from 'browserstack-local';

// A spread: budget, mid and flagship Adreno; Mali (Samsung, Tensor); a
// budget tablet; Apple old and new. Names match `devices`' list.
const DEVICES = [
  { chip: 'Adreno 619 (budget)', deviceName: 'Motorola Moto G71 5G', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'Adreno 730 (120 Hz)', deviceName: 'OnePlus 11R', osVersion: '13.0', browserName: 'chrome' },
  { chip: 'Adreno 830 (flagship)', deviceName: 'Samsung Galaxy S25', osVersion: '15.0', browserName: 'chrome' },
  { chip: 'Mali-G78 or Adreno 660', deviceName: 'Samsung Galaxy S21', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'Mali-G710 (Tensor G2)', deviceName: 'Google Pixel 7', osVersion: '13.0', browserName: 'chrome' },
  { chip: 'Mali-G52 (old budget)', deviceName: 'Samsung Galaxy M32', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'PowerVR (Tensor G5)', deviceName: 'Google Pixel 10', osVersion: '16.0', browserName: 'chrome' },
  { chip: 'Adreno 619 (budget tablet)', deviceName: 'Samsung Galaxy Tab A9 Plus', osVersion: '14.0', browserName: 'chrome' },
  { chip: 'Apple A15 (iOS 16)', deviceName: 'iPhone 13', osVersion: '16', browserName: 'safari' },
  { chip: 'Apple A16 (iOS 26)', deviceName: 'iPhone 15', osVersion: '26', browserName: 'safari' },
];

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  args[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true;
}
const BASE = String(args.base ?? 'http://localhost:3001').replace(/\/$/, '');
const ONLY = args.only ? String(args.only).toLowerCase().split(',') : null;
const THEME = args.theme === 'day' ? 'day' : 'night';
const OUT = join('scripts', 'out', 'device-profile');
const OUT_FILE = args.out ? String(args.out) : null;

const env = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2];
  }
}
const USER = env.BROWSERSTACK_USERNAME;
const KEY = env.BROWSERSTACK_ACCESS_KEY;
if (!USER || !KEY) { console.log('device-profile: no BrowserStack keys, skipped'); process.exit(0); }

// In the page, once: counts GL draw calls and main-thread ms in frame
// callbacks, for every measurement after.
function install() {
  if (window.__prof) return true;
  const canvas = document.querySelector('[data-renderer="gl"] canvas');
  const gl = canvas && canvas.getContext('webgl2');
  const p = window.__prof = { calls: 0, cpu: 0 };
  // A lost context (low memory on budget GPUs): when, after load.
  if (canvas) canvas.addEventListener('webglcontextlost', () => { window.__ctxLost ??= Math.round(performance.now()); });
  if (gl) for (const f of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawBuffers']) {
    if (f === 'drawBuffers' || !gl[f]) continue;
    const o = gl[f].bind(gl);
    gl[f] = (...a) => { p.calls++; return o(...a); };
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(t => {
    const s = performance.now();
    try { cb(t); } finally { p.cpu += performance.now() - s; }
  });
  return !!gl;
}

// In the page (async): `ms` of frames; `path` gives the descent at t∈[0,1]
// (null holds still). Returns every gap, frames drawn, calls, cpu.
function measure(ms, path, done) {
  const p = window.__prof;
  const at = path ? new Function('t', `return (${path})(t);`) : null;
  const gaps = []; let last, drawn = 0, calls = 0, seen = p.calls;
  const cpu0 = p.cpu, t0 = performance.now();
  (function step(now) {
    if (last !== undefined) gaps.push(now - last);
    last = now;
    if (p.calls > seen) { drawn++; calls += p.calls - seen; seen = p.calls; }
    const t = Math.min(1, (now - t0) / ms);
    if (at) window.__pinDescent(at(t));
    if (t < 1) requestAnimationFrame(step);
    else done({ gaps, drawn, calls, cpu: p.cpu - cpu0, secs: (now - t0) / 1000, errors: (window.__errors || []).slice(0, 5) });
  })(performance.now());
}

// Waits until two 1 s windows in a row draw at the same rate (≤15 s), so
// the load's tail doesn't read as rest (perf's 0.5.25 rule).
function settle(done) {
  const p = window.__prof;
  let seen = p.calls, drawn = 0, prev = -99; const t0 = performance.now(); let w0 = t0;
  (function tick(now) {
    if (p.calls > seen) { drawn++; seen = p.calls; }
    if (now - w0 >= 1000) {
      if (Math.abs(drawn - prev) <= 1 || now - t0 > 15000) return done(true);
      prev = drawn; drawn = 0; w0 = now;
    }
    requestAnimationFrame(tick);
  })(performance.now());
}

const PATHS = {
  flight: 't => ({ about: t, desk: 0, contact: 0 })',
  desk: 't => ({ about: 1, desk: t, contact: 0 })',
  climb: 't => ({ about: 1, desk: 1, contact: t < .5 ? .35 + .9 * t : .8 - .9 * (t - .5) })',
  whole: 't => t < 1/3 ? { about: 3 * t, desk: 0, contact: 0 } : t < 2/3 ? { about: 1, desk: 3 * t - 1, contact: 0 } : { about: 1, desk: 1, contact: 3 * t - 2 }',
};
const REST = [
  ['opening', { about: 0, desk: 0, contact: 0 }],
  ['desk', { about: 1, desk: 0.6, contact: 0 }],
  ['pool', { about: 1, desk: 1, contact: 0.6 }],
];

const r1 = x => Math.round(x * 10) / 10;
function stats(m, hz) {
  const s = [...m.gaps].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0) || 1;
  return {
    fps: r1(s.length * 1000 / sum), p50: r1(s[s.length >> 1] ?? 0), p95: r1(s[Math.floor(s.length * 0.95)] ?? 0), max: r1(s.at(-1) ?? 0),
    late: s.filter(g => g > 1.5 * 1000 / hz).length, frames: s.length,
    drawnPerSec: r1(m.drawn / m.secs), callsPerDraw: m.drawn ? Math.round(m.calls / m.drawn) : 0,
    cpuPerFrame: r1(m.cpu / Math.max(1, s.length)),
  };
}

const devices = DEVICES.filter(d => !ONLY || ONLY.some(o => d.deviceName.toLowerCase().includes(o) || d.chip.toLowerCase().includes(o)));
const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
const localIdentifier = local ? `portfolio-${randomUUID().slice(0, 8)}` : undefined;
mkdirSync(OUT, { recursive: true });
let tunnel = null;
if (local) {
  tunnel = new Local();
  await new Promise((resolve, reject) =>
    tunnel.start({ key: KEY, localIdentifier, forceLocal: 'true', logFile: join(OUT, 'local.log') }, err => (err ? reject(err) : resolve())));
}
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const build = `device-profile v${version} ${new Date().toISOString().slice(0, 16)}`;

const results = [];
try {
  for (const d of devices) {
    const row = { device: d.deviceName, chip: d.chip, os: `${d.browserName} ${d.osVersion}`, errors: [] };
    let driver;
    try {
      driver = await new Builder().usingServer('https://hub.browserstack.com/wd/hub').withCapabilities({
        browserName: d.browserName,
        'bstack:options': {
          deviceName: d.deviceName, osVersion: d.osVersion, realMobile: 'true', userName: USER, accessKey: KEY,
          projectName: 'portfolio', buildName: build, sessionName: d.chip, ...(local ? { local: 'true', localIdentifier } : {}),
        },
      }).build();
    } catch (err) {
      row.note = `unavailable: ${String(err.message ?? err).split('\n')[0].slice(0, 140)}`;
      results.push(row); console.log(`n/a  ${d.deviceName}: ${row.note}`); continue;
    }
    const run = (fn, ...a) => driver.executeAsyncScript(`(${fn.toString()})(${a.map(x => JSON.stringify(x)).join(',')}${a.length ? ',' : ''}arguments[arguments.length - 1]);`);
    const pin = v => driver.executeScript(`window.__pinDescent(${JSON.stringify(v)});`);
    const step = async (name, f) => {
      try { await f(); } catch (e) {
        const m = String(e.message ?? e).split('\n')[0].slice(0, 140);
        // A page that no longer answers (iOS 16 in 0.5.32): stop this device.
        if (/atom execution|timed? ?out|Timeout/i.test(m)) { row.hung = name; throw new Error(`hung at ${name}`); }
        row.errors.push(`${name}: ${m}`);
      }
    };
    try {
      await driver.manage().setTimeouts({ script: 120000 });
      await driver.get('about:blank');
      row.hz = await driver.executeAsyncScript(`const done = arguments[arguments.length - 1];
        const gaps = []; let last; const t0 = performance.now();
        (function s(now) { if (last !== undefined) gaps.push(now - last); last = now;
          if (now - t0 < 1500) requestAnimationFrame(s); else { gaps.sort((a, b) => a - b); done(Math.round(1000 / gaps[Math.floor(gaps.length / 2)])); } })(performance.now());`);

      // (0.5.40) The intro, as a first-time visitor sees it: the hold in the
      // sky (to `data-intro=tilt`), then the tilt's frames to the landing.
      await driver.get(`${BASE}/?theme=${THEME}&adapt=0`);
      row.intro = await driver.executeAsyncScript(`const done = arguments[arguments.length - 1];
        const t0 = 0; const gaps = []; let last; let hold = null;
        const end = r => done(r);
        setTimeout(() => end({ hold, timeout: true, state: document.documentElement.dataset.intro ?? null }), 30000);
        (function s(now) {
          const st = document.documentElement.dataset.intro;
          if (st === 'off') return end({ off: true });
          if (st === 'tilt') { if (hold == null) hold = Math.round(now - t0); if (last !== undefined) gaps.push(now - last); last = now; }
          if (st === 'done' && hold != null) {
            gaps.sort((a, b) => a - b);
            const span = gaps.reduce((a, b) => a + b, 0);
            return end({ hold, fps: +(1000 * gaps.length / Math.max(1, span)).toFixed(1), p95: +(gaps[Math.floor(gaps.length * 0.95)] ?? 0).toFixed(1), max: +(gaps.at(-1) ?? 0).toFixed(1), over20: gaps.filter(g => g > 20).length });
          }
          requestAnimationFrame(s);
        })(performance.now());`).catch(e => ({ error: String(e.message ?? e).split('\n')[0].slice(0, 120) }));

      // Load: from the opening, as a visitor arrives.
      const t0 = Date.now();
      await driver.get(`${BASE}/?theme=${THEME}&adapt=0&intro=0`);
      const nav = Date.now() - t0;
      await driver.wait(async () => driver.executeScript("const h = document.querySelector('[data-renderer]'); return !!(h && h.getAttribute('data-renderer'));").catch(() => false), 120000).catch(() => false);
      row.renderer = await driver.executeScript("return document.querySelector('[data-renderer]')?.getAttribute('data-renderer') ?? null;");
      row.load = { pageLoad: nav, rendererPicked: Date.now() - t0 };
      row.gpu = await driver.executeScript(`const gl = document.createElement('canvas').getContext('webgl2');
        const x = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : null;`);
      row.dpr = await driver.executeScript('return devicePixelRatio;');
      if (row.renderer !== 'gl') throw new Error(`renderer ${row.renderer}`);
      await driver.executeScript(`return (${install.toString()})();`);

      // Rest at the opening first (the house builds in the background).
      row.rest = {};
      await step('rest opening', async () => { await pin(REST[0][1]); await run(settle); row.rest.opening = stats(await run(measure, 4000, null), row.hz); });
      // The house: go to the pool and wait for it ready.
      await pin({ about: 1, desk: 1, contact: 0.6 });
      const ready = await driver.wait(async () => driver.executeScript('return !!(window.__debugHouse && window.__debugHouse().ready);').catch(() => false), 180000).catch(() => false);
      const ht = await driver.executeScript('return window.__debugHouse ? window.__debugHouse().times : null;').catch(() => null);
      row.load.house = ready && ht ? { meshReady: ht['mesh-ready'], ready: ht.ready } : 'never ready';
      row.ctxLostAt = await driver.executeScript('return window.__ctxLost ?? null;').catch(() => null);
      row.load.heapMB = await driver.executeScript('return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;');
      for (const [name, v] of REST.slice(1)) {
        await step(`rest ${name}`, async () => { await pin(v); await run(settle); row.rest[name] = stats(await run(measure, 4000, null), row.hz); });
      }

      row.move = {};
      await pin({ about: 0, desk: 0, contact: 0 });
      await run(settle);
      for (const [name, ms] of [['flight', 5000], ['desk', 5000], ['climb', 8000], ['whole', 9000]]) {
        await step(`move ${name}`, async () => { const m = await run(measure, ms, PATHS[name]); row.move[name] = stats(m, row.hz); for (const e of m.errors) if (!row.errors.includes(e)) row.errors.push(e); });
      }

      // The switch at the opening.
      await step('switch', async () => {
        await pin({ about: 0, desk: 0, contact: 0 }); await run(settle);
        const clicked = await driver.executeScript("const b = document.querySelector('button[data-sun-toggle]'); if (!b) return false; b.click(); return true;");
        if (!clicked) throw new Error('no sun button');
        row.switch = stats(await run(measure, 5000, null), row.hz);
      });

      // Heat: the whole path again, last.
      await step('move whole (again)', async () => { row.move.wholeAgain = stats(await run(measure, 9000, PATHS.whole), row.hz); });
      const lateLost = await driver.executeScript('return window.__ctxLost ?? null;').catch(() => null);
      if (lateLost != null) row.ctxLostAt ??= lateLost;
      const pageErrors = await driver.executeScript('return (window.__errors || []).slice(0, 10);').catch(() => []);
      for (const e of pageErrors) if (!row.errors.includes(e)) row.errors.push(e);
      row.finalRenderer = await driver.executeScript("return document.querySelector('[data-renderer]')?.getAttribute('data-renderer') ?? null;").catch(() => null);
    } catch (err) {
      row.errors.push(`run: ${String(err.message ?? err).split('\n')[0].slice(0, 140)}`);
    } finally {
      await driver.quit().catch(() => {});
      results.push(row);
      const f = s => s ? `${s.fps}fps p95 ${s.p95} max ${s.max} late ${s.late}` : '—';
      const rr = s => s ? `${s.drawnPerSec}/s×${s.callsPerDraw} cpu ${s.cpuPerFrame}` : '—';
      console.log(`\n${d.deviceName} · ${row.gpu ?? '?'} · ${row.hz ?? '?'} Hz · dpr ${row.dpr ?? '?'}`);
      if (row.load) console.log(`  load    page ${row.load.pageLoad} ms · renderer ${row.load.rendererPicked} ms · house ${typeof row.load.house === 'object' ? `mesh ${(row.load.house.meshReady / 1000).toFixed(1)} s, ready ${(row.load.house.ready / 1000).toFixed(1)} s` : row.load.house} · heap ${row.load.heapMB ?? '—'} MB`);
      if (row.intro) console.log(`  intro   ${row.intro.off ? 'off' : row.intro.error ? row.intro.error : row.intro.timeout ? `timed out (${row.intro.state}, hold ${row.intro.hold ?? '—'} ms)` : `hold ${row.intro.hold} ms · tilt ${row.intro.fps} fps, p95 ${row.intro.p95} ms, max ${row.intro.max} ms, >20 ms ${row.intro.over20}`}`);
      if (row.rest) console.log(`  rest    ${Object.entries(row.rest).map(([k, s]) => `${k} ${rr(s)}`).join(' · ')}`);
      if (row.move) for (const [k, s] of Object.entries(row.move)) console.log(`  ${k.padEnd(11)} ${f(s)} cpu ${s.cpuPerFrame}`);
      if (row.switch) console.log(`  switch      ${f(row.switch)}`);
      if (row.ctxLostAt != null) console.log(`  context LOST at ${row.ctxLostAt} ms`);
      if (row.finalRenderer && row.finalRenderer !== row.renderer) console.log(`  renderer fell back: ${row.renderer} -> ${row.finalRenderer}`);
      if (row.errors.length) console.log(`  errors  ${row.errors.join(' | ')}`);
      const outPath = OUT_FILE ? (OUT_FILE.includes('/') ? OUT_FILE : join(OUT, OUT_FILE)) : join(OUT, `profile-${version}-${THEME}.json`);
      writeFileSync(outPath, JSON.stringify({ base: BASE, build, theme: THEME, results }, null, 2));
    }
  }
} finally {
  if (tunnel) await new Promise(r => tunnel.stop(r));
}
const finalOut = OUT_FILE ? (OUT_FILE.includes('/') ? OUT_FILE : join(OUT, OUT_FILE)) : join(OUT, `profile-${version}-${THEME}.json`);
console.log(`\n${results.length} devices · ${finalOut}`);
