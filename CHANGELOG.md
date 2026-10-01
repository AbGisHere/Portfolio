# Changelog

What each release changed, and what it measured, newest first. Versions
follow the lines in `ROADMAP.md` ("Version lines"); how the code works now is
in `CLAUDE.md` and `docs/parts/`. Measurements are production builds on an Apple M4, headless
Chromium unless noted. "GPU ms" is `?bench` (median of interleaved runs,
budget 8.33 ms at 120 Hz); "idle" is main-thread ms per second at rest.

## 0.2.13 — 2026-10-01

Two of the `0.2.8` audit's owner decisions, settled. Docs and `.gitignore`
only; the scene is unchanged.

- `.impeccable/surfaces/home.md` stays local and is no longer cited as the
  visual contract; `DESIGN.md` is the committed design record.
- `.claude/agents/impeccable-*` is untracked and gitignored, so the
  impeccable agents and their skill are both local.
- Still open: fallback parity under the camera (decide before `0.3`) and
  whether an admin surface is wanted.

## 0.2.12 — 2026-10-01

The design audit's fixes, `DESIGN.md`, and the docs brought up to date. The
scene is unchanged.

- **Audit** (`/impeccable audit`): 17/20, then 19/20 after the fixes
  below (accessibility 4, performance 3, responsive 4, theming 4,
  implementation 4). Performance stays at 3 for the 1728×1117@2 scroll
  sitting at the 118 fps gate.
- **Focus on the sun:** the 70% white outline vanished on the pale day glow
  (about 1:1). It's now a two-tone ring (warm ink inside a charcoal rim)
  that shows on both skies, with a transparent outline for forced-colors
  mode.
- **Semantics:** the sun's button sits in an `aside` labelled "Time of day"
  instead of loose in `<body>`; its `title`, which repeated the label, is
  gone.
- **Browser surfaces:** `color-scheme: dark` and a scrollbar in the ink at
  35%.
- **Tokens:** the error screens' text and underline use `--ink` through
  `color-mix` instead of copied rgba; the link hover keeps warm ink (no
  `#fff`) and the focus outline is square, as `DESIGN.md` says.
- **`DESIGN.md`** (new): north star "The Descent", both scene palettes,
  the type scale, layout, depth and the two components that exist, with
  four named rules. Its sidecar is `.impeccable/design.json` (local), and
  the direction brief's world is refreshed to `0.2.11`.
- **Docs:** `PRODUCT.md`'s history caught up to `0.2.11`, `CLAUDE.md`'s
  open tasks, a stale "next" line in `docs/parts/atmosphere.md`, and
  `npm run sharp` in the README. `ROADMAP.md` gains the sky lanterns (the
  favourite for the about-me content, not final), cues to scroll and to
  touch the sun (around `0.4`), and primitive as a reference.
- **Not taken:** the scroll and sun cues (the owner builds the whole scroll
  first).
- **QA:** full tier, all passed in 17.7 min: both test suites, hygiene
  21/21, parity 46/46 (worst mean 0.96, p99 4), perf gate 6/6 (min scroll
  118.1 fps, dropout 6/6 clean), switch 12/12 (worst step ×2.9). WebKit
  stays a manual check.

## 0.2.11 — 2026-10-01

Sharpness on large high-DPI displays, and the docs split per part.

- **Measured** (`npm run sharp`, new; `?cap=0` lifts the 4K pixel cap):
  5K@2 and 6K@2, day and night, scroll 0, .5 and 1, grain on and off, the
  cap (75% and 64% per axis) against native. Without grain, crest and sky
  crops are as sharp as native (gradient ratio 0.99–1.01, diff mean 0.1).
  With grain, 12/24 cases read soft (0.65–0.79): the one-CSS-px grain,
  resampled up, is the only thing the cap softens. Native costs 2–3× the
  GPU time (9–17 ms against about 5), past a 120 Hz frame.
- **The fix:** whenever GL draws below the device's pixels, the grain
  leaves the shader for an overlay canvas at device pixels, the same blend
  the layered fallback uses (now shared, `grainLayer.js`). After: 24/24 as
  sharp as native (worst 0.99), the scene still capped.
- **Not shipped:** a quality step above the cap (native where there's
  headroom). It could rarely hold at 120 Hz and would buy only the grain.
