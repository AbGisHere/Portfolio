// Tests for the GL renderer's adaptive quality (components/gradient/gl/
// adaptiveQuality.js), fed synthetic frame intervals, so the decisions are
// checked without a GPU: `node --test scripts/adaptive-test.mjs`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adaptiveQuality } from '../components/gradient/gl/adaptiveQuality.js';

const HZ120 = 1000 / 120;

/** A controller, a clock and helpers to play frames into it. */
function rig() {
  const changes = [];
  const q = adaptiveQuality(level => changes.push(level));
  let now = 0;
  const frame = (gap, busy) => {
    now += gap;
    q.sample(gap, busy, now);
  };
  return {
    q,
    changes,
    /** `ms` of frames at rest at the display's pace. */
    rest(ms, gap = HZ120) {
      for (let t = 0; t < ms; t += gap) frame(gap, false);
    },
    /** `ms` of busy frames; `late(i)` says whether frame i missed a vsync. */
    busy(ms, late = () => false, gap = HZ120) {
      for (let i = 0, t = 0; t < ms; i++) {
        const g = late(i) ? 2 * gap : gap;
        t += g;
        frame(g, true);
      }
    },
  };
}

test('holds full quality through a smooth scroll', () => {
  const r = rig();
  r.rest(3000);
  r.busy(20000);
  assert.deepEqual(r.changes, []);
});

test('ignores bursts of missed frames (a fifth of them, bunched)', () => {
  const r = rig();
  r.rest(3000);
  // 30 late frames in every 150: the headless pattern that stepped down
  // with the earlier p75/p90 rules.
  r.busy(30000, i => i % 150 < 30);
  assert.deepEqual(r.changes, []);
});

test('ignores the first scroll after a load, however slow', () => {
  const r = rig();
  r.rest(2500);
  r.busy(400, () => true); // one-off costs: ~24 slow frames
  r.busy(10000);
  assert.deepEqual(r.changes, []);
});

test('steps down when the GPU runs at half the refresh', () => {
  const r = rig();
  r.rest(3000);
  r.busy(3000, () => true);
  assert.equal(r.q.level, 1);
});

test('steps down to the last level and no further', () => {
  const r = rig();
  r.rest(3000);
  r.busy(20000, () => true);
  assert.equal(r.q.level, 2);
  assert.deepEqual(r.changes, [1, 2]);
});

test('steps back up after 5 s of smooth frames', () => {
  const r = rig();
  r.rest(3000);
  r.busy(3000, () => true);
  assert.equal(r.q.level, 1);
  r.busy(7000);
  assert.equal(r.q.level, 0);
});

test('locks out a level that fails right after being tried', () => {
  const r = rig();
  r.rest(3000);
  r.busy(3000, () => true); // down to 1
  r.busy(6000); // smooth: tries 0
  assert.equal(r.q.level, 0);
  r.busy(2000, () => true); // 0 fails at once: back to 1, 0 locked
  assert.equal(r.q.level, 1);
  r.busy(20000);
  assert.equal(r.q.level, 1);
  // A resize lets it try again.
  r.q.reset();
  r.busy(7000);
  assert.equal(r.q.level, 0);
});

test('reads a 60 Hz display from its frames at rest', () => {
  const r = rig();
  r.rest(3000, 1000 / 60);
  r.busy(20000, () => false, 1000 / 60);
  assert.deepEqual(r.changes, []);
  // Half of 60 Hz is 30 fps: two windows of 60 frames take 4 s.
  r.busy(4500, () => true, 1000 / 60);
  assert.equal(r.q.level, 1);
});

test('does nothing before it knows the refresh', () => {
  const r = rig();
  r.busy(20000, () => true);
  assert.deepEqual(r.changes, []);
});
