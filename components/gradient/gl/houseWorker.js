/**
 * (0.4.13) The house's mesh and its curtains' (houseMesh.js, houseRooms.js),
 * built off the main thread: they take seconds, so MistCanvas.jsx starts
 * this as the page loads, and the camera's first turn to the house never
 * waits on them. Answers one message with both, their buffers moved.
 */
import { houseLayout } from './houseMesh';
import { curtainMesh } from './houseRooms';

// (Only inside a worker: the unit tests import every module here.)
if (typeof self !== 'undefined') {
  self.onmessage = () => {
    const house = houseLayout();
    const curtains = curtainMesh();
    self.postMessage({ house, curtains }, [house.data.buffer, curtains.data.buffer]);
  };
}
