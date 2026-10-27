import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGpuCompletion } from '../components/gradient/gl/gpuCompletion.js';

function mock() {
  let status = 1, lost = false, created = 0, deleted = 0, flushed = 0;
  const gl = { SYNC_GPU_COMMANDS_COMPLETE: 0, TIMEOUT_EXPIRED: 1, ALREADY_SIGNALED: 2, CONDITION_SATISFIED: 3,
    isContextLost: () => lost,
    fenceSync: () => { created++; return {}; },
    flush: () => flushed++, deleteSync: () => deleted++,
    clientWaitSync(fence, flags, timeout) { assert.equal(flags, 0); assert.equal(timeout, 0); return status; },
  };
  return { gate: createGpuCompletion(gl), status: x => { status = x; }, lose: () => { lost = true; }, counts: () => ({ created, deleted, flushed }) };
}
test('GPU completion stays pending until signalled without a blocking timeout', () => {
  const m = mock();
  assert.equal(m.gate.poll('size-a'), 'pending');
  assert.equal(m.gate.poll('size-a'), 'pending');
  m.status(3);
  assert.equal(m.gate.poll('size-a'), 'ready');
  assert.equal(m.gate.poll('size-a'), 'ready');
  assert.deepEqual(m.counts(), { created: 1, deleted: 1, flushed: 1 });
});
test('resizing replaces an outstanding fence and context loss releases it', () => {
  const m = mock();
  m.gate.poll('a'); m.gate.poll('b');
  assert.deepEqual(m.counts(), { created: 2, deleted: 1, flushed: 2 });
  m.lose();
  assert.equal(m.gate.poll('b'), 'failed');
  assert.equal(m.counts().deleted, 2);
});
test('failed fence waits release resources instead of holding forever', () => {
  const m = mock(); m.gate.poll('a'); m.status(4);
  assert.equal(m.gate.poll('a'), 'failed');
  assert.equal(m.gate.poll('a'), 'failed');
  assert.equal(m.counts().deleted, 1);
  m.gate.reset();
  assert.equal(m.gate.poll('a'), 'pending');
});
