/**
 * Tile dropout: under a capped GPU memory budget, does scrolling the
 * descent drop raster tiles (blocks of the scene showing the clear colour,
 * or drawn at the wrong height, for a frame or longer)?
 *
 * Headless Chrome at its default budget rarely drops a tile, so the browser
 * is launched with `--force-gpu-mem-available-mb` (`gpuArgs`). Then, on a
 * loaded page:
 *
 *   const cdp = await context.newCDPSession(page);
 *   const layers = await measureLayers(cdp, dpr);         // at rest
 *   const rec = await recordScroll(page, cdp);             // screencast
 *   const found = await findDropout(decodePage, rec.frames);
 *   await saveBadFrames(decodePage, rec.frames, found.bad, dir);
 *
 * `decodePage` is any page (a blank one in its own context is best): the
 * JPEG frames are decoded there, on canvas.
 *
 * **Layers.** CDP `LayerTree`: the layers that draw content
 * (`drawsContent`, not `invisible`), and their texture estimate,
 * Σ width × height × dpr² × 4 bytes: the whole layer as if fully rastered.
 * Chrome rasters only the tiles near the viewport, so it's an upper bound,
 * but it moves the way the budget does.
 *
 * **Recording.** `Page.startScreencast` (jpeg, device size, every frame)
 * while the wheel runs down the whole track and back up (`sweeps` times),
 * then back and forth around the middle. Each frame keeps the page's
 * `scrollOffsetY` from the screencast metadata.
 *
 * **Detector.** Each frame is reduced to a grid of `cell` device-px cells
 * (mean RGB). Two tests mark outlier cells:
 *
 * - *Transient*: a cell more than `thresh` (0–255, worst channel) outside
 *   the range its neighbours span, and by more than they differ from each
 *   other, for every neighbour pair (i−1, i+1), (i−2, i+1), (i−1, i+2);
 *   the wider pairs let a dropout that lasts two frames still stand out,
 *   and the spread test keeps a clean frame between two broken ones clean. Real motion (the camera's scale and slide, the
 *   stagger's colour lag, the sun) is monotonic over a few frames, so a
 *   frame sits between its neighbours; a dropped tile doesn't.
 * - *Held*: a cell more than `held` from the median of the other scroll
 *   runs' frames at the same scroll (each run's two frames bracketing it,
 *   interpolated; runs are the monotonic stretches of `scrollOffsetY`,
 *   brackets wider than `refGap` CSS px skipped, at least 3 runs needed).
 *   This catches a dropout that lasts longer than the neighbour pairs see.
 *
 * Outlier cells are grouped (4-connected). A group is a **block** when it
 * covers at least `minArea` cells, at least 2 × 2 of its bounding box, and
 * fills at least `fill` of it: tiles and slabs are rectangles, while edge
 * noise is thin and scattered. A frame with a block is **bad**.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, sleep } from './harness.mjs';

/** The perf harness's GPU flags (real GPU raster), as parity and perf use. */
export const GPU_FLAGS = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-gpu'];

export const DROPOUT = {
  cell: 32, // device px per grid cell
  thresh: 24, // transient: 0–255 outside the neighbours' range
  held: 40, // held: 0–255 from the other runs' median
  refGap: 40, // held: widest bracket (CSS px of scroll) to interpolate across
  minArea: 12, // cells in a block
  fill: 0.6, // share of its bounding box a block fills
  sweeps: 2, // full down-and-up sweeps before the mid-track sweep
  scale: 1, // screencast size, share of the device size
};

/**
 * The cases and their GPU memory caps (MB, `--force-gpu-mem-available-mb`,
 * browser-wide, so one launch per cap). Each cap is the tightest the
 * 0.2.5-style layering (only `.cam`, `.sky`, `.drift` composited) survives
 * on Metal: at 1792×1120@2 it drops tiles at 256 and not at 384; at
 * 3440×1440@1 at 512 and not at 768. 0.2.8 fails both.
 */
export const DROPOUT_CASES = [
  { viewport: '1792x1120@2', mem: 384 },
  { viewport: '3440x1440@1', mem: 768 },
  { viewport: '1440x900@2', mem: 384 },
];

/**
 * Launch args: the GPU flags plus the memory cap. `mem` 0 keeps Chrome's
 * own budget; `software` drops the GPU flags (headless then composites on
 * SwiftShader, whose tile budget behaves differently).
 */
export function gpuArgs({ mem = 0, software = false } = {}) {
  return [...(software ? [] : GPU_FLAGS), ...(mem > 0 ? [`--force-gpu-mem-available-mb=${mem}`] : [])];
}

