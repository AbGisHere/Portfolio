# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project

Abhinav Gupta's ("AbG") personal portfolio — a single continuous, scroll-driven
experience where every scroll delta stages a reveal, rather than a page of
static stacked sections. Next.js (App Router).

See `PRODUCT.md` for the product record and `DESIGN.md` for the design
system (tokens, type, rules); the impeccable skill's files (`.impeccable/`,
`.claude/skills/`, `.claude/agents/impeccable-*`) stay local. An earlier fake-desktop-OS build (boot →
login → windows/dock/terminal) was retired and its branding dropped; do not
resurrect that metaphor or its name unasked. `ROADMAP.md` holds agreed future
plans: the ship-hygiene gate for `1.0.0`, and "the descent" (`0.2.x`–`0.3.x`):
one continuous scroll-driven camera move that pulls back from the mountains
(`0.2`, live from `0.2.0`), then comes down onto a desk in a meadow, ending
on an open laptop (a tablet on portrait viewports) with the mountains behind
it (`0.3`). The device screen is a painted background with project cards,
not an OS. `CHANGELOG.md` holds what each release changed and measured.

## Versioning

The rebuild goes layer by layer, and the version line tracks which layer:
`0.1.x` the atmosphere (done), `0.2.x` about me (the camera pull-back,
done), `0.3.x` projects (the desk, current), `0.4.x` contact, `0.5.x` header
navigation, `0.6.x` real content, `1.0.0` ship. The table, with where the
current line stands, is "Version lines" in `ROADMAP.md`; it's the user's
current thinking and will change.

**Before every commit, ask which version to bump to** — never pick one
unilaterally — then update `package.json` and any other file carrying a
version (the README badge, PRODUCT.md's current version, a `CHANGELOG.md`
entry) so nothing drifts from the git tag. Do not add Claude co-author or
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
| `components/ErrorScreen` (404, `error.jsx`, `global-error.jsx`) | The current scene, type and palette. The live pages sit on the real atmosphere (from the root layout); `global-error` uses the recipes' skies as CSS (`SKY_VARS`). A new layer style belongs here too. |
| `app/opengraph-image.jpg` (+ `.alt.txt`) | A fresh render of the current scene. Next fills `twitter:image` and its alt from it: there's no separate Twitter card file. |
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
runs `npm run test:adaptive`, `npm run test:unit`, the build and hygiene on
every push to `main` and every PR. CI has no GPU, so the rest runs locally.

**Quality control runs before every push** (the owner's rule, from
`0.2.9`): `npm run qa` against the production server, in one of two tiers
it picks from the diff against `origin/main` (`scripts/README.md`):

| Push | Tier | Runs |
|---|---|---|
| Only docs (`*.md`, `*.txt`, `LICENSE`) | quick | both test suites, hygiene, parity at scroll 0 |
| Anything else | full | the quick tier, plus parity at every scroll, perf with its gate, switch |

