/**
 * Night scene — cold moonlit haze.
 *
 * Every value the gradient studio exposes lives here; nothing about the look
 * is decided inside a renderer. Panel label -> field:
 *
 *   MOUNTAINS  Ranges  -> size          (3 + size/100 * 6, so 33.3 = 5 ranges)
 *              Horizon -> glintHorizon  (share of frame that is sky)
 *              Peaks   -> mist.height
 *              Sharp   -> mist.sharp
 *   ATMOSPHERE Haze    -> mist.haze
 *              Sun     -> mist.sun      (% across the frame)
 *              Drift   -> mist.drift    (veil speed)
 *              Shuffle -> mist.seed     (ridge silhouette)
 *   COLOURS            -> stops + divs  (sky ramp, top to bottom)
 *   FINISH     Soften  -> fieldBlur    (px; `blur` is unused by MIST)
 *              Noise   -> grain
 *
 * `body`, `idle` and `transition` are ours, not the studio's. `transition`
 * sets how a switch into this scene runs: its length (the spring that holds
 * the resting scene settles in the same time), the arc the sun and moon ride,
 * and the skies passed on the way (components/gradient/orbit.js).
 */
const moonlit = {
  version: 1,
  name: 'Moonlit',
  type: 'MIST',
  // Which body this scene's sky holds (see components/gradient/orbit.js):
  // the moon fades with daylight, the sun warms near the horizon.
  body: 'moon',
  animated: true,
  width: 2048,
  height: 1494,
  aspect: 1.3708165997322623,
  speed: 30,
  startT: 21.04700000000003,

  // FINISH
  blur: 0,
  fieldBlur: 0,
  grain: 9,

  // COLOURS — night sky down to deep shadow
  stops: ['#101828', '#3A4A6B', '#3B4060', '#28314C', '#1C2239', '#111826'],
  divs: [
    0.16666666666666666, 0.3333333333333333, 0.5, 0.6666666666666666,
    0.8333333333333334,
  ],

  // MOUNTAINS
  size: 33.33333333333333,
  glintHorizon: 0.4,

  // ATMOSPHERE + MOUNTAINS detail
  mist: { haze: 50, height: 58, sharp: 68, seed: 18, sun: 76, drift: 40 },

  // Ours, not the studio's: at rest the seed breathes ±seedDrift around its
  // value on a `period`-second sine, so the ridges slowly shift. GL only; the
  // SVG fallback stays still. 0 turns it off.
  idle: { seedDrift: 0.5, period: 60 },

  // How this scene animates when it becomes the active theme.
  transition: {
    // Switching into night is the short hop (sun down, moon up), so it's
    // quicker than night → dusk, which crosses the whole sky.
    // Keep ms ≈ 5000 / springRate.
    springRate: 3.33,
    ms: 1500,
    // Top of the arc the sun and moon travel in a switch, as a share of the
    // frame height from the top (see components/gradient/orbit.js).
    apex: 0.12,
    // Skies passed through on the way here from dusk (see
    // components/gradient/orbit.js): `at` is how far through the switch (0 → 1, on the sun's
    // clock) each palette is reached. Same six-band layout as `stops`.
    via: [
      // Blue hour: deep blue overhead, a last warm band at the horizon.
      { at: 0.5, stops: ['#1F2A4A', '#4A5680', '#9A7E9A', '#6A5478', '#40375C', '#211F38'] },
    ],
  },

  // The descent's time of day (components/gradient/camera.js), over the
  // 0.2 stretch (`about` 0 → 1) while the camera draws back. Ours, not the
  // studio's.
  scroll: {
    // The lilac cast in the haze fades into a deeper, cooler night. Same six
    // bands as `stops`.
    keys: [{ at: 1, stops: ['#0B1120', '#2A3756', '#2C3350', '#1E263E', '#151B2F', '#0C111D'] }],
    // Where the moon is on screen by the end, from its resting spot, in
    // shares of the height (−dy is up): it climbs to the top of the sky
    // strip, well clear of the ridges, drifting left as the sky turns.
    body: { dx: -0.03, dy: -0.23 },
    // The meadow's tint at the viewer's feet: moonlit blue-green.
    meadow: '#22323A',
  },

  // Unused by MIST, kept so the recipe stays a drop-in studio export.
  mesh: null,
  params: null,
  hexStyle: 'hive',
  ballStyle: 'convex',
  city: null,
  pixelStyle: 'quilt',
  cover: 50,
  rings: 12,
  weave: 20,
  cube: null,
  shapeForm: null,
  shapeSoften: 0,
  lines: [],
  tile: 'square',
  warp: 0,
  refract: 50,
};

export default moonlit;
