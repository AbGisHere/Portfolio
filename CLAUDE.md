# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project

Abhinav Gupta's ("AbG") personal portfolio — a single continuous, scroll-driven
experience where every scroll delta stages a reveal, rather than a page of
static stacked sections. Next.js (App Router).

See `PRODUCT.md` for the product record and `.impeccable/surfaces/home.md`
for the visual direction contract. An earlier fake-desktop-OS build (boot →
login → windows/dock/terminal) was retired and its branding dropped; do not
resurrect that metaphor or its name unasked. `ROADMAP.md` holds agreed future
plans: the ship-hygiene gate for `1.0.0`, and "the descent" (`0.2.x`–`0.3.x`):
one continuous scroll-driven camera move that pulls back from the mountains
(`0.2`, live from `0.2.0`), then comes down onto a desk in a meadow, ending
on an open laptop (a tablet on portrait viewports) with the mountains behind
it (`0.3`). The device screen is a
painted background with project cards, not an OS.

## Versioning

The rebuild goes layer by layer, and the version line tracks which layer:

| Line    | Scope                                                        |
|---------|--------------------------------------------------------------|
| `0.1.x` | Background / atmosphere layer (done)                         |
| `0.2.x` | About me: the camera pull-back (current, `ROADMAP.md`)       |
| `0.3.x` | Projects: the descent onto the desk and device (`ROADMAP.md`) |
| `0.4.x` | Contact / reach out                                          |
| `0.5.x` | Header navigation across the sections                        |
| `0.6.x` | Real content throughout                                      |
| `1.0.0` | Ship, once the `ROADMAP.md` hygiene gate is clear            |

The plan past `0.1.x` is the user's current thinking and will change; see
`ROADMAP.md`.

**Before every commit, ask which version to bump to** — never pick one
unilaterally — then update `package.json` and any other file carrying a
version so nothing drifts from the git tag. Do not add Claude co-author or
attribution trailers to commits or PRs.

### Commit messages

Conventional Commits, with the version in the scope slot:

```
<type>(vX.Y.Z): <summary>
```

```
feat(v0.2.0): Stage the hero name reveal on first scroll
fix(v0.1.2): Keep the sun hit target in step on resize
docs(v0.1.2): Drop AbG OS branding and align the direction contract
```

(Commits up to `v0.1.2` used the older `<type>: vX.Y.Z <summary>` form.)

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`chore`. The version is the one the user confirmed for this commit and must
match `package.json` and the tag.

### Derived surfaces follow the site

Several files reflect the site's look or content but aren't the site itself.
They drift quietly as UI decisions pile up. **Whenever the version line moves
(`0.1.x` → `0.2.0`, and so on), re-check each one against the current site and
update it in the same release.** Do the same sooner if a change clearly
affects one of them, such as a new palette, font, route or real content.

| Surface | Must match |
|---|---|
| `components/ErrorScreen` (404, `error.jsx`, `global-error.jsx`) | The current scene, type and palette. The live pages sit on the real atmosphere (from the root layout); `global-error` uses the recipes' skies as CSS. A new layer style belongs here too. |
| `app/opengraph-image.jpg` / `twitter-image.jpg` | A fresh render of the current scene |
| `app/icon.svg` / `apple-icon.png` | The current palette and mark |
| `app/site.js` / metadata | Real role and description. No claims beyond PRODUCT.md's evidence. |
| JSON-LD (`app/layout.jsx`) | The same facts, plus links that actually exist |
| `app/sitemap.js` | Every live route, nothing dead |
| `app/llms.txt/route.js` | Current content, projects and links |

### Pre-push checks

Before every push, verify against a production build (`npm run build &&
npm run start`), not the dev server. Report what fails. Don't push around it
silently. Items marked *(once built)* start applying when the matching
`ROADMAP.md` "Before 1.0.0" item lands. Until then, note them as known gaps.

`npm run hygiene` (`scripts/hygiene.mjs`) checks the machine-checkable items
against a running production server: `lang`, titles and descriptions, the
`<h1>` count, `<img>` alt, source maps, the 404, robots, sitemap, llms.txt,
favicon, canonical, OG image and JSON-LD. CI (`.github/workflows/ci.yml`)
runs it with the build and `npm run test:adaptive` on every push to `main` and
every PR. CI has no GPU, so console errors, the atmosphere on each viewport,
parity, perf and the switch check stay local: run `npm run parity`,
`npm run perf` and `npm run switch` (`scripts/README.md`) whenever a
renderer, the recipe maths or the switch changes.

- [ ] `<html lang="en">` present.
- [ ] Every route has its own `<title>` and meta description. No duplicates, and
      no framework or boilerplate defaults ("Create Next App", "Vite + React").
- [ ] At most one `<h1>` per page *(exactly one, once built)*.
- [ ] Every `<img>` / `next/image` has meaningful `alt`. Decorative ones use
      `alt=""`. Decorative SVG/canvas is `aria-hidden`.
- [ ] Zero console errors or warnings on load and on the day/night toggle
      (Chromium and WebKit).
- [ ] No browser source maps shipped (`productionBrowserSourceMaps` stays
      off). No `.map` files served from `/_next/static`.
- [ ] Bundle: check `next build`'s route sizes against the previous push. Flag
      any jump, and anything new shipped in the first-load JS.
- [ ] *(once built)* View source shows real text content, not an empty shell.
- [ ] *(once built)* Favicon, custom 404, canonical, OG image and JSON-LD all
      resolve. `robots.txt` doesn't block AI crawlers. `sitemap.xml` lists
      every route and nothing dead. `llms.txt` matches the current content.
- [ ] The atmosphere still adapts: phone portrait/landscape, iPad, laptop,
      ultrawide, and one odd aspect. No squashed ridges, no horizontal
      overflow, and the sun hit target sits on the painted sun.

## Reading the repo (keep context lean)

A project rule, for every session and every subagent brief:

- **Search, then slice.** `grep -n` for the symbol, then read only that range
  (`offset`/`limit`, or `sed -n 'a,bp'`). Read a file whole only if it's
  short (under ~100 lines) or you are rewriting it.
- **Never re-read** a file already in context, or one you just edited.
- **Trim tool output.** Pipe test, build and harness runs through
  `tail`/`grep` for the summary lines. Write long reports to a file and read
  back only what's needed. Look at a screenshot only when you need to judge
  something visually, and crop it to the region first.
- **Delegate big sweeps** (docs passes, wide searches) to a subagent, which
  returns a summary instead of the raw reads.

