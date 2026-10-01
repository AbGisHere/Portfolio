'use client';

import { useEffect, useRef } from 'react';
import {
  FAR_VEIL,
  MAX_DPR,
  grainOpacity,
  layout,
  mistOf,
  sunColour,
  veilAlpha,
  veilSpeedScale,
  veilTiming,
} from '../gl/mistGeometry';
import { hexToRgb, mixRgb, rgbToHex } from '../colour';
import { MOON_SIZE, moonFace } from '../moonFace';
import {
  DISC_ALPHA,
  DISC_LIFT,
  DISC_WHITE,
  GLOW_EXTENT,
  LIMB_STOPS,
  MOON_GLOW,
  SET_BLOOM,
  SET_WASH,
  SUN_GLOW,
  gaussStops,
  limbAt,
  rimWash,
  setDisc,
  sunWash,
} from '../sunLook';
import { beginOrbit, ease, orbitScene, targetGeo } from '../orbit';
import { sceneAt } from '../scene';
import { rampAt, skyRamp } from '../skyRamp';
import { DESCENT_VEIL } from '../camera';
import themes from '../themes';
import { getDescent, subscribeDescent } from '../../scroll/descent';
import { publishSunSpot } from '../sunSpot';
import { grainTile, layGrain } from '../grainLayer';
import { ridgeMasks } from './ridgeMasks';
import styles from './LayeredScene.module.css';

const MASK_DEBOUNCE = 120; // ms after a resize before the masks are rebuilt
const CROP_STEP = 0.05; // a ridge's body is cut in steps of this (share of the frame)
const PRE_ABOUT = 1e-3; // the descent's first frame, for the world ranges' shapes at rest

