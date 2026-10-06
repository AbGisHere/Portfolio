// Tests for the scene's pure maths, run without a browser or a GPU:
// the colour module (components/gradient/colour.js), the switch palette
// (skyKeys.js paletteAt), one frame of the scene (scene.js sceneAt) and the
// 0.3 camera (deskCamera.js).
//   node --import ./scripts/lib/resolve-js.mjs --test scripts/unit-test.mjs
// (`npm run test:unit`; the hook resolves the components' extensionless
// imports as the bundler does.)
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fromOklab, hexToLms, hexToRgb, lmsToHex, mix, oklab, rgbToHex } from '../components/gradient/colour.js';
import { paletteAt } from '../components/gradient/skyKeys.js';
import { sceneAt } from '../components/gradient/scene.js';
import { descentAt, scrollPalette } from '../components/gradient/camera.js';
import { airOpacity, layout, mistOf, ridgePaint, sunColour } from '../components/gradient/gl/mistGeometry.js';
import { beginOrbit, orbitScene, targetGeo } from '../components/gradient/orbit.js';
import { DISC_WHITE, SET_COLOUR, SUNSET_COLOUR } from '../components/gradient/sunLook.js';
import { deskCameraAt, deskHolds, grassOf, groundAt, pitchOf, toScreen, toVirtual } from '../components/gradient/deskCamera.js';
import { LIFE, STRIDE, createWalker } from '../components/gradient/gl/footsteps.js';
import { BOOT_FLOATS, bootOf, seeded } from '../components/gradient/gl/bootPrint.js';
import { MEADOW_SIZE, meadowTexels } from '../components/gradient/gl/meadowTexture.js';
import { TREE_STRIDE, treeLayout } from '../components/gradient/gl/treeShader.js';
import { DESK_STRIDE, deskLayout } from '../components/gradient/gl/deskShader.js';
import { DESK_BOX } from '../components/gradient/deskCamera.js';
import { PROGRAMS } from './lib/programs.mjs';
import { LAMP, LAMP_POSE, lampAt, lampClear, lampHitOn, makeFlicker, poseFree, poseToward, screenToWorld } from '../components/gradient/gl/lampShape.js';
import { LAMP_STRIDE, lampMesh } from '../components/gradient/gl/lampShader.js';
import duskEmber from '../components/gradient/recipes/dusk-ember.js';
import moonlit from '../components/gradient/recipes/moonlit.js';

const RECIPES = [duskEmber, moonlit];

/** Every colour the recipes name: stops, switch and scroll keyframes, meadow. */
const recipeColours = () =>
  RECIPES.flatMap(r => [
    ...r.stops,
    ...(r.transition?.via ?? []).flatMap(k => k.stops),
    ...(r.scroll?.keys ?? []).flatMap(k => k.stops),
    ...(r.scroll?.meadow ? [r.scroll.meadow] : []),
  ]).concat([DISC_WHITE, SET_COLOUR, SUNSET_COLOUR]);

/** A repeatable sample of hex colours: every grey, then a seeded spread. */
function sampleColours(n = 20000) {
  const out = [];
  for (let v = 0; v < 256; v++) out.push(rgbToHex([v, v, v]));
  let s = 1;
  const next = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < n; i++) out.push(rgbToHex([next() * 255, next() * 255, next() * 255]));
  return out;
}

const hexRe = /^#[0-9a-f]{6}$/;

// ---------------------------------------------------------------- colour

test('recipe colours are 6-digit hex', () => {
  for (const c of recipeColours()) assert.match(c.toLowerCase(), hexRe, c);
});

test('hex → rgb → hex is exact', () => {
  for (const c of [...recipeColours(), ...sampleColours()]) assert.equal(rgbToHex(hexToRgb(c)), c.toLowerCase());
});

test('hex → oklab LMS → hex is exact (recipe colours and a sample)', () => {
  for (const c of [...recipeColours(), ...sampleColours()]) assert.equal(lmsToHex(hexToLms(c)), c.toLowerCase(), c);
});

