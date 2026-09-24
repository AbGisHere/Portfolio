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
plans: the ship-hygiene gate for `1.0.0`, and a device scene (not in scope
for `0.1.x`) where projects open inside a laptop/phone. The device screen is a painted background with
project cards, not an OS.

## Versioning

The rebuild goes layer by layer, and the version line tracks which layer:

| Line    | Scope                                                        |
|---------|--------------------------------------------------------------|
| `0.1.x` | Background / atmosphere layer (current, near complete)       |
| `0.2.x` | The next scroll section, most likely about me                |
| `0.3.x` | Projects: the laptop/phone device scene (`ROADMAP.md`)       |
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
| `components/ErrorScreen` (404, `error.jsx`, `global-error.jsx`) | The current scene, type and palette. The live pages use the real atmosphere; `global-error` uses the recipes' skies as CSS. A new layer style belongs here too. |
| `app/opengraph-image.jpg` / `twitter-image.jpg` | A fresh render of the current scene |
| `app/icon.svg` / `apple-icon.png` | The current palette and mark |
| `app/site.js` / metadata | Real role and description. No claims beyond PRODUCT.md's evidence. |
| JSON-LD (`app/layout.jsx`) | The same facts, plus links that actually exist |
| `app/sitemap.js` | Every live route, nothing dead |
| `public/llms.txt` | Current content, projects and links |

### Pre-push checks

Before every push, verify against a production build (`npm run build &&
npm run start`), not the dev server. Report what fails. Don't push around it
silently. Items marked *(once built)* start applying when the matching
`ROADMAP.md` "Before 1.0.0" item lands. Until then, note them as known gaps.

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

## Commands

```bash
npm run dev       # next dev
npm run build     # next build
npm run start     # next start
npm run test      # Playwright e2e tests
```

## Tech Stack

- **Next.js 16** (App Router), React 19, plain JS/JSX (no TypeScript).
- The atmosphere: a WebGL2 renderer (`components/gradient/gl/`) drawing the
  animated mountain scene from recipe files, with the generated SVG engine it
  was ported from (`components/gradient/engine.js`) as the fallback.
- **GSAP + ScrollTrigger** and **Lenis** for scroll choreography. The
  primitives exist but nothing composes them yet.
- Plain CSS, structured rather than monolithic: **CSS Modules** beside each
  component (`Component.module.css`), with `app/globals.css` limited to
  tokens, reset and base type, and `styles/utilities.css` for global helpers
  like `.visually-hidden`. No Tailwind. New component styles go in the
  component's own module, never in `globals.css`. Global classes the
  generated engine emits (`.feral-gradient-export`) are reached with
  `:global()` inside the owning module.
- Fonts via `next/font/google` in `app/fonts.js`: **Unbounded** (display) +
  **JetBrains Mono** (body/labels), exposed as `--font-display` /
  `--font-mono` on `<html>`. Don't redefine those variables in CSS, because
  that bypasses next/font's size-adjusted fallbacks.

## Project Structure

```
app/
  layout.jsx      — metadata (title template, canonical, OG), JSON-LD, theme script, ThemeProvider
  page.jsx        — home: server-rendered h1/intro (visually hidden) + atmosphere
  not-found.jsx   — 404        ┐
  error.jsx       — route error ├ all render components/ErrorScreen
  global-error.jsx — root-layout failure (own <html>, static sky, no engine) ┘
  fonts.js        — next/font instances, shared by layout and global-error
  site.js         — shared site facts (url, name, role, links)
  robots.js, sitemap.js     — generated /robots.txt and /sitemap.xml
  icon.svg, apple-icon.png  — favicon / iOS touch icon
  opengraph-image.jpg, twitter-image.jpg (+ .alt.txt) — share cards
  globals.css     — tokens, reset, base type only
styles/
  utilities.css   — global helpers (.visually-hidden)
public/
  llms.txt        — plain-markdown summary for LLM agents
components/
  Stage.jsx (+ .module.css)           — full-viewport shell for every scene
  AtmosphereField.jsx (+ .module.css) — backdrop sky + renderer pick (GL/SVG) + sun toggle
  SunToggle.jsx (+ .module.css)       — hit target on the painted sun; sits out each switch
  ErrorScreen.jsx (+ .module.css)     — shared 404/error layout, palette-tinted scrim
  ThemeProvider.jsx                   — day/night state, localStorage, `data-theme`
  gradient/
    gl/
      MistCanvas.jsx (+ .module.css) — WebGL renderer (default): canvas, clocks, textures
      mistGeometry.js  — one-for-one port of the engine's MIST maths
      mistShader.js    — the fullscreen fragment shader
      crestShader.js   — GPU crest pass (ridge outlines → R32F texture)
      hashTable.js     — precomputed noise lattice hashes for the crest pass
    engine.js          — generated SVG engine, the fallback renderer (see below)
    orbit.js           — a switch: the sky turning, bodies, palette keys (both renderers)
    skyKeys.js         — a palette partway through a switch's keyframes
    skyRamp.js         — the smooth sky ramp every sky path uses
    sky.js             — a recipe's sky as a CSS gradient (backdrop, static sky)
    themes.js          — theme ids -> recipes, and the toggle cycle
    recipes/
      dusk-ember.js    — day scene
      moonlit.js       — night scene
  SplitText.jsx, Reveal.jsx, MagneticCard.jsx, SmoothScroll.jsx
                       — unused primitives, kept for the content layers
```

