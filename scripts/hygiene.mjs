// The machine-checkable half of CLAUDE.md's pre-push checks, run against a
// production server (`npm run build && npx next start`). No browser: it reads
// the served HTML and text routes, and the build output on disk, so it runs
// the same on a laptop and in CI. What needs a real GPU or a browser (console
// errors, the atmosphere on each viewport, parity, perf) stays manual.
//
//   node scripts/hygiene.mjs [--base http://localhost:3000] [--quiet]
//
// `--quiet` (as `npm run qa` runs it): only failures, then one summary line.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const argAt = process.argv.indexOf('--base');
const BASE = (argAt > -1 ? process.argv[argAt + 1] : 'http://localhost:3000').replace(/\/$/, '');

const QUIET = process.argv.includes('--quiet');
const failures = [];
let checks = 0;
const check = (ok, what) => {
  checks++;
  if (!ok || !QUIET) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  if (!ok) failures.push(what);
};

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return { status: res.status, text: await res.text() };
}

const count = (text, re) => (text.match(re) || []).length;
const titleOf = html => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
const descOf = html => html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? null;

// Pages: the sitemap's routes, plus the 404.
const sitemap = await get('/sitemap.xml');
check(sitemap.status === 200, 'sitemap.xml resolves');
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
check(locs.length > 0, `sitemap.xml lists routes (${locs.join(', ') || 'none'})`);

const titles = new Map();
for (const path of locs) {
  const page = await get(path);
  check(page.status === 200, `${path} resolves (sitemap lists nothing dead)`);
  const html = page.text;
  const title = titleOf(html);
  const desc = descOf(html);
  check(/<html[^>]*\blang="en"/.test(html), `${path} has <html lang="en">`);
  check(!!title, `${path} has a <title>`);
  check(!!desc, `${path} has a meta description`);
  check(!/Create Next App|Vite \+ React/i.test(html), `${path} has no boilerplate defaults`);
  check(count(html, /<h1[\s>]/g) <= 1, `${path} has at most one <h1>`);
  check(/<link rel="canonical"/.test(html), `${path} has a canonical link`);
  check(/<meta property="og:image"/.test(html), `${path} has an og:image`);
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  check(imgs.every(tag => /\balt=/.test(tag)), `${path}: every <img> has alt (${imgs.length})`);
  if (title) {
    check(!titles.has(title), `${path} title is unique ("${title}")`);
    titles.set(title, path);
  }
}

const home = (await get('/')).text;
check(/application\/ld\+json/.test(home), 'home has JSON-LD');

const missing = await get('/this-route-does-not-exist');
check(missing.status === 404, '404 route returns 404');
check(!/This page could not be found/.test(missing.text), '404 is the custom page, not Next\'s default');

const robots = await get('/robots.txt');
check(robots.status === 200, 'robots.txt resolves');
check(!/Disallow:\s*\/\s*$/m.test(robots.text), 'robots.txt blocks nothing (AI crawlers included)');
check(/Sitemap:/.test(robots.text), 'robots.txt points at the sitemap');

check((await get('/llms.txt')).status === 200, 'llms.txt resolves');
check((await get('/icon.svg')).status === 200, 'favicon resolves');

// No browser source maps shipped.
const maps = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.map')) maps.push(p);
  }
};
walk('.next/static');
check(maps.length === 0, `no .map files in .next/static (${maps.length})`);

console.log(
  QUIET
    ? `hygiene: ${checks - failures.length}/${checks} passed`
    : failures.length
      ? `\n${failures.length} failed`
      : '\nall passed',
);
process.exit(failures.length ? 1 : 0);
