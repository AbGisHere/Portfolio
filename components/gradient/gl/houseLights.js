/**
 * (0.4.28) The house's lights as the shader and the mesh take them: the
 * lighting brief's (houseLightPlan.js), sorted by room.
 *
 * - **A light** `{ p, r, k, kind, zone, tone, day, night, cat, dir, cone,
 *   mesh }`: where it is, how far it reaches (m), its strength; its kind
 *   (0 a lamp, 1 a downlight outside, 3 one recessed in a ceiling, 4 an
 *   uplight, 5 a narrow spot down, 6 an aimed spot, along `dir` within the
 *   cone whose cosine is `cone`, 7 moonlight, a wide cone down from a tree,
 *   dappled by its leaves); its room (ZONES; 0 outside) and colour; how
 *   much of it is on by day and by night (fractions of k); when it comes on
 *   in the switch to night (`cat`: 0 first, the coves and lamps; 1 the
 *   accents; 2 last, the facade and the garden); the fitting the mesh draws
 *   for it, if it's not part of something else's; `glow`, how bright its
 *   fitting glows (by default as its strength).
 * - **A strip** `{ a, b, d, r, k, zone, tone, day, night, cat, fall,
 *   spread, fill, glow, mesh }`: a line of light from a to b shining along
 *   d (it lights nothing behind its face), falling off over r by `fall`,
 *   spreading to `spread` (the cosine off d where it fades out); `fill`,
 *   how much of it is bounced round its whole room (a cove's is most of
 *   it).
 *
 * Both lists are sorted by room, with each room's range (`LIGHT_RANGE`,
 * `STRIP_RANGE`), so a pixel only weighs its own room's (outside, its own
 * and those seen through the front glass).
 */

import { HOUSE_PART, ZONES } from './houseShape';
import { lightPlan } from './houseLightPlan';

const look = lightPlan();
const byZone = list => list.map((x, i) => [x, i]).sort((a, b) => a[0].zone - b[0].zone || a[1] - b[1]).map(([x]) => x);
const ranges = list => {
  const r = [];
  for (let z = 0; z <= ZONES.length; z++) {
    const lo = list.findIndex(x => x.zone >= z);
    const hi = list.findIndex(x => x.zone > z);
    const a = lo < 0 ? list.length : lo;
    r.push([a, hi < 0 ? list.length : Math.max(a, hi)]);
  }
  return r;
};

/** Every light, sorted by room. */
export const LIGHTS = byZone(look.lights);
/** Every strip, sorted by room. */
export const STRIPS = byZone(look.strips);
/** Each room's [first, past the last] in LIGHTS and STRIPS (rooms 0 … 8). */
export const LIGHT_RANGE = ranges(LIGHTS);
export const STRIP_RANGE = ranges(STRIPS);
/** The rooms' boxes, as the shader finds a point's room: the first that
 * holds it (more than one box can make a room). */
export const ZONE_BOXES = look.zones;
/** A fitting's colour and its share on by day, where no light is near it. */
export const ROOM_GLOW_TONE = look.roomTone;
export const ROOM_GLOW_DAY = look.roomDay;

/** (0.4.36) Constant ambient room fills per zone (rooms 0 … 8): day and night cats 0, 1, 2. */
export const ROOM_CONSTANT_FILLS = LIGHT_RANGE.map((_, z) => {
  const [l0, l1] = LIGHT_RANGE[z];
  const [s0, s1] = STRIP_RANGE[z];
  const day = [0, 0, 0];
  const cats = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = l0; i < l1; i++) {
    const l = LIGHTS[i];
    if (l.k <= 0 || l.zone === 0) continue;
    const factor = l.k * 0.04;
    for (let c = 0; c < 3; c++) {
      day[c] += l.tone[c] * factor * (l.day ?? 0);
      cats[l.cat ?? 0][c] += l.tone[c] * factor * (l.night ?? 0);
    }
  }
  for (let i = s0; i < s1; i++) {
    const s = STRIPS[i];
    const sf = s.fill ?? 0;
    if (s.k <= 0 || sf <= 0) continue;
    const factor = s.k * sf;
    for (let c = 0; c < 3; c++) {
      day[c] += s.tone[c] * factor * (s.day ?? 0);
      cats[s.cat ?? 0][c] += s.tone[c] * factor * (s.night ?? 0);
    }
  }
  return { day, cats };
});

