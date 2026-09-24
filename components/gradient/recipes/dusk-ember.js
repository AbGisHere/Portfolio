/**
 * Day scene — warm dusk haze.
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
const duskEmber = {
  version: 1,
  name: 'Dusk ember',
  type: 'MIST',
  // Which body this scene's sky holds (see components/gradient/orbit.js):
  // the moon fades with daylight, the sun warms near the horizon.
  body: 'sun',
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

  // COLOURS — peach silk, plum bloom, ibis haze, clear vermilion, shadow fuji,
  // inked violet
  stops: ['#FBE7CD', '#F5C8A1', '#DC9892', '#AC6D86', '#784B71', '#452F56'],
  divs: [
    0.16666666666666666, 0.3333333333333333, 0.5, 0.6666666666666666,
    0.8333333333333334,
  ],

  // MOUNTAINS
  size: 33.33333333333333,
  glintHorizon: 0.4,

  // ATMOSPHERE + MOUNTAINS detail
  mist: { haze: 50, height: 63, sharp: 64, seed: 12, sun: 28, drift: 55 },

  // Ours, not the studio's: at rest the seed breathes ±seedDrift around its
  // value on a `period`-second sine, so the ridges slowly shift. GL only; the
  // SVG fallback stays still. 0 turns it off.
  idle: { seedDrift: 0.5, period: 60 },

  // How this scene animates when it becomes the active theme.
  transition: {
    // Switching into dusk is the long way round: the sun rises on the right
    // and crosses the whole sky. So it gets more time than dusk → night, or
    // the sunrise would race the sunset.
    // Keep ms ≈ 5000 / springRate.
    springRate: 1.25,
    ms: 4000,
    // Top of the arc the sun and moon travel in a switch, as a share of the
    // frame height from the top (see components/gradient/orbit.js).
    apex: 0.12,
    // Skies passed through on the way here from night (see
    // components/gradient/orbit.js): `at` is how far through the switch (0 → 1, on the sun's
    // clock) each palette is reached. Same six-band layout as `stops`.
    via: [
      // Dawn: night still overhead, peach at the horizon, cool mauve ridges.
      { at: 0.22, stops: ['#3B4470', '#8C88AE', '#F0B9A8', '#B98D98', '#7E6680', '#4A3F5E'] },
      // Day: soft, hazy blue as the sun tops the arc; blue-grey ridges. The
      // near ridges stay dark: every ridge fades toward the pale mist band
      // (stops[1]) at its foot, so lighter ones vanish into each other.
      { at: 0.58, stops: ['#9CC3E0', '#C4DCEB', '#EAF0EE', '#A3B6C4', '#61788F', '#2E3D55'] },
      // Late afternoon: lilac-grey overhead, warming at the horizon, so blue
      // turns to cream through lilac rather than through mint.
      { at: 0.8, stops: ['#D8D4E0', '#EDD2C2', '#E2AC96', '#A57684', '#684C6E', '#37294B'] },
    ],
  },

  // The descent's time of day (components/gradient/camera.js), over the
  // 0.2 stretch (`about` 0 → 1) while the camera draws back. Ours, not the
  // studio's.
  scroll: {
    // Palettes the day passes on the way down, like `transition.via`: from
    // the resting afternoon through golden hour to sunset, darkening as it
    // goes. Under the camera the frame's top shows stops[0] and the horizon
    // stops[1] by the end (camera.js SKY), and the ridges are painted from
    // stops[2]–[5] toward stops[1] (camera.js descentPaint), so: stops[0] the
    // sky overhead, hazy mauve at golden hour deepening to dusky blue-violet;
    // stops[1] the glow on the horizon and the haze the distant ranges fade
    // into (pale gold, then a pale rose); stops[2]–[5] the ridges far to
    // near, one clean violet family: rose-mauve, dusty violet, slate-violet,
    // deep indigo in front (the near ones, stops[4] and stops[5], darkest, so
    // the front ridge holds). Same six bands as `stops`.
    keys: [
      { at: 0.5, stops: ['#B2A7C2', '#F1CFA6', '#C7A0A6', '#957893', '#655A82', '#3C395F'] },
      { at: 1, stops: ['#4B5389', '#DDAAA8', '#A98799', '#77648C', '#48408A', '#282463'] },
    ],
    // The sun sets as the camera pulls back (camera.js bodyAt): its gap to
    // the horizon closes to `set` radii below it by the end (so the distant
    // ranges take the lower part of the disc), leaning `dx` (share of the
    // height) left the way it sets.
    body: { dx: -0.03, set: 0.1 },
    // The haze by the end (`mist.haze` is 50 at rest): thinner evening air,
    // so the ridges darken toward silhouettes (camera.js scrollHaze).
    haze: 32,
    // The meadow's tint at the viewer's feet, leaned into the front ridge's
    // colour: a dim violet-green that sits with the indigo front ridge.
    meadow: '#3E4466',
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

export default duskEmber;
