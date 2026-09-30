# Renderer harness

Three scripts check the atmosphere's renderers: WebGL (`gl`) and the layered
DOM fallback (`layers`). By default parity and perf run `layers` against
`gl`. Use them whenever a renderer or the switch changes. Parity proves the
look didn't move, perf proves the frames got cheaper, and switch proves a
day/night switch has no cut. They drive Playwright's Chromium only; WebKit
is checked by hand. Two `node --test` suites (`test:adaptive`, `test:unit`)
cover the pure maths without a browser, and `hygiene` checks the served
site.

Run them against a production server, not `next dev`. The dev build is
slower, and its overlay and HMR add noise:

```bash
npm run build && npx next start -p 3002
npm run parity -- --base http://localhost:3002
npm run perf   -- --base http://localhost:3002
```

`--base` defaults to `http://localhost:3001`. Output goes to `scripts/out/`
(gitignored).

## `npm run parity`

This compares the two renderers at rest for each viewport, theme and descent
position (`?scroll=`: the top, halfway and the end of the camera move), and
draws a diff between them.

| Flag | Default | Meaning |
|---|---|---|
| `--a`, `--b` | `layers`, `gl` | Renderers to compare |
| `--viewports` | `393x852@2,320x568@1,852x393@1,820x1180@1,1440x900@2,3440x1440@1,1600x300@1` | `WxH@dpr`, comma-separated |
| `--themes` | `day,night` | |
| `--scrolls` | `0,0.5,1` | Descent positions (`about`), each pinned with `?scroll=`. Case ids end in `-s<about>` |
| `--threshold` | `2` | Max **mean** absolute channel difference, on the 0–255 scale |
| `--p99` | `24` | Max **99th-percentile** per-pixel difference (the largest channel), 0–255. Catches a localised defect, like a misplaced sun or ridge, that the mean would dilute |
| `--sun-tolerance` | `1` | Max CSS px between the sun hit target's centre and the painted sun (at every `scroll`: the target follows the painted sun), and between the two renderers' painted suns (every case) |
| `--settle` | `2500` | ms to wait after load before capturing |
| `--grain` | off | Include grain in the comparison. It's off by default because grain is random noise that no two renderers can match pixel for pixel. Judge grain by eye in the report instead. |
| `--query`, `--query-a`, `--query-b` | none | Extra URL params (`k=v&k=v`) for both sides or one side. For example, `--a gl --b gl --query driftAt=0.25 --query-b crest=cpu` compares the GL crest paths mid-drift. `perf.mjs` takes `--query` too. |

How it works:
1. Each case loads `?renderer=<a>&freeze=1&grain=0&scroll=<about>` and the same for `<b>`,
   with the theme already in localStorage and `Math.random` seeded, so each
   renderer is repeatable.
2. It disables CSS animations and transitions, waits for the scene to
   settle, then screenshots.
3. The two screenshots are diffed in a blank page's canvas, so no image
   library is needed.

Output in `scripts/out/parity/`: `index.html` shows a | b | diff for every case
(the diff heatmap is amplified ×8, so faint drift still shows). There are also
per-case PNGs and `results.json`. The script exits with 1 if any case breaks a
threshold or logs a console error, and 2 if the script itself crashes.