test('hex → oklab → hex is exact, so mix() lands on its ends', () => {
  for (const c of [...recipeColours(), ...sampleColours(5000)]) {
    assert.equal(rgbToHex(fromOklab(...oklab(c))), c.toLowerCase(), c);
  }
  const cs = recipeColours();
  for (let i = 1; i < cs.length; i++) {
    assert.equal(mix(cs[i - 1], cs[i], 0), cs[i - 1].toLowerCase());
    assert.equal(mix(cs[i - 1], cs[i], 1), cs[i].toLowerCase());
  }
});

test('rgbToHex rounds and clamps', () => {
  assert.equal(rgbToHex([-3, 255.4, 300]), '#00ffff');
  assert.equal(rgbToHex([0.5, 1.49, 127.5]), '#010180');
});

// ---------------------------------------------------------------- paletteAt

/** Every keyframe list the scene runs: each switch (start, `via`, target)
 * and each descent (resting palette, then `scroll.keys`). */
const keyLists = () =>
  RECIPES.flatMap(next => {
    const prev = RECIPES.find(r => r !== next);
    return [
      [{ at: 0, stops: prev.stops }, ...(next.transition?.via ?? []), { at: 1, stops: next.stops }],
      [{ at: 0, stops: next.stops }, ...(next.scroll?.keys ?? [])],
    ];
  });

test('paletteAt hits every keyframe exactly', () => {
  for (const keys of keyLists()) {
    for (const k of keys) {
      assert.deepEqual(
        paletteAt(keys, k.at),
        k.stops.map(c => c.toLowerCase()),
        `at ${k.at}`,
      );
    }
  }
});

test('paletteAt never overshoots its neighbouring keyframes', () => {
  // Monotone per LMS channel between neighbouring keys; 8-bit rounding of the
  // result moves a channel by at most ~.004 (steepest in the darks).
  const TOL = 0.005;
  for (const keys of keyLists()) {
    for (let i = 0; i < keys.length - 1; i++) {
      for (let j = 1; j < 50; j++) {
        const e = keys[i].at + ((keys[i + 1].at - keys[i].at) * j) / 50;
        paletteAt(keys, e).forEach((c, s) => {
          const got = hexToLms(c);
          const a = hexToLms(keys[i].stops[s]);
          const b = hexToLms(keys[i + 1].stops[s]);
          for (let k = 0; k < 3; k++) {
            const lo = Math.min(a[k], b[k]) - TOL;
            const hi = Math.max(a[k], b[k]) + TOL;
            assert.ok(got[k] >= lo && got[k] <= hi, `key ${i} e ${e.toFixed(3)} stop ${s} ch ${k}: ${got[k]} ∉ [${lo}, ${hi}]`);
          }
        });
      }
    }
  }
});

// ---------------------------------------------------------------- sceneAt

const W = 1440;
const H = 900;

/** One frame the way the layered renderer asks for it (its own layout). */
function frame(recipe, { about = 0, desk = 0, orbit = null, e = 1, w = W, h = H, reduced = false } = {}) {
  const geo = orbit ? orbitScene(orbit, e).geo : targetGeo(recipe);
  const base = orbit ? orbitScene(orbit, e).stops : recipe.stops;
  const [size, horizon, haze, height, sharp, sun, seed] = geo;
  const mist = { ...mistOf(recipe.mist), haze, height, sharp, sun, seed };
  const layoutAt = ranges => layout(w, h, { size, horizon, mist, aspect: recipe.aspect, crests: false, ranges });
  return {
    base,
    haze,
    layoutAt,
    f: sceneAt({ recipe, orbit, e, base, haze, about, desk, reduced, w, h, layoutAt, restCol: sunColour(base) }),
  };
}

/** A switch into `next` from the other scene, at progress e. */
const switchInto = (next, e) => {
  const prev = RECIPES.find(r => r !== next);
  return { ...beginOrbit(prev, next, targetGeo(prev), prev.stops), e };
};

