# The atmosphere

How the scene behind every page works: recipes, the two renderers, the
switch, the `0.2` camera, and the hooks the harness relies on. Read this
when changing the atmosphere; work on another part reads only the
interfaces it reaches (`sceneAt`, `sunSpot.js`, the descent store). Rules
for every session are in [`CLAUDE.md`](../../CLAUDE.md); history and
measurements in [`CHANGELOG.md`](../../CHANGELOG.md).

The page is one full-bleed scene: mountain ridges under drifting haze, with a
sun in the sky (at night a moon, with seas and craters). Clicking the sun
turns the sky: dusk → night (1.5s), the sun sets down-left behind the ridges
as the moon rises on the right, through a blue hour; night → dusk (4s), the
moon fades with the morning while the sun rises on the right and crosses the
sky, through dawn (.22), day (.58) and late afternoon (.8). The ridges
reshape and are relit the whole way. History and measurements: `CHANGELOG.md`.

**Nothing about the look lives in a renderer.** Each scene is a recipe, and
every value the source gradient studio exposes is a field on it:

| Studio panel            | Recipe field                              |
|-------------------------|-------------------------------------------|
| MOUNTAINS · Ranges      | `size` (3 + size/100 × 6; 33.3 → 5)       |
| MOUNTAINS · Horizon     | `glintHorizon`                            |
| MOUNTAINS · Peaks/Sharp | `mist.height` / `mist.sharp`              |
| ATMOSPHERE · Haze/Drift | `mist.haze` / `mist.drift`                |
| ATMOSPHERE · Sun        | `mist.sun` (% across the frame)           |
| Shuffle                 | `mist.seed` (ridge silhouette)            |
| COLOURS                 | `stops` + `divs`                          |
| FINISH · Noise          | `grain`                                   |
| (canvas, veil speed)    | `aspect` (2048×1494) / `speed`            |

Plus fields that are ours, not the studio's:

```js
body: 'sun',                        // or 'moon': which body this sky holds
idle: { seedDrift: 0.5, period: 60 }, // resting ridge "breathing" (GL)
transition: {                       // how a switch INTO this scene runs
  springRate: 1.25, ms: 4000,       // length; keep ms ≈ 5000 / springRate
  apex: 0.12,                       // top of the sun/moon arc, share of height
  via: [{ at: 0.22, stops: [...] }, ...], // skies passed on the way (six bands, like stops)
},
scroll: {                           // the 0.2 camera's time of day (camera.js)
  keys: [{ at: 0.5, stops: [...] }, ...], // palettes by `about`, like `via`
  body: { dx: -0.03, set: 0.1 },    // by about = 1: `set` radii below the horizon, `dx` left (share of height)
  haze: 32,                         // optional: `mist.haze` by about = 1 (thinner evening air)
  meadow: '#3E4466',                // the meadow's tint at the viewer's feet
  descent: { back, tilt, rise, ranges }, // optional: override DESCENT
},
```

## Renderers

Two renderers draw the same recipe; `AtmosphereField` picks one after mount
(WebGL where WebGL2 exists, else layered), with the CSS backdrop covering
the gap. Both are dynamically imported, so neither is in first-load JS. Each
frame's scene (camera, palette, ridge placement and paint, bodies, ridge
light, meadow, sky, air) comes from one pure `sceneAt` (`scene.js`); a
renderer only maps it to uniforms or CSS. (The studio's SVG engine that GL
was ported from is in git history before `0.1.8`.)

