/**
 * (0.3.11) Where the desk lamp's shade is on screen: its centre and radius
 * in CSS px of the scene, or null where it can't be clicked (off the frame,
 * away from the camera's holds, or no desk drawn: the layered renderer).
 * Outside React, as ./sunSpot.js is: GL's renderer writes it every
 * rebuild, and the hit target (LampToggle) reads it and moves itself.
 */

let spot = null;
const listeners = new Set();

export const getLampSpot = () => spot;

export function publishLampSpot(next) {
  if (spot === next) return;
  if (spot && next && Math.abs(spot.x - next.x) < 0.01 && Math.abs(spot.y - next.y) < 0.01 && Math.abs(spot.r - next.r) < 0.01) return;
  spot = next;
  for (const fn of listeners) fn(spot);
}

export function subscribeLampSpot(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
