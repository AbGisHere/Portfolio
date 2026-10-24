/**
 * (0.4.2) The sun's shadow over the house: a depth map rendered from the
 * light (an orthographic box round HOUSE_BOUNDS, looking along the light),
 * sampled with a soft 3 × 3 compare in houseShader.js. It's redrawn only
 * when the light moves (a switch), not every frame.
 */

import { HOUSE_BOUNDS } from './houseShape';

/** The map's size (texels a side). */
export const SHADOW_SIZE = 2048;

export const SHADOW_VERTEX = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uLightVP;
void main() {
  gl_Position = uLightVP * vec4(aPos, 1.0);
}
`;

export const SHADOW_FRAGMENT = `#version 300 es
precision mediump float;
void main() {}
`;

/** The light's direction (toward it, unit) from the scene's `dir` across the
 * ground: the body is always low beyond the mountains (propsShader.js). */
export function lightDir(dir) {
  const v = [dir[0], 0.55, dir[1]];
  const l = Math.hypot(...v);
  return v.map(x => x / l);
}

/**
 * The light's view-projection (column-major) over HOUSE_BOUNDS, looking
 * along −L.
 */
export function lightMatrix(L) {
  const f = L.map(x => -x);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = a => {
    const l = Math.hypot(...a);
    return a.map(x => x / l);
  };
  const r = unit(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const { lo, hi } = HOUSE_BOUNDS;
  let mn = [Infinity, Infinity, Infinity];
  let mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
    const c = [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]];
    const q = [dot(c, r), dot(c, u), dot(c, f)];
    mn = mn.map((m, k) => Math.min(m, q[k]));
    mx = mx.map((m, k) => Math.max(m, q[k]));
  }
  // Row k of the matrix maps a point to clip coordinate k.
  const sx = 2 / (mx[0] - mn[0]);
  const sy = 2 / (mx[1] - mn[1]);
  const sz = 2 / (mx[2] - mn[2]);
  const rows = [
    [r[0] * sx, r[1] * sx, r[2] * sx, -(mx[0] + mn[0]) / (mx[0] - mn[0])],
    [u[0] * sy, u[1] * sy, u[2] * sy, -(mx[1] + mn[1]) / (mx[1] - mn[1])],
    [f[0] * sz, f[1] * sz, f[2] * sz, -(mx[2] + mn[2]) / (mx[2] - mn[2])],
    [0, 0, 0, 1],
  ];
  const m = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) m[c * 4 + k] = rows[k][c];
  return m;
}

/**
 * The shadow map on `gl`: a depth texture on `unit` and its framebuffer.
 * `render(draw, L)` redraws it (when L has moved) with `draw(matrix)`
 * drawing the house's depth; `matrix` is the last one drawn. Leaves the
 * default framebuffer bound; the caller resets its viewport.
 */
export function makeShadow(gl, unit) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  gl.activeTexture(gl.TEXTURE0);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
    return null;
  }
  let key = '';
  const shadow = {
    matrix: lightMatrix([0, 1, 0]),
    render(draw, L) {
      const k = L.map(x => x.toFixed(4)).join();
      if (k === key) return;
      key = k;
      shadow.matrix = lightMatrix(L);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      // A slope-scaled offset, so lit faces don't shade themselves.
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(2, 4);
      draw(shadow.matrix);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    bind() {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.activeTexture(gl.TEXTURE0);
    },
    dispose() {
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
    },
  };
  return shadow;
}