- `sharp.mjs` finds crest rows on band-averaged rows, so grain no longer
  hides them.
- **Docs:** `CLAUDE.md` keeps the rules and an index of parts; the
  atmosphere's internals move to `docs/parts/atmosphere.md` (629 → about
  300 lines loaded every session).
- QA (full): tests, hygiene, parity 46/46 (worst mean 0.96, p99 4), switch
  pass. Perf passed 5/6 on the full run: GL scroll at 1728×1117@2 ran at
  115.7 fps (the gate is 118). That case also needed a retry in `0.2.10`,
  and it never draws the overlay (it's under the cap). One cold rerun
  failed at 66.9 fps; two warm reruns passed at 119.7.

## 0.2.10 — 2026-10-01

Docs only: the custom domain, and a reference for later.

- **Domain:** the site lives at [abgupta.me](https://abgupta.me), the
  primary production domain since 2026-09-30 (www.abgupta.me and the
  earlier `*.vercel.app` domains redirect to it). README, PRODUCT.md and
  `.env.example` (`SITE_URL`) updated; no code change, since `app/site.js`
  reads `SITE_URL`, else Vercel's primary production domain.
- **Roadmap:** a reference note on shan-shui-inf's objects on the terrain
  (trees, pavilions, bridges, figures), not planned. Sharpness on large
  high-DPI displays moves from `0.2.10` to `0.2.11`.
- `package-lock.json`'s version, left at `0.2.8`, caught up.

## 0.2.9 — 2026-09-30

The layered fallback's tile dropout in Chrome, live since `0.2.6`.

- **The bug.** `0.2.6` gave nearly every ridge part its own composited layer
  (97 layers, about 537 MB at 1792×1120@2), and the palette repainted them
  every scroll frame. Past Chrome's GPU memory budget, tiles dropped out
  mid-scroll. Reproduced headless with `--force-gpu-mem-available-mb`.
- **The fix** (`LayeredScene.jsx`, `ridgeMasks.js`):
  - Colour in small canvases the compositor stretches, so a scroll frame
    rasters no tiles; the colour stagger is gone and colours are exact every
    frame.
  - Two masks per ridge (fill band, rim) instead of three; masked layers
    keep their full width, so a mask never re-rasters mid-scroll.
  - The ridge light is now exactly the shader's (`screen`/`multiply` blend
    layers and a transform).
  - The world ranges stay posed at rest, so the first scroll frame reveals
    nothing at once; grain is a canvas at device pixels; opaque canvases
    let Chrome skip covered tiles.
- **Measured** (by the fix's agent, on a machine shared with two other
  agents' runs):
  - Tiled layers 73 → 20; live tile memory 222 → 60 MB at 1792×1120@2;
    decoded masks 293 → 108 MB.
  - Dropout under a 256 MB cap: 0 bad frames at 1792×1120@2 and
    3440×1440@1, both themes (the old code dropped 5–366).
  - Parity 42/42, worst mean 0.96 and p99 4 (from 1.06 and 10). Switch
    12/12 (worst ×2.9).
  - Layered scroll: 1440×900@2 111–118 fps, 1792×1120@2 119–120,
    393×852@2 107–120, with 0–1 frames over 20 ms; the old code dipped as
    far or further in the same runs.
- **Not re-checked before this push, at the owner's call:** the full `qa`
  on a quiet machine, WebKit, and a switch's main-thread cost (about 2.2 s
  against 1.2–1.8 s over perf's four switches, measured under load).
  3440×1440@1 keeps about 155 MB of live tiles, passing with less margin.
- **Quality control:**
  - **`npm run qa`** (`scripts/qa.mjs`) runs every check against a
    production server and prints one line per check. It takes about 1.7 min
    for docs-only pushes and about 20 min for anything else.
  - **Checks moved into existing harnesses,** so none is duplicated:
    - console errors, the 404 page and overflow in parity (shared helper
      `lib/console.mjs`);
    - the fps gate (`--gate`), the tile-dropout pass (`lib/dropout.mjs`)
      and a sharpness report (5K and 6K, info only) in perf.
  - **Harnesses** take `--quiet`.
- **Docs:** `0.2.10` added (sharpness on large high-DPI displays), plus the
  standing rule that quality holds on every display, and "Testing: only what
  a change touches" (`ROADMAP.md`).

## 0.2.8 — 2026-09-30

The repo audit's low-risk clean-up. No change to the look.

- **Removed:** the unused GSAP primitives (`SplitText`, `Reveal`,
  `MagneticCard`) and `gsap`; the `npm test` script (it had no specs and
  failed); the recipes' dead studio fields (`version`, `name`, `type`,
  `animated`, `width`/`height` (the recipes' `aspect` carries the studio
  canvas), `startT`, `blur`, `fieldBlur`, `mesh` and the other non-MIST
  fields); the callerless
  `airAt` (`bodyDrop` is now private to `camera.js`); the `--line` token and
  the `h2, h3` rules in `globals.css`; `themes.js`'s unread `id`/`label`;
  `AtmosphereField`'s `className` prop; stale comments.
- **One of each:** the colour maths (hex/RGB, gamma-encoded `mixRgb`, oklab
  `mix`, the cube-root LMS space) is one module,
  `components/gradient/colour.js`, instead of copies in `mistGeometry.js`
  and `skyRamp.js`. The sky-colour lookup is `rampAt(ramp, f)` in
  `skyRamp.js` on a prebuilt ramp (it was `orbit.js`'s `skyAt`, which
  rebuilt the ramp per call); the camera's sky redraw is now `skyUnder`.
  `MAX_DPR`, `GRAIN_SIZE` and `grainTexels` are shared from
  `mistGeometry.js`; the `--sky-day`/`--sky-night` variables are one
  `SKY_VARS` (`sky.js`) for `AtmosphereField` and `ErrorScreen`.
- **One frame, two renderers:** `sceneAt` (`components/gradient/scene.js`)
  is the pure per-frame chain both renderers ran separately, from the
  descent's camera and palette through the bodies, ridge light and meadow;
  GL maps its result to uniforms, the fallback to CSS.
- **Unit tests:** `npm run test:unit` (`scripts/unit-test.mjs`, with
  `scripts/lib/resolve-js.mjs` resolving the components' extensionless
  imports under `node --test`) covers the colour module's round trips,
  `paletteAt` (hits every keyframe, never overshoots) and `sceneAt` (rest,
  `about` 1, reduced motion, mid-switch). CI runs it after
  `test:adaptive`.
- **Fonts:** Unbounded loads without a weight list (one variable file).
  JetBrains Mono keeps `400/500/600`, since its whole axis is 9 KB more to
  preload.
- **Share cards:** `app/twitter-image.jpg` (+ `.alt.txt`), a byte-identical
  copy of the OG image, is gone; Next fills `twitter:image` and its alt
  from `opengraph-image`.
- **Docs:** this changelog takes the release history and measurements out
  of `CLAUDE.md` and `ROADMAP.md`; the hook table (CLAUDE.md), the version
  lines (ROADMAP.md) and the parity state (CLAUDE.md) each live in one
  place; stale claims fixed (Next 16 prints no route sizes, the scripts
  launch only Chromium, the finished "(once built)" checks).
- **Verified unchanged** (prod build, headless M4): parity 42/42 (worst
  mean 1.06, p99 10, sun ≤ .02 px), `npm run switch` 12/12, `test:adaptive`
  9/9 and `test:unit` 12/12, hygiene all pass, console clean in Chromium and
  WebKit. Perf level with `0.2.7` (1440×900@2 / 393×852@2): GL switches and
  scroll 119.6–120 fps; layered scroll 117.6–119.5 fps, switches 115.9–118.8
  fps; no frame over 20 ms except one on layered at 393×852. Static JS
  230 KB gzip against 231 (`gsap` never shipped); fonts unchanged.

## 0.2.7 — 2026-09-30

The switch cut. The owner saw the layered mountains change all at once on a
switch, both ways and at any scroll. Frame-by-frame captures cleared the
masks; three things were at fault:

- **Layered: the ridge light snapped at landing.** `ridgeLightAt` took
  "mid-switch" from `orbit?.scene`, which only GL's orbit has, so the
  layered light acted as at rest through the switch and jumped to the
  incoming body's full light on landing (night → day at scroll 1: strength
  .28 → 1.0, a step ×22.7 its neighbours). It now keys on `orbit` with
  `e = orbit.e ?? 0` and hands over as GL's does.
