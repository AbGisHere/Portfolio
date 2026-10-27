/**
 * (0.4.13) The house's mesh and its curtains' (houseMesh.js, houseRooms.js),
 * built off the main thread: they take seconds, so MistCanvas.jsx starts
 * this as the page loads, and the camera's first turn to the house never
 * waits on them. Answers one message with both, their buffers moved.
 */
import { houseLayout } from './houseMesh';
import { curtainMesh } from './houseRooms';
import { packCurtainMesh, packHouseMesh, tagLampFittings } from './houseLights';

// (Only inside a worker: the unit tests import every module here.)
if (typeof self !== 'undefined') {
  self.onmessage = () => {
    const rawHouse = houseLayout();
    tagLampFittings(rawHouse.data);
    const house = packHouseMesh(rawHouse, { uniqueParts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] });
    const curtains = packCurtainMesh(curtainMesh());
    self.postMessage(
      { house, curtains },
      [house.vertices.buffer, house.indices.buffer, curtains.vertices.buffer, curtains.indices.buffer],
    );
  };
}
