/**
 * (0.4.44) The path's visible set: which of the house's runs can be seen,
 * looking any way, from each point of the contact path (deskCamera.js
 * CONTACT_PATH). The camera is a pure function of scroll and the house is
 * static and opaque (its solid part discards nothing outside the mirror
 * pass), so this is known ahead: writes components/gradient/gl/housePvs.js,
 * which the renderer uses to skip runs nothing can show (houseRanges `keep`).
 *
 *   node --import ./scripts/lib/resolve-js.mjs scripts/house-pvs.mjs [--res 1024]
 *
 * Rerun whenever the house's mesh changes: the file carries a checksum of
 * the runs' bounds, and the renderer ignores it on a mismatch.
 *
 * Per sample it rasterises a cube of run ids with depth around the eye
 * (any aspect, any framing), at `--res` per face. Only large surfaces
 * (walls, floors, roofs: triangles of 0.25 m² or more) hide anything; a run
 * counts if any of its triangles, grown by half a texel's diagonal, has a
 * texel where no occluder is nearer than its own nearest point. Leaves and
 * thin parts never hide, so what shows through their gaps is kept. Each run's samples are then widened by `PAD` on both sides.
 */
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { houseLayout } from '../components/gradient/gl/houseMesh.js';
import { HOUSE_RUN, packHouseMesh, tagLampFittings, runsChecksum } from '../components/gradient/gl/houseLights.js';
import { contactCameraAt, cameraMetres } from '../components/gradient/deskCamera.js';
import moonlit from '../components/gradient/recipes/moonlit.js';

const STEPS = 400;
const PAD = 2;
const DEVICES = ['laptop', 'tablet'];

const build = () => {
  const raw = houseLayout();
  tagLampFittings(raw.data);
  return { raw, runs: packHouseMesh(raw).runs };
};

