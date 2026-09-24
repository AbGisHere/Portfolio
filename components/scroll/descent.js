/**
 * The descent's progress: one number the whole scene reads, outside React so
 * a scroll frame never re-renders anything. The scroll layer writes it
 * (SmoothScroll), the renderers and the sun toggle read it and subscribe.
 *
 * `about` runs 0 → 1 over the 0.2 stretch (the camera drawing back from the
 * mountains). Later stretches add their own keys; a reader treats a missing
 * key as 0.
 *
 * `?scroll=0.5` pins `about` for tests (parity, perf, screenshots); the scroll
 * layer then never writes it.
 */

const state = { about: 0 };
const listeners = new Set();

let pinned = null;
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search).get('scroll');
  const v = q == null ? NaN : Number(q);
  if (Number.isFinite(v)) {
    pinned = Math.min(1, Math.max(0, v));
    state.about = pinned;
  }
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
