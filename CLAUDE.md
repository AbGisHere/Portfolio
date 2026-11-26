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

**0.5.3** (2026-11-20) is a first cut of one world from the peaks to the
house: a meadow valley carved through the range (`peaks.js` `VALLEY`), the
flight back and down it onto the desk with no cut, and the 3D mountains
drawn behind the desk, the house and the pool in place of the 2D ridges
(`deskPeaksCamera`, the far-plane `behind` pass); the terrain baked at load.
Work in progress: see its `CHANGELOG.md` entry for what's open.

**0.5.4** (2026-11-20) puts the meadow on its own mountain: a deep
mist-filled trough below the range, an uneven rim with a grass shoulder
rolling into cliffs, grass texture on the plateau, and the range closing in
behind the house. Open items in its `CHANGELOG.md` entry.

**0.5.5** (2026-11-20) fills the trough with mountains rising out of the
mist, brings the plateau to ~3 km from the peaks and stands peaks close
around the house. Open items in its `CHANGELOG.md` entry.

**0.5.6** (2026-11-20) ends the plateau ~10 m past its trees on every
side (one rim for the terrain, the meadow's paint and the grass:
`peaks.js` `RIM_GLSL`), gives its edge rock and gullies, scatters the
trees over it, fixes the white line at the horizon (rays skimming the
plateau now start at its rim), keeps one mist whatever the camera's
height, and sizes the sun and moon by angle. Open items in its
`CHANGELOG.md` entry.

**0.5.7** (2026-11-20) remakes the day and the switch: a golden-hour
day (the sun 4.5° up on the left, blue overhead, white snow, warm light
against blue shade, a blue aerial haze, a light day grade), a sun that
melts into the sky (white core, gold glow, a starburst), a full gold
moon on the left too, and a timelapse switch: the body going crosses
the sky and sets at the right-hand corner while the other rises from the
left one; the night, exposure and grade follow the sun's height, and
the clouds sweep with the switch and return to the first load's.

**0.5.8** (2026-11-20) makes the day white, not golden (the sun 9° up,
near-white light, a white glow, white mist and clouds), lights the hero
peak alone by night (a cool moonlit fill, for the text planned beside
it), and guards `devices`' probe result.

**0.5.9** (2026-11-20) sets the hero peak apart by day too: a soft sky
fill on its faces, a touch more light, and clear of the haze the rest of
the range sits back in.

**0.5.10** (2026-11-20) speeds the opening up with the same picture (no
double march over the sky, per-frame light terms once a pixel, one pass
per new view, cached uniform locations, freed targets), loads in the
order things are met (mountains, then down to the desk, then the house,
all in the background) and closes the 0.5.0 carry-overs (shell variants
out, vertex tables kept, the scratch guard). M4 scroll 34 → 40 fps at
1728×1117@2. The Moto G71's climb fell to ~3 fps in 0.5.x (~7 at 0.4.59).

**0.5.11** (2026-11-20) bakes the far ranges (`BAKE.outer`, ±90 km),
read by the march while well above them: the flight ~1.5× faster with the
same picture (M4 1728×1117@2 scroll 34 → 58 fps since 0.5.9). Each
opening pass can be costed with `?skip=peaks-geo,…`. Found: the climb is
slower in 0.5.x on the Moto G71 and OnePlus 11R (the peaks behind the
house). (0.5.15: the Galaxy S21 runs the 3D opening; only the unused
one-pass `peaks-all` fails there.)

**0.5.12** (2026-11-20) makes the first load lighter: no throwaway
WebGL2 context, the renderer's chunk fetched as the page loads, Unbounded
at its one weight (fonts 82 → 53 KB).

**0.5.13** (2026-11-20) prepares the climb's peaks before the frame and
only where the house leaves sky, works the light's per-frame terms once a
frame, draws the flight's shape at half size only while it moves, compiles
the peaks in parallel and moves the house builder out of the first
download; the checks now catch a broken part (`regress` in `qa`, the known
gap reported as a gap, `freeze` repeatable). Pushed before a full `qa`.

**0.5.14** (2026-11-20) fixes 0.5.13's flight left at half size after a
scroll (and marched every idle frame), a seam at half size, and frees the
new programs on unmount.

**0.5.15** (2026-11-20) fixes the checks, not the site: `devices` on the
S21 (a fresh context after a failed program; `peaks-all` unused with float
targets) and iOS 15 (the site read first), `parity`'s regress (no baseline
fails) and its known gap; 0.5.14 is the same picture as 0.5.12.

**0.5.16** (2026-11-20) ships the house's lightmap baked (H1:
`npm run lightmap-bake`, `public/lightmap/`; `?lmbaked=0` bakes on the
device; the unit test fails when it's stale) and adds `deviceProfile.js`,
where loading choices live until the device tiers (`ROADMAP.md`).

**0.5.17** (2026-11-21) draws the pool climb at half size while the camera
moves (`climbScale`, `frameScale`, `fw()`/`fh()` in `MistCanvas.jsx`; the
frame scaled up in `showFrame` and the bloom; full size at rest and under
`?freeze=1`; `?motionres=0` off): M4 night climb 36–50 → 93–101 fps, stills
identical. It moves more sky terms into the constants pass, stops preloading the
fonts, and adds the frame at rest to `perf` (info): the pool at rest
redraws the whole scene every frame (M4 night 71 fps, 174 calls). P2
(reprojection) measured, not built.

**0.5.18** (2026-11-21) fixes the switch's ×3.1 step: the fallback's moon
glow eased to opacity exactly 1 on landing, which Chrome draws by another
route; it stops at 0.999.

**0.5.19** (2026-11-21) draws less at rest, same picture: the opening
alone redraws at 10 Hz (`PEAKS_REST_HZ`), and the pool keeps a still frame
(the house, the desk; `still`, `?still=0` off, `?stillcheck=1` to compare):
pool by night 10.6 → 8.9 GPU ms. Pushed without `qa`, on the owner's call.

