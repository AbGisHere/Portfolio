# 0.4.40 — the pool climb on real phones

The goal (the owner, 2026-10-29): the pool climb at the screen's rate, 60 fps
on 60 Hz phones and 120 on 120 Hz, on normal phones, and 120 on the M4 with
headroom. 0.4.40 is a step toward it, not the end of it. Full quality holds:
every change draws the same picture with less work.

## What changed

1. **The colour pass no longer writes depth (`MistCanvas.jsx`, `drawHouse`).**
   The house's depth is drawn first, exactly; the colour pass then wrote it
   again. Its shader can `discard` (the lawn's frayed edge, the reflection),
   and a shader that can discard while writing depth costs phone GPUs their
   early depth test, so hidden pixels were shaded in full, then covered.
   `?earlyz=0` restores the write.
2. **The house is culled to the view in runs (`houseLights.js` `houseRuns`,
   `houseRanges`).** The solid part is split, in its own order, into runs of
   2,048 triangles, each with its bounds; each pass (the AO depth, the
   pre-pass, the colour, the pool's reflection) draws only the runs that can
   be in its view (`boxSeen`, padded 0.1 m), merged, in order, so what's
   drawn is drawn exactly as before. The reflection also skips runs wholly
   below the water or wholly inside a room: its shader discarded both.
   Mirror probes still draw everything. `?housecull=0` draws it all.
3. **Light cells (`houseLights.js` `lightCells`, `houseShader.js`
   `lampsAt`).** Each pixel walked its room's whole ranges of lamps and
   strips (up to 29 lamps and 36 strips), nearly all out of reach. A grid of
   1 m cells over all of the lights' reach now lists, per cell, the lamps
   whose sphere and the strips whose capsule meet it (2 cm wider); a pixel
   walks only its cell's lists, still filtered by its room, in the lights'
   own order, so the same lights add up in the same order. The front rooms'
   lamps seen through the glass are flagged in the light data (row 3, w)
   and walked from the same list. 58,425 cells, 22,678 not empty, 55,379
   entries: 1.2 MB in the light data texture, built in ~16 ms (M4) when the
   house's program is made. A unit test checks 20,000 random points: every
   light and strip in reach is in the point's cell's list, in order.
4. **Load timing.** `houseReadiness.js` records when each status is first
   reached; `__debugHouse().times` exposes it and `devices --climb` prints
   the house's build (the closed laptop's hold) and its GPU preparation (the
   open laptop's).

Per-vertex light baking (the plan in the ROADMAP) was not built: on large
triangles (walls, floors) a lamp's pool of light can't be held at the
vertices within 2/255, and it cost 12–24 MB. The light cells remove the same
wasted work exactly, for 1.2 MB.

## Image parity

The full 104-view matrix against the prepared 0.4.35 reference (as in
0.4.39): with all three changes, 104/104, worst 1/255, worst mean 0.00002
(`scripts/out/house-parity-040-cells`); the first two alone, the same
(`house-parity-040-full`). After the profiling flag was removed, 10 views
(five, by day and night) again: 10/10, worst 1/255.

## Real phones (BrowserStack, night, `devices --climb`)

Three sweeps each (contact 0.35 → 0.80 → 0.35 → 0.80), fps:

| Phone | 0.4.39 | Depth write + culling | + light cells |
|---|---|---|---|
| OnePlus 11R (Adreno 730, 90 Hz) | 36.1 / 30.4 / 36.1 | 38.5 / 33.5 / 38.9 | **51.2 / 47.6 / 51.5** |
| Moto G71 (Adreno 619, 60 Hz) | 5.0 / 1.4 / 3.6 | 5.0 / 1.8 / 4.6 | **6.7 / 4.3 / 6.9** |

The first two columns were measured in one session; the third in a later
one, the same day.

Load (ms from opening `?contact=0.35`, so the house starts at once):

| Phone | Build (closed laptop) | GPU preparation (open laptop) | Ready |
|---|---|---|---|
| OnePlus 11R | 6.7 s | 5.7 s | 14.0 s |
| Moto G71 | 10.1 s | 15.5 s | 28.2 s |

### Where the rest goes

With a profiling flag (`?hdiag=1`: the lamps' loops off; `?hdiag=2`: the
house painted flat; removed before the release), on the depth-write and
culling build:

| Test | OnePlus 11R | Moto G71 |
|---|---|---|
| As built | 38.5 | 5.0 |
| Lamps off | 55.0 | 8.2 |
| House flat | 62.2 | 11.2 |
| Flat, no glass | 65.7 | 12.0 |
| Flat, half resolution (`dpr=1`) | 72.2 | 17.3 |
| Flat, no glass, grass, caustics, bloom, reflection, AO | 88.8 | 17.1 |

On the OnePlus (90 Hz: 11.1 ms a frame) that's roughly: the lamps ~7.8 ms
(now mostly gone), the house's other shading ~2 ms, the glass ~0.9 ms, the
grass, caustics, bloom, reflection and AO together ~4 ms, and the rest (sky,
meadow, the house's shape, desk, trees) ~11.3 ms on its own. A steady 60 on
phones like it looks reachable; 90–120 needs the base scene made cheaper
too. The Moto stays near 17 fps with almost everything off: its limit is the
base scene.

## Mac (M4, paired sweeps against 0.4.39, depth write + culling only)

| Climb | 0.4.39 | 0.4.40 |
|---|---|---|
| Night 1440×900@2 | 59.0 | 56.4 |
| Night 1728×1117@2 | 48.8 | 48.2 |
| Night 393×852@2 | 97.1 | 96.5 |
| Day 1440×900@2 | 70.5 | 68.6 |
| Day 1728×1117@2 | 56.7 | 57.9 |
| Day 393×852@2 | 106.5 | 110.5 |

No change beyond noise: the M4's GPU removes hidden surfaces itself. The
same 0.4.39 build measured 75.8 fps (night, 1440×900) the day before, so
only same-session pairs compare. The light cells weren't timed on the Mac
before the push.

## QA

0.4.39's full QA was stopped after parity (46/46, worst mean 0.96, p99 3) on
the owner's call: 0.4.40's supersedes it. 0.4.40 was pushed on the owner's
call ("just push to git, I'll test it on my phone") after the house parity
matrix and the unit tests; `npm run qa` follows.

## Next

- The base scene on phones: the sky, meadow and the house's shape (~11 ms
  on the OnePlus), the glass, and the remaining passes.
- The loading holds: GPU preparation is the larger half on the Moto. The
  owner's idea of shipping the built house as a file, or caching it in the
  browser after the first visit, is in the ROADMAP.
