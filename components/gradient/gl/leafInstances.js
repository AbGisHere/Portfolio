/**
 * (0.4.48) The house's leaves as instances, as the meadow's trees are
 * drawn: each leaf one shape's template (plantMesh.js `leaf`: its outline
 * and how finely it's cut) and a few numbers of its own, so the house's
 * mesh no longer holds ~15 MB of them vertex by vertex.
 *
 * A leaf from `p` along `dir`, its face toward `up`, is, in its own frame
 * (dir, side, face), at grid point (u, w), v = 2w − 1:
 *
 *   len·(u, 0, 0) + wid·(0, ½·shape(u)·v, 0) + wid·cup·(0, 0, ½·shape(u)·v²)
 *   − len·droop·(0, 0, u²)
 *
 * which is linear in (len, wid, wid·cup, len·droop). So each template
 * vertex holds the four basis vectors, and its neighbours' differences
 * along u and along w (from which meshKit.js `grid` takes the normal),
 * and the vertex shader (houseShader.js HOUSE_LEAF_VERTEX) sums them with
 * the instance's coefficients, turned into the world: the same leaf as
 * before, to float rounding.
 */

/** Template vertex: u, v, h (½ the outline at u), then its grid
 * neighbours' along u (uA, uB, hA, hB) and across (vC, vD): meshKit.js
 * `grid` takes the normal from them. */
export const LEAF_TEMPLATE_STRIDE = 9;
/** Instance: p, dir, side (3 each), len, wid, cup, droop, part (with its variant). */
export const LEAF_INSTANCE_STRIDE = 3 * 3 + 5;

// The outlines (plantMesh.js), by name, so a template is keyed by it.
export const LEAF_SHAPES = {
  lance: u => Math.pow(Math.sin(Math.PI * u), 0.9) * (1 - 0.25 * u),
  fiddle: u => {
    const a = Math.sin(Math.PI * Math.pow(u, 0.75));
    return Math.max(0.05, a * (0.75 + 0.35 * u) * (1 - 0.18 * Math.exp(-((u - 0.35) ** 2) / 0.01)));
  },
  oval: u => Math.sin(Math.PI * u),
};

/**
 * One template: the grid `nu` × `nv` of shape `name`, as meshKit.js `grid`
 * cuts it (each quad's two triangles in its order), indexed. Returns
 * { data: Float32Array (LEAF_TEMPLATE_STRIDE a vertex), indices }.
 */
export function leafTemplate(name, nu, nv) {
  const shape = LEAF_SHAPES[name];
  const h = i => 0.5 * shape(i / nu);
  const verts = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const a = Math.min(nu, i + 1);
      const b = Math.max(0, i - 1);
      verts.push(i / nu, (j / nv) * 2 - 1, h(i), a / nu, b / nu, h(a), h(b), (Math.min(nv, j + 1) / nv) * 2 - 1, (Math.max(0, j - 1) / nv) * 2 - 1);
    }
  }
  const id = (i, j) => j * (nu + 1) + i;
  const indices = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) indices.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1));
  }
  return { data: new Float32Array(verts), indices: new Uint16Array(indices) };
}

/**
 * The templates every leaf uses: [name, nu, nv] each, in a fixed order
 * (a leaf names its template by index). plantMesh.js `leaf` cuts a small
 * leaf (under 8 cm) 3 × 2, others 6 × 4.
 */
export const LEAF_TEMPLATES = ['lance', 'fiddle', 'oval'].flatMap(name => [[name, 6, 4], [name, 3, 2]]);
export const templateOf = (name, small) => LEAF_TEMPLATES.findIndex(([n, nu]) => n === name && nu === (small ? 3 : 6));

/** Leaves per culling run (by template, in the order they were made). */
export const LEAF_RUN = 256;

/**
 * Collects leaves as instances: `add(template, p, dir, side, len, wid,
 * cup, droop, part)`; `pack()` gives, per template, its instances and
 * runs ({ first, count, box }: instances, not indices) for culling with
 * houseLights.js `houseRanges`.
 */