test('sceneAt at about 0 is the resting scene', () => {
  for (const r of RECIPES) {
    const { f, base, haze, layoutAt } = frame(r);
    const rest = layoutAt(null);
    assert.equal(f.view.rest, true);
    assert.equal(f.stops, base, 'the palette is the resting one');
    assert.equal(f.haze, haze);
    assert.deepEqual(f.layout, rest, 'no world ranges');
    assert.equal(f.lit.length, 1);
    assert.equal(f.lit[0].x, rest.sun.x);
    assert.equal(f.lit[0].y, rest.sun.y);
    assert.equal(f.lit[0].col, sunColour(base));
    assert.equal(f.painted, f.lit[0]);
    assert.deepEqual(f.paints, ridgePaint(base, rest.ridges, haze, H));
    assert.deepEqual(f.sky, { scale: 1, shift: 0 });
    assert.equal(f.air, airOpacity(haze));
    assert.equal(f.ground, null, 'no meadow at rest');
  }
});

test('sceneAt at about 1: the evening, the extra ranges, the set body, the meadow', () => {
  for (const r of RECIPES) {
    const rest = frame(r).f;
    const { f } = frame(r, { about: 1 });
    assert.equal(f.view.rest, false);
    assert.equal(f.view.k, 1);
    assert.deepEqual(f.stops, r.scroll.keys.at(-1).stops.map(c => c.toLowerCase()), 'the last scroll key');
    assert.equal(f.haze, r.scroll.haze ?? targetGeo(r)[2]);
    assert.equal(f.layout.ridges.length, rest.layout.ridges.length + descentAt(1, r).ranges.length);
    assert.equal(f.paints.length, f.layout.ridges.length);
    // The body has set: its centre `set` radii under the horizon, and left
    // by dx.
    assert.ok(Math.abs(f.lit[0].y - (f.view.horizon + r.scroll.body.set * f.lit[0].r)) < 1e-9, 'the body sets');
    assert.ok(Math.abs(f.lit[0].x - (rest.lit[0].x + r.scroll.body.dx * H)) < 1e-9, 'it leans left by dx');
    assert.ok(f.sky.scale !== 1 && f.sky.shift > 0, 'the sky is redrawn under the camera');
    assert.ok(f.air < airOpacity(f.haze), 'the air thins');
    // The front ridge runs to the frame's foot: no strip of meadow under it
    // (the meadow opens as the 0.3 camera comes down).
    assert.ok(f.view.front >= H, 'the front ridge reaches the frame');
    assert.equal(f.ground, null, 'no meadow strip');
    assert.ok(f.light.st > 0, 'the setting light is on');
  }
});

test('sceneAt reduced motion moves the camera less, the colour in full', () => {
  const { f } = frame(duskEmber, { about: 1, reduced: true });
  assert.ok(f.view.k < 1);
  assert.deepEqual(f.stops, scrollPalette(duskEmber.stops, duskEmber, 1));
});

test('sceneAt mid-switch: two bodies, amounts blended on e', () => {
  for (const next of RECIPES) {
    const prev = RECIPES.find(r => r !== next);
    for (const about of [0, 0.5, 1]) {
      const at = e => frame(next, { about, orbit: switchInto(next, e), e }).f;
      const [f0, fh, f1] = [at(0), at(0.5), at(1)];
      for (const f of [f0, fh, f1]) assert.equal(f.lit.length, 2, 'outgoing and incoming');
      // The camera: the outgoing scene's amounts at e 0, the incoming's at 1.
      assert.deepEqual(f0.cam, descentAt(about, prev));
      assert.deepEqual(f1.cam, descentAt(about, next));
      // The haze and meadow blend on e the same way.
      if (about > 0) {
        const hz = e => (at(e).view.rest ? null : at(e).haze);
        assert.ok(Math.abs(hz(0.5) - (hz(0) + hz(1)) / 2) < 1e-9, 'haze midway at e .5');
      }
      // The ridge light hands over: off at e .5, where neither body lights.
      assert.equal(fh.light.st, 0);
      // The hit target is where the incoming body lands, whatever e.
      assert.deepEqual(f0.painted, fh.painted);
    }
  }
});

