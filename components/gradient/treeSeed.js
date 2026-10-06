/**
 * (0.3.11) The seed the copses are jittered from (gl/treeShader.js
 * `treeLayout`): the same on every visit and every refresh, drawn anew on
 * a hard refresh (the owner, 2026-10-06) or a first visit.
 *
 * A page can't ask how it was reloaded, so a hard refresh is told by what it
 * does: it bypasses the cache, so the page and the scripts it starts with
 * come over the network whole (`transferSize`), where a plain refresh
 * revalidates the page and takes the scripts from the cache. Where a
 * browser doesn't report sizes it counts as a plain refresh. (A new
 * deploy, its scripts not yet cached, counts as a hard refresh too.) `?freeze=1` (the harness) gets no seed: the copses as placed.
 * Kept in `localStorage['abg-trees']`.
 */

const KEY = 'abg-trees';

function hardReload() {
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  if (nav?.type !== 'reload' || typeof nav.transferSize !== 'number') return false;
  // The page came over whole (a plain refresh revalidates it: a 304, only
  // headers), and so did the scripts it started with (a plain refresh takes
  // those hashed files from the cache without asking). Chunks loaded later,
  // after the reload itself, come from the cache either way.
  const page = nav.transferSize > nav.encodedBodySize;
  const scripts = performance
    .getEntriesByType('resource')
    .filter(r => r.name.includes('/_next/static/') && r.startTime < nav.domContentLoadedEventEnd);
  return page && scripts.some(r => r.transferSize > 0);
}

let seed;

export function treeSeed() {
  if (seed !== undefined) return seed;
  try {
    if (new URLSearchParams(window.location.search).get('freeze') === '1') return (seed = null);
    const kept = Number.parseInt(window.localStorage.getItem(KEY), 10);
    if (Number.isFinite(kept) && !hardReload()) return (seed = kept);
    seed = Math.floor(Math.random() * 2 ** 31);
    window.localStorage.setItem(KEY, String(seed));
  } catch {
    seed ??= null;
  }
  return seed;
}
