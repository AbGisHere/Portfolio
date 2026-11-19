/**
 * (0.4.45) On-device baked lightmap (uLightmap on texture unit 17): drawn once
 * on the GPU into a 1024² RGBA16F atlas when the house program is prepared,
 * so the lawn's mound and the roof's deck read their lamp light by night from
 * one filtered lookup instead of walking the cell lists per pixel. Baked at
 * full night and scaled by the garden's schedule (nightOn(2)); the lawn's
 * highlight is exact because its roughness is 1 (lampAt's closed form).
 * `?lightmap=0` turns it off.
 *
 * - Rows 0 … 895, all columns: the lawn over LIGHTMAP_BOUNDS.lawn, filled
 *   analytically and then rasterised from the house VAO's own lawn
 *   triangles so interpolated positions and normals match the mesh.
 * - Rows 896 … 1023, cols 0 … 127 (124² interior, 2 px gutter): the roof deck.
 * - The rest is black (unused).
 *
 * (0.4.57) Kept in the browser after the first bake (lightmapCache.js):
 * `lightmapHash` names the bake, `startLightmapReadback` reads it back
 * once without stalling, `uploadLightmap` makes the same texture from it.
 */

import { MOUND, MOUND_GLSL } from './houseShape';
import { HOUSE_LIGHT_GLSL, LIGHTMAP_BOUNDS } from './houseShader';
import { f32ToF16Exact, hashParts, validLightmap } from './lightmapCache';
import { HOUSE_VERTEX_GLSL, tableSamplers } from './houseVertices';

const f = x => (Number.isInteger(x) ? `${x}.0` : x.toFixed(5));
const [W, H] = LIGHTMAP_BOUNDS.size;
const { lawn, roof } = LIGHTMAP_BOUNDS;

const LIGHTMAP_BASE_GLSL = `
float ggx(float nh, float a) {
  float a2 = a * a;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * d * d);
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

export const ATLAS_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export const LAWN_MESH_VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
${HOUSE_VERTEX_GLSL}
out vec3 vWorld;
out vec3 vNorm;
void main() {
  vWorld = aPos;
  vNorm = hvNormal();
  vec2 ndc = vec2(
    (aPos.x - ${f(lawn.x0)}) * ${f(2 / (lawn.x1 - lawn.x0))} - 1.0,
    (aPos.z - ${f(lawn.z0)}) * ${f(2 / (lawn.z1 - lawn.z0))} - 1.0
  );
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`;

export const ATLAS_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform float uNight;
out vec4 outColor;

${LIGHTMAP_BASE_GLSL}
${MOUND_GLSL}
${HOUSE_LIGHT_GLSL}

vec3 lawnNorm(vec2 p) {
  vec2 d = (p - vec2(${f(MOUND.at[0])}, ${f(MOUND.at[1])})) / vec2(${f(MOUND.r[0])}, ${f(MOUND.r[1])});
  float s2 = dot(d, d);
  if (s2 >= 1.0) return vec3(0.0, 1.0, 0.0);
  float k = 4.0 * ${f(MOUND.h)} * (1.0 - s2);
  vec2 g = -k * d / vec2(${f(MOUND.r[0])}, ${f(MOUND.r[1])});
  return normalize(vec3(-g.x, 1.0, -g.y));
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  if (fc.y < ${f(lawn.h)}) {
    vec2 u = fc / vec2(${f(W)}, ${f(lawn.h)});
    vec2 xz = vec2(mix(${f(lawn.x0)}, ${f(lawn.x1)}, u.x), mix(${f(lawn.z0)}, ${f(lawn.z1)}, u.y));
    vec3 p = vec3(xz.x, moundY(xz), xz.y);
    outColor = vec4(lampsAt(p, lawnNorm(xz), vec3(0.0, 1.0, 0.0), 1.0, 0) * ${f(1 / 1.08)}, 1.0);
    return;
  }
  if (fc.x < 128.0) {
    vec2 u = clamp((fc - vec2(2.0, 898.0)) / 124.0, 0.0, 1.0);
    vec3 p = vec3(mix(${f(roof.x0)}, ${f(roof.x1)}, u.x), ${f(roof.y)}, mix(${f(roof.z0)}, ${f(roof.z1)}, u.y));
    outColor = vec4(lampsAt(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), 0.85, 0) * ${f(1 / 1.08)}, 1.0);
    return;
  }
  outColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

export const LAWN_MESH_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform float uNight;
in vec3 vWorld;
in vec3 vNorm;
out vec4 outColor;

${LIGHTMAP_BASE_GLSL}
${HOUSE_LIGHT_GLSL}

