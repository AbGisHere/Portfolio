/**
 * (0.4.56) The house's meshes, built: the worker's build (houseWorker.js)
 * and the build-time one (scripts/house-prebuild.mjs) share it, so the
 * prebuilt house is the one the browser would build.
 *
 * (0.4.57) Its vertices and the curtains' packed tighter against one set
 * of tables (houseVertices.js), `house.tables`, the same values to the bit.
 */
import { houseLayout } from './houseMesh';
import { curtainMesh } from './houseRooms';
import { CURTAIN_STRIDE, HOUSE_STRIDE, packCurtainMesh, packHouseMesh, tagLampFittings } from './houseLights';
import { packVertices, tableData, vertexTables } from './houseVertices';

/** Indexed float meshes ({ house, curtains }) packed, in place. */
export function packMeshes(meshes) {
  const tables = vertexTables();
  meshes.house.vertices = packVertices(meshes.house.vertices, HOUSE_STRIDE, tables);
  meshes.curtains.vertices = packVertices(meshes.curtains.vertices, CURTAIN_STRIDE, tables);
  meshes.house.tables = tableData(tables);
  return meshes;
}

export function buildHouse() {
  const rawHouse = houseLayout();
  tagLampFittings(rawHouse.data);
  return packMeshes({ house: packHouseMesh(rawHouse), curtains: packCurtainMesh(curtainMesh()) });
}