## The atmosphere

The page is one full-bleed scene: mountain ridges under drifting haze, with a
sun in the sky. Clicking the sun turns the sky: dusk → night, the sun sets
down-left behind the ridges as the moon rises on the right, through a blue
hour; night → dusk, the moon goes over and fades with the morning while the
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
```

Into dusk is 4s (the sun crosses the whole sky, through dawn at .22, day at
.58 and late afternoon at .8); into night is 1.5s (a short hop, through blue
hour at .5). `via` palettes use the same six bands as `stops`.

### Renderers

Two renderers draw the same recipe, and the page picks one after mount
(`AtmosphereField`), with the CSS backdrop covering the gap:

- **WebGL (default)** — `components/gradient/gl/`. `mistGeometry.js` is a
  one-for-one port of the engine's MIST maths (ridge noise, layout with
  patches 7–8, colour mixing in oklab, veil timings), `mistShader.js` is one
  fullscreen fragment shader compositing sky → sun/moon glow and disc (two
  mid-switch) → per ridge (fill, blurred edge, crest rim, veil) → air → grain
  in the SVG's paint order, and `MistCanvas.jsx` runs the spring and the
  switch clock (`orbit.js`). At rest the veils' drift
  uniforms change and the frame is redrawn once they've moved ~0.2 device px.
  Canvas DPR is capped at 2. Reduced motion freezes the veils and makes the
  switch a cut.
  - **Crests on the GPU.** The ridge outlines (the control points'
    noise heights and the Catmull-Rom→Bézier curve through them, one sample
    per device column) come from a render-to-texture pass,
    `crestShader.js`, into the R32F crest texture that `mistShader.js`
    samples. A frame is then two draw calls, and the CPU only sets uniforms.
    The engine's sin-based lattice hash isn't portable in float32, so the
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
    shift. Crest updates are capped at `IDLE_HZ` (60) in `MistCanvas.jsx`:
    at this speed ridges move under a pixel per update, so 120 looks the same
    and doubles the GPU work. It's off under reduced motion and `?freeze=1`,
    and only runs while the scene is on screen. It pauses for a switch: the
    switch starts from the drifted seed and, on landing, the drift restarts
    from zero at the target, so the ridges never jump back to the base seed
    first. The SVG fallback doesn't drift. Measured on an M4 (prod, idle
    main-thread ms/s at 1440×900@2 / 393×852@2 / 3440×1440@1): drift off
    36/35/42, GPU crests at 60/s 56/39/59, CPU crests at 60/s 92/72/91.
    Switches (`0.1.7`, sky turn with keyframed palettes): GL holds 120 fps,
    p95 ~9.5 ms, max 10.4 ms, no frame over 20 ms at every viewport.
- **SVG (fallback)** — the generated `engine.js`, loaded only when WebGL2 is
  missing, the shader fails to build, or the context is lost. It re-renders
  the whole SVG through React every frame, which is what made switches janky
  on large or high-DPR screens. Switches run the same `orbit.js` maths
  through its `useSkyOrbit` hook (patch 10).

Both are dynamically imported, so neither is in first-load JS. They must stay
visually identical: `npm run parity` (see `scripts/README.md`) compares them
at rest across viewports and themes and fails above a mean of 2/255 or a p99
of 24. Run it, and `npm run perf`, whenever either renderer or the recipe
maths changes. Hooks both renderers honour:

| Hook | Meaning |
|---|---|
| `?renderer=gl` / `?renderer=svg` | Force a renderer |
| `data-renderer` on the scene wrapper | Which one actually painted |
| `?freeze=1` | Veils at rest phase (no drift, full opacity) |
| `?grain=0` | No grain layer (grain is random per load) |
| `data-sun-cx` / `data-sun-cy` (GL) | Painted sun centre, CSS px |
| `?crest=cpu` (GL) | Force the CPU crest path |
| `data-crest` on the scene wrapper (GL) | Which crest path ran: `gpu` or `cpu` |
| `?driftAt=0.25` (GL) | Pin the idle seed-drift offset, even with `?freeze=1`, to compare crest paths mid-drift |
| `data-seed` on the scene wrapper (GL) | The seed last painted, drift included |
| `data-busy` on the sun button | Set while a switch runs (clicks are ignored) |

When porting anything new from the studio, change `mistGeometry.js` /
`mistShader.js` and the engine together, then re-run parity. One trap
already hit: pass bounded arguments to `tanh`/`exp` in the shader — some GPUs
(and SwiftShader) return NaN once `exp` overflows, which blanked every ridge
fill.

### How the transition works

Two clocks, each with one job:

- **At rest, the spring.** The engine's `Wl` helper is **exponential
  smoothing**, not a real spring: `value += (target - value) * (1 - e^(-rate
  * dt))`, with dt in seconds clamped to [.001, .05] and a settle threshold
  of 8e-4 × max(1, |target|). No overshoot, settling in about `5 / rate`
  seconds. It holds the resting scene (geometry dials, the sun colour, every
  stop's RGB); the GL renderer runs the identical spring over the identical
  vector. **Keep `ms ≈ 5000 / springRate`** so the spring has settled by the
  time a switch lands and hands the scene back to it.
- **In a switch, the sky's turn** (`components/gradient/orbit.js`, shared by
  both renderers). One sine ease-in-out over the target's `transition.ms`
  carries everything, so nothing runs ahead of anything else:
  - **Bodies.** One arc (an ellipse through both resting spots, peaking
    `apex` from the top) turns right to left — the viewer faces north. The
    outgoing body carries on and sets behind the far ridge on the left while
    the incoming one rises from behind it on the right, in parallel; both
    turn through the same angle. The arc meets the ridges at `SET_ANGLE`
    (0.3 rad), not straight down, and sideways travel past the resting spots
    is stretched by `SET_SPREAD` (1.3), so the sun slants left as it sets. A
    body's glow fades as its disc goes under. Each keeps its own colour but
    leans toward the sky behind it (`wash`): the moon is pale in a bright sky,
    the sun warms low down. The moon fades out over the first ~30% of a
    morning (a 6 a.m. moon) rather than setting, and fades in as it clears
    the ridges at dusk.
  - **Palette.** The sky passes through the target's `via` keyframes on a
    monotone cubic in oklab (`skyKeys.js`), so it hits every keyframe with no
    jolt. The ridges' colours are derived from the palette (and fade toward
    its mist band, `stops[1]`, at their feet), so they're relit every frame.
    Keep a keyframe's near ridges (`stops[4]`, `stops[5]`) dark: in a pale
    palette, lighter ones fade into each other and the front ridge vanishes.
  - **Geometry.** The dials — ranges, horizon, haze, peaks, sharp, sun, seed —
    ease from what was last painted (the idle-drifted seed included) to the
    target's, so the ridges reshape as the sun travels. Roughly one
    silhouette change per unit of seed × .73: keep day and night seeds close.
  - It starts from what was last painted (captured before the spring steps),
    so a switch never jumps on its first frame. Under reduced motion it's a
    cut.
- **The hit target doesn't follow the sun.** `SunToggle` jumps straight to
  where the sun will land and ignores clicks (`data-busy`) for the switch's
  `ms`. At rest it sits exactly on the painted sun.
- The sky **interpolates its stops**; it is not a crossfade. Two stacked
  opaque layers fading on opacity looked symmetric but wasn't: compositing a
  dark layer over a light one kills brightness far faster than the reverse.
  Don't reintroduce a layered crossfade, or a second animation loop beside
  the switch clock.
- **Backdrop.** `.atmosphere-field` paints each recipe's sky as a CSS
  gradient (`--sky-day` / `--sky-night`, generated from the recipes by
  `AtmosphereField`) behind the engine. It shows before the engine's chunk
  loads and in any frame the engine drops, so neither ever flashes the page's
  near-black. An inline script in `app/layout.jsx` sets `data-theme` from
  localStorage before first paint, so a night visitor's backdrop is night
  from the start.

### Engine patches

`components/gradient/engine.js` (the SVG fallback) is generated, minified,
and marked "do not edit", but carries several deliberate patches. **Re-exporting from the studio
will drop them**, so reapply:

1. `Wl(e)` → `Wl(e, k = 2)`, with `-9*l` → `-k*l`, so rate is a parameter.
2. `or(...)` takes a `rate` prop and passes it to `Wl`.
3. `uc` passes `rate: ee.transition?.springRate ?? 2` down to `or`.
4. `or` springs the colour stops alongside the geometry (`...Cx` / `Tx`).
5. `_s`'s `case "MIST"` returns `transparent` — the wrapper no longer paints a
   sky, because CSS can't interpolate a gradient.
6. `or` paints the sky itself: a `<linearGradient>` built from the sprung stops
   plus a full-bleed `<rect>` behind the sun and ridges. This is what makes the
   sky animate on the same clock, and symmetrically in both directions. The
   stops come from `Gk(stops, divs)`, which now just calls
   `components/gradient/skyRamp.js` (imported at the top of the file). `uc`
   passes `divs` down for this. **Deliberate departure from the studio:** the
   studio draws straight oklab segments between stops, whose corners read as
   Mach bands (worst on moonlit's `#101828 → #3A4A6B → #33415F` jump and
   reversal). `skyRamp` passes a monotone cubic (Fritsch–Carlson) in oklab
   through the same stops at the same `divs` positions — every recipe colour
   still lands exactly, with no overshoot and no corners — for both themes.
   The GL sky texture and the CSS backdrop (`sky.js`) use the same ramp, so
   all three sky paths match.