- **WebGL (default)**, `components/gradient/gl/`. `mistGeometry.js` ports
  the studio's MIST maths one for one (ridge noise, `layout`, veil
  timings); `mistShader.js` composites sky → sun/moon glow and disc (two
  mid-switch) → per ridge (fill, blurred edge, crest rim, veil) → air →
  grain in one fragment shader; `MistCanvas.jsx` runs the spring and the
  switch clock. DPR is capped at 2 (`MAX_DPR`) and the frame at 4K's pixel
  count (`MAX_PIXELS`). Whenever the canvas is drawn below the device's
  pixels (that cap, a quality step, a DPR over 2), the grain leaves the
  shader for the layered renderer's overlay at device pixels
  (`grainLayer.js`, `0.2.11`): one-CSS-px noise scaled up goes soft, the
  rest of the scene doesn't (`npm run sharp`). Reduced motion freezes the
  veils and makes a switch a cut.
  - **Hidden ridges are skipped:** a front-to-back pre-pass starts the ridge
    loop at the nearest ridge that fully covers the pixel (6σ under its
    crest, where `Phi` clamps and the fill is exactly 1), with exact trims
    for fill, rim and veil. Any change must stay pixel-identical to the
    unskipped loop (`?off=skip`).
  - **Adaptive quality** (`adaptiveQuality.js`, pure, `npm run
    test:adaptive`): steps the DPR through `QUALITY` [1, .875, .75] when
    busy frames' median runs over 1.5× the refresh two windows (of 60) in a
    row, back up after 5 s with the p90 within 1.3×; a level that fails
    within 3 s is locked out until a resize; the first 2 s and 60 busy
    frames don't count. There is no step above the 4K cap: `0.2.11`
    measured native 5K/6K at 2–3× the GPU time, past a 120 Hz frame, for
    no sharper mountains. It learns the refresh at rest, so it's off under
    `?freeze=1` and reduced motion. Hold it with `?adapt=0` (1, capped)
    when comparing builds.
  - **Crests on the GPU:** `crestShader.js` renders the ridge outlines (one
    sample per device column) into an R32F texture. The studio's sin-based
    hash isn't portable in float32, so the shader never hashes:
    `hashTable.js` precomputes every hash in JS doubles, sized once for the
    camera's widest scale (`descentWidest`) and rebuilt only on resize or
    when the noise offset leaves its range. A frame is two draw calls.
    Without `EXT_color_buffer_float` (or with `?crest=cpu`) `layout` +
    `sampleCrest` run on the CPU; both paths must stay pixel-identical,
    also mid-drift (`?driftAt`).
  - **Idle drift:** `idle` breathes the seed ±`seedDrift` on a
    `period`-second sine at rest. Drift, wind and veils share one `IDLE_HZ`
    (30) tick; scroll, switches and the spring redraw every frame. Off
    under reduced motion and `?freeze=1`, and while off screen. For a
    switch the drift is kept per ridge (with its scroll gain) and fades on
    the switch's clock (`seedOffset()` = `orbit.drift × (1 − e)`); never
    fold it into the start seed as a bare offset (distant ranges jump).
    The fade (≤ 1.25) stays below the smallest seed advance (2.25).
  - **Lost context:** `AtmosphereField` shows the layered fallback and
    retries WebGL every 2s, up to 3 times.
- **Layered (fallback)**, `components/gradient/layers/`: stacked DOM layers
  in the shader's paint order (sky, glow and disc, per ridge a fill, light
  and rim, veil, then air and grain), composited rather than repainted.
  - **Colour lives in small canvases the compositor stretches** (`0.2.9`):
    vertical gradients 1×512 texels, radial ones 128², rims 1×1. A colour
    change redraws a few hundred texels, so a scroll frame rasters no
    tiles, and colours are exact every frame. Opaque body and sky canvases
    (`alpha: false`) let Chrome skip the tiles they cover. **Keep the
    tiled-layer budget small:** past Chrome's GPU memory, tiles drop out
    mid-scroll (the `0.2.6` regression: ~97 layers, ~537 MB at 1792×1120@2;
    now 20 tiled layers, ~60 MB). `npm run perf -- --gate` checks it under
    a capped GPU memory.
  - Each ridge's silhouette is an alpha mask `ridgeMasks.js` computes with
    the shader's own maths, as a PNG blob. **Decode each mask before CSS
    points at it**: Safari paints a still-loading mask as no mask and never
    repaints.
  - **One silhouette** through every switch (the scene it loaded with; only
    the light changes). Two masks per ridge (fill band and rim), built once
    for all nine ridges over their widest span under the camera, and rebuilt
    120 ms after a resize, never while scrolling. Masked layers keep their
    full mask width (a static crop), so a mask never re-rasters mid-scroll;
    only the opaque body canvases are cut to what's on screen.
  - **Under the camera** each ridge is a masked edge band plus a solid
    body in a camera wrapper (`translateY(foot − base) scale(s)`). At rest
    the world ranges stay in the DOM, posed at the descent's first frame,
    so the first scroll frame reveals nothing at once.
  - **Ridge light, exactly the shader's:** inside the band, the shaded
    fill, the unshaded fill at the light's falloff alpha, and a `screen`
    group of a static falloff canvas (`ridgeMasks.js`, 2 CSS px per texel)
    `multiply`-tinted by a one-row canvas of the light across x, moved by a
    transform: `screen(fill·S(F), L·F·toward)`. A scroll frame is one rAF
    paint: no React renders, no mask rebuilds.
  - Grain is a canvas at device pixels, drawn once per size (a CSS-pixel
    canvas stretched `pixelated` under the overlay blend cost ~50 fps).
  - At rest nothing runs on the main thread: the veils animate on Web
    Animations (compositor).
  - Accepted differences from GL: no idle drift or reshaping, no wind, an
    edge about s× narrower.