/**
 * Layers that draw content, their texture estimate, and (with `reasons`)
 * a tally of CDP compositing reason ids.
 * @returns {{ count, total, mb, reasons }}
 */
export async function measureLayers(cdp, dpr, { reasons: wantReasons = false } = {}) {
  let tree = null;
  const onTree = e => e.layers && (tree = e.layers);
  cdp.on('LayerTree.layerTreeDidChange', onTree);
  await cdp.send('LayerTree.enable');
  for (let i = 0; i < 40 && !tree; i++) await sleep(50);
  await sleep(300); // the latest tree, not the first
  cdp.off('LayerTree.layerTreeDidChange', onTree);
  const drawn = (tree ?? []).filter(l => l.drawsContent && !l.invisible);
  const bytes = drawn.reduce((s, l) => s + l.width * l.height * dpr * dpr * 4, 0);
  const reasons = {};
  if (wantReasons) {
    for (const l of drawn) {
      try {
        const r = await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId });
        for (const id of r.compositingReasonIds ?? []) reasons[id] = (reasons[id] ?? 0) + 1;
      } catch {}
    }
  }
  await cdp.send('LayerTree.disable');
  return { count: drawn.length, total: tree?.length ?? 0, mb: bytes / 2 ** 20, reasons };
}

/**
 * Wheel toward scrollY = `target` in 60 px notches, one per 16 ms, until
 * the page gets there (Lenis scales and smooths the wheel, so the notch
 * count isn't known up front; a mid-track target overshoots a little).
 */
export async function wheelTo(page, target) {
  const y0 = await page.evaluate(() => scrollY);
  const dir = Math.sign(target - y0);
  if (!dir) return;
  for (let i = 0; i < 400; i++) {
    const y = await page.evaluate(() => scrollY);
    if (dir > 0 ? y >= target - 2 : y <= target + 2) break;
    await page.mouse.wheel(0, dir * 60);
    await sleep(16);
  }
}

/**
 * Screencast the page while the wheel sweeps the whole scroll track.
 * @returns {{ frames: { data, t, y }[], phases: { name, from }[], track, reached }}
 *   `data` base64 JPEG, `t` s, `y` the page's scrollOffsetY (CSS px);
 *   `reached` the deepest scroll over the track (1 = the bottom).
 */
export async function recordScroll(page, cdp, { sweeps = DROPOUT.sweeps, scale = DROPOUT.scale } = {}) {
  const vp = page.viewportSize();
  const dpr = await page.evaluate(() => devicePixelRatio);
  const track = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.mouse.move(vp.width / 2, vp.height / 2);
  const frames = [];
  const onFrame = f => {
    frames.push({ data: f.data, t: f.metadata.timestamp, y: f.metadata.scrollOffsetY });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  };
  cdp.on('Page.screencastFrame', onFrame);
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    maxWidth: Math.round(vp.width * dpr * scale),
    maxHeight: Math.round(vp.height * dpr * scale),
    everyNthFrame: 1,
  });
  await sleep(300);
  let deepest = 0;
  const phases = [];
  const mark = name => phases.push({ name, from: frames.length });
  for (let k = 0; k < sweeps; k++) {
    mark(`down${k + 1}`);
    await wheelTo(page, track);
    await sleep(900); // let the smoothing land
    deepest = Math.max(deepest, await page.evaluate(() => scrollY));
    mark(`up${k + 1}`);
    await wheelTo(page, 0);
    await sleep(900);
  }
  mark('mid');
  for (const f of [0.5, 0.75, 0.25, 0.75, 0.5]) {
    await wheelTo(page, f * track);
    await sleep(300);
  }
  await sleep(600);
  await cdp.send('Page.stopScreencast');
  await sleep(200);
  cdp.off('Page.screencastFrame', onFrame);
  return { frames, phases, track, reached: track ? deepest / track : 1 };
}

