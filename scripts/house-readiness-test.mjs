import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getHouseHold,
  getHouseReadiness,
  setHouseReadiness,
  subscribeHouseReadiness,
} from '../components/scroll/houseReadiness.js';

// Deliberately different starts and spans: the two milestones belong to
// different tracks, rather than sharing a global progress denominator.
const tracks = [
  { name: 'about', start: 0, span: 1000 },
  { name: 'desk', start: 1000, span: 4000 },
  { name: 'contact', start: 5000, span: 3000 },
];

test('house preparation advances from overhead geometry hold to laptop GPU hold', () => {
  assert.equal(getHouseHold(tracks, 'loading', 7000), 3000);
  // The overhead shot releases as soon as the mesh exists, even while GPU
  // work continues; the next boundary is the laptop at contact .02.
  assert.equal(getHouseHold(tracks, 'mesh-ready', 3001), null);
  assert.equal(getHouseHold(tracks, 'mesh-ready', 7000), 5060);
  for (const status of ['idle', 'ready', 'failed']) {
    assert.equal(getHouseHold(tracks, status, 7000), null, status);
  }
});

test('house holds permit backscroll and never capture pinned or trackless routes', () => {
  for (const [status, boundary] of [['loading', 3000], ['mesh-ready', 5060]]) {
    assert.equal(getHouseHold(tracks, status, boundary), null);
    assert.equal(getHouseHold(tracks, status, boundary - 1), null);
    assert.equal(getHouseHold(tracks, status, 0), null);
    assert.equal(getHouseHold(tracks, status, boundary + 1, true), null);
    assert.equal(getHouseHold([], status, boundary + 1), null);
    assert.equal(getHouseHold([tracks[0]], status, boundary + 1), null);
  }
});

test('readiness listeners observe actual milestones once and can unsubscribe', () => {
  setHouseReadiness('idle');
  const observed = [];
  const off = subscribeHouseReadiness(status => observed.push({
    status,
    // Subscribers see the new state synchronously, so a scroll event in
    // the same frame uses the newly released or advanced boundary.
    current: getHouseReadiness(),
    hold: getHouseHold(tracks, getHouseReadiness(), 7000),
  }));
  try {
    setHouseReadiness('loading');
    setHouseReadiness('loading');
    setHouseReadiness('mesh-ready');
    setHouseReadiness('unknown');
    setHouseReadiness('ready');
    setHouseReadiness('loading');
    setHouseReadiness('failed');
    assert.deepEqual(observed, [
      { status: 'loading', current: 'loading', hold: 3000 },
      { status: 'mesh-ready', current: 'mesh-ready', hold: 5060 },
      { status: 'ready', current: 'ready', hold: null },
      { status: 'loading', current: 'loading', hold: 3000 },
      { status: 'failed', current: 'failed', hold: null },
    ]);
    off();
    setHouseReadiness('idle');
    assert.equal(observed.length, 5);
  } finally {
    off();
    setHouseReadiness('idle');
  }
});