test('sceneAt with a switch not yet turning keeps the resting bodies', () => {
  // GL's first switch frame: an orbit with no scene yet.
  const orbit = switchInto(moonlit, 0);
  const layoutAt = ranges => layout(W, H, { ...geoArgs(moonlit), ranges });
  const f = sceneAt({
    recipe: moonlit,
    orbit,
    e: 0,
    turning: false,
    base: moonlit.stops,
    haze: targetGeo(moonlit)[2],
    about: 0.5,
    w: W,
    h: H,
    layoutAt,
    restCol: sunColour(moonlit.stops),
  });
  assert.equal(f.lit.length, 1);
  assert.deepEqual(f.stops, scrollPalette(moonlit.stops, moonlit, 0.5));
});

test('the 0.3 camera starts exactly where the pull-back ends', () => {
  for (const r of RECIPES) {
    const end = frame(r, { about: 1 }).f;
    const join = frame(r, { about: 1, desk: 1e-9 }).f;
    // (Up to float rounding: the 0.3 camera's back is rebuilt from metres.)
    const near = (a, b, path) => {
      if (typeof a === 'number') return assert.ok(Math.abs(a - b) < 1e-9, `${path}: ${a} vs ${b}`);
      for (const k of Object.keys(b)) near(a[k], b[k], `${path}.${k}`);
    };
    near(join.view.ridges, end.view.ridges, 'the ridges where 0.2 left them');
    assert.deepEqual(join.stops, end.stops);
    near(join.spot, { x: end.painted.x, y: end.painted.y }, 'the hit target on the body');
    near(join.sky, end.sky, 'the sky');
    assert.equal(join.life, null, 'no closing sky yet');
  }
});

test('the 0.3 camera: the stops sit in holds, and it reaches the desk', () => {
  assert.deepEqual(deskHolds(), deskHolds().map(() => true));
  const top = deskCameraAt(0.5, duskEmber);
  assert.ok(Math.abs(top.pitch - Math.PI / 2) < 1e-9, 'straight down over the desk');
  assert.ok(Math.abs(top.ahead) < 1e-9);
  const last = deskCameraAt(1, duskEmber);
  assert.ok(last.ahead > 0 && last.pitch < 0.25, 'facing the desk, nearly level (13°, 0.3.8)');
  for (let d = 0; d <= 1; d += 0.01) {
    const c = deskCameraAt(d, duskEmber);
    assert.ok(c.eye > 0 && Number.isFinite(c.back), `a camera above the ground at ${d}`);
  }
});

test('the 0.3 pitch: screen and virtual plane map both ways', () => {
  const f = frame(duskEmber, { about: 1, desk: 0.3 }).f;
  const P = f.pitch;
  assert.ok(P && P.sin > 0);
  for (const [x, y] of [[10, 20], [W / 2, H / 3], [W - 5, H / 4]]) {
    const v = toVirtual(P, x, y);
    if (!v) continue;
    const s = toScreen(P, v.x, v.y);
    assert.ok(Math.abs(s.x - x) < 1e-6 && Math.abs(s.y - y) < 1e-6);
  }
  assert.equal(pitchOf(null, f.view, W, H), null);
});

test('the closing sky: birds by day, stars by night, none before arc 2', () => {
  assert.equal(frame(duskEmber, { about: 1, desk: 0.3 }).f.life, null);
  const day = frame(duskEmber, { about: 1, desk: 1 }).f.life;
  const night = frame(moonlit, { about: 1, desk: 1 }).f.life;
  assert.equal(day.amount, 1);
  assert.deepEqual([day.birds, day.stars], [1, 0]);
  assert.deepEqual([night.birds, night.stars], [0, 1]);
});

