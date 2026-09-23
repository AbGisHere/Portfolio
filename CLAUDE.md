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
- A generated gradient/shader engine (`components/gradient/engine.js`) drawing
  an animated mountain scene.
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
  AtmosphereField.jsx (+ .module.css) — backdrop sky + engine + sun toggle
  SunToggle.jsx (+ .module.css)       — hit target sitting on the painted sun
  ErrorScreen.jsx (+ .module.css)     — shared 404/error layout, palette-tinted scrim
  ThemeProvider.jsx                   — day/night state, localStorage, `data-theme`
  gradient/
    engine.js          — generated rendering engine (see below)
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
| FINISH · Soften/Noise   | `fieldBlur` / `grain` (`blur` is unused)   |

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
- **Backdrop.** `.atmosphere-field` paints each recipe's sky as a CSS
  gradient (`--sky-day` / `--sky-night`, generated from the recipes by
  `AtmosphereField`) behind the engine. It shows before the engine's chunk
  loads and in any frame the engine drops, so neither ever flashes the page's
  near-black. An inline script in `app/layout.jsx` sets `data-theme` from
  localStorage before first paint, so a night visitor's backdrop is night
  from the start.

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
   sky animate on the same clock, and symmetrically in both directions. The
   stops come from `Gk(stops, divs)`, which reproduces the studio's own sky —
   `linear-gradient(180deg in oklab, …)` at the `divs` positions — by sampling
   8 oklab steps per segment (SVG gradients can only blend in sRGB, which bands
   visibly across the dark night blues). `uc` passes `divs` down for this.
7. **Aspect lock.** `Xs(..., K)` takes the recipe's `aspect` (the studio canvas,
   2048×1494) via `or`'s `aspect` prop. Ridge noise is sampled per unit of
   `height × aspect` around the frame centre, so any viewport crops or extends
   the range instead of squashing it — portrait phones show fewer, correctly
   proportioned peaks; ultrawides show more. Ridge paths run 3% of the height
   past each edge so their blur never fades out inside the frame. Veil width
   uses `max(width, height × aspect)`.
8. The sun's x is clamped 1.5 radii (0.078 × height) clear of either edge, or
   centred on a frame too narrow for that. `.sun-toggle` mirrors the clamp in
   CSS with `cqh` units — keep the two in step.

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
