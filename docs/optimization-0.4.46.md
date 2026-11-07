# 0.4.46 — less drawn and shaded on the pool climb

The goal is unchanged (the owner, 2026-10-29): the pool climb at the
screen's rate on normal phones, with the same picture. 0.4.46, written by
the owner, skips work the frame never shows: patterns too fine to see,
the meadow's hill test where the lawn isn't in view, grass and trees outside
the frame, and the order of the passes on tiled phone GPUs.

## What changed

1. **The material patterns only where they can be seen (`houseShader.js`).**
   - **Where:** the pavers, the deck, the upholstery, the walnut, the books and their spines, the page edges, the curtains, the paintings, the planters and the roof.
   - **What:** their sub-centimetre detail (noise, loops, letters, screws, pores) is computed only where `detail(…)` is above 0, the same fade they were multiplied by before, so the result is unchanged.
2. **The meadow without its hill test where the lawn isn't seen (`meadowShader.js`).**
   - **The flat variant:** `MEADOW_PAINT_FLAT` (`#define MEADOW_FLAT`) skips the mound's ray march and doesn't write `gl_FragDepth`. Off the mound, that depth was the fragment's own anyway, and not writing it keeps the GPU's early depth test. It is used whenever the lawn is out of view.
   - **The painted flowers:** they are scissored to the rows where the 3D flowers have faded (past `FLOWERS.fade[0]`), across the frame's full width.
3. **Grass and flowers culled on the CPU (`grassShader.js`, `flowerShader.js`).**
   - **Chunks dropped:** `ringRanges(…, cull)` drops each ring's chunks inside the finer ring's hole, those under the house, and those beyond the blades' reach.
   - **Tighter bounds:** the boxes' tops come from the mound's height (`moundY`) instead of the hill's top.
   - **Stems:** a flower stem too thin to draw leaves the vertex shader early.
4. **Trees and glass culled to the frame (`treeShader.js`, `houseGlass.js`).**
   - **Trees:** the trees are laid out in 18 sectors, each still sorted nearest-first, and only the sectors in the frame are drawn (`treeRanges`).
   - **Glass:** the windows, the pool's water and the terrace's rails are each drawn only when their box is in the frame.
5. **The passes ordered for tiled GPUs (`MistCanvas.jsx`, `houseLightmap.js`).**
   - **Off-screen passes first:** the sun's shadow map and the pool's reflection are drawn before the frame's own pass starts, so a phone's tiles aren't flushed and reloaded mid-frame.
   - **The lawn earlier:** it is drawn before the ground's shadows and the meadow, so the depth test skips what it covers.
   - **The lightmap's programs:** they now compile in parallel (`KHR_parallel_shader_compile`) with the house's, instead of synchronously at the bake.

## Real phones (BrowserStack, night, the same session)

0.4.45 and 0.4.46 alternated, two runs each, every run three sweeps (fps):

| | 0.4.45 | 0.4.46 |
|---|---|---|
| OnePlus 11R (90 Hz), run 1 | 52.7 / 49.5 / 53.1 | **57.7 / 54.0 / 57.6** |
| OnePlus 11R, run 2 | 52.0 / 48.9 / 52.5 | **57.1 / 53.4 / 57.2** |
| OnePlus p95 frame (sweeps 1 and 3) | 33 ms | **22 ms** |
| OnePlus GPU preparation · ready | 5.8 · 13.3 s / 5.3 · 13.2 s | 4.9 · 12.4 s / 5.2 · 12.8 s |
| Moto G71 (60 Hz), run 1 | 7.1 / 3.9 / 6.7 | 7.5 / 4.0 / 7.5 |
| Moto G71, run 2 | 7.1 / 4.3 / 6.7 | 7.4 / 4.0 / 7.2 |
| Moto GPU preparation · ready | 16.7 · 28.3 s / 16.2 · 27.6 s | 15.9 · 27.5 s / 15.3 · 26.8 s |

- **OnePlus 11R:** about +5 fps (+9–10%) in every sweep of both runs, well past the session's ~1 fps noise. Its slowest frames drop from 33 to 22 ms, so the climb now holds 45 fps or better. It is still short of 90.
- **Moto G71:** +0.1–0.8 fps, small but in the same direction in both runs; still far from 60.
- **Load:** a little faster on both (GPU preparation −0.5 to −0.9 s), since the lightmap's programs compile in parallel now.

## Image parity

- **The owner's run:** `house-parity` against 0.4.45, 52 views, 52/52 within 2/255, 45 of them identical.
- **Phone width:** `house-parity` against 0.4.45 at 393×852@2, 26 views × day and night (room views on dev `/house` servers): **52/52 within 2/255**. With the owner's run, 104/104.
- **Phone GPUs:** BrowserStack night screenshots on the OnePlus 11R (Adreno 730) and Pixel 7 (Mali-G710), 0.4.45 against 0.4.46. They differ only in what moves (the sky's twinkle and grain, fireflies, grass, trees in the wind). The house, the front wall, the steps and the lit garden match.

## Checks

Unit 73/73 and adaptive 9/9 (the owner's run). The full `npm run qa`
against the production build (M4, 39.8 min):

| check | result |
|---|---|
| parity | 46/46 · worst mean 0.96, p99 3 |
| perf | gate 6/6, min scroll 119.4 fps · dropout 6/6 clean |
| switch | 12/12 · worst step ×2.9 (limit ×3) |
