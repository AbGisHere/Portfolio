/**
 * (0.4.6) A soft bloom by night round the house: what's bright in the frame
 * (its lamps, its glowing glass, the pool's light) spills a glow into the
 * dark round it, as it does to the eye and a lens. The frame's brightest
 * parts, taken down to a quarter of its size, blurred wide in two passes
 * (across, then down), and added back over it.
 */

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

// The brightest parts: how far past the knee each colour is, softly.
const BRIGHT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uFrom;
uniform vec2 uTexel;
// (0.5.17) The part of the frame's texture it fills (1, 1 but while the
// climb moves at a part size).
uniform vec2 uScale;
in vec2 vUv;
out vec4 outColor;
void main() {
  // (0.5.28) Exact 4-tap bilinear decomposition of the 3x3 box filter on a
  // gl.LINEAR source texture: 4/9 at (-0.5,-0.5), 2/9 at (+1,-0.5) & (-0.5,+1),
  // 1/9 at (+1,+1) — 55.6% fewer texture reads with identical weights.
  vec2 b = vUv * uScale;
  vec2 t = uTexel;
  vec3 c = (4.0 * texture(uFrom, b + vec2(-0.5, -0.5) * t).rgb
    + 2.0 * texture(uFrom, b + vec2(1.0, -0.5) * t).rgb
    + 2.0 * texture(uFrom, b + vec2(-0.5, 1.0) * t).rgb
    + texture(uFrom, b + vec2(1.0, 1.0) * t).rgb) / 9.0;
  float l = max(c.r, max(c.g, c.b));
  // (Only what burns: the lamps, the strips, the shades; a lit wall rolls
  // off below this, houseShader.js.)
  float k = smoothstep(0.9, 1.0, l);
  outColor = vec4(c * k, 1.0);
}
`;

// A Gaussian of 9 taps along uDir.
const BLUR = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uFrom;
uniform vec2 uDir;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 d2 = uDir * 2.0, d3 = uDir * 3.0, d4 = uDir * 4.0;
  vec3 c = texture(uFrom, vUv).rgb * 0.227
    + (texture(uFrom, vUv + uDir).rgb + texture(uFrom, vUv - uDir).rgb) * 0.194
    + (texture(uFrom, vUv + d2).rgb + texture(uFrom, vUv - d2).rgb) * 0.122
    + (texture(uFrom, vUv + d3).rgb + texture(uFrom, vUv - d3).rgb) * 0.054
    + (texture(uFrom, vUv + d4).rgb + texture(uFrom, vUv - d4).rgb) * 0.016;
  outColor = vec4(c, 1.0);
}
`;