**0.5.20** (2026-11-21) turns the climb's half-size frame off (the
owner's call: too soft; `?climbres=1` on), keeps the mountains behind the
house with the still frame and redraws the opening at 4 Hz at rest.

**0.5.21** (2026-11-21) rebuilds the kept frame only when its key
changes (no 2 s refresh; the lamp only with the desk in frame): no late
frames at the pool at rest. `?framegrab=1` measures change per frame.

**0.5.22** (2026-11-21) cuts GPU, CPU and load cost across rest, climb and
startup at full settled quality:
- At rest: opening 2D ridge work skipped when 3D peaks cover the frame
  (true 3.95 Hz rest rate); `stillHit` skips `peaksPrepare` and invalidates
  attachments before blit; cached bloom glow (`?bloomcache=0` off); desk
  hold `still` + 15 Hz `stillWorld` (`?stillworld=0` off); pool-only
  `copyFrame` (`?poolcopy=0` off); 60 Hz caustics synced to `water.step()`
  (`?causticssync=0` off).
- Moving & climb: frustum-culled desk passes (`?deskcull=0` off); Early-Z
  mesh-based `MEADOW_LAWN_PAINT` + `MEADOW_FLOWERS_FLAT` (`?meadowmesh=0`
  off, `-5.20 ms` at pool night); narrowed peaks G-buffer (`RGBA8` / `R16F`)
  and split `COMMON_CAM` / `COMMON_TERRAIN`; grass CPU cliff-rim culling;
  `treeShader` early corner reject & discard-free `TREE_OPAQUE_FRAGMENT`;
  memoized `rgb01`, precomputed `uNightOn`, and `HouseFrame` UBO (`std140`,
  orphaned via `bufferData(STREAM_DRAW)`); `0.5×` moving `peaks-behind`
  (house stays `1.0×`).
- Load & memory: single-pass `terrain2(p)` in `PEAKS_BAKE_FS`, lazy
  `houseSubsystem.js` dynamic import out of the hero chunk, deferred
  `crestGpu` compile, and `peaksKept` freed past the opening.
- M4 `1440×900@2` (`?bench=60`, net GPU ms): Desk Day `5.20 → 2.50 ms`
  (`-52%`), Desk Night `5.30 → 2.20 ms` (`-58%`), Pool Day `7.30 → 4.80 ms`
  (`-34%`), Pool Night `16.80` (pre-`M2` `?still=0`) → `11.60` (`?still=0`)
  → `6.60 ms` at rest (`-61%`).

**0.5.23** (2026-11-21) fixes 0.5.22's opaque tree pass, which failed
to link (`vKind` not `flat` in its fragment shader).

**0.5.24** (2026-11-21) draws the desk's laptop, lamp and props always
(0.5.22 culled them; with all three out of a frame, iOS 16 Safari hung on
the climb). The iPhone SE 2022 (iOS 15) hang is older and open.

**0.5.25** (2026-11-21) makes `perf`'s views at rest wait for the load to
settle before counting (`--rest-only` runs just them): opening 4/s, desk
and pool every frame over the kept frame (~27 calls), frozen 0.

**0.5.26** (2026-11-21) draws at rest only the grass blades that grow
(a transform-feedback list made when the camera holds; `?grasslist=0`
off), same picture: desk 87k → 47k blades, bench 4.0 → 3.2 ms. Pushed
without `qa`/`devices`; the 15 Hz world rebuild (11–14 ms) is next.

**0.5.27** (2026-11-21) has `devices` check the grass list: the grass
linked and run with transform feedback in the probe, and the desk at rest
building its list (`data-grass-list`) on each phone.

**0.5.28** (2026-11-22) ships Tier 1 & Tier 2 GPU/CPU optimizations, sharp
`1.0×` climb mountains and GPU unmount cleanup:
- At rest: moves static tree wood, lawn, sky/peaks, desk & tree shadows out
  of the 15 Hz `stillWorld` rebuild into `0 Hz` `still` (15 Hz rebuilds only
  tree leaf cards + meadow); filters 120 Hz `house-under` caustics to the
  pool-basin runs (`?poolruns=0` off); adds a transform-feedback wildflower
  live-list splitting near (24-vert) vs far head-only (6-vert) flowers
  (`?flowerlist=0` off, `15,360 → 1,139` desk / `984` pool, `>92%` culled)
  plus early circle reject in `FLOWER_FRAGMENT` and cached `flowerRanges`.
- Climb & shaders: restores hardware Early-Z/Hi-Z in the house depth prepass
  (`HOUSE_DEPTH_SOLID_FRAGMENT`, `vZ` from VS) and solid variants (dedicated
  `HOUSE_MIRROR_FRAGMENT` for pool reflection); splits `houseGlass.js` into
  `GLASS_PANE` (guarded `edgeCol` fetch, hoisted `si`/Fresnel) and indexed
  `GLASS_WATER` (`82k → 13.9k` verts); exact 4-tap bilinear `bloom` bright
  pass + tile invalidation; `RG16F` water sim + 1-pass precomputed caustics
  slope (`water-caustics-slope`); `RGBA8` `glass.tex` copy; one-time static
  `mirrorUniforms` + unit-15 atlas rebind fix; `peaksShader.js` `Hm` in
  `coneReach`, packed `strata` in `o1.w`, hoisted cloud/moon sky constants
  (`20×1` `peaksConsts`), `0.24` near-spire march step fixing the right-hand
  summit overhang, and `pk.behind` restored to crisp `1.0×` with hardware
  `aoPass.depth` culling.
- Cleanup: disposes grass/flower TF GPU buffers/VAOs/fences and water glass
  buffers on unmount; closes 3 stale `Planned` rows in `ROADMAP.md`.
