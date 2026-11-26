#!/usr/bin/env node
/**
 * (0.5.40) The intro's backdrop stills: the 3D sky the opening's intro
 * looks up into, one per theme, rendered from a running production server
 * and written to public/intro/sky-{day,night}.jpg. AtmosphereField's CSS
 * shows them before WebGL starts, so the gap before the first frame matches
 * it. Rerun whenever the sky, the clouds, the stars or INTRO_LIFT change.
 *
 *   npm run build && npm run start   # then:
 *   npm run intro-backdrop -- --base http://localhost:3000
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { gpuArgs } from './lib/dropout.mjs';
import { seedTheme } from './lib/harness.mjs';

const at = process.argv.indexOf('--base');
const BASE = at > 0 ? process.argv[at + 1] : process.env.BASE || 'http://localhost:3000';
const OUT = join(process.cwd(), 'public', 'intro');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: gpuArgs({}) });
try {
  for (const theme of ['day', 'night']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await seedTheme(context, theme);
    const page = await context.newPage();
    // Held in the sky for good, the full adaptive level.
    await page.goto(`${BASE}/?introhold=1&adapt=0`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => getComputedStyle(document.documentElement).getPropertyValue('--intro-p').trim() === '1.000',
      null,
      { timeout: 60000 },
    );
    // The canvas's fade-in, and no loading line or controls in the still.
    await page.waitForTimeout(800);
    await page.addStyleTag({ content: '[class*="loading"], button { visibility: hidden !important; }' });
    const path = join(OUT, `sky-${theme}.jpg`);
    await page.screenshot({ path, type: 'jpeg', quality: 72 });
    console.log(`intro-backdrop: ${theme} → ${path}`);
    await context.close();
  }
} finally {
  await browser.close();
}
