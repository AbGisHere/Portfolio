#!/usr/bin/env node
// Owner-approved 0.4.35 reference preparation; no geometry/shader changes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('Usage: node scripts/prepare-house-reference.mjs /path/to/v0.4.35-worktree');
const file = 'components/gradient/gl/MistCanvas.jsx';
const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'v0.4.35^{commit}')) {
  throw new Error('Reference must be checked out at v0.4.35');
}
const original = execFileSync('git', ['show', `v0.4.35:${file}`], { cwd: dir, encoding: 'utf8' });
const hook = `
    // Test-only readiness observation; does not change rendering or scheduling.
    if (params.get('warmprobes') === '1') window.__debugHouse = () => ({
      house: !!house, houseBuilt: !!houseBuilt,
      ready: !!house && !!probeSet && probeSet.every(m => m.faces >= 6),
      probesStale: !probeSet || probeSet.some(m => m.faces < 6 || Math.abs(m.night - houseNight()) > 0.03),
    });`;
// Each insertion point must exist exactly once, or nothing is written.
const replaceOnce = (src, from, to) => {
  if (src.split(from).length !== 2) throw new Error(`Reference preparation insertion point missing: ${from}`);
  return src.replace(from, to);
};
const intermediate = replaceOnce(
  replaceOnce(original, 'if (stale && d < PROBE.reach && d < best)', "if (stale && (params.get('warmprobes') === '1' || d < PROBE.reach) && d < best)"),
  '    kickRef.current = kick;', '    kickRef.current = kick;' + hook);
const prepared = replaceOnce(intermediate, 'houseSeen && probeStep()', "(houseSeen || params.get('warmprobes') === '1') && probeStep()");
const path = resolve(dir, file), existing = readFileSync(path, 'utf8');
if (![original, intermediate, prepared].includes(existing)) {
  throw new Error('Reference contains unrelated edits; refusing to overwrite');
}
writeFileSync(path, prepared);
console.log('Prepared v0.4.35 reference: query-gated full mirror preparation and readiness observation only.');
