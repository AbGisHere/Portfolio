# Renderer harness

Two scripts compare the atmosphere's renderers: WebGL (`gl`) and the layered
DOM fallback (`layers`). By default they run `layers` against `gl`. Use them
whenever a renderer changes. Parity proves the look didn't move, and perf
proves the frames got cheaper.

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
mean under 2 with a p99 under 24 means two renderers look the same (`layers`
against `gl`, over `0.2.0`'s 42 default cases: worst mean .67, p99 3). A
higher p99 with a low mean points at one local defect, and the `worst 32px
block` coordinates say where to look.

**Known gap in `0.2.3`.** The GL camera moved on (`0.2.1`'s ridge conveyor,
`0.2.2`'s look under scroll) and the layered fallback still runs the `0.2.0`
camera, so a default run exits 1: the 14 `-s0` cases pass (night worst mean
.81, p99 6, from the GL-only moon glow), the `-s0.5` and `-s1` cases fail
(day mean 17–29, night 11–17). The hit-target check passes at every
scroll. This is accepted within `0.2.x`; use
`--scrolls 0` for a passing check meanwhile. `0.2.4` brings the ridge light
to the resting scene in GL first, so scroll 0 will fail too until `0.2.5`
ports `0.2.1`–`0.2.4` to the fallback, with all 42 cases passing, before any
`0.3.x` work (`ROADMAP.md`).

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

## Contract a renderer honours

| Hook | Who | Meaning |
|---|---|---|
| `?renderer=gl` / `?renderer=layers` | page | Forces a renderer. With no param the page chooses (GL where supported, else layers). |
| `data-renderer="gl" \| "layers"` | scene wrapper | Which renderer actually painted. The harness reports it, so a silent fallback is visible. |
| `?freeze=1` | renderer | Draws time-dependent motion at its resting phase: veil drift offset **0** and veil opacity at its full value, and (GL) no idle drift and no wind over the meadow. Both renderers freeze the same way. |
| `?scroll=<0..1>` | descent store | Pins the descent's `about` (components/scroll/descent.js), so a frame mid-descent can be compared or timed without scrolling. |
| `?grain=0` | renderer | Omit the grain layer. Parity compares grain-free frames by default. |
| `data-sun-cx`, `data-sun-cy` | scene wrapper | The painted sun's centre in CSS px, relative to the element carrying the attributes. Used for the sun hit-target check. Without it, the check reports "none" and doesn't fail. |
| `button[aria-pressed]` | sun toggle | The day/night control. Tests should find it by role and name `/switch to/i`. |
| `localStorage['abg-theme']` | theme | `day` or `night`, read before first paint. |
| `?crest=cpu` | GL renderer | Compute ridge crests on the CPU instead of the GPU crest pass (the fallback path when float render targets are missing). |
| `data-crest="gpu" \| "cpu"` | scene wrapper | Which crest path the GL renderer used. |
| `?driftAt=<offset>` | GL renderer | Pin the idle seed-drift offset, even with `?freeze=1`. Use it to compare the two crest paths mid-drift. |
| `data-seed` | scene wrapper | The seed last painted (GL: idle drift included, and it only increases across switches). Sample it per frame to check a switch starts from the drifted seed with no jump and never runs backward. |
| `data-ready` | layered scene | Set once the layered renderer's ridge masks are painted. |
| `data-busy` | sun button | Present while a switch runs; clicks are ignored until it clears. `perf.mjs` records each switch until then. |
