#!/usr/bin/env node
/**
 * Sharpness on large high-DPI displays (0.2.11, ROADMAP.md): GL drawn under
 * today's 4K pixel cap (`MAX_PIXELS`) against the same frame uncapped
 * (`?cap=0`), at 5K@2 and 6K@2, both themes, scrolls 0, .5 and 1, with and
 * without grain, all `?freeze=1&adapt=0`.
 *
 *   node scripts/sharp.mjs [--base URL] [--viewports 2560x1440@2,3008x1692@2]
 *        [--themes day,night] [--scrolls 0,0.5,1] [--grain both|on|off]
 *        [--crop 256] [--zoom 2] [--bench 200] [--settle 2500]
 *        [--min-ratio 0.9] [--gate] [--headed] [--quiet]
 *
 * Per case it screenshots both, finds the far and front crest lines in the
 * uncapped frame (the topmost and bottommost strong rows of vertical
 * contrast in a narrow column band, away from the sun), crops them and a
 * sky patch (the grain), and per crop reports, capped against uncapped:
 * mean gradient magnitude and Laplacian variance (as capped / uncapped:
 * 1 = as sharp, below 1 = softer), and the pixel diff mean and p99 (0–255).
 * The grain-on loads also run `?bench` (`--bench 0` skips it) for GPU ms per
 * frame, capped and uncapped, and record each drawing buffer's size.
 *
 * A case reads `soft` when any crop's gradient ratio is under `--min-ratio`.
 * Information by default (exit 0); `--gate` exits 1 on a soft case. Side by
 * side crops (capped | uncapped, `--zoom`× nearest) and results.json go to
 * scripts/out/sharp/. `--quiet` prints only soft or broken cases and the
 * summary line. Not part of `npm run qa`. See scripts/README.md.
 */
import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import { OUT_DIR, ensureDir, parseArgs, readRenderer, sceneUrl, seedTheme, sleep, viewportsFrom } from './lib/harness.mjs';
import { watchConsole } from './lib/console.mjs';
import { gpuArgs } from './lib/dropout.mjs';

const args = parseArgs();
const BASE = args.base ?? 'http://localhost:3001';
const VIEWPORTS = viewportsFrom(args.viewports, ['2560x1440@2', '3008x1692@2']);
const THEMES = String(args.themes ?? 'day,night').split(',');
const SCROLLS = String(args.scrolls ?? '0,0.5,1').split(',').map(Number);
const GRAINS = { both: [false, true], on: [true], off: [false] }[args.grain ?? 'both'];
const CROP = Number(args.crop ?? 256);
const ZOOM = Number(args.zoom ?? 2);
const BENCH = Number(args.bench ?? 200);
const SETTLE = Number(args.settle ?? 2500);
const MIN_RATIO = Number(args['min-ratio'] ?? 0.9);
const GATE = Boolean(args.gate);
const QUIET = Boolean(args.quiet);
const OUT = ensureDir(join(OUT_DIR, 'sharp'));
const say = (ok, line) => (!ok || !QUIET) && console.log(line);
if (!GRAINS) throw new Error('--grain must be both, on or off');

