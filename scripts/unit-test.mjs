// Tests for the scene's pure maths, run without a browser or a GPU:
// the colour module (components/gradient/colour.js), the switch palette
// (skyKeys.js paletteAt), one frame of the scene (scene.js sceneAt) and the
// 0.3 camera (deskCamera.js).
//   node --import ./scripts/lib/resolve-js.mjs --test scripts/unit-test.mjs
// (`npm run test:unit`; the hook resolves the components' extensionless
// imports as the bundler does.)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromOklab, hexToLms, hexToRgb, lmsToHex, mix, oklab, rgbToHex } from '../components/gradient/colour.js';
import { paletteAt } from '../components/gradient/skyKeys.js';
import { sceneAt } from '../components/gradient/scene.js';
import { descentAt, groundPaint, scrollPalette } from '../components/gradient/camera.js';
import { airOpacity, layout, mistOf, ridgePaint, sunColour } from '../components/gradient/gl/mistGeometry.js';
import { beginOrbit, orbitScene, targetGeo } from '../components/gradient/orbit.js';
import { DISC_WHITE, SET_COLOUR, SUNSET_COLOUR } from '../components/gradient/sunLook.js';
import { deskCameraAt, deskHolds, pitchOf, toScreen, toVirtual } from '../components/gradient/deskCamera.js';
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
    assert.ok(f.ground && f.ground.top < H, 'the meadow shows');
    assert.deepEqual(
      f.ground,
      groundPaint(f.stops, r.scroll.meadow, f.paints.at(-1).fill[2], f.view, H, f.haze),
      "the recipe's own meadow",
    );
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
  assert.ok(last.ahead > 0 && last.pitch < 0.2, 'facing the desk, nearly level');
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

function geoArgs(r) {
  const [size, horizon, haze, height, sharp, sun, seed] = targetGeo(r);
  return { size, horizon, mist: { ...mistOf(r.mist), haze, height, sharp, sun, seed }, aspect: r.aspect, crests: false };
}
