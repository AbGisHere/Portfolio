/**
 * (0.4.2) The pool's water: a height field simulated on the GPU (the classic
 * WebGL water: each cell pulled toward its neighbours' mean, its speed damped),
 * on a grid over the pool (houseShape.js POOL), ping-ponged between two float
 * targets. Drops disturb it: the pointer over the water, and now and then a
 * faint one of its own, so it's never glass. The walls reflect the ripples
 * (the edge cells read themselves). houseShader.js reads the field for the
 * surface's normal, the refraction and the caustics on the tiles.
 *
 * It steps on GL's frame loop at a fixed rate (WATER.hz), and only while the
 * pool can be seen; reduced motion and `?freeze=1` leave the water still.
 * Without float render targets there's no simulation: the water lies flat.
 */

import { POOL } from './houseShape';

/** The grid (cells across x, z), the rate it steps at, the damping. */
export const WATER = { nx: 256, nz: 112, hz: 60, damp: 0.995, idle: [0.9, 2.6] };

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

// One step: r the height, g its speed.
const STEP = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 c = texture(uField, vUv);
  vec2 dx = vec2(uTexel.x, 0.0);
  vec2 dy = vec2(0.0, uTexel.y);
  // (At a wall the cell past it reads as this one: the ripple bounces.)
  float l = vUv.x - dx.x < 0.0 ? c.r : texture(uField, vUv - dx).r;
  float r = vUv.x + dx.x > 1.0 ? c.r : texture(uField, vUv + dx).r;
  float d = vUv.y - dy.y < 0.0 ? c.r : texture(uField, vUv - dy).r;
  float u = vUv.y + dy.y > 1.0 ? c.r : texture(uField, vUv + dy).r;
  float mean = (l + r + d + u) * 0.25;
  c.g += (mean - c.r) * 2.0;
  c.g *= ${WATER.damp.toFixed(4)};
  c.r += c.g;
  outColor = c;
}
`;

// A drop: a smooth dent at uDrop.xy (0 … 1 over the pool), uDrop.z its
// radius (of the pool's width), uDrop.w how deep.
const DROP = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec4 uDrop;
uniform vec2 uAspect;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 c = texture(uField, vUv);
  float d = length((vUv - uDrop.xy) * uAspect) / uDrop.z;
  c.r -= uDrop.w * (0.5 + 0.5 * cos(3.14159 * min(d, 1.0))) * step(d, 1.0);
  outColor = c;
}
`;

function program(gl, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'water shader');
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'water program');
  return p;
}

/**
 * The simulation on `gl` (WebGL2), or null when it can't run here. `unit`:
 * the texture unit the field is read from. `drop(x, z, r, s)` queues a
 * disturbance at a point in the world (metres; false off the water),
 * `step(dt)` applies the queue and advances the field, `bind()` puts the
 * field on its unit, `dispose()` frees it. `step` leaves the default
 * framebuffer bound, depth testing and blending off and the active texture
 * unit 0: the caller sets its viewport and program back.
 */
export function makeWater(gl, unit) {
  if (!gl.getExtension('EXT_color_buffer_float')) return null;
  let progs;
  try {
    progs = { step: program(gl, STEP), drop: program(gl, DROP) };
  } catch {
    return null;
  }
  const { nx, nz } = WATER;
  const targets = [0, 1].map(() => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, nx, nz, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo };
  });
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  for (const t of targets) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) {
    for (const t of targets) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    return null;
  }
  const vao = gl.createVertexArray();
  let cur = 0;
  let acc = 0;
  let idleIn = WATER.idle[0];

  const U = new Map();
  const u = (prog, name) => {
    const key = `${prog === progs.step ? 's' : 'd'}${name}`;
    if (!U.has(key)) U.set(key, gl.getUniformLocation(prog, name));
    return U.get(key);
  };
  // One pass from the current target into the other.
  const pass = (prog, set) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1 - cur].fbo);
    gl.useProgram(prog);
    gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
    gl.uniform1i(u(prog, 'uField'), unit);
    set(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
  };
  const queue = [];

  const water = {
    drop(x, z, r = 0.35, s = 0.012) {
      const du = (x - (POOL.at[0] - POOL.w / 2)) / POOL.w;
      const dv = (z - (POOL.at[2] - POOL.d / 2)) / POOL.d;
      if (du < 0 || du > 1 || dv < 0 || dv > 1) return false;
      if (queue.length < 16) queue.push([du, dv, r / POOL.w, s]);
      return true;
    },
    step(dt) {
      // Now and then a faint drop of its own.
      idleIn -= dt;
      if (idleIn <= 0) {
        idleIn = WATER.idle[0] + Math.random() * (WATER.idle[1] - WATER.idle[0]);
        water.drop(POOL.at[0] + (Math.random() - 0.5) * POOL.w * 0.9, POOL.at[2] + (Math.random() - 0.5) * POOL.d * 0.9, 0.25, 0.004);
      }
      acc = Math.min(acc + dt, 4 / WATER.hz);
      if (!queue.length && acc < 1 / WATER.hz) return;
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, nx, nz);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0 + unit);
      for (const d of queue.splice(0)) {
        pass(progs.drop, p => {
          gl.uniform4f(u(p, 'uDrop'), ...d);
          gl.uniform2f(u(p, 'uAspect'), 1, POOL.d / POOL.w);
        });
      }
      while (acc >= 1 / WATER.hz) {
        acc -= 1 / WATER.hz;
        pass(progs.step, p => gl.uniform2f(u(p, 'uTexel'), 1 / nx, 1 / nz));
      }
      gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    bind() {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
      gl.activeTexture(gl.TEXTURE0);
    },
    dispose() {
      for (const t of targets) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      }
      gl.deleteProgram(progs.step);
      gl.deleteProgram(progs.drop);
      gl.deleteVertexArray(vao);
    },
  };
  gl.activeTexture(gl.TEXTURE0);
  return water;
}

/** The sim's shaders, for the devices check (scripts/lib/programs.mjs). */
export const WATER_PROGRAMS = [['water-step', VERTEX, STEP], ['water-drop', VERTEX, DROP]];
