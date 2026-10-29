# 0.4.39 — remaining full-quality rendering work

The owner selected this version on 2026-10-27 after requesting publication
of the completed 0.4.38 batch. Scope: resolve existing image differences,
finish pool-climb optimization, and obtain clean performance measurements.
Do not ask again which version to use. Do not interpret the 0.4.38 release
exception as permission to relax future fidelity or verification gates.

## Invariants

- Every intended object, full geometry and plant variation stays. Keep
  Float32 positions/normals, target sizes, samples and animation quality.
- Keep camera path and scroll mapping. Holds remain readiness-driven,
  reverse scrolling stays available. Captions belong to 0.6.
- Visual reference stays 0.4.35. Maximum RGB channel difference <=2/255;
  mean <0.2/255. No threshold changes to accommodate failures.
- No performance claim from buffer savings alone. Report all cases and
  regressions. Phone viewport emulation is not a physical phone test.

## Starting evidence

0.4.38 retains all original geometry, using 55,150,236 bytes of combined
house/curtain vertex/index storage (checkpoint 0.4.37 used 70,890,912).
It prepares scene-copy/bloom targets, warms water drop/step programs without
changing state/randomness, polls a GPU-completion fence for readiness, and
caches uniform locations including null. Unit/adaptive tests: 61/9 pass.
Wheel, touch-emulated and reduced-motion readiness tests pass. Eight
warm-up image controls are bit-identical before/after those changes.

Existing failures against 0.4.35:

| View | Theme | Viewport | Max /255 | Pixels >2 |
|---|---|---|---:|---:|
| contact .50 | day | 1440x900@2 | 22 | 36 |
| contact .50 | night | 1440x900@2 | 7 | 34 |
| contact .50 | day | 393x852@2 | 23 | 26 |
| contact .50 | night | 393x852@2 | 8 | 24 |
| contact .64 | night | 1440x900@2 | 38 | 37 |

Pool-above passes at both sizes (day max 0, night max 1); foyer desktop
night max 1. Full 104-view coverage is still required. The .64 differences
include a narrow vertical interior edge, worst physical pixel (1573,675).

Historical FPS runs are provisional: Roblox was active during the session,
and later used ~87% process CPU alongside significant WindowServer load.
Do not reuse those results as a clean before/after claim or silently close
the owner's apps. An optional question about a quiet test window was sent;
no answer was received before the release request.

## Deferred release checks

The owner reiterated “just push for now” after the full 0.4.38 QA run
passed standard GL/layered parity 46/46. Performance/memory stress was
interrupted after 21 minutes, and theme-switch QA was then interrupted
for the requested push. Neither is a pass. Re-run those stages as part of
0.4.39; the interruption-generated process-close error is not evidence of
a site crash.

## Next investigation

1. **Isolate the main depth prepass.** Expanded/unindexed full rendering
   previously reduced .50 to max 1. Expanded shadow-only, AO-depth-only,
   and colour/probe-only drawing each retain the max 7/.50 and 38/.64
   failures. Main depth-prepass-only is the next untested isolation.
   Temporary diagnostic buffers/options were removed from 0.4.38; a local
   scratch backup is not a release source. Avoid brittle per-object hacks
   without a proven cause and complete view coverage.
2. **Quiet profiling and comparisons.** Use the production checkpoint and
   candidate under the same browser/GPU, viewport, seeds and full quality
   (`adapt=0`). Never run GPU workloads concurrently. Record exact source
   identities; interleave median-of-three runs at 1440x900@2, 1728x1117@2
   and 393x852@2, both themes, whole journey and targeted climb. Include
   first/reverse/repeat traversal, p95/p99/max, >20 ms frames and long tasks.
3. **Find recurring cost at pool activation.** It adds a house reflection,
   water simulation and caustics. Use opt-in sampled GPU queries plus a
   CPU-only control. Dense timer queries perturb measurements. Shadow maps
   already cache by light direction; do not count that as a new optimization.