test('footsteps: a stride apart, alternating feet, gone after their life', () => {
  const w = createWalker();
  assert.equal(w.move({ x: 0, z: 0 }, 0), false, 'the first point only starts the walk');
  assert.equal(w.move({ x: STRIDE * 0.5, z: 0 }, 0.1), false);
  assert.equal(w.move({ x: STRIDE * 1.1, z: 0 }, 0.2), true);
  assert.equal(w.move({ x: STRIDE * 2.2, z: 0 }, 0.3), true);
  const [a, b] = w.live(0.3);
  assert.ok(Math.sign(a.z) === -Math.sign(b.z), 'left, then right');
  // Walking +x, left of the path is +z.
  for (const q of [a, b]) assert.equal(q.foot, q.z > 0 ? -1 : 1, 'each boot on its own side of the path');
  assert.ok(Math.abs(a.angle - Math.PI / 2) < 1e-9, 'turned along the walk');
  assert.equal(w.move({ x: 50, z: 0 }, 0.4), false, 'a jump restarts the walk');
  assert.equal(w.live(0.3 + LIFE + 0.01).length, 0);
});

test('the boot: one per load, seeded the same, each its own within the ranges', () => {
  const a = bootOf(seeded(7));
  assert.equal(a.length, BOOT_FLOATS);
  assert.deepEqual([...a], [...bootOf(seeded(7))], 'a seed draws the same boot');
  const boots = Array.from({ length: 200 }, (_, i) => bootOf(seeded(i)));
  const rows = new Set(boots.map(b => b[4]));
  assert.deepEqual([...rows].sort(), [3, 4, 5], 'three to five forefoot rows');
  assert.ok(boots.some(b => b[5] === 0) && boots.some(b => b[5] > 0), 'straight bars and chevrons');
  assert.ok(boots.some(b => b[7] === 0) && boots.some(b => b[7] > 0), 'one column a side, or two');
  for (const b of boots) {
    assert.ok(b[0] >= 0.27 && b[0] <= 0.31, 'a boot\'s length');
    assert.ok(b[2] > b[1], 'the ball wider than the heel');
    assert.ok(b[0] - b[1] - b[2] > 0.15, 'heel and ball apart');
  }
});

test('the meadow\'s paint: the same every load, every channel spread, tiling seamlessly', () => {
  const t = meadowTexels();
  const N = MEADOW_SIZE;
  assert.equal(t.length, N * N * 4);
  assert.deepEqual(t.slice(0, 64), meadowTexels().slice(0, 64), 'a fixed seed');
  for (let c = 0; c < 4; c++) {
    let lo = 255;
    let hi = 0;
    let seam = 0;
    let inner = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = t[(y * N + x) * 4 + c];
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      // Across the wrap, neighbours differ no more than inside the tile.
      seam += Math.abs(t[(y * N + N - 1) * 4 + c] - t[(y * N) * 4 + c]);
      inner += Math.abs(t[(y * N + N / 2) * 4 + c] - t[(y * N + N / 2 - 1) * 4 + c]);
    }
    assert.ok(hi - lo > 100, `channel ${c} spans its range`);
    assert.ok(seam < inner * 2 + N * 4, `channel ${c} tiles`);
  }
});

test('the pointer meets the ground under the desk camera, and misses it in the sky', () => {
  const f = frame(duskEmber, { about: 1, desk: 0.5 }).f;
  const below = groundAt(f.pitch, f.cam, f.pitch.sx, f.pitch.sy);
  assert.ok(below && Math.abs(below.x) < 1e-9 && Math.abs(below.z) < 1e-6, 'looking straight down at the desk');
  const end = frame(duskEmber, { about: 1, desk: 1 }).f;
  assert.equal(groundAt(end.pitch, end.cam, W / 2, 0), null, 'the top of the closing shot is sky');
  assert.equal(groundAt(null, end.cam, 0, 0), null);
});

test('the grass: each scene its own colours, lit by its light; blended mid-switch', () => {
  const day = frame(duskEmber, { about: 1, desk: 1 }).f.grass;
  const night = frame(moonlit, { about: 1, desk: 1 }).f.grass;
  assert.equal(day.root, duskEmber.desk.grass.root);
  assert.equal(night.root, moonlit.desk.grass.root);
  assert.ok(Math.max(...day.sky) === 1 && day.dir.length === 2);
  assert.equal(grassOf(moonlit, { prev: duskEmber, e: 0 }).root.toLowerCase(), duskEmber.desk.grass.root.toLowerCase());
  assert.equal(frame(duskEmber, { about: 1 }).f.grass, null, 'none before the desk stretch');
});