- **GL, scrolled: the ridges jumped on a switch's first frame.** The idle
  drift went into the start seed as a bare `+offset`, ignoring the
  per-ridge scroll gains, so distant ranges jumped by `offset × (gain − 1)`
  (×3.7–6.7 at scroll .5/1, hidden under `?freeze=1`). The drift is now kept
  per ridge and fades on the switch's clock (`orbit.drift`); the landing
  seed is unchanged and scroll 0 is frame-identical.
- **Both: the veils' swing jumped at the start.** Its amplitude
  (`mist.drift`, 55 day, 40 night) now blends between the scenes on `e`.
- **`npm run switch`** (`scripts/switch.mjs`) steps every switch on a fake
  clock, both renderers at scroll 0/.5/1 (1440×900@1). Worst step ×2.9 of
  its neighbours against a limit of ×3; the smallest cut it caught before
  the fix was ×3.2. Before → after, day → night / night → day: layers
  ×7.0/3.2 → 1.5/2.8 at scroll 0, ×6.6/4.6 → 1.7/2.4 at .5, ×7.0/22.7 →
  2.1/2.0 at 1; GL 1.3–2.9, unchanged; GL `--live` ×3.7/2.9 → 1.2/1.4 at .5,
  ×6.7/4.4 → 1.3/1.5 at 1.