- M4 `1440×900@2` (`perf --house`): Day climb `109.2 fps` (`p50 8.3 ms`,
  `max 17.6 ms`, `0 > 20 ms`), Night climb `109.2 fps` (`p50 8.4 ms`), rest
  draws `5` calls at desk / `8–9` calls at pool (`p50 8.3 ms`, `p95 9.2–9.3 ms`).

**0.5.29** (2026-11-22) polishes 3D mountain rock, geological strata, snow
flutes and hero peak framing, and removes scroll lag on the laptop top-down →
open transition:
- Peaks look (`peaksShader.js`, `peaks.js`): fixes world-space `(dx, 0, dz)`
  bump flattening on `±Z` faces with pixel-footprint anti-aliased tangent-space
  `(tg, bt)` sculpting (`n.y >= 0.05` safe); adds aperiodic alpine granite
  geology (`geoBand`, vertical `rib`, diagonal `joint`), curvature-driven
  couloir & high-altitude glacier snow flutes (`highCling`, `fluteSnow`),
  layered dark slate / mid & pale granite + scree/mineral variation, warm-vs-cool
  directional sky hemisphere fill (`skyDir`), softer snow crevice AO (`effAO`),
  and a highlight shoulder above `0.74` preserving sunlit 3D ridge detail; raises
  `PEAKS[0]` to `[300, 3300, 1820, 1850]` (`CEILING = 4900.`) so the central
  massif rises cleanly into the lower ~35–40% of the sky with open flanks for
  future typography.
- Laptop top-down → open & climb speed (`peaksShader.js`, `MistCanvas.jsx`):
  adds analytic meadow plateau exit + single wide-cone center ray (96 max steps)
  in `coneReach()`, scopes `.24` close-spire stride strictly to peaks behind the
  house (`t < 2600 && p.z < SHELF.z - 200`), deduplicates `geo()` noise calls
  (`~34 → ~15`/px), and uses `0.55×` motion scale for `pk.behind` with
  generalized `uPeakAOScale` culling while snapping to native `1.0×` at rest.
- M4 `1440×900@2`: laptop top-down → open sweep `89.7 → 113.9 fps`
  (`p50 8.3 ms`, `>14 ms` frames `88 → 17`, `0 > 20 ms`); `test:unit` 88/88,
  `test:adaptive` 9/9, `hygiene` all passed, zero console/WebGL warnings.

**0.5.30** (2026-11-22) ships temporal mountain reprojection while scrolling,
Mali/Galaxy S21 shader slimming, scroll CPU/spike cleanup, and measured at-rest
redraw throttling:
- Temporal reprojection & horizon scissor (`peaksShader.js`, `MistCanvas.jsx`,
  `?reproj=0` off): zero-copy ping-pong `peaksGeo` / `peaksGeo.prev` FBOs reuse
  valid interior mountain pixels with 2-step rotation + parallax refinement,
  4-neighbor silhouette edge guards, pre-reprojection analytic meadow checks,
  `coarseT` foreground occlusion rejection, and a 1-fetch `H()` surface check,
  snapping to a fresh native `1.0×` march at rest; height-scaled `horizonClipY`
  + strictly-in-rim `READ_G` analytic meadow hit clip below-horizon rays on
  desk and house views while staying off over the high descent valley.
- Mali shader slimming (`peaksShader.js`, `crestShader.js`): splits
  `COMMON_TERRAIN` into minimal per-pass chunks (`TERRAIN_BASE`, `TERRAIN_BAKE`,
  `TERRAIN_COARSE`, `TERRAIN_HOR`, `TERRAIN_GEO`), moves `PEAK[12]` out of
  `COMMON_CAM`, and splits `SHADE_ATMO` for `PEAKS_CONSTS_FS` (`PEAKS_BAKE_FS`
  `-50%`, `PEAKS_COARSE_FS` `-53%`, `PEAKS_HOR_FS` `-54%`, `PEAKS_CONSTS_FS`
  `-68%`); rewrites `CREST_FRAGMENT` with hoisted per-ridge scalars and a
  non-unrolled `uLoop4` loop (~4× smaller compiled IR on Mali).
- Scroll CPU & spikes (`MistCanvas.jsx`, `grassShader.js`): camera-motion-gated
  `preparation.canRun()` (never deadlocks at the laptop hold) + `peaksNow.skipGeo`
  in `openingFirst()`; zero-alloc row-frustum-culled `ringRanges()` +
  `grassRangeCache` (`grass` CPU `1.2–2.6 → 0.3 ms`); preallocated `rebuild()`
  `Float32Array`s, skipped 2D ridge math under 3D peaks, cached `dataset.*`
  writes (`setDs`), numeric `lampPose` key (no `JSON.stringify`), and skipped
  empty bird uploads.
- Measured at-rest redraw throttling (`MistCanvas.jsx`, `?restthrottle=0` off):
  syncs pool rest draws to 60 Hz water/firefly ticks and desk/house rest draws
  to 30 Hz wind ticks (60 Hz while birds fly).
- M4 `1440×900@2`: house climb `72.0 → 101.1 fps` (`p50 8.3 ms`, `>20 ms`
  `74 → 8`, `max 533 → 183 ms`), laptop top-down → open `115.5 fps`
  (`p95 10.0 ms`, `peaks-coarse 8.49 → 0.62 ms`, `peaks-geo 10.27 → 1.54 ms`),
  switch `120.0 fps` (`0 > 20 ms`), rest draws: `desk 26.0/s`,
  `pool-night 26.0/s`, `pool-day 51.5/s`, `opening 5.7/s`; `test:unit` 88/88,
  `test:adaptive` 9/9, `hygiene` all passed, end-to-end scroll past open laptop
  to pool verified (`0` errors).

