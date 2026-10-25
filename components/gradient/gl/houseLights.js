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

import { ZONES } from './houseShape';
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
