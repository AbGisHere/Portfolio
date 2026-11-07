# 0.4.45 — the lawn's and roof's lamp light baked on the device

The goal is unchanged (the owner, 2026-10-29): the pool climb at the
screen's rate on normal phones, with the same picture. 0.4.44 showed a full
lamp bake can't hold 2/255 (the highlights depend on the camera). 0.4.45,
written by the owner, bakes only where that doesn't matter, and tightens
the light cells.

## What changed

1. **A lightmap baked on the device (`houseLightmap.js`).**
   - **What's baked:** a 1024² RGBA16F texture is drawn once on the GPU as the house is prepared. It holds the lamps' light at full night on the lawn (5 cm texels, from the lawn's own triangles) and on the roof's deck. By night those two read it in one lookup instead of walking their cells' lamps.
   - **The switch:** the stored light is scaled by the garden's schedule.
   - **Fallback:** without half-float rendering it falls back to the live light. `?lightmap=0` turns it off.
2. **The highlight in closed form at roughness 1 (`houseShader.js` `lampAt`).** At `rough = 1` the GGX term is constant (1/π), so the lawn's highlight doesn't depend on the camera. Computing it directly is exact, and it's what lets the lawn be baked.
3. **Tighter light cells (`houseLights.js` `lightCells`).** A cell now lists a lamp only if it can light something there. The room has to match (the front rooms' lamps reach outdoors only through their storey's glass), the cell has to be inside an up- or downlight's or a spot's cone, and a strip must face the cell. Lamps that are switched off are dropped. `scripts/light-cells-test.mjs` checks the lists against those rules at 20,000 random points and caps them at 24,000 entries.
4. **Mirrors and outdoor metal skip the lamps.** A mirror's pixel is replaced by its probe, and a fully metallic surface has no diffuse, so their lamp light was computed and never seen.

## Real phones (BrowserStack, night, the same session)

| | 0.4.44 | 0.4.45 |
|---|---|---|
| OnePlus 11R fps (3 sweeps) | 53.1 / 49.7 / 53.0 | 52.1 / 49.1 / 52.9 |
| Moto G71 fps | 6.5 / 3.3 / 6.1 | **6.7 / 4.1 / 6.9** |
| OnePlus build · GPU preparation · ready | 6.8 · 5.4 · 13.0 s | 6.8 · 5.5 · 13.1 s |
| Moto build · GPU preparation · ready | 10.3 · 15.3 · 26.6 s | 10.5 · 16.0 · 27.6 s |

- The lightmap was confirmed on on both phones (`__debugHouse().lightmap`).
- **OnePlus 11R:** no change; the difference is within the session's noise (~1 fps).
- **Moto G71:** a small gain, +0.2–0.8 fps over the three sweeps.
- **Load:** the Moto's GPU preparation is ~0.7 s longer. That is the bake, and its two programs are compiled synchronously.
- **Not measured:** the split between the lightmap and the culling. The `?lightmap=0` run failed with "house never ready" on both phones, and so did the baseline and candidate runs in the same batch. Run one at a time afterwards, the baseline and candidate loaded normally, and the batch was not rerun.

## Image parity

- **The full matrix:** `house-parity`, 0.4.45 against 0.4.44, 26 views × 1440×900@2 and 393×852@2 × day and night: **104/104 within 2/255**.
- **Mid-switch:** the lightmap is baked at full night and scaled by the garden's schedule, but the front rooms' lamps that reach the lawn through the glass turn on earlier. Checked with the house's night pinned at 0.3, 0.5 and 0.7 (a temporary flag, since removed), night, 1440×900@2, on 6 path views (desk hold, contact 0.50–0.64, from above the pool) and 5 garden views (approach, from the meadow, pool preset, terrace, porch): **all pass**. A control (0.5 against 1 on one build) differs by 234/255, so the flag took effect.
- **Phone GPUs:** BrowserStack night screenshots on the OnePlus 11R (Adreno 730) and Pixel 7 (Mali-G710), 0.4.44 against 0.4.45, differ only in what moves (fireflies, stars, grass, flowers). The house and the lit garden match.

## Not exact by construction

- **The roof deck** is baked with the eye straight above, at roughness 0.85, so its lamp highlight doesn't follow the camera. It holds 2/255 in every view checked.
- **The switch:** the schedule scaling is exact only at full day and full night. In between it held at the three points checked.

## Checks

Unit 71/71 (including the new light-cell rules). The full `npm run qa`
against the production build (M4, 39.7 min):

| check | result |
|---|---|
| parity | 46/46 · worst mean 0.96, p99 3 |
| perf | gate 6/6, min scroll 119.3 fps · dropout 6/6 clean |
| switch | 12/12 · worst step ×2.9 (limit ×3) |
