import { layout, mistOf, ridgeBlur, rimWidth, sampleCrest } from '../gl/mistGeometry';
import { targetGeo } from '../orbit';

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
 */

// Past ±6σ the edge is fully on or off in 8 bits (the shader clamps there).
const REACH = 6;

// The shader's standard normal CDF (mistShader.js `Phi`).
function phi(x) {
  const c = x < -REACH ? -REACH : x > REACH ? REACH : x;
  return 0.5 * (1 + Math.tanh(0.7978845608 * (c + 0.044715 * c * c * c)));
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

/**
 * Masks for `recipe` resting in a w × h (CSS px) frame at `dpr`. Resolves to
 * { ridges: [{ top, base, t, fade, fill, rim }], revoke }, where `fill` and
 * `rim` are { url, top, height } bands in CSS px (the image spans the full
 * width). Yields to the main thread between ridges.
 */
export async function ridgeMasks(recipe, w, h, dpr, isCancelled = () => false) {
  const [size, horizon, haze, height, sharp, sun, seed] = targetGeo(recipe);
  const mist = { ...mistOf(recipe.mist), haze, height, sharp, sun, seed };
  const { ridges } = layout(w, h, { size, horizon, mist, aspect: recipe.aspect });

  // The GL canvas's backing size, so the masks land on the same device pixels.
  const cols = Math.max(1, Math.round(w * dpr));
  const rowsAll = Math.max(1, Math.round(h * dpr));
  const sx = w / cols;
  const sy = h / rowsAll;
  const aa = 0.5 / (cols / w);
  const hw = rimWidth(h) / 2;
  const crest = new Float64Array(cols);
  const reach = new Float64Array(cols); // how far the edge spreads, CSS px
  const urls = [];
  const keep = []; // the decoded images, held so they stay in memory
  const out = [];

  for (const ridge of ridges) {
    if (isCancelled()) break;
    const blur = ridgeBlur(ridge.t, h);
    const sigma = Math.sqrt((blur > 0.4 ? blur * blur : 0) + aa * aa);
    sampleCrest(ridge, cols, cols / w, crest);

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
    const r0 = Math.max(0, Math.floor(lo / sy - 0.5));
    const r1 = Math.min(rowsAll, Math.ceil(hi / sy + 0.5));
    const rows = Math.max(1, r1 - r0);

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
    }

    const top = r0 * sy;
    const bandH = rows * sy;
    const [fillImg, rimImg] = await Promise.all([toUrl(fill, cols, rows), toUrl(rim, cols, rows)]);
    const fillUrl = fillImg.url;
    const rimUrl = rimImg.url;
    urls.push(fillUrl, rimUrl);
    keep.push(fillImg.img, rimImg.img);
    out.push({
      top: ridge.top,
      base: ridge.base,
      t: ridge.t,
      fade: ridge.fade,
      fill: { url: fillUrl, top, height: bandH },
      rim: { url: rimUrl, top, height: bandH },
    });
    await yieldToMain();
  }

  return { ridges: out, images: keep, revoke: () => urls.forEach(u => URL.revokeObjectURL(u)) };
}
