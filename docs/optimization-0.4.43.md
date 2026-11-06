# 0.4.43 — the path's visible set

The goal is unchanged (the owner, 2026-10-29): the pool climb at the
screen's rate on normal phones, with the same picture. 0.4.43 first
profiled what's left of the frame on the phones, then skipped the parts of
the house that the camera can never see from where it is.

## Profiling (0.4.42's `?skip=`)

BrowserStack, `devices --climb`, night, first of three sweeps (fps), each
row with that pass left out of the frame:

| Left out | OnePlus 11R (90 Hz) | Moto G71 (60 Hz) |
|---|---|---|
| Nothing | 49.0 | 6.4 |
| `scene` (sky, mountains) | 51.0 | 8.2 |
| `meadow` | 50.9 | 7.1 |
| `house-colour-depth` (the house) | **70.6** | 8.9 |
| `house-depth-ao` | 43.6 | 4.5 |
| `trees,shadows` | 51.9 | 6.4 |
| `desk,desk-things` | 48.3 | 6.3 |
| `grass,flowers` | 54.0 | 8.0 |
| `lawn,glass,pool-reflection` | 51.8 | 6.9 |
| `off=ridges,veil,air,grain` | 49.4 | 7.7 |

- The house is the OnePlus's cost: about 6 ms of its frame. Nothing else
  costs more than ~1 ms.
- Leaving out the AO depth is slower, as expected: the depth pre-pass reuses
  it, so without it hidden house pixels are shaded again.
- The sky was already drawn after the solid things and only where none
  stands (since 0.3.7), so 0.4.42's plan step for it was already done.
- The Moto misses nearly every frame (26 of 28 in a sweep), with or without
  any one pass: it is slow every frame, not stalling. Its GPU can't afford
  this scene at its full resolution; only larger steps (baked lighting,
  cheaper passes) can move it.

## What changed

1. **The path's visible set (`scripts/house-pvs.mjs`, `housePvs.js`).** The
   camera is a pure function of scroll, and its position on the contact
   path depends only on the device (laptop or tablet; not the theme, reduced
   motion or the screen's size). The house's solid part is static and opaque.
   So, offline, at 401 points of the path per device, the script rasterises
   a cube of the house around the eye (every direction, so any framing or
   aspect) at 1024² a face and records which of the house's 659 runs can be
   seen. Only large surfaces (triangles of 0.25 m² or more: walls, floors,
   roofs) hide anything; every triangle is tested grown by half a texel's
   diagonal against them, so leaves, rails and slivers seen through gaps are
   always kept. Each run is kept 2 samples either side of where it's seen.
   It keeps on average 384 of 659 runs (laptop) and 400 (tablet). 2½ min on
   the M4; the file is ~11 KB.
2. **The renderer skips the rest (`houseRanges` `keep`).** On the contact
   path, the AO depth, the pre-pass and the colour pass draw only the runs
   in the set (and in view, as before). The pool's reflection, the mirror
   probes, the desk and the `/house` route draw as before. `?pvs=0` turns
   it off. A checksum of the runs' bounds turns it off for any other mesh,
   and a unit test fails if `housePvs.js` wasn't regenerated after the
   house changed.
3. **The house's visibility test covers its whole built extent.**
   `HOUSE_BOUNDS` stops at z = −50 m, short of the stepping stones nearest
   the desk (to −41.7 m); the house is now also counted as seen when its
   built solid's box is. It changed no frame on the climb views checked
   (0.36–0.48); the stones' pop the owner saw is not yet reproduced.

The first version let every surface hide others, and failed: at 0.45–0.50
it dropped planter leaves and a railing post seen through gaps between other
leaves (max 177/255 on ~500 pixels). A control (`pvs=0` on both sides)
passed, so the set itself was at fault; only large surfaces occluding fixed
it. Starting the house's shader compile while the worker builds was also
tried and dropped: the OnePlus's load went from 12.7 to 15.2 s.

## Image parity

`house-parity` with and without the set on the same build (`?pvs=0` as
the reference): 14 points of the path (0.35–1) × 5 screens (1440×900@2,
393×852@2, 3008×1692@2, 820×1180@2, 1180×820@2) × day and night: **140/140
passed**, every pixel equal.

## Real phones (BrowserStack, night, the same session)

| | 0.4.42 | 0.4.43 |
|---|---|---|
| OnePlus 11R fps | 48.8 / 45.2 / 49.5 | **53.6 / 50.0 / 53.8** |
| Moto G71 fps | 6.2 / 4.2 / 6.3 | 6.2 / 3.4 / 6.3 |
| OnePlus ready | 12.7 s | 12.5 s |
| Moto ready | 26.3 s | 26.2 s |

About 10% on the OnePlus; nothing on the Moto (above). `npm run qa` was
skipped on the owner's call.
