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

## Current release and follow-up

**0.4.40** (2026-10-30) made the pool climb faster on real phones with the
same picture: light cells (each pixel walks only the lights reaching its
1 m cell), no depth written twice, and the house culled to each view in
runs. OnePlus 11R 36 → 51 fps (90 Hz), Moto G71 5 → 6.7 (60 Hz). It was
pushed on the owner's call after the house parity matrix, before
`npm run qa`, which runs after. Its record, with every measurement, the
phones' profiling and the method: [`docs/optimization-0.4.40.md`](docs/optimization-0.4.40.md);
0.4.39's: [`docs/optimization-0.4.39.md`](docs/optimization-0.4.39.md).

**0.4.41** (2026-11-06) fixed 0.4.40's dark garden on phones: by night
the front wall, steps and garden were unlit on Adreno and Mali (the house's
fragment shaders had no `precision highp int`, so the light cells' indices,
past 32,767, overflowed in 16 bits). The parity matrix runs only on the M4,
which can't show it, so `devices` (now screenshotting once the house is
ready) checks a night house view on an Adreno and a Mali phone too.

**0.4.42** (2026-11-06) planned the speed work (`ROADMAP.md`, 0.4.43–0.4.48:
the path's visible set, the house shipped prebuilt, baked lighting,
deferred shading, frame reuse) and added `?skip=<pass,…>` to cost passes on
phones.

**0.4.43** (2026-11-06) draws only the house runs that can be seen from
the camera's point on the contact path (`scripts/house-pvs.mjs` →
`housePvs.js`, made offline; `?pvs=0` off; rerun it whenever the house's
mesh changes, or the unit test fails). OnePlus 11R 48.8 → 53.6 fps, Moto
unchanged; 140/140 equal with and without it. Profiling showed the house
is the OnePlus's cost (~6 ms) and the Moto is slow every frame. Record:
[`docs/optimization-0.4.43.md`](docs/optimization-0.4.43.md).

