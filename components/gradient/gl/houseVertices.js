/**
 * (0.4.57) The house's vertices packed tighter, with every value the shader
 * reads unchanged to the bit. The indexed mesh (houseLights.js
 * packHouseMesh) is 9 floats a vertex: position, normal, part (its id and
 * variation), st. Only 141,939 normals, 909 parts and 20,488 st values are
 * distinct among its 536,980 vertices, so each vertex keeps its position
 * as floats and points into two tables of the rest, which the vertex
 * shader reads back exactly (texelFetch on 32-bit float textures):
 *
 *   word 0–2  position (float32 ×3)
 *   word 3    normal index (low 20 bits) | part index << 20 (12 bits)
 *   word 4    s index | t index << 16 (uint16 ×2)
 *
 * 20 bytes in place of 36. `normals` is three floats an entry (RGB32F);
 * `scalars` holds the parts at [0, PART_SLOTS) and the st values from
 * PART_SLOTS on (R32F), both TABLE_WIDTH texels a row. Words past the
 * ninth (the curtains' other shape) are kept as they are, after these.
 *
 * The positions stay floats: quantised to 16 bits they'd lose the
 * coplanar overlaps' order and crack where runs meet.
 */

export const PACKED_WORDS = 5;
export const PACKED_BYTES = PACKED_WORDS * 4;
export const TABLE_WIDTH = 1024;
const NORMAL_BITS = 20;
const NORMAL_MAX = 1 << NORMAL_BITS;
export const PART_SLOTS = 1 << (32 - NORMAL_BITS);
const ST_MAX = 1 << 16;
/** The packed words' attribute locations (past the leaves' 6–13). */
export const ATTRIB_NP = 14;
export const ATTRIB_ST = 15;
/** Their tables' texture units (16 is the lights', 17 the lightmap's). */
export const NORMAL_UNIT = 18;
export const SCALAR_UNIT = 19;

// An open-addressed dictionary of `width`-word keys, numbered as first seen.
function dictionary(width, max, what) {
  let table = new Int32Array(1 << 12).fill(-1);
  let keys = new Uint32Array(width * 256);
  let n = 0;
  const hash = (src, at) => {
    let h = 2166136261;
    for (let w = 0; w < width; w++) h = Math.imul(h ^ src[at + w], 16777619);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  };
  const place = (src, at, id) => {
    const mask = table.length - 1;
    let slot = hash(src, at) & mask;
    while (table[slot] >= 0) slot = (slot + 1) & mask;
    table[slot] = id;
  };
  return {
    get size() { return n; },
    keys: () => keys.subarray(0, n * width),
    id(src, at) {
      const mask = table.length - 1;
      let slot = hash(src, at) & mask;
      for (;;) {
        const id = table[slot];
        if (id < 0) break;
        let w = 0;
        while (w < width && keys[id * width + w] === src[at + w]) w++;
        if (w === width) return id;
        slot = (slot + 1) & mask;
      }
      if (n === max) throw new RangeError(`houseVertices: more than ${max} distinct ${what}`);
      if ((n + 1) * width > keys.length) {
        const grown = new Uint32Array(keys.length * 2);
        grown.set(keys);
        keys = grown;
      }
      for (let w = 0; w < width; w++) keys[n * width + w] = src[at + w];
      table[slot] = n;
      if ((++n) * 4 > table.length * 3) {
        table = new Int32Array(table.length * 2).fill(-1);
        for (let i = 0; i < n; i++) place(keys, i * width, i);
      }
      return n - 1;
    },
  };
}

/** A set of tables meshes are packed against (shared, so one set binds). */
export function vertexTables() {
  return {
    normals: dictionary(3, NORMAL_MAX, 'normals'),
    parts: dictionary(1, PART_SLOTS, 'parts'),
    st: dictionary(1, ST_MAX, 'st values'),
  };
}

/**
 * The indexed float vertices (`stride` floats each, the first nine the
 * house's) as packed words, against `tables`.
 */
export function packVertices(vertices, stride, tables) {
  const src = new Uint32Array(vertices.buffer, vertices.byteOffset, vertices.length);
  const n = Math.floor(vertices.length / stride);
  const extra = stride - 9;
  const out = new Uint32Array(n * (PACKED_WORDS + extra));
  const step = PACKED_WORDS + extra;
  for (let i = 0; i < n; i++) {
    const s = i * stride;
    const o = i * step;
    out[o] = src[s];
    out[o + 1] = src[s + 1];
    out[o + 2] = src[s + 2];
    out[o + 3] = (tables.normals.id(src, s + 3) | (tables.parts.id(src, s + 6) << NORMAL_BITS)) >>> 0;
    out[o + 4] = (tables.st.id(src, s + 7) | (tables.st.id(src, s + 8) << 16)) >>> 0;
    for (let w = 0; w < extra; w++) out[o + PACKED_WORDS + w] = src[s + 9 + w];
  }
  return out;
}

/** The tables as the GPU's arrays: `{ normals, scalars }` (Float32Array). */
export function tableData(tables) {
  const normals = new Float32Array(tables.normals.keys().slice().buffer);
  const scalars = new Float32Array(PART_SLOTS + tables.st.size);
  scalars.set(new Float32Array(tables.parts.keys().slice().buffer));
  scalars.set(new Float32Array(tables.st.keys().slice().buffer), PART_SLOTS);
  return { normals, scalars };
}

