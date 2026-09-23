# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project

Abhinav Gupta's ("AbG") personal portfolio — a single continuous, scroll-driven
experience where every scroll delta stages a reveal, rather than a page of
static stacked sections. Next.js (App Router).

This replaced an earlier "AbG OS" build (a fake desktop-OS metaphor: boot →
login → windows/dock/terminal). That direction was explicitly retired — see
`PRODUCT.md` for the product record and `.impeccable/surfaces/home.md` for the
visual direction contract. Do not resurrect the OS metaphor unasked.

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

## Commands

```bash
npm run dev       # next dev
npm run build     # next build
npm run start     # next start
npm run test      # Playwright e2e tests
```

## Tech Stack

- **Next.js 16** (App Router), React 19, plain JS/JSX (no TypeScript).
- A generated gradient/shader engine (`components/gradient/engine.js`) drawing
  an animated mountain scene.
- **GSAP + ScrollTrigger** and **Lenis** for scroll choreography. The
  primitives exist but nothing composes them yet.
- Plain CSS in `app/globals.css` (no Tailwind, no CSS modules).
- Fonts via `next/font/google`: **Unbounded** (display) + **JetBrains Mono**
  (body/labels), exposed as `--font-display` / `--font-mono`.
- `three` is still in `package.json` but no longer imported — its only consumer
  was deleted. Remove it when convenient.

## Project Structure

```
app/
  layout.jsx    — fonts, metadata, ThemeProvider
  page.jsx      — the stage; currently just the atmosphere
  globals.css   — tokens, reset, stage, atmosphere, sun toggle
components/
  AtmosphereField.jsx  — composes sky layers + engine + sun toggle
  SunToggle.jsx        — hit target sitting on the painted sun
  ThemeProvider.jsx    — day/night state, localStorage, `data-theme`
  gradient/
    engine.js          — generated rendering engine (see below)
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
silhouette, haze thins, sky crossfades.

**Nothing about the look lives in the engine.** Each scene is a recipe, and
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
| FINISH · Soften/Noise   | `blur` / `grain`                          |

Plus one field that is ours, not the studio's:

```js
transition: { springRate: 9, ms: 555, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
```

### How the transition works

- The engine's `Wl` helper is **exponential smoothing**, not a real spring:
  `value += (target - value) * (1 - e^(-rate * dt))`. No overshoot. Settle time
  is roughly `5 / rate` seconds, so `rate: 9` ≈ 555ms — hence `ms: 555`.
  **Keep `ms ≈ 5000 / springRate`** or the scene and the sky drift apart.
- That one loop carries *everything*: geometry, the colour stops, and the sky
  gradient built from those stops. Adding a second animation loop for colours
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

### Engine patches

`components/gradient/engine.js` is generated, minified, and marked "do not
edit", but carries several deliberate patches. **Re-exporting from the studio
will drop them**, so reapply:

1. `Wl(e)` → `Wl(e, k = 2)`, with `-9*l` → `-k*l`, so rate is a parameter.
2. `or(...)` takes a `rate` prop and passes it to `Wl`.
3. `uc` passes `rate: ee.transition?.springRate ?? 2` down to `or`.
4. `or` springs the colour stops alongside the geometry (`...Cx` / `Tx`).
5. `_s`'s `case "MIST"` returns `transparent` — the wrapper no longer paints a
   sky, because CSS can't interpolate a gradient.
6. `or` paints the sky itself: a `<linearGradient>` built from the sprung stops
   plus a full-bleed `<rect>` behind the sun and ridges. This is what makes the
   sky animate on the same clock, and symmetrically in both directions.

Also: the top of the file needs `'use client'`, and the recipe it ships with
is renamed to `defaultRecipe` so the `recipe` prop can shadow it.

### Adding a scene

1. Add a recipe under `components/gradient/recipes/`.
2. Register it in `components/gradient/themes.js` with an `id`, `label` and
   `next` (the cycle is defined by the themes, not the provider).

## Open Tasks

| Task |
|---|
| Content layers: real projects, resume, dev log, contact |
| Compose the scroll primitives (SplitText/Reveal/MagneticCard/SmoothScroll) |
| Drop the unused `three` dependency |
| Decide whether an admin surface is still wanted |
