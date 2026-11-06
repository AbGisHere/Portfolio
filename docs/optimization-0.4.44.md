# 0.4.44 — the house kept in the browser, and its shading costed

The goal is unchanged (the owner, 2026-10-29): the pool climb at the
screen's rate on normal phones, with the same picture. 0.4.44 makes return
visits skip the house's build, and measures which parts of the house's
shading cost the phones' frame, to decide whether baked lighting can help.

## What changed

1. **The built house kept in the browser (`houseWorker.js`).** After its
   first build the worker stores the house and curtain meshes in IndexedDB
   (`portfolio-house`), keyed by its own script URL. The bundler names that
   by a hash of its content, which holds all the mesh's code, so any change
   to the house builds afresh; older entries are dropped. The write starts
   before the buffers are transferred (`put` clones them at once), and the
   page ends the worker only once it's written. Any failure (private mode,
   quota, no IndexedDB) just builds. `?housecache=0` skips it both ways.
2. **`?hskip=<part,…>` (profiling).** Compiles the house's shader without
   part of its shading: `lamps`, `shadow` (the sun's shadow map), `ao` (the
   corner shading), `env` (what surfaces reflect), `mat` (every material's
   pattern) and `lspec` (only the lamps' highlights). Off by default; the
   shipped shader is unchanged.

## The cache

M4, production build, 1440×900@2:

| | mesh ready | ready |
|---|---|---|
| First visit | 6,871 ms | 7,812 ms |
| Return visit | 1,068 ms | 1,571 ms |

Parity, cached against `?housecache=0`, night and day × contact 0.40, 0.50,
0.60 and 1: **8/8 equal** (max 0). The first visit on real phones is
unchanged within noise (below: OnePlus ready 13.1 s against 12.5 s in
0.4.43, Moto 26.1 against 26.2); BrowserStack opens a fresh browser each
time, so it can't show a return visit.

## The house's shading on phones

BrowserStack, `devices --climb`, night, the steadiest of three sweeps (fps),
each row with that part of the house's shading left out:

| Left out | OnePlus 11R (90 Hz) | Moto G71 (60 Hz) |
|---|---|---|
| Nothing | 52.3 | 6.3 |
| `lamps` | 61.5 | 8.6 |
| `mat` (material patterns) | 61.2 | 8.3 |
| `shadow` | 56.1 | 6.7 |
| `ao` | 55.2 | 6.7 |
| `env` | 51.8 | 6.6 |
| All five | 69.1 | 11.3 |
| `lspec` (the lamps' highlights only)\* | 53.4 (53.6 with nothing left out) | 6.4 (6.3) |

\* A later session: its own baseline is in brackets.

- The house's shading is ~4.6 ms of the OnePlus's frame (19.1 → 14.5 ms);
  the parts overlap (alone they add to ~8 ms). The lamps are the largest
  (~2.9 ms), then the material patterns.
- Even with all five off, neither phone reaches its screen's rate: the
  OnePlus at 69 fps of 90, the Moto at 11 of 60. The rest of the frame is
  outside the house's shading.
- The lamps' highlights cost nothing measurable: the lamps' cost is walking
  them (the light cell's list, each lamp's data, its falloff and cone).

## Can the lamps be baked without a visible change?

A bake replaces each lamp's light with a stored value, which can only hold
what doesn't depend on where the camera is. Each lamp's light is its
diffuse light, its bounce and its highlight (`ggx(N·H)`, with `H` from the
camera's direction), so the highlight can't be baked.

Test: `house-parity` with `?hskip=lspec` against `?hskip=none` on the same
build, 26 views × day and night at 1440×900@2.

| | Passed (2/255) | Worst max | Worst mean |
|---|---|---|---|
| Day | 21/26 | 180 (wc) | 0.130 (wardrobe) |
| Night | 2/26 | 188 (pool from above) | 0.378 (wardrobe) |

By night nearly every view fails: the kitchen changes 215k pixels, the
pool's views up to 188/255. (One day view, the landing, first failed to
load, `failed` at 546 ms before its mesh arrived; rerun alone, it passed,
with and without the cache.)

So the highlights must stay live, and they need every lamp reaching the
pixel, so the walk the bake was meant to remove stays. Baking the diffuse
light and bounce alone would save only those few multiplies, and the
highlights themselves were measured as free. The approximations that would
remove the walk (a highlight from the nearest lamp only, or a baked
dominant direction) change the highlights and can't hold 2/255 at these
numbers. **No lossless lamp bake; 0.4.45 doesn't bake.** The second planned
test (the lamps given the plain triangle normal) was not run: it decides
only how a diffuse bake would be stored, which is now moot.

## Checks

Unit 71/71, adaptive 9/9. `npm run qa` skipped on the owner's call for this
release (the cache is checked above; the profiling flag is off by default).