4. **Remaining lossless candidates.** Complete unexercised first-use draw
   paths (caustics/reflection/bloom), investigate bounded uploads and depth
   reuse only where evidence supports them. Warm-up must preserve clocks,
   randomness and simulation state. Retain resize/context-loss/failure
   handling, with no infinite hold or partial-house pop-in. Check whether
   frozen/reduced-motion frames can poll only an outstanding GPU fence,
   rather than scheduling RAF continuously while waiting for a later
   preparation milestone (the queue already wakes the renderer on progress).
5. **Full acceptance.** Run the 104-view image matrix, production full QA,
   unit/adaptive checks and real-phone/WebKit verification. BrowserStack
   remains on the owner's call. Record actual outcomes before a push.

Reflection depth-prepass and `WEBGL_provoking_vertex` first-vertex experiments
were removed: they did not fix inherited parity and shared-machine timing
was insufficient to justify promotion. All material/variant flat values
were equal across triangles, as were lamp-fitting IDs. Revisit only with
new evidence. Reference: [Khronos extension](https://registry.khronos.org/webgl/extensions/WEBGL_provoking_vertex/).

## Tools and local evidence

- `scripts/house-parity.mjs`: 104-case cross-version harness; candidate
  waits for actual readiness and finished probes. Root uses production;
  `/house` needs dev servers (production returns 404).
- `scripts/pool-sweep.mjs`: uninstrumented three-pair .35–.80 camera sweeps.
  It is not the complete journey or native scrolling.
- `scripts/pool-profile.mjs`: opt-in per-pass timings, `--gpu 0` CPU control.
- `scripts/house-readiness-browser.mjs URL`: real scroll milestone checks.
- Previous reference checkout: `/private/tmp/portfolio-v0435` at `be493c7`;
  production 3105, dev 3104. Check liveness before reuse.
- Checkpoint archive: `/private/tmp/portfolio-v0437-checkpoint`, source
  `2bc08b1`, `.next-checkpoint`, production 3110.
- Intermediate builds 3108–3114 are not automatically current. Rebuild
  from the actual committed 0.4.38 source before new performance claims.
- The user's server on 3000 must not be stopped or have its cache changed.
- Ignored reports under `scripts/out/house-parity-038-*` and
  `scripts/out/pool-sweep*`; durable numbers and experiment history are in
  [the 0.4.38 record](optimization-0.4.38.md).

## Investigation resumed 2026-10-29

Rebuilt production reference from `v0.4.35` (`be493c7`) in
`/private/tmp/portfolio-reference-035`; prior temporary checkout/servers
were no longer present. Candidate starts at released `7efdeec`.
Targeted cases: contact .50 and .64, night, 1440x900@2.

- Expanded main-depth-only, lawn-only, and all `houseGeometry` draws:
  unchanged maximum differences 7/38, respectively 34/37 pixels above 2.
- **Correction to the inherited hypothesis:** fully unindexed rendering
  also gives 7/38 on this rebuild. The previous claim that unindexing alone
  solves .50 is not reproduced; do not use it to justify storage exceptions.
- Original 0.4.35 shader plus unindexed rendering: still 7/38. Lighting
  shader changes alone do not explain these edges.
- One contiguous AO geometry draw, matching the reference's draw boundary:
  still 7/38. Removes one submission without dropping geometry, but is not
  a parity fix or a measured frame-time improvement.
- Glass disabled identically on both sides: 11/48. The difference exists
  beneath the glass; glass merely changes its final intensity.

Reports: `scripts/out/house-parity-039-{main-depth,lawn,all-geometry,
unindexed,original-shader,contiguous-depth,no-glass}`. Temporary expanded
buffers and the original-shader substitution were removed from source.
The harness now supports `--reference-query` alongside `--candidate-query`
for matching diagnostic settings, and labels overrides as diagnostic rather
than a full acceptance matrix. Thresholds remain unchanged.

### Reflection readiness isolated

AO disabled on both builds still fails (7/36). Mirrors disabled on both
builds passes (1/2). A **separate diagnostic reference** preserves 0.4.35's
geometry/shaders but removes its 28-metre probe preparation limit under
`?warmprobes=1`; this also passes both cases (1/2), with candidate mirrors
fully enabled. Report: `scripts/out/house-parity-039-warm-reference`.
The old reference can leave visible distant mirrors unprepared. Do not
remove the candidate's complete reflections to imitate this. This is not
an official baseline pass: the untouched reference still fails, and broader
coverage / explicit handling of the baseline preparation difference remain.

The diagnostic reference is production port 3120, build
`.next-reference039-warm`, with a single query-gated preparation change in
its temporary checkout. Untouched reference build remains on 3105. Harness
metadata now records reference working-diff hash as well as revision.

### Targeted confirmation and retained changes

The prepared-reference comparison passes **8/8**: contact .50/.64,
day/night, 1440x900@2 and 393x852@2. Maximum channel difference across
these cases is 2/255. Report: `house-parity-039-warm-reference-matrix`.
The owner approved the fully prepared 0.4.35 mirror reference on
2026-10-29, retaining the same strict thresholds and documenting the raw
reference differences. This preparation-only adjustment is now authorized.

Local candidate work also reuses Float32 mirror-uniform arrays, submits
contiguous house AO geometry in one draw, and restricts frozen/reduced-motion
readiness RAF polling to an actually outstanding GPU fence. The existing
preparation queue wakes the renderer as resources finish. Validation below
must distinguish these changes from the diagnostic reference adjustment.

Offline 16-bit index batching estimate (not implemented): full house buffers
51,584,364 -> 43,444,116 bytes across 15 batches; 980,522 stored vertices
versus 980,381 originally (141 duplicates), every original triangle and
Float32 attribute preserved. Needs runtime timing and parity before adoption;
extra submissions may offset bandwidth/memory gains. Curtains not included.

### Full matrix and the fitting-glow fix

The first full 104-view run against the prepared reference
(`house-parity-039-full`, candidate `7efdeec` plus the changes above) passed
99/104. All five failures were by night: the living room at both sizes
(max 8/255, 101 and 140 pixels over 2), the porch at 1440x900@2 (max 5, 15
pixels), and one pixel each in from-meadow and contact .60 at 393x852@2.
In the living room and porch only blue differed (+3.4 to +4.6, red and
green equal): a bright fitting whose red and green had saturated, showing
any change of strength in blue alone, on the stair's tread lights.

Cause: `0.4.36` gave each lamp triangle one fitting (its centroid's
nearest, read `flat`), where `0.4.35` found the nearest per pixel. In 705
of 22,964 lamp triangles the nearest fitting changes inside the triangle
(strips 1010–1017 and 1108 mostly), so parts of them took a neighbouring
strip's glow. Fix: `tagLampFittings` tests each lamp triangle on a
13-step barycentric grid and tags those 705 `FITTING_PER_PIXEL` (-2); the
shader runs `0.4.35`'s per-pixel search (`fittingGlowAt`) for them only.
Every other lamp triangle keeps its single tag, which matches the
per-pixel rule at every sample. A triangle is sampled only when the
winner's lead over the rest, measured at the centroid, is under twice the
triangle's radius (distances change by at most that much across it),
taking candidates from every grid cell its bounds touch; tagging costs
168 ms in the worker (1,028 ms sampling all of them). Unit test:
`scripts/house-fitting-test.mjs`.

Targeted re-run (`house-parity-039-fitting`, the four views by night at
both sizes): 8/8 pass, max 1/255.

**Full matrix with the fix** (`house-parity-039-full-fitting`; candidate
production 3128, build `.next-candidate039g`, `/house` from dev 3124;
prepared 0.4.35 reference 3127/3123): **104/104 pass**, `fullMatrix: true`,
worst channel 1/255, worst mean 0.00002/255, no console errors or blank
frames. The image differences inherited from 0.4.36–0.4.38 are resolved
against the owner-approved prepared reference. The untouched reference still
leaves distant mirrors unprepared (above); that difference is the
reference's, not the candidate's.

### The pool climb: every frame was drawn twice

Quiet machine (Roblox closed by the owner; only the harness's browser and
WindowServer busy). Paired, interleaved `pool-sweep` runs, three each,
candidate (fitting fix) against 0.4.38 (`7efdeec`, production 3126):

| Climb | 0.4.38 | Candidate |
|---|---:|---:|
| Night 1440x900@2 | 30.9 fps | 31.3 |
| Night 1728x1117@2 | 21.6 | 23.0 |
| Night 393x852@2 | 48.5 | 46.3 |
| Day 1440x900@2 | 29.9 | 31.1 |
| Day 1728x1117@2 | 22.2 | 24.1 |
| Day 393x852@2 | 48.4 | 45.2 |

No regression from the fitting fix, but the climb itself ran at 22–48 fps,
day and night alike. Isolation at night 1440x900@2 (each `--candidate-query`
against the same run's 0.4.38, whose own figure held 28.8–30.9): no single
optional pass explained it (grass off +4.9 fps, bloom off +3.9; glass,
caustics, mirrors and AO off were slower, AO off also losing the depth
pre-pass's early-z). At 1440x900@1 the climb ran ~50 fps against 31 at @2:
four times the pixels added only ~12 ms, leaving ~16–20 ms a frame that
didn't scale with pixels. A CPU profile of one climb: the main thread idle
3,825 of 4,187 ms, so not script.

Counting GL calls per animation frame found it: 33 million vertices a frame
at contact .6, 44 million at .8, the house (4.07M indices) put through
eight to eleven times. Each frame's passes (AO depth, depth pre-pass,
colour, the pool's reflection) ran **twice per animation frame**: `frame()`
clears `raf` on entry, a `kick()` during the frame (readiness and
preparation callbacks) then schedules the next frame, and the end of
`frame()` scheduled another regardless, overwriting `raf`. Two callbacks a
vsync, each drawing the whole scene. Fix: schedule at the end only if no
frame is pending (`!raf`). The second callback's `dt` was clamped to 1 ms
(both share the vsync's timestamp), so the water's fixed-step clock and the
sky clock had run ~3% fast at 30 fps; they now keep real time. 0.4.38 had
the same doubling.

Per animation frame after the fix (1440x900@2, night; 0.4.38 → candidate):
contact .35 21.8 → 8.4 ms (7.1M → 3.5M vertices), .6 48.6 → 22.2 ms
(33.1M → 16.5M), .8 90.0 → 44.6 ms (44.4M → 22.2M). Counts are from a test
harness wrapping the GL calls, so timings carry its overhead; the paired
sweeps below are the measurement.

Paired sweeps after the fix (`pool-sweep-039-raf-*`, three interleaved runs
each, median fps; 0.4.38 measured in the same runs):

| Climb | 0.4.38 | Candidate | >20 ms frames (0.4.38 → candidate) |
|---|---:|---:|---|
| Night 1440x900@2 | 23.3 | 44.7 | 710 → 736 |
| Night 1728x1117@2 | 21.1 | 41.0 | 661 → 788 |
| Night 393x852@2 | 48.2 | 84.3 | 803 → 175 |
| Day 1440x900@2 | 34.5 | 67.6 | 879 → 444 |
| Day 1728x1117@2 | 29.1 | 53.7 | 834 → 631 |
| Day 393x852@2 | 56.0 | 91.0 | 638 → 63 |

The candidate draws about twice the frames, so its >20 ms count is out of
more frames; p95 fell everywhere (night 1440x900@2 83.9 → 42.0 ms). 0.4.38
itself varied between sessions (23.3 here, 30.9 earlier at night 1440x900@2),
which is why only same-run pairs are compared. Still far from 120 fps.

### Real phones (`devices --climb`, 0.4.39)

`scripts/devices.mjs --climb` times the same climb on BrowserStack's real
devices (the owner authorised it, 2026-10-29; the goal is 60 fps on 60 Hz
screens and 120 on 120 Hz). First run, candidate after both fixes, night:

| Phone | GPU | Climb fps (three sweeps) |
|---|---|---|
| OnePlus 11R | Adreno 730 | 30.3 / 25.7 / 30.0 |
| Google Pixel 7 | Mali-G710 | 14.7 / 12.8 / 13.4 |
| Motorola Moto G71 | Adreno 619 | 3.9 / 1.1 / 3.0 |

That first run's refresh rates were wrong (read from the site's own frames, which
never stop at the climb); the screen's rate is now read on a blank page
first. Phones are 4× (OnePlus, 120 Hz) to ~20× (Moto G71) from the goal.

Repeated on the OnePlus with the screen's rate read on a blank page: 90 Hz
(BrowserStack's unit runs Chrome at 90), 30.1 / 25.9 / 30.4 fps. Per-frame
CPU inside the frame callbacks: OnePlus 7.7 ms of ~33, Moto G71 15–21 ms of
250–900: both GPU-bound. Diagnostics (`--climb --query`, night):

| Flag | OnePlus 11R | Moto G71 |
|---|---|---|
| none | 30.1 / 25.9 / 30.4 | 3.9 / 1.1 / 3.0 |
| `dpr=1` (a quarter of the pixels) | 38.3 / 34.5 / 38.6 | 7.0 / 4.7 / 6.4 |
| `grass=0` | 38.9 / 34.2 / 39.6 | 5.4 / 1.6 / 4.0 |
| `mirror=0` | 30.2 / 26.9 / 31.2 | 4.2 / 1.6 / 3.3 |
| `bloom=0` | 30.9 / 26.7 / 31.3 | 4.3 / 1.4 / 3.2 |
| `hao=0` | 27.6 / 21.6 / 27.7 | 2.9 / 0.6 / 1.2 |

The grass costs the OnePlus ~8 ms a frame; `hao=0` is slower everywhere
because it also drops the depth pre-pass that spares the house's shader the
hidden pixels. `?dpr=` is a new harness-only flag capping the pixel ratio.

### Grass and flowers: only the strips the camera can see

The grass drew all 196,608 blades (6 rings × 32² cells × 32) every frame,
each through a vertex shader that culls it 9 times over (once per vertex);
the flowers 15,360 the same way. `ringRanges` (grassShader.js) now tests each
ring's rows in chunks of 4 cells against `boxSeen` (conservative: it only
rejects a box whose eight corners lie past one edge), padded by a cell and by
the plant's reach (grass 0.6 m, flowers 0.8 m) from the ground to the hill's
top, and draws the surviving runs in their original order with a `uFirst`
offset, so every instance keeps its id (position, colour, wind). Opaque and
depth-tested, so the same picture. Tests: `scripts/grass-ranges-test.mjs`.

**Full matrix with all three changes** (fitting glow, single frame per
vsync, plant culling; `house-parity-039-full-cull`): **104/104**, worst 1/255,
worst mean 0.00002, no console errors. (`house-parity-039-full-raf`, the
earlier run, had one readiness timeout, guest by day at 393x852@2: source
was edited mid-run and the `/house` dev server reloaded under it. Rule: no
source edits while a comparison runs.)


An initial sampled GPU profile was noisy (reflection medians varied from
about 45 to 128 ms across traversals); no speed claim is supported. Reports
`pool-profile-039-initial` and CPU-only control `pool-profile-039-cpu`.

## Shipped, and what's next

0.4.39 was pushed on 2026-10-30 at the owner's request, before `npm run qa`
(run straight after; its table goes in the CHANGELOG). Final figures: the
full matrix 104/104 (`house-parity-039-full-cull`); the paired sweeps and
real-phone runs as in the CHANGELOG entry.

Next is **0.4.40** (`ROADMAP.md`): the climb at the screen's rate on normal
phones (60 on 60 Hz, 120 on 120 Hz) and 120 on the M4 with headroom.
Candidates, in order: bake the house's unchanging light per vertex (by
measured error, 2/255); cull the grass once per blade (transform feedback);
skip house chunks out of view; then measured experiments (one depth pass for
AO and the pre-pass, 16-bit index batches, the reflection drawing only what
can reflect). Phone costs: isolate with URL flags via `devices --climb
--query` (Android Chrome exposes no GPU timers). Mac pass timers
(`pool-profile.mjs`) over-report on ANGLE/Metal (each pass 8–29 ms inside
16.6 ms frames, 2026-10-30): use flag isolation and paired sweeps instead.