7. **Aspect lock.** `Xs(..., K)` takes the recipe's `aspect` (the studio canvas,
   2048×1494) via `or`'s `aspect` prop. Ridge noise is sampled per unit of
   `height × aspect` around the frame centre, so any viewport crops or extends
   the range instead of squashing it — portrait phones show fewer, correctly
   proportioned peaks; ultrawides show more. Ridge paths run 3% of the height
   past each edge so their blur never fades out inside the frame. Veil width
   uses `max(width, height × aspect)`.
8. The sun's x is clamped 1.5 radii (0.078 × height) clear of either edge, or
   centred on a frame too narrow for that. `SunToggle.module.css` mirrors the
   clamp in CSS with `cqh` units — keep it, the engine and `mistGeometry.js`
   in step.
9. **Sun colour springs.** The studio derives the sun colour (`tr`) from the
   stops each frame: it takes the brightest stop and branches on a 0.5
   luminance threshold. Fed in-between stops, that pops mid-switch. So `or`
   springs `tr(target stops)` as three extra channels in the `Wl` vector
   (`Sr, Sg, Sb`), and `I` is built from them. The GL renderer does the same
   (`STOPS_AT` in `MistCanvas.jsx`). At rest it's identical. (Mid-switch the
   bodies' colours come from patch 10 instead.)