/** Packed words back to the float vertices, bit for bit (the tests). */
export function unpackVertices(words, stride, { normals, scalars }) {
  const step = PACKED_WORDS + stride - 9;
  const n = words.length / step;
  const out = new Float32Array(n * stride);
  const bits = new Uint32Array(out.buffer);
  const nb = new Uint32Array(normals.buffer, normals.byteOffset, normals.length);
  const sb = new Uint32Array(scalars.buffer, scalars.byteOffset, scalars.length);
  for (let i = 0; i < n; i++) {
    const o = i * step;
    const d = i * stride;
    bits[d] = words[o];
    bits[d + 1] = words[o + 1];
    bits[d + 2] = words[o + 2];
    const ni = words[o + 3] & (NORMAL_MAX - 1);
    bits[d + 3] = nb[ni * 3];
    bits[d + 4] = nb[ni * 3 + 1];
    bits[d + 5] = nb[ni * 3 + 2];
    bits[d + 6] = sb[words[o + 3] >>> NORMAL_BITS];
    bits[d + 7] = sb[PART_SLOTS + (words[o + 4] & 0xffff)];
    bits[d + 8] = sb[PART_SLOTS + (words[o + 4] >>> 16)];
    for (let w = 9; w < stride; w++) bits[d + w] = words[o + PACKED_WORDS + w - 9];
  }
  return out;
}

/** A table as a texture's data: whole rows of TABLE_WIDTH texels. */
export function tableTexels(data, channels) {
  const height = Math.max(1, Math.ceil(data.length / channels / TABLE_WIDTH));
  const out = new Float32Array(TABLE_WIDTH * height * channels);
  out.set(data);
  return { width: TABLE_WIDTH, height, data: out };
}

/**
 * The packed attributes and their tables, for every vertex shader that
 * reads the house's VAO. The samplers are highp: a vertex shader's default
 * is lowp, which may round what they return.
 */
export const HOUSE_VERTEX_GLSL = `
layout(location = ${ATTRIB_NP}) in uint aNP;     // (0.4.57) normal | part << ${NORMAL_BITS} (houseVertices.js)
layout(location = ${ATTRIB_ST}) in uvec2 aSTi;   // s, t
uniform highp sampler2D uVNormals;
uniform highp sampler2D uVScalars;
ivec2 hvTexel(uint i) { return ivec2(int(i & ${TABLE_WIDTH - 1}u), int(i >> ${Math.log2(TABLE_WIDTH)}u)); }
vec3 hvNormal() { return texelFetch(uVNormals, hvTexel(aNP & ${NORMAL_MAX - 1}u), 0).xyz; }
float hvPart() { return texelFetch(uVScalars, hvTexel(aNP >> ${NORMAL_BITS}u), 0).x; }
vec2 hvST() {
  return vec2(texelFetch(uVScalars, hvTexel(${PART_SLOTS}u + (aSTi.x)), 0).x, texelFetch(uVScalars, hvTexel(${PART_SLOTS}u + aSTi.y), 0).x);
}
`;

/**
 * Points a bound VAO's attributes at a packed buffer (bound to
 * ARRAY_BUFFER): position at 0, the packed words at 14 and 15, and any
 * extra float triples (the curtains' other shape) at 4, 5, ….
 */
export function pointPacked(gl, extra = 0) {
  const stride = (PACKED_WORDS + extra) * 4;
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(ATTRIB_NP);
  gl.vertexAttribIPointer(ATTRIB_NP, 1, gl.UNSIGNED_INT, stride, 12);
  gl.enableVertexAttribArray(ATTRIB_ST);
  gl.vertexAttribIPointer(ATTRIB_ST, 2, gl.UNSIGNED_SHORT, stride, 16);
  for (let k = 0; k < extra / 3; k++) {
    gl.enableVertexAttribArray(4 + k);
    gl.vertexAttribPointer(4 + k, 3, gl.FLOAT, false, stride, PACKED_BYTES + k * 12);
  }
}

/**
 * The tables' two textures on their units, made or refilled. A VAO that
 * leaves 14 and 15 off (the leaves') must still give the shader unsigned
 * values there, so their constants are set unsigned too.
 */
export function uploadTables(gl, data, texs = null) {
  const t = texs ?? { normals: gl.createTexture(), scalars: gl.createTexture() };
  const put = (unit, tex, table, channels, internal, format) => {
    const { width, height, data: px } = tableTexels(table, channels);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, gl.FLOAT, px);
  };
  put(NORMAL_UNIT, t.normals, data.normals, 3, gl.RGB32F, gl.RGB);
  put(SCALAR_UNIT, t.scalars, data.scalars, 1, gl.R32F, gl.RED);
  gl.activeTexture(gl.TEXTURE0);
  gl.vertexAttribI4ui(ATTRIB_NP, 0, 0, 0, 0);
  gl.vertexAttribI4ui(ATTRIB_ST, 0, 0, 0, 0);
  return t;
}

/** Binds a set of tables' textures to their units. */
export function bindTables(gl, t) {
  gl.activeTexture(gl.TEXTURE0 + NORMAL_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, t.normals);
  gl.activeTexture(gl.TEXTURE0 + SCALAR_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, t.scalars);
  gl.activeTexture(gl.TEXTURE0);
}

/** A program's samplers for the tables (kept by the program), set once;
 * the program in use is left as it was. */
export function tableSamplers(gl, prog) {
  const was = gl.getParameter(gl.CURRENT_PROGRAM);
  gl.useProgram(prog);
  gl.uniform1i(gl.getUniformLocation(prog, 'uVNormals'), NORMAL_UNIT);
  gl.uniform1i(gl.getUniformLocation(prog, 'uVScalars'), SCALAR_UNIT);
  gl.useProgram(was);
}