test('every shader the atmosphere builds is checked on real devices (scripts/lib/programs.mjs)', async () => {
  const listed = new Set(PROGRAMS.flatMap(([, vs, fs]) => [vs, fs]));
  const dir = new URL('../components/gradient/gl/', import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const mod = await import(new URL(file, dir).href);
    for (const [name, v] of Object.entries(mod)) {
      if (typeof v === 'string' && v.startsWith('#version 300 es')) assert.ok(listed.has(v), `${file} ${name} is in PROGRAMS`);
    }
  }
});

test('the trees: whole, one shadow each, clear of the desk and of the view over it, however the copses fall', () => {
  assert.deepEqual(treeLayout().data, treeLayout().data, 'no seed: the same trees every time');
  assert.deepEqual(treeLayout(7).data, treeLayout(7).data, 'a seed: the same trees for it');
  assert.notDeepEqual(treeLayout(7).data, treeLayout(8).data, 'another seed: other copses');
  for (const seed of [null, 1, 7, 8, 99, 12345, 2 ** 30]) {
    const a = treeLayout(seed);
    assert.equal(a.data.length % TREE_STRIDE, 0);
    assert.ok(a.data.every(Number.isFinite));
    const rows = i => a.data.subarray(i * TREE_STRIDE, (i + 1) * TREE_STRIDE);
    const n = a.data.length / TREE_STRIDE;
    const trunks = [];
    for (let i = 0; i < a.parts; i++) if (rows(i)[8] === 0 && rows(i)[1] < 0) trunks.push(rows(i));
    assert.equal(n - a.parts, trunks.length, 'a shadow per tree');
    assert.ok(trunks.some(([x, , z]) => Math.abs(x + 6.4) < 0.5 && Math.abs(z - 9.5) < 0.5), 'the lone tree where it stands');
    for (const t of trunks) {
      const [x, , z] = t;
      assert.ok(Math.hypot(x, z) > 4, 'none on the desk');
      if (z > 20) assert.ok(Math.abs(x) > 12, `the line over the desk stays open (seed ${seed})`);
      assert.ok(z < 80, 'short of the mountains\' foot');
    }
  }
});

test('the desk: fixed, whole, standing on the ground, its top at DESK_BOX', () => {
  const a = deskLayout();
  assert.deepEqual(a.data, deskLayout().data, 'the same table every visit');
  assert.equal(a.data.length % DESK_STRIDE, 0);
  assert.ok(a.data.every(Number.isFinite));
  const n = a.data.length / DESK_STRIDE;
  assert.equal(n - a.wood, 1, 'one shadow, last');
  let top = 0;
  let foot = Infinity;
  for (let i = 0; i < a.wood; i++) {
    const [, y, , tilt, hx, hy, hz] = a.data.subarray(i * DESK_STRIDE, (i + 1) * DESK_STRIDE);
    // A box's lowest and highest points, tilted about x.
    const reach = Math.abs(Math.cos(tilt)) * hy + Math.abs(Math.sin(tilt)) * hz;
    top = Math.max(top, y + reach);
    foot = Math.min(foot, y - reach);
    assert.ok(hx > 0 && hy > 0 && hz > 0);
  }
  assert.ok(Math.abs(top - DESK_BOX.h) < 0.005, `the top at ${DESK_BOX.h} m (${top.toFixed(3)})`);
  assert.ok(foot > -0.005 && foot < 0.01, `standing on the ground (${foot.toFixed(3)})`);
});

