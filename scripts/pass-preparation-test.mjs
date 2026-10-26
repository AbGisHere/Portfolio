import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countInFlight, createPreparationQueue, disposePassProgram, pollPassProgram, startPassProgram } from '../components/gradient/gl/passPreparation.js';

const driver = () => {
  const calls = [];
  let complete = false;
  let linked = true;
  let shaders = 0;
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, LINK_STATUS: 3,
    createProgram: () => ({}), createShader: () => ({ id: ++shaders }),
    shaderSource() {}, compileShader() {}, attachShader() {}, bindAttribLocation() {}, linkProgram() {},
    getProgramParameter(_p, key) { calls.push(key); return key === 4 ? complete : linked; },
    getProgramInfoLog: () => 'link failed', getShaderInfoLog: s => `shader ${s.id} failed`,
    detachShader(_p, s) { calls.push(['detach', s]); },
    deleteShader(s) { calls.push(['shader', s]); }, deleteProgram(p) { calls.push(['program', p]); },
  };
  return { gl, calls, ext: { COMPLETION_STATUS_KHR: 4 }, complete: () => { complete = true; }, fail: () => { linked = false; } };
};

test('idle polling does not query link status while compilation is pending', () => {
  const d = driver();
  const h = startPassProgram(d.gl, 'test', 'vertex', 'fragment');
  assert.equal(pollPassProgram(d.gl, d.ext, h), null);
  assert.deepEqual(d.calls, [4]);
  d.complete();
  assert.equal(pollPassProgram(d.gl, d.ext, h), h.prog);
  assert.equal(h.ready, true);
  assert.equal(h.vs, null);
  assert.equal(h.fs, null);
});

test('a required pass checks linking even when the idle completion poll is pending', () => {
  const d = driver();
  const h = startPassProgram(d.gl, 'required', 'vertex', 'fragment');
  assert.equal(pollPassProgram(d.gl, d.ext, h, true), h.prog);
  assert.equal(h.ready, true);
  assert.equal(d.calls.includes(4), false);
  assert.equal(d.calls.includes(d.gl.LINK_STATUS), true);
});

test('without the extension the original link-status path remains available', () => {
  const d = driver();
  const h = startPassProgram(d.gl, 'test', 'vertex', 'fragment');
  assert.equal(pollPassProgram(d.gl, null, h), h.prog);
});

test('failed links retain diagnostic logs and release their entire allocation', t => {
  const logs = [];
  t.mock.method(console, 'warn', (...args) => logs.push(args.join(' ')));
  const d = driver();
  const h = startPassProgram(d.gl, 'failed', 'vertex', 'fragment');
  d.fail(); d.complete();
  assert.equal(pollPassProgram(d.gl, d.ext, h), null);
  assert.equal(h.failed, true);
  assert.equal(h.disposed, true);
  assert.match(logs[0], /shader 1 failed.*shader 2 failed/);
  assert.equal(d.calls.filter(x => Array.isArray(x) && x[0] === 'shader').length, 2);
  assert.equal(d.calls.filter(x => Array.isArray(x) && x[0] === 'program').length, 1);
  const count = d.calls.length;
  assert.equal(pollPassProgram(d.gl, d.ext, h, true), null);
  disposePassProgram(d.gl, h);
  assert.equal(d.calls.length, count);
});

test('unadopted pending programs are disposed exactly once', () => {
  const d = driver();
  const h = startPassProgram(d.gl, 'pending', 'vertex', 'fragment');
  disposePassProgram(d.gl, h); disposePassProgram(d.gl, h);
  assert.equal(d.calls.filter(x => Array.isArray(x) && x[0] === 'shader').length, 2);
  assert.equal(d.calls.filter(x => Array.isArray(x) && x[0] === 'program').length, 1);
});

test('partial allocation failure releases previously allocated objects', t => {
  t.mock.method(console, 'warn', () => {});
  const d = driver();
  d.gl.createShader = () => null;
  const h = startPassProgram(d.gl, 'allocation', 'vertex', 'fragment');
  assert.equal(h.failed, true);
  assert.equal(d.calls.filter(x => Array.isArray(x) && x[0] === 'program').length, 1);
});

