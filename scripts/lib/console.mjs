/**
 * Console watch for the harness (parity, switch, perf): every console error
 * or warning and every uncaught page error on a page, as strings. Any entry
 * fails the harness that opened the page. WebKit isn't covered: it stays a
 * manual check (CLAUDE.md, "Pre-push checks").
 */

// Noise the harness causes itself, not the site: Chrome warns when a
// readPixels (the harness's own, or GL's `?bench` sync) stalls the GPU.
const HARNESS_NOISE = [/GPU stall due to ReadPixels/];

/** Starts collecting on `page`; returns the (live) list of problems. */
export function watchConsole(page) {
  const problems = [];
  page.on('console', m => {
    const type = m.type();
    if (type !== 'error' && type !== 'warning') return;
    const text = m.text();
    if (HARNESS_NOISE.some(re => re.test(text))) return;
    // A 404 page's own document logs its status; a missing subresource
    // (another URL) still counts.
    if (/status of 404/.test(text) && m.location()?.url === page.url()) return;
    problems.push(`${type}: ${text}`);
  });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message ?? e}`));
  return problems;
}

/** True when the page scrolls sideways (content wider than the viewport). */
export function overflowsX(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
}