**Parity.** The two must look the same at rest, under the camera and
through a switch. `npm run parity` compares `layers` against `gl` over 7
viewports × 2 themes × `--scrolls` 0, .5, 1 (42 cases) and fails above a
mean of 2/255 or a p99 of 24. **Current state (since `0.2.9`): 42/42**
(worst mean 0.96, p99 4), the hit target within .02 px of the painted body
in every case. `npm run switch` passes 12/12 (worst step ×2.9, limit ×3).
They run before every push (`npm run qa`, two tiers).

**Shared, so the two can't drift:** `sceneAt` (`scene.js`), ridge paint
(`ridgePaint`, `rimWidth`, `grainOpacity`, `grainTexels` in
`mistGeometry.js`), colour maths (`colour.js`), the sky ramp (`skyRamp.js`),
the sun's look and `RIDGE_LIGHT` (`sunLook.js`), the moon's face
(`moonFace.js`), the switch (`orbit.js`), the camera and `ridgeLightAt`
(`camera.js`), and the painted body's position (`sunSpot.js`). Change the
look in the shared module, or in `mistShader.js` and the layered renderer
together, then re-run parity. **Keep `tanh`/`exp` arguments bounded in the
shader:** some GPUs (and SwiftShader) return NaN once `exp` overflows, which
blanked every ridge fill.

**Hooks** the page and renderers honour (the harness relies on them):

| Hook | Meaning |
|---|---|
| `?renderer=gl` / `?renderer=layers` | Force a renderer (default: GL where supported, else layers) |
| `data-renderer` on the scene wrapper | Which one actually painted (a silent fallback shows here) |
| `?freeze=1` | Veils at rest phase (drift 0, full opacity); GL: no idle drift, no wind over the meadow |
| `?scroll=0.5` | Pin the descent's `about` (`components/scroll/descent.js`); the scroll layer then publishes nothing |
| `?grain=0` | No grain layer (grain is random per load) |
| `data-sun-cx` / `data-sun-cy` | Painted sun centre, CSS px |
| `data-sun-toggle` on the sun button | Stable selector for the harness (not `aria-pressed`: the button has none; its accessible name matches `/switch to/i`) |
| `data-busy` on the sun button | Set while a switch runs (clicks are ignored) |
| `localStorage['abg-theme']` | `day` or `night`, read before first paint |
| `data-seed` on the scene wrapper | The seed last painted (GL: drift included; only increases across switches) |
| `data-ready` on the layered scene | Set once its ridge masks are painted |
| `?crest=cpu` (GL) | Force the CPU crest path |
| `data-crest` on the scene wrapper (GL) | Which crest path ran: `gpu` or `cpu` |
| `?driftAt=0.25` (GL) | Pin the idle seed-drift offset, even with `?freeze=1`, to compare crest paths mid-drift |
| `?off=rim,veil` (GL) | Compile shader features out, for profiling (`OFF_FLAGS` in `mistShader.js`: `skip`, `wash`, `bodies`, `ridges`, `slope`, `light`, `rim`, `meadow`, `veil`, `air`, `grain`); `#define`s at the `// @defines` marker, no cost without the flag |
| `?bench=200` (GL) | Redraw the settled frame that many times, synced by a 1-px `readPixels`; writes `data-bench` and `data-bench-base` (a bare clear) on the scene wrapper, as "median p90" ms |
| `?adapt=0` (GL) | Hold full resolution (no adaptive quality) |
| `?cap=0` (GL) | Lift the 4K pixel cap (`MAX_PIXELS`): draw at native, still at most `MAX_DPR`. For `npm run sharp` |
| `data-quality` on the scene wrapper (GL) | The current resolution step (1, .875 or .75 of the capped DPR) |