## Commands

```bash
npm run dev       # next dev
npm run build     # next build
npm run start     # next start
npm run test      # Playwright e2e tests (no specs yet)
npm run test:adaptive  # adaptive-quality unit tests (no GPU)
npm run hygiene   # pre-push checks against a running prod server (CI runs it)
npm run parity    # layered vs GL, pixel by pixel (local, GPU)
npm run perf      # frame timing and main-thread cost (local, GPU)
npm run switch    # no cut in a day/night switch, frame by frame (local, GPU)
```

## Tech Stack

- **Next.js 16** (App Router), React 19, plain JS/JSX (no TypeScript).
- The atmosphere: a WebGL2 renderer (`components/gradient/gl/`) drawing the
  animated mountain scene from recipe files, with a layered DOM renderer
  (`components/gradient/layers/`) as the fallback.
- **Lenis** smooths wheel scrolling on desktop (`components/SmoothScroll.jsx`,
  loaded when the browser is idle, in its own chunk). Touch-first devices
  (`(hover: none) and (pointer: coarse)`) and reduced motion never load it:
  they scroll natively. **GSAP + ScrollTrigger** are
  installed but only the unused primitives import them; nothing ships them.
- Plain CSS, structured rather than monolithic: **CSS Modules** beside each
  component (`Component.module.css`), with `app/globals.css` limited to
  tokens, reset and base type, and `styles/utilities.css` for global helpers
  like `.visually-hidden`. No Tailwind. New component styles go in the
  component's own module, never in `globals.css`.
- Fonts via `next/font/google` in `app/fonts.js`: **Unbounded** (display) +
  **JetBrains Mono** (body/labels), exposed as `--font-display` /
  `--font-mono` on `<html>`. Don't redefine those variables in CSS, because
  that bypasses next/font's size-adjusted fallbacks.

## Project Structure

```
app/
  layout.jsx      — metadata (title template, canonical, OG), JSON-LD, theme script, ThemeProvider,
                    the atmosphere and the scroll layer (mounted once, so they persist across routes)
  page.jsx        — home: server-rendered h1/intro (visually hidden), and the `about` scroll track
  not-found.jsx   — 404        ┐
  error.jsx       — route error ├ all render components/ErrorScreen
  global-error.jsx — root-layout failure (own <html>, static sky, no renderer) ┘
  fonts.js        — next/font instances, shared by layout and global-error
  site.js         — shared site facts (url, name, role, links). The url comes from config:
                    SITE_URL, else Vercel's primary production domain, else localhost
  robots.js, sitemap.js     — generated /robots.txt and /sitemap.xml
  llms.txt/route.js         — generated /llms.txt, a plain-markdown summary for LLM agents
  icon.svg, apple-icon.png  — favicon / iOS touch icon
  opengraph-image.jpg, twitter-image.jpg (+ .alt.txt) — share cards
  globals.css     — tokens, reset, base type only
styles/
  utilities.css   — global helpers (.visually-hidden)
components/
  Stage.jsx (+ .module.css)           — full-viewport shell for every scene
  AtmosphereField.jsx (+ .module.css) — the scene, fixed behind every page: backdrop sky,
                                        renderer pick (GL/layers), sun toggle
  SunToggle.jsx (+ .module.css)       — hit target on the painted sun or moon, at any scroll;
                                        follows `sunSpot.js`, sits out each switch
  SmoothScroll.jsx (+ .module.css)    — the scroll layer (root layout): Lenis (desktop), publishes
                                        the descent's progress; a 100lvh probe for the span
  scroll/
    descent.js         — the descent's progress store (`about`), outside React; `?scroll=` pins it
    DescentTrack.jsx (+ .module.css) — an empty block giving a stretch its scroll length (TRACK_LVH)
  ErrorScreen.jsx (+ .module.css)     — shared 404/error layout, palette-tinted scrim
  ThemeProvider.jsx                   — day/night state, localStorage, `data-theme`
  gradient/
    gl/
      MistCanvas.jsx (+ .module.css) — WebGL renderer (default): canvas, clocks, textures
      mistGeometry.js  — one-for-one port of the studio's MIST maths
      mistShader.js    — the fullscreen fragment shader
      crestShader.js   — GPU crest pass (ridge outlines → R32F texture)
      hashTable.js     — precomputed noise lattice hashes for the crest pass
      adaptiveQuality.js — the resolution step from frame intervals (pure; `npm run test:adaptive`)
    layers/
      LayeredScene.jsx (+ .module.css) — fallback renderer: the scene as CSS layers
      ridgeMasks.js    — ridge silhouettes as alpha masks, with the shader's maths
    orbit.js           — a switch: the sky turning, bodies, palette keys (both renderers)
    camera.js          — the descent's camera over the mountains (0.2): per-ridge scale/foot,
                         sky shift, world ranges, meadow, time-of-day palette, bodies and ridge
                         light (`ridgeLightAt`) (both renderers)
    sunSpot.js         — the painted sun's (or moon's) centre, outside React: renderers publish,
                         SunToggle follows
    moonFace.js        — the moon's seas and craters, a shade map for its disc
    sunLook.js         — the sun's two-layer glow, warm limb, low-sun squash
    skyKeys.js         — a palette partway through a switch's keyframes
    skyRamp.js         — the smooth sky ramp every sky path uses
    sky.js             — a recipe's sky as a CSS gradient (backdrop, static sky)
    themes.js          — theme ids -> recipes, and the toggle cycle
    recipes/
      dusk-ember.js    — day scene
      moonlit.js       — night scene
  SplitText.jsx, Reveal.jsx, MagneticCard.jsx
                       — unused primitives (GSAP), kept for the content layers
.github/workflows/ci.yml — CI: build, test:adaptive, hygiene (no GPU checks)
scripts/          — parity, perf, switch, adaptive-test, hygiene (see scripts/README.md)
.env.example      — optional config (SITE_URL); copy to .env.local
LICENSE           — all rights reserved: source visible for reference only
```

## The atmosphere