- Parity still 42/42 (worst mean 1.06, p99 10). Layered switches
  116.8–119.6 fps, ~2.0 s main thread over four (~.25 s more: the ridge
  light now runs mid-switch); GL unchanged.

## 0.2.6 — 2026-09-30

The fallback catches up: the layered renderer takes on `0.2.1`–`0.2.3` and
`0.2.5`, and all 42 parity cases pass (was 14/42).

- **The camera.** `descentAt`/`frameAt` and `layout`'s `ranges` replace
  `CAMERA`/`cameraAt` and `extra`: the conveyor, with the world ranges
  rising into place by geometry. Masks are built once for all nine ridges
  over their widest span, never while scrolling. Also ported: the sky
  redraw, `scrollHaze`, the painted colours (`descentPaint`/`blendPaint`),
  the far-range haze steps, the thinner veils and air, and the `hiddenAt`
  line. Removed: `CAMERA`, `cameraOf`, `cameraAt`, `widestScales`, `extra`
  (`MAX_RANGES`, `EXTRA_LOW`), the `scroll.camera` recipe field,
  `descentAt`'s `more`, and an unused `LAYERS` import in `MistCanvas.jsx`.
- **The ridge light**, at rest and scrolled, from one shared pure
  `ridgeLightAt` in `camera.js` that GL uses too (identical to its old
  inline code over 200,000 random cases). Each ridge gets a glow mask baked
  in ridge space, screened over the fill (`background-blend-mode`, no
  backdrop reads); the cool shade folds into the fill's gradient; the
  light's column is one fixed mask moved by a transform. 27 masks at load
  (was 18).
- **The setting sun and moon** from shared helpers in `sunLook.js`: halo
  shape, setting disc, bloom and the horizon wash over the sky, rims and
  crests. The moon glow is the smoothstep in both renderers (`MOON_GLOW`'s
  17 stops in CSS).
- **Scroll cost.** The ridge light first cut the fallback's scroll at
  1440×900@2 from about 100 to 57 fps. Fixed by putting whatever moves on
  its own transformed layer, cropping ridges hidden behind an opaque nearer
  one, and staggering colour repaints while scrolling (each layer's colour
  at most `STAGGER_MS`, 30 ms, old; one full paint when it settles).
  (This layer count is what causes `0.2.9`'s tile dropout in Chrome.)
- **Results** (1440×900@2, 393×852@2, 3440×1440@1, against a `0.2.5` build
  the same day): parity 42/42, worst mean 1.06, p99 10; the hit target
  within .02 px everywhere (the painted suns had been 3–29 px apart at
  `about` .5 and 1). Layered scroll sweeps 118.8–119.7 fps, p95 8.5 ms, none
  over 20 ms (was 111–119, 0–5 over); switches 116–120 fps, at most one
  frame over 20 ms, 1.7–1.75 s main thread over four (was 1.3–1.6); idle
  54–80 ms/s (was 40–77, from the extra layers). GL is unchanged apart from
  the shared helper, which is pixel-identical.

## 0.2.5 — 2026-09-30

Ridge light at rest (GL). `0.2.2`'s ridge light (the body's column, the
parallax slant) lights the resting scene too, softer (`RIDGE_LIGHT.rest`:
.4 of the light, .15 of the shadow), deepening to its full setting
strength as the body sinks, so the end of the scroll is unchanged. By day
it's halfway from the sun's colour to the sunset one (`rest.warm` .5), so it
reads as warm light rather than greying the violet; the moon's is `rest.moon`
.7 × the sun's (its full-set .35 didn't show at rest). A switch still hands
it from body to body.

