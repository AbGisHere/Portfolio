'use client';

import { useEffect, useRef } from 'react';
import {
  FAR_VEIL,
  GRAIN_SIZE,
  MAX_DPR,
  grainOpacity,
  grainTexels,
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
import { skyGradient } from '../sky';
import { rampAt, skyRamp } from '../skyRamp';
import { DESCENT_VEIL } from '../camera';
import themes from '../themes';
import { getDescent, subscribeDescent } from '../../scroll/descent';
import { publishSunSpot } from '../sunSpot';
import { ridgeMasks } from './ridgeMasks';
import styles from './LayeredScene.module.css';

const MASK_DEBOUNCE = 120; // ms after a resize before the masks are rebuilt
const CROP_STEP = 0.05; // a ridge layer's crop grows in steps of this (share of the frame)

const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(',')},${a})`;
// Mixed in gamma-encoded RGB, like the shader's mix() with the sky texture.
const mixHex = (a, b, t) => rgbToHex(mixRgb(a, b, t));
const px = v => `${v}px`;
// A colour scaled per channel (0…255 floats, unrounded: the shader's are).
const scaled = (hex, k) => `rgb(${hexToRgb(hex).map((c, i) => Math.round(c * k[i])).join(',')})`;
// The light's column across the frame (camera.js ridgeLightAt), exp(−u²)
// over u in ±3 spreads, as an alpha mask on a BEAM_W-wide box (the rest of
// its light, `base`, is flat): placed and sized by a transform, so a scroll
// frame never repaints it.
const BEAM_W = 600;
const BEAM = `linear-gradient(to right, ${Array.from({ length: 25 }, (_, i) => {
  const u = (i - 12) / 4;
  return `rgba(0,0,0,${+Math.exp(-u * u).toFixed(5)}) ${((i / 24) * 100).toFixed(3)}%`;
}).join(', ')})`;
// Staggered colours while scrolling (see `stagger` below): each layer's
// colour is at most this many ms old, so 4 frames at 120 Hz, 2 at 60.
const STAGGER_MS = 30;
const SETTLE_MS = 60; // no scroll for this long: every colour is brought up to date
// Screen blend, 0–255 channels.
const screen = (a, b) => a.map((v, i) => v + b[i] - (v * b[i]) / 255);
const cssRgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;

// The scenes whose descent camera can run, for the masks' widest reach.
const DESCENT_RECIPES = Object.values(themes).map(t => t.recipe);

// The sun's two-layer glow and warm limb (sunLook.js) as CSS gradient stops;
// the glow's colour is filled in per frame.
// `k` lifts the stops past what CSS opacity (capped at 1) can: a setting
// body's glow gain.
const glowStops = (col, k = 1) =>
  SUN_GLOW.map(([x, a]) => `${rgba(col, Math.min(1, a * k))} ${((x / GLOW_EXTENT) * 100).toFixed(3)}%`).join(', ');
// (0.2.6) The setting look (sunLook.js, mirroring mistShader.js): colours
// as float RGB, alphas to 4 places (a Gaussian's tail is ~.002).
const rgbaF = (c, a) =>
  `rgba(${(typeof c === 'string' ? hexToRgb(c) : c).map(v => +v.toFixed(2)).join(',')},${+a.toFixed(4)})`;
const MOON_STOPS = (col, k = 1) =>
  MOON_GLOW.map(([t, a]) => `${rgbaF(col, Math.min(1, a * k))} ${(t * 100).toFixed(2)}%`).join(', ');
const SMOOTH = Array.from({ length: 11 }, (_, k) => k / 10);
const BLOOM_EXT = 1 + 3 * SET_BLOOM.out; // the bloom's box, in radii (3σ)
const BLOOM = gaussStops(16, 3);
const WASH_EXT = 2.5; // the wash's gradient reaches 2.5σ (its tail is under .2/255)
const WASH = gaussStops(16, WASH_EXT);
// The wash as a radial gradient in some element's coordinates: centre (x, y)
// and radii (rx, ry) there; `stop(g)` gives the colour at exp(−u²) = g.
const washGradient = (x, y, rx, ry, stop) =>
  `radial-gradient(ellipse ${WASH_EXT * rx}px ${WASH_EXT * ry}px at ${x}px ${y}px, ${WASH.map(
    ([f, g]) => `${stop(g)} ${(f * 100).toFixed(2)}%`,
  ).join(', ')})`;
// The wash's Gaussian (SET_WASH.a at its peak) as an alpha mask on its box,
// so the strip is a solid colour placed by a transform.
const WASH_MASK = `radial-gradient(ellipse closest-side, ${WASH.map(
  ([f, g]) => `rgba(0,0,0,${+(SET_WASH.a * g).toFixed(5)}) ${(f * 100).toFixed(2)}%`,
).join(', ')})`;
const LIMB = `radial-gradient(ellipse closest-side, ${LIMB_STOPS.map(
  r =>
    `rgb(${limbAt(r)
      .map(c => Math.round(c * 255))
      .join(',')}) ${r * 100}%`,
).join(', ')}, rgb(${limbAt(1)
  .map(c => Math.round(c * 255))
  .join(',')}) 100%)`;

// The GL renderer's grain (mistGeometry.js grainTexels) as a tile, one
// texel per CSS px.
function grainTile() {
  const c = document.createElement('canvas');
  c.width = GRAIN_SIZE;
  c.height = GRAIN_SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  const texels = grainTexels();
  for (let i = 0; i < texels.length; i++) {
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = texels[i];
    img.data[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return `url(${c.toDataURL()})`;
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
 * Sky, bodies, veils, air and grain are plain CSS gradients. A ridge's shape
 * is an alpha mask computed with the shader's own maths (ridgeMasks.js), its
 * colours are a CSS gradient under it. At rest nothing runs on the main
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
 * reached. A scroll frame is one paint on a rAF: transforms and colours
 * only, never a mask rebuild or a React render. The masks cover the widest
 * span the camera shows, and every range it can bring in. The GL
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
    const sky = make(styles.fill);
    const skyRampEl = make(styles.sky, sky);
    // A setting sun's wash over the sky, and its spill over the ridges.
    const wash = make(styles.wash);
    wash.style.maskImage = wash.style.webkitMaskImage = WASH_MASK;
    const bodies = [0, 1].map(() => ({ glow: make(styles.glow), disc: make(styles.disc), bloom: make(styles.glow) }));
    const ridgesEl = make(styles.fill);
    const spill = make(styles.wash);
    spill.style.maskImage = spill.style.webkitMaskImage = WASH_MASK;
    const air = make(styles.air);
    const grain = make(styles.grain);
    if (noGrain) grain.style.display = 'none';
    else grain.style.backgroundImage = grainTile();

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
    // While scrolling, a layer whose colours change repaints (rasterises)
    // it, and repainting every ridge's layers each frame costs more than a
    // frame at 120 Hz. So scroll frames stagger them: the ridges take turns
    // (`turn` of `turns`), and the rest keep their last colours, a frame or
    // three old, while every layer still moves each frame. When the scroll
    // settles, one paint brings every colour up to date; switches, resizes
    // and a resting page paint everything, every time.
    let turns = 1;
    let turn = -1; // −1: paint every colour
    let held = false;
    const COLOUR = { backgroundImage: 1, backgroundColor: 1, opacity: 1 };
    const set = (node, props, slot = -1) => {
      let seen = last.get(node);
      if (!seen) last.set(node, (seen = {}));
      const wait = turn >= 0 && slot >= 0 && slot % turns !== turn;
      for (const k in props) {
        if (seen[k] !== props[k]) {
          if (wait && COLOUR[k] && seen[k] !== undefined) {
            held = true;
            continue;
          }
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
        // Solid body below the edge band, then the band (the only masked
        // part: a mask costs an offscreen pass over the element's area).
        const body = make(styles.ridge, shape);
        const fill = make(styles.ridge, shape);
        const glow = make(styles.ridge, shape);
        const beam = make(styles.beam, glow);
        beam.style.maskImage = beam.style.webkitMaskImage = BEAM;
        const rim = make(styles.ridge, shape);
        const meadow = make(styles.meadow, s);
        const haze = make(styles.cam, s);
        const veil = make(styles.veil, haze);
        slots.push({
          root: s,
          shape,
          body,
          fill,
          glow,
          beam,
          rim,
          meadow,
          haze,
          veil,
          drift: make(styles.drift, veil),
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
      const frame = sceneAt({
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
      const { stops, view, haze: hz, M, lit, painted, light } = frame;
      const ground = frame.layout;

      // Sky: its gradient spans the frame's height and holds its last colour
      // below. Under the camera it's redrawn over the strip above the horizon
      // (camera.js skyUnder): frame row y shows the ramp at (y × scale + shift).
      const ramp = skyRamp(stops, r.divs);
      const sk = frame.sky;
      set(sky, { backgroundColor: ramp[ramp.length - 1][1] }, 0);
      set(
        skyRampEl,
        {
          height: px(h),
          backgroundImage: skyGradient({ stops, divs: r.divs }),
          transform: view.rest && !sk.shift ? 'none' : `translateY(${-sk.shift / sk.scale}px) scaleY(${1 / sk.scale})`,
        },
        0,
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
          backgroundImage: `radial-gradient(circle closest-side, ${x.face ? MOON_STOPS(col, k) : glowStops(col, k)})`,
          opacity: String(g / k),
        });
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
          const in0 = 100 / BLOOM_EXT;
          set(b.bloom, {
            display: '',
            width: px(2 * bx),
            height: px(2 * by),
            transform: `translate(${x.x - bx}px, ${x.y - by}px)`,
            backgroundImage: `radial-gradient(ellipse closest-side, ${rgbaF(bc, 0)} ${in0.toFixed(3)}%, ${BLOOM.map(
              ([f, gv]) => `${rgbaF(bc, SET_BLOOM.a * gv)} ${(in0 + f * (100 - in0)).toFixed(3)}%`,
            ).join(', ')})`,
            opacity: String(st * x.alpha),
          });
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
        const strip = {
          display: '',
          width: px(2 * wide),
          height: px(2 * tall),
          transform: `translate(${ws.x - wide}px, ${ws.y - tall}px)`,
          backgroundColor: cssRgb(ws.col),
        };
        set(wash, { ...strip, opacity: String(ws.peak / SET_WASH.a) });
        set(spill, { ...strip, opacity: String((ws.peak * SET_WASH.spill) / SET_WASH.a) });
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
      const paints = frame.paints;
      const at = new Map(ground.ridges.map((rd, i) => [rd.noise, i]));
      // The body's light on the ridges, as the GL renderer (camera.js
      // ridgeLightAt): the shadow scales the fill's colours, the light is
      // screened on in its own layer, and the veils and air glow with it.
      const shade = light.st > 0 ? light.shade.map(c => 1 + (c - 1) * light.sh) : null;
      const litCol = light.st > 0 ? hexToRgb(light.col) : null;
      const mistCol = light.mist;
      const list = masks?.ridges ?? [];
      // A rim under the wash (mistShader.js `rimCol`, `rimA`): the wash in
      // the rim's own coordinates (the camera's scale about (w/2, base)
      // undone), its stops the tinted colour and opacity, over the rim's
      // mask. Without a wash, the rim's flat colour.
      const rimPaint = (p, rd, rc, left, top) => {
        if (!ws) return { backgroundColor: p.rim, backgroundImage: 'none', opacity: String(p.rimA * p.fade) };
        const sc = view.rest ? 1 : rc.s;
        const foot = view.rest ? rd.base : rc.foot;
        const X = w / 2 + (ws.x - w / 2) / sc - left;
        const Y = rd.base + (ws.y - foot) / sc - top;
        return {
          backgroundColor: 'transparent',
          backgroundImage: washGradient(X, Y, ws.rx / sc, ws.ry / sc, gv => {
            const t = rimWash(p.rim, p.rimA, ws.peak * gv, ws.col);
            return rgbaF(t.col, t.a);
          }),
          opacity: String(p.fade),
        };
      };
      const front = ground.ridges.length - 1;
      const meadow = frame.ground;
      // A layer's crop across the frame, in the ridge's own terms: in coarse
      // steps, so a scroll frame mostly only moves the layers (the
      // compositor's job) instead of resizing them (a repaint).
      const cropX = (rd, rc) => {
        const inv = rc.s < 1 ? Math.ceil(1 / rc.s / CROP_STEP - 1e-9) * CROP_STEP : 1;
        const half = (w / 2) * inv + (rc.s < 1 ? 1 : 0);
        return [Math.max(rd.fill.left, w / 2 - half), Math.min(rd.fill.left + rd.fill.width, w / 2 + half)];
      };
      // Hidden ridges skipped, as the GL renderer: below its edge band an
      // opaque ridge covers every ridge behind it, so each is cut (in frame
      // terms) at the nearest such line of the ridges in front.
      const under = new Array(list.length).fill(Infinity);
      for (let j = list.length - 1, line = Infinity; j >= 0; j--) {
        under[j] = line;
        const i = at.get(list[j].noise);
        if (i == null || paints[i].fade < 1) continue;
        const rd = list[j];
        const rc = view.ridges[i];
        const [x0, x1] = cropX(rd, rc);
        const sx0 = w / 2 + (x0 - w / 2) * rc.s;
        const sx1 = w / 2 + (x1 - w / 2) * rc.s;
        if (sx0 > 0 || sx1 < w) continue;
        line = Math.min(line, rc.foot + (rd.fill.top + rd.fill.height - rd.base) * rc.s);
      }
      for (let j = 0; j < list.length; j++) {
        const s = slot(j);
        const rd = list[j];
        s.noise = rd.noise;
        const i = at.get(rd.noise);
        if (i == null) {
          set(s.root, { display: 'none' });
          continue;
        }
        // A ridge coming back into the frame takes this frame's colours.
        const turnOf = last.get(s.root)?.display === 'none' ? -1 : j;
        set(s.root, { display: '' });
        const p = paints[i];
        const rc = view.ridges[i];
        const move = view.rest
          ? { transform: 'none' }
          : {
              transformOrigin: `${w / 2}px ${rd.base}px`,
              transform: `translateY(${rc.foot - rd.base}px) scale(${rc.s})`,
            };
        set(s.shape, move);
        set(s.haze, move);
        // The masks span the widest view; each layer is cut to what this
        // frame shows (in the ridge's own terms: the frame over its scale),
        // since every layer is repainted as the palette moves.
        const { fill, rim, glow } = rd;
        const [x0, x1] = cropX(rd, rc);
        const step = CROP_STEP * h;
        const cut = rd.base + Math.ceil(((Math.min(h, under[j]) - rc.foot) / rc.s + 2) / step) * step;
        const bottom = Math.min(rd.bottom, cut);
        const bandEnd = fill.top + fill.height;
        const mx = `${fill.left - x0}px`;
        const gradient = (from, k = null) => {
          const [a, b, c] = k ? p.fill.map(col => scaled(col, k)) : p.fill;
          return `linear-gradient(${a} ${px(rd.top - from)}, ${b} ${px(rd.top + 0.45 * (rd.base - rd.top) - from)}, ${c} ${px(rd.base - from)})`;
        };
        // The band's last rows are solid, so the body tucks a pixel under it
        // (no hairline where the two meet at a fractional scale).
        set(
          s.body,
          {
            width: px(x1 - x0),
            height: px(Math.max(0, bottom - bandEnd + 1)),
            transform: `translate(${x0}px, ${bandEnd - 1}px)`,
            backgroundImage: gradient(bandEnd - 1, shade),
            opacity: String(p.fade),
          },
          turnOf,
        );
        set(
          s.fill,
          {
            width: px(x1 - x0),
            height: px(fill.height),
            transform: `translate(${x0}px, ${fill.top}px)`,
            backgroundImage: gradient(fill.top, shade),
            maskImage: `url(${fill.url})`,
            webkitMaskImage: `url(${fill.url})`,
            maskSize: `${fill.width}px ${fill.height}px`,
            webkitMaskSize: `${fill.width}px ${fill.height}px`,
            maskPosition: `${mx} 0`,
            webkitMaskPosition: `${mx} 0`,
            opacity: String(p.fade),
          },
          turnOf,
        );
        // The light: its colour times its strength across the frame (in the
        // ridge's own terms: the camera's scale slants it per depth), screened
        // over the unshaded fill, masked by the edge times its falloff below
        // the crest. Over the shaded fill that restores the lit crest. The
        // screen is linear in the light, so the layer holds the fill screened
        // with the light's flat `base`, and the beam over it, the fill
        // screened with its full strength, fades in as exp(−u²) (BEAM): the
        // same colours, in layers that the camera only moves.
        if (litCol) {
          const la = light.la[i];
          const cx = w / 2 + (light.x - w / 2) / rc.s - x0;
          const sw = light.spread / rc.s;
          const L = litCol.map(c => c * la);
          const F = p.fill.map(hexToRgb);
          const lit = k => {
            const [a, b, c] = F.map(f => cssRgb(screen(f, k)));
            return `linear-gradient(${a} ${px(rd.top - glow.top)}, ${b} ${px(rd.top + 0.45 * (rd.base - rd.top) - glow.top)}, ${c} ${px(rd.base - glow.top)})`;
          };
          set(
            s.glow,
            {
              display: '',
              width: px(x1 - x0),
              height: px(Math.max(0, Math.min(glow.height, cut - glow.top))),
              transform: `translate(${x0}px, ${glow.top}px)`,
              backgroundImage: lit(L.map(c => c * light.base)),
              maskImage: `url(${glow.url})`,
              webkitMaskImage: `url(${glow.url})`,
              maskSize: `${glow.width}px ${glow.height}px`,
              webkitMaskSize: `${glow.width}px ${glow.height}px`,
              maskPosition: `${mx} 0`,
              webkitMaskPosition: `${mx} 0`,
              opacity: String(p.fade),
            },
            turnOf,
          );
          set(
            s.beam,
            {
              backgroundImage: lit(L),
              transform: `translateX(${+(cx - 3 * sw).toFixed(2)}px) scaleX(${+((6 * sw) / BEAM_W).toFixed(5)})`,
            },
            turnOf,
          );
        } else set(s.glow, { display: 'none' });
        set(
          s.rim,
          {
            width: px(x1 - x0),
            height: px(rim.height),
            transform: `translate(${x0}px, ${rim.top}px)`,
            ...rimPaint(p, rd, rc, x0, rim.top),
            maskImage: `url(${rim.url})`,
            webkitMaskImage: `url(${rim.url})`,
            maskSize: `${rim.width}px ${rim.height}px`,
            webkitMaskSize: `${rim.width}px ${rim.height}px`,
            maskPosition: `${mx} 0`,
            webkitMaskPosition: `${mx} 0`,
          },
          turnOf,
        );

        // The meadow, in front of every ridge and under the front one's veil.
        if (i === front && meadow) {
          const top = meadow.top;
          set(s.meadow, {
            display: '',
            height: px(h - top),
            transform: `translateY(${top}px)`,
            backgroundImage: `linear-gradient(${meadow.stops.map(([gy, c]) => `${c} ${px(gy - top)}`).join(', ')})`,
          });
        } else set(s.meadow, { display: 'none' });

        // Veil: .9 at the centre, .42 at 55%, 0 at the rim of its ellipse.
        // Past the top its opacity follows the ridge's slot, every veil thins
        // a little (DESCENT_VEIL), and the far ridge's and the distant
        // ranges' more (FAR_VEIL), as in the GL renderer.
        const v = ground.veils[i];
        const va = view.rest
          ? v.a
          : veilAlpha(rc.t, hz, ground.ridges[i].fade) * (1 - FAR_VEIL * (rc.flat ?? 0)) * (1 - DESCENT_VEIL * view.k);
        set(s.veil, {
          width: px(2 * v.rx),
          height: px(2 * v.ry),
          transform: `translate(${v.cx - v.rx}px, ${v.cy - v.ry}px)`,
          opacity: String(va),
        });
        set(
          s.drift,
          {
            backgroundImage: `radial-gradient(ellipse closest-side, ${rgba(mistCol, 0.9)} 0%, ${rgba(mistCol, 0.42)} 55%, ${rgba(mistCol, 0)} 100%)`,
          },
          turnOf,
        );
      }
      animateVeils(list.length);

      // Air: the mist colour rising from 0 to airOpacity over the 14% of the
      // height above the front ridge's foot (the frame's foot at rest), then
      // thinning out over the meadow (as mistShader.js).
      const foot = meadow ? meadow.top : h;
      const airTop = 0.86 * h + (foot - h);
      const A = frame.air;
      set(
        air,
        {
          height: px(h - airTop),
          transform: `translateY(${airTop}px)`,
          backgroundImage:
            foot < h
              ? `linear-gradient(${rgba(mistCol, 0)}, ${rgba(mistCol, A)} ${px(foot - airTop)}, ${rgba(mistCol, 0)})`
              : `linear-gradient(${rgba(mistCol, 0)}, ${rgba(mistCol, A)})`,
        },
        1,
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
      clearTimeout(maskTimer);
      if (first) buildMasks();
      else maskTimer = setTimeout(buildMasks, MASK_DEBOUNCE);
      paint();
    }

    kickRef.current = start;
    // The descent: a scroll frame asks for one paint on the next frame (a
    // switch's clock paints anyway), its colours staggered (see `set`) over
    // as many frames as fit in STAGGER_MS at the display's refresh (the
    // shortest frame seen, so a slow frame never stops the staggering), and
    // one full paint once the scroll has settled.
    let scrollRaf = 0;
    let settle = 0;
    let lastFrame = 0;
    let refresh = Infinity;
    let frames = 0;
    const settled = () => {
      if (!raf) paint();
    };
    const unsubscribe = subscribeDescent(() => {
      if (scrollRaf || raf) return;
      scrollRaf = requestAnimationFrame(now => {
        scrollRaf = 0;
        const dt = now - lastFrame;
        lastFrame = now;
        if (dt > 1) refresh = Math.min(refresh, dt);
        turns = Math.max(1, Math.min(4, Math.round(STAGGER_MS / refresh)));
        turn = frames++ % turns;
        held = false;
        paint();
        turn = -1;
        clearTimeout(settle);
        if (held) settle = setTimeout(() => requestAnimationFrame(settled), SETTLE_MS);
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
      clearTimeout(settle);
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
