# Abhinav Gupta — Portfolio

Abhinav Gupta's personal site: one continuous, scroll-driven scene rather than a
page of stacked sections.

**Live:** [abgupta.me](https://abgupta.me)

![Version 0.3.4](https://img.shields.io/badge/version-0.3.4-informational)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![License: all rights reserved](https://img.shields.io/badge/license-all%20rights%20reserved-lightgrey)

![The atmosphere: mountain ridges under drifting haze, with the sun low in a dusk sky](./app/opengraph-image.jpg)

The whole site sits on a single full-bleed scene: mountain ridges under
drifting haze, with a sun (or at night, a moon) in the sky. Every scroll delta
stages the next beat of that scene instead of paging through sections. The
site is being rebuilt one layer at a time. `0.1.x` built the atmosphere,
and `0.2.x` starts the camera moving as you scroll. Content, projects and
contact come in later lines (see [Versioning](#versioning)).

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Debug and test URL hooks](#debug-and-test-url-hooks)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Performance and accessibility](#performance-and-accessibility)
- [Browser support](#browser-support)
- [Versioning](#versioning)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

**The atmosphere** (`0.1.x`)

- A WebGL2 renderer draws the mountain scene. Where WebGL2 is missing or fails,
  a layered DOM renderer draws the same scene from stacked CSS layers.
- Click the sun to turn the sky. Dusk to night (1.5s): the sun sets behind the
  ridges as the moon rises, through a blue hour. Night to dusk (4s): the moon
  fades with the morning while the sun crosses the sky, through dawn, day and
  late afternoon. The ridges reshape and are relit the whole way.
- At rest the ridges slowly drift, over about a minute (WebGL only).
- The theme is remembered across visits and set before first paint, so a night
  visitor never sees a day flash.
- The scene is mounted once in the root layout, so it keeps running across
  routes, including the 404.
- Reduced motion freezes the haze and turns the sky switch into a cut.

**Scroll** (new in `0.2`)

- Smooth wheel scrolling with [Lenis](https://lenis.darkroom.engineering) on
  desktop, loaded after first paint so it stays out of first-load JS. Touch
  devices scroll natively, and keyboard scrolling stays native everywhere.
- Scroll progress drives a camera that pulls back from the mountains with a
  slight tilt, with a faint strip of sky above and a little meadow at the
  bottom. The ridges behave like terrain: each keeps its silhouette, the
  front one recedes as a new one slides up from below, and distant ranges
  rise from behind the far ridge and step into the haze. The ridges keep
  breathing at every scroll position (WebGL), and both renderers draw all
  of it alike. Release by release, see [`CHANGELOG.md`](./CHANGELOG.md).
- Warm light catches the crests in the sun's column (a faint silver one
  under the moon), softly at rest and deepening as the body sets.
- Time of day moves with scroll. By day the sky turns from golden hour to
  sunset and the sun sets into the ridges; by night the moon sinks too,
  warming toward amber.
- The sun and moon can be clicked at any scroll position: the hit target
  follows the painted body, and a switch mid-scroll blends with the camera.
- The WebGL renderer skips ridges hidden behind nearer ones and adapts its
  resolution under load, so large high-DPI laptops hold full frame rate.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) and React 19, in plain JS/JSX
  (no TypeScript)
- A hand-written WebGL2 renderer (fragment shaders, no three.js), with a
  layered DOM fallback
- [Lenis](https://lenis.darkroom.engineering) for smooth scrolling, and no
  other animation library
- Plain CSS: CSS Modules per component, global tokens and reset in
  `app/globals.css`. No Tailwind.
- Fonts via `next/font/google`: Unbounded (display) and JetBrains Mono
  (body and labels)
- [Playwright](https://playwright.dev) (Chromium) for the renderer parity,
  performance and switch harness; Node's built-in test runner for the unit
  tests

## Getting started

**Prerequisites:** Node.js 20.9.0 or newer (Next.js 16's `engines`
requirement) and npm.

```bash
git clone <this repository>
cd Portfolio
npm install
npm run dev        # http://localhost:3000
```

For a production build:

```bash
npm run build
npm run start      # serves the build on http://localhost:3000
```

The parity, perf and switch scripts drive a real browser through Playwright. If
Chromium isn't installed yet, run `npx playwright install chromium` first.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Next.js dev server |
| `npm run build` | Builds for production |
| `npm run start` | Serves the production build |
| `npm run qa` | Runs every check below against a running production server, one line each, before every push: a quick tier for docs-only changes (about 2 min), the full set otherwise (about 20 min) |
| `npm run parity` | Compares the layered renderer against WebGL, pixel by pixel, across viewports, both themes and three scroll positions (`--scrolls`, default top, middle and end). Fails above a mean difference of 2/255 or a p99 of 24. |
| `npm run perf` | Measures frame timing and main-thread time per renderer, during sky switches, at rest and through a scroll sweep; with `--gate`, fails under 118 fps or on tiles dropping out under a capped GPU memory |
| `npm run switch` | Steps each day/night switch frame by frame on a fake clock, per renderer and scroll position, and fails on a cut: a frame step over 3× the steps around it |
| `npm run sharp` | Renders 5K and 6K frames at 2× with the 4K pixel cap and without, and compares the crests and grain for softness (not part of `qa`) |
| `npm run test:adaptive` | Unit tests for the WebGL renderer's adaptive quality, fed synthetic frame timings (no GPU needed) |
| `npm run test:unit` | Unit tests for the scene's pure maths: the colour conversions, the switch palette's keyframes, and one frame of the scene at rest, scrolled and mid-switch (no GPU needed) |
| `npm run hygiene` | Checks a running production server for the basics: `lang`, titles, descriptions, one `<h1>`, alt text, canonical, OG image, JSON-LD, the 404, robots, sitemap, llms.txt and no shipped source maps |

CI (GitHub Actions, `.github/workflows/ci.yml`) runs `test:adaptive`,
`test:unit`, the build and `hygiene` on every push to `main` and every pull
request. Parity, perf and switch need a real GPU, so they run locally.

Run `parity`, `perf`, `switch` and `hygiene` against a production server, not `next dev`. Flags,
output and how to read the numbers are in
[`scripts/README.md`](./scripts/README.md).

## Configuration

The site's canonical URL (used by metadata, JSON-LD, `robots.txt`,
`sitemap.xml` and `llms.txt`) comes from config, not code. `app/site.js`
resolves it in this order:

| Variable | Meaning |
|---|---|
| `SITE_URL` | Overrides everything, e.g. to pick one of several production domains |
| `VERCEL_PROJECT_PRODUCTION_URL` | Set by Vercel on every build: the project's primary production domain, used as `https://<domain>` |
| *(neither set)* | Falls back to `http://localhost:3000` |

No other environment variables are needed to run the site, and none are
required locally. To set one, copy [`.env.example`](./.env.example) to
`.env.local`.

## Debug and test URL hooks

The scene honours query parameters for the harness and screenshots, such as
`?renderer=gl|layers` to force a renderer, `?freeze=1` to hold the haze still
and `?scroll=0.5` to pin scroll progress, and exposes `data-*` attributes
for tests (which renderer painted, where the sun is, whether a switch is
running). The full list is the hook table in
[`docs/parts/atmosphere.md`](./docs/parts/atmosphere.md#renderers).

## Project structure

```
app/                 routes, metadata, JSON-LD, robots/sitemap/llms.txt, icons, share image
  layout.jsx         root layout: mounts the atmosphere and the scroll layer once
  page.jsx           home
  site.js            shared site facts (URL, name, role, links)
components/
  AtmosphereField.jsx  the scene behind every page; picks a renderer
  SmoothScroll.jsx     Lenis and the scroll progress the scene reads
  SunToggle.jsx        the click target on the painted sun
  scroll/              scroll progress store and the scroll track
  gradient/
    gl/              WebGL2 renderer and shaders
    layers/          layered DOM fallback
    recipes/         the day and night scenes, as data
styles/              global utilities
scripts/             renderer parity, perf and switch harness, unit tests, hygiene checks
.env.example         optional environment variables
LICENSE              all rights reserved
```

The full, annotated tree is in [`CLAUDE.md`](./CLAUDE.md#project-structure).

## Architecture

**Scenes are data.** Nothing about the look lives in a renderer. Each scene is
a recipe file in `components/gradient/recipes/` (`dusk-ember.js` for day,
`moonlit.js` for night) holding the ridge shape, haze, sun position, colour
stops and grain, plus how a switch into that scene runs: its length, the arc
the sun and moon ride, and the skies it passes through on the way. Adding a
scene means adding a recipe and registering it in `themes.js`.

**Two renderers, one look.** The WebGL2 renderer composites the whole scene in
one fullscreen fragment shader, with the ridge outlines computed on the GPU
into a texture. The layered fallback draws the same scene as stacked DOM
layers, so the browser composites rather than repaints, with each ridge's
silhouette computed as a mask from the shader's own maths. Both are loaded
dynamically after mount, with a CSS gradient of the sky painted behind them
until they arrive. Each frame's scene comes from one shared pure function
(`sceneAt`), built on the shared switch, camera, colour and sky maths and the
sun and moon looks, so a renderer only maps it to shader uniforms or CSS.
`npm run parity` keeps them visually identical at every scroll position
(the current state is in [`docs/parts/atmosphere.md`](./docs/parts/atmosphere.md#renderers)).

**One clock per job.** At rest, an exponential smoothing step holds the scene.
During a switch, one eased clock carries the sun and moon along their arc,
moves the palette through its keyframes, and reshapes and relights the ridges
together, so nothing runs ahead of anything else (`npm run switch` checks that
no frame jumps). The sky interpolates its colours; it
never crossfades two layers.

**Scroll is one number.** The scroll layer publishes a single progress value
to a small store outside React, so a scroll frame never re-renders a
component. The renderers and the sun toggle subscribe to it.

The details are in [`docs/parts/atmosphere.md`](./docs/parts/atmosphere.md), and the
measured numbers behind these choices in [`CHANGELOG.md`](./CHANGELOG.md).

## Performance and accessibility

- **Lean first load.** Both renderers and Lenis are loaded after first paint,
  so none of them is in first-load JS. The scroll layer itself adds about
  1.4 KB gzipped.
- **Cheap at rest.** The WebGL renderer redraws only when the haze has moved
  visibly, and caps ridge-drift updates at 30 per second. The layered fallback
  runs nothing on the main thread at rest: its haze drifts on the compositor.
- **Measured, not guessed.** `npm run perf` records frame times and
  main-thread cost per renderer; `npm run parity` catches any visual drift
  between them.
- **Reduced motion.** With `prefers-reduced-motion`, the haze holds still, a
  sky switch is a cut, Lenis doesn't load, and the scroll camera moves only
  part of the way.
- **Semantics.** The home page and the 404 each have one `<h1>` and an intro
  in the server-rendered HTML. The scene is decorative and hidden from assistive tech, except the
  sun, which is a real button.

## Browser support

| Browser | Version |
|---|---|
| Chrome / Edge (desktop and Android) | 111 or later |
| Safari (macOS and iOS/iPadOS) | 16.4 or later |
| Firefox | 111 or later |

These are Next.js 16's default targets, which the build compiles for. The
site's own features fit inside them: WebGL2, `lvh`/`svh` viewport units,
container query units (`cqh`) for the sun's hit target, CSS masks and
`OffscreenCanvas`. `requestIdleCallback` is used where it exists, with a timer
fallback for Safari.

**Renderers.** Any browser with WebGL2 gets the WebGL renderer. Without it, or
if the shader fails to build or the GL context is lost, the layered fallback
takes over (after a lost context, WebGL is retried a few times). The GPU crest
pass needs `EXT_color_buffer_float`, and without it the crests are computed on
the CPU with identical output.

**Tested in** Chromium (the Playwright harness), at phone, tablet, laptop and
ultrawide sizes. WebKit (Safari) is checked by hand; Firefox isn't in the
automated runs. On touch devices the
page uses native scrolling; Lenis smooth scrolling is desktop only.

## Versioning

The site is rebuilt layer by layer, and the version line tracks which layer:
`0.1.x` the atmosphere (done), `0.2.x` the camera pull-back (current),
then projects, contact, navigation and real content, and `1.0.0` to ship.
The lines and the plan past the current one (which will change) are in
[`ROADMAP.md`](./ROADMAP.md#version-lines); what each release changed is in
[`CHANGELOG.md`](./CHANGELOG.md).

Commits follow [Conventional Commits](https://www.conventionalcommits.org),
with the version in the scope:

```
<type>(vX.Y.Z): <summary>

feat(v0.2.0): Stage the hero name reveal on first scroll
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`chore`. The version matches `package.json` and the git tag.

## Deployment

The site is deployed on [Vercel](https://vercel.com). It needs no extra
configuration there: Vercel sets `VERCEL_PROJECT_PRODUCTION_URL`, which becomes
the canonical URL. Set `SITE_URL` if the project has more than one production
domain and a different one should be canonical.

Before a push, check a production build (`npm run build && npm run start`)
against the pre-push list in [`CLAUDE.md`](./CLAUDE.md#pre-push-checks).

## Contributing

This is a personal portfolio, so it isn't looking for feature contributions.
Bug reports are welcome as issues. If you open a pull request, keep it small
and follow the commit format above.

## License

Copyright © 2026 Abhinav Gupta. All rights reserved. The source is public to
read, but no license is granted: the code, design and content may not be
copied, modified or redistributed without permission. See [`LICENSE`](./LICENSE).

## Contact

Abhinav Gupta, software engineer. GitHub:
[@AbGisHere](https://github.com/AbGisHere).