- The resting scene moved by a mean of about .5 by day and .9 at night
  (1440×900) against `0.2.4`; scroll-0 parity still passed (14/14; day worst
  mean .77, night 1.81, p99 7), so the expected scroll-0 failure didn't
  happen.
- Against a `0.2.4` build the same day, 1728×1117@2 at scroll 0: GPU 7.0 /
  6.6 ms (day / night) against 6.5 / 6.6, inside run-to-run noise.
  `npm run perf` (`?adapt=0`; 1728×1117@2, 1440×900@2, 393×852@2): switches
  120 fps, p95 9.3 ms, 1.5–1.7 s main thread over four (was 1.6–1.9); idle
  32–38 ms/s (was 37–42); scroll sweeps 118.8–120 fps, none over 20 ms.

## 0.2.4 — 2026-09-26

Performance headroom (GL only). At `0.2.3`, 1728×1117@2 (a 16" laptop's
default) scrolled at 76–77 fps against a 120 budget: every device pixel ran
the whole ridge loop, though ridges are opaque and painted back to front.

- **Profiling hooks:** `?off=a,b` compiles shader features out
  (`OFF_FLAGS`); `?bench=N` times the settled frame on the GPU. The profile
  at `0.2.3`, GPU ms at scroll 0 / 1: 1728×1117@2 6.6–7.6 / 11.9–13.4;
  1440×900@2 4.8 / 8.3; 3440×1440@1 4.3 / 8.0; 393×852@2 .9 / 1.8. The ridge
  loop was 80–90% of a frame (rims 2.6 ms, ridge light 1.4, veils 1.3,
  bodies 1.3, slope 1.0, meadow .7, wash .5, air and grain about 0). Scroll
  1 cost about double scroll 0: nine ridges instead of five, plus the
  scroll-only light, meadow and wash.
- **Hidden ridges skipped:** a front-to-back pre-pass starts the loop at the
  nearest ridge that fully covers the pixel, plus exact trims for fill, rim
  and veil. Pixel-identical to `0.2.3`: 76/76 cases (5 viewports, both
  themes, seven scroll positions, with and without drift). GPU/CPU crest
  parity 42/42 at 0.00.
- **A resolution cap** by pixel count (`MAX_PIXELS`, 4K) beside `MAX_DPR` 2.
- **Adaptive quality** (`adaptiveQuality.js`, `npm run test:adaptive`).
  Earlier rules (the fastest interval, p90/p75 over 30 frames) dropped a
  level on ordinary sweeps at 1728×1117@2, from bunched missed vsyncs in
  headless Chromium; the shipped rules held level 1 through repeated full
  sweeps at 1728×1117@2 (9 fresh loads), 1440×900@2 and 393×852@2, stepped
  down under a forced overload (`?off=skip`) and climbed back after a
  resize, with no blank frame at a change.
- **Fewer redraws at rest:** drift, wind and veils share one 30 Hz tick
  (`IDLE_HZ`; was 60 for the crests and every frame for a moving veil),
  about 48 → 26 draws a second.
- **Results,** GPU ms at scroll 0 / 1: 1728×1117@2 6.8 → 5.2 / 12.8 → 6.0;
  1440×900@2 4.5 → 3.4 / 8.1 → 4.3; 393×852@2 .9 → .7 / 1.9 → .5;
  3440×1440@1 4.4 → 3.2 / 7.8 → 3.7. `npm run perf` (`?adapt=0`): scroll at
  1728×1117@2 from 70–73 fps with 12–15 frames over 20 ms to 117–118 fps,
  p95 9.1 ms, none over 20 ms; 1440×900@2 from 89–112 to 120 fps. Idle
  about 50 → 43 ms/s; switches level. Not yet run on a mid-range phone or an
  older Intel Mac.

