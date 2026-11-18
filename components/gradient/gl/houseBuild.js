/**
 * (0.4.56) The house's meshes, built: the worker's build (houseWorker.js)
 * and the build-time one (scripts/house-prebuild.mjs) share it, so the
 * prebuilt house is the one the browser would build.
 */
import { houseLayout } from './houseMesh';
import { curtainMesh } from './houseRooms';
import { packCurtainMesh, packHouseMesh, tagLampFittings } from './houseLights';

export function buildHouse() {
  const rawHouse = houseLayout();
  tagLampFittings(rawHouse.data);
  return { house: packHouseMesh(rawHouse), curtains: packCurtainMesh(curtainMesh()) };
}