**Framing** (`layout`, both renderers). **Aspect lock:** ridge noise is
sampled per unit of `height × aspect` around the frame centre, so a viewport
crops or extends the range rather than squashing it; ridge paths run 3% of
the height past each edge; veil width is `max(width, height × aspect)`.
**Sun clamp:** the sun's x stays 1.5 radii (0.078 × height) clear of either
edge, or centred on a frame too narrow for that; `SunToggle.module.css`
mirrors it with `cqh` units — keep the two in step.

**Sun and moon.** The sun (`sunLook.js`) is a near-white opaque disc
(`DISC_LIFT`, `DISC_ALPHA`) with a warm limb and a two-layer glow as
piecewise-linear stops the shader and CSS both trace; low in a switch it
deepens toward `SUNSET_COLOUR` and flattens by up to `SQUASH`. The moon
(`moonFace.js`) multiplies a fixed-seed shade map of seas, craters and
Tycho's rays into its disc (`.85` opacity); its glow fades to 3.4r on a
smoothstep (`MOON_GLOW`), since a linear fade left a visible edge.

## How the transition works

Two clocks, each with one job. Don't add a second animation loop beside the
switch clock.

- **At rest, the spring** (GL only; the layered renderer paints the recipe).
  The studio's `Wl` is **exponential smoothing**, not a spring:
  `value += (target - value) * (1 - e^(-rate * dt))`, dt clamped to
  [.001, .05] s, settled at 8e-4 × max(1, |target|), in about `5 / rate`
  seconds. It holds the geometry dials, the sun colour and every stop's
  RGB. **Keep `ms ≈ 5000 / springRate`** so it has settled when a switch
  lands. The sun colour is sprung, not derived per frame (`STOPS_AT`): the
  studio's `sunColour` pops on in-between stops. A landing sets the spring
  to the target, so the landing frame doesn't step.
- **In a switch, the sky's turn** (`orbit.js`, both renderers). One sine
  ease-in-out over the target's `transition.ms` carries everything, from
  what was last painted (captured before the spring steps), so nothing runs
  ahead and the first frame never jumps. Reduced motion: a cut.
  - **Bodies.** One arc (an ellipse through both resting spots, peaking
    `apex` from the top) turns right to left, the viewer facing north: the
    outgoing body sets behind the far ridge on the left as the incoming one
    rises on the right, through the same angle. It meets the ridges at
    `SET_ANGLE` (0.3 rad), sideways travel is stretched by `SET_SPREAD`
    (1.3), narrowed on portrait frames (`spreadAt`, `REACH_ASPECT` 1.2).
    Glows fade as discs go under; each body leans toward the sky behind it
    (`wash`). The moon fades over the first ~30% of a morning rather than
    setting.
  - **Palette.** The sky passes the target's `via` keyframes on a monotone
    cubic in oklab (`paletteAt`, `skyKeys.js`), hitting each exactly. Ridge
    colours derive from the palette, so they're relit every frame. Keep a
    keyframe's near ridges (`stops[4]`, `stops[5]`) dark, or the front ridge
    vanishes in a pale palette. The veils' swing (`mist.drift`) blends on
    `e`.
  - **Geometry (GL).** The dials (ranges, horizon, haze, peaks, sharp, sun,
    seed) ease from what was painted to the target's. About one silhouette
    change per seed × .73: keep day and night seeds close. **The seed only
    increases** (`beginOrbit(…, { forward: true })`, `SEED_RATE` 1.5/s: +6
    into dusk, +2.25 into night), so the ridges drift the way the sky
    turns; `MistCanvas` carries the offset (`seedShift`), and a reload
    starts from the recipe's seed.
