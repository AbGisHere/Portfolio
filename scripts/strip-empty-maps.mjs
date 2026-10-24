/**
 * (0.4.15) After `next build` (npm's `postbuild`): removes the empty source
 * maps Turbopack writes for a web worker's chunk group (the house's,
 * components/gradient/gl/houseWorker.js) even with browser source maps off.
 * Only maps with no sources go; a real one stays, for hygiene to fail on.
 */
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.env.NEXT_DIST_DIR || '.next', 'static');
const empty = map => {
  try {
    const m = JSON.parse(readFileSync(map, 'utf8'));
    const sources = [...(m.sources ?? []), ...(m.sections ?? []).flatMap(s => s.map?.sources ?? [])];
    return sources.length === 0;
  } catch {
    return false;
  }
};
let removed = 0;
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.map') && empty(p)) {
      unlinkSync(p);
      removed++;
    }
  }
};
try {
  walk(root);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
if (removed) console.log(`strip-empty-maps: removed ${removed} empty source map(s) from ${root}`);