/** JPEG frames → per-cell mean RGB grids, decoded on `page` in chunks. */
async function grids(page, frames, cell) {
  const out = [];
  for (let k = 0; k < frames.length; k += 16) {
    const chunk = frames.slice(k, k + 16).map(f => `data:image/jpeg;base64,${f.data}`);
    out.push(
      ...(await page.evaluate(
        async ({ list, C }) => {
          const res = [];
          for (const src of list) {
            const img = new Image();
            img.src = src;
            await img.decode();
            const W = img.naturalWidth;
            const H = img.naturalHeight;
            const cv = new OffscreenCanvas(W, H);
            const x = cv.getContext('2d', { willReadFrequently: true });
            x.drawImage(img, 0, 0);
            const d = x.getImageData(0, 0, W, H).data;
            const cols = Math.floor(W / C);
            const rows = Math.floor(H / C);
            const g = new Float32Array(cols * rows * 3);
            // Every 4th pixel each way: plenty for a cell's mean.
            for (let y = 0; y < rows * C; y += 4) {
              const r0 = ((y / C) | 0) * cols;
              for (let xx = 0; xx < cols * C; xx += 4) {
                const i = (y * W + xx) * 4;
                const c = (r0 + ((xx / C) | 0)) * 3;
                g[c] += d[i];
                g[c + 1] += d[i + 1];
                g[c + 2] += d[i + 2];
              }
            }
            const n = (C / 4) * (C / 4);
            for (let i = 0; i < g.length; i++) g[i] /= n;
            res.push({ cols, rows, g: Array.from(g, v => Math.round(v * 10) / 10) });
          }
          return res;
        },
        { list: chunk, C: cell },
      )),
    );
  }
  return out;
}

const PAIRS = [
  [-1, 1],
  [-2, 1],
  [-1, 2],
];
const same = (a, b) => a && b && a.cols === b.cols && a.rows === b.rows;

/** Transient: cells outside the range each neighbour pair spans. */
function transientHits(gs, i, thresh) {
  const { cols, rows, g } = gs[i];
  const pairs = PAIRS.map(([a, b]) => [gs[i + a], gs[i + b]]).filter(([p, n]) => same(p, gs[i]) && same(n, gs[i]));
  if (!pairs.length) return null;
  const hit = new Uint8Array(cols * rows);
  for (let c = 0; c < cols * rows; c++) {
    let s = Infinity;
    for (const [p, n] of pairs) {
      let o = 0;
      let spread = 0;
      for (let ch = 0; ch < 3; ch++) {
        const v = g[c * 3 + ch];
        const a = p.g[c * 3 + ch];
        const b = n.g[c * 3 + ch];
        o = Math.max(o, Math.min(a, b) - v, v - Math.max(a, b));
        spread = Math.max(spread, Math.abs(a - b));
      }
      // Neighbours that disagree more than this frame strays (two broken
      // frames around a clean one) don't make it an outlier.
      s = Math.min(s, o > spread ? o : 0);
    }
    if (s > thresh) hit[c] = 1;
  }
  return hit;
}

/** Monotonic runs of the page's scroll: [first, last] frame indices. */
function runsOf(ys) {
  const runs = [];
  let start = 0;
  let dir = 0;
  for (let i = 1; i < ys.length; i++) {
    const d = Math.sign(ys[i] - ys[i - 1]);
    if (!d) continue;
    if (dir && d !== dir) {
      runs.push([start, i - 1]);
      start = i - 1;
    }
    dir = d;
  }
  runs.push([start, ys.length - 1]);
  return runs;
}

/** Held: cells far from the median of the other runs at the same scroll. */
function heldHits(gs, ys, runs, i, held, refGap) {
  const { cols, rows, g } = gs[i];
  const y = ys[i];
  const refs = [];
  for (const [r0, r1] of runs) {
    if (i >= r0 && i <= r1) continue;
    let lo = -1;
    let hi = -1;
    for (let j = r0; j <= r1; j++) {
      if (!same(gs[j], gs[i])) continue;
      if (ys[j] <= y && (lo < 0 || ys[j] > ys[lo])) lo = j;
      if (ys[j] >= y && (hi < 0 || ys[j] < ys[hi])) hi = j;
    }
    if (lo < 0 || hi < 0 || ys[hi] - ys[lo] > refGap) continue;
    const t = ys[hi] === ys[lo] ? 0 : (y - ys[lo]) / (ys[hi] - ys[lo]);
    refs.push([gs[lo].g, gs[hi].g, t]);
  }
  if (refs.length < 3) return null;
  const hit = new Uint8Array(cols * rows);
  const v = new Float32Array(refs.length);
  const m = refs.length;
  for (let c = 0; c < cols * rows; c++) {
    let o = 0;
    for (let ch = 0; ch < 3; ch++) {
      const k = c * 3 + ch;
      refs.forEach(([a, b, t], r) => (v[r] = a[k] + (b[k] - a[k]) * t));
      v.sort();
      const med = m % 2 ? v[m >> 1] : (v[m / 2 - 1] + v[m / 2]) / 2;
      o = Math.max(o, Math.abs(g[k] - med));
    }
    if (o > held) hit[c] = 1;
  }
  return hit;
}

