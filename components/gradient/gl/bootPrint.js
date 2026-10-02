/**
 * (0.3.2) The boot that walks the meadow: a lugged hiking sole, drawn fresh
 * on every page load (ROADMAP.md, "0.3 — the desk"). One boot per load,
 * left and right a mirrored pair: its length and widths, the forefoot's lug
 * rows (straight bars or a chevron, one or two columns a side, staggered or
 * not), the toe cap, the arch's gap, the heel's solid back and its lugs,
 * and how deep and speckled it presses.
 *
 * `bootOf` picks the numbers (pure, seeded); BOOT_GLSL is the sole as shape
 * distances, shared by the grass (the outline its blades lie flat inside,
 * grassShader.js) and the ground (the tread pressed into it, mistShader.js).
 *
 * The sole's frame: metres, x across (+x the little toe's side of a right
 * boot; a left boot reads it mirrored), y along from the heel's back (0) to
 * the toe (L).
 */

/** Floats in the boot's uniform (`uBoot`, vec4 × 4). */
export const BOOT_FLOATS = 16;

/** Mulberry32: a small seeded generator, for `?boot=<n>` stills. */
export function seeded(n) {
  let a = Math.imul(n >>> 0, 0x9e3779b1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One boot, from a random source in [0, 1). */
export function bootOf(rand = Math.random) {
  const r = (a, b) => a + (b - a) * rand();
  const L = r(0.27, 0.31);
  const rows = 3 + Math.floor(rand() * 3);
  // A quarter of boots have straight bars; the rest a chevron, some steep.
  const chev = rand() < 0.25 ? 0 : r(0.25, 0.75);
  const split = rand() < 0.7 ? r(0.42, 0.6) : 0;
  return Float32Array.from([
    // The outline: length, heel and ball half-widths, the ball's lean toward the big toe.
    L, r(0.034, 0.042), r(0.047, 0.056), r(0.004, 0.01),
    // The forefoot: rows, chevron slope, how much of a row is lug, the column split (0: one column).
    rows, chev, r(0.5, 0.68), split,
    // The heel: lug rows, its solid back (share of the heel), speckle, depth.
    2 + Math.floor(rand() * 2), r(0.28, 0.45), r(0.3, 0.8), r(0.75, 1),
    // The toe cap's depth (m), the arch's gap (share of L), the centre groove (m), stagger (0 or ½ row).
    r(0.02, 0.034), r(0.05, 0.09), r(0.004, 0.009), rand() < 0.5 ? 0 : 0.5,
  ]);
}

export const BOOT_GLSL = `
uniform vec4 uBoot[4];

// The sole's outline, signed metres (negative inside): a heel and a ball
// joined as one uneven capsule, the ball leaning toward the big toe, pinched
// at the arch.
float bootOutline(vec2 p) {
  float L = uBoot[0].x;
  float rh = uBoot[0].y;
  float rb = uBoot[0].z;
  float h = L - rh - rb;
  vec2 q = vec2(p.x + uBoot[0].w * smoothstep(rh, L - rb, p.y), p.y - rh);
  q.x = abs(q.x);
  float b = (rh - rb) / h;
  float a = sqrt(1.0 - b * b);
  float k = dot(q, vec2(-b, a));
  float d = k < 0.0 ? length(q) - rh : k > a * h ? length(q - vec2(0.0, h)) - rb : dot(q, vec2(a, b)) - rh;
  float arch = (p.y - L * 0.42) / (L * 0.1);
  return d + 0.008 * exp(-arch * arch);
}

// One field of lugs: rows between y0 and y1, bent into a chevron (slope
// chev, + points to the toe), split at the centre groove and, with split,
// into an inner and an outer column a side (the outer staggered).
float bootLugs(vec2 p, float y0, float y1, float rows, float chev, float fill, float split, float hw, float groove, float stagger) {
  float ax = abs(p.x);
  float pitch = (y1 - y0) / rows;
  float yv = p.y + chev * ax;
  float outer = split > 0.0 ? step(split * hw, ax) : 0.0;
  float v = (yv - y0) / pitch + outer * stagger;
  float dy = (abs(fract(v) - 0.5) - fill * 0.5) * pitch / sqrt(1.0 + chev * chev);
  dy = max(dy, max(y0 - yv, yv - y1));
  float dx = groove * 0.5 - ax;
  if (split > 0.0) {
    float s = split * hw;
    dx = ax < s ? max(dx, ax - s + groove * 0.5) : s + groove * 0.5 - ax;
  }
  float r = 0.003;
  vec2 e = vec2(dx, dy) + r;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - r;
}

// The tread, signed metres: negative where the sole presses hardest (the
// toe cap, the lugs, the heel's solid back). Past the outline it's the
// outline's own distance.
float bootTread(vec2 p) {
  float out_ = bootOutline(p);
  if (out_ > 0.02) return out_;
  float L = uBoot[0].x;
  float groove = uBoot[3].z;
  float heelEnd = L * 0.3;
  float foreStart = heelEnd + L * uBoot[3].y;
  float toeIn = L - uBoot[3].x - 6.0 * p.x * p.x;
  // The toe cap: a solid band round the toe.
  float d = max(out_, toeIn - p.y);
  // The forefoot's lugs, up to the cap.
  float fore = bootLugs(p, foreStart, toeIn - groove, uBoot[1].x, uBoot[1].y, uBoot[1].z, uBoot[1].w, uBoot[0].z, groove, uBoot[3].w);
  d = min(d, max(fore, out_ + 0.002));
  // The heel: its solid back, curving up the sides, and its lugs above it,
  // their chevron turned the other way.
  float back = uBoot[2].y * heelEnd + 9.0 * p.x * p.x;
  d = min(d, max(out_, p.y - back));
  float heel = bootLugs(p, back + groove, heelEnd, uBoot[2].x, -uBoot[1].y * 0.6, uBoot[1].z, 0.0, uBoot[0].y, groove, 0.0);
  d = min(d, max(heel, out_ + 0.002));
  return d;
}
`;