void main() {
  outColor = vec4(lampsAt(vWorld, normalize(vNorm), vec3(0.0, 1.0, 0.0), 1.0, 0) * ${f(1 / 1.08)}, 1.0);
}
`;

export const LIGHTMAP_PROGRAMS = [
  ['lightmap-atlas', ATLAS_VERTEX, ATLAS_FRAGMENT],
  ['lightmap-lawn', LAWN_MESH_VERTEX, LAWN_MESH_FRAGMENT],
];

function compile(gl, vsSrc, fsSrc) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(info || 'lightmap shader');
    }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, vsSrc);
  const fs = sh(gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    throw new Error('lightmap link');
  }
  return prog;
}

/**
 * Bake the static lightmap texture on `gl` at texture `unit` (17). Returns
 * `{ tex, dispose }` or `null` if half-float rendering is unavailable.
 */
export function makeLightmap(gl, unit, lightTex, houseVao = null, lawnCount = 0, progs = null) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null;
  gl.getExtension('OES_texture_half_float_linear');
  const prevVp = gl.getParameter(gl.VIEWPORT);
  let atlasProg = progs?.atlas ?? null;
  let lawnProg = progs?.lawn ?? null;
  const ownAtlas = !atlasProg;
  const ownLawn = !lawnProg;
  let fbo = null;
  let emptyVao = null;
  const tex = lightmapTexture(gl, unit, null);
  try {
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('lightmap fbo incomplete');
    }

    if (!atlasProg) atlasProg = compile(gl, ATLAS_VERTEX, ATLAS_FRAGMENT);
    if (!lawnProg && houseVao && lawnCount > 0) lawnProg = compile(gl, LAWN_MESH_VERTEX, LAWN_MESH_FRAGMENT);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE16);
    gl.bindTexture(gl.TEXTURE_2D, lightTex);

    // 1. Full atlas pass (analytical lawn + roof + all 8 rooms' ceiling schedules).
    gl.viewport(0, 0, W, H);
    gl.useProgram(atlasProg);
    gl.uniform1i(gl.getUniformLocation(atlasProg, 'uLightData'), 16);
    gl.uniform1f(gl.getUniformLocation(atlasProg, 'uNight'), 1.0);
    emptyVao = gl.createVertexArray();
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. Exact lawn mesh pass over the lawn viewport so triangle-interpolated
    // normals and positions match the live mesh.
    if (lawnProg && houseVao && lawnCount > 0) {
      gl.viewport(0, 0, W, lawn.h);
      tableSamplers(gl, lawnProg);
      gl.useProgram(lawnProg);
      gl.uniform1i(gl.getUniformLocation(lawnProg, 'uLightData'), 16);
      gl.uniform1f(gl.getUniformLocation(lawnProg, 'uNight'), 1.0);
      gl.bindVertexArray(houseVao);
      gl.drawElements(gl.TRIANGLES, lawnCount, gl.UNSIGNED_INT, 0);
    }

    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    if (prevVp) gl.viewport(prevVp[0], prevVp[1], prevVp[2], prevVp[3]);
    gl.deleteFramebuffer(fbo);
    gl.deleteVertexArray(emptyVao);
    if (ownAtlas && atlasProg) gl.deleteProgram(atlasProg);
    if (ownLawn && lawnProg) gl.deleteProgram(lawnProg);
    return {
      tex,
      dispose() {
        gl.deleteTexture(tex);
      },
    };
  } catch {
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    if (prevVp) gl.viewport(prevVp[0], prevVp[1], prevVp[2], prevVp[3]);
    if (fbo) gl.deleteFramebuffer(fbo);
    if (emptyVao) gl.deleteVertexArray(emptyVao);
    if (ownAtlas && atlasProg) gl.deleteProgram(atlasProg);
    if (ownLawn && lawnProg) gl.deleteProgram(lawnProg);
    gl.deleteTexture(tex);
    return null;
  }
}

// The texture's state, shared by the bake and the upload.
function lightmapTexture(gl, unit, data) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/**
 * (0.4.57) What a stored bake is named by beside the house worker's URL:
 * everything the bake reads that the mesh doesn't. `lights` is the lights'
 * data (houseLightData().data); `extra` any flag that changes the mesh's
 * upload.
 */
export function lightmapHash(gl, lights, extra = '') {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return hashParts([
    'lightmap-1', ATLAS_VERTEX, ATLAS_FRAGMENT, LAWN_MESH_VERTEX, LAWN_MESH_FRAGMENT,
    LIGHTMAP_BOUNDS, makeLightmap.toString(), lightmapTexture.toString(), lights,
    String(gpu), String(gl.getParameter(gl.VERSION)), typeof navigator !== 'undefined' ? navigator.userAgent : '', extra,
  ]);
}

/**
 * (0.4.57) The lightmap from a stored bake (`data`, half floats' bits):
 * the same texture `makeLightmap` draws, or null where it would be.
 */
export function uploadLightmap(gl, unit, data) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null;
  if (!validLightmap(data, W, H)) return null;
  gl.getExtension('OES_texture_half_float_linear');
  // (Plain rows: no flip, no premultiply, nothing bound to unpack from.)
  const keep = [gl.UNPACK_FLIP_Y_WEBGL, gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, gl.UNPACK_ALIGNMENT, gl.UNPACK_ROW_LENGTH, gl.UNPACK_SKIP_ROWS, gl.UNPACK_SKIP_PIXELS].map(k => [k, gl.getParameter(k)]);
  const unpackBuf = gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING);
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
  gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
  const tex = lightmapTexture(gl, unit, data);
  for (const [k, v] of keep) gl.pixelStorei(k, v);
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, unpackBuf);
  gl.activeTexture(gl.TEXTURE0);
  return {
    tex,
    cached: true,
    dispose() {
      gl.deleteTexture(tex);
    },
  };
}

/**
 * (0.4.57) Read a baked lightmap back without waiting on the GPU: into a
 * pixel buffer behind a fence, polled with a zero timeout. As floats where
 * float colour buffers are (exact from half, then checked to be halves),
 * else as half floats if that's the implementation's own read type. Calls
 * `done(data)` with the half floats' bits, or `done(null)` on any failure.
 * Returns a function that cancels it.
 */
export function startLightmapReadback(gl, tex, done, { slice = 1 << 19, wait = 50, tries = 400 } = {}) {
  let pbo = null;
  let fbo = null;
  let sync = null;
  let timer = 0;
  let over = false;
  const free = () => {
    if (timer) clearTimeout(timer);
    timer = 0;
    if (gl.isContextLost()) return;
    if (sync) gl.deleteSync(sync);
    if (pbo) gl.deleteBuffer(pbo);
    sync = null;
    pbo = null;
  };
  const finish = data => {
    if (over) return;
    over = true;
    free();
    done(data);
  };
  try {
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let type = null;
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      if (gl.getExtension('EXT_color_buffer_float')) type = gl.FLOAT;
      else if (gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) === gl.RGBA && gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) === gl.HALF_FLOAT) type = gl.HALF_FLOAT;
    }
    if (type !== null) {
      const keep = [gl.PACK_ALIGNMENT, gl.PACK_ROW_LENGTH, gl.PACK_SKIP_ROWS, gl.PACK_SKIP_PIXELS].map(k => [k, gl.getParameter(k)]);
      gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.PACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.PACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0);
      pbo = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, W * H * 4 * (type === gl.FLOAT ? 4 : 2), gl.STREAM_READ);
      gl.readPixels(0, 0, W, H, gl.RGBA, type, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      for (const [k, v] of keep) gl.pixelStorei(k, v);
      sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    fbo = null;
    if (!sync) {
      finish(null);
      return () => {};
    }
    const asFloat = type === gl.FLOAT;
    let left = tries;
    const poll = () => {
      timer = 0;
      if (over) return;
      if (gl.isContextLost() || --left < 0) return finish(null);
      const status = gl.clientWaitSync(sync, 0, 0);
      if (status === gl.WAIT_FAILED) return finish(null);
      if (status === gl.TIMEOUT_EXPIRED) {
        timer = setTimeout(poll, wait);
        return;
      }
      const raw = asFloat ? new Float32Array(W * H * 4) : new Uint16Array(W * H * 4);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, raw);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      free();
      if (!asFloat) return finish(validLightmap(raw, W, H) ? raw : null);
      // Back to halves a slice a tick, so no frame waits on it.
      const out = new Uint16Array(raw.length);
      let at = 0;
      const step = () => {
        timer = 0;
        if (over) return;
        const to = Math.min(raw.length, at + slice);
        if (!f32ToF16Exact(raw, out, at, to)) return finish(null);
        at = to;
        if (at < raw.length) timer = setTimeout(step, 0);
        else finish(validLightmap(out, W, H) ? out : null);
      };
      step();
    };
    timer = setTimeout(poll, wait);
  } catch {
    if (fbo && !gl.isContextLost()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
    }
    finish(null);
  }
  return () => {
    over = true;
    free();
  };
}
