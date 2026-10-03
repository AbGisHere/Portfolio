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
 *        [--base URL] [--only <name,…>] [--list] [--quiet]
 *
 * Per device it opens the site at the desk's end (`?desk=0.6`), then in the
 * page compiles and links each program from the repo's own shader sources
 * (the main scene, the crests, the grass, the meadow's paint, flowers and
 * foot mist), reads the GPU, WebGL2 and which renderer the site picked, and
 * screenshots the frame. A device passes when it has WebGL2, every program
 * links and the site runs on GL; one marked `expect: 'layers'` (no WebGL2)
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
  { chip: 'Adreno 610 (budget)', deviceName: 'Xiaomi Redmi Note 11', osVersion: '11.0', browserName: 'chrome' },
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
  { chip: 'PowerVR GE8320 (budget)', deviceName: 'Vivo Y21', osVersion: '11.0', browserName: 'chrome' },
  { chip: 'PowerVR (Tensor G5)', deviceName: 'Google Pixel 10', osVersion: '16.0', browserName: 'chrome' },
  { chip: 'Tensor G6', deviceName: 'Google Pixel 11', osVersion: '17.0', browserName: 'chrome' },
  // Android tablets, old to new.
  { chip: 'Adreno 650 (tablet, Android 11)', deviceName: 'Samsung Galaxy Tab S7', osVersion: '11.0', browserName: 'chrome' },
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
  { chip: 'Apple A13 (iOS 13, no WebGL2)', deviceName: 'iPhone 11', osVersion: '13', browserName: 'safari', expect: 'layers' },
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
const QUIET = !!args.quiet;
const ONLY = args.only ? String(args.only).toLowerCase().split(',') : null;
const OUT = join('scripts', 'out', 'devices');

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
  for (const [name, vsSrc, fsSrc] of programs) {
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
      gl.linkProgram(p);
      link = !!gl.getProgramParameter(p, gl.LINK_STATUS);
      log = gl.getProgramInfoLog(p) || '';
    }
    out.programs.push({ name, vs: vs.ok, fs: fs.ok, link, log: (vs.log || fs.log || log).slice(0, 400) });
  }
  return out;
}

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
    try {
      await driver.get(`${BASE}/?desk=0.6`);
      await driver.sleep(8000);
      const r = await driver.executeScript(`return (${probe.toString()})(arguments[0]);`, PROGRAMS);
      row.gpu = r.gpu;
      row.renderer = r.renderer;
      row.programs = r.programs;
      row.errors = r.errors;
      for (const e of r.errors) row.failed.push(`page error: ${e}`);
      if (d.expect === 'layers') {
        // No WebGL2 here: the site must fall back to the layered scene.
        if (r.renderer !== 'layers') row.failed.push(`site renderer ${r.renderer ?? 'none'} (expected layers)`);
      } else {
        if (!r.webgl2) row.failed.push('no WebGL2');
        for (const p of r.programs) if (!p.link) row.failed.push(`${p.name} (${!p.vs ? 'vertex' : !p.fs ? 'fragment' : 'link'}${p.log ? `: ${p.log.split('\n')[0]}` : ''})`);
        if (r.renderer !== 'gl') row.failed.push(`site renderer ${r.renderer ?? 'none'}`);
      }
      row.status = row.failed.length ? 'FAIL' : 'pass';
      const shot = join(OUT, `${slug(d.deviceName)}.png`);
      writeFileSync(shot, await driver.takeScreenshot(), 'base64');
      row.shot = relative(process.cwd(), shot);
      await driver.executeScript(
        `browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: { status: row.status === 'pass' ? 'passed' : 'failed', reason: row.failed.join('; ').slice(0, 250) || 'all programs link' } })}`,
      );
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
writeFileSync(file, JSON.stringify({ base: BASE, build, results }, null, 2));
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const na = results.filter(r => r.status === 'unavailable').length;
console.log(`devices: ${passed}/${passed + failed} devices passed${na ? ` · ${na} unavailable` : ''} · ${relative(process.cwd(), file)}`);
process.exit(failed ? 1 : 0);
