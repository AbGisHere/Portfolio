#!/usr/bin/env node
// Real scroll/readiness transitions, including native touch and reduced motion.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://127.0.0.1:3113';
const browser = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'] });
try {
  for (const mode of ['wheel', 'touch', 'reduced']) {
    const context = await browser.newContext({
      viewport: mode === 'touch' ? { width: 393, height: 852 } : { width: 1440, height: 900 },
      deviceScaleFactor: 2, isMobile: mode === 'touch', hasTouch: mode === 'touch',
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.text()); });
      await page.goto(`${base}/?adapt=0`, { waitUntil: 'load' });
      await page.waitForFunction(() => !!window.__debugHouse);
      assert.equal(await page.evaluate(() => window.__debugHouse().houseBuilt), false, 'hero must not build the house');
      const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (mode === 'wheel') await page.mouse.wheel(0, end);
      else await page.evaluate(end => scrollTo(0, end), end);
      await page.waitForFunction(() => scrollY > innerHeight, null, { timeout: 30000 });
      // Reverse is allowed even while preparing; no accumulated forward jump.
      if (mode === 'wheel') await page.mouse.wheel(0, -end);
      else await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() => scrollY < 10, null, { timeout: 30000 });
      if (mode === 'wheel') await page.mouse.wheel(0, end);
      else await page.evaluate(end => scrollTo(0, end), end);
      await page.waitForFunction(() => window.__debugHouse().ready, null, { timeout: 120000 });
      if (mode === 'wheel') await page.mouse.wheel(0, end);
      else await page.evaluate(end => scrollTo(0, end), end);
      // The contact track intentionally snaps before the absolute document end.
      // Passing its halfway point proves the .02 readiness hold has released.
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-descent="contact"]');
        const halfway = el.getBoundingClientRect().top + scrollY - innerHeight + el.offsetHeight * .5;
        return scrollY >= halfway;
      }, null, { timeout: 30000 });
      assert.deepEqual(errors, [], 'no console errors/warnings');
      console.log(`PASS ${mode}: hero deferred, reverse allowed, GPU ready, hold released`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