**0.4.44** (2026-11-07) keeps the built house in the browser (IndexedDB,
keyed by the worker's content-hashed URL; `?housecache=0` off), so a return
visit skips the build (M4 ready 7.8 → 1.6 s), and adds `?hskip=<part,…>`
to cost the house's shading on phones. Turning off only the lamps'
highlights (`lspec`) fails 2/255 by night, so lamp light can't be baked
without them. Record: [`docs/optimization-0.4.44.md`](docs/optimization-0.4.44.md).

**0.4.45** (2026-11-07) bakes the lamps' light on the lawn and the roof's
deck on the device (`houseLightmap.js`, `?lightmap=0` off) and lists in
each light cell only the lamps that can light it, with the same picture
(104/104, and mid-switch). Moto G71 ~+0.5 fps, OnePlus 11R unchanged.
Record: [`docs/optimization-0.4.45.md`](docs/optimization-0.4.45.md).

**0.4.46** (2026-11-08) skips work the frame never shows, with the same
picture: material patterns only where `detail()` is above 0, the meadow's
hill test only with the lawn in view (`MEADOW_PAINT_FLAT`), grass, flowers,
trees and glass culled to the frame, the off-screen passes before the
frame's own, and the lightmap's programs compiled in parallel. OnePlus 11R
~53 → 57.5 fps (p95 33 → 22 ms), Moto G71 ~7 → 7.5.
Record: [`docs/optimization-0.4.46.md`](docs/optimization-0.4.46.md).

**0.4.47** (2026-11-19) compiles the house's shader again for the lawn and
for leaf runs (`HOUSE_VARIANTS`, `?variants=0` off), with the same order
and picture, and takes out the curtains and the clothes on the owner's call
(the towels stay; new ones to come). Pushed before `npm run qa` and the
phones, on the owner's call.

**0.4.48** (2026-11-19) draws the house's 15,000 leaves as instances of
four templates (`leafInstances.js`, 0.84 MB in place of 21.6 MB of mesh),
the same leaves to float rounding, through every pass (`uLeaf`).
Committed before parity and the phones, on the owner's call.

**0.4.49** (2026-11-19) draws the house's depth once a frame, not twice:
the frame draws into its own target (`aoTarget`'s `frame`), sharing the
depth the AO pass leaves (the solid part; the lawn goes into the AO over
a copy), copied onto the canvas at the end (`showFrame`); `?earlyz=0`
off. Same picture (house parity). Measured on the Moto G71 first: skipping
the scene, meadow or shadows gains nothing, the house's colour ~+4.5 fps,
the lamps ~+2, the trees and grass ~+1.3, `dpr=1` ~+5.

**0.4.50** (2026-11-19) has the bloom read the frame target as a
texture, culls the pool's reflection to the water on screen, puts the
leaves' runs in the path's visible set (`HOUSE_PVS.leaf`; little culled
until they're grouped by place) and sends uniforms only on change
(`uniformCache.js`, `?ucache=0` off). Same picture (house parity).

**0.4.51** (2026-11-19) fixes 0.4.50's night (texture unit 0 left
unbound) and adds three shader variants (fabrics, books, fittings).

**0.4.52** (2026-11-19) makes the desk's laptop the 14-inch PROLED XDR
MacBook Pro: its size, slimmer bezels, and a Dynamic Island in place of
the notch (`laptopShape.js`, `laptopShader.js`).

**0.4.53** (2026-11-19) measures the new MacBook off Apple's photo:
even bezels, concentric screen corners, the island's true size.

**0.4.54** (2026-11-19) remeasures the MacBook off Apple's front and side
images and turns CI green again (the variant test predated 0.4.51).

**0.4.55** (2026-11-19) runs the house shader's directions and material
at mediump (positions, depth, shadows, hashes, light sums, ints highp).

**0.4.56** (2026-11-19) ships the house prebuilt (`scripts/house-prebuild.mjs`,
run by `npm run build`; `public/house/`, not committed; `?prebuilt=0` off).

**0.4.57** (2026-11-19) keeps the prebuilt house for touch devices,
invalidates dead buffers (`?invalidate=0`), merges the night's frame and
glow (`?bloommerge=0`) and makes house parity ~15× faster.

**0.4.58** (2026-11-19) draws the lawn into the AO pass without its own depth buffer and per-frame copy (MIN blending).

**0.4.59** (2026-11-19) keeps the baked lightmap in IndexedDB (`lightmapCache.js`, `?lmcache=0` off).

**0.4.60** (2026-11-19) packs the house's vertices 36 → 20 bytes, bit-exact (`houseVertices.js`: indices into tables read in the vertex shader).

**0.4.61** (2026-11-19) gets the house ready sooner (variants after the first frame, probe faces back to back; the probes' shadow-map race fixed).

**0.4.62** (2026-11-19) runs the lightmap's lawn mesh pass (its count was undefined since 0.4.45).

**0.4.63** (2026-11-19) skips the vertex tables' normal and ST in the depth pass and puts the bloom's frame on its own unit (20).

**0.4.64** (2026-11-19) skips the house, glass and grass shaders' dead work, same picture (parity 24/24).

**0.4.65** (2026-11-19) indexes the caustics, links the water's and bloom's programs in parallel and cuts per-frame allocations. 0.4.64 on phones: Moto G71 8.3 fps, OnePlus 11R 67.4, iPhone 15 44.

**0.4.66** (2026-11-19) fetches the lamp lists once per four entries and adds two shell variants. 0.4.65 on phones: Moto G71 8.3 fps, OnePlus 11R 67.3, iPhone 15 45.5.

**0.4.67** (2026-11-19) halves sceneAt's per-frame cost. 0.4.66 on phones was flat: Moto G71 8.3 fps, OnePlus 11R 66.8, iPhone 15 45.1.

**0.4.68** (2026-11-19) records the open items as Planned and makes `0.5.x` the opening hills in 3D (docs).

**0.4.69** (2026-11-19) trims the README to what's current (docs).

**0.5.0** (2026-11-19) opens on the hills in 3D (`ROADMAP.md`, "0.5 —
the opening hills in 3D: the look brief"): a hero peak and its range,
raymarched, their feet in valley mist, under a real-light sky (Rayleigh,
Mie, ozone; cirrus; stars and the Milky Way by night) with the real moon
(`public/moon.jpg`, NASA LRO, public domain). The click is a timelapse
dusk: the sun sets on a curve, the moon rises on the other side. Pure maths
in `components/gradient/peaks.js` (in `sceneAt` as `peaks`), drawn by
`gl/peaksShader.js` in two passes (the shape and the mist into float
targets once per view; the light from them, so a switch only relights);
`?peaks=0` gives the 2D opening. Scrolling drops through the mist and hands
over to the 2D scene until 0.5.3. The layered fallback still draws the 2D
opening (its stills are open), so parity at the opening is a known gap.

**0.5.1** (2026-11-19) brings the opening to life and makes it light: the
mist drifts (a composite each frame moves it over the kept light, three
texture reads a pixel, from `flowNoise`), the sky turns rigidly about a
pole at 42° so the bodies set and rise on real arcs, always forward (a dawn
turns on round, not back); the first load shows the sky at once and builds
the shape a slice a frame (coarse distances, the full pass in bands, the
horizons at half size), the mountains fading in. M4 @2: rest and switch
8.3 ms; the shape ~150 ms, spread over frames.

**0.5.2** (2026-11-19) makes the bodies and the ground read real: the sun
and moon change with height (white-hot, haloed and rayed high; low,
flattened, limb-darkened, orange to red, the moon amber to silver), the
backlit faces get the bounce off the lit mist and snow, the mist is bright
and heaped (no level top, lower), its wind one way at three scales, and the
snow matte, its patterns laid along steep faces.

**Next: 0.5.3** (`ROADMAP.md`, `0.5.x`): the cliffs' own detail, the phones,
the fallback's stills and the 0.5.0 carry-overs. The pool climb work stays open (`ROADMAP.md`, Planned), toward the pool climb at the screen's rate: 60 fps on 60 Hz
phones and 120 on 120 Hz, on normal phones, and 120 on the M4 with headroom
(`ROADMAP.md`, the 0.4.44 row). The house is the OnePlus's main cost; the
Moto G71 is slow every frame (its GPU, at full resolution). Measure
real phones with `npm run devices -- --climb` (BrowserStack, authorised by
the owner for this; it also prints the two loading holds) and the owner's
phone; phone GPU timers aren't available to web pages, so isolate costs with
URL flags (`?dpr=`, `?grass=0`, `?hao=0`, `?housecull=0`, `?earlyz=0`, `?skip=scene,meadow`, `?pvs=0`, …).

On 2026-10-29 the owner approved fully preparing the 0.4.35 reference
mirrors before strict comparisons. Use `scripts/prepare-house-reference.mjs`
in a separate reference worktree and `house-parity.mjs --prepared-reference`.
Keep original pixel limits and document untouched-reference differences.
This does not authorize other reference geometry/shader changes.

Full quality remains mandatory: retain wardrobe contents, all intended
geometry and plant variation; no reduced precision, resolution, samples or
detail to meet performance targets. Do not claim the pool jank is fixed.

## Versioning

The rebuild goes layer by layer, and the version line tracks which layer:
`0.1.x` the atmosphere (done), `0.2.x` about me (the camera pull-back,
done), `0.3.x` projects (the desk), `0.4.x` contact (current), `0.5.x` the
opening hills in 3D (next, from `0.5.0`), `0.6.x` the device screen, `0.7.x` header navigation, `0.8.x` real content, `1.0.0`
ship. The table, with where the
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
| Only docs (`*.md`, `*.txt`, `LICENSE`) | quick | parity at scroll 0 |
| Anything else | full | parity at every scroll, perf with its gate, switch |

The checks CI already runs (both test suites, hygiene) are left to CI and
not run locally (the owner, 2026-10-23); `npm run qa -- --ci` adds them.

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
npm run perf           # frame timing, fps gate, tile dropout (local, GPU); `-- --house` sweeps the house alone (info, not in qa)
npm run switch         # no cut in a day/night switch, frame by frame (local, GPU)
npm run qa             # runs the checks above, one table; before every push (local, GPU)
npm run sharp          # 5K/6K crest and grain crops, capped vs uncapped (local, GPU; not in qa)
npm run devices        # every shader on 31 real phones and tablets (BrowserStack; keys in .env.local; not in qa, on the owner's call); `-- --climb` times the pool climb on them
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
  page.jsx         — home: server-rendered h1/intro (visually hidden), the `about`, `desk` and `contact` scroll tracks
  house/page.jsx   — dev only (404 in production): a free camera through the house (components/HouseExplorer.jsx)
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
  scroll/descent.js    — the progress store (`about`, `desk`, `contact`), outside React; `?scroll=`, `?desk=`, `?contact=` pin it
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
    peaks.js, gl/peaksShader.js — the opening in 3D (0.5.0): its camera, the sun's and moon's paths; the terrain, mist, sky and bodies
    camera.js   — the descent (0.2): ridges, sky, ranges, meadow, palette, bodies, `ridgeLightAt`
    deskCamera.js — the 0.3 camera: the S path's keyframes, its pitch, the closing sky, the grass's light; the 0.4 one (CONTACT_PATH, the yaw, TURNED_HAZE, boxSeen)
    gl/grassShader.js, gl/footsteps.js — the meadow's instanced grass; the footprints (0.3.1)
    gl/bootPrint.js — the boot each print is, drawn fresh per load (0.3.2)
    gl/flowerShader.js, gl/treeShader.js — the wildflowers in the grass; the lone tree and copses, their shadows (0.3.5)
    gl/deskShader.js — the desk: a trestle table built in code, its grain and shadow (0.3.6)
    gl/laptopShader.js, gl/laptopShape.js — the laptop: meshed in code, its lid, keys, logo and screen, its shine (0.3.9); its size, finish, shadow and screen light (0.3.8)
    gl/tabletShader.js, gl/tabletShape.js — the tablet on portrait frames, leaning on its books; their size, shadow and screen light (0.3.10)
    gl/lampShader.js, gl/lampShape.js — the desk lamp: its mesh from a pose; its light, shadow, flicker, on-screen outline and drag (0.3.11)
    lampSpot.js, lampPose.js — the lamp's outline on screen and its dragged pose, outside React (0.3.11)
    treeSeed.js — the copses' seed: kept per browser, new on a hard refresh (0.3.11)
    gl/propsShader.js, gl/propsShape.js — the things on the desk: notebook and pen, mug and steam, sticky notes, glasses; their places, shadows and the lamp's keep-out (0.3.12)
    gl/meshKit.js — the primitives the lamp, the things on the desk and the house are built from (0.3.12)
    gl/houseShape.js, houseMesh.js, houseRooms.js, furniture.js, plantMesh.js — the house on its hill (0.4): its plan and zones; its shell; its rooms and curtains; its furniture; its plants
    gl/houseLightPlan.js, houseLights.js, lightFixtures.js — the house's lighting (0.4.28): the brief as data; its lights by room, packed into a texture for the shader (0.4.30); their fittings
    gl/houseShader.js, houseShadow.js, houseGlass.js, poolWater.js, bloom.js — its surfaces and lamps; the sun's shadow map; the glass and the water; the pool's waves and caustics; the night's bloom
    gl/houseWorker.js — builds and indexes the house off the main thread on approach/direct entry (0.4.37)
    gl/mirrorProbe.js — the mirrors' reflections: a probe of each one's room, box-projected (0.4.18)
    gl/garments.js — clothes: garments cut to their kind on hangers, a scarf, folded stacks (0.4.21)
    gl/homeDetails.js — sockets, switches, the Home display, the terrace's bar (0.4.22)
    gl/washrooms.js — the marble washrooms' cladding, toilet, vanity and walk-in shower (0.4.23)
    gl/butterflies.js — the butterflies, a fourth kind in the birds' pass (0.4.24)
    gl/fireflies.js — the fireflies by night, a fifth kind, glows added on (0.4.26)
    gl/personMesh.js — the walker's design: a figure built on a pose's joints (0.4.24; `?person=`)
    gl/birdShape.js, birdFlight.js, birdShader.js — the birds in 3D: swallows, kites, geese (0.4.4)
    freeCam.js — the /house route's free camera
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
docs/parts/       — one doc per part's internals (atmosphere.md, house.md); see "Parts"
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
| The atmosphere | [`docs/parts/atmosphere.md`](docs/parts/atmosphere.md) | Recipes, both renderers, parity, the switch, the `0.2`, `0.3` and `0.4` cameras, the meadow and grass, the URL and `data-` hooks |
| The house | [`docs/parts/house.md`](docs/parts/house.md) | The house on the hill and its pool: the plan room by room, glass, curtains, finishes, outside, how it's built |

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
  shadows), the closing sky's birds, clouds and stars, the lamp's flicker and the mug's steam run on GL's frame loop too, not a loop of their
  own. Don't add another animation loop. The camera is a pure function of
  scroll, never sprung; the scroll itself only snaps onto the stops.
- **Frame budget:** 120 fps on the sweeps in `npm run perf`, and sharp on
  every display (Pre-push checks).


## Open Tasks

| Task |
|---|
| Content layers: real projects, resume, dev log, contact (the descent and the desk: see `ROADMAP.md`) |
| The about-me content on the pull-back: sky lanterns are the favourite, not final (`ROADMAP.md`, "0.2") |
| `0.4.x`: contact, the house and the pool (`ROADMAP.md`, "0.4"); the house built (to `0.4.15`); `0.4.16`–`0.4.25` the owner's feedback batch, `0.4.26` its review and the flicker from afar, `0.4.27` the interiors' design pass (`ROADMAP.md`, "Upcoming patch releases"), `0.4.28` lighting every corner; `0.4.30` the lights fixed on Adreno; `0.4.31` the lived-in styling; `0.4.32`–`0.4.36` loading/rendering optimization; `0.4.37` the indexed-mesh/loading checkpoint with unresolved parity; `0.4.38` publishes the sharing/preparation/readiness batch; `0.4.39` image parity and a ~1.9× faster pool climb (`docs/optimization-0.4.39.md`); `0.4.40` light cells and culling, faster on real phones (`docs/optimization-0.4.40.md`); next `0.4.41` the climb at the screen's rate on real phones; then remaining walk/contact work |
| `0.6.x`: the device screen (`ROADMAP.md`, "The device screen") |
| Before `0.3` closes: the fallback's stills under the `0.3` camera (it holds the pull-back's end for now), reduced motion on the `0.3` path, and perf and parity over the `0.3` stretch |
| Ship hygiene before `1.0.0`: see `ROADMAP.md` (H1, SSR content, bundle) |
| Trust, privacy and accessibility (`ROADMAP.md`): analytics (Vercel, cookieless) and `/privacy` with `0.4`, form consent, keyboard, contrast, third-party audit; no fabricated facts |
| Decide whether an admin surface is still wanted |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