The page is one full-bleed scene: mountain ridges under drifting haze, with a
sun in the sky (at night a moon, with seas and craters from `moonFace.js`;
the sun's glow, limb and low-sun look are in `sunLook.js`).
Clicking the sun turns the sky: dusk → night, the sun sets down-left behind
the ridges as the moon rises on the right, through a blue hour; night → dusk, the moon goes over and fades with the morning while the
sun comes up on the right and crosses the sky, through dawn, day and late
afternoon. The ridges reshape and are relit from the passing sky the whole
way.

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
| FINISH · Soften/Noise   | `fieldBlur` / `grain` (`blur` is unused)   |

Plus fields that are ours, not the studio's:

```js
body: 'sun',                        // or 'moon': which body this sky holds
idle: { seedDrift: 0.5, period: 60 }, // resting ridge "breathing" (GL)
transition: {                       // how a switch INTO this scene runs
  springRate: 1.25, ms: 4000,       // length; keep ms ≈ 5000 / springRate
  apex: 0.12,                       // top of the sun/moon arc, share of height
  via: [{ at: 0.22, stops: [...] }, ...], // skies passed on the way
},
scroll: {                           // the 0.2 camera's time of day (camera.js)
  keys: [{ at: 0.5, stops: [...] }, ...], // palettes by `about`, like `via`
  body: { dx: -0.03, set: 0.1 },    // by about = 1: `set` radii below the horizon, `dx` left (share of height)
  haze: 32,                         // optional: `mist.haze` by about = 1 (thinner evening air)
  meadow: '#3E4466',                // the meadow's tint at the viewer's feet
  descent: { back, tilt, rise, ranges }, // optional: override DESCENT (both renderers)
},
```

Into dusk is 4s (the sun crosses the whole sky, through dawn at .22, day at
.58 and late afternoon at .8); into night is 1.5s (a short hop, through blue
hour at .5). `via` palettes use the same six bands as `stops`.

### Renderers

Two renderers draw the same recipe, and the page picks one after mount
(`AtmosphereField`), with the CSS backdrop covering the gap: WebGL where
WebGL2 exists, else the layered fallback. The generated SVG engine the WebGL
renderer was ported from (the gradient studio's export) was deleted in
`0.1.8`; it's in git history before that, with its patches documented in the
`0.1.7` CLAUDE.md, if the studio's maths ever needs diffing.

- **WebGL (default)** — `components/gradient/gl/`. `mistGeometry.js` is a
  one-for-one port of the studio's MIST maths (ridge noise, layout with the
  aspect lock and sun clamp below, colour mixing in oklab, veil timings),
  `mistShader.js` is one fullscreen fragment shader compositing sky →
  sun/moon glow and disc (two mid-switch) → per ridge (fill, blurred edge,
  crest rim, veil) → air → grain, and `MistCanvas.jsx` runs the spring and
  the switch clock (`orbit.js`). At rest the veils' drift uniforms change
  and the frame is redrawn, on the idle tick (below), once they've moved
  ~0.2 device px. Canvas DPR is capped at 2 (`MAX_DPR`) and the frame at
  4K's pixel count (`MAX_PIXELS`, `0.2.4`: a larger frame renders at a lower
  DPR). Reduced motion freezes the veils and makes the switch a cut.
  - **Hidden ridges skipped** (`0.2.4`). Ridges are opaque and painted back
    to front, so a front-to-back pre-pass finds the nearest ridge that fully
    covers the pixel (at least 6σ under its crest with fade 1: `Phi`
    clamps at ±6, so its fill is exactly 1) and the loop starts there,
    skipping the sky, the bodies and farther ridges; below the meadow's top
    it starts at the front ridge. Depth is tested unslanted first, so a sky
    pixel pays one crest read per ridge. Exact trims too: no fill 6σ or more
    above the crest, no rim at hw + 6σ or more from it, no veil outside its
    ellipse. Pixel-identical to `0.2.3` (76/76 cases, zero differing
    pixels).
  - **Adaptive quality** (`0.2.4`, `adaptiveQuality.js`, `QUALITY` [1,
    .875, .75] of the DPR). Pure, so its decisions are unit-tested with
    synthetic frame intervals (`npm run test:adaptive`). The refresh is the
    median interval of recent frames at rest (the fastest single interval
    was timer jitter). Busy (scroll, switch) intervals are judged in windows
    of 60: two windows in a row whose median runs over 1.5× the refresh
    (most frames missed: a GPU that can't keep up) step down; 5 s of
    windows with the p90 within 1.3× step up; a level that fails within 3 s
    of being tried is locked out until the frame is resized. The first 2 s
    and 60 busy frames of a load don't count (the first scroll's one-off
    costs). Earlier rules (the fastest interval, p90/p75 over 30 frames)
    dropped a level on ordinary sweeps at 1728×1117@2, from bunched missed
    vsyncs in headless Chromium. It needs frames at rest to learn the
    refresh, so it doesn't engage under `?freeze=1` or reduced motion (the
    loop sleeps at rest). `?adapt=0` holds full resolution; `data-quality`
    gives the current step. Verified in headless Chromium on the M4: holds
    1 through repeated full sweeps at 1728×1117@2 (9 fresh loads),
    1440×900@2 and 393×852@2; steps down under a forced overload
    (`?off=skip`) and climbs back after a resize; no blank frame at a
    change.
  - **Crests on the GPU.** The ridge outlines (the control points'
    noise heights and the Catmull-Rom→Bézier curve through them, one sample
    per device column) come from a render-to-texture pass,
    `crestShader.js`, into the R32F crest texture that `mistShader.js`
    samples. A frame is then two draw calls, and the CPU only sets uniforms.
    The studio's sin-based lattice hash isn't portable in float32, so the
    shader never hashes: `hashTable.js` precomputes every hash a frame can
    need in JS doubles, into a static texture with one row per
    (ridge, octave/`d` layer). It's rebuilt only when the frame size changes or
    the noise offset leaves its range (a theme switch), never per frame.
  - **CPU fallback for crests.** Without `EXT_color_buffer_float`, if the
    float target or hash table can't be built, or with `?crest=cpu`, the crests
    are computed by `layout` + `sampleCrest` on the CPU and uploaded as before.
    Both paths render pixel-identical frames (parity diff 0.00, also
    mid-drift). `data-crest="gpu|cpu"` on the scene wrapper says which ran.
  - **Idle drift.** A recipe's `idle: { seedDrift, period }` breathes the seed
    ±`seedDrift` on a `period`-second sine at rest, so the ridges slowly
    shift. At rest the drift, the wind and the veils share one `IDLE_HZ`
    (30) tick in `MistCanvas.jsx` (`0.2.4`; it was 60 for the crests, and
    every frame for a moving veil): at the drift's fastest a ridge moves
    about .09 px per update, so a faster rate looks the same and costs GPU
    work. About 48 → 26 draws a second at rest. Scroll, switches and the
    spring still redraw every frame. It's off under reduced motion and `?freeze=1`,
    and only runs while the scene is on screen. It pauses for a switch: the
    drift, per ridge (with its scroll gain), is kept as the switch starts
    and fades on the switch's clock (`orbit.drift`, `seedOffset()` =
    `orbit.drift × (1 − e)`, `0.2.7`; a bare `+offset` in the start seed
    made gain ≠ 1 ridges jump on a scrolled switch's first frame); on
    landing the drift restarts from zero at the target. The fade (≤ 1.25)
    is below the smallest seed advance (2.25), so the seed still only
    increases. The layered fallback doesn't drift. Measured on an M4 (prod, idle
    main-thread ms/s at 1440×900@2 / 393×852@2 / 3440×1440@1): drift off
    36/35/42, GPU crests at 60/s 56/39/59, CPU crests at 60/s 92/72/91.
    Switches (`0.1.7`, sky turn with keyframed palettes): GL holds 120 fps,
    p95 ~9.5 ms, max 10.4 ms, no frame over 20 ms at every viewport. (These
    are historical, from the 60 Hz tick; `0.2.4`'s are under "GL cost".)
  - **Lost context.** `onFail` gets `err.lost`; `AtmosphereField` shows the
    layered fallback and retries WebGL every 2s, up to 3 times.
- **Layered (fallback)** — `components/gradient/layers/`, used when WebGL2 is
  missing or the shader fails to build (and while a lost context recovers).
  The SVG engine it replaced redrew one flat picture every frame, blur
  filters and all, which is what made it choppy. Here the scene is stacked
  DOM layers in the shader's paint order, so the browser composites instead
  of repainting: sky, sun/moon glow and disc, and per ridge a fill, a crest
  rim, a light glow and a veil, then air and grain.
  - All of it is CSS gradients except each ridge's silhouette:
    `ridgeMasks.js` computes it as an alpha mask with the shader's own maths
    (slope-corrected Gaussian edge, rim stroke) at the frame's device size,
    only for the rows the edge crosses, and hands it to CSS as a PNG blob.
    Each mask is decoded before CSS points at it: Safari paints a masked
    layer whose mask is still loading as if it had no mask, and doesn't
    repaint when it arrives (the ridges showed as solid bands).
  - **The ridges keep one silhouette**: the scene the page loaded with,
    through every switch. Only their light changes, from the keyframed
    palette. (Reshaping means recomputing masks every frame, which is
    WebGL's job, and a cross-fade between two silhouettes looked worse.) The
    masks are rebuilt 120 ms after a resize. No idle drift.
  - **Under the camera** (`0.2.6`: the same `0.2.1` descent as GL,
    `DESCENT`/`descentAt`, `layout`'s `ranges`, `frameAt`) each ridge is a
    masked edge band plus a solid body below it, both in a camera wrapper
    (`translateY(foot − base) scale(s)`, `will-change`), cropped to what's
    on screen in 5% steps; ridges hidden behind an opaque nearer one are
    cropped out (as GL's hidden-ridge skip). The sky's ramp is stretched and
    slid by a transform (`skyAt`). Masks are built once for all nine ridges
    over their widest span (`frameAt(descentAt(about))` sampled at 41
    points per recipe, reduced motion included): fill, rim and glow, 27 in
    all. The recipe's own ridges keep their resting blur (exact at scroll
    0, within a px or two of GL's under the camera); world ranges are baked
    at their `about` 1 blur over their scale there. A scroll frame is one
    rAF paint: no React renders, no mask rebuilds.
  - **The `0.2.2`/`0.2.5` look.** `scrollHaze`, `descentPaint`/`blendPaint`,
    `flat`/`FAR_VEIL`, `DESCENT_VEIL`, `DESCENT_AIR` and `hiddenAt`, as GL.
    Ridge light from the shared `ridgeLightAt` (`camera.js`, which GL maps
    to uniforms): a per-ridge glow mask (Phi × a falloff down from the
    crest, baked in ridge space so it scales freely), the cool shade folded
    into the fill/body stops, the light screened over the fill
    (`background-blend-mode: screen`, no backdrop read), and its column
    across the frame a fixed alpha mask (`BEAM`, exp(−u²) over ±3 spreads)
    placed and sized by a transform; veils and air take the light's `mist`
    colour. The setting sun and moon use `sunLook.js`'s helpers (`MOON_GLOW`,
    `gaussStops`, `setDisc`, `sunWash`, `rimWash`, `mixRGB`): halo, setting
    disc, bloom ring, horizon wash and spill (a solid colour under a
    Gaussian mask, moved by a transform), rim tint.
  - **Scroll cost.** Whatever moves is a transform on its own layer
    (`will-change` on ridge parts, sky, bodies, beam, wash). While
    scrolling, colour repaints are staggered: ridges take turns so no
    layer's colour is more than `STAGGER_MS` (30 ms, 4 frames at 120 Hz)
    old, every layer still moves every frame, and one full paint lands when
    the scroll settles. Switches, resizes and rest paint everything.
    Accepted differences from GL: no idle drift or reshaping, no wind, an
    anti-aliased edge about s× narrower, and colours up to 30 ms behind
    mid-scroll.
  - At rest nothing runs on the main thread: the veils drift and breathe on
    Web Animations (compositor), with the studio's CSS timings. A switch runs
    `orbit.js` on one rAF clock. The moon's face image is made when the
    browser is idle after load (within 0.8s), so the first sunset doesn't
    stall on it.
  - Measured on an M4 (prod, `0.1.8`): switches hold 109–120 fps, p95
    9.1–16.7 ms, at most one frame over 20 ms per run; ~0.9–1.4 s main-thread
    time over four switches (GL 1.5–1.9 s; the SVG engine took ~3.3 s and
    dropped 52 frames per run at 3440×1440). Idle 31–63 ms/s. `0.2.0`
    (headless M4): switches 120 fps, p95 8.4 ms; scroll 119.4–119.7 fps, at
    most one frame over 20 ms; idle 86–103 ms/s. Parity with GL at `0.2.0`:
    worst mean .67, p99 3 (at rest and mid-scroll). `0.2.6` (1440×900@2,
    393×852@2, 3440×1440@1, against a `0.2.5` build the same day): scroll
    sweeps 118.8–119.7 fps, p95 8.5 ms, no frame over 20 ms (was 111–119,
    0–5 over; the ridge light before the stagger cost 1440×900@2 ~100 → 57
    fps); switches 116–120 fps, at most one frame over 20 ms, 1.7–1.75 s
    main thread over four (was 1.3–1.6); idle 54–80 ms/s (was 40–77, from
    the extra layers).

Both are dynamically imported, so neither is in first-load JS. They must stay
visually identical at rest and under the camera: `npm run parity` (see
`scripts/README.md`) compares `layers` against `gl` across viewports, themes
and scroll positions (`--scrolls`, default 0, .5, 1: 42 cases) and fails
above a mean of 2/255 or a p99 of 24. At `0.2.6` all 42 pass (worst mean
1.06, p99 10; `0.2.5` passed 14, at scroll 0 only), and the hit-target
check (`--sun-tolerance`) is within .02 px in every case for both
renderers. Run it, and `npm run perf`, whenever a renderer
or the recipe maths changes. Shared, so the two can't drift: what a ridge is
painted with (`ridgePaint`, `rimWidth`, `grainOpacity` in `mistGeometry.js`),
the sun's look (`sunLook.js`), the moon's face (`moonFace.js`), the switch
(`orbit.js`), the camera maths and ridge light (`camera.js`) and where the body is painted
(`sunSpot.js`, which the hit target follows). Hooks the renderers honour:

| Hook | Meaning |
|---|---|
| `?renderer=gl` / `?renderer=layers` | Force a renderer |
| `data-renderer` on the scene wrapper | Which one actually painted |
| `?freeze=1` | Veils at rest phase (no drift, full opacity); GL: no wind over the meadow |
| `?scroll=0.5` | Pin the descent's `about` (`components/scroll/descent.js`); the scroll layer then publishes nothing |
| `?grain=0` | No grain layer (grain is random per load) |
| `data-sun-cx` / `data-sun-cy` | Painted sun centre, CSS px |
| `?crest=cpu` (GL) | Force the CPU crest path |
| `data-crest` on the scene wrapper (GL) | Which crest path ran: `gpu` or `cpu` |
| `?driftAt=0.25` (GL) | Pin the idle seed-drift offset, even with `?freeze=1`, to compare crest paths mid-drift |
| `data-seed` on the scene wrapper | The seed last painted (GL: drift included) |
| `data-ready` on the layered scene | Set once its ridge masks are painted |
| `data-busy` on the sun button | Set while a switch runs (clicks are ignored) |
| `data-sun-toggle` on the sun button | Stable selector for the harness (not `aria-pressed`: the button has none, its label says the action) |
| `?off=rim,veil` (GL) | Compile shader features out, for profiling (`OFF_FLAGS` in `mistShader.js`: `skip`, `wash`, `bodies`, `ridges`, `slope`, `light`, `rim`, `meadow`, `veil`, `air`, `grain`); `#define`s at the `// @defines` marker, no cost without the flag |
| `?bench=200` (GL) | Redraw the settled frame that many times, synced by a 1-px `readPixels`; writes `data-bench` and `data-bench-base` (a bare clear) on the scene wrapper, as "median p90" ms |
| `?adapt=0` (GL) | Hold full resolution (no adaptive quality) |
| `data-quality` on the scene wrapper (GL) | The current resolution step (1, .875 or .75 of the DPR) |

When changing the look, change `mistGeometry.js` / `mistShader.js` and the
layered renderer together, then re-run parity. One trap already hit: pass
bounded arguments to `tanh`/`exp` in the shader — some GPUs (and
SwiftShader) return NaN once `exp` overflows, which blanked every ridge
fill.

**Framing, both renderers** (`layout` in `mistGeometry.js`):
- **Aspect lock.** Ridge noise is sampled per unit of `height × aspect` (the
  recipe's studio canvas, 2048×1494) around the frame centre, so any
  viewport crops or extends the range instead of squashing it: portrait
  phones show fewer, correctly proportioned peaks; ultrawides show more.
  Ridge paths run 3% of the height past each edge so their blur never fades
  out inside the frame. Veil width uses `max(width, height × aspect)`.
- **Sun clamp.** The sun's x is clamped 1.5 radii (0.078 × height) clear of
  either edge, or centred on a frame too narrow for that.
  `SunToggle.module.css` mirrors the clamp in CSS with `cqh` units — keep the
  two in step.

**Sun and moon, both renderers:**
- **The sun** (`sunLook.js`): at rest a near-white, fully opaque disc
  (`DISC_LIFT`, `DISC_ALPHA`) with a warm limb and a two-layer glow (a tight
  halo plus a wide faint haze, as piecewise-linear stops the shader and a
  CSS gradient both trace). As it sets or rises it deepens toward
  `SUNSET_COLOUR` and flattens by up to `SQUASH` of its height; its sky wash
  is kept low (.2) so it never dissolves into a sunset sky.
- **The moon** (`moonFace.js`): a greyscale shade map of seas, craters and
  Tycho's rays, from a fixed seed, multiplied into its disc (`.85` opacity).
  Its glow fades out to 3.4r on a smoothstep (GL from `0.2.2`, the layered
  glow from `0.2.6` as `MOON_GLOW`'s 17 stops: the old linear fade left a
  visible edge there).

### How the transition works

Two clocks, each with one job:

- **At rest, the spring.** The studio's `Wl` helper is **exponential
  smoothing**, not a real spring: `value += (target - value) * (1 - e^(-rate
  * dt))`, with dt in seconds clamped to [.001, .05] and a settle threshold
  of 8e-4 × max(1, |target|). No overshoot, settling in about `5 / rate`
  seconds. In the GL renderer it holds the resting scene (geometry dials,
  the sun colour, every stop's RGB). **Keep `ms ≈ 5000 / springRate`** so the
  spring has settled by the time a switch lands and hands the scene back to
  it. The sun colour is sprung rather than derived per frame (`STOPS_AT` in
  `MistCanvas.jsx`): the studio's `sunColour` picks the brightest stop and
  branches on a luminance threshold, which pops when fed in-between stops.
  The layered renderer has no spring: at rest it paints the recipe.
- **In a switch, the sky's turn** (`components/gradient/orbit.js`, shared by
  both renderers). One sine ease-in-out over the target's `transition.ms`
  carries everything, so nothing runs ahead of anything else:
  - **Bodies.** One arc (an ellipse through both resting spots, peaking
    `apex` from the top) turns right to left — the viewer faces north. The
    outgoing body carries on and sets behind the far ridge on the left while
    the incoming one rises from behind it on the right, in parallel; both
    turn through the same angle. The arc meets the ridges at `SET_ANGLE`
    (0.3 rad), not straight down, and sideways travel past the resting spots
    is stretched by `SET_SPREAD` (1.3), so the sun slants left as it sets. On
    portrait frames the stretch narrows (`spreadAt`: `SET_SPREAD` ×
    min(1, aspect / `REACH_ASPECT` 1.2)), so the legs stay inside the frame:
    at 393×852 the arc spans .24–.80 of the width (was .17–.87); landscape is
    unchanged. A body's glow fades as its disc goes under. Each keeps its own
    colour but leans toward the sky behind it (`wash`): the moon is pale in a
    bright sky.
    The moon fades out over the first ~30% of a morning (a 6 a.m. moon)
    rather than setting, and fades in as it clears the ridges at dusk.
  - **Palette.** The sky passes through the target's `via` keyframes on a
    monotone cubic in oklab (`skyKeys.js`), so it hits every keyframe with no
    jolt. The ridges' colours are derived from the palette (and fade toward
    its mist band, `stops[1]`, at their feet), so they're relit every frame.
    Keep a keyframe's near ridges (`stops[4]`, `stops[5]`) dark: in a pale
    palette, lighter ones fade into each other and the front ridge vanishes.
  - **Geometry (GL).** The dials — ranges, horizon, haze, peaks, sharp, sun,
    seed — ease from what was last painted (the idle-drifted seed included)
    to the target's, so the ridges reshape as the sun travels. Roughly one
    silhouette change per unit of seed × .73: keep day and night seeds
    close. The seed **only increases** (`beginOrbit(…, { forward: true })`),
    at `SEED_RATE` (1.5/s) from whatever is painted: +6 over the 4s into
    dusk, +2.25 over the 1.5s into night. So the ridges always drift the way
    the sky turns, at one pace in both directions. After the first switch a
    scene no longer rests on its recipe's seed; `MistCanvas` carries the
    offset (`seedShift`) so the spring rests where the switch landed, and a
    reload starts from the recipe's seed.
  - It starts from what was last painted (captured before the spring steps),
    so a switch never jumps on its first frame. Under reduced motion it's a
    cut.
- **The hit target follows the painted body, except mid-switch** (`0.2.3`).
  Each rebuild the renderer that paints publishes the body's centre to
  `sunSpot.js` (outside React, like the descent store), and `SunToggle`
  writes it to `--spot-x` / `--spot-y`; before a renderer has painted it
  places itself from the recipe, in CSS. Mid-switch the published spot is
  where the incoming body will land, so the target jumps straight there and
  ignores clicks (`data-busy`) for the switch's `ms`. At rest, at any scroll,
  it sits exactly on the painted sun or moon.
- **The landing (GL).** When a switch ends, the spring's vector is set to the
  target, so the landing frame no longer steps the whole sky slightly (a
  step there since the switch palette was keyframed).
- The sky **interpolates its stops**; it is not a crossfade. Two stacked
  opaque layers fading on opacity looked symmetric but wasn't: compositing a
  dark layer over a light one kills brightness far faster than the reverse.
  Don't reintroduce a layered crossfade, or a second animation loop beside
  the switch clock.
- **Sky ramp.** Every sky path (the GL sky texture, the layered sky, the CSS
  backdrop) comes from `skyRamp.js`: a monotone cubic (Fritsch–Carlson) in
  oklab through the recipe's stops at the `divs` positions. **Deliberate
  departure from the studio**, which draws straight oklab segments whose
  corners read as Mach bands (worst on moonlit's `#101828 → #3A4A6B` jump).
  Every recipe colour still lands exactly, with no overshoot.
- **One scene for the whole site.** `AtmosphereField` is mounted in the root
  layout, not in the pages, so navigating (the 404's "Back to the
  mountains", later sections) keeps the same running scene: sky, theme,
  seed and veils carry straight on. It's `position: fixed` behind the
  pages, sized to the large viewport (`top/left: 0`, `100% × 100lvh`, not
  `inset: 0`) so a phone toolbar sliding in or out never resizes the scene
  (the toolbar covers its foot instead); `Stage` uses `min-height: 100svh`
  for the same reason. It comes after the pages in the DOM, click-through except for the sun
  button, so **page content that sits over it needs a z-index** (the error
  copy uses 3). `global-error` has no layout and paints the static sky.
- **Backdrop.** `.atmosphere-field` paints each recipe's sky as a CSS
  gradient (`--sky-day` / `--sky-night`, generated from the recipes by
  `AtmosphereField`) behind the renderer. It shows before the renderer's
  chunk loads and in any frame it drops, so the page never flashes
  near-black. An inline script in `app/layout.jsx` sets `data-theme` from
  localStorage before first paint, so a night visitor's backdrop is night
  from the start.

### The camera (0.2)

Scrolling the home page's `about` track pulls the camera back from the
mountains, with a slight tilt down and a small rise, while the sky turns
toward evening. The maths is in `components/gradient/camera.js` (both
renderers run the `0.2.1` descent with `0.2.2`'s look, `0.2.3`'s switching
at any scroll and `0.2.5`'s resting light; the layered fallback caught up in
`0.2.6`): a **pure function of `about` and the recipe**, read every
frame and **never sprung**, so scrolling back retraces exactly. At
`about` = 0 every function is the identity: the resting scene is
pixel-identical to `0.1.11` (through `0.2.2` by day; at night `0.2.2`'s
smoothstep moon glow differs by a mean of .15), apart from `0.2.5`'s
resting ridge light (a mean of about .5 by day, .9 at night at 1440×900).

- **Progress.** `SmoothScroll` (root layout) publishes
  `about = (scrollY − trackTop) / (trackHeight − 100lvh)` to the store in
  `components/scroll/descent.js`, measured against a 100lvh probe so a
  collapsing URL bar doesn't move it. Track length is `TRACK_LVH` in
  `DescentTrack.jsx` (`about: 200`, so one screen of scroll). A page without
  a track publishes 0. On desktop Lenis (`autoRaf`) is imported when the
  browser is idle; before that, under reduced motion, and on touch-first
  devices (no Lenis at all: its non-passive touch/wheel listeners made a
  phone's toolbar judder in and out, a fix not yet confirmed on a real phone)
  a passive native listener publishes. Readers subscribe outside React, so a scroll frame renders
  nothing.
- **Camera (`0.2.1`; the fallback from `0.2.6`).** `DESCENT = { back: .4, tilt: .28, rise: .59,
  ranges }`, overridable per recipe (`scroll.descent`), scaled by `k` = the
  cosine ease of `about` (× `REDUCED_CAMERA` .3 under reduced motion; the
  colour change always runs in full). `layout`'s horizon `c` and ridge feet
  `base_b` imply a ground plane: ridge b stands at depth
  `z_b = (h − c) / (base_b − c)`, is drawn at `s_b = z_b / (z_b + back)`
  about (w/2, base_b), and its foot moves to
  `c − tilt·h + (1 + rise)·s_b·(base_b − c)`. The sky, sun and moon shift up
  by `tilt·h`. **A ridge's silhouette is fixed terrain**: the scroll only
  moves it and scales it uniformly (`frameAt`), so the front ridge slides
  back to about where the second was, and so on (the conveyor).
- **Ranges enter by geometry, never alpha.** Past the top, `layout`'s
  `ranges` add world ridges (depth `z`, world `height`, own `noise` index
  5–8): one in front (z .78, `stretch` 1.6) that starts `drop` .5·h under
  its place, wholly below the frame, and slides up from the bottom edge to
  become the new front ridge by `until` .85; and three far ones (z 13, 20,
  32) dropped .3·h under the far ridge's fill that rise into view from
  behind it by `until` .6. All are opaque (`fade` 1). Depth reads through
  colour: each ridge's `t` (colour, blur, rim, veil opacity) follows its
  foot's slot on the frame (`slotT`, the studio's slot curve), so far ranges
  merge into the haze. `stretch` widens a silhouette (its height is set
  that much lower in `layout`, its scale that much larger), keeping its
  proportions. Nine ridges in all, so no crest row is recycled; crest rows
  are ordered by `noise` (`uCrestRow`).
- **Far ranges step into the haze by depth** (`0.2.2`): `FAR_HAZE` .4 per
  doubling of depth past the far ridge, through a per-ridge `flat`
  (`FAR_FOOT` .5, `FAR_VEIL` .5 in `mistGeometry.js`). The distant ranges keep
  the far ridge's rim opacity, ease their blur to .4 of it, hold `veilAlpha`
  at the far value and get shallower veils (`max(.012h, .6d/z)`).
- **Idle drift** (the ridges' breathing) and the veils keep running at
  every scroll position. Drift is in noise units, so on-screen motion scales
  with a ridge's drawn size; under the camera each ridge's offset is scaled
  by a gain `g = min(DRIFT_GAIN_MAX 2.5, max(1/s, far lift / drawn lift))`
  (`driftGains`), so the shrunken and distant ranges visibly breathe too
  (mean motion per .1 seed at 1440×900: 5.26 px at rest, 4.40 at the end;
  3.61 in `0.2.1`). The crest pass takes a per-ridge offset (`uN[]`) and
  `layout` a `drift: { offset, gains }`, so GPU/CPU crest parity stays 0.00.
  Trade-off: the gain moves with scroll, so a drifted ridge reshapes slightly
  while scrolling (it still retraces exactly). Known: the drift still slows
  near zero at the ends of its 60 s sine.
- **Sky** (`0.2.2`). `SKY { top: .08, horizon: .24 }`, `skyAt` and the
  shader's `uSkyScale` redraw the ramp under the camera, so by the end the
  frame's top sits on `stops[0]` and the horizon on `stops[1]`. The haze
  thins toward the recipe's `scroll.haze` (`scrollHaze`).
- **Painted ridge colours** (`0.2.2`). `PAINT { crest: .1, foot: [.2, .55],
  rim: .3, rimA: .5 }`, `paintTone`, `descentPaint` and `blendPaint`: a clean
  ramp `stops[5]` → `[4]` → `[3]` → `[2]` → `[1]`, blended in over the
  studio's colours as the camera moves. The veils thin by up to
  `DESCENT_VEIL` .5 and the air band by up to `DESCENT_AIR` .5, which keeps
  the near ridges a rich violet rather than grey.
- **Ridge light** (`0.2.2`; mid-switch from `0.2.3`, in the fallback from
  `0.2.7`: `ridgeLightAt` keys on `orbit` and `orbit.e ?? 0`, not GL's
  `orbit.scene`, so the layered light no longer snaps at landing). `RIDGE_LIGHT` in `sunLook.js`
  (shader `uLitA`, `uShadeA`, `uLitCol`, `uShadeCol`, `uLitAt`, `uLitBase`):
  warm crest light, strongest in the sun's or moon's column and slanted per
  depth (parallax), over a cool multiplied shadow below. Mid-switch it
  follows the outgoing body and fades out over the first half, then comes
  up with the incoming one over the second (zero at e = .5), so it never
  jumps. **At rest too** (`0.2.5`, `RIDGE_LIGHT.rest`): `rest.a` .4 of the
  crest light and `rest.shade` .15 of the shadow; the sun's light is
  `rest.warm` .5 of the way from its own colour to `SET_COLOUR` (warm, not
  grey, on the violet), and the moon's is `rest.moon` .7 × the sun's (its
  full-set `moon` .35 barely showed at rest). Each goes to its full setting
  value on the body's `low`, so the end of the scroll is pixel-identical to
  `0.2.4` and nothing jumps in between. Both renderers take it from one pure
  `ridgeLightAt({ lit, orbit, stops, M, ts, w, h })` in `camera.js`
  (`0.2.6`; identical to GL's old inline code over 200,000 random cases).
- **Sun and moon set** (`0.2.2`, `bodyAt`). The gap between the body and the
  horizon closes, on `k^SET_EASE` (1.6), to `scroll.body.set` radii below
  it, while `dx` leans it left, so it sinks into the ridges (by day about
  15% hidden at .64 and 50–70% by the end at 1440×900, depending on the
  silhouette). It stays round and the same size.
  `bodyAt(b, recipe, frame, { w, h, restY, look })` takes `look` as a 0…1
  weight on the edge clamp and the setting look (colour, halo, glow gain,
  alpha, `set`). At rest it's 1; mid-switch (`0.2.3`) the orbit is computed
  unscrolled and then offset, and the outgoing body carries 1 − e, the
  incoming e (both renderers), so switching and scrolling combine on every
  frame. The hit target's landing probe is a bare position (no `col`), with
  the clamp. `bodyDrop` gives the descent's move of a body (dx, dy, low).
  `hiddenAt` (both renderers; the fallback from `0.2.6`) sets the arc's "fully
  hidden" line, which `orbitBodies` takes as `hidden`: the far ridge's foot
  as the camera has moved it, plus 1.25r, taken back into the unscrolled
  sky (the incoming body's dy undone), never above restY + r. Under scroll
  the arc can leave the top of the frame (down to −.04h at `about` 1).
  While scrolling the sun no
  longer leans toward the sky colour, so it stays its own light source.
  Its setting layers (`sunLook.js`, none at rest): `SET_COLOUR` `#F8B45E`
  at `SET_MIX` .5, a hot core (`SET_CORE` .8), a warm limb (`SET_LIFT`
  .18), `SET_BLOOM`, a low wide halo (`SET_HALO`) and `SET_WASH`, a horizon
  wash that tints the sky, lights the rims and spills over the crests. The
  moon warms to an ember amber (`MOONSET`) with its seas still readable;
  the warmth shows clearly only late in the scroll.
- **Meadow.** `groundPaint` (4 stops, `GROUND_AT`) fills below the front
  ridge's foot, painted between its rim and its veil; the air band ends at
  that foot (`airAt`). Wind over it (`WIND`) is GL-only and off under
  `?freeze=1`.
- **Time of day.** `scroll.keys` are palettes by `about` after the resting
  one, through `skyKeys.js`. Mid-switch, `scrollPaletteSwitch` blends both
  recipes' overlays on the switch's progress, and the camera amounts blend
  too.
- **Sun toggle.** Clickable at every scroll position (`0.2.3`): it follows
  the painted body (`sunSpot.js`). Verified with a scripted switch-and-scroll
  harness on a fake clock (prod, headless): the largest frame step against
  its neighbours fell from 167–175 at `about` 1 and 28–33 at .5 (`0.2.2`) to
  2.0–4.4; scrolling 0 → .7 at night during a switch, from 10–13 to 2.1–2.5.
  Since `0.2.7`, `npm run switch` checks every switch frame by frame, both
  renderers at scroll 0/.5/1 (worst step ×2.9 of its neighbours, limit
  ×3). The veils' swing (`mist.drift`) blends from the outgoing scene's to
  the incoming's on `e` in both renderers (it jumped on the first frame).
- **GL cost.** The hash table is sized once for the widest scale
  (`descentWidest`), so a scroll frame only sets uniforms and runs one crest
  pass. GPU/CPU crest parity is still 0 (24 cases, `driftAt` .25/.4).
  Measured on an M4 (prod, `0.2.2`): scroll sweeps 118.8–119.5 fps, p95
  9.0–9.3 ms, no frame over 20 ms; idle 62–65 ms/s with drift; switches
  120 fps. `0.2.3`, run back to back with a `0.2.2` build on the same day
  (1440×900@2): scroll sweeps 109.6–112.2 fps against `0.2.2`'s 111.3–112.5
  (both p95 16.6 ms, no frame over 20 ms), so no regression; idle 53–57 ms/s
  against 71–75; switches 120 fps, p95 9.3 ms. A switch started at the
  bottom of the track holds 105–120 fps. `0.2.4` (the hidden-ridge skip,
  under "Renderers"): GPU ms per frame (`?bench`, median of three
  interleaved runs, scroll 0 / scroll 1, budget 8.33) 1728×1117@2 6.8 → 5.2
  / 12.8 → 6.0; 1440×900@2 4.5 → 3.4 / 8.1 → 4.3; 393×852@2 .9 → .7 /
  1.9 → .5; 3440×1440@1 4.4 → 3.2 / 7.8 → 3.7. `npm run perf` with
  `?adapt=0`: 1728×1117@2 scroll sweeps 117–118 fps, p95 9.1 ms, no frame
  over 20 ms (was 70–73 with 12–15 over); 1440×900@2 120 (was 89–112); idle
  main thread about 43 ms/s (was ~50); switches level. The profile that
  led there: the ridge loop was 80–90% of a frame (rims 2.6 ms, ridge light
  1.4, veils 1.3, bodies 1.3, slope 1.0, meadow .7, wash .5), and scroll 1
  cost about double scroll 0 (nine ridges instead of five, plus the
  scroll-only light, meadow and wash). 1728×1117@2 now meets the budget.
  Known gap: perf's headless wheel sweep doesn't quite reach the bottom of
  the track. `0.2.5` (the ridge light now runs at rest), against a `0.2.4`
  build on the same day, 1728×1117@2 at scroll 0: `?bench` median 7.0 /
  6.6 ms (day / night) against 6.5 / 6.6, about +0–.5 ms, inside
  run-to-run noise; `npm run perf` with `?adapt=0` (1728×1117@2,
  1440×900@2, 393×852@2): switches 120 fps, p95 9.3 ms, 1.5–1.7 s main
  thread over four (was 1.6–1.9); idle 32–38 ms/s (was 37–42); scroll
  sweeps 118.8–120 fps, no frame over 20 ms. Level.

Planned: `0.2.8` (the audit's clean-up): see `ROADMAP.md`.

### Adding a scene

1. Add a recipe under `components/gradient/recipes/`, with its `body`
   (`'sun'` or `'moon'`) and a `transition` (`springRate`/`ms`, `apex`, and
   any `via` skies on the way into it), and a `scroll` (`keys`, `body`,
   `meadow`, optionally `haze` and `descent`) for the `0.2` stretch. Under the camera `stops[0]` is the sky
   overhead, `stops[1]` the horizon glow and the haze the distant ranges
   fade into, and `stops[2]`–`[5]` the ridges far to near.
2. Register it in `components/gradient/themes.js` with an `id`, `label` and
   `next` (the cycle is defined by the themes, not the provider).

## Open Tasks

| Task |
|---|
| Content layers: real projects, resume, dev log, contact (the descent and the desk: see `ROADMAP.md`) |
| Compose the scroll primitives: SmoothScroll is live (`0.2.0`); SplitText/Reveal/MagneticCard still unused |
| `0.2.8`: the repo audit's low-risk clean-up (dead code, duplicate helpers, docs restructure), pushed after review (`ROADMAP.md`) |
| Ship hygiene before `1.0.0`: see `ROADMAP.md` (404, OG, JSON-LD, robots/sitemap/llms.txt, favicon, H1, SSR content, bundle) |
| Trust, privacy and accessibility (`ROADMAP.md`): analytics (provider on hold) and `/privacy` with `0.4`, form consent, keyboard, contrast, third-party audit; no fabricated facts |
| Decide whether an admin surface is still wanted |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
