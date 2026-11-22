/**
 * Lazy-loaded bundle of the house, pool, mirror probe, lightmap and bloom
 * subsystems. Dynamically imported by MistCanvas.jsx on approach to the desk
 * or direct house entry so the opening hero chunk never downloads, parses, or
 * runs top-level light-cell construction (lightCellGrid) at scroll 0.
 */
import { HOUSE_PART } from './houseShape';
import { runVariant } from './houseLights';

export {
  HOUSE_DEPTH_FRAGMENT,
  HOUSE_DEPTH_SOLID_FRAGMENT,
  HOUSE_DEPTH_VERTEX,
  HOUSE_FRAGMENT,
  HOUSE_FRAME_BINDING,
  HOUSE_FRAME_FLOATS,
  HOUSE_MIRROR_FRAGMENT,
  HOUSE_STRIDE,
  HOUSE_VERTEX,
  LIGHTMAP_BOUNDS,
  houseLightData,
  houseVariant,
} from './houseShader';
export { CURTAIN_STRIDE, houseRanges, leafChecksum, runVariant, runsChecksum } from './houseLights';
export { HOUSE_PVS } from './housePvs';
export { PACKED_WORDS, bindTables, packVertices, pointPacked, tableData, tableSamplers, uploadTables, vertexTables } from './houseVertices';
export { WATER_PROGRAMS, makeWater } from './poolWater';
export { PROBE, PROBE_BACKDROP_FRAGMENT, PROBE_BACKDROP_VERTEX, PROBE_FACES, makeProbes, mirrorsOnPath, probeLayout } from './mirrorProbe';
export { personMesh } from './personMesh';
export { BLOOM_PROGRAMS, makeBloom } from './bloom';
export { GLASS_PANE_FRAGMENT, GLASS_PANE_VERTEX, GLASS_WATER_FRAGMENT, GLASS_WATER_VERTEX, glassMesh } from './houseGlass';
export { SHADOW_FRAGMENT, SHADOW_VERTEX, lightDir, makeShadow } from './houseShadow';
export { LEAF_INSTANCE_STRIDE, LEAF_TEMPLATES, LEAF_TEMPLATE_STRIDE, leafTemplate } from './leafInstances';
export { ATLAS_FRAGMENT, ATLAS_VERTEX, LAWN_MESH_FRAGMENT, LAWN_MESH_VERTEX, lightmapHash, makeLightmap, startLightmapReadback, uploadLightmap } from './houseLightmap';
export { storeLightmap, validLightmap } from './lightmapCache';
export { bakedLightmapUrl } from './lightmapBaked';

export const LEAF_VARIANT = runVariant([HOUSE_PART.leaf]);
