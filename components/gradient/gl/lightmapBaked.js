/**
 * (0.5.16, H1) The house's lightmap baked ahead of time
 * (`scripts/lightmap-bake.mjs`, on the M4) and shipped at
 * `public/lightmap/lightmap.bin.gz`: half floats, as the texture holds them,
 * gzipped. Where the browser has no stored bake of its own
 * (lightmapCache.js), the house worker fetches this in place of baking on
 * the device (two compiles, a draw and a 20 s read-back to store it).
 * `?lmbaked=0` bakes on the device as before.
 *
 * `bakedLightmapHash()` names everything the bake reads: its shaders, the
 * atlas's bounds, the lights' data and the house's mesh (through the path's
 * visible set's checksum, which its own test keeps in step with the mesh).
 * The unit test fails when it no longer matches LIGHTMAP_BAKED: rerun
 * `npm run lightmap-bake` against a production server. At run time a
 * mismatch bakes on the device.
 */
import { ATLAS_FRAGMENT, ATLAS_VERTEX, LAWN_MESH_FRAGMENT, LAWN_MESH_VERTEX } from './houseLightmap';
import { houseLightData, LIGHTMAP_BOUNDS } from './houseShader';
import { HOUSE_PVS } from './housePvs';
import { hashParts } from './lightmapCache';

export const LIGHTMAP_BAKED = { hash: '979f0a04a870e38c' };

export function bakedLightmapHash() {
  return hashParts([
    'lightmap-baked-1', ATLAS_VERTEX, ATLAS_FRAGMENT, LAWN_MESH_VERTEX, LAWN_MESH_FRAGMENT,
    JSON.stringify(LIGHTMAP_BOUNDS), houseLightData().data, String(HOUSE_PVS.checksum), String(HOUSE_PVS.runs),
  ]);
}

/** The shipped bake's URL, or null where it's stale or turned off. */
export function bakedLightmapUrl() {
  try {
    if (!LIGHTMAP_BAKED.hash || bakedLightmapHash() !== LIGHTMAP_BAKED.hash) return null;
  } catch {
    return null;
  }
  return `/lightmap/lightmap.bin.gz?h=${LIGHTMAP_BAKED.hash}`;
}