10. **The sky's turn.** `or` takes the target recipe (`rcp`, passed by `uc`
    as `rcp: ee`) and calls `useSkyOrbit(Rc, [p,m,f,b,h,g,v], t)` from
    `orbit.js` right after the sprung stops `Tx`. Mid-switch it returns the
    eased geometry dials and keyframed palette, which overwrite the sprung
    ones before `Xs` lays out the ridges, and `orbitBodies` gives the two
    bodies (`Bd`), each washed toward the sky behind it with `skyAt`. The
    single sun ellipse + circle became one glow gradient (`mh0`, `mh1`),
    ellipse and circle per body; at rest `Bd` is the one sprung sun, drawn
    exactly as before. The hook tells a scene change by recipe name + stops,
    since `uc` may pass a fresh object each render.

Also: the top of the file needs `'use client'`, and the recipe it ships with
is renamed to `defaultRecipe` so the `recipe` prop can shadow it.

### Adding a scene

1. Add a recipe under `components/gradient/recipes/`, with its `body`
   (`'sun'` or `'moon'`) and a `transition` (`springRate`/`ms`, `apex`, and
   any `via` skies on the way into it).
2. Register it in `components/gradient/themes.js` with an `id`, `label` and
   `next` (the cycle is defined by the themes, not the provider).

## Open Tasks

| Task |
|---|
| Content layers: real projects, resume, dev log, contact (projects: see the desk scene in `ROADMAP.md`) |
| Compose the scroll primitives (SplitText/Reveal/MagneticCard/SmoothScroll) |
| Ship hygiene before `1.0.0`: see `ROADMAP.md` (404, OG, JSON-LD, robots/sitemap/llms.txt, favicon, H1, SSR content, bundle) |
| Decide whether an admin surface is still wanted |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