**0.5.31** (2026-11-22) eliminates first-use shader/PSO/FBO scroll spikes,
cuts house `mesh-ready` (`5,034 → 963 ms`) and full `ready` (`20,303 → 2,547 ms`),
and reduces VRAM and per-frame GPU/DOM work:
- Non-blocking shader link & Metal/ANGLE PSO warm-up (`MistCanvas.jsx`,
  `poolWater.js`): `meadowPrograms()` only waits synchronously on `meadowPaint`
  during live scroll while polling `meadowPaintFlat`, `meadowFlowers`,
  `meadowFlowersFlat`, `meadowLawn` and `meadowFoot` non-blockingly (removing a
  `74.8 ms` flight stall); adds `1×1` scissored offscreen PSO warm-up draws in
  `warmDeskPipelines` (every desk/meadow pass + `P.direct`/`P.behind`) and
  `warmHousePipelines` (all 3 house VAOs — `house.vao`, `house.leaves[0].vao`,
  `house.curtains.vao` — across `aoPass.solidProg`, `aoPass.prog`, `P.geoFar`,
  `house.mirrorProg`, `house.prog`, `house.variants[0..4]`, `meadowLawn.prog`,
  `glass.prog`, and `glass.waterProg`), plus `caus.slopeProg` and all 3 RGB
  `gl.colorMask` passes of `caus.prog` in `water.prepare()`.
- House readiness & background queue (`MistCanvas.jsx`): starts `loadHouseSub(true)`
  on mount with streaming `/house/house.bin.gz` in production; fixes
  `ensureWarmHouse()` downgrading `'mesh-ready'` to `'loading'`; computes
  exact `about = 1, desk = 1` lighting via `houseLighting()` so `shadowNow` and
  all 18 mirror probe faces bake while the visitor is still at `scroll = 0`;
  runs `createPreparationQueue` with `backoffDelay: 16`, wrapped `() => next()`
  idle callbacks, and `orbit || !settled()` pause + post-orbit background probe
  refresh in `stepOrbit()`.
- Persistent FBOs & VRAM savings (`MistCanvas.jsx`): shares `aoPass.frame`
  (`RGBA8 + DEPTH24`) with `deskFrameTarget()` and frees `deskFrame` once
  allocated (`-62.2 MB` VRAM); pre-allocates `stillTarget()` and
  `stillWorldTarget()` in `warmHouse` and keeps `still`, `stillWorld` and
  `peaksGeo.prev` allocated across scroll (eliminating `67–149 ms` mid-scroll
  FBO deletion/status stalls); skips compiling inactive device geometry
  (`tabletProgram` on landscape, `laptopProgram` on portrait) during idle
  warm-up.
- Shader, CPU & DOM hygiene (`meadowShader.js`, `peaksShader.js`,
  `MistCanvas.jsx`, `SunToggle.jsx`): early `discard` in `MEADOW_PAINT` and
  `MEADOW_LAWN_FRAGMENT` past `uPaintNear.y` (`240 m`) or zero alpha; bounds
  `meadowAt.top` scissor to `< 242 m` when `peaksNow.behind` is active; skips
  `skyRaw()` in `haze()` when `amt <= 1e-4`, `mistLit()` when `g.T >= .9999`,
  and `uG2` horizon fetch in `readG()` when `g.hit <= 0.`; discards stale
  transform-feedback fences immediately on camera motion; caches `lampHitOn`
  when `deskSeen`; skips `--spot-x`/`--spot-y` DOM writes in `SunToggle.jsx`
  while off-screen.
- M4 `1440×900@2` (`npm run perf`): `mesh-ready` `5,034 → 963 ms`, `ready`
  `20,303 → 2,547 ms`, full scroll `98.2 fps` (`max 86.0 → 33.3 ms`, `0` long
  tasks, `RecalcStyleDuration` `149.1 → 114.2 ms`), house climb `94.1 fps`
  (`p50 8.4 ms`, `p95 16.9 ms`, `max 183.1 → 41.7 ms`, `>20 ms` `8 → 4`),
  switch `120.0 fps` (`max 9.4 ms`, `0 > 20 ms`), idle `120.0 fps` (`0 > 20 ms`).

**0.5.32** (2026-11-23) adds real-phone BrowserStack profiling
(`scripts/device-profile.mjs`), self-hosts the Latin fonts (`app/fonts/`),
and ships 4 phone-driven GPU/VRAM/shader fixes:
- Real-phone profile & self-hosted fonts (`scripts/device-profile.mjs`,
  `app/fonts.js`, `app/fonts/`): profiles refresh rate, load (`meshReady`,
  `ready`, JS heap), rest draw rates, flight/desk/climb/whole scroll, and
  switch across 10 BrowserStack phones/tablets; Galaxy S21 (`Mali-G78`) now
  completes the house in `18.9 s` (`51 MB` heap) and runs at `56.1 / 57.0 /
  41.2 / 57.7 fps`, Pixel 10 (`PowerVR DXT`) runs desk at `59.3 fps` and climb
  at `58.2 fps`, and OnePlus 11R runs switch at `90.6 fps` (`0` late); switches
  `app/fonts.js` to `next/font/local` (`unbounded-latin.woff2`,
  `jetbrains-mono-latin.woff2`) so production builds never depend on fetching
  Google Fonts.
- Adreno 619 VRAM context-loss fix (`MistCanvas.jsx`): removes eager
  `stillTarget()` / `stillWorldTarget()` allocations from `warmHouse` at
  `scroll = 0` and frees `still` and `stillWorld` when returning to the 3D
  opening (`peaksNow?.a >= 1 && !peaksNow.behind`) so budget Adreno 619 devices
  (`Moto G71`, `Galaxy Tab A9+`) never hold `still` + `stillWorld` +
  `peaksGeo.prev` + `aoPass` in VRAM simultaneously.
