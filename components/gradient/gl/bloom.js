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
uniform sampler2D uFrom;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = vec3(0.0);
  for (int i = -1; i <= 1; i++)
    for (int j = -1; j <= 1; j++) c += texture(uFrom, vUv + vec2(i, j) * uTexel).rgb;
  c /= 9.0;
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
uniform sampler2D uFrom;
uniform vec2 uDir;
in vec2 vUv;
out vec4 outColor;
void main() {
  const float W[5] = float[](0.227, 0.194, 0.122, 0.054, 0.016);
  vec3 c = texture(uFrom, vUv).rgb * W[0];
  for (int i = 1; i < 5; i++) {
    c += texture(uFrom, vUv + uDir * float(i)).rgb * W[i];
    c += texture(uFrom, vUv - uDir * float(i)).rgb * W[i];
  }
  outColor = vec4(c, 1.0);
}
`;

const ADD = `#version 300 es
precision highp float;
uniform sampler2D uFrom;
uniform float uAmount;
in vec2 vUv;
out vec4 outColor;
void main() {
  outColor = vec4(texture(uFrom, vUv).rgb * uAmount, 1.0);
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
export function makeBloom(gl, unit) {
  let progs;
  try {
    progs = { bright: program(gl, BRIGHT), blur: program(gl, BLUR), add: program(gl, ADD) };
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
  const resize = (w, h) => {
    const s = [Math.max(1, w >> 2), Math.max(1, h >> 2)];
    if (s[0] === size[0] && s[1] === size[1]) return;
    size = s;
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
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, from);
    gl.uniform1i(u(prog, 'uFrom'), unit);
    set(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  return {
    prepare: resize,
    apply(frame, w, h, amount) {
      resize(w, h);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, size[0], size[1]);
      run(progs.bright, targets[0], frame, p => gl.uniform2f(u(p, 'uTexel'), 1 / w, 1 / h));
      for (let k = 0; k < 2; k++) {
        const r = 1.6 + k * 1.4;
        run(progs.blur, targets[1], targets[0].tex, p => gl.uniform2f(u(p, 'uDir'), r / size[0], 0));
        run(progs.blur, targets[0], targets[1].tex, p => gl.uniform2f(u(p, 'uDir'), 0, r / size[1]));
      }
      gl.viewport(0, 0, w, h);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      run(progs.add, null, targets[0].tex, p => gl.uniform1f(u(p, 'uAmount'), amount));
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
