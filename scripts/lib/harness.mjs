/**
 * Shared plumbing for the renderer harness (parity.mjs, perf.mjs).
 * See scripts/README.md for the contract a renderer has to honour.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCRIPTS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const OUT_DIR = join(SCRIPTS_DIR, 'out');

/** `--key value` / `--key=value` / `--flag` → object. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > -1) out[a.slice(2, eq)] = a.slice(eq + 1);
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}

/** "393x852@2" → { name, width, height, dpr }. */
export function parseViewport(spec) {
  const m = /^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/.exec(spec.trim());
  if (!m) throw new Error(`Bad viewport "${spec}" — expected WxH or WxH@dpr`);
  const [, w, h, dpr = '1'] = m;
  return { name: `${w}x${h}@${dpr}`, width: +w, height: +h, dpr: +dpr };
}

export function viewportsFrom(arg, defaults) {
  return (arg ? String(arg).split(',') : defaults).map(parseViewport);
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** URL for a renderer, with any extra query params. */
export function sceneUrl(base, renderer, extra = {}) {
  const u = new URL(base);
  u.searchParams.set('renderer', renderer);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  return u.toString();
}

/** Seeds the theme before any page script runs, like a returning visitor. */
export async function seedTheme(context, theme) {
  await context.addInitScript(t => {
    try {
      localStorage.setItem('abg-theme', t);
    } catch {}
  }, theme);
}

/** Which renderer actually painted: the wrapper's data-renderer. */
export async function readRenderer(page) {
  return page.evaluate(() => document.querySelector('[data-renderer]')?.dataset.renderer ?? 'unknown');
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