- Mobile ANGLE sampler validation & PSO warm-up (`MistCanvas.jsx`, `bloom.js`):
  initializes non-zero camera projection (`uPitch`, `uYaw`, `uScreen`,
  `uDepthAB`, `uLightVP`) in `house.ubo`, `glass`, `aoPass`, and desk/meadow
  shaders plus distinct sampler units (`uScene = 11`, `uWater = 8`,
  `uReflect = 12`, `uMeadow = 5`, `uGrain = 2`, `uDeck = 6`, `uBack = 7`) so
  `1×1` warm draws never fail ANGLE's `validateSamplers()` or divide by zero in
  `project()`; binds unit 15 via `mirrorProbes()` and unbinds FBO textures on
  units `12/13/21–23` during `warmHousePipelines`; warms `bloom` (`bright`,
  `blur`, `add` blended & unblended) in `bloom.prepare()`; pre-warms
  `peaksMoonFace()` in `warmDeskPipelines`; pre-starts `startHouseAsync()` and
  `startShadowAsync()` as soon as `houseSubsystem.js` loads while `houseWorker`
  downloads `/house/house.bin.gz`; and defers post-switch `queueStaleProbes()`
  while at the opening (`about <= 0.35`).
- Night climb light-cell early-reject (`houseShader.js`): in
  `HOUSE_LIGHT_UBO_GLSL` (`lampsAt`), early-exits empty light cells
  (`cell.y < 0.5 && cell.w < 0.5`) before fetching `L_RANGE(room)`, fetches
  `L_P(i)` first to reject out-of-radius lights (`dot(d, d) > lp.w * lp.w`)
  before fetching `L_K(i)` / `L_W(i)` / `LD(3, i)`, and skips `stripsAt()`
  when `cell.w < 0.5` (keeping `HOUSE_LIGHT_GLSL` for `houseLightmap.js`
  unchanged).
- M4 `1440×900@2` (`npm run perf`): full scroll `100.1 fps` (`p95 16.8 ms`,
  `>20 ms` frames `61 → 34`, `RecalcStyleDuration` `114.2 → 94.8 ms`), house
  climb `97.7 fps` (`p50 8.4 ms`, `p95 16.7 ms`, `>20 ms` `4 → 2`), switch
  `120.1 fps` (`max 9.4 ms`, `0 > 20 ms`, `TaskDuration` `1,936.6 → 503.4 ms`),
  idle `120.0–120.2 fps` (`0 > 20 ms`, `8.4–12.5 ms/s` task time).

**0.5.33** (2026-11-23) fixes all 3 QA `switch` seam failures, eliminates
Adreno 619 `webglcontextlost` across both Moto G71 5G and Galaxy Tab A9+, and
cuts climb draw calls and Night shading cost across mobile and desktop:
- Seamless opening `switch` (`peaksShader.js`): clamps `base` and `mist` to
  `[0, 1]` before `compose()` in `PEAKS_LIT_FS` at the opening (`uNear <= 0`)
  to match `PEAKS_FS` (`RGBA8` `peaksKept`) + `PEAKS_MIX_FS`, fixing all 3
  `switch` failures (`scroll 0 day→night` `×3.8 → ×2.5`, `scroll 0 night→day`
  `×4.1 → ×2.5`, `scroll 0.5 night→day` `×3.1 → ×2.2`; `regress mean 0.00`).
- Adreno 619 stability & VRAM (`MistCanvas.jsx`, `peaksShader.js`,
  `AtmosphereField.jsx`, `scripts/device-profile.mjs`): lazy-allocates
  `peaksGeo.prev` (`~28 MB`) on first scroll move instead of at `scroll = 0`,
  deletes `deskFrame` *before* allocating `aoPass.frame` (`-18 MB` peak),
  bands post-move `1.0×` `peaksGeo` refinement into 8 geometry + 4 horizon
  bands (displaying the completed `0.5×` frame from `peaksGeo.prev` until
  `1.0×` completes, with per-band `aoPass.depth` culling behind the house) so
  Adreno 619 never hits Android's GPU TDR watchdog, scopes `tryReproj()` in
  `PEAKS_GEO_FS`, warms `P.geoFar` with a matched `1×1` `RGBA16F + RGBA8 +
  DEPTH24` target (no `checkFramebufferStatus` GPU sync), logs `[gl-fallback]`
  and `webglcontextlost` descent state into `window.__errors`, and adds
  `--out`, end-of-session `ctxLostAt`, `finalRenderer`, and `window.__errors`
  capture to `scripts/device-profile.mjs`. Both Moto G71 5G (`house ready
  33.2 s`, `38 MB` heap) and Galaxy Tab A9+ (`house ready 31.9 s`) now
  complete the entire profile on WebGL2 with `0` context losses and `0` errors.
- Climb draw-call reduction & Night GPU speedup (`MistCanvas.jsx`,
  `houseShader.js`, `bloom.js`): coalesces contiguous variant-split runs in
  `drawSolid()` for single-shader passes (`aoPass` depth, `poolReflection`),
  caches culled leaf ranges across `aoPass` + `solid` and per-offset leaf VAOs
  (`leafVaoAt`, with unmount disposal), removes 5 redundant per-frame
  `gl.useProgram(vp.prog)` variant switches in `drawHouse()` (lazily updating
  `mirrorUniforms`), skips unchanged `HouseFrame` UBO `bufferData` uploads on
  `lawn`/`under`, skips `normalize` + `ggx()` when `NdotL <= 0` in `lampAt()`
  (keeping `HOUSE_LIGHT_GLSL` lightmap byte-identical), enables `HS_LSPEC` on
  quarter-res `HOUSE_MIRROR_FRAGMENT`, and unrolls `bloom.js` `BLUR`.
