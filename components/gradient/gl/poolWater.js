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
export const WATER = { nx: 256, nz: 112, hz: 60, damp: 0.995, idle: [0.9, 2.6], chop: [0.05, 0.22] };

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

/** The caustics' target, grid and program (null: can't be drawn here). */
function makeCaustics(gl) {
  let prog;
  try {
    const sh = (type, src) => {
      const x = gl.createShader(type);
      gl.shaderSource(x, src);
      gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) ?? 'caustics');
      return x;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, CAUSTIC_VERTEX));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, CAUSTIC_FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('caustics');
  } catch {
    return null;
  }
  const tex = gl.createTexture();
  // (On its own unit, so it never displaces a texture someone else updates.)
  gl.activeTexture(gl.TEXTURE10);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, CAUSTICS.nx, CAUSTICS.nz, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  if (!ok) return null;
  // The grid: two triangles a cell, in the water's uv.
  const [gx, gz] = CAUSTICS.grid;
  const pts = [];
  for (let j = 0; j < gz; j++) {
    for (let i = 0; i < gx; i++) {
      const [u0, u1, v0, v1] = [i / gx, (i + 1) / gx, j / gz, (j + 1) / gz];
      pts.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    }
  }
  const buf = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindVertexArray(null);
  const u = name => gl.getUniformLocation(prog, name);
  return { prog, tex, fbo, vao, buf, count: pts.length / 2, u: { light: u('uLight'), size: u('uSize'), ior: u('uIor'), texel: u('uTexel'), t: u('uT') } };
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
  let chopIn = 0;

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
  const caus = makeCaustics(gl);

  const water = {
    drop(x, z, r = 0.35, s = 0.012) {
      const du = (x - (POOL.at[0] - POOL.w / 2)) / POOL.w;
      const dv = (z - (POOL.at[2] - POOL.d / 2)) / POOL.d;
      if (du < 0 || du > 1 || dv < 0 || dv > 1) return false;
      if (queue.length < 24) queue.push([du, dv, r / POOL.w, s]);
      return true;
    },
    step(dt) {
      // Now and then a faint drop of its own, and all the while the wind's
      // chop: small quick disturbances everywhere, so the surface is never
      // still and the sun through it nets the floor.
      idleIn -= dt;
      if (idleIn <= 0) {
        idleIn = WATER.idle[0] + Math.random() * (WATER.idle[1] - WATER.idle[0]);
        water.drop(POOL.at[0] + (Math.random() - 0.5) * POOL.w * 0.9, POOL.at[2] + (Math.random() - 0.5) * POOL.d * 0.9, 0.25, 0.004);
      }
      chopIn -= dt;
      while (chopIn <= 0) {
        chopIn += WATER.chop[0] + Math.random() * (WATER.chop[1] - WATER.chop[0]);
        water.drop(POOL.at[0] + (Math.random() - 0.5) * POOL.w, POOL.at[2] + (Math.random() - 0.5) * POOL.d, 0.09 + Math.random() * 0.12, (Math.random() - 0.4) * 0.0035);
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
    // The caustics for light from L (toward it) into `cUnit`; leaves the
    // default framebuffer bound and blending off (the caller resets its
    // viewport and program).
    caustics(L, cUnit, t) {
      if (!caus) return false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, caus.fbo);
      gl.viewport(0, 0, CAUSTICS.nx, CAUSTICS.nz);
      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(caus.prog);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex);
      gl.uniform1i(gl.getUniformLocation(caus.prog, 'uField'), unit);
      gl.uniform3fv(caus.u.light, L);
      gl.uniform3f(caus.u.size, POOL.w, POOL.d, POOL.deep);
      gl.uniform2f(caus.u.texel, 1 / nx, 1 / nz);
      gl.uniform1f(caus.u.t, t);
      gl.bindVertexArray(caus.vao);
      CAUSTICS.ior.forEach((n, c) => {
        gl.colorMask(c === 0, c === 1, c === 2, false);
        gl.uniform1f(caus.u.ior, n);
        gl.drawArrays(gl.TRIANGLES, 0, caus.count);
      });
      gl.colorMask(true, true, true, true);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0 + cUnit);
      gl.bindTexture(gl.TEXTURE_2D, caus.tex);
      gl.activeTexture(gl.TEXTURE0);
      return true;
    },
    dispose() {
      if (caus) {
        gl.deleteTexture(caus.tex);
        gl.deleteFramebuffer(caus.fbo);
        gl.deleteProgram(caus.prog);
        gl.deleteVertexArray(caus.vao);
        gl.deleteBuffer(caus.buf);
      }
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

/**
 * (0.4.2) The wind's ripples, too short for the field's cells (10 – 47 cm):
 * a few wave trains across the pool, each moving at its own speed as water
 * waves do (deep water: c = sqrt(g λ / 2π)), millimetres high. `waveSlope`
 * is their slope at a point (metres, the pool's plan) at time t. They're
 * what nets the floor with light on a calm day.
 */
const TRAINS = [
  [0.47, 0.0015, 0.3], [0.32, 0.0012, -0.4], [0.21, 0.0008, 1.1], [0.17, 0.0006, -1.3], [0.11, 0.0004, 2.2], [0.27, 0.0009, 0.9],
];
export const WAVES_GLSL = `vec2 waveSlope(vec2 p, float t) {
  vec2 s = vec2(0.0);
${TRAINS.map(([l, a, d]) => {
  const k = (2 * Math.PI) / l;
  const w = Math.sqrt(9.81 * k);
  return `  { vec2 dir = vec2(${Math.cos(d).toFixed(4)}, ${Math.sin(d).toFixed(4)}); float ph = dot(p, dir) * ${k.toFixed(4)} - t * ${w.toFixed(4)}; s += dir * ${(a * k).toFixed(5)} * cos(ph); }`;
}).join('\n')}
  return s;
}
`;

// (0.4.2) The caustics: the sun through the surface onto the floor. A grid
// of points over the water, each refracted down to the floor through the
// field's slope at it (its colour's index); each triangle lands bigger
// where the surface spreads the light and smaller where it focuses it, and
// how much brighter is the area it had over the area it has (Evan
// Wallace's method). Flat water lands every triangle as it was: 1.
const CAUSTIC_VERTEX = `#version 300 es
layout(location = 0) in vec2 aUv;
uniform sampler2D uField;
uniform vec3 uLight;     // toward the light (unit)
uniform vec3 uSize;      // the pool: width, length (metres), depth to the floor
uniform float uIor;
uniform vec2 uTexel;
uniform float uT;
out vec3 vOld;
out vec3 vNew;
${WAVES_GLSL}
vec3 down(vec3 n) {
  vec3 r = refract(-uLight, n, 1.0 / uIor);
  return r * (uSize.z / max(-r.y, 1e-3));
}
void main() {
  float h = texture(uField, aUv).r;
  vec2 g = vec2(texture(uField, aUv + vec2(uTexel.x, 0.0)).r - texture(uField, aUv - vec2(uTexel.x, 0.0)).r,
    texture(uField, aUv + vec2(0.0, uTexel.y)).r - texture(uField, aUv - vec2(0.0, uTexel.y)).r) / (2.0 * uTexel * uSize.xy);
  g += waveSlope(aUv * uSize.xy, uT);
  vec3 p = vec3(aUv * uSize.xy, 0.0);
  vOld = p + down(vec3(0.0, 1.0, 0.0));
  vNew = p + down(normalize(vec3(-g.x, 1.0, -g.y))) * (1.0 - h / uSize.z);
  // Laid out on the floor where the flat water would have put it.
  vec3 flat0 = down(vec3(0.0, 1.0, 0.0));
  vec2 at = (vNew.xy - flat0.xy) / uSize.xy;
  gl_Position = vec4(at * 2.0 - 1.0, 0.0, 1.0);
}
`;

const CAUSTIC_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vOld;
in vec3 vNew;
out vec4 outColor;
void main() {
  float before = length(dFdx(vOld)) * length(dFdy(vOld));
  float after = length(dFdx(vNew)) * length(dFdy(vNew));
  outColor = vec4(vec3(before / max(after, 1e-12)), 1.0);
}
`;

/** The caustics' map: its size, and the indices it's drawn at (water's,
 * for red, green and blue: houseGlass.js IOR). */
export const CAUSTICS = { nx: 512, nz: 216, grid: [420, 178], ior: [1.3311, 1.334, 1.3372] };

/** The sim's shaders, for the devices check (scripts/lib/programs.mjs). */
export const WATER_PROGRAMS = [['water-step', VERTEX, STEP], ['water-drop', VERTEX, DROP], ['water-caustics', CAUSTIC_VERTEX, CAUSTIC_FRAGMENT]];
