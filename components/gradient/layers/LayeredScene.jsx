'use client';

import { useEffect, useRef } from 'react';
import {
  airOpacity,
  grainOpacity,
  hexToRgb,
  layout,
  mistColour,
  mistOf,
  ridgePaint,
  sunColour,
  veilSpeedScale,
  veilTiming,
} from '../gl/mistGeometry';
import { MOON_SIZE, moonFace } from '../moonFace';
import { DISC_ALPHA, DISC_LIFT, DISC_WHITE, GLOW_EXTENT, LIMB_STOPS, SUN_GLOW, limbAt } from '../sunLook';
import { beginOrbit, ease, orbitBodies, orbitScene, restX, skyAt, targetGeo } from '../orbit';
import { skyGradient } from '../sky';
import { ridgeMasks } from './ridgeMasks';
import styles from './LayeredScene.module.css';

const MAX_DPR = 2;
const GRAIN_SIZE = 256;
const MASK_DEBOUNCE = 120; // ms after a resize before the masks are rebuilt

const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(',')},${a})`;
// Mixed in gamma-encoded RGB, like the shader's mix() with the sky texture.
const mixRgb = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
const px = v => `${v}px`;

// The sun's two-layer glow and warm limb (sunLook.js) as CSS gradient stops;
// the glow's colour is filled in per frame.
const glowStops = col => SUN_GLOW.map(([x, a]) => `${rgba(col, a)} ${((x / GLOW_EXTENT) * 100).toFixed(3)}%`).join(', ');
const LIMB = `radial-gradient(ellipse closest-side, ${LIMB_STOPS.map(
  r => `rgb(${limbAt(r).map(c => Math.round(c * 255)).join(',')}) ${r * 100}%`,
).join(', ')}, rgb(${limbAt(1).map(c => Math.round(c * 255)).join(',')}) 100%)`;

// The GL renderer's grain (each texel the mean of two uniform draws) as a
// tile, one texel per CSS px.
function grainTile() {
  const c = document.createElement('canvas');
  c.width = GRAIN_SIZE;
  c.height = GRAIN_SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = Math.round(((Math.random() + Math.random()) / 2) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    img.data[i + 3] = 255;
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
    const bodies = [0, 1].map(() => ({ glow: make(styles.glow), disc: make(styles.disc) }));
    const ridgesEl = make(styles.fill);
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
      typeof requestIdleCallback === 'function' ? requestIdleCallback(makeMoon, { timeout: 800 }) : setTimeout(makeMoon, 300);
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
    const slot = i => {
      while (slots.length <= i) {
        const s = make(styles.fill, ridgesEl);
        const fill = make(styles.ridge, s);
        const rim = make(styles.ridge, s);
        const veil = make(styles.veil, s);
        slots.push({ fill, rim, veil, drift: make(styles.drift, veil), anims: null });
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
      ridgeMasks(shape, w, h, dpr, cancelled).then(m => {
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

    function sceneAt(now) {
      const o = orbit;
      if (!o) return { geo: targetGeo(sunRecipe), stops: sunRecipe.stops, e: 1 };
      o.e = ease((now - o.t0) / 1000 / o.dur);
      return { ...orbitScene(o, o.e), e: o.e };
    }

    function start() {
      const r = recipeRef.current;
      if (r === sunRecipe) return;
      const now = performance.now();
      const { geo, stops } = sceneAt(now);
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
    function animateVeils(count) {
      const still = motion.matches || frozen;
      const r = sunRecipe;
      const drift = mistOf(r.mist).drift;
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
        const { duration, amp } = veilTiming(i, drift, w);
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
      const { geo, stops, e } = sceneAt(now);
      const [size, horizon, haze, height, sharp, sunPct] = geo;
      const target = mistOf(r.mist);
      const mist = { ...target, haze, height, sharp, sun: sunPct };
      const scene = layout(w, h, { size, horizon, mist, aspect: r.aspect, crests: false });
      // The ridges and their veils stay the loaded scene's (see `shape`).
      const [gSize, gHorizon, , gHeight, gSharp, , gSeed] = targetGeo(shape);
      const ground = layout(w, h, {
        size: gSize,
        horizon: gHorizon,
        mist: { ...mistOf(shape.mist), haze, height: gHeight, sharp: gSharp, seed: gSeed },
        aspect: shape.aspect,
        crests: false,
      });
      const M = mistColour(stops);

      wrap.dataset.sunCx = scene.sun.x.toFixed(2);
      wrap.dataset.sunCy = scene.sun.y.toFixed(2);
      wrap.dataset.seed = gSeed.toFixed(4);

      set(sky, { backgroundImage: skyGradient({ stops, divs: r.divs }) });

      // The moon: glow at .4 fading linearly to 0 at 3.4r, its face in the
      // disc. The sun: two-layer glow, warm limb, flattened when low
      // (sunLook.js). Discs at .85.
      const lit = o
        ? orbitBodies(o, e, { w, h, sun: { ...scene.sun, x: restX(target.sun, w, h) }, ridges: ground.ridges })
        : [{ ...scene.sun, col: sunColour(stops), face: r.body === 'moon' ? 1 : 0, glow: 1, alpha: 1, wash: 0, squash: 0 }];
      bodies.forEach((b, i) => {
        const x = lit[i];
        if (!x) {
          set(b.glow, { display: 'none' });
          set(b.disc, { display: 'none' });
          return;
        }
        const col = x.wash ? mixRgb(x.col, skyAt(stops, r.divs, x.y / h), x.wash) : x.col;
        const R = x.r * (x.face ? 3.4 : GLOW_EXTENT);
        set(b.glow, {
          display: '',
          width: px(2 * R),
          height: px(2 * R),
          transform: `translate(${x.x - R}px, ${x.y - R}px)`,
          backgroundImage: x.face
            ? `radial-gradient(circle closest-side, ${rgba(col, 0.4)}, ${rgba(col, 0)})`
            : `radial-gradient(circle closest-side, ${glowStops(col)})`,
          opacity: String(x.glow * x.alpha),
        });
        const ry = x.r * (1 - (x.squash ?? 0));
        set(b.disc, {
          display: '',
          width: px(2 * x.r),
          height: px(2 * ry),
          transform: `translate(${x.x - x.r}px, ${x.y - ry}px)`,
          backgroundColor: x.face ? col : mixRgb(col, DISC_WHITE, DISC_LIFT),
          backgroundImage: x.face ? (moon ??= moonTile()) : LIMB,
          opacity: String((x.face ? 0.85 : DISC_ALPHA) * x.alpha),
        });
      });

      // Ridges: the fixed silhouettes, coloured from this frame's palette.
      const paints = masks ? ridgePaint(stops, masks.ridges, haze, h) : [];
      const count = Math.max(ground.ridges.length, masks?.ridges.length ?? 0);
      for (let i = 0; i < count; i++) {
        const s = slot(i);
        const rd = masks?.ridges[i];
        if (!rd) {
          set(s.fill, { display: 'none' });
          set(s.rim, { display: 'none' });
        } else {
          const p = paints[i];
          const { fill, rim } = rd;
          const below = Math.max(0, h - fill.top - fill.height);
          const at = y => px(y - fill.top);
          set(s.fill, {
            display: '',
            width: px(w),
            height: px(h - fill.top),
            transform: `translateY(${fill.top}px)`,
            backgroundImage: `linear-gradient(${p.fill[0]} ${at(rd.top)}, ${p.fill[1]} ${at(rd.top + 0.45 * (rd.base - rd.top))}, ${p.fill[2]} ${at(rd.base)})`,
            maskImage: `url(${fill.url}), linear-gradient(#000, #000)`,
            webkitMaskImage: `url(${fill.url}), linear-gradient(#000, #000)`,
            maskSize: `${w}px ${fill.height}px, ${w}px ${below}px`,
            webkitMaskSize: `${w}px ${fill.height}px, ${w}px ${below}px`,
            maskPosition: `0 0, 0 ${fill.height}px`,
            webkitMaskPosition: `0 0, 0 ${fill.height}px`,
            opacity: String(p.fade),
          });
          set(s.rim, {
            display: '',
            width: px(w),
            height: px(rim.height),
            transform: `translateY(${rim.top}px)`,
            backgroundColor: p.rim,
            maskImage: `url(${rim.url})`,
            webkitMaskImage: `url(${rim.url})`,
            maskSize: '100% 100%',
            webkitMaskSize: '100% 100%',
            opacity: String(p.rimA * p.fade),
          });
        }

        // Veil: .9 at the centre, .42 at 55%, 0 at the rim of its ellipse.
        const v = ground.veils[i];
        if (!v) {
          set(s.veil, { display: 'none' });
          continue;
        }
        set(s.veil, {
          display: '',
          width: px(2 * v.rx),
          height: px(2 * v.ry),
          transform: `translate(${v.cx - v.rx}px, ${v.cy - v.ry}px)`,
          opacity: String(v.a * ground.ridges[i].fade),
        });
        set(s.drift, {
          backgroundImage: `radial-gradient(ellipse closest-side, ${rgba(M, 0.9)} 0%, ${rgba(M, 0.42)} 55%, ${rgba(M, 0)} 100%)`,
        });
      }
      animateVeils(ground.veils.length);

      // Air: the mist colour rising from 0 to airOpacity over the bottom 14%.
      set(air, {
        height: px(0.14 * h),
        transform: `translateY(${0.86 * h}px)`,
        backgroundImage: `linear-gradient(${rgba(M, 0)}, ${rgba(M, airOpacity(haze))})`,
      });
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