/** (0.4.36, 0.4.37) Tag each lamp triangle in data with the matching fitting index in aST.x.
 * Computed once at each triangle's centroid and written to all three vertices so
 * no triangle mixes tags across its vertices.
 * If lamp i, tag = i; if strip si, tag = 1000 + si; if none, tag = -1. */
export function tagLampFittings(data) {
  const grid = new Map();
  const key = (gx, gy, gz) => `${gx},${gy},${gz}`;
  const add = (gx, gy, gz, item) => {
    const k = key(gx, gy, gz);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(item);
  };

  LIGHTS.forEach((l, i) => {
    const [x, y, z] = l.p;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          add(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz), { type: 'light', idx: i, p: l.p });
        }
      }
    }
  });

  STRIPS.forEach((s, i) => {
    const minX = Math.floor(Math.min(s.a[0], s.b[0]) - 0.2);
    const maxX = Math.floor(Math.max(s.a[0], s.b[0]) + 0.2);
    const minY = Math.floor(Math.min(s.a[1], s.b[1]) - 0.2);
    const maxY = Math.floor(Math.max(s.a[1], s.b[1]) + 0.2);
    const minZ = Math.floor(Math.min(s.a[2], s.b[2]) - 0.2);
    const maxZ = Math.floor(Math.max(s.a[2], s.b[2]) + 0.2);
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        for (let gz = minZ; gz <= maxZ; gz++) {
          add(gx, gy, gz, { type: 'strip', idx: i, a: s.a, b: s.b });
        }
      }
    }
  });

  // A fitting's distance from p (a light's, or a strip's nearest point).
  const distance = (item, x, y, z) => {
    if (item.type === 'light') return Math.hypot(item.p[0] - x, item.p[1] - y, item.p[2] - z);
    const ax = item.a[0], ay = item.a[1], az = item.a[2];
    const abx = item.b[0] - ax, aby = item.b[1] - ay, abz = item.b[2] - az;
    const ab2 = abx * abx + aby * aby + abz * abz;
    const t = Math.max(0, Math.min(1, ((x - ax) * abx + (y - ay) * aby + (z - az) * abz) / ab2));
    return Math.hypot(ax + abx * t - x, ay + aby * t - y, az + abz * t - z);
  };
  const tagOf = item => (item.type === 'light' ? item.idx : 1000 + item.idx);
  // How near a fitting must be to count: a light within a metre, a strip 8 cm.
  const reachOf = item => (item.type === 'light' ? 1.0 : 0.08);
  // The fitting nearest p, by the shader's rule: lights first, then a strip
  // only if nearer still and within its reach; else none (-1).
  const nearestAt = (x, y, z) => {
    const items = grid.get(key(Math.floor(x), Math.floor(y), Math.floor(z)));
    let best = 1.0;
    let match = -1;
    if (items) {
      for (const item of items) {
        if (item.type !== 'light') continue;
        const d = distance(item, x, y, z);
        if (d < best) {
          best = d;
          match = item.idx;
        }
      }
      for (const item of items) {
        if (item.type === 'light') continue;
        const d = distance(item, x, y, z);
        if (d < Math.min(best, 0.08)) {
          best = d;
          match = 1000 + item.idx;
        }
      }
    }
    return match;
  };
  // Whether the nearest fitting can't change across a triangle within R of
  // its centre c: every distance moves by at most R over it, so a winner
  // more than 2R ahead of the rest, and further than R inside its reach,
  // wins everywhere (and with no winner, none comes within reach).
  // Every fitting any point of the triangle could find: those listed in each
  // cell its bounds touch (each point's own cell is one of them).
  const candidates = i => {
    const lo = [0, 1, 2].map(k => Math.floor(Math.min(data[i + k], data[i + 9 + k], data[i + 18 + k])));
    const hi = [0, 1, 2].map(k => Math.floor(Math.max(data[i + k], data[i + 9 + k], data[i + 18 + k])));
    const found = new Set();
    for (let gx = lo[0]; gx <= hi[0]; gx++) {
      for (let gy = lo[1]; gy <= hi[1]; gy++) {
        for (let gz = lo[2]; gz <= hi[2]; gz++) {
          for (const item of grid.get(key(gx, gy, gz)) ?? []) found.add(item);
        }
      }
    }
    return found;
  };
  const stable = (items, cx, cy, cz, R, match) => {
    let win = Infinity;
    for (const item of items) {
      if (tagOf(item) !== match) continue;
      win = distance(item, cx, cy, cz);
      if (win + R >= reachOf(item)) return false;
    }
    for (const item of items) {
      if (tagOf(item) === match) continue;
      const d = distance(item, cx, cy, cz);
      if (d - R < reachOf(item) && d - R <= win + R) return false;
    }
    return true;
  };

  // (0.4.39) One fitting per triangle where every point of it has the same
  // nearest one; where that changes inside a triangle (705 of 22,964, the
  // stair's tread strips mostly), FITTING_PER_PIXEL, and the shader finds it
  // per pixel as 0.4.35 did everywhere.
  const N = FITTING_SAMPLES;
  const lampPart = HOUSE_PART.lamp;
  for (let i = 0; i < data.length; i += 27) {
    if (Math.floor(data[i + 6] + 0.001) === lampPart) {
      const at = (u, v) => {
        const w = 1 - u - v;
        return nearestAt(
          data[i] * u + data[i + 9] * v + data[i + 18] * w,
          data[i + 1] * u + data[i + 10] * v + data[i + 19] * w,
          data[i + 2] * u + data[i + 11] * v + data[i + 20] * w,
        );
      };
      let match = at(1 / 3, 1 / 3);
      const cx = (data[i] + data[i + 9] + data[i + 18]) / 3;
      const cy = (data[i + 1] + data[i + 10] + data[i + 19]) / 3;
      const cz = (data[i + 2] + data[i + 11] + data[i + 20]) / 3;
      const R = Math.max(...[0, 9, 18].map(o => Math.hypot(data[i + o] - cx, data[i + o + 1] - cy, data[i + o + 2] - cz)));
      const sure = stable(candidates(i), cx, cy, cz, R, match);
      for (let a = 0; a <= N && !sure && match !== FITTING_PER_PIXEL; a++) {
        for (let b = 0; a + b <= N; b++) {
          if (at(a / N, b / N) !== match) {
            match = FITTING_PER_PIXEL;
            break;
          }
        }
      }
      data[i + 7] = match;
      data[i + 16] = match;
      data[i + 25] = match;
    }
  }
}

