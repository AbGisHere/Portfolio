/**
 * (0.5.38) The opening's intro: the camera starts looking up into the sky
 * while the mountains load, then tilts down onto them. The renderer
 * (MistCanvas) runs it on its own frame loop and sets the lock here; the
 * scroll layer (SmoothScroll) holds the page still while it's set. Outside
 * React, like the descent's progress.
 *
 * The lock always lets go by itself after `LOCK_CAP_MS`, whatever the
 * renderer does (a lost context, a fallback), so the page can never stay
 * stuck.
 */

const LOCK_CAP_MS = 8000;
const listeners = new Set();
let locked = false;
let capId = null;

export const isIntroLocked = () => locked;

export function setIntroLock(next) {
  next = !!next;
  if (next === locked) return;
  locked = next;
  if (typeof window !== 'undefined') {
    window.clearTimeout(capId);
    capId = next ? window.setTimeout(() => setIntroLock(false), LOCK_CAP_MS) : null;
  }
  for (const fn of listeners) fn(locked);
}

export function subscribeIntro(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
