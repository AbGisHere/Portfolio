/**
 * The moon's face: a greyscale shade map the renderers multiply into the
 * moon's disc (never the sun's, never the glow). 1 is the disc's own colour;
 * the seas (maria) and crater floors darken it, fresh craters stay bright.
 *
 * Laid out like the near side as seen from the north, loosely: Imbrium and
 * Serenitatis up top, Tranquillitatis and Crisium to the right, Procellarum
 * down the left, Tycho's bright rays low in the south. It's drawn from a
 * fixed seed, so every renderer and every load shows the same moon.
 *
 * Kept soft on purpose: at rest the disc is ~10% of the frame height, and a
 * busy face reads as texture noise rather than a moon.
 */

export const MOON_SIZE = 256;

// Small deterministic PRNG (mulberry32), independent of Math.random.
function prng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D value noise on a 16² lattice, smoothstep-interpolated.
function noiseField(rand) {
  const N = 16;
  const g = Array.from({ length: (N + 1) * (N + 1) }, rand);
  const wrap = k => ((k % (N + 1)) + N + 1) % (N + 1);
  const at = (i, j) => g[wrap(j) * (N + 1) + wrap(i)];
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = ((x + 1) / 2) * (N - 1);
    const fy = ((y + 1) / 2) * (N - 1);
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = s(fx - i);
    const v = s(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

// Seas: [x, y, rx, ry, depth], in disc units (-1..1, y down).
const MARIA = [
  [-0.34, -0.36, 0.3, 0.22, 0.2], // Imbrium
  [0.12, -0.4, 0.17, 0.15, 0.17], // Serenitatis
  [0.36, -0.1, 0.22, 0.17, 0.18], // Tranquillitatis
  [0.66, -0.3, 0.1, 0.09, 0.17], // Crisium
  [-0.62, 0.04, 0.24, 0.42, 0.15], // Procellarum
  [-0.2, 0.3, 0.2, 0.12, 0.12], // Nubium
  [0.46, 0.22, 0.12, 0.15, 0.12], // Fecunditatis
  [-0.02, -0.08, 0.1, 0.08, 0.1], // Vaporum
];

/** The shade map, MOON_SIZE² bytes (255 = unshaded), row 0 at the top. */
export function moonFace(size = MOON_SIZE) {
  const rand = prng(0x6d6f6f6e);
  const noise = noiseField(rand);
  const fine = noiseField(prng(0x72696d73));

  // Craters: [x, y, r, floor, rim]. Two named bright ones, then scattered
  // small ones in the highlands.
  const craters = [
    [-0.08, 0.66, 0.05, -0.02, 0.1], // Tycho
    [-0.34, 0.02, 0.055, 0.02, 0.07], // Copernicus
  ];
  while (craters.length < 22) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.85;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    craters.push([x, y, 0.025 + rand() * 0.05, 0.03 + rand() * 0.04, 0.02 + rand() * 0.03]);
  }

  const out = new Uint8Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size) * 2 - 1;
      const y = ((j + 0.5) / size) * 2 - 1;
      const rho = Math.hypot(x, y);
      // Highlands: base with a faint mottle.
      let s = 0.94 - 0.04 * fine(x * 3.1, y * 3.1);
      for (const [mx, my, rx, ry, depth] of MARIA) {
        const q = ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2;
        if (q < 6) s -= depth * Math.exp(-1.4 * q) * (0.65 + 0.7 * noise(x * 1.7, y * 1.7));
      }
      for (const [cx, cy, r, floor, rim] of craters) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d > 1.6) continue;
        s -= floor * Math.max(0, 1 - d * d);
        s += rim * Math.exp(-(((d - 1) / 0.18) ** 2));
      }
      // Tycho's rays: faint bright streaks thinning with distance.
      const tx = x + 0.08;
      const ty = y - 0.66;
      const td = Math.hypot(tx, ty);
      if (td > 0.06 && td < 0.9) {
        const ang = Math.atan2(ty, tx);
        const ray = Math.max(0, Math.cos(ang * 9 + 0.7)) ** 24;
        s += 0.05 * ray * (1 - td / 0.9);
      }
      // A little limb darkening, for roundness.
      s *= 1 - 0.14 * Math.min(1, rho) ** 3;
      out[j * size + i] = Math.round(Math.max(0, Math.min(1, s)) * 255);
    }
  }
  return out;
}
