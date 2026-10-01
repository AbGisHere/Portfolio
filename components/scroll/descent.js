/**
 * The descent's progress: one number the whole scene reads, outside React so
 * a scroll frame never re-renders anything. The scroll layer writes it
 * (SmoothScroll), the renderers and the sun toggle read it and subscribe.
 *
 * `about` runs 0 → 1 over the 0.2 stretch (the camera drawing back from the
 * mountains), then `desk` over the 0.3 one (down onto the desk). A reader
 * treats a missing key as 0.
 *
 * `?scroll=0.5` pins `about` for tests (parity, perf, screenshots), and
 * `?desk=0.5` pins `desk` (with `about` at 1); the scroll layer then never
 * writes either.
 */

const state = { about: 0, desk: 0 };
const listeners = new Set();

let pinned = null;
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const num = key => (params.get(key) == null ? NaN : Number(params.get(key)));
  const clamp = v => Math.min(1, Math.max(0, v));
  const about = num('scroll');
  const desk = num('desk');
  if (Number.isFinite(desk)) {
    pinned = { about: 1, desk: clamp(desk) };
  } else if (Number.isFinite(about)) {
    pinned = { about: clamp(about), desk: 0 };
  }
  if (pinned) Object.assign(state, pinned);
}

export const isPinned = () => pinned != null;

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