const ADD = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uFrom;
uniform float uAmount;
// (0.4.57) With the frame itself (uBaseOn), written over the canvas with
// blending off: one full-screen pass in place of a copy and a blend.
uniform sampler2D uBase;
uniform float uBaseOn;
uniform vec2 uScale;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 b = uBaseOn > 0.5 ? texture(uBase, vUv * uScale).rgb : vec3(0.0);
  outColor = vec4(b + texture(uFrom, vUv).rgb * uAmount, 1.0);
}
`;

export const BLOOM_PROGRAMS = [['bloom-bright', VERTEX, BRIGHT], ['bloom-blur', VERTEX, BLUR], ['bloom-add', VERTEX, ADD]];

function program(gl, fs) {
  const sh = (type, src) => {
    const x = gl.createShader(type);
    gl.shaderSource(x, src);
    gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) ?? 'bloom');
    return x;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('bloom');
  return p;
}

/**
 * The bloom on `gl`, its working targets on texture `unit` (null: it can't
 * run). `apply(frame, w, h, amount)`: `frame` a texture holding the frame
 * as drawn (w × h device pixels); adds the glow over the default
 * framebuffer. Leaves the default framebuffer bound, blending off, the
 * viewport the frame's; the caller resets its program.
 */
/** (0.4.63) The night's frame for the add pass: no other pass uses unit 20. */
const BASE_UNIT = 20;

export function makeBloom(gl, unit, pre = null) {
  let progs;
  try {
    // (0.4.65) `pre(name)`: a program already linked in parallel, if any.
    progs = { bright: pre?.('bloom-bright') ?? program(gl, BRIGHT), blur: pre?.('bloom-blur') ?? program(gl, BLUR), add: pre?.('bloom-add') ?? program(gl, ADD) };
  } catch {
    return null;
  }
  const locations = new Map(Object.values(progs).map(p => [p, new Map()]));
  const u = (p, name) => {
    const cache = locations.get(p);
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
    return cache.get(name);
  };
  const vao = gl.createVertexArray();
  const targets = [0, 1].map(() => ({ tex: gl.createTexture(), fbo: gl.createFramebuffer() }));
  let size = [0, 0];
  let hasGlow = false;
  let warmed = false;
  const resize = (w, h) => {
    const s = [Math.max(1, w >> 2), Math.max(1, h >> 2)];
    if (s[0] === size[0] && s[1] === size[1]) return;
    size = s;
    hasGlow = false;
    gl.activeTexture(gl.TEXTURE0 + unit);
    for (const t of targets) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, s[0], s[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
  };
  const run = (prog, to, from, set) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, to ? to.fbo : null);
    if (to) gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0]);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, from);
    gl.uniform1i(u(prog, 'uFrom'), unit);
    set(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const prepare = (w, h) => {
    resize(w, h);
    if (warmed || !size[0] || !size[1]) return;
    warmed = true;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, 0, 1, 1);
    gl.viewport(0, 0, 1, 1);
    gl.bindVertexArray(vao);
    run(progs.bright, targets[0], targets[1].tex, p => {
      gl.uniform2f(u(p, 'uTexel'), 1 / Math.max(1, w), 1 / Math.max(1, h));
      gl.uniform2f(u(p, 'uScale'), 1, 1);
    });
    run(progs.blur, targets[1], targets[0].tex, p => gl.uniform2f(u(p, 'uDir'), 1 / size[0], 0));
    gl.activeTexture(gl.TEXTURE0 + BASE_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, targets[1].tex);
    run(progs.add, targets[0], targets[1].tex, p => {
      gl.uniform1f(u(p, 'uAmount'), 0);
      gl.uniform1f(u(p, 'uBaseOn'), 1);
      gl.uniform2f(u(p, 'uScale'), 1, 1);
      gl.uniform1i(u(p, 'uBase'), BASE_UNIT);
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    run(progs.add, targets[0], targets[1].tex, p => {
      gl.uniform1f(u(p, 'uAmount'), 0);
      gl.uniform1f(u(p, 'uBaseOn'), 0);
      gl.uniform2f(u(p, 'uScale'), 1, 1);
      gl.uniform1i(u(p, 'uBase'), unit);
    });
    for (const t of targets) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0]);
    }
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
  };
  return {
    prepare,
    // (0.4.57) `base`: the frame's texture, to write it and the glow onto
    // the canvas in one pass (blending off); else the glow is added on.
    // `reuse`: at rest when the bright sources haven't changed, reuse the
    // already-blurred `targets[0].tex` (skips bright + 4 blur passes).
    apply(frame, w, h, amount, base = null, scale = [1, 1], reuse = false) {
      resize(w, h);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(vao);
      if (!(reuse && hasGlow)) {
        gl.viewport(0, 0, size[0], size[1]);
        run(progs.bright, targets[0], frame, p => {
          gl.uniform2f(u(p, 'uTexel'), 1 / w, 1 / h);
          gl.uniform2f(u(p, 'uScale'), scale[0], scale[1]);
        });
        for (let k = 0; k < 2; k++) {
          const r = 1.6 + k * 1.4;
          run(progs.blur, targets[1], targets[0].tex, p => gl.uniform2f(u(p, 'uDir'), r / size[0], 0));
          run(progs.blur, targets[0], targets[1].tex, p => gl.uniform2f(u(p, 'uDir'), 0, r / size[1]));
        }
        hasGlow = true;
      }
      gl.viewport(0, 0, w, h);
      if (!base) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
      }
      // (0.4.63) The frame on a unit of its own (BASE_UNIT, used by
      // nothing else), so nothing there needs saving or putting back.
      run(progs.add, null, targets[0].tex, p => {
        gl.uniform1f(u(p, 'uAmount'), amount);
        gl.uniform1f(u(p, 'uBaseOn'), base ? 1 : 0);
        gl.uniform2f(u(p, 'uScale'), scale[0], scale[1]);
        gl.uniform1i(u(p, 'uBase'), base ? BASE_UNIT : unit);
        if (base) {
          gl.activeTexture(gl.TEXTURE0 + BASE_UNIT);
          gl.bindTexture(gl.TEXTURE_2D, base);
          gl.activeTexture(gl.TEXTURE0 + unit);
        }
      });
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.activeTexture(gl.TEXTURE0);
    },
    dispose() {
      for (const t of targets) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      }
      for (const p of Object.values(progs)) gl.deleteProgram(p);
      gl.deleteVertexArray(vao);
    },
  };
}
