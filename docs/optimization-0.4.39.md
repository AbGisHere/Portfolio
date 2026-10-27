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