test('the lamp: on the desk, its arms whole, its light aimed down, its top half moved by a drag', () => {
  const { at: base, arm } = LAMP;
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  assert.equal(base[1], DESK_BOX.h, 'standing on the top');
  assert.ok(Math.abs(base[0]) + LAMP.base.r < DESK_BOX.w / 2 && Math.abs(base[2]) + LAMP.base.r < DESK_BOX.d / 2, 'its base on the top');
  // Every pose a drag can give: wherever the pointer goes, the arms keep
  // their length, the head stays over the top, the shade looks down.
  for (const w of [[0.12, 0.95, 0.03], [-2, 3, -2], [0.45, 0.8, 0.255], [0.9, 0.6, 0.6], [0, 0.76, 0]]) {
    const pose = poseToward(w);
    const at = lampAt(pose);
    assert.ok(Math.abs(dist(at.pivot, at.elbow) - arm) < 1e-9 && Math.abs(dist(at.elbow, at.head) - arm) < 1e-9, 'both arms their length');
    assert.ok(Math.abs(at.head[0]) < DESK_BOX.w / 2 && Math.abs(at.head[2]) < DESK_BOX.d / 2 && at.head[1] > DESK_BOX.h, 'the head over the top');
    assert.ok(at.axis[1] < -0.5, 'the shade looks down');
    const { data, count } = lampMesh(pose);
    assert.equal(data.length, count * LAMP_STRIDE);
    assert.ok(data.every(Number.isFinite));
  }
  const { data, count } = lampMesh();
  for (let i = 0; i < count; i++) {
    const [x, y, z] = data.subarray(i * LAMP_STRIDE, i * LAMP_STRIDE + 3);
    assert.ok(y > DESK_BOX.h - 1e-6 && Math.abs(x) < DESK_BOX.w / 2 && Math.abs(z) < DESK_BOX.d / 2, 'all of it over the top');
  }
  // Never through the device: the first pose is clear of both, and a drag
  // into one stops short of it.
  for (const device of ['laptop', 'tablet']) {
    assert.ok(lampClear(LAMP_POSE, device), `the first pose clear of the ${device}`);
    for (const w of [[0, 0.8, 0.05], [0.05, 0.98, 0.2], [0.15, 0.85, 0.15], [-0.1, 0.78, 0.1]]) {
      assert.ok(lampClear(poseFree(LAMP_POSE, w, device), device), `a drag stops at the ${device}`);
    }
  }
  // On screen: behind the camera, no outline; in front, a box round it and
  // the head taken back to the world where it was.
  const P = { cos: 1, sin: 0, f: 800, zoom: 1, sx: 400, sy: 300 };
  assert.equal(lampHitOn(P, { x: 0, y: 1, z: 2 }), null);
  const cm = { x: 0.2, y: 1, z: -1 };
  const hit = lampHitOn(P, cm);
  assert.ok(hit && hit.w > 0 && hit.h > 0 && hit.path.startsWith('M'));
  const head = lampAt(LAMP_POSE).head;
  const q = [head[0] - cm.x, head[1] - cm.y, head[2] - cm.z];
  const back = screenToWorld(P, cm, head, P.sx + (800 * q[0]) / q[2], P.sy - (800 * q[1]) / q[2]);
  assert.ok(dist(back, head) < 1e-9, 'the screen and the world agree');
});

test('the lamp\'s flicker: steady, now and then a stutter, never on a schedule', () => {
  const a = makeFlicker(0.3);
  const b = makeFlicker(0.3);
  const starts = [];
  let prev = 1;
  for (let t = 0; t < 1200; t += 1 / 60) {
    const k = a(t);
    assert.equal(k, b(t), 'the same seed, the same flicker');
    assert.ok(k > 0 && k <= 1);
    if (k < 1 && prev === 1) starts.push(t);
    prev = k;
  }
  // Stutters: dips within half a second of each other are one.
  const bursts = starts.filter((t, i) => i === 0 || t - starts[i - 1] > 0.5);
  assert.ok(bursts.length > 15 && bursts.length < 120, `rare (${bursts.length} in 20 min)`);
  const gaps = bursts.slice(1).map((t, i) => t - bursts[i]);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 10, 'spaced at random, not on a period');
  assert.ok(a(1300) <= 1 && makeFlicker(0.7)(5) === 1, 'steady at first');
});

function geoArgs(r) {
  const [size, horizon, haze, height, sharp, sun, seed] = targetGeo(r);
  return { size, horizon, mist: { ...mistOf(r.mist), haze, height, sharp, sun, seed }, aspect: r.aspect, crests: false };
}