## 0.2.3 — 2026-09-25

The sun and moon at any scroll (GL; the fallback shared the first two).

- **Clickable at any scroll.** The renderers publish where the body is
  painted (`sunSpot.js`) and the hit target follows it; mid-switch it still
  jumps to the landing spot and sits out the switch. The fade and `inert`
  past 10% of the track are gone.
- **Switching and scrolling combine on every frame:** the setting look is a
  weight (outgoing body 1 − e, incoming e); the arc's `hidden` line follows
  the far ridge as the camera moved it (GL); the ridge light follows the
  outgoing body out and the incoming one in.
- **A clean landing:** the GL spring lands on the target when a switch ends,
  removing a small whole-sky step.
- **A narrower arc on portrait frames** (`REACH_ASPECT` 1.2): at 393×852 it
  spans .24–.80 of the width (was .17–.87).
- A scripted switch-and-scroll harness on a fake clock: the largest frame
  step against its neighbours fell from 167–175 at `about` 1 and 28–33 at .5
  to 2.0–4.4; scrolling 0 → .7 at night during a switch, from 10–13 to
  2.1–2.5. The hit target within .02 px of the painted body at every scroll,
  both renderers.
- Back to back with a `0.2.2` build (1440×900@2): scroll 109.6–112.2 fps
  against 111.3–112.5 (both p95 16.6 ms, none over 20 ms); idle 53–57 ms/s
  against 71–75; switches 120 fps, p95 9.3 ms; a switch at the bottom of the
  track 105–120 fps. First-load JS +12 B.

## 0.2.2 — 2026-09-24

The look (GL only). Same layout as `0.2.1`; new lighting and paint.

- **Idle drift visible at every scroll:** a per-ridge drift gain (up to
  2.5). Mean motion per .1 seed at 1440×900: 5.26 px at rest, 4.40 at the
  end (3.61 in `0.2.1`; about 1 px on the far ranges before).
- **Distance reads as air:** far ranges step into the haze by depth with
  softer edges and shallower veils; the sky is redrawn under the camera;
  the haze thins toward evening.
- **Painted ridge colours:** a clean ramp from the near ridge to the haze,
  blended over the studio's colours as the camera moves, veils and air
  thinned, so the near ridges stay violet rather than grey.
- **Ridge light** (scroll only): warm crest light in the body's column,
  slanted per depth, over a cool shadow.
- **The sun sets** into the ridges (half to two thirds hidden by the end at
  1440×900), round and the same size, with a hot core, warm limb, bloom and
  a horizon wash; the moon sinks and warms to amber. The moon's glow fades
  on a smoothstep (its edge at 3.4r is gone; GL only until `0.2.6`).
- **Palettes:** day reads as golden hour into sunset; night ends deeper and
  cooler, the distant ranges paling step by step.
- The top of the page pixel-identical to `0.2.1` by day; at night the moon
  glow differs by a mean of .15. Scroll 118.8–119.5 fps, p95 9.0–9.3 ms,
  none over 20 ms; idle 62–65 ms/s with drift; switches 120 fps. First-load
  JS +6 B. Known: the drift slows near zero at the ends of its 60 s sine,
  and the moon's warmth shows clearly only late in the scroll.

## 0.2.1 — 2026-09-24

Ridges that behave like terrain (GL only). `0.2.0` morphed rather than
pulled back (feet spread by (1 + rise)·s, extra ranges faded in place).

- **Fixed silhouettes:** scroll only moves a ridge and scales it evenly
  (`DESCENT`, s = z/(z + back)).
- **A conveyor:** the front ridge recedes toward the second slot, and so on,
  while a new front ridge (depth .78) slides up from below the frame.
- **Distant ranges rise into view** (depths 13, 20, 32) from behind the far
  ridge. Nothing fades; distance reads through colour (`slotT`). Nine
  ridges, no crest row recycled.
