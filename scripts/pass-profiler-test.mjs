import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPassProfiler } from '../components/gradient/gl/passProfiler.js';

function fixture(enabled = true) {
  let available = false, disjoint = false, reads = 0, deleted = 0;
  const gl = {
    QUERY_RESULT_AVAILABLE: 1, QUERY_RESULT: 2,
    getExtension: () => enabled ? { TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 } : null,
    createQuery: () => ({}), beginQuery() {}, endQuery() {},
    deleteQuery: () => deleted++, getParameter: () => disjoint,
    getQueryParameter(q, key) {
      if (key === 1) return available;
      assert.ok(available, 'never read an unavailable GPU result');
      reads++; return 2500000;
    },
  };
  let clock = 0;
  return { profiler: createPassProfiler(gl, { maxPending: 1, sampleEvery: 1, capacity: 8, now: () => ++clock }),
    ready: () => { available = true; }, disjoint: () => { disjoint = true; },
    counts: () => ({ reads, deleted }) };
}
test('pass profiler polls asynchronously and bounds outstanding GPU work', () => {
  const f = fixture(), p = f.profiler;
  p.frame({ poolSeen: false });
  assert.equal(p.measure('house', () => 7), 7);
  p.frame({ poolSeen: true });
  p.measure('water', () => {});
  assert.deepEqual(f.counts(), { reads: 0, deleted: 0 });
  assert.equal(p.snapshot().dropped, 1);
  f.ready(); p.frame({});
  assert.equal(p.snapshot().samples.find(s => s.name === 'house').gpuMs, 2.5);
  assert.deepEqual(f.counts(), { reads: 1, deleted: 1 });
});
test('disjoint GPU results are discarded and outstanding queries disposed', () => {
  const f = fixture(), p = f.profiler;
  p.measure('house', () => {}); f.disjoint(); p.frame({});
  assert.equal(p.snapshot().discarded, 1);
  assert.deepEqual(f.counts(), { reads: 0, deleted: 1 });
  p.measure('water', () => {}); p.dispose();
  assert.equal(f.counts().deleted, 2);
});
test('CPU-only profiling preserves thrown errors and bounded history', () => {
  const { profiler: p } = fixture(false);
  assert.throws(() => p.measure('failed', () => { throw new Error('original'); }), /original/);
  assert.equal(p.snapshot().samples[0].cpuMs, 1);
  for (let i = 0; i < 20; i++) p.frame({});
  assert.equal(p.snapshot().samples.length, 8);
  assert.equal(p.snapshot().gpuAvailable, false);
});