/** 4-connected groups of hit cells; the rectangular ones are blocks. */
function blocksOf(hit, cols, rows, minArea, fill) {
  const seen = new Uint8Array(cols * rows);
  const blocks = [];
  let largest = 0;
  for (let c0 = 0; c0 < cols * rows; c0++) {
    if (!hit[c0] || seen[c0]) continue;
    const stack = [c0];
    seen[c0] = 1;
    let area = 0;
    let x0 = cols;
    let y0 = rows;
    let x1 = -1;
    let y1 = -1;
    while (stack.length) {
      const c = stack.pop();
      const x = c % cols;
      const y = (c / cols) | 0;
      area++;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nc = ny * cols + nx;
        if (hit[nc] && !seen[nc]) {
          seen[nc] = 1;
          stack.push(nc);
        }
      }
    }
    largest = Math.max(largest, area);
    const f = area / ((x1 - x0 + 1) * (y1 - y0 + 1));
    if (area >= minArea && f >= fill && x1 > x0 && y1 > y0) blocks.push({ x0, y0, x1, y1, area, fill: f });
  }
  return { blocks, largest };
}

/**
 * The detector over a recording.
 * @param decodePage a page to decode the JPEGs on
 * @param frames from `recordScroll`
 * @param phases from `recordScroll` (optional: labels each bad frame)
 * @returns {{ bad: { i, kind, phase, blocks: { x0, y0, x1, y1, area, fill }[] }[],
 *             worst: { transient, held }, runs }}
 *   Block coordinates are in cells (× `cell` device px); `worst` is the
 *   largest outlier group of each kind, block or not (the margin).
 */
export async function findDropout(decodePage, frames, opts = {}) {
  const o = { ...DROPOUT, ...opts };
  const gs = await grids(decodePage, frames, o.cell);
  const ys = frames.map(f => f.y);
  const runs = runsOf(ys);
  const phaseOf = i => (o.phases ?? []).findLast(p => p.from <= i)?.name ?? 'rest';
  const bad = [];
  const worst = { transient: 0, held: 0 };
  for (let i = 0; i < gs.length; i++) {
    const { cols, rows } = gs[i];
    const kinds = [];
    const blocks = [];
    for (const [kind, hit] of [
      ['transient', transientHits(gs, i, o.thresh)],
      ['held', heldHits(gs, ys, runs, i, o.held, o.refGap)],
    ]) {
      if (!hit) continue;
      const r = blocksOf(hit, cols, rows, o.minArea, o.fill);
      worst[kind] = Math.max(worst[kind], r.largest);
      if (r.blocks.length) {
        kinds.push(kind);
        blocks.push(...r.blocks);
      }
    }
    if (kinds.length) bad.push({ i, kind: kinds.join('+'), phase: phaseOf(i), blocks });
  }
  return { bad, worst, runs: runs.length };
}

/** Save each bad frame as `NNN.png` and `NNN-marked.png` (blocks in red). */
export async function saveBadFrames(decodePage, frames, bad, dir, { cell = DROPOUT.cell } = {}) {
  if (!bad.length) return;
  ensureDir(dir);
  for (const b of bad) {
    const [raw, marked] = await decodePage.evaluate(
      async ({ src, blocks, C }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const x = cv.getContext('2d');
        x.drawImage(img, 0, 0);
        const a = cv.toDataURL('image/png');
        x.strokeStyle = '#ff0000';
        x.lineWidth = 4;
        for (const k of blocks) x.strokeRect(k.x0 * C, k.y0 * C, (k.x1 - k.x0 + 1) * C, (k.y1 - k.y0 + 1) * C);
        return [a, cv.toDataURL('image/png')];
      },
      { src: `data:image/jpeg;base64,${frames[b.i].data}`, blocks: b.blocks, C: cell },
    );
    const name = String(b.i).padStart(3, '0');
    writeFileSync(join(dir, `${name}.png`), Buffer.from(raw.split(',')[1], 'base64'));
    writeFileSync(join(dir, `${name}-marked.png`), Buffer.from(marked.split(',')[1], 'base64'));
  }
}

/** One line per bad frame: index, phase, kind and its blocks in device px. */
export function describeBad(bad, cell = DROPOUT.cell) {
  return bad.map(
    b =>
      `${b.i} ${b.phase} ${b.kind} [${b.blocks
        .map(k => `${k.area}c ${(k.x1 - k.x0 + 1) * cell}×${(k.y1 - k.y0 + 1) * cell}px`)
        .join(', ')}]`,
  );
}