export function leafSink() {
  const lists = LEAF_TEMPLATES.map(() => []);
  return {
    add(t, p, dir, side, len, wid, cup, droop, part) {
      // Its bounds: all of it within this of `p`.
      const r = len * (1 + Math.abs(droop)) + 0.6 * wid * (1 + Math.abs(cup));
      lists[t].push({ v: [...p, ...dir, ...side, len, wid, cup, droop, part], lo: p.map(x => x - r), hi: p.map(x => x + r) });
    },
    pack() {
      return lists.map((list, t) => {
        const data = new Float32Array(list.length * LEAF_INSTANCE_STRIDE);
        list.forEach((l, i) => data.set(l.v, i * LEAF_INSTANCE_STRIDE));
        const n = Math.ceil(list.length / LEAF_RUN);
        const first = new Uint32Array(n);
        const count = new Uint32Array(n);
        const box = new Float32Array(n * 6);
        for (let r = 0; r < n; r++) {
          const a = r * LEAF_RUN;
          const b = Math.min(list.length, a + LEAF_RUN);
          first[r] = a;
          count[r] = b - a;
          const o = r * 6;
          box.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], o);
          for (let i = a; i < b; i++) {
            for (let k = 0; k < 3; k++) {
              box[o + k] = Math.min(box[o + k], list[i].lo[k]);
              box[o + 3 + k] = Math.max(box[o + 3 + k], list[i].hi[k]);
            }
          }
        }
        return { template: t, count: list.length, data, runs: { first, count, box } };
      }).filter(l => l.count > 0);
    },
  };
}

/**
 * The leaf path of houseShader.js HOUSE_VERTEX and houseShadow.js
 * SHADOW_VERTEX (uLeaf on, a template and an instance bound): the vertex
 * plantMesh.js `leaf` made, and meshKit.js `grid`'s normal for it.
 */
export const LEAF_GLSL = `
layout(location = 6) in vec3 aLeafP;
layout(location = 7) in vec3 aLeafDir;
layout(location = 8) in vec3 aLeafSide;
layout(location = 9) in vec4 aLeafShape;   // len, wid, cup, droop
layout(location = 10) in float aLeafPart;
layout(location = 11) in vec3 aLeafAt;     // u, v, h
layout(location = 12) in vec4 aLeafU;      // uA, uB, hA, hB
layout(location = 13) in vec2 aLeafV;      // vC, vD
uniform float uLeaf;
vec3 leafFace() { return normalize(cross(aLeafSide, aLeafDir)); }
vec3 leafPos(vec3 face) {
  float u = aLeafAt.x, v = aLeafAt.y;
  float len = aLeafShape.x, half_ = aLeafShape.y * aLeafAt.z;
  vec3 q = aLeafP + aLeafDir * (len * u);
  q += aLeafSide * (half_ * v);
  return q + face * (aLeafShape.z * half_ * v * v - aLeafShape.w * len * u * u);
}
vec3 leafNorm(vec3 face) {
  float u = aLeafAt.x, v = aLeafAt.y, h = aLeafAt.z;
  float len = aLeafShape.x, wid = aLeafShape.y, cup = aLeafShape.z, droop = aLeafShape.w;
  // Its neighbours' differences, in its own frame (dir, side, face).
  float dh = aLeafU.z - aLeafU.w;
  vec3 du = vec3(len * (aLeafU.x - aLeafU.y), wid * dh * v, cup * wid * dh * v * v - droop * len * (aLeafU.x * aLeafU.x - aLeafU.y * aLeafU.y));
  float hw = wid * h;
  vec3 dw = vec3(0.0, hw * (aLeafV.x - aLeafV.y), cup * hw * (aLeafV.x * aLeafV.x - aLeafV.y * aLeafV.y));
  mat3 frame = mat3(aLeafDir, aLeafSide, face);
  vec3 raw = cross(frame * dw, frame * du);
  vec3 N = length(raw) > 1e-14 ? normalize(raw) : face;
  return dot(N, face) < 0.0 ? -N : N;
}
`;