/** The tag of a lamp triangle whose nearest fitting changes inside it. */
export const FITTING_PER_PIXEL = -2;
// Barycentric steps per side of the grid each lamp triangle is tested on.
const FITTING_SAMPLES = 12;

export const HOUSE_STRIDE = 9;
export const CURTAIN_STRIDE = 15;
export const HOUSE_BYTES = HOUSE_STRIDE * 4;
export const CURTAIN_BYTES = CURTAIN_STRIDE * 4;

/** Room index (1..8) of point (x, y, z) matching houseShader.js roomOf(), or 0 outside. */
export function roomOfPoint(x, y, z) {
  for (let i = 0; i < ZONE_BOXES.length; i++) {
    const { lo, hi, id } = ZONE_BOXES[i];
    if (x >= lo[0] - 0.03 && x <= hi[0] + 0.03 && y >= lo[1] - 0.03 && y <= hi[1] + 0.03 && z >= lo[2] - 0.03 && z <= hi[2] + 0.03) {
      return id;
    }
  }
  return 0;
}

/**
 * Share only vertices whose complete Float32 representations are identical.
 * The index stream follows the original vertex stream exactly, preserving
 * triangle order, winding, material boundaries, signed zero and NaN payloads.
 * Hash entries point into the source data while indexing, avoiding a second
 * full-size staging VBO. Both the source-index list and hash table grow with
 * actual unique vertices; the table always retains empty slots for probing.
 */
