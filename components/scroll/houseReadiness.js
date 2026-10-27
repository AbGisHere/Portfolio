/** The house's preparation status, shared by the renderer and scroll layer. */
import { CONTACT_STOPS, DESK_STOPS } from './stops';

let status = 'idle';
const listeners = new Set();

export const getHouseReadiness = () => status;

export function setHouseReadiness(next) {
  if (!['idle', 'loading', 'mesh-ready', 'ready', 'failed'].includes(next)) return;
  if (next === status) return;
  status = next;
  for (const fn of listeners) fn(status);
}

export function subscribeHouseReadiness(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** A preparation boundary only when forward travel would cross it.
 * Geometry finishes over the desk; GPU preparation finishes at the laptop.
 * No elapsed-time or motion-preference condition can release either hold.
 */
export function getHouseHold(tracks, readiness, y, pinned = false) {
  if (pinned || !['loading', 'mesh-ready'].includes(readiness)) return null;
  const geometry = readiness === 'loading';
  const track = tracks.find(t => t.name === (geometry ? 'desk' : 'contact'));
  if (!track) return null;
  const at = geometry ? DESK_STOPS[DESK_STOPS.length - 1] : CONTACT_STOPS[0];
  const stop = track.start + at * track.span;
  return y > stop ? stop : null;
}
