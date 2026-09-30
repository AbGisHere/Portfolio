#!/usr/bin/env node
/**
 * Every quality check before a push, in one command. A thin runner: the
 * checks live in the scripts it runs (each with `--quiet`); this only picks
 * a tier, runs them in order against one production server, and prints one
 * line per check and a table.
 *
 *   npm run build && npx next start -p 3001
 *   npm run qa [-- --base http://localhost:3001] [--full | --quick]
 *              [--only parity,perf] [--skip switch]
 *
 * Tier: `quick` when everything changed against origin/main (committed,
 * uncommitted and untracked) is docs (*.md, *.txt, LICENSE), else `full`.
 * It keeps going after a failure, prints a failed check's failing cases
 * (the detail is in scripts/out/<check>/), and exits 1 if any check failed.
 */
import { execSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { SCRIPTS_DIR, parseArgs } from './lib/harness.mjs';

const args = parseArgs();
const BASE = String(args.base ?? 'http://localhost:3001');
const ROOT = join(SCRIPTS_DIR, '..');
const list = v => (typeof v === 'string' ? v.split(',') : []);

function pickTier() {
  if (args.full) return ['full', '--full'];
  if (args.quick) return ['quick', '--quick'];
  try {
    const git = cmd => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const files = `${git('git diff --name-only origin/main')}\n${git('git ls-files --others --exclude-standard')}`
      .split('\n')
      .filter(Boolean);
    const code = files.filter(f => !/\.(md|txt)$|(^|\/)LICENSE$/.test(f));
    return code.length ? ['full', `${code.length} non-doc files changed`] : ['quick', 'docs-only changes'];
  } catch {
    return ['full', 'no origin/main to diff against'];
  }
}
const [TIER, WHY] = pickTier();

const node = (...a) => ['node', ...a];
const harness = (name, ...a) => node(`scripts/${name}.mjs`, '--base', BASE, '--quiet', ...a);
const CHECKS = [
  { name: 'test:adaptive', cmd: node('--test', 'scripts/adaptive-test.mjs'), tiers: ['quick', 'full'] },
  { name: 'test:unit', cmd: node('--import', './scripts/lib/resolve-js.mjs', '--test', 'scripts/unit-test.mjs'), tiers: ['quick', 'full'] },
  { name: 'hygiene', cmd: harness('hygiene'), tiers: ['quick', 'full'], server: true },
  { name: 'parity', cmd: harness('parity', ...(TIER === 'quick' ? ['--scrolls', '0'] : [])), tiers: ['quick', 'full'], server: true },
  { name: 'perf', cmd: harness('perf', '--gate'), tiers: ['full'], server: true },
  { name: 'switch', cmd: harness('switch'), tiers: ['full'], server: true },
];

/** Runs one check; returns its exit code and output. */
function run(cmd) {
  return new Promise(resolve => {
    const child = spawn(cmd[0], cmd.slice(1), { cwd: ROOT });
    let out = '';
    child.stdout.on('data', d => (out += d));
    child.stderr.on('data', d => (out += d));
    child.on('close', code => resolve({ code, out }));
  });
}

// A harness's last line is its summary ("parity: 46/46 passed · …"); a
// node --test run's is its tally. Everything else a quiet run prints is a
// failing case.
function read(out) {
  const lines = out.split('\n').filter(l => l.trim());
  const tally = k => out.match(new RegExp(`^ℹ ${k} (\\d+)`, 'm'))?.[1];
  if (tally('pass') != null) {
    return { keys: `${tally('pass')} pass, ${tally('fail')} fail`, fails: lines.filter(l => /^\s*✖/.test(l)).slice(0, 20) };
  }
  const last = lines.at(-1) ?? '';
  const summary = /^[\w:]+: /.test(last);
  return {
    keys: summary ? last.replace(/^[\w:]+: /, '') : '',
    fails: (summary ? lines.slice(0, -1) : lines).filter(l => !/MODULE_TYPELESS|^Reparsing|^To eliminate|--trace-warnings/.test(l)).slice(-60),
  };
}

const up = await fetch(BASE, { signal: AbortSignal.timeout(5000) }).then(r => r.ok, () => false);
const only = list(args.only);
const skip = list(args.skip);
console.log(`qa · ${TIER} tier (${WHY}) · ${BASE}`);
const rows = [];
const t0 = Date.now();
const time = s => (s == null ? '—' : s < 60 ? `${s.toFixed(0)} s` : `${(s / 60).toFixed(1)} m`);
for (const check of CHECKS) {
  let row = { name: check.name, keys: '' };
  if (!check.tiers.includes(TIER)) row.result = `skipped (${TIER})`;
  else if ((only.length && !only.includes(check.name)) || skip.includes(check.name)) row.result = 'skipped (flag)';
  else if (check.server && !up) row.result = 'FAIL (no server)';
  else {
    const t = Date.now();
    const { code, out } = await run(check.cmd);
    const { keys, fails } = read(out);
    row = { ...row, result: code === 0 ? 'pass' : 'FAIL', keys, s: (Date.now() - t) / 1000 };
    console.log(`${code === 0 ? 'ok  ' : 'FAIL'} ${check.name.padEnd(14)} ${time(row.s).padStart(6)}  ${keys}`);
    if (code !== 0) {
      for (const l of fails.slice(0, 10)) console.log(`       ${l.length > 200 ? `${l.slice(0, 199)}…` : l}`);
      if (fails.length > 10) console.log(`       … ${fails.length - 10} more (detail: scripts/out/${check.name}/)`);
    }
    rows.push(row);
    continue;
  }
  rows.push(row);
}

console.log(`\n${'check'.padEnd(15)}${'result'.padEnd(17)}${'time'.padStart(6)}`);
for (const r of rows) console.log(`${r.name.padEnd(15)}${r.result.padEnd(17)}${time(r.s).padStart(6)}`);
const failed = rows.filter(r => r.result.startsWith('FAIL')).length;
console.log(
  `${failed ? `${failed} failed` : 'all passed'} · ${TIER} tier · ${((Date.now() - t0) / 60000).toFixed(1)} min · ` +
    'WebKit (console, atmosphere) stays a manual check',
);
process.exit(failed ? 1 : 0);
