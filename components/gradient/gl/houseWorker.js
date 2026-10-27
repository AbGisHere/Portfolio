/**
 * (0.4.13) The house's mesh and its curtains' (houseMesh.js, houseRooms.js),
 * built off the main thread when the visitor approaches the desk or enters
 * the house directly. Readiness holds cover unfinished preparation. Answers
 * one message with both meshes, transferring their buffers without copying.
 */
import { houseLayout } from './houseMesh';
import { curtainMesh } from './houseRooms';
import { packCurtainMesh, packHouseMesh, tagLampFittings } from './houseLights';

// (Only inside a worker: the unit tests import every module here.)
if (typeof self !== 'undefined') {
  self.onmessage = () => {
    const rawHouse = houseLayout();
    tagLampFittings(rawHouse.data);
    const house = packHouseMesh(rawHouse);
    const curtains = packCurtainMesh(curtainMesh());
    self.postMessage(
      { house, curtains },
      [house.vertices.buffer, house.indices.buffer, curtains.vertices.buffer, curtains.indices.buffer],
    );
  };
}
