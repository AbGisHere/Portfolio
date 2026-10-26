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

/** (0.4.36) Tag each lamp vertex in data with the matching fitting index in aST.x.
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

  const lampPart = HOUSE_PART.lamp;
  for (let i = 0; i < data.length; i += 9) {
    if (Math.floor(data[i + 6] + 0.001) === lampPart) {
      const x = data[i], y = data[i + 1], z = data[i + 2];
      const items = grid.get(key(Math.floor(x), Math.floor(y), Math.floor(z)));
      let best = 1.0;
      let match = -1;
      if (items) {
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (item.type === 'light') {
            const d = Math.hypot(item.p[0] - x, item.p[1] - y, item.p[2] - z);
            if (d < best) {
              best = d;
              match = item.idx;
            }
          } else {
            const ax = item.a[0], ay = item.a[1], az = item.a[2];
            const bx = item.b[0], by = item.b[1], bz = item.b[2];
            const abx = bx - ax, aby = by - ay, abz = bz - az;
            const ab2 = abx * abx + aby * aby + abz * abz;
            const t = Math.max(0, Math.min(1, ((x - ax) * abx + (y - ay) * aby + (z - az) * abz) / ab2));
            const cx = ax + abx * t, cy = ay + aby * t, cz = az + abz * t;
            const d = Math.hypot(cx - x, cy - y, cz - z);
            if (d < Math.min(best, 0.08)) {
              best = d;
              match = 1000 + item.idx;
            }
          }
        }
      }
      data[i + 7] = match;
    }
  }
}
