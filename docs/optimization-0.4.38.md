# 0.4.38 — smooth camera movement at full scene quality

Agreed 2026-10-27. The owner requested a local commit of the current
0.4.37 work, documentation updates, then `/compact` before implementation
of 0.4.38. Stop after the checkpoint commit. No push is requested for this
checkpoint. This document is the continuation record, not a claim that
the following fixes have shipped.

## Contract

- Preserve every intended object, including clothes inside the wardrobe,
  individual planting variation, full geometry, materials and animation.
- Keep Float32 positions and normals. No lossy packing, smaller rendering
  targets, reduced samples, lower refresh rates, omitted small/hidden details,
  or quality steps introduced to meet a performance result.
- Keep the existing camera path and scroll mapping. The overhead-desk and
  laptop holds depend on preparation milestones, not fixed durations.
  Reverse scrolling remains possible. Caption/content work stays out of
  this patch (the owner assigned those captions to 0.6).
- Visual reference remains v0.4.35, before the v0.4.36 lamp-tagging bug.
  Every RGB channel must differ by at most 2/255; mean must be below
  0.2/255. Never loosen the thresholds to fit a change.
- Smooth frame delivery is the primary result. Memory savings alone do not
  establish a frame-rate improvement. Publish all measured cases, including
  regressions and incomplete checks.

## Exact 0.4.37 checkpoint

Implemented: triangle-wide lamp-fitting tags and a flat integer varying;
bit-exact vertex indexing in original triangle order; indexed curtains;
CPU mesh-array references cleared after upload; approach-triggered house
generation; readiness-based overhead desk/laptop holds; a sky-colour veil
for direct house entry; packing/readiness unit tests and a cross-version
house comparison harness.

The experimental mesh cleanup in meshKit, garments, plants and furniture
was restored to the original full geometry. It is not part of this checkpoint.
Both the worker and synchronous fallback still pass
`uniqueParts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]` to
`packHouseMesh`. This unsuccessful diagnostic disables sharing for those
material IDs. Remove it as the first scoped 0.4.38 change, then measure.
`?houseindexed=0` is a diagnostic expanded drawArrays path, not a shipping
optimization; normal visitors use indexed drawing.

Measured buffer storage for the exact checkpoint on 2026-10-27 (decimal MB):

| Geometry | Raw vertices | Raw bytes | Packed vertices | Vertex-buffer bytes | Index-buffer bytes |
|---|---:|---:|---:|---:|---:|
| House, including the diagnostic exceptions | 4,072,662 | 146,615,832 | 1,417,622 | 51,034,392 | 16,290,648 |
| Curtains | 241,308 | 14,478,480 | 43,344 | 2,600,640 | 965,232 |
| Combined | 4,313,970 | 161,094,312 | 1,460,966 | 53,635,032 | 17,255,880 |

Combined storage is 70,890,912 bytes (56.0% below the raw buffers).
The previous full-geometry/default-sharing diagnostic measured 55,150,236
bytes combined; the exceptions therefore add 15,740,676 bytes. Remeasure
after removing them. Earlier ~43–46 MB claims describe an abandoned
geometry-cleanup variant, not this snapshot. None of these figures measure
total browser RAM, peak generation memory, textures or driver allocations.
Clearing typed-array references makes memory eligible for collection; it
does not prove a particular process-RAM reduction.

### Verification and known failures

- `npm run test:unit`: 55/55 pass at this checkpoint.
- `npm run test:adaptive`: 9/9 pass. Documentation links, version metadata
  and `git diff --check` also pass. Production release checks remain pending.
- Night, `contact=0.50`, 1440x900@2: max 7/255, mean
  0.000023919753/255, 34 pixels above the 2/255 limit. Worst physical
  pixel (1530, 651), around a narrow frame/wall edge. This is a real
  visual-gate failure despite the tiny affected area.
- Earlier three-view smoke: pool-above night max 1/255 (pass); foyer
  night max 1/255 (image pass), with dev-server preload warnings reported
  separately from the visual result. These do not prove full coverage
  of the final checkpoint.
- Expanded/unindexed diagnostic: approach max 1/255. Restoring the old
  shader or geometry, and exempting frame/architectural materials from
  sharing, did not fix the indexed max 7/255 difference. Adding
  `invariant gl_Position` worsened it and was removed. The exact cause
  remains unresolved; do not assert that GPU rounding is proven.
- Full 104-view matrix, fresh production QA and comparable median-of-three
  performance runs are pending. The owner reports renewed jank on the
  second climb toward the pool after earlier smooth movement. No current
  percentage FPS gain has been established. Historical 120 FPS results
  are not evidence for this checkpoint. Real-phone checks remain pending.

## Implementation order after compact

1. **Restore a useful baseline.** Remove the failed sharing exceptions,
   recount buffers, run the packing tests and targeted visual comparison.
   Keep that change isolated from subsequent experiments. Identify which
   source/build produced the smooth earlier run; never compare an old
   production server to new development code as a performance claim.
2. **Profile the second climb.** Add opt-in CPU timing and asynchronous
   GPU pass timings where `EXT_disjoint_timer_query_webgl2` is available.
   Read available results later, discard disjoint results, and provide a
   CPU/browser-trace path when the extension is absent. Record the frame
   at which `poolSeen` activates. Separate one-time preparation from
   recurring house, depth/AO, reflection, water, caustics and bloom costs.