From `0.3` on, the full tier narrows further: `qa` tests only the parts a
change reaches, found through the import graph plus declared links, with a
full sweep when a line closes and before `1.0.0` (`ROADMAP.md`, "Testing:
only what a change touches").

`qa` only runs the other scripts and prints one table; no check lives in
two places. Console errors, overflow and the hit target are checked inside
parity; tile dropout and the sharpness report inside perf. Report the table
with the push; a failure blocks the push until it's fixed or the owner
accepts it. The scripts launch only Chromium; WebKit is checked by hand.

- [ ] `<html lang="en">` present.
- [ ] Every route has its own `<title>` and meta description. No duplicates, and
      no framework or boilerplate defaults ("Create Next App", "Vite + React").
- [ ] At most one `<h1>` per page *(exactly one, once built)*.
- [ ] Every `<img>` / `next/image` has meaningful `alt`. Decorative ones use
      `alt=""`. Decorative SVG/canvas is `aria-hidden`.
- [ ] Zero console errors or warnings on load and on the day/night toggle, in
      Chromium and WebKit (Safari or Playwright's WebKit, by hand).
- [ ] No browser source maps shipped (`productionBrowserSourceMaps` stays
      off). No `.map` files served from `/_next/static`.
- [ ] Bundle: Next 16's `next build` no longer prints route sizes, so
      compare the gzip sizes of `.next/static` (the first-load chunks
      especially) against the previous push. Flag any jump, and anything new
      in the first-load JS.
- [ ] Favicon, custom 404, canonical, OG image and JSON-LD all resolve.
      `robots.txt` doesn't block AI crawlers. `sitemap.xml` lists every route
      and nothing dead. `llms.txt` matches the current content.
- [ ] *(once built)* View source shows real text content, not an empty shell.
- [ ] The atmosphere still adapts: phone portrait/landscape, iPad, laptop,
      ultrawide, and one odd aspect. No squashed ridges, no horizontal
      overflow, and the sun hit target sits on the painted sun.
- [ ] Quality holds on every display (the standing rule from `0.2.11`,
      `ROADMAP.md`): no visible softening on large high-DPI frames (5K@2,
      6K@2), and nothing tied to 120 Hz. Any new resolution cap or quality
      step is measured there before it ships.

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
- **Passing checks cost one line.** Harnesses print a single summary line
  per check when it passes; detail (per-case tables, diff images, frame
  dumps) is written to their out dir and printed only for what failed.
  Read only the failures, never a passing check's detail.
- **Images only to judge a failure,** cropped to the region in question,
  and never again once it's fixed. Nothing already verified gets re-read,
  re-run or re-screenshotted to "double-check".
- **Read only the part you're changing.** Working on one part (say the
  grass) means reading its files and the interfaces of what it reaches (the
  same reach `qa` uses, `ROADMAP.md`, "Testing: only what a change
  touches"), not the code, docs or renders of parts that already work (the
  desk). Subagent briefs name exactly those files.
- **Subagents report short:** a final message of a few lines with the
  numbers and the paths to their notes; no pasted logs, no images unless
  asked.

## Commands

```bash
npm run dev            # next dev
npm run build          # next build
npm run start          # next start
npm run test:adaptive  # adaptive-quality unit tests (no GPU; CI)
npm run test:unit      # colour, paletteAt and sceneAt unit tests (no GPU; CI)
npm run hygiene        # pre-push checks against a running prod server (CI)
npm run parity         # layered vs GL, pixel by pixel (local, GPU)
npm run perf           # frame timing, fps gate, tile dropout (local, GPU)
npm run switch         # no cut in a day/night switch, frame by frame (local, GPU)
npm run qa             # runs the checks above, one table; before every push (local, GPU)
npm run sharp          # 5K/6K crest and grain crops, capped vs uncapped (local, GPU; not in qa)
npm run devices        # every shader on 31 real phones and tablets (BrowserStack; keys in .env.local; not in qa, on the owner's call)
```

## Tech Stack

- **Next.js 16** (App Router), React 19, plain JS/JSX (no TypeScript).
  Compiled for Safari and iOS 13 on (`browserslist`, `0.3.5`; Next's own
  floor is 16.4), with `instrumentation-client.js` filling in the built-ins
  older Safari lacks. A newer API goes there too, or behind a check.
- The atmosphere: a WebGL2 renderer (`components/gradient/gl/`) drawing the
  animated mountain scene from recipe files, with a layered DOM renderer
  (`components/gradient/layers/`) as the fallback.
- **Lenis** smooths wheel scrolling on desktop (`components/SmoothScroll.jsx`,
  loaded when the browser is idle, in its own chunk). Touch-first devices
  (`(hover: none) and (pointer: coarse)`) and reduced motion never load it:
  they scroll natively. No animation library otherwise.
- Plain CSS, structured rather than monolithic: **CSS Modules** beside each
  component (`Component.module.css`), with `app/globals.css` limited to
  tokens, reset and base type, and `styles/utilities.css` for global helpers
  like `.visually-hidden`. No Tailwind. New component styles go in the
  component's own module, never in `globals.css`.
- Fonts via `next/font/google` in `app/fonts.js`: **Unbounded** (display,
  variable, no weight list) + **JetBrains Mono** (body/labels, weights
  400–600: its whole axis is 9 KB more to preload), exposed as
  `--font-display` / `--font-mono` on `<html>`. Don't redefine those
  variables in CSS, because that bypasses next/font's size-adjusted
  fallbacks.
- Tests: Node's `node --test` for the pure maths (`scripts/`), Playwright
  (Chromium) for the local GPU harness. There are no e2e specs.

## Project Structure

```
app/
  layout.jsx       — metadata, JSON-LD, theme script, ThemeProvider; mounts the atmosphere and
                     the scroll layer once, so they persist across routes
  page.jsx         — home: server-rendered h1/intro (visually hidden), the `about` scroll track
  not-found.jsx, error.jsx — render components/ErrorScreen
  global-error.jsx — root-layout failure: own <html>, static sky, no renderer
  fonts.js         — next/font instances (layout and global-error)
  site.js          — site facts; url from SITE_URL, else Vercel's production domain, else localhost
  robots.js, sitemap.js, llms.txt/route.js — generated crawler files
  icon.svg, apple-icon.png, opengraph-image.jpg (+ .alt.txt; also twitter:image)
  globals.css      — tokens, reset, base type only
styles/utilities.css — global helpers (.visually-hidden)
components/
  Stage.jsx            — full-viewport shell for every scene
  AtmosphereField.jsx  — the scene behind every page: backdrop sky, renderer pick, sun toggle
  SunToggle.jsx        — hit target on the painted sun or moon (follows sunSpot.js)
  LampToggle.jsx       — the desk lamp as a control: click to switch day/night, drag its top half (0.3.11)
  SmoothScroll.jsx     — the scroll layer: Lenis (desktop), publishes the descent's progress
  scroll/descent.js    — the progress store (`about`, `desk`), outside React; `?scroll=`, `?desk=` pin it
  scroll/DescentTrack.jsx — an empty block giving a stretch its scroll length (TRACK_LVH)
  scroll/stops.js      — where the scroll comes to rest (the snap targets, inside the camera's holds)
  ErrorScreen.jsx      — shared 404/error layout, palette-tinted scrim
  ThemeProvider.jsx    — day/night state, localStorage, `data-theme`
  gradient/
    gl/MistCanvas.jsx  — WebGL renderer (default): canvas, clocks, textures
    gl/mistGeometry.js — the studio's MIST maths (layout, ridge paint); MAX_DPR, GRAIN_SIZE, grainTexels
    gl/mistShader.js, crestShader.js, hashTable.js — the scene shader, the GPU crest pass, its hashes
    gl/adaptiveQuality.js — the resolution step from frame intervals (pure)
    layers/LayeredScene.jsx, ridgeMasks.js — fallback renderer: CSS layers, ridge alpha masks
    scene.js    — `sceneAt`: one frame of the scene, pure, for both renderers
    camera.js   — the descent (0.2): ridges, sky, ranges, meadow, palette, bodies, `ridgeLightAt`
    deskCamera.js — the 0.3 camera: the S path's keyframes, its pitch, the closing sky, the grass's light
    gl/grassShader.js, gl/footsteps.js — the meadow's instanced grass; the footprints (0.3.1)
    gl/bootPrint.js — the boot each print is, drawn fresh per load (0.3.2)
    gl/flowerShader.js, gl/treeShader.js — the wildflowers in the grass; the lone tree and copses, their shadows (0.3.5)
    gl/deskShader.js — the desk: a trestle table built in code, its grain and shadow (0.3.6)
    gl/laptopShader.js, gl/laptopShape.js — the laptop: meshed in code, its lid, keys, logo and screen, its shine (0.3.9); its size, finish, shadow and screen light (0.3.8)
    gl/tabletShader.js, gl/tabletShape.js — the tablet on portrait frames, leaning on its books; their size, shadow and screen light (0.3.10)
    gl/lampShader.js, gl/lampShape.js — the desk lamp: its mesh from a pose; its light, shadow, flicker, on-screen outline and drag (0.3.11)
    lampSpot.js, lampPose.js — the lamp's outline on screen and its dragged pose, outside React (0.3.11)
    treeSeed.js — the copses' seed: kept per browser, new on a hard refresh (0.3.11)
    gl/meadowShader.js, gl/meadowTexture.js — the meadow pass: the ground painted as grass, prints, flowers (0.3.2), the mist at the mountains' foot (0.3.3); each extra pass fails alone (`passProgram`, 0.3.4)
    orbit.js    — a switch: the sky's turn, the bodies' arc, palette keys
    colour.js   — hex/RGB, gamma-encoded `mixRgb`, oklab `mix`
    skyRamp.js  — the sky ramp every sky path uses; `rampAt`
    skyKeys.js  — a palette partway through keyframes (`paletteAt`)
    sky.js      — a recipe's sky as CSS; `SKY_VARS` (backdrop, static sky)
    sunLook.js, moonFace.js — the sun's look and RIDGE_LIGHT; the moon's face
    sunSpot.js  — where the body is painted, outside React (renderers publish, SunToggle follows)
    grainLayer.js — the grain as an overlay at device pixels (layered; GL when drawn below them)
    themes.js   — theme id -> { recipe, next }
    recipes/dusk-ember.js, moonlit.js — the day and night scenes
  (each component's styles sit beside it as Component.module.css)
docs/parts/       — one doc per part's internals (atmosphere.md); see "Parts"
.github/workflows/ci.yml — test:adaptive, test:unit, build, hygiene (no GPU checks)
scripts/          — qa (runs the rest), parity, perf, switch, sharp, devices, adaptive-test, unit-test, hygiene;
                    lib/: console (shared console check), dropout (tile dropout), programs (every shader, for devices), resolve-js
instrumentation-client.js — polyfills for older Safari (iOS 13 on; `browserslist` in package.json)
.env.example      — optional config (SITE_URL); LICENSE — all rights reserved
```

## Parts

Each part's internals live in its own doc, read only when that part is
being changed (`ROADMAP.md`, "Testing: only what a change touches"):

| Part | Doc | Covers |
|---|---|---|
| The atmosphere | [`docs/parts/atmosphere.md`](docs/parts/atmosphere.md) | Recipes, both renderers, parity, the switch, the `0.2` and `0.3` cameras, the meadow and grass, the URL and `data-` hooks |

The invariants any change must keep, whatever part it touches:

- **Nothing about the look lives in a renderer.** Each scene is a recipe;
  each frame comes from one pure `sceneAt` (`scene.js`), which WebGL and
  the layered fallback only map to uniforms or CSS. They must match
  (`npm run parity`).
- **One scene for the whole site,** mounted once in the root layout,
  `position: fixed`, click-through except the sun button. Page content over
  it needs a z-index.
- **Three clocks only:** the spring at rest, the switch clock and, from
  `0.3.1`, the footprint clock (the grass's footsteps fading, ticked inside
  GL's frame loop, `ROADMAP.md` "0.3"). The wind (and the meadow's cloud
  shadows), the closing sky's birds, clouds and stars and the lamp's flicker run on GL's frame loop too, not a loop of their
  own. Don't add another animation loop. The camera is a pure function of
  scroll, never sprung; the scroll itself only snaps onto the stops.
- **Frame budget:** 120 fps on the sweeps in `npm run perf`, and sharp on
  every display (Pre-push checks).


## Open Tasks

| Task |
|---|
| Content layers: real projects, resume, dev log, contact (the descent and the desk: see `ROADMAP.md`) |
| The about-me content on the pull-back: sky lanterns are the favourite, not final (`ROADMAP.md`, "0.2") |
| `0.3.12`+: the stationery and accessories, then the device screen (`ROADMAP.md`, "0.3") |
| Before `0.3` closes: the fallback's stills under the `0.3` camera (it holds the pull-back's end for now), reduced motion on the `0.3` path, and perf and parity over the `0.3` stretch |
| Ship hygiene before `1.0.0`: see `ROADMAP.md` (H1, SSR content, bundle) |
| Trust, privacy and accessibility (`ROADMAP.md`): analytics (provider on hold) and `/privacy` with `0.4`, form consent, keyboard, contrast, third-party audit; no fabricated facts |
| Decide whether an admin surface is still wanted |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