- **The hit target follows the painted body.** The painting renderer
  publishes the body's centre to `sunSpot.js` (outside React) and
  `SunToggle` writes it to `--spot-x` / `--spot-y` (before any paint, CSS
  places it from the recipe). Mid-switch it jumps to where the incoming
  body lands and ignores clicks (`data-busy`) for the switch's `ms`.
- **The sky interpolates its stops; never crossfade layers.** Two stacked
  opaque layers fading on opacity are asymmetric: dark over light kills
  brightness far faster than the reverse.
- **Sky ramp** (`skyRamp.js`) for every sky path (GL texture, layered sky,
  CSS backdrop): a monotone cubic (Fritsch–Carlson) in oklab through the
  stops at `divs`, sampled with `rampAt`. A deliberate departure from the
  studio's straight segments, which read as Mach bands; every stop still
  lands exactly, with no overshoot.
- **One scene for the whole site.** `AtmosphereField` is mounted in the root
  layout, so navigating keeps the running scene (sky, theme, seed, veils).
  It's `position: fixed`, sized `100% × 100lvh` from `top/left: 0` (not
  `inset: 0`) so a phone toolbar never resizes it; `Stage` uses
  `min-height: 100svh`. It comes after the pages in the DOM, click-through
  except for the sun button, so **page content over it needs a z-index**
  (the error copy uses 3). `global-error` has no layout and paints the
  static sky.
- **Backdrop.** `.atmosphere-field` paints each recipe's sky as CSS
  (`SKY_VARS`, `sky.js`) behind the renderer, so nothing flashes black
  before the renderer loads; an inline script in `app/layout.jsx` sets
  `data-theme` from localStorage before first paint.

## The camera (0.2)

Scrolling the home page's `about` track pulls the camera back from the
mountains, tilting down slightly and rising a little, while the sky turns
toward evening. The maths (`camera.js`, composed by `sceneAt`) is a **pure
function of `about` and the recipe**, read every frame and **never sprung**,
so scrolling back retraces exactly. At `about` = 0 every function is the
identity.

- **Progress.** `SmoothScroll` publishes `about = (scrollY − trackTop) /
  (trackHeight − 100lvh)` to `components/scroll/descent.js`, measured
  against a 100lvh probe so a collapsing URL bar doesn't move it; the track
  is `TRACK_LVH` (`about: 200`, one screen of scroll); a page without a
  track publishes 0. Lenis (`autoRaf`) loads when idle on desktop; before
  that, under reduced motion and on touch-first devices (its non-passive
  listeners made a phone's toolbar judder) a passive native listener
  publishes. Readers subscribe outside React.
- **Camera.** `DESCENT = { back: .4, tilt: .28, rise: .59, ranges }`
  (`scroll.descent` overrides), scaled by `k`, the cosine ease of `about`
  (× `REDUCED_CAMERA` .3 under reduced motion; colour always in full).
  `layout`'s horizon `c` and ridge feet `base_b` imply a ground plane: ridge
  b stands at depth `z_b = (h − c) / (base_b − c)`, is drawn at
  `s_b = z_b / (z_b + back)` about (w/2, base_b), with its foot at
  `c − tilt·h + (1 + rise)·s_b·(base_b − c)`; sky and bodies shift up by
  `tilt·h`. **A silhouette is fixed terrain**: scroll only moves and scales
  it (`frameAt`), so ridges ride a conveyor toward the back.
- **Ranges enter by geometry, never alpha.** `ranges` add world ridges
  (depth `z`, world `height`, `noise` index 5–8, all opaque): one in front
  (z .78, `stretch` 1.6, `drop` .5·h, in by `until` .85) sliding up from the
  bottom edge, and three far ones (z 13, 20, 32, dropped .3·h, in by .6)
  rising from behind the far ridge. Each ridge's `t` (colour, blur, rim,
  veil) follows its foot's slot on the frame (`slotT`). Nine ridges, so no
  crest row is recycled (`uCrestRow` orders them by `noise`).
