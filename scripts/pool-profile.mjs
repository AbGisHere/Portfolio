#!/usr/bin/env node
// Opt-in pass diagnostics, not an FPS gate: instrumentation itself has a cost.
// node scripts/pool-profile.mjs --base http://127.0.0.1:3108 --theme night
import { chromium } from '@playwright/test';
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { values } = parseArgs({ options: {
  base: { type: 'string', default: 'http://127.0.0.1:3108' },
  theme: { type: 'string', default: 'night' },
  out: { type: 'string', default: 'scripts/out/pool-profile' },
  gpu: { type: 'string', default: '1' },
} });
mkdirSync(values.out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(`${values.base}/?contact=0.35&profile=1&profilegpu=${values.gpu}&adapt=0&theme=${values.theme}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__debugHouse?.().ready, null, { timeout: 120000 });
  const gpu = await page.evaluate(() => {
    const canvas = document.querySelector('[data-renderer="gl"] canvas');
    const gl = canvas.getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER), width: canvas.width, height: canvas.height };
  });
  console.log(JSON.stringify({ gpu }));
  const sweeps = [];
  for (const [from, to] of [[.35, .8], [.8, .35], [.35, .8]]) {
    const result = await page.evaluate(async ({ from, to }) => {
      const initial = window.__houseProfile();
      const startFrame = initial.samples.at(-1)?.frame ?? 0;
      const start = performance.now();
      await new Promise(resolve => {
        function step(now) {
          const t = Math.min(1, (now - start) / 4000);
          window.__pinDescent({ about: 1, desk: 1, contact: from + (to - from) * t });
          if (t < 1) requestAnimationFrame(step); else resolve();
        }
        requestAnimationFrame(step);
      });
      await new Promise(r => setTimeout(r, 150));
      const result = window.__houseProfile();
      return { ...result, samples: result.samples.filter(s => s.frame > startFrame) };
    }, { from, to });
    const stats = {};
    for (const name of new Set(result.samples.map(s => s.name))) {
      const rows = result.samples.filter(s => s.name === name);
      const summarize = key => {
        const a = rows.map(r => r[key]).filter(Number.isFinite).sort((a,b) => a-b);
        return a.length ? { n: a.length, median: a[a.length >> 1], p95: a[Math.floor(a.length*.95)], max: a.at(-1) } : null;
      };
      stats[name] = { cpuMs: summarize('cpuMs'), gpuMs: summarize('gpuMs'), gapMs: summarize('gapMs') };
    }
    sweeps.push({ from, to, stats, ...result });
    console.log(JSON.stringify({ from, to, gpuAvailable: result.gpuAvailable, stats }));
  }
  const report = { source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceDiff: execFileSync('git', ['diff'], { encoding: 'utf8' }), base: values.base,
    browser: browser.version(), gpu, theme: values.theme, errors, sweeps };
  writeFileSync(`${values.out}/results.json`, JSON.stringify(report, null, 2));
  if (errors.length) { console.error(errors); process.exitCode = 1; }
} finally { await browser.close(); }
