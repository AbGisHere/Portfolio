/**
 * Day scene — warm dusk haze.
 *
 * Every value the gradient studio exposes lives here; nothing about the look
 * is decided inside the engine. Panel label -> field:
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
 *   FINISH     Soften  -> blur
 *              Noise   -> grain
 *
 * `transition` is ours, not the studio's: it drives both the engine's spring
 * and the sky crossfade, so they can't drift apart.
 */
const duskEmber = {
  version: 1,
  name: 'Dusk ember',
  type: 'MIST',
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
  stops: ['#FBE7CD', '#F5C8A1', '#DD9B88', '#B06E80', '#7A4B6F', '#452F56'],
  divs: [
    0.16666666666666666, 0.3333333333333333, 0.5, 0.6666666666666666,
    0.8333333333333334,
  ],

  // MOUNTAINS
  size: 33.33333333333333,
  glintHorizon: 0.4,

  // ATMOSPHERE + MOUNTAINS detail
  mist: { haze: 50, height: 63, sharp: 64, seed: 12, sun: 28, drift: 55 },

  // How this scene animates when it becomes the active theme.
  transition: {
    springRate: 9,
    ms: 555,
    // Mirrors the spring's own shape: 1 - e^(-rate*t) is an exponential
    // ease-out, so anything tracking the sun needs the same curve or it
    // visibly lags mid-flight.
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Unused by MIST, kept so the recipe stays a drop-in for the engine.
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
