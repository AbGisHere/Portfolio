/**
 * (0.4.50) Uniforms set only when they change. Wraps a WebGL2 context's
 * scalar and short-vector `uniform*` calls so a value a location already
 * holds isn't sent again (each program keeps its own values, and its
 * locations are its own objects, so a location's last value is exact).
 * Every caller goes through the wrapper, so nothing can go stale. Arrays
 * longer than 16 are always sent (comparing them costs what sending does).
 * Off with `?ucache=0`.
 *
 * (0.4.57) Allocation-free after a location's first value: fixed-arity
 * wrappers (no rest arguments or closures), each location's last value
 * kept in one array updated in place.
 */
const MAX = 16;

export function cacheUniforms(gl) {
  const last = new WeakMap();
  // A location's slot, sized once: floats as the GPU stores them (float32),
  // ints exactly.
  const slot = (loc, n, isFloat) => {
    let s = last.get(loc);
    if (!s || s.length !== n || s.isFloat !== isFloat) {
      s = isFloat ? new Float32Array(n) : new Int32Array(n);
      s.isFloat = isFloat;
      s.fresh = true;
      last.set(loc, s);
    }
    return s;
  };
  const scalar = (name, n, isFloat) => {
    const raw = gl[name].bind(gl);
    if (n === 1) gl[name] = (loc, a) => {
      if (loc == null) return;
      const s = slot(loc, 1, isFloat);
      const was = s[0];
      s[0] = a;
      if (!s.fresh && s[0] === was) return;
      s.fresh = false;
      raw(loc, a);
    };
    else if (n === 2) gl[name] = (loc, a, b) => {
      if (loc == null) return;
      const s = slot(loc, 2, isFloat);
      const w0 = s[0], w1 = s[1];
      s[0] = a; s[1] = b;
      if (!s.fresh && s[0] === w0 && s[1] === w1) return;
      s.fresh = false;
      raw(loc, a, b);
    };
    else if (n === 3) gl[name] = (loc, a, b, c) => {
      if (loc == null) return;
      const s = slot(loc, 3, isFloat);
      const w0 = s[0], w1 = s[1], w2 = s[2];
      s[0] = a; s[1] = b; s[2] = c;
      if (!s.fresh && s[0] === w0 && s[1] === w1 && s[2] === w2) return;
      s.fresh = false;
      raw(loc, a, b, c);
    };
    else gl[name] = (loc, a, b, c, d) => {
      if (loc == null) return;
      const s = slot(loc, 4, isFloat);
      const w0 = s[0], w1 = s[1], w2 = s[2], w3 = s[3];
      s[0] = a; s[1] = b; s[2] = c; s[3] = d;
      if (!s.fresh && s[0] === w0 && s[1] === w1 && s[2] === w2 && s[3] === w3) return;
      s.fresh = false;
      raw(loc, a, b, c, d);
    };
  };
  for (const [name, n] of [['uniform1f', 1], ['uniform2f', 2], ['uniform3f', 3], ['uniform4f', 4]]) scalar(name, n, true);
  for (const [name, n] of [['uniform1i', 1], ['uniform2i', 2], ['uniform3i', 3], ['uniform4i', 4], ['uniform1ui', 1]]) scalar(name, n, false);
  for (const name of ['uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv', 'uniform1iv', 'uniform2iv', 'uniform3iv', 'uniform4iv', 'uniformMatrix3fv', 'uniformMatrix4fv']) {
    const raw = gl[name].bind(gl);
    const matrix = name.startsWith('uniformMatrix');
    const isFloat = name.endsWith('fv');
    const send = (loc, data, extra, t, o, l) => {
      if (matrix) raw(loc, t, data, ...(extra ? [o, l].filter(x => x !== undefined) : []));
      else raw(loc, data, ...(extra ? [o, l].filter(x => x !== undefined) : []));
    };
    gl[name] = (loc, x, y, z, q) => {
      if (loc == null) return;
      // Matrices: (loc, transpose, data[, offset, length]); vectors:
      // (loc, data[, offset, length]).
      const data = matrix ? y : x;
      const extra = matrix ? z !== undefined : y !== undefined;
      if (extra || !data || data.length > MAX || (matrix && x)) {
        last.delete(loc);
        if (matrix) send(loc, data, extra, x, z, q);
        else send(loc, data, extra, false, y, z);
        return;
      }
      const n = data.length;
      const s = slot(loc, n, isFloat);
      let same = !s.fresh;
      for (let k = 0; k < n; k++) {
        const was = s[k];
        s[k] = data[k];
        if (s[k] !== was) same = false;
      }
      if (same) return;
      s.fresh = false;
      if (matrix) raw(loc, x, data);
      else raw(loc, data);
    };
  }
  return gl;
}
