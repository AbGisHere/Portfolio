/**
 * (0.3.11) Where the desk lamp's top half is (gl/lampShape.js LAMP_POSE:
 * the arms' turn, the head's reach and height), outside React, as the
 * descent's progress is: the hit target (LampToggle) moves it as it's
 * dragged, the renderer redraws the lamp and its light from it. Kept per
 * browser (a viewer's own desk); `?freeze=1` (the harness) always starts
 * from the first pose.
 */
import { LAMP_POSE } from './gl/lampShape';

const KEY = 'abg-lamp';
let pose = null;
const listeners = new Set();

function load() {
  try {
    if (new URLSearchParams(window.location.search).get('freeze') === '1') return LAMP_POSE;
    const p = JSON.parse(window.localStorage.getItem(KEY));
    if (p && [p.yaw, p.s, p.y].every(Number.isFinite)) return { yaw: p.yaw, s: p.s, y: p.y };
  } catch {}
  return LAMP_POSE;
}

export function getLampPose() {
  if (!pose) pose = typeof window === 'undefined' ? LAMP_POSE : load();
  return pose;
}

export function setLampPose(next) {
  pose = next;
  for (const fn of listeners) fn(pose);
}

/** Keep the pose (at the end of a drag, not every move). */
export function saveLampPose() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(getLampPose()));
  } catch {}
}

export function subscribeLampPose(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
