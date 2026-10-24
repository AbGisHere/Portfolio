/**
 * The descent's progress: one number the whole scene reads, outside React so
 * a scroll frame never re-renders anything. The scroll layer writes it
 * (SmoothScroll), the renderers and the sun toggle read it and subscribe.
 *
 * `about` runs 0 → 1 over the 0.2 stretch (the camera drawing back from the
 * mountains), then `desk` over the 0.3 one (down onto the desk), then
 * `contact` over the 0.4 one (round to the house and onto its pool). A
 * reader treats a missing key as 0.
 *
 * `?scroll=0.5` pins `about` for tests (parity, perf, screenshots),
 * `?desk=0.5` pins `desk` (with `about` at 1) and `?contact=0.5` pins
 * `contact` (with both at 1); the scroll layer then never writes any.
 */

const state = { about: 0, desk: 0, contact: 0 };
const listeners = new Set();

let pinned = null;
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const num = key => (params.get(key) == null ? NaN : Number(params.get(key)));
  const clamp = v => Math.min(1, Math.max(0, v));
  const about = num('scroll');
  const desk = num('desk');
  const contact = num('contact');
  if (Number.isFinite(contact)) {
    pinned = { about: 1, desk: 1, contact: clamp(contact) };
  } else if (Number.isFinite(desk)) {
    pinned = { about: 1, desk: clamp(desk), contact: 0 };
  } else if (Number.isFinite(about)) {
    pinned = { about: clamp(about), desk: 0, contact: 0 };
  }
  if (pinned) Object.assign(state, pinned);
}

export const isPinned = () => pinned != null;

/** (0.4.2) Pins the store from code (the dev-only /house route): the scroll
 * layer then writes nothing until `null` lets it go. */
export function pinDescent(next) {
  pinned = next;
  if (next) Object.assign(state, next);
  for (const fn of listeners) fn(state);
}

export const getDescent = () => state;

export function setDescent(next) {
  if (pinned != null) return;
  let changed = false;
  for (const k in next) {
    const v = Math.min(1, Math.max(0, next[k]));
    if (state[k] !== v) {
      state[k] = v;
      changed = true;
    }
  }
  if (changed) for (const fn of listeners) fn(state);
}

export function subscribeDescent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