3. **Complete first-use preparation.** The warm-up creates objects, but
   `copyFrame` allocates the scene-copy texture on use and bloom allocates
   targets on its first `apply`. Prepare actual-size targets and exercise
   the required paths before releasing the laptop milestone. Preserve
   water state, clocks and random sequences during warm-up. Account for
   resize, direct entry, failures and context recovery without an infinite
   hold. A completed GL call/linked program alone is not proof that all
   first-use GPU work has finished.
4. **Bound upload work.** Investigate allocating buffers once and uploading
   identical bytes in small `bufferSubData` tasks. Measure allocation stalls
   as well as upload stalls; smaller calls can increase total overhead.
   Keep the scene gated until complete, with no partial-house pop-in.
5. **Investigate duplicate depth processing.** The main view renders house
   depth for AO, another depth-only pass, then colour. Test whether depth
   can be shared/reused without changing precision, occlusion, other scene
   objects or draw-order outcomes. This is a hypothesis requiring visual
   proof, not an instruction to delete a pass blindly.
6. **Remove repeated setup.** Cache per-program uniform locations currently
   queried inside caustics/bloom draws; reuse suitable arrays and resources
   where profiles show allocation or state churn. Shadow maps already
   cache by light-direction key in `houseShadow.js`; do not count that as
   a new optimization. Reflection results cannot be reused across changing
   cameras/lighting/geometry unless they are actually unchanged.
7. **Optional lossless memory experiments.** Compare bounded 16-bit index
   batches with the current 32-bit stream, preserving triangle order and
   Float32 attributes. Include boundary duplication, extra draw calls and
   total GPU time in the decision. Investigate lower peak temporary memory
   during construction/packing. Neither experiment is accepted solely
   because its byte count falls.
8. **Resolve visual parity and verify the complete journey.** Fix the
   existing indexed-edge mismatch; run the full checks below and keep only
   changes supported by measured performance and visual results.

At the pool reveal, `poolSeen` enables another house draw for the water's
reflection plus simulation and caustics. This matches the reported location
but is not yet a measured diagnosis. Moving initialization earlier fixes
first-use stalls; it does not remove recurring per-frame rendering cost.

## Acceptance and reporting

- Same production-build settings, browser/GPU, viewport, seeds and full
  quality (`adapt=0`) for baseline and candidate. Interleave runs, do not
  run GPU benchmarks concurrently. Record source identity and clean/warm
  cache conditions; production servers must match their recorded sources.
- Median of three runs for every case at 1440x900@2, 1728x1117@2 and
  393x852@2, using the house sweep. Report FPS, p95/p99, worst frame,
  frames over 20 ms, long tasks and per-pass costs when available. Include
  a targeted second-climb segment, first traversal and reverse/repeat
  traversal. 120 Hz allows about 8.33 ms/frame, 60 Hz about 16.67 ms/frame.
- Full 104-view house comparison: 26 views, both themes, both configured
  viewports. Inspect amplified differences. Fix the harness's readiness
  wait first: it currently checks house existence after a fixed settle,
  not candidate `ready` and completed probes. Preserve genuine error
  detection; distinguish dev-only room warnings from production warnings.
- Run production `npm run qa -- --full`, unit/adaptive checks requested
  for this work, and document results. House comparison is additional to
  normal GL/layered parity; the layered renderer has no matching house.
- Phone-sized desktop Chromium is not a physical phone. Check the owner's
  Xiaomi at desk/pool, both themes, notification shade and five-minute
  memory behavior. BrowserStack runs remain on the owner's call; Vivo
  night needs three runs, then the full device suite. Confirm Safari/WebKit.
- Separate raw bytes, GPU geometry buffers, render-target memory, peak
  construction memory and measured process memory. Publish all cases and
  unresolved limitations before any push; checkpoint authorization does
  not waive the release gates.

## Continuation map

- Renderer/loading: `components/gradient/gl/MistCanvas.jsx`; worker:
  `houseWorker.js`; indexing/tagging: `houseLights.js`; flat tags:
  `houseShader.js`; water: `poolWater.js`; glow: `bloom.js`.
- Scroll milestones: `components/scroll/houseReadiness.js` and
  `components/SmoothScroll.jsx`.
- Tests/tools: `scripts/house-pack-test.mjs`, `house-readiness-test.mjs`,
  `house-mesh-stats.mjs`, `house-parity.mjs`, `perf.mjs`.
- Local reference checkout: `/private/tmp/portfolio-v0435` at `be493c7`
  (v0.4.35), with node_modules linked to the main checkout.
- Previously started servers: reference prod 3105 / dev 3104; candidate
  prod 3107 / dev 3106. Verify liveness and rebuild the candidate before
  benchmarking: its `.next-037` production build predates later source
  changes. The user's server on 3000 must not be stopped or have its cache
  changed. Use isolated `NEXT_DIST_DIR` values and webpack if needed.
- Ignored local evidence: `scripts/out/house-parity-smoke/results.json`,
  `house-parity-shellunique/results.json`, `house-parity-unindexed/results.json`.
  Other diagnostic reports are beside them. They may not survive checkout;
  the numeric findings above are the durable record.
- Do not restore `/private/tmp/portfolio-*037.js` cleanup experiments
  indiscriminately; current full geometry is intentional.

## Research references

- [WebGL GPU timer queries](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
- [Non-blocking shader completion](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/)
- [WebGL 2 buffer and drawing APIs](https://registry.khronos.org/webgl/specs/latest/2.0/)
- [WebGL performance practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