- Measured: iPhone 15 Night `climb` `16.1 → 28.3 fps` (`+76%`, CPU `6.3 →
  3.5 ms`), Night `whole` `20.9 → 36.9 fps` (`+77%`, max `164 → 54 ms`), Day
  `wholeAgain` `34.5 → 43.3 fps`, `rest.opening` `3.7/s×1` (`cpu 0.4 ms`);
  iPhone 13 `climb` draw calls `185 → 143` (`-42/frame`), `climb` max
  `285 → 180 ms` (`-37%`); M4 `1440×900@2` house climb up to `119.6 fps (0 >
  20 ms)`, `switch` `4/4` GL pass, `regress` `mean 0.00 / p99 0`.

**0.5.34** (2026-11-23) fixes the post-scroll missing-mountains bug behind the
desk/house, passes both desktop GL perf gates (`1440×900@2` and `1728×1117@2`)
at `118+ fps` with zero resting visual change, and accelerates mountain flight
across desktop and mobile GPUs:
- Banded mountain settle fix (`MistCanvas.jsx`): `stillOk` and `peaksPrepare()`
  now wait for `peaksSettled` (`ready && scale === 1 && !use && !refining`)
  before baking `still`, and `tick()` keeps scheduling frames while `peaksWork`
  is active, preventing `stillHit` from freezing unready (`uReady = 0`) or
  half-res peaks behind the meadow/house.
- Faster scrolling mountain geometry (`peaksShader.js`, `MistCanvas.jsx`):
  fixed `tryReproj()` float32 `cos()` cancellation and sub-pixel diagonal
  cutoff (`dot(dDir, dDir) >= pxAng * pxAng` at `1.4 px`, relaxed `RGBA16F`
  slope quantization and `1.35×` coarse-cone margin), enabled cross-`pk.behind`
  reprojection, added a motion-only `uMotion` fast path in `geo()` (8 mist
  steps with `tau > 6.5` early out, 128 max march / 3 binary-search steps, skip
  sub-pixel `aaMid`/`aaFine`; 100% untouched at rest `1.0×`), and capped moving
  `peaksGeo` at `650k px` on `> 5.2M px` Retina displays (`1440×900@2` and
  phones unchanged at `0.5×`).
- Mobile VRAM & Metal VAO cleanup (`MistCanvas.jsx`): freed `peaksKept`
  (`~20–24 MB`) before `aoTarget()` allocates `aoPass.frame` and before
  `prepOnly` returns in `drawPeaks()`, banded jumps to an unloaded house
  (`pk.behind && !houseComplete && camJump > 200`), and replaced per-frame
  `vertexAttribI4ui`/`vertexAttrib4f` calls in `drawGrass`/`drawFlowers` with a
  shared 96-byte static zero `Uint32Array` VAO buffer.
- Measured: M4 `perf --gate` `1440×900@2` GL `112.1 → 119.8 fps (0 > 20 ms)`
  PASS and `1728×1117@2` GL `96.0 → 118.4 fps (51 → 1 > 20 ms)` PASS;
  `regress 21/21 (mean 0.00, p99 0)`, `switch 4/4`, `hygiene 21/21`,
  `test:unit 88/88`, `test:adaptive 9/9`; OnePlus 11R `flight` `30.6 → 45.1 fps`
  (`+47%`), `whole` `52.3 → 58.7 fps`, `house ready` `17.1 → 13.0 s`; Galaxy
  Tab A9+ (`Adreno 619`) `flight` `1.4 → 2.1 fps` (`max 2762 → 1731 ms`),
  `whole` `1.7 → 3.4 fps` (`2.0×`), `0` errors.

**0.5.35** (2026-11-23) eliminates Moto G71 5G (`Adreno 619`, Android 11)
opening-hero `webglcontextlost` OOM (`-72 MB` peak VRAM at `scroll = 0`) while
keeping 100% of background shader & PSO warm-up intact:
- Hero-VRAM warm-up (`MistCanvas.jsx`): `warmDeskPipelines()` warms all desk,
  meadow, grass, and tree PSOs on a disposable `1×1` `RGBA8 + DEPTH24` scratch
  FBO instead of allocating full-res `deskFrame` (`-21 MB` on Moto G71). While
  sitting on the opening hero (`onOpeningHero()`), background `warmHouse()` and
  `syncHouseReadiness()` allocate `aoPass` (`1×1`), `glass.tex` (`1×1`), and
  `bloom` (`4×4`) at matched-format tiny sizes (`-51 MB`), upgrading `aoPass`
  to full resolution in `rebuild()` once `desk > 0.3 || contact > 0` (after
  `peaksKept` is freed).
- Measured: Moto G71 5G (`Adreno 619`, `dpr 2.625`) stays on WebGL2 for 100% of
  all phases with `0` context losses and `0` errors (`house mesh 15.7 s, ready
  31.1 s`, `38 MB` heap, `rest` `4/s×1` / `24.5/s×6` / `27.9/s×11`, `flight`
  `4.0 fps, max 518 ms` down from `1303 ms`, `whole` `6.0 fps`); iPhone 13
  (`Apple A15`, iOS 16) `house ready 10.5 s`, `flight` `60.2 fps`, `switch`
  `60.2 fps (late 1)`, `desk` CPU `16.6 → 13.4 ms`, `rest.pool` `37.7 → 24.3/s`;
  Apple M4 `perf --gate --house` `1440×900@2` `118.9` scroll / `119.6` house
  (`0 > 20 ms`) PASS and `1728×1117@2` `118.1` scroll / `118.7` house (`0 >
  20 ms`) PASS; `test:unit 88/88`, `test:adaptive 9/9`, `hygiene 21/21`.