// As parity: no CSS motion, and one Math.random sequence for every load, so
// the grain texels match between the capped and uncapped frames.
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important}`;
function seedRandom() {
  let t = 0x9e3779b9;
  Math.random = () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** One GL load: screenshot, drawing buffer, sun centre, and the bench if asked. */
async function capture(browser, vp, theme, scroll, grain, capped) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
  });
  await seedTheme(context, theme);
  await context.addInitScript(seedRandom);
  const page = await context.newPage();
  const errors = watchConsole(page);
  const bench = grain && BENCH > 0;
  const query = {
    freeze: '1',
    adapt: '0',
    scroll: String(scroll),
    ...(grain ? {} : { grain: '0' }),
    ...(capped ? {} : { cap: '0' }),
    ...(bench ? { bench: String(BENCH) } : {}),
  };
  await page.goto(sceneUrl(BASE, 'gl', query), { waitUntil: 'load' });
  await page.waitForSelector('[data-renderer="gl"] canvas', { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: FREEZE_CSS });
  await sleep(SETTLE);
  let ms = null;
  if (bench) {
    await page.waitForFunction(() => document.querySelector('[data-bench]'), null, { timeout: 60000 }).catch(() => {});
    ms = await page.evaluate(() => {
      const host = document.querySelector('[data-bench]');
      if (!host) return null;
      const [p50, p90] = host.dataset.bench.split(' ').map(Number);
      const [b50] = host.dataset.benchBase.split(' ').map(Number);
      // GPU ms net of the sync's own overhead (`data-bench-base`).
      return { p50, p90, base: b50, net: Math.max(0, p50 - b50) };
    });
  }
  const painted = await readRenderer(page);
  const info = await page.evaluate(() => {
    const c = document.querySelector('[data-renderer="gl"] canvas');
    const host = document.querySelector('[data-sun-cx]');
    return {
      buffer: c ? { w: c.width, h: c.height } : null,
      native: { w: Math.round(innerWidth * devicePixelRatio), h: Math.round(innerHeight * devicePixelRatio) },
      sunX: host ? (host.getBoundingClientRect().left + Number(host.dataset.sunCx)) / innerWidth : null,
    };
  });
  const png = await page.screenshot({ type: 'png' });
  await context.close();
  return { png, painted, errors, ms, ...info };
}

/**
 * Crops and measures inside a blank page (canvas getImageData), as parity
 * diffs, so no image library is needed. `a` is capped, `b` uncapped (the
 * reference the crest rows are found in).
 */
async function analyse(page, aPng, bPng, { sunX, crop, zoom }) {
  return page.evaluate(
    async ({ a, b, sunX, S, Z }) => {
      const load = src =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) {
        return { error: `size mismatch ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
      }
      const W = ia.width;
      const H = ia.height;
      const read = img => {
        const c = new OffscreenCanvas(W, H);
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, W, H).data;
      };
      const pa = read(ia);
      const pb = read(ib);
      const lum = p => {
        const L = new Float32Array(W * H);
        for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;
        return L;
      };
      const La = lum(pa);
      const Lb = lum(pb);

      // Max-channel diff over a rect: mean and p99, as parity counts them.
      const diff = (x0, y0, w, h) => {
        const hist = new Uint32Array(256);
        let sum = 0;
        for (let y = y0; y < y0 + h; y++) {
          for (let x = x0; x < x0 + w; x++) {
            const i = (y * W + x) * 4;
            const dr = Math.abs(pa[i] - pb[i]);
            const dg = Math.abs(pa[i + 1] - pb[i + 1]);
            const db = Math.abs(pa[i + 2] - pb[i + 2]);
            sum += (dr + dg + db) / 3;
            hist[Math.max(dr, dg, db)]++;
          }
        }
        const n = w * h;
        let acc = 0;
        let p99 = 0;
        for (let v = 0; v < 256; v++) {
          acc += hist[v];
          if (acc >= n * 0.99) {
            p99 = v;
            break;
          }
        }
        return { mean: sum / n, p99 };
      };

      // Sharpness of one luminance crop: mean gradient magnitude (central
      // differences) and the variance of the 4-neighbour Laplacian.
      const sharp = (L, x0, y0, w, h) => {
        let g = 0;
        let s = 0;
        let s2 = 0;
        let n = 0;
        for (let y = y0 + 1; y < y0 + h - 1; y++) {
          for (let x = x0 + 1; x < x0 + w - 1; x++) {
            const i = y * W + x;
            const gx = (L[i + 1] - L[i - 1]) / 2;
            const gy = (L[i + W] - L[i - W]) / 2;
            g += Math.hypot(gx, gy);
            const lap = L[i + 1] + L[i - 1] + L[i + W] + L[i - W] - 4 * L[i];
            s += lap;
            s2 += lap * lap;
            n++;
          }
        }
        const m = s / n;
        return { grad: g / n, lapVar: s2 / n - m * m };
      };

      // Crest rows: in a narrow column band away from the sun, the row
      // profile of vertical contrast in the reference; the topmost and the
      // bottommost strong peaks are the far and the front crest lines. Rows
      // are averaged across the band before differencing, so the grain
      // (zero-mean noise) cancels instead of drowning the crests.
      const away = sunX == null || sunX > 0.5 ? 0.25 : 0.75;
      const bx = Math.round(W * away);
      const band = 24;
      const D = 3;
      const row = new Float32Array(H);
      for (let y = 0; y < H; y++) {
        let v = 0;
        for (let x = bx - band; x < bx + band; x++) v += Lb[y * W + x];
        row[y] = v / (2 * band);
      }
      const prof = new Float32Array(H);
      for (let y = D; y < H - D; y++) prof[y] = Math.abs(row[y + D] - row[y - D]);
      const R = 4;
      const sm = new Float32Array(H);
      for (let y = R; y < H - R; y++) {
        let v = 0;
        for (let k = -R; k <= R; k++) v += prof[y + k];
        sm[y] = v / (2 * R + 1);
      }
      const lo = Math.round(H * 0.08);
      const hi = Math.round(H * 0.97);
      let peak = 0;
      for (let y = lo; y < hi; y++) peak = Math.max(peak, sm[y]);
      const peaks = [];
      for (let y = lo + 1; y < hi - 1; y++) {
        if (sm[y] >= peak * 0.25 && sm[y] >= sm[y - 1] && sm[y] > sm[y + 1]) {
          if (!peaks.length || y - peaks[peaks.length - 1] > S / 4) peaks.push(y);
        }
      }
      const clampX = x => Math.max(0, Math.min(W - S, Math.round(x - S / 2)));
      const clampY = y => Math.max(0, Math.min(H - S, Math.round(y - S / 2)));
      const rects = {};
      if (peaks.length) {
        rects.far = { x: clampX(bx), y: clampY(peaks[0]) };
        rects.front = { x: clampX(bx), y: clampY(peaks[peaks.length - 1]) };
      }
      // Grain: plain sky near the top, on the side away from the sun.
      rects.grain = { x: clampX(W * (sunX == null || sunX > 0.5 ? 0.12 : 0.88)), y: clampY(H * 0.12) };

      const toUrl = c =>
        c.convertToBlob({ type: 'image/png' }).then(
          blob =>
            new Promise(res => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.readAsDataURL(blob);
            }),
        );
      const crops = {};
      for (const [name, r] of Object.entries(rects)) {
        const gap = 8;
        const c = new OffscreenCanvas(2 * S * Z + gap, S * Z);
        const x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        x.fillStyle = '#f0f';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(ia, r.x, r.y, S, S, 0, 0, S * Z, S * Z);
        x.drawImage(ib, r.x, r.y, S, S, S * Z + gap, 0, S * Z, S * Z);
        const ca = sharp(La, r.x, r.y, S, S);
        const cb = sharp(Lb, r.x, r.y, S, S);
        crops[name] = {
          rect: { ...r, w: S, h: S },
          capped: ca,
          uncapped: cb,
          gradRatio: cb.grad ? ca.grad / cb.grad : 1,
          lapRatio: cb.lapVar ? ca.lapVar / cb.lapVar : 1,
          diff: diff(r.x, r.y, S, S),
          png: await toUrl(c),
        };
      }
      return { frame: diff(0, 0, W, H), band: bx, peaks, crops };
    },
    {
      a: `data:image/png;base64,${aPng.toString('base64')}`,
      b: `data:image/png;base64,${bPng.toString('base64')}`,
      sunX,
      S: crop,
      Z: zoom,
    },
  );
}

