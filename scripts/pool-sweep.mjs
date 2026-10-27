#!/usr/bin/env node
// Uninstrumented paired camera sweeps; one browser/GPU workload at a time.
import { chromium } from '@playwright/test';
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
const { values: args } = parseArgs({ options: {
  base: { type: 'string', default: 'http://127.0.0.1:3109' },
  reference: { type: 'string', default: 'http://127.0.0.1:3110' },
  theme: { type: 'string', default: 'night' },
  viewport: { type: 'string', default: '1440x900@2' },
  out: { type: 'string', default: 'scripts/out/pool-sweep' },
  'candidate-query': { type: 'string', default: '' },
} });
const [, width, height, dpr] = args.viewport.match(/^(\d+)x(\d+)@(\d+(?:\.\d+)?)$/) ?? [];
if (!width) throw new Error('Expected viewport WxH@dpr');
mkdirSync(args.out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'] });
const report = { args, browser: browser.version(), runs: [], note: 'Full-quality pinned camera segment, not a native-scroll or whole-journey test. Server source identity must be recorded by operator.' };
try {
  for (let run = 0; run < 3; run++) for (const side of run % 2 ? ['candidate', 'reference'] : ['reference', 'candidate']) {
    const context = await browser.newContext({ viewport: { width: +width, height: +height }, deviceScaleFactor: +dpr });
    try {
      await context.addInitScript(() => {
        let seed = 12345;
        Math.random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
        window.__sweepLongTasks = [];
        new PerformanceObserver(list => window.__sweepLongTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
      const base = side === 'candidate' ? args.base : args.reference;
      const query = side === 'candidate' ? `&${args['candidate-query']}` : '';
      await page.goto(`${base}/?contact=0.35&adapt=0&theme=${args.theme}${query}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__debugHouse?.().ready, null, { timeout: 120000 });
      const gpu = await page.evaluate(() => {
        const c = document.querySelector('[data-renderer="gl"] canvas'), gl = c.getContext('webgl2');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER), width: c.width, height: c.height };
      });
      const sweeps = [];
      for (const [from, to] of [[.35, .8], [.8, .35], [.35, .8]]) {
        const data = await page.evaluate(async ({ from, to }) => {
          const gaps = [], start = performance.now(); let last;
          await new Promise(resolve => {
            function step(now) {
              if (last !== undefined) gaps.push(now - last);
              last = now;
              const t = Math.min(1, (now - start) / 4000);
              window.__pinDescent({ about: 1, desk: 1, contact: from + (to - from) * t });
              if (t < 1) requestAnimationFrame(step); else resolve();
            }
            requestAnimationFrame(step);
          });
          const end = performance.now();
          await new Promise(r => setTimeout(r, 100));
          return { gaps, longTasks: window.__sweepLongTasks.filter(e => e.start >= start && e.start <= end) };
        }, { from, to });
        const sorted = [...data.gaps].sort((a,b) => a-b);
        const stats = { fps: data.gaps.length * 1000 / data.gaps.reduce((a,b) => a+b, 0),
          p95: sorted[Math.floor(sorted.length*.95)], p99: sorted[Math.floor(sorted.length*.99)],
          max: sorted.at(-1), over20: sorted.filter(n => n > 20).length };
        sweeps.push({ from, to, stats, ...data });
      }
      report.runs.push({ run, side, gpu, errors, sweeps });
      console.log(JSON.stringify({ run, side, sweeps: sweeps.map(s => s.stats), errors }));
      writeFileSync(`${args.out}/results.json`, JSON.stringify(report, null, 2));
      if (errors.length) process.exitCode = 1;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