**0.5.36** (2026-11-25) fixes Apple Silicon Metal early-Z checkerboard
corruption, restores strict `52/52` night house parity, and eliminates Adreno
619 `/?desk=0.6` context loss across both Moto G71 5G and Galaxy Tab A9+:
- Metal early-Z invariance & night house parity (`houseShader.js`,
  `meadowShader.js`): added `invariant gl_Position;` to `HOUSE_VERTEX`,
  `HOUSE_DEPTH_VERTEX`, and `MEADOW_LAWN_VERTEX`, eliminating 1-ULP `gl.LEQUAL`
  Hi-Z tile rejection (black stripes/blocks in `living`, `bedroom`, `stair`,
  `wc`, `porch`, and `terrace` on Apple M4 Metal / Chromium 148). Restored
  exact additive `spec` in `lampAt()` and removed `#define HS_LSPEC` from
  `HOUSE_MIRROR_FRAGMENT` to recover `52/52` night `house-parity` (`max <= 2,
  mean < 0.2`).
- Adreno 619 desk & probe stability (`MistCanvas.jsx`): extended tiny warm-up
  targets from `onOpeningHero()` to `beforeHouse()` (`contact <= 0 && desk <
  0.85`), added `pagehide`/`pageshow` WebGL context release (`WEBGL_lose_context`)
  so Android 14 Chrome BFCache releases previous-page VRAM immediately on
  navigation, split `warmHousePipelines()` into incremental per-variant idle
  steps with `gl.flush()`, paced `warmProbes()` with a non-blocking
  `probeFence` (`gl.fenceSync` + `gl.flush()`) so only one 384×384 probe face
  is in flight at a time, and added `warmStage` to the context-loss error
  string. Forced `peaksReveal = 1` when `frozen` (`?freeze=1`) to eliminate
  mid-fade `regress` flakes and tightened the `>5.2M px` motion cap to
  `560_000` px.
- Measured: `house-parity` night **`52/52` PASS** (`max <= 2, mean < 0.2`,
  against `v0.5.31` with the 3 `invariant gl_Position;` lines applied to isolate
  from Chromium 148 Metal's pre-existing `v0.5.31` Hi-Z holes); BrowserStack
  `devices`: **Moto G71 5G (`Adreno 619`) PASS**, **Galaxy Tab A9+ (`Adreno
  619`) PASS** (both night house + `/?desk=0.6` grass list + 2nd WebGL2 probe),
  **iPhone 13 (iOS 16) PASS** (`iPhone SE 2022` iOS 15 still hits the
  pre-existing `0.5.24` Safari hang); `test:unit 88/88`, `test:adaptive 9/9`,
  `hygiene 21/21`; Apple M4 `1728×1117@2` GL `perf --gate` `119.0 fps, p95
  9.0 ms, max 17.3 ms, 0 > 20 ms` PASS on AC power.

**0.5.37** (2026-11-25) restores instant BFCache Back-button navigation and
raises the large-display moving mountain budget by `2.3×`:
- Instant BFCache restores (`MistCanvas.jsx`): dropped `onPageHide` /
  `onPageShow` WebGL teardown & `location.reload()` so pressing Back from an
  external link restores the page instantly instead of forcing a full reload
  and house rebuild. BrowserStack confirmed both Adreno 619 devices (**Moto G71
  5G** and **Galaxy Tab A9+**) still pass `2/2` cleanly (full WebGL2 night
  house, desk grass list, and 2nd WebGL2 probe) with `probeFence` +
  `beforeHouse()` + incremental `warmHousePipelines()` alone.
- Sharper moving flight on 16"/5K/6K displays (`MistCanvas.jsx`): lifted the
  `>5.2M px` moving `peaksGeo` budget from `560_000` to `1_300_000 px` (matching
  `1440×900@2`'s exact `1,296,000 px` 120 fps fill budget: `~1418×917` on
  `1728×1117@2` and `~1521×856` on 4K-capped `5K@2`/`6K@2`, `2.32×` more
  pixels than `560k`). Verified with `npm run sharp` (`2560×1440@2` &
  `3008×1692@2`) and a live moving `5K@2` opening-flight capture (`peaksScale =
  0.396`, sharp granite crests and mist), plus `test:unit 88/88` and
  `test:adaptive 9/9`.

**0.5.38** (2026-11-25) adds the opening sky-to-mountains intro tilt and fixes
scroll/settle mist, rock-detail, and horizon-shadow transition artifacts:
- Opening intro tilt (`components/scroll/intro.js`, `SmoothScroll.jsx`,
  `MistCanvas.jsx`, `peaks.js`, `scene.js`, `AtmosphereField.module.css`,
  `docs/parts/atmosphere.md`): fresh loads at the top start pitched `+52°` up in
  the sky over a matching pre-3D sky backdrop, hold scroll (swallowing
  wheel/touch/scroll-keys + `lenis.stop()`, `6 s` fail-safe cap) up to `2.5 s`
  until the 3D peaks are ready, fade the canvas in over `0.4 s`, then ease down
  via smootherstep over `2.2 s` (`0.9 s` on same-tab revisits via
  `sessionStorage['abg-intro-seen']`, written when tilt starts). Harnesses pass
  `?intro=0`. Kept `peaksGeo.scale = 1` across the tilt and its final `lift = 0`
  landing frame (`introLand`, with `canReproj` off on landing for a fresh `1.0×`
  march) and set `peaksReveal = 1` when the intro runs so mountains never fade
  in washed-out mid-tilt or drop to `0.5×` on landing.
- Glitch-free mountain settle & clean moving mist/granite (`MistCanvas.jsx`,
  `peaksShader.js`): lazily double-buffered `peaksGeo.prevHor` alongside
  `peaksGeo.prev` so the 4 `HBANDS` passes of a `0.5× → 1.0×` settle never
  overwrite the `0.5×` horizon shadows still displayed by `showPrev` (`?framegrab=1`
  verified `0` pixels changed by `> 2` across all 10 banded refine frames);
  kept all `14` mist steps during motion with low-variance Interleaved Gradient
  Noise (`(.25 + .5 * ign) * dt`) instead of 8-step white-noise `hash()`
  (eliminating salt-and-pepper mist noise and horizontal slicing bands while
  leaving resting `uMotion == 0` bit-identical); kept `aaMid`/`aaFine` granite
  normals active in motion (`pxW` anti-aliases naturally) and tightened
  `uMotion` raymarch (`152` steps, `0.0016` step floor).
- Verified: headless Chromium intro timeline (`hold → tilt 2225 ms → done`,
  `peaksScale = 1` throughout), `?framegrab=1` settle diff (`0` `> 2` pixels
  during all 10 refine bands), `test:unit 88/88`, `test:adaptive 9/9`,
  `hygiene 21/21`.

**0.5.41** (2026-11-26) draws the intro's tilt at full size with the full
march (no `moveScale`, no `uMotion`; reprojection only while moving), so the
tilt looks like the frame it lands on: 1440×900@2 tilt 78 / 65 fps day / night.

**0.5.40** (2026-11-26) keeps the intro's landing unchanged at rest (no
reprojected `1.0×` intro frames, a fresh landing march on desktop), holds
until the mountains are ready (`4 s` cap), adds a loading line, the 3D
up-sky as the pre-WebGL backdrop (`npm run intro-backdrop`), a Milky Way,
and `npm run intro` (in `qa`) with an intro phase in `device-profile`.