const f2 = x => x.toFixed(2);
const f1 = x => x.toFixed(1);

async function main() {
  const browser = await chromium.launch({ headless: !args.headed, args: gpuArgs() });
  const tool = await (await browser.newContext()).newPage();
  const gpu = await tool.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'no WebGL2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  say(true, `GPU: ${gpu}`);

  const cases = [];
  let soft = 0;
  let broken = 0;
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const scroll of SCROLLS) {
        for (const grain of GRAINS) {
          const id = `${vp.name}-${theme}-s${scroll}-${grain ? 'grain' : 'nograin'}`;
          const a = await capture(browser, vp, theme, scroll, grain, true);
          const b = await capture(browser, vp, theme, scroll, grain, false);
          const errors = [...a.errors, ...b.errors];
          const problems = [];
          if (a.painted !== 'gl' || b.painted !== 'gl') problems.push(`painted ${a.painted}/${b.painted}, not gl`);
          if (errors.length) problems.push(`console: ${errors.join(' | ')}`);
          const r = await analyse(tool, a.png, b.png, { sunX: b.sunX ?? a.sunX, crop: CROP, zoom: ZOOM });
          if (r.error) problems.push(r.error);
          const crops = r.crops ?? {};
          for (const [name, c] of Object.entries(crops)) {
            writeFileSync(join(OUT, `${id}-${name}.png`), Buffer.from(c.png.split(',')[1], 'base64'));
            delete c.png;
          }
          if (!crops.far) problems.push('no crest found');
          const worst = Math.min(...Object.values(crops).map(c => c.gradRatio));
          const isSoft = worst < MIN_RATIO;
          if (problems.length) broken++;
          else if (isSoft) soft++;
          const row = {
            id,
            viewport: vp.name,
            theme,
            scroll,
            grain,
            buffer: { capped: a.buffer, uncapped: b.buffer, native: a.native },
            bench: { capped: a.ms, uncapped: b.ms },
            frame: r.frame,
            peaks: r.peaks,
            crops,
            problems,
          };
          cases.push(row);
          const axis = a.buffer && a.native ? `${((100 * a.buffer.w) / a.native.w).toFixed(0)}%` : '?';
          const ms = a.ms && b.ms ? `  gpu ${f2(a.ms.net)}→${f2(b.ms.net)} ms` : '';
          const per = Object.entries(crops)
            .map(([n, c]) => `${n} ${f2(c.gradRatio)}/${f2(c.lapRatio)} Δ${f1(c.diff.mean)}/${c.diff.p99}`)
            .join('  ');
          const tag = problems.length ? 'FAIL' : isSoft ? 'soft' : 'ok  ';
          say(
            !problems.length && !isSoft,
            `${tag} ${id.padEnd(30)} cap ${axis}  ${per}  frame Δ${r.frame ? `${f1(r.frame.mean)}/${r.frame.p99}` : '—'}${ms}` +
              (problems.length ? `  → ${problems.join('; ')}` : ''),
          );
        }
      }
    }
  }
  await browser.close();

  const file = join(OUT, 'results.json');
  writeFileSync(file, JSON.stringify({ base: BASE, gpu, crop: CROP, minRatio: MIN_RATIO, cases }, null, 2));
  const ratios = cases.flatMap(c => Object.values(c.crops).map(k => k.gradRatio));
  const benches = cases.filter(c => c.bench.capped && c.bench.uncapped);
  const cost = benches.length
    ? ` · gpu ×${f2(Math.max(...benches.map(c => c.bench.uncapped.net / Math.max(1e-3, c.bench.capped.net))))} uncapped (worst net p50)`
    : '';
  console.log(
    `sharp: ${cases.length - soft - broken}/${cases.length} as sharp as uncapped (gradient ≥ ${MIN_RATIO}), ` +
      `min ratio ${ratios.length ? f2(Math.min(...ratios)) : '—'}${cost}` +
      (broken ? ` · ${broken} broken` : '') +
      ` · ${relative(process.cwd(), OUT)}`,
  );
  if (broken || (GATE && soft)) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