- Idle drift and the veils run at every scroll.
- **Phones:** Lenis no longer loads on touch-first devices; the scene is
  sized to `100lvh` and `Stage` to `100svh`, so the toolbar should stop
  popping in and out (not yet confirmed on a real phone).
- The top of the page pixel-identical to `0.2.0`; crest parity still 0;
  scroll 119.7–120 fps, p95 8.8–9.2 ms, none over 20 ms.

## 0.2.0 — 2026-09-24

The camera pulls back. Scrolling the home page's `about` track draws the
camera back from the mountains with a slight tilt and rise: more ranges fade
in, the sky thins to a strip, a band of meadow shows. Time of day moves on
top as recipe data (`scroll`): by day the sun sinks toward sunset, by night
the moon climbs.

- Scroll layer: Lenis (loaded when idle; native scroll under reduced
  motion) publishes progress through a small store (`components/scroll`),
  with a `?scroll=` pin for tests. `camera.js` holds the shared maths.
- The sun toggle faded out past 10% of scroll (lifted in `0.2.3`).
- Reduced motion: 30% of the camera move, the colour change in full.
- Parity covers scroll 0, .5 and 1 (42 cases): worst mean .67, p99 3.
  Layered: switches 120 fps, p95 8.4 ms; scroll 119.4–119.7 fps, at most
  one frame over 20 ms; idle 86–103 ms/s.
- README rewritten; LICENSE (all rights reserved) and `.env.example` added.

## 0.1.x — the atmosphere

- **0.1.11** (2026-09-24) — `SITE.url` from `SITE_URL`, else Vercel's
  primary production domain, else localhost; `llms.txt` becomes a route
  built from `SITE`.
- **0.1.10** (2026-09-24) — Docs: the descent from the mountains to the desk
  planned in ROADMAP.md; the repo-reading rule added to CLAUDE.md.
- **0.1.9** (2026-09-24) — The scene is mounted once in the root layout and
  keeps running across routes; page content over it needs a z-index.
- **0.1.8** (2026-09-24) — The layered DOM fallback replaces the generated
  SVG engine (in git history before this, with its patches in the `0.1.7`
  CLAUDE.md). The moon gets a face (`moonFace.js`), the sun its look
  (`sunLook.js`); GL switches only move the seed forward (1.5/s). Layered:
  switches 109–120 fps, p95 9.1–16.7 ms, ~0.9–1.4 s main thread over four
  (GL 1.5–1.9 s; the SVG engine ~3.3 s, dropping 52 frames per run at
  3440×1440); idle 31–63 ms/s; parity with GL about .4.
- **0.1.7** (2026-09-24) — Switches turn the sky: the sun sets down-left as
  the moon rises (1.5 s, through a blue hour); the moon fades with the
  morning as the sun crosses the sky (4 s). `orbit.js` shared by both
  renderers. GL switches 120 fps, p95 ~9.5 ms, max 10.4 ms.
- **0.1.6** (2026-09-24) — Idle drift (the seed ±0.5 on a 60 s sine) and
  crests on the GPU from a precomputed hash table, pixel-identical to the
  CPU path. Idle at 1440×900@2 / 393×852@2 / 3440×1440@1: drift off
  36/35/42 ms/s, GPU crests 56/39/59, CPU crests 92/72/91 (at a 60 Hz tick).
- **0.1.5** (2026-09-24) — The sun colour springs with the scene instead of
  popping mid-switch.
- **0.1.4** (2026-09-24) — The WebGL2 renderer (default) and one shared
  monotone-cubic oklab sky ramp; the `parity`/`perf` harness. Parity with
  the SVG engine .33–.49; 2–3× lower idle cost.
- **0.1.3** (2026-09-24) — Error pages, share cards, JSON-LD, favicon,
  robots/sitemap/llms.txt, the pre-paint backdrop and theme script, CSS
  Modules.
- **0.1.2** (2026-09-23) — Ridge proportions locked to the recipe's aspect
  on every viewport; the sun clamp; the studio's oklab sky.
- **0.1.1** (2026-09-23) — The page rebuilt as one day/night atmosphere
  scene from recipes.
- **0.1.0** (2026-09-23) — The scroll-driven Next.js rebuild replacing the
  earlier desktop-OS build.