- **Depth as air.** Far ranges step into the haze (`FAR_HAZE` .4 per
  doubling of depth past the far ridge, via a per-ridge `flat`; `FAR_FOOT`,
  `FAR_VEIL` .5). `SKY { top: .08, horizon: .24 }`, `skyUnder` and
  `uSkyScale` redraw the ramp so the frame ends with `stops[0]` at the top
  and `stops[1]` on the horizon; the haze thins toward `scroll.haze`
  (`scrollHaze`).
- **Idle drift under the camera** is scaled per ridge by
  `g = min(DRIFT_GAIN_MAX 2.5, max(1/s, far lift / drawn lift))`
  (`driftGains`; crest pass `uN[]`, `layout`'s `drift: { offset, gains }`),
  so small ranges still breathe; a drifted ridge reshapes slightly while
  scrolling but retraces exactly.
- **Painted ridge colours.** `PAINT { crest: .1, foot: [.2, .55], rim: .3,
  rimA: .5 }` (`paintTone`, `descentPaint`, `blendPaint`): a clean ramp
  `stops[5]` → `[1]` blended over the studio's colours as the camera moves;
  veils thin by up to `DESCENT_VEIL` .5, the air by `DESCENT_AIR` .5.
- **Ridge light.** `RIDGE_LIGHT` (`sunLook.js`) via one pure
  `ridgeLightAt({ lit, orbit, stops, M, ts, w, h })` (GL uniforms `uLitA`,
  `uShadeA`, `uLitCol`, `uShadeCol`, `uLitAt`, `uLitBase`): warm crest light
  strongest in the body's column, slanted per depth, over a cool multiplied
  shadow. At rest `rest.a` .4 of the light and `rest.shade` .15 of the
  shadow, the sun's colour `rest.warm` .5 toward `SET_COLOUR`, the moon's
  `rest.moon` .7 × the sun's; full strength on the body's `low`. Mid-switch
  it follows the outgoing body out and the incoming one in (zero at
  e = .5), keyed on `orbit` and `e = orbit.e ?? 0`, never on GL-only orbit
  fields.
- **Sun and moon set** (`bodyAt(b, recipe, frame, { w, h, restY, look })`).
  The gap to the horizon closes on `k^SET_EASE` (1.6) to `scroll.body.set`
  radii below it, leaning `dx` left; round and the same size. `look`
  (0…1) weights the edge clamp and the setting look: mid-switch the orbit
  is computed unscrolled then offset, the outgoing body carrying 1 − e,
  the incoming e. `hiddenAt` gives the arc's "fully hidden" line: the far
  ridge's moved foot + 1.25r, back in the unscrolled sky, never above
  restY + r. Setting layers (none at rest): `SET_COLOUR` `#F8B45E` at
  `SET_MIX` .5, `SET_CORE` .8, `SET_LIFT` .18, `SET_BLOOM`, `SET_HALO`,
  `SET_WASH` (sky, rims, crests); the moon warms to `MOONSET` amber.
- **Meadow and time of day.** `groundPaint` (4 stops, `GROUND_AT`) fills
  below the front ridge's foot, between its rim and veil; the air ends at
  that foot; wind (`WIND`) is GL-only, off under `?freeze=1`. `scroll.keys`
  are palettes by `about`; mid-switch `scrollPaletteSwitch` blends both
  recipes' overlays, and the camera amounts blend too.
- **Budget.** A GL scroll frame sets uniforms and runs one crest pass;
  sweeps hold ~118–120 fps at 1728×1117@2 (the tightest, ~5–6 ms GPU of
  8.33), 1440×900@2 and 393×852@2 (M4, `?adapt=0`). Perf's headless wheel
  sweep stops a little short of `about` 1.

## The camera (0.3)

Past the pull-back, the `desk` track (`TRACK_LVH.desk` 400, four screens)
carries the camera down onto the desk and round to face it
(`deskCamera.js`, composed by `sceneAt` when `desk` > 0). Like `0.2`'s, it's
a **pure function of `desk`**, never sprung. At `desk` 0 it is `0.2`'s
camera at `about` 1 exactly (unit-tested).

- **Progress.** A later track starts where the one before ends (its start a
  viewport above its top) and runs its whole height, so `about` 1 and
  `desk` 0 are the same scroll position. `?desk=` pins it (with `about` 1).
- **The path** is `DESK_PATH`: keyframes over `desk` of `d` (metres to the
  desk along the view, + on the mountains' side), `y` (height, metres,
  eased in log space), `pitch` (degrees down), `centre` (the screen's
  optical centre moving from `0.2`'s horizon row to the frame's middle) and
  `zoom`, each through a monotone cubic, flat at both ends and wherever two
  keys repeat (a hold). One world unit is the rest eye height, `WORLD_M` 40
  m; the desk (`DESK_BOX`, a grey box for now) sits `d0` 60 m behind where
  `0.2` leaves the camera, about 64 m up.
- **Pitch as a homography.** The `0.2` camera has a vertical image plane and
  a lens shift, which can't look down. Rotating a camera about its centre
  maps its image by a homography that doesn't depend on depth, so the
  shader takes each screen pixel back to the `0.2` plane (`toVirtual`;
  `uPitch`, `uPrin`) and paints it exactly as before. A ray that leaves the
  plane behind sees only the ground. The ground grid and the box are traced
  from the ray (`uEye`, `uBoxMin`/`uBoxMax`). `toScreen` takes the body
  back, so the hit target follows (off the frame looking down).
  `deskFrameAt` keeps each ridge's `t` and `flat` as `0.2` left them:
  coming down, every foot slides to the horizon and would turn to haze.
- **The crests under the pitch.** The plane's ridge band reaches wider than
  the frame (`pitchSpan`, up to 4×), so the crest texture spans `uM`
  (crest pass) / `m` (`sampleCrest`) × the frame, read between columns
  (`crestAt`; whole columns read exactly, so `0.2` frames are unchanged),
  and the hash table covers `deskWidest` (rebuilt once on the way in).
- **Stops** (`scroll/stops.js`): desk .025 (the pull-back's end, the sun
  half set) and .5 (the top-down shot), each inside a hold. When scrolling
  rests within `STOP_REACH` (half a viewport) of one, `SmoothScroll` glides
  onto it (Lenis `scrollTo`, or a smooth native scroll; never under reduced
  motion, or while a finger is down).
- **The closing sky** (`skyLifeAt`, fading in over `LIFE_IN` .62–.86): the
  sky ramp spread from the frame's top to the horizon (`DESK_SKY`,
  `deskSkyAt`), two cloud banks (far and near, drifting at their own pace,
  slowly changing shape, patchy, hazed toward the sky's colour), birds by
  day (four flocks on irregular cycles, one to seven birds, depth setting
  size and haze, gliding between wingbeats) and twinkling stars at night;
  mid-switch they blend on `e`. They run on `skyT`, seconds on GL's frame
  loop while the sky shows, and redraw every frame there (not the idle
  tick) so the birds move smoothly. Integer hashing (`pcg`), so every GPU
  draws the same sky. Reduced motion holds the sky still, without birds;
  `?skyt=` starts the clock at a given second (stills, with `?freeze=1`).
- **Not yet:** the layered fallback ignores `desk` (it holds the
  pull-back's end), reduced motion runs the full path, and parity, perf
  and switch cover the `0.2` stretch only.

## Adding a scene

1. Add a recipe under `components/gradient/recipes/`, with its `body`
   (`'sun'` or `'moon'`), `aspect`, a `transition` (`springRate`/`ms`,
   `apex`, and any `via` skies on the way into it), and a `scroll` (`keys`,
   `body`, `meadow`, optionally `haze` and `descent`) for the `0.2` stretch.
   Under the camera `stops[0]` is the sky overhead, `stops[1]` the horizon
   glow and the haze the distant ranges fade into, and `stops[2]`–`[5]` the
   ridges far to near. Run `npm run test:unit` (it checks every recipe
   colour) and parity.
2. Register it in `components/gradient/themes.js` under its theme id, with
   `recipe` and `next` (the cycle is defined by the themes, not the
   provider).