if (!isMainThread) {
  const { raw } = build();
  const { data, count, lawn } = raw;
  const { res: R, jobs } = workerData;
  const nRuns = Math.ceil((count - lawn) / HOUSE_RUN);
  const faces = [[[1, 0, 0], [0, 1, 0]], [[-1, 0, 0], [0, 1, 0]], [[0, 1, 0], [0, 0, -1]], [[0, -1, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, 1, 0]]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const depth = new Float32Array(R * R);
  const NEAR = 0.04;   // the renderer's near plane, m (deskCamera.js DEPTH)
  // (Only surfaces this large hide anything: leaves, rails and small parts
  // never do, so whatever shows through their gaps is kept at any resolution.)
  const OCCLUDER_M2 = 0.25;
  const occluder = new Uint8Array((count - lawn) / 3);
  for (let v = lawn, t = 0; v < count; v += 3, t++) {
    const o = v * 9;
    const e1 = [data[o + 9] - data[o], data[o + 10] - data[o + 1], data[o + 11] - data[o + 2]];
    const e2 = [data[o + 18] - data[o], data[o + 19] - data[o + 1], data[o + 20] - data[o + 2]];
    const n = cross(e1, e2);
    occluder[t] = Math.hypot(n[0], n[1], n[2]) / 2 >= OCCLUDER_M2 ? 1 : 0;
  }
  const toTexel = q => [(q[0] / q[2] * 0.5 + 0.5) * R, (q[1] / q[2] * 0.5 + 0.5) * R, q[2]];
  // The occluders: an ordinary depth raster (texel centres, their depth).
  const fill = (a, b, c) => {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-9) return;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const x1 = Math.min(R - 1, Math.floor(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const y1 = Math.min(R - 1, Math.floor(Math.max(a[1], b[1], c[1])));
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const sx = px + 0.5, sy = py + 0.5;
      const w0 = ((b[0] - sx) * (c[1] - sy) - (b[1] - sy) * (c[0] - sx)) / area;
      const w1 = ((c[0] - sx) * (a[1] - sy) - (c[1] - sy) * (a[0] - sx)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = 1 / (w0 / a[2] + w1 / b[2] + w2 / c[2]);
      const t = py * R + px;
      if (z < depth[t]) depth[t] = z;
    }
  };
  // Every triangle, conservatively: seen if any texel within half a
  // diagonal of it isn't covered nearer than its own nearest point.
  const test = (a, b, c) => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])) - 1);
    const x1 = Math.min(R - 1, Math.floor(Math.max(a[0], b[0], c[0])) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])) - 1);
    const y1 = Math.min(R - 1, Math.floor(Math.max(a[1], b[1], c[1])) + 1);
    if (x0 > x1 || y0 > y1) return false;
    const zlo = Math.min(a[2], b[2], c[2]) - 0.02;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const flat = Math.abs(area) < 1e-9;
    const l0 = flat ? 0 : Math.hypot(c[0] - b[0], c[1] - b[1]) * 0.71 / Math.abs(area);
    const l1 = flat ? 0 : Math.hypot(a[0] - c[0], a[1] - c[1]) * 0.71 / Math.abs(area);
    const l2 = flat ? 0 : Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.71 / Math.abs(area);
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const t = py * R + px;
      if (zlo >= depth[t]) continue;
      if (flat) return true;
      const sx = px + 0.5, sy = py + 0.5;
      const w0 = ((b[0] - sx) * (c[1] - sy) - (b[1] - sy) * (c[0] - sx)) / area;
      const w1 = ((c[0] - sx) * (a[1] - sy) - (c[1] - sy) * (a[0] - sx)) / area;
      if (w0 >= -l0 && w1 >= -l1 && 1 - w0 - w1 >= -l2) return true;
    }
    return false;
  };
  // A triangle in the face's axes (right, up, ahead), clipped to the near
  // plane, as projected triangles; null when it's wholly behind.
  const clipped = (v, f, u, r) => {
    const q = [];
    let behind = 0;
    for (let k = 0; k < 3; k++) {
      const o = (v + k) * 9;
      const x = data[o] - eye[0], y = data[o + 1] - eye[1], z = data[o + 2] - eye[2];
      const p = [x * r[0] + y * r[1] + z * r[2], x * u[0] + y * u[1] + z * u[2], x * f[0] + y * f[1] + z * f[2]];
      if (p[2] < NEAR) behind++;
      q.push(p);
    }
    if (behind === 3) return null;
    if (!behind) return [q.map(toTexel)];
    const poly = [];
    for (let k = 0; k < 3; k++) {
      const A = q[k], B = q[(k + 1) % 3];
      if (A[2] >= NEAR) poly.push(A);
      if ((A[2] >= NEAR) !== (B[2] >= NEAR)) {
        const t = (NEAR - A[2]) / (B[2] - A[2]);
        poly.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, NEAR]);
      }
    }
    const T = poly.map(toTexel);
    const tris = [];
    for (let k = 1; k + 1 < T.length; k++) tris.push([T[0], T[k], T[k + 1]]);
    return tris;
  };
  let eye = null;
  for (const job of jobs) {
    const { device, i } = job;
    eye = job.eye;
    const vis = new Uint8Array(nRuns);
    for (const [f, u] of faces) {
      const r = cross(f, u);
      depth.fill(Infinity);
      for (let v = lawn, t = 0; v < count; v += 3, t++) {
        if (!occluder[t]) continue;
        for (const [a, b, c] of clipped(v, f, u, r) ?? []) fill(a, b, c);
      }
      for (let v = lawn; v < count; v += 3) {
        const id = ((v - lawn) / HOUSE_RUN) | 0;
        if (vis[id]) continue;
        for (const [a, b, c] of clipped(v, f, u, r) ?? []) if (test(a, b, c)) { vis[id] = 1; break; }
      }
    }
    parentPort.postMessage({ device, i, vis });
  }
  parentPort.close();
} else {
  const res = Number(process.argv[process.argv.indexOf('--res') + 1]) || 1024;
  const { runs } = build();
  const nRuns = runs.first.length;
  const jobs = [];
  for (const device of DEVICES) for (let i = 0; i <= STEPS; i++) {
    const cm = cameraMetres(contactCameraAt(i / STEPS, moonlit, { device }));
    jobs.push({ device, i, eye: [cm.x, cm.y, cm.z] });
  }
  const n = Math.max(1, cpus().length - 1);
  const seen = Object.fromEntries(DEVICES.map(d => [d, Array.from({ length: STEPS + 1 }, () => null)]));
  const t0 = Date.now();
  let done = 0;
  await Promise.all(Array.from({ length: n }, (_, k) => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { res, jobs: jobs.filter((_, j) => j % n === k) }, execArgv: process.execArgv });
    w.on('message', ({ device, i, vis }) => {
      seen[device][i] = vis;
      if (++done % 80 === 0) console.log(`house-pvs: ${done}/${jobs.length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    });
    w.on('error', reject);
    w.on('exit', resolve);
  })));
  // Per device and run, the samples it's seen at as [from, to] ranges, widened.
  const out = {};
  for (const device of DEVICES) {
    out[device] = [];
    let total = 0;
    for (let r = 0; r < nRuns; r++) {
      const ranges = [];
      for (let i = 0; i <= STEPS; i++) {
        if (!seen[device][i][r]) continue;
        const a = Math.max(0, i - PAD), b = Math.min(STEPS, i + PAD);
        const last = ranges[ranges.length - 1];
        if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
        else ranges.push([a, b]);
      }
      for (const [a, b] of ranges) total += b - a + 1;
      out[device].push(ranges.flat());
    }
    console.log(`house-pvs: ${device}: on average ${(total / (STEPS + 1)).toFixed(0)} of ${nRuns} runs kept`);
  }
  const file = fileURLToPath(new URL('../components/gradient/gl/housePvs.js', import.meta.url));
  writeFileSync(file, `// Generated by scripts/house-pvs.mjs (0.4.44): do not edit. Rerun when the
// house's mesh changes; the checksum turns it off on a mismatch.
export const HOUSE_PVS = ${JSON.stringify({ steps: STEPS, runs: nRuns, checksum: runsChecksum(runs), res, ...out })};
`);
  console.log(`house-pvs: wrote ${file.split('/').slice(-4).join('/')} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