function indexMesh(data, count, stride, uniqueParts = []) {
  if (!(data instanceof Float32Array) || !Number.isSafeInteger(count) || count < 0 || count > data.length / stride) {
    throw new RangeError('Invalid Float32 mesh data or vertex count');
  }
  const words = new Uint32Array(data.buffer, data.byteOffset, count * stride);
  const indices = new Uint32Array(count);
  let sources = new Uint32Array(Math.min(count, 1024));
  let table = new Uint32Array(1024);
  let uniqueCount = 0;
  let hashedCount = 0;
  const unshared = new Set(uniqueParts);
  const preserveVertex = source => unshared.size > 0 && unshared.has(Math.floor(data[source * stride + 6] + 0.001));
  const appendSource = source => {
    if (uniqueCount === sources.length) {
      const grown = new Uint32Array(Math.min(count, Math.max(1024, sources.length * 2)));
      grown.set(sources);
      sources = grown;
    }
    sources[uniqueCount] = source;
    return uniqueCount++;
  };

  const hash = source => {
    const off = source * stride;
    let h = 2166136261;
    for (let w = 0; w < stride; w++) h = Math.imul(h ^ words[off + w], 16777619);
    // Float words often share zero low bits (integer coordinates in grids).
    // Avalanche the full word before masking into a power-of-two table.
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  };
  const growTable = () => {
    table = new Uint32Array(table.length * 2);
    const mask = table.length - 1;
    for (let u = 0; u < uniqueCount; u++) {
      if (preserveVertex(sources[u])) continue;
      let slot = hash(sources[u]) & mask;
      while (table[slot]) slot = (slot + 1) & mask;
      table[slot] = u + 1;
    }
  };

  for (let i = 0; i < count; i++) {
    // Selected material IDs retain a distinct vertex for every occurrence.
    // This changes storage reuse only; every attribute and index stays ordered.
    if (preserveVertex(i)) {
      indices[i] = appendSource(i);
      continue;
    }
    // Grow before probing: even an all-unique mesh cannot fill the table.
    if ((hashedCount + 1) * 4 > table.length * 3) growTable();
    const mask = table.length - 1;
    let slot = hash(i) & mask;
    while (table[slot]) {
      const candidate = table[slot] - 1;
      const off = sources[candidate] * stride;
      const input = i * stride;
      let w = 0;
      while (w < stride && words[off + w] === words[input + w]) w++;
      if (w === stride) break;
      slot = (slot + 1) & mask;
    }
    if (!table[slot]) {
      table[slot] = appendSource(i) + 1;
      hashedCount++;
    }
    indices[i] = table[slot] - 1;
  }

  const vertices = new Float32Array(uniqueCount * stride);
  const packedWords = new Uint32Array(vertices.buffer);
  for (let u = 0; u < uniqueCount; u++) {
    const source = sources[u] * stride;
    const target = u * stride;
    for (let w = 0; w < stride; w++) packedWords[target + w] = words[source + w];
  }
  return { vertices, indices, vertexCount: uniqueCount };
}

/**
 * (0.4.37) Lossless indexed house mesh. Keep the original lawn prefix and
 * complete solid suffix, in their original triangle order. No room buckets,
 * size-based detail split or reflection visibility exclusions are introduced.
 * `uniqueParts` optionally disables vertex sharing for selected material IDs;
 * it preserves the same full index stream and Float32 attributes.
 */
export function packHouseMesh(raw, { uniqueParts = [] } = {}) {
  const { data, count, lawn, glass, mirrors } = raw;
  if (!Number.isSafeInteger(lawn) || lawn < 0 || lawn > count || lawn % 3 || count % 3) {
    throw new RangeError('House ranges must contain complete triangles');
  }
  const packed = indexMesh(data, count, HOUSE_STRIDE, uniqueParts);
  const chunk = (name, start, end) => {
    if (start === end) return null;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++) {
      const off = i * HOUSE_STRIDE;
      for (let axis = 0; axis < 3; axis++) {
        lo[axis] = Math.min(lo[axis], data[off + axis]);
        hi[axis] = Math.max(hi[axis], data[off + axis]);
      }
    }
    return { name, room: 0, mirrorSkip: false, lo, hi, offset: start * 4, count: end - start };
  };
  const solid = chunk('solid', lawn, count);
  return { ...packed, indexCount: count, lawnChunk: chunk('lawn', 0, lawn), chunks: solid ? [solid] : [], glass, mirrors };
}

/** All 15 curtain attributes, including both morph poses, stay bit-exact. */
export function packCurtainMesh(raw) {
  const { data, count } = raw;
  if (count % 3) throw new RangeError('Curtain mesh must contain complete triangles');
  return { ...indexMesh(data, count, CURTAIN_STRIDE), count };
}
