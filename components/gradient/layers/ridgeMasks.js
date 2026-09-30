import { layout, mistOf, ridgeBlur, rimWidth, sampleCrest } from '../gl/mistGeometry';
import { RIDGE_LIGHT } from '../sunLook';
import { targetGeo } from '../orbit';
import { descentAt, descentOf, frameAt } from '../camera';

/**
 * A scene's ridge silhouettes as alpha masks, for the layered fallback.
 *
 * The one thing the fallback can't do with plain CSS is a ridge's outline: a
 * crest through the ridge noise, with the far ranges blurred. So those are
 * computed here, per pixel, with exactly the GL shader's maths (mistShader.js:
 * the slope-corrected distance to the crest through a Gaussian edge, and the
 * rim stroke along it), at the frame's own size, and handed to CSS as mask
 * images. Everything else about a ridge (its colours, fade and the haze in
 * front of it) is live CSS on top, so the ridges are relit every frame of a
 * switch without touching these.
 *
 * Only the rows the edge passes through are stored: above them the fill is
 * empty and below it's solid, which the layer adds with a plain CSS mask.
 *
 * The descent camera (../camera.js) draws a ridge smaller about the frame's
 * centre line and moves its foot: the layer takes that as a CSS transform,
 * so each mask is baked once at scale 1, over the widest span of its noise
 * the camera can show (its smallest scale over the stretch), with the extra
 * columns whole device pixels past each edge so the resting frame lands on
 * exactly the pixels it did. Its rim scales with the transform, as it does
 * in the shader. The descent's world ranges (camera.js DESCENT.ranges) get
 * masks too, all of them, so a scroll frame never builds one.
 *
 * The edge blur is baked in, where the shader's follows the ridge's slot
 * (its `t`) as it slides back. The recipe's ridges keep their resting blur
 * (so the top of the page is exact; under the camera it's the resting blur
 * scaled with the ridge, within a px or two of the shader's). A world range
 * only shows past the top, so its blur is the one it has on screen at the
 * end of the stretch (where it's most in view), divided by its scale there.
 *
 * The body's light on a ridge (../camera.js ridgeLightAt) falls off below the
 * crest over RIDGE_LIGHT.depth of the height, times the ridge's scale, so in
 * the ridge's own terms it doesn't depend on the camera: its `glow` mask is
 * the fill's edge times that falloff, baked once too. How strong the light
 * is, and where across the frame, is live CSS on the layer.
 */

// Past ±6σ the edge is fully on or off in 8 bits (the shader clamps there).
const REACH = 6;
// The light's falloff below the crest, in its depths: past this it's under
// half a level at its strongest (RIDGE_LIGHT: a × (1 + far) ≈ .39).
const GLOW_REACH = 5.5;

// The shader's standard normal CDF (mistShader.js `Phi`).
function phi(x) {
  const c = x < -REACH ? -REACH : x > REACH ? REACH : x;
  return 0.5 * (1 + Math.tanh(0.7978845608 * (c + 0.044715 * c * c * c)));
}

/** A mask's edge sigma (its own px): the shader's blurred, antialiased edge,
 * sqrt(blur² + aa²) on screen. The recipe's ridges at rest; a world range as
 * it ends the stretch (`rc`), taken back through its scale there. */
function edgeSigma(ridge, rc, h, aa) {
  const own = !ridge.extra || !rc;
  const blur = ridgeBlur(own ? ridge.t : rc.t, h);
  const sigma = Math.sqrt((blur > 0.4 ? blur * blur : 0) + aa * aa);
  return own ? sigma : sigma / rc.s;
}

const yieldToMain = () => new Promise(r => setTimeout(r, 0));

async function toUrl(alpha, cols, rows) {
  const data = new ImageData(cols, rows);
  for (let i = 0, j = 3; i < alpha.length; i++, j += 4) data.data[j] = alpha[i];
  let blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(cols, rows);
    c.getContext('2d').putImageData(data, 0, 0);
    blob = await c.convertToBlob({ type: 'image/png' });
  } else {
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    c.getContext('2d').putImageData(data, 0, 0);
    blob = await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('mask encode'))), 'image/png'));
  }
  const url = URL.createObjectURL(blob);
  // Load and decode it before any CSS points at it. Safari paints a masked
  // layer whose mask image is still loading as if it had no mask, and doesn't
  // repaint when the image arrives, so the ridges showed as solid bands.
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => {});
  return { url, img };
}

/** The `about` samples the descent's reach is measured at. */
const SAMPLES = Array.from({ length: 41 }, (_, i) => i / 40);

/**
 * Masks for `recipe` resting in a w × h (CSS px) frame at `dpr`, for every
 * ridge the descent can show under any of `recipes` (the scenes whose camera
 * may run). Resolves to { ridges: [{ noise, top, base, bottom, fill, rim,
 * glow }], revoke }, in paint order with the world ranges in depth order
 * among the recipe's; `fill`, `rim` and `glow` are { url, left, width, top,
 * height } bands in
 * CSS px, and `bottom` is how far down the fill must reach (in the ridge's
 * own, unscaled terms) to cover the frame wherever the camera puts it.
 * Yields to the main thread between ridges.
 */
