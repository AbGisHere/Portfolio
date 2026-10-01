import { GRAIN_SIZE, grainTexels } from './gl/mistGeometry';

/** The engine's grain (mistGeometry.js grainTexels) as a tile, one texel per CSS px. */
export function grainTile() {
  const c = document.createElement('canvas');
  c.width = GRAIN_SIZE;
  c.height = GRAIN_SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  const texels = grainTexels();
  for (let i = 0; i < texels.length; i++) {
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = texels[i];
    img.data[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Lays the tile over a `w`×`h` CSS px canvas at the device's own pixels, so
 * the compositor never resamples it (a pixelated stretch under the overlay
 * blend cost a frame). The canvas blends with `mix-blend-mode: overlay`.
 * Redraws only when the size changes.
 */
export function layGrain(el, tile, w, h) {
  const k = window.devicePixelRatio || 1;
  const cols = Math.round(w * k);
  const rows = Math.round(h * k);
  if (!tile || (el.width === cols && el.height === rows)) return;
  el.width = cols;
  el.height = rows;
  const x = el.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.setTransform(cols / w, 0, 0, rows / h, 0, 0);
  x.fillStyle = x.createPattern(tile, 'repeat');
  x.fillRect(0, 0, w, h);
}