What the numbers mean: a renderer against itself comes out at exactly 0. A
mean under 2 with a p99 under 24 means two renderers look the same. A
higher p99 with a low mean points at one local defect, and the `worst 32px
block` coordinates say where to look. The current `layers`-against-`gl`
result is under "Parity" in [`CLAUDE.md`](../CLAUDE.md#renderers); past
runs are in [`CHANGELOG.md`](../CHANGELOG.md).

## `npm run perf`

This measures, per renderer and viewport:
- **Switch:** the theme is toggled `--switches` times (default 4). Every
  `requestAnimationFrame` interval is recorded from the click until the
  switch has run its course (the sun button's `data-busy` clears: ~1.5s into
  night, ~4s into dusk), or for a fixed `--window` ms if given. The summary
  is fps, p50/p95/max frame time, the count of
  frames over 20 ms (dropped at 60 Hz), and long tasks.
- **Idle:** `--idle` ms (default 3000) with nothing clicked. The number to
  watch is `task ms/s`: main-thread time per second at rest. Anything that
  repaints every frame at rest shows up here.
- **Scroll:** the mouse wheel runs down the page's descent track and back up
  (`--scroll` sweeps, default 1; `0` skips it), with every frame recorded:
  fps, p95/max and frames over 20 ms. `sun y` is the painted sun's centre at
  the top, the bottom and back at the top, which confirms `about` moved the
  camera (and came back to rest). Known gap: the headless sweep doesn't
  quite reach the bottom of the track, so `about` stops a little short of 1.
- **Main-thread time:** CDP `Performance.getMetrics` deltas (`TaskDuration`,
  `ScriptDuration`, `LayoutDuration`, `RecalcStyleDuration`) for each phase.

Default viewports: `1440x900@2,1728x1117@2,393x852@2,3440x1440@1`. The run
prints a table, the GPU string Chromium reported, and writes
`scripts/out/perf/perf-<timestamp>.json`. Headless Chromium may rasterise on
the CPU (SwiftShader). Compare renderers **within one run** rather than trusting
absolute fps, or pass `--headed` for the real GPU.

GL steps its resolution down when busy frames run long (adaptive quality,
`0.2.4`), which would flatter a slow build. For a comparison between builds,
hold it off with `--query adapt=0`.

`npm run test:adaptive` (`adaptive-test.mjs`, `node --test`) checks adaptive
quality's decisions without a GPU, by feeding `adaptiveQuality.js` synthetic
frame intervals: smooth scrolls, bunched hitches, the first scroll after a
load, a GPU at half the refresh (120 and 60 Hz), stepping back up, the
lock-out and a resize.

### Profiling the shader (GL)

`perf` times whole frames. To see where a frame's GPU time goes, load a
pinned frame with `?bench=N` and read the scene wrapper's `data-bench` and
`data-bench-base`, then repeat with features compiled out by `?off=`:

```
/?renderer=gl&freeze=1&scroll=1&adapt=0&bench=200&off=rim,veil
```

Subtract `data-bench-base` (the sync's own overhead) from `data-bench`; the
drop against a run without `off` is that feature's cost. Run builds
interleaved and take the median of a few, since the GPU's clocks drift.

## `npm run switch`

A switch is one sky turn, so no frame of it may jump against its neighbours
(a "cut"). `switch.mjs` (`0.2.7`) runs each renderer × descent position
(`?scroll=`) × direction (day → night, night → day) on Playwright's
`page.clock`, paused and stepped in 16 ms rAF frames, with
`?freeze=1&grain=0`: two frames at rest, a click on the sun, then a frame
every 1/`fps` s through the switch and `after` ms past its landing.

```bash
npm run build && npx next start -p 3001
npm run switch -- --base http://localhost:3001
```

| Option | Default | Meaning |
|---|---|---|
| `--base` | `http://localhost:3001` | Production server |
| `--renderers` | `layers,gl` | Renderers to run |
| `--scrolls` | `0,0.5,1` | Descent positions (`about`) |
| `--viewport` | `1440x900@1` | One viewport, `WxH@dpr` |
| `--fps` | `30` | Frames captured per second of switch |
| `--after` | `1500` | ms captured past the landing |
| `--limit` | `3` | Ratio above which a step is a cut |
| `--live` | off | Drop `?freeze=1`: veils drift, wind runs |
| `--steps` | off | Print every case's ridge steps |
| `--save` | off | Write the frames to `scripts/out/switch/` |

Each consecutive pair of frames is scored as a mean absolute difference
(0–255) over the ridge area (below 45% of the height), the whole frame and
the worst 64 px block. A step's ratio is its size over the median of the
six steps around it, floored at .25; a **cut** is a ratio over `--limit`.
It then reloads on the landed theme and reports the distance to the landed
frame (`reload`), for information only: neither renderer lands on a fresh
load's scene by design. Exits 1 on a cut or a console error. The default 12
cases take about ten minutes.

The limit is tight: a clean switch peaks at ×2.9 (1440×900@1, the palette
ticking through 8-bit levels in both renderers alike), and the smallest cut
it has caught was ×3.2. Raise it if it flakes on other hardware. The
`0.2.7` before/after numbers are in [`CHANGELOG.md`](../CHANGELOG.md).

Caveats: layered `--live` runs are noisier (its veils run on the
compositor's real clock, not the fake one). It doesn't judge GL's
intended gradual reshape, only steps against their neighbours. It needs a
GPU, so it's local, like parity and perf.

## `npm run test:unit`

`unit-test.mjs` (`node --test`) checks the scene's pure maths without a
browser or a GPU: the colour module's round trips (`colour.js`: hex ↔ RGB,
hex ↔ oklab, `mix` landing on its ends, every recipe colour a 6-digit hex),
`paletteAt` hitting every keyframe exactly with no overshoot (`skyKeys.js`),
and `sceneAt` (`scene.js`) at rest, at `about` 1, under reduced motion and
mid-switch. The components import each other without file extensions, as
the bundler allows, so the script runs under a resolve hook,
`lib/resolve-js.mjs` (`node --import ./scripts/lib/resolve-js.mjs`). CI runs
it beside `test:adaptive`.

## `npm run hygiene`

`hygiene.mjs` runs the machine-checkable half of CLAUDE.md's pre-push checks
against a production server, with no browser. It reads the served HTML and
text routes, and the build output on disk: every sitemap route resolves and
has `lang="en"`, a unique title, a description, a canonical link, an
`og:image`, at most one `<h1>` and alt on every `<img>`; the 404 is the custom
page; robots.txt blocks nothing and points at the sitemap; llms.txt and the
favicon resolve; and `.next/static` holds no `.map` files. It exits 1 on any
failure.

```bash
npm run build && npx next start -p 3002
npm run hygiene -- --base http://localhost:3002   # default http://localhost:3000
```

CI (`.github/workflows/ci.yml`) runs it on every push to `main` and every PR,
after `npm run test:adaptive`, `npm run test:unit` and `npm run build`. The runners have no GPU,
so parity, perf, switch and console errors aren't part of CI.

## Contract a renderer honours

The URL parameters and `data-*` attributes the scripts rely on (the
renderer, freeze, scroll, grain and crest switches; the painted sun's centre;
`data-busy`, `data-seed`, `data-ready`, `data-quality`, `?bench` and
`?adapt=0`; the theme key in localStorage) are one table: "Hooks" under
"Renderers" in [`CLAUDE.md`](../CLAUDE.md#renderers). Change a hook there
and in the scripts together. What the harness assumes on top of it:

- `?freeze=1` freezes both renderers the same way (veil drift 0 at full
  opacity; GL also no idle drift or wind), or parity can't compare them.
- Without `data-sun-cx`/`data-sun-cy` the hit-target check reports "none"
  and doesn't fail.
- The sun button is found by `button[data-sun-toggle]` (or by role and the
  name `/switch to/i`), and `perf` times each switch until `data-busy`
  clears.
- `data-renderer` is reported with every result, so a silent fallback to
  `layers` shows.