export async function ridgeMasks(recipe, w, h, dpr, isCancelled = () => false, recipes = [recipe]) {
  const [size, horizon, haze, height, sharp, sun, seed] = targetGeo(recipe);
  const mist = { ...mistOf(recipe.mist), haze, height, sharp, sun, seed };
  const opts = { size, horizon, mist, aspect: recipe.aspect, ranges: descentOf(recipe).ranges };
  // Each ridge's smallest drawn scale and lowest reach over the stretch,
  // under every scene's camera (reduced motion's shorter reach included:
  // its `k` is one the full camera passes through).
  const pre = layout(w, h, { ...opts, crests: false });
  const least = pre.ridges.map(() => 1);
  const bottoms = pre.ridges.map(() => h);
  for (const r of recipes) {
    for (const about of SAMPLES) {
      const view = frameAt(pre, h, descentAt(about, r));
      if (view.rest) continue;
      view.ridges.forEach((rc, i) => {
        least[i] = Math.min(least[i], rc.s);
        bottoms[i] = Math.max(bottoms[i], pre.ridges[i].base + (h - rc.foot) / rc.s);
      });
    }
  }
  // Where each ridge ends the stretch, for a world range's blur.
  const end = frameAt(pre, h, descentAt(1, recipe));
  const { ridges } = layout(w, h, { ...opts, scales: least });

  // The GL canvas's backing size, so the masks land on the same device pixels.
  const cols0 = Math.max(1, Math.round(w * dpr));
  const sx = w / cols0;
  const sy = h / Math.max(1, Math.round(h * dpr));
  const aa = 0.5 / (cols0 / w);
  const hw = rimWidth(h) / 2;
  const depth = RIDGE_LIGHT.depth * h;
  const urls = [];
  const keep = []; // the decoded images, held so they stay in memory
  const out = [];

  for (const [b, ridge] of ridges.entries()) {
    if (isCancelled()) break;
    const sigma = edgeSigma(ridge, end.ridges[b], h, aa);
    // Whole device columns past each edge, enough for the frame at the
    // ridge's smallest scale; column j sits at x = (j − ext + ½)·sx.
    const s = least[b];
    const ext = s < 1 ? Math.ceil(((w / 2) * (1 / s - 1)) / sx) : 0;
    const cols = cols0 + 2 * ext;
    const crest = new Float64Array(cols);
    const reach = new Float64Array(cols); // how far the edge spreads, CSS px
    sampleCrest({ ...ridge, x0: ridge.x0 + ext * sx }, cols, cols0 / w, crest);

    // Slope-corrected distance, as the shader: d = (y - crest) · k.
    const k = new Float64Array(cols);
    let lo = Infinity;
    let hi = -Infinity;
    for (let x = 0; x < cols; x++) {
      const l = Math.max(x - 1, 0);
      const r = Math.min(x + 1, cols - 1);
      const span = (r - l) * sx;
      const slope = span > 0 ? (crest[r] - crest[l]) / span : 0;
      k[x] = 1 / Math.sqrt(1 + slope * slope);
      reach[x] = (REACH * sigma + hw) / k[x];
      lo = Math.min(lo, crest[x] - reach[x]);
      hi = Math.max(hi, crest[x] + reach[x]);
    }
    // (Rows past the frame too: a world range can sit below it, or above.)
    const r0 = Math.floor(lo / sy - 0.5);
    const r1 = Math.ceil(hi / sy + 0.5);
    const rows = Math.max(1, r1 - r0);
    // The glow runs on from the same top to where the light has died out.
    let low = -Infinity;
    for (let x = 0; x < cols; x++) low = Math.max(low, crest[x]);
    const g1 = Math.max(r0 + 1, Math.ceil((low + GLOW_REACH * depth) / sy + 0.5));
    const glowRows = g1 - r0;
    const glow = new Uint8ClampedArray(cols * glowRows);

    const fill = new Uint8ClampedArray(cols * rows);
    const rim = new Uint8ClampedArray(cols * rows);
    for (let x = 0; x < cols; x++) {
      const c = crest[x];
      const kx = k[x];
      const from = Math.max(r0, Math.floor((c - reach[x]) / sy - 0.5));
      const to = Math.min(r1, Math.ceil((c + reach[x]) / sy + 0.5));
      // Below the edge the fill is solid.
      for (let y = Math.max(to, r0); y < r1; y++) fill[(y - r0) * cols + x] = 255;
      for (let y = from; y < to; y++) {
        const d = ((y + 0.5) * sy - c) * kx;
        const i = (y - r0) * cols + x;
        fill[i] = Math.round(phi(d / sigma) * 255);
        rim[i] = Math.round((phi((d + hw) / sigma) - phi((d - hw) / sigma)) * 255);
      }
      // The glow: the edge times the light's falloff straight down from the
      // crest (the shader's, unslanted).
      for (let y = from; y < g1; y++) {
        const py = (y + 0.5) * sy;
        const edge = y < to ? phi(((py - c) * kx) / sigma) : 1;
        glow[(y - r0) * cols + x] = Math.round(edge * Math.exp(-Math.max(0, py - c) / depth) * 255);
      }
    }

    const top = r0 * sy;
    const bandH = rows * sy;
    const [fillImg, rimImg, glowImg] = await Promise.all([
      toUrl(fill, cols, rows),
      toUrl(rim, cols, rows),
      toUrl(glow, cols, glowRows),
    ]);
    const fillUrl = fillImg.url;
    const rimUrl = rimImg.url;
    urls.push(fillUrl, rimUrl, glowImg.url);
    keep.push(fillImg.img, rimImg.img, glowImg.img);
    const left = -ext * sx;
    const width = cols * sx;
    out.push({
      noise: ridge.noise,
      top: ridge.top,
      base: ridge.base,
      // (A little past the deepest sample, for the frames between them.)
      bottom: bottoms[b] + 0.02 * h + 2,
      fill: { url: fillUrl, left, width, top, height: bandH },
      rim: { url: rimUrl, left, width, top, height: bandH },
      glow: { url: glowImg.url, left, width, top, height: glowRows * sy },
    });
    await yieldToMain();
  }

  return { ridges: out, images: keep, revoke: () => urls.forEach(u => URL.revokeObjectURL(u)) };
}
