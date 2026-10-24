/**
 * (0.4.2) A free camera for looking round the house up close (the dev-only
 * /house route, app/house): where it stands (metres from the desk's
 * centre, y up, z toward the mountains), which way it looks (yaw from the
 * mountains toward +x, pitch down, both radians) and its zoom. Outside React
 * like the descent's progress, so moving it re-renders nothing. While it's
 * on, the scene takes it in place of the descent's camera (scene.js,
 * deskCamera.js freeCameraAt).
 */

const state = { on: false, x: 0, y: 5.3, z: -50, yaw: Math.PI, pitch: 0.05, zoom: 1 };
const listeners = new Set();

export const getFreeCam = () => (state.on ? state : null);

export function setFreeCam(next) {
  Object.assign(state, next);
  state.pitch = Math.max(-1.45, Math.min(1.5, state.pitch));
  state.zoom = Math.max(0.45, Math.min(4, state.zoom));
  for (const fn of listeners) fn(state);
}

export function subscribeFreeCam(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