const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(',')},${a})`;
// Mixed in gamma-encoded RGB, like the shader's mix() with the sky texture.
const mixHex = (a, b, t) => rgbToHex(mixRgb(a, b, t));
const px = v => `${v}px`;
// A colour scaled per channel (0…255 floats, unrounded: the shader's are).
const scaled = (hex, k) => `rgb(${hexToRgb(hex).map((c, i) => Math.round(c * k[i])).join(',')})`;
// Colour lives in small canvases (0.2.9) that the compositor stretches over
// their layer's box, linear between texels: a colour change redraws a few
// hundred texels and uploads them, where a CSS gradient re-rasters the
// layer's tiles (and holds old and new tiles while it does, which overran
// Chrome's GPU memory). Only the ridge masks are rastered, and only when a
// crop step or a resize moves them.
const STRIP = 512; // texels down a vertical gradient
const ROUND = 128; // texels across a radial one
const RIM_TEXEL = 6; // CSS px per texel of a rim's colour under the wash (flat: one texel)
// The light's tint's box (CSS px, before its transform), and how far past
// the light's column it reaches, at least (in spreads).
const TINT_W = 600;
const TINT_REACH = 8;
// Screen blend, 0–255 channels.
const screen = (a, b) => a.map((v, i) => v + b[i] - (v * b[i]) / 255);
const cssRgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;

// The scenes whose descent camera can run, for the masks' widest reach.
const DESCENT_RECIPES = Object.values(themes).map(t => t.recipe);

// The sun's two-layer glow (sunLook.js) as radial stops for its canvas;
// the glow's colour is filled in per frame.
// `k` lifts the stops past what CSS opacity (capped at 1) can: a setting
// body's glow gain.
const glowStops = (col, k = 1) => SUN_GLOW.map(([x, a]) => [x / GLOW_EXTENT, rgba(col, Math.min(1, a * k))]);
// (0.2.6) The setting look (sunLook.js, mirroring mistShader.js): colours
// as float RGB, alphas to 4 places (a Gaussian's tail is ~.002).
const rgbaF = (c, a) =>
  `rgba(${(typeof c === 'string' ? hexToRgb(c) : c).map(v => +v.toFixed(2)).join(',')},${+a.toFixed(4)})`;
const MOON_STOPS = (col, k = 1) => MOON_GLOW.map(([t, a]) => [t, rgbaF(col, Math.min(1, a * k))]);
const SMOOTH = Array.from({ length: 11 }, (_, k) => k / 10);
const BLOOM_EXT = 1 + 3 * SET_BLOOM.out; // the bloom's box, in radii (3σ)
const BLOOM = gaussStops(16, 3);
const WASH_EXT = 2.5; // the wash's gradient reaches 2.5σ (its tail is under .2/255)
const WASH = gaussStops(16, WASH_EXT);
const LIMB = `radial-gradient(ellipse closest-side, ${LIMB_STOPS.map(
  r =>
    `rgb(${limbAt(r)
      .map(c => Math.round(c * 255))
      .join(',')}) ${r * 100}%`,
).join(', ')}, rgb(${limbAt(1)
  .map(c => Math.round(c * 255))
  .join(',')}) 100%)`;

// ---- colour canvases. Each redraws only when its key changes.
const redraw = (c, key) => {
  if (c.key === key) return null;
  c.key = key;
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'source-over';
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, c.width, c.height);
  return x;
};
// A vertical gradient over a box `height` CSS px tall: `stops` are
// [y (CSS px from the box's top), colour], padded past the ends as in CSS.
function strip(x, c, stops, height) {
  const f = c.height / height;
  const y0 = stops[0][0] * f;
  const y1 = stops[stops.length - 1][0] * f;
  if (y1 - y0 < 1e-6) return stops[stops.length - 1][1];
  const g = x.createLinearGradient(0, y0, 0, y1);
  for (const [y, col] of stops) g.addColorStop(Math.min(1, Math.max(0, (y * f - y0) / (y1 - y0))), col);
  return g;
}
function paintStrip(c, stops, height) {
  const x = redraw(c, `${height}|${stops.join('|')}`);
  if (!x) return;
  x.fillStyle = strip(x, c, stops, height);
  x.fillRect(0, 0, c.width, c.height);
}
// `radial-gradient(ellipse closest-side, …)`: a circle, which the box's
// size stretches to its ellipse. `stops` are [t (0…1 of the radius), colour].
function paintRound(c, stops) {
  const x = redraw(c, stops.join('|'));
  if (!x) return;
  const r = c.width / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  for (const [t, col] of stops) g.addColorStop(t, col);
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
}
// A ridge's light and shade (camera.js ridgeLightAt), as mistShader.js:
// the fill shaded by (1 − falloff), then screened with the light times its
// falloff below the crest (`falloff`, ridgeMasks.js) times its share across
// the frame. Over the shaded fill, `paintUnshade` lays the unshaded fill
// (`fill`, down a box `bh` CSS px tall) at the falloff's alpha: the shade
// the shader leaves. The light is a group screened over that: the falloff
// as grey (`paintFalloff`), times (a multiply blend) the light's colour
// across the frame (`paintTint`: `lit` times its `base` share, rising to
// all of it across u in ±3 spreads by exp(−u²), over u in ±`reach`, one
// texel per 1/8 spread), which a transform centres on the body's column
// and sizes to its spread. So a scroll frame only moves the light.
function paintUnshade(c, falloff, fill, bh) {
  if (c.width !== falloff.width || c.height !== falloff.height) {
    c.width = falloff.width;
    c.height = falloff.height;
    c.key = null;
  }
  const x = redraw(c, `${bh}|${fill.join('|')}`);
  if (!x) return;
  x.fillStyle = strip(x, c, fill, bh);
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(falloff, 0, 0);
}
function paintFalloff(c, falloff) {
  if (c.src === falloff) return;
  c.src = falloff;
  c.width = falloff.width;
  c.height = falloff.height;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(falloff, 0, 0);
}
function paintTint(c, lit, base, reach) {
  const cols = Math.ceil(reach * 16);
  if (c.width !== cols) c.width = cols;
  const x = redraw(c, `${lit}|${base}|${reach}`);
  if (!x) return;
  const g = x.createLinearGradient(0, 0, cols, 0);
  for (let i = 0; i < cols; i++) {
    const u = -reach + (2 * reach * (i + 0.5)) / cols;
    const k = base + (1 - base) * Math.exp(-u * u);
    g.addColorStop((i + 0.5) / cols, `rgb(${lit.map(v => +(v * k).toFixed(2)).join(',')})`);
  }
  x.fillStyle = g;
  x.fillRect(0, 0, cols, 1);
}

// The moon's face (moonFace.js) as an image, multiplied into the disc.
function moonTile() {
  const c = document.createElement('canvas');
  c.width = MOON_SIZE;
  c.height = MOON_SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(MOON_SIZE, MOON_SIZE);
  moonFace().forEach((v, i) => {
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);
  return `url(${c.toDataURL()})`;
}

/**
 * The atmosphere as stacked DOM layers: the fallback when WebGL isn't there.
 *
 * The SVG engine it replaced redrew one flat picture every frame (every blur
 * filter included), which is what made it choppy. Here each part of the scene is its
 * own layer, in the GL shader's paint order, so the browser composites them
 * instead of repainting them:
 *
 *   sky → sun/moon glow and disc (two mid-switch) → per ridge (fill, crest
 *   rim, veil) → air → grain
 *
 * Every colour is a small canvas the compositor stretches over its layer
 * (0.2.9): a colour change redraws a few texels, never a layer's tiles, so
 * the only rastered layers are the ridge masks, two per ridge (the band,
 * which carries the fill and its light, and the rim), computed with the
 * shader's own maths (ridgeMasks.js) and rastered once. That keeps Chrome's
 * GPU memory small: 0.2.6's ~97 layers, repainted as the palette moved,
 * overran it and dropped tiles mid-scroll. At rest nothing runs on the main
 * thread: the veils drift and breathe on compositor animations (the studio's
 * CSS timings). A switch runs the same sky turn as the GL renderer (orbit.js)
 * on one rAF clock: the bodies ride the arc, the palette passes through the
 * keyframes and relights every layer. The ridges keep one silhouette, the
 * scene the page loaded with, through every switch: only their light changes.
 * (Reshaping them means recomputing the masks every frame, which is the job
 * WebGL is for, and a cross-fade between two silhouettes looked worse than
 * none.) No idle drift either.
 *
 * The descent camera (../camera.js, the 0.2.1 conveyor) is the same maths
 * as the GL renderer's, as transforms and gradients: each ridge (fill, rim
 * and veil, drift and all) is scaled about the frame's centre line at its
 * foot and moved to its new one, the world ranges slide in from below the
 * frame or from behind the far ridge (geometry only, never alpha), the sky
 * is redrawn over the strip above the horizon, the bodies move, the meadow
 * is a gradient under the front ridge's veil, and the palette runs through
 * the recipe's `scroll.keys`, with the ridges painted for the slot each has
 * reached. A scroll frame is one paint on a rAF: transforms and canvas
 * colours only, never a mask rebuild, a mask re-raster or a React render.
 * The masks cover the widest span the camera shows, and every range it can
 * bring in. The GL
 * renderer's wind over the meadow is left out.
 *
 * Honours the renderer hooks: `?freeze=1`, `?grain=0`, `data-sun-cx/cy`,
 * `data-seed` (scripts/README.md).
 */
export default function LayeredScene({ recipe }) {
  const hostRef = useRef(null);
  const recipeRef = useRef(recipe);
  const kickRef = useRef(() => {});

  useEffect(() => {
    recipeRef.current = recipe;
    kickRef.current();
  }, [recipe]);

  useEffect(() => {
    const host = hostRef.current;
    const wrap = host.parentElement;
    const params = new URLSearchParams(window.location.search);
    const noGrain = params.get('grain') === '0';
    const frozen = params.get('freeze') === '1';
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dead = false;

    // ---- layers, bottom to top
    const make = (cls, parent = host) => {
      const d = document.createElement('div');
      d.className = cls;
      parent.appendChild(d);
      return d;
    };
    // A colour canvas of `cols` × `rows` texels, sized by CSS.
    const paper = (cls, parent, cols, rows) => {
      const c = document.createElement('canvas');
      c.className = cls;
      c.width = cols;
      c.height = rows;
      parent.appendChild(c);
      return c;
    };
    const sky = make(styles.fill);
    const skyRampEl = paper(styles.sky, sky, 1, STRIP);
    skyRampEl.getContext('2d', { alpha: false });
    // A setting sun's wash over the sky, and its spill over the ridges.
    const wash = paper(styles.wash, host, ROUND, ROUND);
    const bodies = [0, 1].map(() => ({
      glow: paper(styles.glow, host, ROUND, ROUND),
      disc: make(styles.disc),
      bloom: paper(styles.glow, host, ROUND, ROUND),
    }));
    const ridgesEl = make(styles.fill);
    const spill = paper(styles.wash, host, ROUND, ROUND);
    const air = paper(styles.air, host, 1, STRIP);
    // The grain: its tile laid over the frame once per size (../grainLayer.js).
    const grain = paper(styles.grain, host, 1, 1);
    const tile = noGrain ? null : grainTile();
    if (noGrain) grain.style.display = 'none';
    const lay = () => layGrain(grain, tile, w, h);

    // Style writes only when a value changes, so a resting frame is free.
    // The moon's face image. Made ahead of time, when the browser is idle,
    // so the first sunset doesn't stall on it.
    let moon = null;
    const makeMoon = () => {
      if (!dead) moon ??= moonTile();
    };
    const idleMoon =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(makeMoon, { timeout: 800 })
        : setTimeout(makeMoon, 300);
    const last = new WeakMap();
    const set = (node, props) => {
      let seen = last.get(node);
      if (!seen) last.set(node, (seen = {}));
      for (const k in props) {
        if (seen[k] !== props[k]) {
          seen[k] = props[k];
          node.style[k] = props[k];
        }
      }
    };

    // One slot per ridge: its fill and crest rim, then the veil in front.
    const slots = [];
    // The descent camera transforms `shape` (fill and rim) and `haze` (the
    // veil) alike; the meadow sits between them, in frame terms.
    const slot = i => {
      while (slots.length <= i) {
        const s = make(styles.fill, ridgesEl);
        const shape = make(styles.cam, s);
        // Solid body below the edge band (opaque, so Chrome skips rastering
        // what it covers), then the band with its light, then the rim: two
        // masks, applied on the compositor (a mask costs an offscreen pass
        // over the element's area).
        const body = paper(styles.ridge, shape, 1, STRIP);
        body.getContext('2d', { alpha: false });
        const band = make(styles.ridge, shape);
        const fill = paper(styles.fill, band, 1, STRIP);
        const unshade = paper(styles.light, band, 1, 1);
        const light = make(styles.lit, band);
        const falloff = paper(styles.fill, light, 1, 1);
        falloff.getContext('2d', { alpha: false });
        const tint = paper(styles.tint, light, 1, 1);
        tint.getContext('2d', { alpha: false });
        const rim = paper(styles.ridge, shape, 1, 1);
        const meadow = paper(styles.meadow, s, 1, STRIP);
        const haze = make(styles.cam, s);
        const veil = make(styles.veil, haze);
        slots.push({
          root: s,
          shape,
          body,
          band,
          fill,
          unshade,
          light,
          falloff,
          tint,
          rim,
          meadow,
          haze,
          veil,
          drift: paper(styles.drift, veil, ROUND, ROUND),
          anims: null,
          noise: -1,
        });
      }
      return slots[i];
    };

    // ---- frame size
    let w = 0;
    let h = 0;
    let dpr = 1;

    // ---- the ridges' silhouettes: the scene the page loaded with, kept
    // through every switch, rebuilt only when the frame size changes
    const shape = recipeRef.current;
    let masks = null;
    let masksKey = '';
    let building = null;
    function buildMasks() {
      const key = `${w}x${h}@${dpr}`;
      if (key === masksKey) return;
      masksKey = key;
      const job = {};
      building = job;
      const cancelled = () => dead || building !== job;
      ridgeMasks(shape, w, h, dpr, cancelled, DESCENT_RECIPES).then(m => {
        if (cancelled()) {
          m.revoke();
          return;
        }
        const old = masks;
        masks = m;
        paint();
        if (old) setTimeout(() => old.revoke(), 1000);
      });
    }

    // ---- the switch (orbit.js, as the GL renderer)
    let sunRecipe = recipeRef.current;
    let orbit = null; // beginOrbit(…) + { t0, e }
    let raf = 0;

    function sceneNow(now) {
      const o = orbit;
      if (!o) return { geo: targetGeo(sunRecipe), stops: sunRecipe.stops, e: 1 };
      o.e = ease((now - o.t0) / 1000 / o.dur);
      return { ...orbitScene(o, o.e), e: o.e };
    }

    function start() {
      const r = recipeRef.current;
      if (r === sunRecipe) return;
      const now = performance.now();
      const { geo, stops } = sceneNow(now);
      const prev = sunRecipe;
      sunRecipe = r;
      cancelAnimationFrame(raf);
      raf = 0;
      // Reduced motion: the switch is a cut.
      orbit = motion.matches ? null : { ...beginOrbit(prev, r, geo, stops), t0: now, e: 0 };
      paint(now);
      if (orbit) raf = requestAnimationFrame(tick);
    }

    function tick(now) {
      raf = 0;
      paint(now);
      const o = orbit;
      if (!o) return;
      if ((now - o.t0) / 1000 >= o.dur) {
        orbit = null;
        paint(now);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    // ---- the veils' drift and breathing: the studio's CSS animations, run
    // by the compositor (Web Animations, so a new duration keeps the phase).
    let veilKey = '';
    // Each is timed by its ridge's noise index, as in the GL renderer, so a
    // veil's drift carries on as the descent's ranges join.
    function animateVeils(count) {
      const still = motion.matches || frozen;
      const r = sunRecipe;
      // Mid-switch the drift eases between the scenes' on the switch's
      // clock (as the GL renderer), so the veils' swing never jumps.
      const to = mistOf(r.mist).drift;
      const from = orbit ? mistOf(orbit.prev.mist).drift : to;
      const drift = from + (to - from) * (orbit ? orbit.e : 1);
      const key = `${w}|${drift}|${r.speed}|${still}|${count}`;
      if (key === veilKey) return;
      veilKey = key;
      const scale = veilSpeedScale(r.speed);
      slots.forEach((s, i) => {
        if (still || i >= count) {
          s.anims?.drift.cancel();
          s.anims?.breathe.cancel();
          s.anims = null;
          return;
        }
        const { duration, amp } = veilTiming(s.noise, drift, w);
        const D = duration * scale * 1000;
        const frames = [{ transform: `translateX(${-amp}px)` }, { transform: `translateX(${amp}px)` }];
        const timing = { iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };
        if (!s.anims) {
          s.anims = {
            D,
            drift: s.drift.animate(frames, { ...timing, duration: D }),
            breathe: s.drift.animate([{ opacity: 0.6 }, { opacity: 1 }], { ...timing, duration: D * 0.55 }),
          };
        } else {
          s.anims.drift.effect.setKeyframes(frames);
          s.anims.drift.updatePlaybackRate(s.anims.D / D);
          s.anims.breathe.updatePlaybackRate(s.anims.D / D);
        }
      });
    }

    // ---- paint one frame
    function paint(now = performance.now()) {
      if (!w || dead) return;
      const r = sunRecipe;
      const o = orbit;
      const { geo, stops: base, e } = sceneNow(now);
      const [size, horizon, haze, height, sharp, sunPct] = geo;
      const mist = { ...mistOf(r.mist), haze, height, sharp, sun: sunPct };
      const scene = layout(w, h, { size, horizon, mist, aspect: r.aspect, crests: false });
      // The frame (../scene.js): the descent's camera, blended between the
      // scenes' amounts mid-switch, and its time of day over the palette; the
      // bodies; the paint, light and meadow. The ridges and their veils stay
      // the loaded scene's (see `shape`), with the world ranges past the top
      // (under the frame, or sunk behind the far ridge) for the camera to
      // bring in.
      const { about } = getDescent();
      const [gSize, gHorizon, , gHeight, gSharp, , gSeed] = targetGeo(shape);
      const frameAt = about => sceneAt({
        recipe: r,
        orbit: o,
        e,
        base,
        haze,
        about,
        reduced: motion.matches,
        w,
        h,
        layoutAt: ranges =>
          layout(w, h, {
            size: gSize,
            horizon: gHorizon,
            mist: { ...mistOf(shape.mist), haze, height: gHeight, sharp: gSharp, seed: gSeed },
            aspect: shape.aspect,
            crests: false,
            ranges,
          }),
        sun: scene.sun,
        restCol: sunColour(base),
      });
      const frame = frameAt(about);
      const { stops, view, haze: hz, M, lit, painted, light } = frame;

      // Sky: its gradient spans the frame's height and holds its last colour
      // below. Under the camera it's redrawn over the strip above the horizon
      // (camera.js skyUnder): frame row y shows the ramp at (y × scale + shift).
      const ramp = skyRamp(stops, r.divs);
      const sk = frame.sky;
      set(sky, { backgroundColor: ramp[ramp.length - 1][1] });
      set(skyRampEl, {
        height: px(h),
        transform: view.rest && !sk.shift ? 'none' : `translateY(${-sk.shift / sk.scale}px) scaleY(${1 / sk.scale})`,
      });
      paintStrip(
        skyRampEl,
        ramp.map(([o, c]) => [o * h, c]),
        h,
      );

      // The moon: glow at .4 easing (smoothstep) to 0 at 3.4r, its face in
      // the disc. The sun: two-layer glow, warm limb, flattened when low
      // (sunLook.js). Discs at .85. Then the descent moves them (camera.js
      // bodyAt), round, and sets them: the glow spreads low (`halo`, a
      // scale), and a setting sun (`set`) gets a hot core, a bloom past its
      // edge and a wash along the horizon (mistShader.js, the wash and the
      // bodies).
      // Mid-switch the arc goes under behind the far ridge where the camera
      // has put it (camera.js hiddenAt), as in the GL renderer. The painted
      // sun's centre (`painted`) is for the hit target (../sunSpot.js) and the
      // harness.
      publishSunSpot(painted.x, painted.y);
      wrap.dataset.sunCx = painted.x.toFixed(2);
      wrap.dataset.sunCy = painted.y.toFixed(2);
      wrap.dataset.seed = gSeed.toFixed(4);
      bodies.forEach((b, i) => {
        const x = lit[i];
        if (!x) {
          set(b.glow, { display: 'none' });
          set(b.disc, { display: 'none' });
          set(b.bloom, { display: 'none' });
          return;
        }
        const col = x.wash ? mixHex(x.col, rampAt(ramp, (x.y * sk.scale + sk.shift) / h), x.wash) : x.col;
        const R = x.r * (x.face ? 3.4 : GLOW_EXTENT);
        const [hx, hy] = x.halo ?? [1, 1];
        const g = x.glow * x.alpha;
        const k = Math.max(1, g);
        set(b.glow, {
          display: '',
          width: px(2 * R),
          height: px(2 * R),
          transform: `translate(${x.x - R}px, ${x.y - R}px) scale(${hx}, ${hy})`,
          opacity: String(g / k),
        });
        paintRound(b.glow, x.face ? MOON_STOPS(col, k) : glowStops(col, k));
        const ry = x.r * (1 - (x.squash ?? 0));
        const st = x.face ? 0 : (x.set ?? 0);
        const hot = st > 0 && setDisc(col, st);
        set(b.disc, {
          display: '',
          width: px(2 * x.r),
          height: px(2 * ry),
          transform: `translate(${x.x - x.r}px, ${x.y - ry}px)`,
          // Setting: core to edge on a smoothstep, times the limb (the
          // multiply blend, over white).
          backgroundColor: x.face ? col : hot ? '#fff' : mixHex(col, DISC_WHITE, DISC_LIFT),
          backgroundImage: x.face
            ? (moon ??= moonTile())
            : hot
              ? `${LIMB}, radial-gradient(ellipse closest-side, ${SMOOTH.map(
                  t => `${rgbaF(mixRgb(hot.core, hot.edge, t * t * (3 - 2 * t)), 1)} ${t * 100}%`,
                ).join(', ')})`
              : LIMB,
          opacity: String((x.face ? 0.85 : DISC_ALPHA) * x.alpha),
        });
        // The bloom: a Gaussian in the disc's own radius past its edge.
        if (hot) {
          const bx = x.r * BLOOM_EXT;
          const by = ry * BLOOM_EXT;
          const bc = mixRgb(col, DISC_WHITE, 0.5);
          const in0 = 1 / BLOOM_EXT;
          set(b.bloom, {
            display: '',
            width: px(2 * bx),
            height: px(2 * by),
            transform: `translate(${x.x - bx}px, ${x.y - by}px)`,
            opacity: String(st * x.alpha),
          });
          paintRound(b.bloom, [
            [in0, rgbaF(bc, 0)],
            ...BLOOM.map(([f, gv]) => [in0 + f * (1 - in0), rgbaF(bc, SET_BLOOM.a * gv)]),
          ]);
        } else set(b.bloom, { display: 'none' });
      });

      // The wash (the last sun with `set` > 0, as the shader) tints the sky
      // here, under the bodies; the same strip, fainter, spills over the
      // ridges below (see `spill`), and the rims under it light up. A strip
      // WASH_EXT·σ tall, moved on the compositor.
      const ws = sunWash(lit);
      if (ws) {
        const wide = WASH_EXT * ws.rx;
        const tall = WASH_EXT * ws.ry;
        const box = {
          display: '',
          width: px(2 * wide),
          height: px(2 * tall),
          transform: `translate(${ws.x - wide}px, ${ws.y - tall}px)`,
        };
        // Its Gaussian, SET_WASH.a at the peak, in the colour.
        const col = ws.col.map(v => Math.round(v));
        const stops = WASH.map(([f, g]) => [f, rgbaF(col, SET_WASH.a * g)]);
        set(wash, { ...box, opacity: String(ws.peak / SET_WASH.a) });
        set(spill, { ...box, opacity: String((ws.peak * SET_WASH.spill) / SET_WASH.a) });
        paintRound(wash, stops);
        paintRound(spill, stops);
      } else {
        set(wash, { display: 'none' });
        set(spill, { display: 'none' });
      }

      // Ridges: the fixed silhouettes (a slot per mask, every range the
      // descent can bring in, by noise index), coloured from this frame's
      // palette and placed by the camera. A range not in this frame's layout
      // hides. Past the top each is lit for the slot it has reached (its
      // `t`), and takes the descent's painted colours (camera.js
      // descentPaint) on the camera's clock.
      const at = new Map(frame.layout.ridges.map((rd, i) => [rd.noise, i]));
      const mistCol = light.mist;
      const list = masks?.ridges ?? [];
      // A frame's ridge light, as the GL renderer (camera.js ridgeLightAt):
      // the shadow scales the fill's colours, the light is screened on in
      // its own layer, and the veils and air glow with it.
      const lightOf = f => ({
        ...f,
        shade: f.light.st > 0 ? f.light.shade.map(c => 1 + (c - 1) * f.light.sh) : null,
        litCol: f.light.st > 0 ? hexToRgb(f.light.col) : null,
      });
      const cur = lightOf(frame);
      // At rest the descent's world ranges aren't in the frame, but their
      // shapes are kept where its first frame will put them (under the frame,
      // or sunk behind the far ridge), so their masks are rastered ahead:
      // revealing twelve at once on the first scroll frame overran a tight
      // GPU memory budget, and Chrome drew that frame with tiles missing.
      // (Mid-switch they keep the pose they have: hidden, so their colours
      // can wait for the camera's first frame.)
      let pre = null;
      if (view.rest && !o) {
        pre = lightOf(frameAt(PRE_ABOUT));
        pre.at = new Map(pre.layout.ridges.map((rd, i) => [rd.noise, i]));
      }
      // A rim under the wash (mistShader.js `rimCol`, `rimA`): the wash in
      // the rim's own coordinates (the camera's scale about (w/2, base)
      // undone), its stops the tinted colour and opacity, across the rim's
      // box (`bw` × `bh`). Without a wash, the rim's flat colour. Returns
      // the layer's opacity.
      const rimPaint = (c, p, rd, rc, rest, left, top, bw, bh) => {
        const cols = ws ? Math.ceil(bw / RIM_TEXEL) : 1;
        const rows = ws ? Math.ceil(bh / RIM_TEXEL) : 1;
        if (c.width !== cols || c.height !== rows) {
          c.width = cols;
          c.height = rows;
          c.key = null;
        }
        if (!ws) {
          const x = redraw(c, p.rim);
          if (x) {
            x.fillStyle = p.rim;
            x.fillRect(0, 0, c.width, c.height);
          }
          return String(p.rimA * p.fade);
        }
        const sc = rest ? 1 : rc.s;
        const foot = rest ? rd.base : rc.foot;
        const X = w / 2 + (ws.x - w / 2) / sc - left;
        const Y = rd.base + (ws.y - foot) / sc - top;
        const RX = (WASH_EXT * ws.rx) / sc;
        const RY = (WASH_EXT * ws.ry) / sc;
        const stops = WASH.map(([f, gv]) => {
          const t = rimWash(p.rim, p.rimA, ws.peak * gv, ws.col);
          return [f, rgbaF(t.col, t.a)];
        });
        const x = redraw(c, `${bw}|${bh}|${X}|${Y}|${RX}|${RY}|${stops.join('|')}`);
        if (x) {
          // The ellipse as the unit circle, in texels.
          const kx = c.width / bw;
          const ky = c.height / bh;
          x.setTransform(kx * RX, 0, 0, ky * RY, kx * X, ky * Y);
          const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
          for (const [f, col] of stops) g.addColorStop(f, col);
          x.fillStyle = g;
          x.fillRect(-X / RX, -Y / RY, bw / RX, bh / RY);
        }
        return String(p.fade);
      };
      const front = frame.layout.ridges.length - 1;
      const meadow = frame.ground;
      // Hidden ridges skipped, as the GL renderer: below its edge band an
      // opaque ridge covers every ridge behind it, so each body is cut (in
      // frame terms) at the nearest such line of the ridges in front.
      const under = new Array(list.length).fill(Infinity);
      for (let j = list.length - 1, line = Infinity; j >= 0; j--) {
        under[j] = line;
        const i = at.get(list[j].noise);
        if (i == null || frame.paints[i].fade < 1) continue;
        const rd = list[j];
        const rc = view.ridges[i];
        const sx0 = w / 2 + (rd.fill.left - w / 2) * rc.s;
        const sx1 = w / 2 + (rd.fill.left + rd.fill.width - w / 2) * rc.s;
        if (sx0 > 0 || sx1 < w) continue;
        line = Math.min(line, rc.foot + (rd.fill.top + rd.fill.height - rd.base) * rc.s);
      }
      // A ridge's shape (body, band, light and rim) in frame `f`, where it's
      // the `i`th ridge, its body cut at `line`. The masked layers span the
      // widest view the camera can show and never change size, so a scroll
      // frame never re-rasters a mask (a crop that stepped with the camera
      // held a mask's old and new tiles at once); what's off screen is left
      // to the compositor.
      const shapeOf = (s, rd, f, i, line) => {
        const p = f.paints[i];
        const rc = f.view.ridges[i];
        const rest = f.view.rest;
        set(
          s.shape,
          rest
            ? { transform: 'none' }
            : {
                transformOrigin: `${w / 2}px ${rd.base}px`,
                transform: `translateY(${rc.foot - rd.base}px) scale(${rc.s})`,
              },
        );
        const { fill, rim, glow } = rd;
        const x0 = fill.left;
        const x1 = fill.left + fill.width;
        const step = CROP_STEP * h;
        const cut = rd.base + Math.ceil(((Math.min(h, line) - rc.foot) / rc.s + 2) / step) * step;
        const bottom = Math.min(rd.bottom, cut);
        const bandEnd = fill.top + fill.height;
        // The ridge's colours down its height, from `from` (its own terms).
        const gradient = (cols, from) => [
          [rd.top - from, cols[0]],
          [rd.top + 0.45 * (rd.base - rd.top) - from, cols[1]],
          [rd.base - from, cols[2]],
        ];
        const fillCols = f.shade ? p.fill.map(col => scaled(col, f.shade)) : p.fill;
        const mask = m => ({
          maskImage: `url(${m.url})`,
          webkitMaskImage: `url(${m.url})`,
          maskSize: `${m.width}px ${m.height}px`,
          webkitMaskSize: `${m.width}px ${m.height}px`,
        });
        // The band's last rows are solid, so the body tucks a pixel under it
        // (no hairline where the two meet at a fractional scale).
        const bodyH = Math.max(0, bottom - bandEnd + 1);
        set(s.body, {
          width: px(x1 - x0),
          height: px(bodyH),
          transform: `translate(${x0}px, ${bandEnd - 1}px)`,
          opacity: String(p.fade),
        });
        if (bodyH > 0) paintStrip(s.body, gradient(fillCols, bandEnd - 1), bodyH);
        // The band: the fill's edge mask, solid below it, over the shaded
        // fill's colours, and its light and shade over those (see
        // paintUnshade): the GL renderer's lit ridge, under one mask.
        const bandH = Math.max(fill.height, glow.height);
        paintStrip(s.fill, gradient(fillCols, fill.top), bandH);
        set(s.band, {
          width: px(x1 - x0),
          height: px(bandH),
          transform: `translate(${x0}px, ${fill.top}px)`,
          maskImage: `url(${fill.url}), linear-gradient(#000, #000)`,
          webkitMaskImage: `url(${fill.url}), linear-gradient(#000, #000)`,
          maskSize: `${fill.width}px ${fill.height}px, 100% ${bandH - fill.height + 1}px`,
          webkitMaskSize: `${fill.width}px ${fill.height}px, 100% ${bandH - fill.height + 1}px`,
          maskPosition: `0 0, 0 ${fill.height - 1}px`,
          webkitMaskPosition: `0 0, 0 ${fill.height - 1}px`,
          opacity: String(p.fade),
        });
        if (f.litCol) {
          const { light: lt } = f;
          const cx = w / 2 + (lt.x - w / 2) / rc.s - x0;
          const sw = lt.spread / rc.s;
          // The tint covers the band wherever the column is.
          const need = Math.max(cx, x1 - x0 - cx) / sw + 3;
          if (!(s.reach >= need)) s.reach = Math.max(TINT_REACH, Math.ceil(need * 1.25));
          const box = { display: '', height: px(glow.height) };
          set(s.unshade, box);
          set(s.light, box);
          set(s.tint, {
            transform: `translateX(${+(cx - s.reach * sw).toFixed(2)}px) scaleX(${+((2 * s.reach * sw) / TINT_W).toFixed(5)})`,
          });
          paintUnshade(s.unshade, glow.image, gradient(p.fill, fill.top), glow.height);
          paintFalloff(s.falloff, glow.image);
          paintTint(
            s.tint,
            f.litCol.map(c => c * lt.la[i]),
            lt.base,
            s.reach,
          );
        } else {
          set(s.unshade, { display: 'none' });
          set(s.light, { display: 'none' });
        }
        set(s.rim, {
          width: px(x1 - x0),
          height: px(rim.height),
          transform: `translate(${x0}px, ${rim.top}px)`,
          opacity: rimPaint(s.rim, p, rd, rc, rest, x0, rim.top, x1 - x0, rim.height),
          ...mask(rim),
        });
      };
      for (let j = 0; j < list.length; j++) {
        const s = slot(j);
        const rd = list[j];
        s.noise = rd.noise;
        const i = at.get(rd.noise);
        if (i == null) {
          if (view.rest && o && last.get(s.root)?.display === '') continue;
          const k = pre?.at.get(rd.noise);
          if (k == null) set(s.root, { display: 'none' });
          else {
            set(s.root, { display: '' });
            set(s.haze, { display: 'none' });
            set(s.meadow, { display: 'none' });
            shapeOf(s, rd, pre, k, Infinity);
          }
          continue;
        }
        set(s.root, { display: '' });
        set(s.haze, { display: '' });
        shapeOf(s, rd, cur, i, under[j]);
        const rc = view.ridges[i];
        set(
          s.haze,
          view.rest
            ? { transform: 'none' }
            : {
                transformOrigin: `${w / 2}px ${rd.base}px`,
                transform: `translateY(${rc.foot - rd.base}px) scale(${rc.s})`,
              },
        );

        // The meadow, in front of every ridge and under the front one's veil.
        if (i === front && meadow) {
          const top = meadow.top;
          set(s.meadow, {
            display: '',
            height: px(h - top),
            transform: `translateY(${top}px)`,
          });
          paintStrip(
            s.meadow,
            meadow.stops.map(([gy, c]) => [gy - top, c]),
            h - top,
          );
        } else set(s.meadow, { display: 'none' });

        // Veil: .9 at the centre, .42 at 55%, 0 at the rim of its ellipse.
        // Past the top its opacity follows the ridge's slot, every veil thins
        // a little (DESCENT_VEIL), and the far ridge's and the distant
        // ranges' more (FAR_VEIL), as in the GL renderer.
        const v = frame.layout.veils[i];
        const va = view.rest
          ? v.a
          : veilAlpha(rc.t, hz, frame.layout.ridges[i].fade) * (1 - FAR_VEIL * (rc.flat ?? 0)) * (1 - DESCENT_VEIL * view.k);
        set(s.veil, {
          width: px(2 * v.rx),
          height: px(2 * v.ry),
          transform: `translate(${v.cx - v.rx}px, ${v.cy - v.ry}px)`,
          opacity: String(va),
        });
        paintRound(s.drift, [
          [0, rgba(mistCol, 0.9)],
          [0.55, rgba(mistCol, 0.42)],
          [1, rgba(mistCol, 0)],
        ]);
      }
      animateVeils(list.length);

      // Air: the mist colour rising from 0 to airOpacity over the 14% of the
      // height above the front ridge's foot (the frame's foot at rest), then
      // thinning out over the meadow (as mistShader.js).
      const foot = meadow ? meadow.top : h;
      const airTop = 0.86 * h + (foot - h);
      const A = frame.air;
      set(air, { height: px(h - airTop), transform: `translateY(${airTop}px)` });
      paintStrip(
        air,
        foot < h
          ? [
              [0, rgba(mistCol, 0)],
              [foot - airTop, rgba(mistCol, A)],
              [h - airTop, rgba(mistCol, 0)],
            ]
          : [
              [0, rgba(mistCol, 0)],
              [h - airTop, rgba(mistCol, A)],
            ],
        h - airTop,
      );
      if (!noGrain) set(grain, { opacity: String(grainOpacity(r)) });

      if (masks && !host.dataset.ready) host.dataset.ready = '';
    }

    // ---- sizing
    let maskTimer = 0;
    function resize() {
      const rect = host.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      if (!nw || !nh) return;
      const first = !w;
      w = nw;
      h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      lay();
      clearTimeout(maskTimer);
      if (first) buildMasks();
      else maskTimer = setTimeout(buildMasks, MASK_DEBOUNCE);
      paint();
    }

    kickRef.current = start;
    // The descent: a scroll frame asks for one paint on the next frame (a
    // switch's clock paints anyway).
    let scrollRaf = 0;
    const unsubscribe = subscribeDescent(() => {
      if (scrollRaf || raf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        paint();
      });
    });
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const onMotion = () => {
      veilKey = '';
      paint();
    };
    motion.addEventListener('change', onMotion);
    resize();
    start();

    return () => {
      dead = true;
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleMoon);
      else clearTimeout(idleMoon);
      kickRef.current = () => {};
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      unsubscribe();
      clearTimeout(maskTimer);
      ro.disconnect();
      motion.removeEventListener('change', onMotion);
      slots.forEach(s => {
        s.anims?.drift.cancel();
        s.anims?.breathe.cancel();
      });
      masks?.revoke();
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} className={styles.scene} />;
}
