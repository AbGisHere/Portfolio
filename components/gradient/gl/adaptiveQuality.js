/**
 * Adaptive quality (0.2.4): which resolution step the GL canvas renders at,
 * decided from frame intervals alone. Pure (no DOM or timers), so the
 * decisions can be tested by feeding it intervals (scripts/adaptive-test.mjs).
 *
 * - The display's refresh is the median interval of recent frames at rest:
 *   those are cheap, so they run at the display's pace. (The fastest single
 *   interval was timer jitter, not the refresh.)
 * - While a scroll or a switch redraws frame after frame, those intervals are
 *   gathered 60 at a time. Two windows in a row whose median runs over 1.5
 *   refreshes (most frames missed: a GPU that can't keep up, not a burst of
 *   hitches) step down a level.
 * - After 5 s of windows with the p90 within 1.3 refreshes it tries a level
 *   up. A level that fails within 3 s of being tried isn't tried again until
 *   `reset()` (the frame was resized).
 * - The first 2 s and the first 60 busy frames of a load don't count: the
 *   first scroll pays one-off costs.
 */

export const QUALITY = [1, 0.875, 0.75];

const WINDOW = 60;
const WARM_FRAMES = 60;
const WARM_MS = 2000;
const CALM = 60; // intervals at rest kept for the refresh
const CALM_MIN = 15;
const SLOW = 1.5; // × refresh: a window's median over this is bad
const SMOOTH = 1.3; // × refresh: a window's p90 within this is good
const RAISE_AFTER = 5000;
const FAIL_WITHIN = 3000;

const median = xs => [...xs].sort((x, y) => x - y)[xs.length >> 1];

/**
 * @param {(level: number) => void} onChange called with the new level index
 *   (into QUALITY) whenever it changes
 */
export function adaptiveQuality(onChange) {
  let level = 0;
  let best = 0; // the best level still allowed
  const gaps = [];
  const calm = [];
  let refresh = 0;
  let wasBusy = false;
  let bad = 0;
  let goodSince = 0;
  let raisedAt = -Infinity;
  let startedAt = -1;
  let warm = 0;

  function setLevel(next, now) {
    if (next < level) raisedAt = now;
    level = next;
    gaps.length = 0;
    bad = 0;
    goodSince = now;
    onChange(level);
  }

  /** One frame: its interval (ms; ≤ 0 to skip it), whether it redrew for a
   * scroll or switch, and its timestamp. */
  function sample(gap, busy, now) {
    if (startedAt < 0) startedAt = now;
    const pair = busy && wasBusy;
    wasBusy = busy;
    // Pauses (a hidden tab, a stalled loop) say nothing about the GPU.
    if (gap <= 0 || gap > 250) return;
    if (!busy) {
      calm.push(gap);
      if (calm.length > CALM) calm.shift();
      if (calm.length >= CALM_MIN) refresh = median(calm);
      return;
    }
    // Only intervals between two busy frames, once the refresh is known and
    // the load has warmed up.
    if (!pair || !refresh || now - startedAt < WARM_MS) return;
    if (warm < WARM_FRAMES) return void warm++;
    gaps.push(gap);
    if (gaps.length < WINDOW) return;
    gaps.sort((x, y) => x - y);
    const p50 = gaps[WINDOW >> 1];
    const p90 = gaps[Math.floor(WINDOW * 0.9)];
    gaps.length = 0;
    if (p50 > SLOW * refresh) {
      goodSince = now;
      if (++bad < 2) return;
      bad = 0;
      if (now - raisedAt < FAIL_WITHIN) best = Math.min(QUALITY.length - 1, level + 1);
      if (level < QUALITY.length - 1) setLevel(level + 1, now);
    } else {
      bad = 0;
      if (p90 > SMOOTH * refresh) goodSince = now;
      else if (level > best && now - goodSince > RAISE_AFTER) setLevel(level - 1, now);
    }
  }

  return {
    sample,
    /** A new frame size: every level may be tried again. */
    reset() {
      best = 0;
    },
    get level() {
      return level;
    },
  };
}
