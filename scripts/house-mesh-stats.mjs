#!/usr/bin/env node
/** Exclusive emitted geometry per module; instrumentation never edits source files.
 * node scripts/house-mesh-stats.mjs [--root /path/to/checkout]
 * Each export is measured around its real invocation. Nested emission is charged
 * to the nested module only, so the totals reconcile exactly to houseLayout().
 */
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const rootArg = process.argv.indexOf('--root');
const root = resolve(rootArg < 0 ? process.cwd() : process.argv[rootArg + 1]);
const categories = {
  houseMesh: 'shell', houseRooms: 'shell', furniture: 'furniture', garments: 'garments',
  plantMesh: 'plants', washrooms: 'washrooms', homeDetails: 'homeDetails', lightFixtures: 'lightFixtures',
};
const totals = new Map();
const stack = [];
globalThis.__houseMeshMeasure = (module, name, fn, args) => {
  const out = Array.isArray(args[0]) ? args[0] : null;
  const frame = { out, before: out?.length ?? 0, children: 0 };
  stack.push(frame);
  try {
    const result = fn(...args);
    const gross = out ? out.length - frame.before : (result?.data?.length ?? 0);
    const exclusive = gross - frame.children;
    if (exclusive < 0) throw new Error(`Negative exclusive geometry: ${module}.${name}`);
    totals.set(module, (totals.get(module) ?? 0) + exclusive);
    const parent = stack.at(-2);
    if (parent && (!parent.out || parent.out === out)) parent.children += gross;
    return result;
  } finally {
    stack.pop();
  }
};

registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx); }
    catch (err) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(spec) && !/\.[cm]?jsx?$/.test(spec)) return next(`${spec}.js`, ctx);
      throw err;
    }
  },
  load(url, ctx, next) {
    const loaded = next(url, /\/components\/.*\.js$/.test(url) ? { ...ctx, format: 'module' } : ctx);
    const module = /\/components\/gradient\/gl\/([^/]+)\.js$/.exec(url)?.[1];
    if (!categories[module]) return loaded;
    const exports = [];
    let source = String(loaded.source).replace(/export function (\w+)\(/g, (_, name) => {
      exports.push(name);
      return `function __meshStats_${name}(`;
    });
    // Cladding is a single-line exported arrow; include it in washroom totals.
    if (module === 'washrooms' && /export const clad =/.test(source)) {
      source = source.replace('export const clad =', 'const __meshStats_clad =');
      exports.push('clad');
    }
    source += exports.map(name => `\nexport function ${name}(...args) { return globalThis.__houseMeshMeasure(${JSON.stringify(module)}, ${JSON.stringify(name)}, __meshStats_${name}, args); }`).join('');
    return { ...loaded, source };
  },
});

const { houseLayout } = await import(pathToFileURL(resolve(root, 'components/gradient/gl/houseMesh.js')).href);
const house = houseLayout();
const aggregate = {};
for (const [module, words] of totals) {
  if (words % 9) throw new Error(`${module}: emission is not a 9-attribute mesh`);
  const category = categories[module];
  aggregate[category] = (aggregate[category] ?? 0) + words / 9;
}
const modules = Object.fromEntries(Object.entries(aggregate).sort().map(([name, vertices]) => [name, { vertices, triangles: vertices / 3, bytes: vertices * 9 * 4 }]));
const sum = Object.values(modules).reduce((n, row) => n + row.vertices, 0);
if (sum !== house.count) throw new Error(`Attribution ${sum} does not reconcile with ${house.count} actual vertices`);
console.log(JSON.stringify({ root, count: house.count, triangles: house.count / 3, bytes: house.data.byteLength, lawn: house.lawn, modules }, null, 2));
