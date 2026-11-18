/**
 * (0.4.50) Uniforms set only when they change. Wraps a WebGL2 context's
 * scalar and short-vector `uniform*` calls so a value a location already
 * holds isn't sent again (each program keeps its own values, and its
 * locations are its own objects, so a location's last value is exact).
 * Every caller goes through the wrapper, so nothing can go stale. Arrays
 * longer than 16 are always sent (comparing them costs what sending does).
 * Off with `?ucache=0`.
 */
const SCALAR = ['uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniform1i', 'uniform2i', 'uniform3i', 'uniform4i', 'uniform1ui'];
const VECTOR = ['uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv', 'uniform1iv', 'uniform2iv', 'uniform3iv', 'uniform4iv', 'uniformMatrix3fv', 'uniformMatrix4fv'];
const MAX = 16;

export function cacheUniforms(gl) {
  const last = new WeakMap();
  // Values compared as the GPU stores them (float32 for float uniforms).
  const f32 = new Float32Array(MAX);
  const same = (loc, n, at, isFloat) => {
    const prev = last.get(loc);
    if (prev && prev.length === n) {
      let k = 0;
      for (; k < n; k++) if (prev[k] !== (isFloat ? (f32[0] = at(k), f32[0]) : at(k))) break;
      if (k === n) return true;
    }
    const next = new Float64Array(n);
    for (let k = 0; k < n; k++) next[k] = isFloat ? (f32[0] = at(k), f32[0]) : at(k);
    last.set(loc, next);
    return false;
  };
  for (const name of SCALAR) {
    const raw = gl[name].bind(gl);
    const isFloat = name.endsWith('f');
    gl[name] = (loc, ...v) => {
      if (loc == null) return;
      if (same(loc, v.length, k => v[k], isFloat)) return;
      raw(loc, ...v);
    };
  }
  for (const name of VECTOR) {
    const raw = gl[name].bind(gl);
    const matrix = name.startsWith('uniformMatrix');
    const isFloat = name.endsWith('fv');
    gl[name] = (loc, ...args) => {
      if (loc == null) return;
      // Matrices: (loc, transpose, data); vectors: (loc, data). Extra
      // offset/length arguments are sent as given.
      const data = matrix ? args[1] : args[0];
      const extra = args.length > (matrix ? 2 : 1);
      if (extra || !data || data.length > MAX || (matrix && args[0])) {
        last.delete(loc);
        raw(loc, ...args);
        return;
      }
      if (same(loc, data.length, k => data[k], isFloat)) return;
      raw(loc, ...args);
    };
  }
  return gl;
}