const queueHarness = () => {
  let seq = 0;
  const callbacks = new Map();
  const events = [];
  let runnable = true;
  const q = createPreparationQueue({
    schedule: cb => { callbacks.set(++seq, cb); return seq; },
    cancel: id => callbacks.delete(id),
    backoff: cb => cb(),
    clearBackoff: () => {},
    restore: () => events.push('restore'),
    onReady: () => events.push('ready'),
    canRun: () => runnable,
  });
  return {
    q, callbacks, events,
    pause: () => { runnable = false; },
    resume: () => { runnable = true; q.resume(); },
    tick(deadline) {
      if (!callbacks.size) return;
      const [id, cb] = callbacks.entries().next().value;
      callbacks.delete(id);
      cb(deadline);
    }
  };
};

test('pending tasks retry fairly; disabled and failed tasks settle without a wake loop', () => {
  const h = queueHarness();
  let ready = false;
  let attempts = 0;
  h.q.add([() => { attempts++; return ready ? 'done' : 'pending'; }, () => 'disabled', () => 'failed']);
  h.tick(); h.tick(); h.tick();
  assert.equal(attempts, 1);
  assert.equal(h.events.includes('ready'), false);
  ready = true; h.tick();
  assert.equal(attempts, 2);
  assert.equal(h.events.filter(x => x === 'ready').length, 1);
  assert.equal(h.callbacks.size, 0);
});

test('preparation wakes a stationary renderer when a late dependency becomes ready', () => {
  const h = queueHarness();
  let ready = false;
  h.q.add([() => ready ? 'done' : 'pending']);
  h.tick(); ready = true; h.tick();
  assert.deepEqual(h.events, ['restore', 'restore', 'ready']);
});

test('short idle deadlines yield, while timed-out callbacks still make progress', () => {
  const h = queueHarness();
  let attempts = 0;
  h.q.add([() => { attempts++; return 'done'; }]);
  h.tick({ didTimeout: false, timeRemaining: () => 0 });
  assert.equal(attempts, 0);
  h.tick({ didTimeout: true, timeRemaining: () => 0 });
  assert.equal(attempts, 1);
});

test('hidden preparation pauses without spinning and resumes on visibility', () => {
  const h = queueHarness();
  h.q.add([() => 'done']); h.pause(); h.tick();
  assert.equal(h.callbacks.size, 0);
  assert.deepEqual(h.events, []);
  h.resume(); h.tick();
  assert.deepEqual(h.events, ['restore', 'ready']);
});

test('disposal cancels queued callbacks and prevents new work', () => {
  const h = queueHarness();
  h.q.add([() => 'pending']); h.tick(); h.q.dispose();
  h.q.add([() => 'done']); h.q.resume();
  assert.equal(h.callbacks.size, 0);
});

test('a throwing task logs a warning and allows subsequent tasks to proceed', t => {
  const logs = [];
  t.mock.method(console, 'warn', (...args) => logs.push(args.join(' ')));
  const h = queueHarness();
  let nextRan = false;
  h.q.add([
    () => { throw new Error('simulated task crash'); },
    () => { nextRan = true; return 'done'; },
  ]);
  h.tick();
  assert.equal(logs.length, 1);
  assert.match(logs[0], /simulated task crash/);
  h.tick();
  assert.equal(nextRan, true);
  assert.deepEqual(h.events, ['restore', 'restore', 'ready']);
});

test('in-flight compile tracking polls pending handles and frees completed slots', () => {
  const d = driver();
  const handles = new Set();
  const h1 = startPassProgram(d.gl, 'p1', 'vs', 'fs');
  const h2 = startPassProgram(d.gl, 'p2', 'vs', 'fs');
  handles.add(h1);
  handles.add(h2);

  assert.equal(countInFlight(d.gl, d.ext, handles), 2);
  assert.equal(h1.ready, false);
  assert.equal(h2.ready, false);

  d.complete();

  assert.equal(countInFlight(d.gl, d.ext, handles), 0);
  assert.equal(h1.ready, true);
  assert.equal(h2.ready, true);
});

test('addFirst prepends priority tasks to the head of the queue', () => {
  const h = queueHarness();
  const order = [];
  h.q.add([() => { order.push('desk'); return 'done'; }]);
  h.q.addFirst([() => { order.push('house'); return 'done'; }]);
  h.tick();
  h.tick();
  assert.deepEqual(order, ['house', 'desk']);
});
