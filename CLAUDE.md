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

| Line    | Scope                                            |
|---------|--------------------------------------------------|
| `0.1.x` | Background / atmosphere layer (current)          |
| later   | Page content, sections, real copy                |

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
  SunToggle.jsx (+ .module.css)       — hit target sitting on the painted sun
  ErrorScreen.jsx (+ .module.css)     — shared 404/error layout, palette-tinted scrim
  ThemeProvider.jsx                   — day/night state, localStorage, `data-theme`
  gradient/
    gl/
      MistCanvas.jsx (+ .module.css) — WebGL renderer (default): canvas, spring, textures
      mistGeometry.js  — one-for-one port of the engine's MIST maths
      mistShader.js    — the fullscreen fragment shader
    engine.js          — generated SVG engine, the fallback renderer (see below)
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
sun in the sky. Clicking the sun transitions to night as a single motion — the
sun slides across and recolours into a moon, ridges change height and
silhouette, haze thins, sky shifts to its night colours.

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

Plus one field that is ours, not the studio's:

```js
transition: { springRate: 4, ms: 1250, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
```

### Renderers

Two renderers draw the same recipe, and the page picks one after mount
(`AtmosphereField`), with the CSS backdrop covering the gap:

- **WebGL (default)** — `components/gradient/gl/`. `mistGeometry.js` is a
  one-for-one port of the engine's MIST maths (ridge noise, layout with
  patches 7–8, colour mixing in oklab, veil timings), `mistShader.js` is one
  fullscreen fragment shader compositing sky → sun glow → sun → per ridge
  (fill, blurred edge, crest rim, veil) → air → grain in the SVG's paint
  order, and `MistCanvas.jsx` runs the spring. A frame is one draw call: the
  CPU recomputes geometry only while the transition moves, and at rest only
  the veils' drift uniforms change, redrawn once they've moved ~0.2 device px.
  Canvas DPR is capped at 2. Reduced motion freezes the veils and makes the
  switch a cut.
- **SVG (fallback)** — the generated `engine.js`, loaded only when WebGL2 is
  missing, the shader fails to build, or the context is lost. It re-renders
  the whole SVG through React every frame, which is what made switches janky
  on large or high-DPR screens.

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

When porting anything new from the studio, change `mistGeometry.js` /
`mistShader.js` and the engine together, then re-run parity. One trap
already hit: pass bounded arguments to `tanh`/`exp` in the shader — some GPUs
(and SwiftShader) return NaN once `exp` overflows, which blanked every ridge
fill.

### How the transition works

- The engine's `Wl` helper is **exponential smoothing**, not a real spring:
  `value += (target - value) * (1 - e^(-rate * dt))`, with dt in seconds
  clamped to [.001, .05] and a settle threshold of 8e-4 × max(1, |target|).
  No overshoot. Settle time is roughly `5 / rate` seconds, so `rate: 4` ≈
  1.25s — hence `ms: 1250`. **Keep `ms ≈ 5000 / springRate`** or the scene
  and the sun hit target drift apart. The GL renderer runs the identical
  spring over the identical vector (geometry dials, including `mist.seed`,
  then every stop's RGB), and settles in the same time as the SVG engine.
- Because `mist.seed` springs, the ridges sweep through every silhouette
  between the two seeds — roughly one shape change per unit of seed × .73. Keep
  the day and night seeds close to keep a switch calm.
- That one loop carries *everything*: geometry, the colour stops, and the sky
  gradient built from those stops (in GL, a 1024-texel texture rebaked from the
  sprung stops each moving frame). Adding a second animation loop for colours
  is what made this stutter before — don't reintroduce one.
- `ease` must be an **exponential ease-out** (`cubic-bezier(0.16, 1, 0.3, 1)`)
  because that is the shape of the smoothing curve. Anything tracking the sun
  (the hit target) lags visibly on an ease-in-out. Verified: worst-case
  divergence ~5% of frame width, versus ~24% on the wrong curve.
- The sky **interpolates its stops**; it is not a crossfade. Two stacked
  opaque layers fading on opacity looked symmetric but wasn't: compositing a
  dark layer over a light one kills brightness far faster than the reverse, so
  night arrived early and day arrived in a late rush. Measured at the halfway
  point, the old crossfade was 76% done one way and 20% the other; lerping the
  stops is 93% / 92%. Don't reintroduce a layered crossfade.
- `ms`/`ease` reach CSS as `--atmo-ms` / `--atmo-ease`, set by
  `AtmosphereField`, and position the sun hit target.
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

Also: the top of the file needs `'use client'`, and the recipe it ships with
is renamed to `defaultRecipe` so the `recipe` prop can shadow it.

### Adding a scene

1. Add a recipe under `components/gradient/recipes/`.
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