**0.5.39** (2026-11-25) makes the opening intro pan silky smooth on phones &
tablets, replaces post-scroll resolution snaps with gradual deceleration
sharpening, removes close moving-mist diagonal weave, and dynamically tints the
browser toolbar to follow the scene:
- Smooth mobile/tablet intro pan (`MistCanvas.jsx`): paused `preparation`
  background shader compilation and PSO warm-up in `canRun()` while `intro` is
  active (resuming inside `endIntro()`), waited for `peaksBake.outerReady`
  during `'hold'` (driven at full frame rate via `bakePending` in `peaksWork`)
  so zero terrain baking or `prevCam` wipes happen mid-pan, and ran the fast
  middle of the tilt (`k < 0.72`) at `moveScale` (`4×` fewer pixels on phones &
  tablets) before ramping progressively through `+30% → +62% → 1.0×` over the
  final `600 ms` smootherstep ease-out on fast GPUs (`emaGap < 24 ms`, keeping
  TDR-safe banded `1.0×` post-landing settle on slow mobile GPUs).
- Gradual scroll deceleration settle & silky close mist (`MistCanvas.jsx`,
  `peaksShader.js`): tracked frame-time-normalized screen-space camera speed
  (`movePx`) during Lenis deceleration on fast GPUs (`emaGap < 24 ms`) to step
  monotonically through `base → +30% → +62% → 1.0×` while coasting into rest
  (with `canReproj` disabled on upward resolution steps and `stillWait >= 12`
  before silent `reprojDirty`/`use` refreshes), and gated moving IGN mist jitter
  by `smoothstep(150., 600., dt)` to remove the `2×2` diagonal weave in close
  mist while keeping far valley mist band-free and resting `uMotion == 0`
  bit-identical.
- Dynamic browser chrome colour (`MistCanvas.jsx`, `app/layout.jsx`,
  `ThemeProvider.jsx`): added throttled `syncThemeColor()` (60 ms cadence +
  trailing flush, zero GPU readbacks) updating `<meta name="theme-color">` and
  root `backgroundColor` to match the top edge of the viewport across scroll
  beats (opening/laptop/house sky `#3f68a6`/`#5f88b8` → top-down meadow
  `#4a6f28` → pool timber deck `#473124` by day; `#161b2a`/`#1b2234` →
  `#152218` → `#1d1511` by night, warming through dusk glow on switches).
- Verified: headless Chromium phone `393×852@3` intro (`120.0 fps`, `p95 9.0 ms`,
  `max 9.3 ms`, `0.5 → 0.65 → 0.81 → 1.0`), Lenis deceleration trace
  (`1 → 0.5 → 0.65 → 0.81 → 1`, zero bounce), all 8 day/night `theme-color`
  beats, `test:unit 88/88`, `test:adaptive 9/9`, `hygiene 21/21`.

**Next:** the climb on phones (`devices -- --climb --costs peaks-behind`);
deferred R-series research (temporal reprojection, deferred shading, device
tiers); then the owner's next steps on the valley flight, the cliffs' own
detail and the fallback's stills.
After that: the owner's next steps on the valley flight, the cliffs' own
detail, the phones and the fallback's stills. The pool climb work stays open (`ROADMAP.md`, Planned), toward the pool climb at the screen's rate: 60 fps on 60 Hz
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
detail to meet performance targets. One exception (the owner, 2026-11-20):
while the camera is moving, a pass may render at lower resolution (0.5.13's
P5/T2), as long as the frame the scroll stops on is full quality; parity
checks still frames. Not the whole frame on the desk-to-pool climb, though
(0.5.17's half size, off since 0.5.20 on the owner's call: too soft). R4's far-grass LOD stays out. Do not claim the pool jank is fixed.

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
npm run intro          # the opening's intro: hold, tilt, landing unchanged at rest (local, GPU; in qa)
npm run intro-backdrop # renders public/intro/sky-{day,night}.jpg from a running prod server
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
  weight 800 only, the `h1`'s; 0.5.12) + **JetBrains Mono** (body/labels, weights
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
  shadows), the closing sky's birds, clouds and stars, the lamp's flicker, the mug's steam and (0.5.38, the owner's OK) the
  opening's one-shot intro tilt run on GL's frame loop too, not a loop of their
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
