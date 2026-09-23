# Renderer harness

Two scripts compare atmosphere renderers: the generated SVG engine (`svg`) and
the WebGL renderer (`gl`). Use them whenever the renderer changes. Parity
proves the look didn't move, and perf proves the frames got cheaper.

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

This compares the two renderers at rest for each viewport and theme, and draws
a diff between them.

| Flag | Default | Meaning |
|---|---|---|
| `--a`, `--b` | `svg`, `gl` | Renderers to compare |
| `--viewports` | `393x852@2,320x568@1,852x393@1,820x1180@1,1440x900@2,3440x1440@1,1600x300@1` | `WxH@dpr`, comma-separated |
| `--themes` | `day,night` | |
| `--threshold` | `2` | Max **mean** absolute channel difference, on the 0–255 scale |
| `--p99` | `24` | Max **99th-percentile** per-pixel difference (the largest channel), 0–255. Catches a localised defect, like a misplaced sun or ridge, that the mean would dilute |
| `--sun-tolerance` | `1` | Max CSS px between the sun hit target's centre and the painted sun |
| `--settle` | `2500` | ms to wait after load before capturing |
| `--grain` | off | Include grain in the comparison. It's off by default because grain is random noise that no two renderers can match pixel for pixel. Judge grain by eye in the report instead. |
| `--query`, `--query-a`, `--query-b` | none | Extra URL params (`k=v&k=v`) for both sides or one side. For example, `--a gl --b gl --query driftAt=0.25 --query-b crest=cpu` compares the GL crest paths mid-drift. `perf.mjs` takes `--query` too. |

How it works:
1. Each case loads `?renderer=<a>&freeze=1&grain=0` and the same for `<b>`,
   with the theme already in localStorage and `Math.random` seeded, so each
   renderer is repeatable. The SVG engine's grain overlay is hidden by CSS.
2. It disables CSS animations and transitions, waits for the scene to
   settle, then screenshots.
3. The two screenshots are diffed in a blank page's canvas, so no image
   library is needed.

Output in `scripts/out/parity/`: `index.html` shows a | b | diff for every case
(the diff heatmap is amplified ×8, so faint drift still shows). There are also
per-case PNGs and `results.json`. The script exits with 1 if any case breaks a
threshold or logs a console error, and 2 if the script itself crashes.

What the numbers mean: SVG against itself comes out at exactly 0. For a new
renderer, a mean under 2 with a p99 under 24 means it looks the same. A higher p99 with a low mean points at one
local defect, and the `worst 32px block` coordinates say where to look.

## `npm run perf`

This measures, per renderer and viewport:
- **Switch:** the theme is toggled `--switches` times (default 4). Every
  `requestAnimationFrame` interval is recorded for `--window` ms (default 700)
  after each click. The summary is fps, p50/p95/max frame time, the count of
  frames over 20 ms (dropped at 60 Hz), and long tasks.
- **Idle:** `--idle` ms (default 3000) with nothing clicked. The number to
  watch is `task ms/s`: main-thread time per second at rest. The SVG engine's
  veil drift can force a repaint every frame. A good renderer idles near 0.
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
| `?renderer=svg` / `?renderer=gl` | page | Forces a renderer. With no param the page chooses (GL where supported). |
| `data-renderer="gl" \| "svg"` | scene wrapper | Which renderer actually painted. The harness reports it, so a silent fallback to SVG is visible. |
| `?freeze=1` | renderer | Draws time-dependent motion at its resting phase: veil drift offset **0** and veil opacity at its full value (`--jg-veil-a`, the SVG veil with its CSS animation removed). Any other clock-driven motion, such as grain animation, sits at t = 0. The SVG engine gets the same state from the harness's CSS, so both sides are frozen the same way. |
| `?grain=0` | renderer | Omit the grain layer. Parity compares grain-free frames by default. |
| `data-sun-cx`, `data-sun-cy` | scene wrapper | The painted sun's centre in CSS px, relative to the element carrying the attributes. Used for the sun hit-target check when there's no SVG `circle` to measure. Without it, the check reports "none" and doesn't fail. |
| `button[aria-pressed]` | sun toggle | The day/night control. Tests should find it by role and name `/switch to/i`. |
| `localStorage['abg-theme']` | theme | `day` or `night`, read before first paint. |
| `?crest=cpu` | GL renderer | Compute ridge crests on the CPU instead of the GPU crest pass (the fallback path when float render targets are missing). |
| `data-crest="gpu" \| "cpu"` | scene wrapper | Which crest path the GL renderer used. |
| `?driftAt=<offset>` | GL renderer | Pin the idle seed-drift offset, even with `?freeze=1`. Use it to compare the two crest paths mid-drift. |
