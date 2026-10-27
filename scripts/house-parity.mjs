#!/usr/bin/env node
/** Cross-build house regression gate; see ROADMAP.md 0.4.37.
 * node scripts/house-parity.mjs --base http://localhost:3001 --reference http://localhost:3002
 * Rooms require dev /house on each side; optional --room-base and --reference-room-base.
 * --views desk-hold,kitchen --viewports 1440x900@2 --themes night --settle 10000
 * --out scripts/out/house-parity --reference-revision v0.4.35 --reference-dir /path/to/checkout
 * Thresholds are fixed: max channel <= 2, mean RGB < .2. No threshold override.
 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { ensureDir, parseArgs, viewportsFrom, seedTheme, readRenderer } from './lib/harness.mjs';
import { watchConsole, overflowsX } from './lib/console.mjs';

const pi = Math.PI;
// The 18 HouseExplorer presets, plus WC and a close view of the offending lamp.
const rooms = {
  approach: [0, 5.3, -44, pi, .06], porch: [1.5, 5.3, -57.2, pi - .15, .05],
  foyer: [6.2, 5.3, -63.8, pi - .3, .1], living: [-1.2, 5.2, -64.2, pi + .55, .12],
  dining: [4.2, 5.3, -64.4, pi - .5, .2], kitchen: [1.8, 5.3, -72, pi - .45, .18],
  study: [.9, 5.3, -73.8, pi + .5, .15], landing: [-5, 8.9, -72, pi + .45, .2],
  bedroom: [1.9, 8.9, -71.8, pi + .45, .2], wardrobe: [-.6, 8.9, -76.1, pi, .15],
  'en-suite': [3.3, 8.9, -71.7, pi - .6, .2], guest: [3.2, 8.9, -76.8, pi / 2 + .3, .15],
  terrace: [6.5, 8.8, -59.2, pi + .55, .25], 'pool-preset': [0, 14, -60.7, pi, 1.5],
  'from-meadow': [0, 6, -38, pi, .03], cascade: [-4.9, 8.9, -74.4, pi * 1.5, .05],
  passage: [1.6, 8.9, -78.1, pi * 1.5, .05], stair: [-4.6, 5.3, -71.2, pi + .75, -.15],
  wc: [6.9, 5.2, -68.2, pi + .5, .12],
  'lamp-close': [6.3, 4.3, -68.6, pi / 2, .12],
};
const views = [
  { name: 'desk-hold', query: { desk: '1' } },
  ...['0.50', '0.56', '0.60', '0.64'].map(contact => ({ name: `contact-${contact}`, query: { contact } })),
  { name: 'pool-above', query: { contact: '1' } },
  ...Object.entries(rooms).map(([name, cam]) => ({ name, cam: [...cam, 1] })),
];
const args = parseArgs();
const base = String(args.base ?? 'http://localhost:3001');
const reference = args.reference;
if (args.help || args.list) {
  console.log('House parity: --base URL --reference URL [--room-base URL --reference-room-base URL] [--reference-dir PATH] [--reference-revision REF] [--views names] [--viewports WxH@dpr] [--themes day,night] [--settle ms] [--timeout ms] [--out PATH] [--headed] [--quiet]');
  console.log(views.map(v => v.name).join(','));
  process.exit(0);
}
if (!reference) throw new Error('--reference is required (the v0.4.35 server)');
for (const key of ['threshold', 'max', 'mean', 'p99']) if (args[key] !== undefined) throw new Error('The acceptance thresholds cannot be overridden');
const selected = args.views ? String(args.views).split(',') : views.map(v => v.name);
for (const name of selected) if (!views.some(v => v.name === name)) throw new Error(`Unknown view: ${name}`);
const selectedViews = views.filter(v => selected.includes(v.name));
const vps = viewportsFrom(args.viewports, ['1440x900@2', '393x852@2']);
const themes = String(args.themes ?? 'day,night').split(',');
if (themes.some(t => !['day', 'night'].includes(t))) throw new Error('Themes must be day and/or night');
const settle = Number(args.settle ?? 10000), timeout = Number(args.timeout ?? 120000);
if (!Number.isFinite(settle) || settle < 0 || !Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid settle/timeout');
const out = ensureDir(resolve(String(args.out ?? 'scripts/out/house-parity')));
const git = (cwd, ...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8' }).trim(); } catch { return null; } };
const referenceDir = resolve(String(args['reference-dir'] ?? '.'));
const referenceRevision = String(args['reference-revision'] ?? 'v0.4.35');
const metadata = {
  started: new Date().toISOString(), args: process.argv.slice(2), base, reference,
  roomBase: args['room-base'] ?? base, referenceRoomBase: args['reference-room-base'] ?? reference,
  candidateRevision: git('.', 'rev-parse', 'HEAD'),
  candidateDiffSha256: createHash('sha256').update(git('.', 'diff', 'HEAD') ?? '').digest('hex'),
  referenceRevision, referenceHash: git(referenceDir, 'rev-parse', referenceRevision),
  referenceCheckoutHash: args['reference-dir'] ? git(referenceDir, 'rev-parse', 'HEAD') : null,
  revisionNote: 'Hashes identify local source; server revisions must be verified by the operator.',
  thresholds: { maxChannel: 2, meanExclusive: .2, amplification: 32 }, seed: '0x9e3779b9', settle,
  expectedCases: selectedViews.length * vps.length * themes.length,
  fullMatrix: selectedViews.length === 26 && vps.length === 2 && vps.some(v => v.name === '1440x900@2') && vps.some(v => v.name === '393x852@2') && themes.includes('day') && themes.includes('night'),
};
function deterministic() {
  let t = 0x9e3779b9;
  Math.random = () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  try { localStorage.removeItem('abg-lamp'); localStorage.removeItem('abg-trees'); } catch {}
}
async function capture(browser, side, vp, theme, view, file) {
  const origin = side === 'candidate' ? (view.cam ? metadata.roomBase : base) : (view.cam ? metadata.referenceRoomBase : reference);
  const url = new URL(view.cam ? '/house' : '/', origin);
  const query = { renderer: 'gl', freeze: '1', grain: '0', adapt: '0', skyt: '0', boot: '1', theme, ...view.query };
  if (view.cam) query.cam = view.cam.join(',');
  if (side === 'candidate' && args['candidate-query']) Object.assign(query, Object.fromEntries(new URLSearchParams(String(args['candidate-query']))));
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr });
  try {
    await seedTheme(context, theme); await context.addInitScript(deterministic);
    const page = await context.newPage(); const errors = watchConsole(page);
    const response = await page.goto(url.toString(), { waitUntil: 'load', timeout });
    if (!response?.ok()) throw new Error(`HTTP ${response?.status()} at ${url}`);
    await page.waitForSelector('[data-renderer="gl"] canvas', { timeout });
    if (view.cam) await page.waitForFunction(() => typeof window.__houseCam === 'function', null, { timeout });
    // Freeze hides the grain; keep this image restricted to the renderer, excluding dev HUD/readiness UI.
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}body *{visibility:hidden!important}canvas{visibility:visible!important}' });
    await page.waitForTimeout(settle);
    const readiness = await page.evaluate(() => window.__debugHouse?.() ?? null);
    if (readiness && (!readiness.house || !readiness.houseBuilt)) throw new Error(`House not ready: ${JSON.stringify(readiness)}`);
    const painted = await readRenderer(page);
    if (painted !== 'gl') throw new Error(`Renderer silently fell back to ${painted}`);
    const canvas = page.locator('[data-renderer="gl"] canvas').first();
    const png = await canvas.screenshot({ type: 'png', timeout });
    writeFileSync(file, png);
    return { png, url: url.toString(), errors, overflow: await overflowsX(page), readiness, sha256: createHash('sha256').update(png).digest('hex') };
  } finally { await context.close(); }
}
async function compare(page, a, b) {
  return page.evaluate(async ({ a, b }) => {
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(Error('PNG decode failed')); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) throw Error('Image dimension mismatch');
    const w = ia.width, h = ia.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(ia, 0, 0); const pa = ctx.getImageData(0, 0, w, h).data;
    ctx.drawImage(ib, 0, 0); const pb = ctx.getImageData(0, 0, w, h).data;
    const heat = ctx.createImageData(w, h); let sum = 0, max = 0, changed = 0, above = 0, worst = null;
    let minA = 255, maxA = 0, minB = 255, maxB = 0;
    for (let p = 0; p < w * h; p++) {
      let pixelMax = 0;
      for (let k = 0; k < 3; k++) { const i = p * 4 + k, d = Math.abs(pa[i] - pb[i]); sum += d; pixelMax = Math.max(pixelMax, d); heat.data[i] = Math.min(255, d * 32); minA = Math.min(minA, pa[i]); maxA = Math.max(maxA, pa[i]); minB = Math.min(minB, pb[i]); maxB = Math.max(maxB, pb[i]); }
      heat.data[p * 4 + 3] = 255;
      if (pixelMax) changed++; if (pixelMax > 2) above++;
      if (pixelMax > max) { max = pixelMax; worst = { x: p % w, y: Math.floor(p / w) }; }
    }
    ctx.putImageData(heat, 0, 0);
    return { width: w, height: h, mean: sum / (w * h * 3), max, changedPixels: changed, aboveThresholdPixels: above, worst, blank: maxA === minA || maxB === minB, diff: c.toDataURL('image/png') };
  }, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });
}
const results = [];
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function save() {
  writeFileSync(join(out, 'results.json'), JSON.stringify({ metadata, results }, null, 2));
  const rows = results.map(r => `<section><h2>${escape(r.id)} — ${r.ok ? 'PASS' : 'FAIL'}</h2><p>${escape(r.error ?? `max ${r.max}; mean ${r.mean}; above ${r.aboveThresholdPixels}; errors ${JSON.stringify(r.errors)}`)}</p><div>${['reference', 'candidate', 'diff-x32'].map(s => `<a href="${r.id}-${s}.png"><img loading="lazy" src="${r.id}-${s}.png" alt="${escape(r.id)} ${s}"></a>`).join('')}</div></section>`).join('');
  writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>House parity ×32</title><style>body{background:#151515;color:#eee;font:14px monospace}section{margin:2rem 0}section div{display:flex;gap:8px}a{width:33%}img{width:100%}</style><h1>House parity: reference | candidate | ×32 absolute RGB difference</h1><p>Fixed gate: max ≤ 2/255; mean &lt; 0.2/255. ${results.length}/${metadata.expectedCases} cases. ${metadata.fullMatrix ? 'Full matrix' : 'SUBSET'}.</p>${rows}`);
}
let browser;
try {
  browser = await chromium.launch({ headless: !args.headed, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'] });
  const info = await browser.newPage();
  metadata.gpu = await info.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'no WebGL2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  await info.close();
  metadata.browser = browser.version();
  const diffPage = await browser.newPage();
  for (const vp of vps) for (const theme of themes) for (const view of selectedViews) {
    const id = `${view.name}-${theme}-${vp.name}`;
    let result;
    try {
      const a = await capture(browser, 'reference', vp, theme, view, join(out, `${id}-reference.png`));
      const b = await capture(browser, 'candidate', vp, theme, view, join(out, `${id}-candidate.png`));
      const { diff, ...stats } = await compare(diffPage, a.png, b.png);
      writeFileSync(join(out, `${id}-diff-x32.png`), Buffer.from(diff.split(',')[1], 'base64'));
      const allErrors = [...a.errors.map(e => `reference ${e}`), ...b.errors.map(e => `candidate ${e}`)];
      // /house is dev-only. Next dev preloads unused error-route CSS/fonts;
      // hiding the inspector HUD also leaves its fonts unused. Preserve these
      // diagnostics separately; production captures and all other warnings fail.
      const devWarnings = view.cam ? allErrors.filter(e => /warning: The resource .*\/_next\/.* was preloaded using link preload but not used/.test(e)) : [];
      const errors = allErrors.filter(e => !devWarnings.includes(e));
      result = { id, view, viewport: vp, theme, ...stats, errors, devWarnings, reference: { url: a.url, readiness: a.readiness, sha256: a.sha256 }, candidate: { url: b.url, readiness: b.readiness, sha256: b.sha256 }, ok: stats.max <= 2 && stats.mean < .2 && !stats.blank && !errors.length && !a.overflow && !b.overflow, overflow: { reference: a.overflow, candidate: b.overflow } };
    } catch (error) { result = { id, ok: false, error: String(error.stack ?? error) }; }
    results.push(result); save();
    if (!args.quiet || !result.ok) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${id}: ${result.error ?? `max ${result.max}, mean ${result.mean.toFixed(6)}, pixels >2 ${result.aboveThresholdPixels}`}`);
  }
} catch (error) { metadata.fatal = String(error.stack ?? error); process.exitCode = 2; }
finally { await browser?.close(); metadata.finished = new Date().toISOString(); save(); }
const passed = results.filter(r => r.ok).length;
console.log(`house-parity: ${passed}/${metadata.expectedCases} passed (${metadata.fullMatrix ? 'full' : 'subset'}), ${out}/index.html`);
if (passed !== metadata.expectedCases) process.exitCode = process.exitCode || 1;
