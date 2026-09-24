'use client';

import { useEffect, useRef } from 'react';
import { FRAGMENT, MAX_RIDGES, VERTEX } from './mistShader';
import { CREST_FRAGMENT, CREST_VERTEX } from './crestShader';
import { LAYERS, buildHashTable } from './hashTable';
import {
  airOpacity,
  alternate,
  bakeSky,
  crestExtension,
  grainOpacity,
  hexToRgb,
  layout,
  mistColour,
  mistOf,
  ridgePaint,
  rimWidth,
  sampleCrest,
  sunColour,
  veilAlpha,
  veilSpeedScale,
  veilTiming,
} from './mistGeometry';
import { MOON_SIZE, moonFace } from '../moonFace';
import { GEO, beginOrbit, ease, orbitBodies, orbitScene, restX } from '../orbit';
import {
  WIND,
  bodyAt,
  descentAt,
  descentWidest,
  frameAt,
  groundPaint,
  meadowOf,
  scrollPalette,
  scrollPaletteSwitch,
  veilAt,
} from '../camera';
import { getDescent, subscribeDescent } from '../../scroll/descent';
import styles from './MistCanvas.module.css';

const SKY_TEXELS = 1024;
const GRAIN_SIZE = 256;
const MAX_DPR = 2;
const IDLE_HZ = 60; // cap on idle-drift crest updates per second

// Everything the transition springs, in the SVG engine's order (its `Wl`
// call): geometry dials, then the sun colour, then each colour stop, colours
// as three 0–255 channels.
//
// The sun colour is springed rather than derived per frame: `sunColour` picks
// the brightest stop and branches on a luminance threshold, so computing it
// from in-between stops made the sun jump colour mid-switch. Springing the
// target scene's sun colour blends it on the same clock and is identical at
// rest.
const STOPS_AT = 10;
function targetVector(recipe) {
  const m = mistOf(recipe.mist);
  return [
    recipe.size ?? 50,
    recipe.glintHorizon ?? 0.42,
    m.haze,
    m.height,
    m.sharp,
    m.sun,
    m.seed,
    ...hexToRgb(sunColour(recipe.stops)),
    ...recipe.stops.flatMap(hexToRgb),
  ];
}

const toHexStops = v => {
  const out = [];
  for (let i = STOPS_AT; i < v.length; i += 3) out.push(rgbToHex(v, i));
  return out;
};

function rgbToHex(v, i) {
  const c = [v[i], v[i + 1], v[i + 2]].map(x => Math.max(0, Math.min(255, Math.round(x))));
  return `#${c.map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

const rgb01 = hex => hexToRgb(hex).map(c => c / 255);

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}

// Both programs draw the same fullscreen triangle, so `aPos` is pinned to
// attribute 0 in each and one vertex setup serves them both.
function createProgram(gl, vs = VERTEX, fs = FRAGMENT) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

function texture(gl, filter) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

// The engine's grain: each texel the mean of two uniform draws, so it
// clusters around mid-grey (neutral under `overlay`).
function grainTexels() {
  const px = new Uint8Array(GRAIN_SIZE * GRAIN_SIZE);
  for (let i = 0; i < px.length; i++) px[i] = Math.round(((Math.random() + Math.random()) / 2) * 255);
  return px;
}

/**
 * The MIST atmosphere drawn on the GPU (maths in mistGeometry.js): a frame is
 * one draw call, the CPU recomputes geometry only while the transition is
 * moving, and at rest only the veils' drift uniforms change. `onFail` hands
 * over to the layered fallback if WebGL2 is missing or the shader won't
 * build, or (with `err.lost`) if the context is lost.
 */
export default function MistCanvas({ recipe, onFail }) {
  const canvasRef = useRef(null);
  const recipeRef = useRef(recipe);
  const kickRef = useRef(() => {});

  // New recipe → new spring target; the running loop picks it up.
  useEffect(() => {
    recipeRef.current = recipe;
    kickRef.current();
  }, [recipe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    let gl;
    let prog;
    try {
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
      if (!gl) throw new Error('webgl2 unavailable');
      prog = createProgram(gl);
    } catch (err) {
      onFail?.(err);
      return undefined;
    }

    // ---- GPU resources
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    const uniform = name => (U[name] ??= gl.getUniformLocation(prog, name));

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.activeTexture(gl.TEXTURE0);
    const skyTex = texture(gl, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SKY_TEXELS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.activeTexture(gl.TEXTURE1);
    const crestTex = texture(gl, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE2);
    const grainTex = texture(gl, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, GRAIN_SIZE, GRAIN_SIZE, 0, gl.RED, gl.UNSIGNED_BYTE, grainTexels());
    gl.activeTexture(gl.TEXTURE4);
    const moonTex = texture(gl, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, MOON_SIZE, MOON_SIZE, 0, gl.RED, gl.UNSIGNED_BYTE, moonFace());
    gl.uniform1i(uniform('uMoon'), 4);
    gl.uniform1i(uniform('uSky'), 0);
    gl.uniform1i(uniform('uCrest'), 1);
    gl.uniform1i(uniform('uGrain'), 2);

    const skyPixels = new Uint8Array(SKY_TEXELS * 4);
    let crest = new Float32Array(0);
    let crestDims = '';

    // ---- state
    let value = targetVector(recipeRef.current); // mounts at rest, like Wl
    // Switches only move the seed forward (orbit.js SEED_CYCLE); this is how
    // far the resting seed has got past the recipe's. 0 on every load.
    let seedShift = 0;
    const targetNow = () => {
      const t = targetVector(recipeRef.current);
      t[6] += seedShift;
      return t;
    };
    let w = 0;
    let h = 0;
    let dirty = true; // geometry / colours need recomputing
    let scene = null; // last layout
    let veilPhase = []; // [drift, breathe] per veil, in cycles
    let lastDrawn = null;
    // The descent camera (../camera.js) for the last rebuild: per-ridge
    // scale and foot, the sky's shift, the meadow's top. Read straight from
    // the descent store each rebuild, never sprung.
    let view = null;
    let groundShown = false;
    let windPhase = 0;
    let lastWindAt = -Infinity;
    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let onScreen = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Harness hooks (scripts/README.md): `?grain=0` drops the grain, whose
    // noise is random per load; `?freeze=1` holds the veils at their resting
    // phase (no drift, full opacity), as the layered renderer does.
    const params = new URLSearchParams(window.location.search);
    const noGrain = params.get('grain') === '0';
    const frozen = params.get('freeze') === '1';

    // Idle drift: at rest the seed breathes ±`idle.seedDrift` around its
    // target on a `idle.period`-second sine, so the ridges slowly shift. Only
    // the crest outlines depend on the seed, so a drift step re-samples and
    // re-uploads the crest texture and nothing else, at most IDLE_HZ times a
    // second. Off under reduced motion and `?freeze=1`; its clock, like the
    // veils', only runs while the scene is on screen.
    let idleT = 0;
    let builtOffset = 0;
    let lastCrestAt = -Infinity;
    // `?driftAt=0.25` pins the drift offset (harness: compare crest paths
    // mid-drift); it applies even with `?freeze=1`.
    const driftAt = params.has('driftAt') ? Number(params.get('driftAt')) : null;
    const seedOffset = () => {
      if (driftAt != null) return driftAt;
      const idle = recipeRef.current.idle;
      // Mid-switch the drift is folded into the switch's own start seed.
      if (orbit || !idle?.seedDrift || motion.matches || frozen) return 0;
      return idle.seedDrift * Math.sin((2 * Math.PI * idleT) / (idle.period ?? 60));
    };

    // A switch: the sky turns between the scenes (../orbit.js, shared with
    // the layered renderer) — bodies, palette keyframes and geometry dials all on
    // one ease-in-out. Here it runs on this loop's clock, so like the veils
    // it pauses while the scene is hidden.
    let sunRecipe = recipeRef.current;
    let orbit = null; // beginOrbit(…) + { t, e, scene }
    let shownStops = null; // the palette last drawn mid-switch
    // Called before the spring steps, so the switch starts from exactly what
    // was last painted — the idle drift's seed included — not from a frame
    // the spring has already moved.
    function startOrbit() {
      const r = recipeRef.current;
      if (r === sunRecipe) return;
      const geo = value.slice(0, GEO);
      geo[6] += builtOffset;
      orbit = motion.matches
        ? null
        : { ...beginOrbit(sunRecipe, r, geo, shownStops ?? toHexStops(value), { forward: true }), t: 0, e: 0, scene: null };
      sunRecipe = r;
      dirty = true;
    }

    function stepOrbit(dt) {
      if (!orbit) return;
      orbit.t = Math.min(orbit.dur, orbit.t + dt);
      orbit.e = ease(orbit.t / orbit.dur);
      orbit.scene = orbitScene(orbit, orbit.e);
      // The geometry dials leave the spring for the switch's clock.
      for (let i = 0; i < GEO; i++) value[i] = orbit.scene.geo[i];
      if (orbit.t >= orbit.dur) {
        // The scene now rests on the switch's seed, not the recipe's.
        seedShift = orbit.seedTo - mistOf(orbit.next.mist).seed;
        orbit = null;
        shownStops = null;
        // Landed on the target seed exactly: breathe from here (sin 0 = 0).
        idleT = 0;
      }
      dirty = true;
    }

    const settled = () => {
      if (orbit || recipeRef.current !== sunRecipe) return false;
      const target = targetNow();
      return target.every((t, i) => t === value[i]);
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      if (!nw || !nh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      w = nw;
      h = nh;
      dirty = true;
      lastDrawn = null;
    }

    // ---- GPU crest pass (crestShader.js)
    // Needs float render targets (EXT_color_buffer_float). Without them, or
    // with `?crest=cpu`, or if the target/table can't be built, the crests
    // are computed on the CPU (layout's control points + sampleCrest) and
    // uploaded, as before. `data-crest` on the host says which path ran.
    let crestGpu = null;
    if (params.get('crest') !== 'cpu' && gl.getExtension('EXT_color_buffer_float')) {
      try {
        const cprog = createProgram(gl, CREST_VERTEX, CREST_FRAGMENT);
        const CU = {};
        gl.useProgram(cprog);
        gl.activeTexture(gl.TEXTURE3);
        const hashTex = texture(gl, gl.NEAREST);
        gl.uniform1i(gl.getUniformLocation(cprog, 'uHash'), 3);
        crestGpu = {
          prog: cprog,
          u: name => (CU[name] ??= gl.getUniformLocation(cprog, name)),
          hashTex,
          fbo: gl.createFramebuffer(),
          table: null,
          tableKey: '',
          targetCols: 0,
        };
      } catch {
        crestGpu = null;
      }
      gl.useProgram(prog);
    }
    const crestPath = () => {
      if (canvas.parentElement) canvas.parentElement.dataset.crest = crestGpu ? 'gpu' : 'cpu';
    };
    crestPath();

    const dropGpuCrests = () => {
      if (!crestGpu) return;
      gl.deleteProgram(crestGpu.prog);
      gl.deleteTexture(crestGpu.hashTex);
      gl.deleteFramebuffer(crestGpu.fbo);
      crestGpu = null;
      crestDims = '';
      crestPath();
    };

    // The hash table covers this frame's x range for noise offsets from the
    // current spring value to the target seed, ± the idle drift. It's rebuilt
    // only when the frame changes or the offset leaves that range.
    // It also covers the widest noise range the descent can need (every
    // ridge at its smallest, about = 1), so scrolling never rebuilds it.
    function ensureHashTable(ridge, N, ext) {
      const g = crestGpu;
      const key = `${w}|${ridge.U}|${ridge.Q}|${ridge.x0}|${ridge.dx}|${ext}`;
      if (g.table && g.tableKey === key && N >= g.table.nLo && N <= g.table.nHi) return true;
      const r = recipeRef.current;
      const slack = ((r.idle?.seedDrift ?? 0) + 1) * 0.73;
      const seeds = [value[6] * 0.73, (mistOf(r.mist).seed + seedShift) * 0.73, N];
      const nLo = Math.min(...seeds) - slack;
      const nHi = Math.max(...seeds) + slack;
      const eAt = x => (x - w / 2) / ridge.U + 0.5;
      const table = buildHashTable(eAt(ridge.x0 - ext * ridge.dx), eAt(ridge.x0 + (ridge.Q + ext) * ridge.dx), nLo, nHi);
      if (table.width > gl.getParameter(gl.MAX_TEXTURE_SIZE)) return false;
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, g.hashTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, table.width, table.rows, 0, gl.RED, gl.FLOAT, table.data);
      g.table = table;
      g.tableKey = key;
      return true;
    }

    // Render the crests for `ridges` at noise seed `seed` into the crest
    // texture. Returns false (after switching to the CPU path) if the float
    // target or the hash table can't be set up.
    function gpuCrests(ridges, n, seed, sharp) {
      const rc = view.ridges;
      const g = crestGpu;
      if (!g || !n) return false;
      const cols = canvas.width;
      if (g.targetCols !== cols) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, crestTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cols, MAX_RIDGES, 0, gl.RED, gl.FLOAT, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, g.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, crestTex, 0);
        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (!ok) {
          dropGpuCrests();
          return false;
        }
        g.targetCols = cols;
        crestDims = '';
      }
      const N = seed * 0.73;
      const ridge = ridges[0];
      if (!ensureHashTable(ridge, N, view.ext)) {
        dropGpuCrests();
        return false;
      }
      const base = new Float32Array(MAX_RIDGES);
      const lift = new Float32Array(MAX_RIDGES);
      const scale = new Float32Array(MAX_RIDGES).fill(1);
      const foot = new Float32Array(MAX_RIDGES);
      const ext = new Int32Array(MAX_RIDGES);
      // One row per ridge, by its noise index (crestShader.js).
      for (let i = 0; i < n; i++) {
        const k = ridges[i].noise ?? i;
        base[k] = ridges[i].base;
        lift[k] = ridges[i].L;
        scale[k] = rc[i].s;
        foot[k] = rc[i].foot;
        ext[k] = crestExtension(rc[i].s, w, h, ridge.dx);
      }
      gl.useProgram(g.prog);
      gl.uniform1i(g.u('uOrigin'), g.table.origin);
      gl.uniform1f(g.u('uW'), w);
      gl.uniform1f(g.u('uU'), ridge.U);
      gl.uniform1f(g.u('uX0'), ridge.x0);
      gl.uniform1f(g.u('uDx'), ridge.dx);
      gl.uniform1i(g.u('uLast'), ridge.Q);
      gl.uniform1f(g.u('uDpr'), cols / w);
      gl.uniform1f(g.u('uN'), N);
      gl.uniform1f(g.u('uSharp'), sharp / 100);
      gl.uniform1fv(g.u('uBase'), base);
      gl.uniform1fv(g.u('uL'), lift);
      gl.uniform1fv(g.u('uS'), scale);

      gl.uniform1fv(g.u('uFoot'), foot);
      gl.uniform1iv(g.u('uExt'), ext);
      gl.bindFramebuffer(gl.FRAMEBUFFER, g.fbo);
      gl.viewport(0, 0, cols, n);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(prog);
      return true;
    }

    // Sample each ridge's crest per device column into the crest texture.
    function uploadCrest(ridges, n) {
      const cols = canvas.width;
      if (crest.length !== cols * n) crest = new Float32Array(cols * n);
      const scale = cols / w;
      // Rows by noise index, as the GPU pass writes them.
      for (let i = 0; i < n; i++) sampleCrest(ridges[i], cols, scale, crest, (ridges[i].noise ?? i) * cols, view.ridges[i]);
      gl.activeTexture(gl.TEXTURE1);
      if (crestDims !== `${cols}x${n}`) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cols, n, 0, gl.RED, gl.FLOAT, crest);
        crestDims = `${cols}x${n}`;
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, n, gl.RED, gl.FLOAT, crest);
      }
    }

    // An idle drift step: new seed offset, same everything else, so only the
    // crests are recomputed. Ridge count, tops and bases don't depend on seed.
    function driftCrests() {
      const r = recipeRef.current;
      builtOffset = seedOffset();
      const host = canvas.parentElement;
      if (host) host.dataset.seed = (value[6] + builtOffset).toFixed(4);
      // GPU path: only the seed changed, so the last layout's ridges serve as is.
      const count = Math.min(scene.ridges.length, MAX_RIDGES);
      if (gpuCrests(scene.ridges, count, value[6] + builtOffset, value[4])) return;
      const mist = { ...mistOf(r.mist), haze: value[2], height: value[3], sharp: value[4], sun: value[5], seed: value[6] + builtOffset };
      const scales = view.rest ? null : view.ridges.map(rc => rc.s);
      const { ridges } = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, scales, ranges: view.ranges });
      uploadCrest(ridges, Math.min(ridges.length, MAX_RIDGES));
    }

    // Recompute layout, colours and textures from the current spring value
    // and the descent's progress.
    function rebuild() {
      const r = recipeRef.current;
      const { about } = getDescent();
      // Mid-switch the palette runs through the target's keyframes (dawn,
      // day…) on the switch's clock, and the ridges are relit from it; at
      // rest it's the spring's, as ever. The descent's time of day goes on
      // top (camera.js): both scenes' overlays, blended on the switch.
      const base = orbit?.scene ? orbit.scene.stops : toHexStops(value);
      if (orbit?.scene) shownStops = base;
      const stops = orbit?.scene ? scrollPaletteSwitch(base, orbit.prev, orbit.next, about, orbit.e) : scrollPalette(base, r, about);
      const target = mistOf(r.mist);
      builtOffset = seedOffset();
      const mist = { ...target, haze: value[2], height: value[3], sharp: value[4], sun: value[5], seed: value[6] + builtOffset };
      // The camera (camera.js, the 0.2.1 descent): a pure function of
      // `about`, mid-switch blended between the scenes' amounts. Past the top
      // the world ranges join the layout (under the frame, or sunk behind
      // the far ridge), and the camera brings them in by geometry alone. The
      // hash table is sized for the widest reach, so scrolling never
      // rebuilds it.
      const cam = descentAt(about, r, { reduced: motion.matches, from: orbit?.prev, e: orbit ? orbit.e : 1 });
      scene = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, crests: false, ranges: cam.ranges });
      view = frameAt(scene, h, cam);
      view.ranges = cam.ranges;
      view.haze = value[2];
      const widest = descentWidest(scene, h, orbit ? [r, orbit.prev] : [r]);
      view.ext = crestExtension(widest, w, h, scene.ridges[0]?.dx ?? 1);
      // At rest, one body where `layout` put it; mid-switch, both on the arc
      // (whose far end is the target's resting spot — same height, its x).
      // Then the descent moves them: up with the sky, and each its own way.
      const { sun } = scene;
      // (The recipe's own ranges, not the descent's extra far ones.)
      const own = scene.ridges.filter(rd => !rd.extra);
      const hidden = own[0] ? own[0].base + 1.25 * sun.r : sun.y + 3 * sun.r;
      const place = { w, h, hidden, restY: sun.y };
      const lit = orbit?.scene
        ? orbitBodies(orbit, orbit.e, { w, h, sun: { ...sun, x: restX(target.sun, w, h) }, ridges: own }).map((b, i) =>
            bodyAt(b, i === 0 ? orbit.prev : orbit.next, view, { ...place, look: false }),
          )
        : [bodyAt({ ...sun, col: rgbToHex(value, 7), face: r.body === 'moon' ? 1 : 0, glow: 1, alpha: 1, wash: 0, squash: 0 }, r, view, place)];
      // The painted sun's centre, for the harness's hit-target check (and a
      // hit target that follows it under scroll): at rest the body as
      // painted; mid-switch where it will land, moved by the descent too.
      const host = canvas.parentElement;
      if (host) {
        const painted = orbit?.scene ? bodyAt({ ...sun, x: restX(target.sun, w, h), face: 1 }, r, view, place) : lit[0];
        host.dataset.sunCx = painted.x.toFixed(2);
        host.dataset.sunCy = painted.y.toFixed(2);
        host.dataset.seed = mist.seed.toFixed(4);
      }
      let { ridges } = scene;
      const n = Math.min(ridges.length, MAX_RIDGES);
      if (!gpuCrests(ridges, n, mist.seed, mist.sharp)) {
        if (!ridges[0]?.ys || !view.rest) {
          const scales = view.rest ? null : view.ridges.map(rc => rc.s);
          ({ ridges } = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, scales, ranges: cam.ranges }));
        }
        uploadCrest(ridges, n);
      }

      bakeSky(stops, r.divs, SKY_TEXELS, skyPixels);
      gl.activeTexture(gl.TEXTURE0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SKY_TEXELS, 1, gl.RGBA, gl.UNSIGNED_BYTE, skyPixels);

      const M = mistColour(stops);
      const haze = value[2];
      // Past the top, each ridge is lit for the slot it has reached (its `t`).
      const lit_ = view.rest ? ridges.slice(0, n) : ridges.slice(0, n).map((rd, i) => ({ ...rd, t: view.ridges[i].t }));
      const paint = ridgePaint(stops, lit_, haze, h);
      const f = (k, fn) => {
        const a = new Float32Array(MAX_RIDGES * k);
        for (let i = 0; i < n; i++) a.set([].concat(fn(ridges[i], i)), i * k);
        return a;
      };
      const rc = view.ridges;
      gl.uniform2f(uniform('uSize'), w, h);
      gl.uniform2f(uniform('uRes'), canvas.width, canvas.height);
      gl.uniform1f(uniform('uDpr'), canvas.width / w);
      gl.uniform1i(uniform('uBodies'), lit.length);
      gl.uniform3fv(uniform('uBody'), lit.flatMap(b => [b.x, b.y, b.r]).concat([0, 0, 0]).slice(0, 6));
      gl.uniform3fv(uniform('uBodyCol'), lit.flatMap(b => rgb01(b.col)).concat([0, 0, 0]).slice(0, 6));
      gl.uniform1fv(uniform('uBodyGlow'), lit.map(b => b.glow * b.alpha).concat([0]).slice(0, 2));
      gl.uniform1fv(uniform('uBodyA'), lit.map(b => b.alpha).concat([0]).slice(0, 2));
      gl.uniform1fv(uniform('uBodyWash'), lit.map(b => b.wash).concat([0]).slice(0, 2));
      gl.uniform1fv(uniform('uBodyFace'), lit.map(b => b.face).concat([0]).slice(0, 2));
      gl.uniform1fv(uniform('uBodySquash'), lit.map(b => b.squash).concat([0]).slice(0, 2));
      gl.uniform1i(uniform('uCount'), n);
      gl.uniform1iv(uniform('uCrestRow'), Int32Array.from({ length: MAX_RIDGES }, (_, i) => (i < n ? (ridges[i].noise ?? i) : 0)));
      // A ridge's fill gradient runs from its top to its base: both moved
      // with it (identities at rest).
      gl.uniform1fv(uniform('uTop'), f(1, (rd, i) => (view.rest ? rd.top : rc[i].foot - rd.L * rc[i].s)));
      gl.uniform1fv(uniform('uBase'), f(1, (rd, i) => (view.rest ? rd.base : rc[i].foot)));
      gl.uniform1fv(uniform('uScale'), f(1, (_, i) => rc[i].s));
      gl.uniform3fv(uniform('uFillA'), f(3, (_, i) => rgb01(paint[i].fill[0])));
      gl.uniform3fv(uniform('uFillB'), f(3, (_, i) => rgb01(paint[i].fill[1])));
      gl.uniform3fv(uniform('uFillC'), f(3, (_, i) => rgb01(paint[i].fill[2])));
      gl.uniform3fv(uniform('uRimCol'), f(3, (_, i) => rgb01(paint[i].rim)));
      gl.uniform1fv(uniform('uRimA'), f(1, (_, i) => paint[i].rimA));
      // The shader scales blur by the ridge's scale; the descent's blur is
      // already its slot's, so hand it over unscaled.
      gl.uniform1fv(uniform('uBlur'), f(1, (_, i) => (view.rest ? paint[i].blur : paint[i].blur / view.ridges[i].s)));
      gl.uniform1fv(uniform('uFade'), f(1, (_, i) => paint[i].fade));
      gl.uniform1f(uniform('uRimW'), rimWidth(h));
      gl.uniform3fv(uniform('uMist'), rgb01(M));
      gl.uniform1f(uniform('uAirA'), airOpacity(haze));
      gl.uniform1f(uniform('uGrainA'), noGrain ? 0 : grainOpacity(r));
      // The sky and the meadow.
      gl.uniform1f(uniform('uSkyShift'), view.shift);
      gl.uniform1f(uniform('uHorizon'), view.horizon);
      const ground = n ? groundPaint(stops, meadowOf(orbit ? orbit.prev : r, r, orbit ? orbit.e : 1), paint[n - 1].fill[2], view, h, haze) : null;
      groundShown = !!ground;
      gl.uniform1f(uniform('uFront'), ground ? ground.top : h);
      if (ground) {
        gl.uniform4f(uniform('uGroundY'), ...ground.stops.map(([y]) => y));
        gl.uniform3fv(uniform('uGroundCol'), ground.stops.flatMap(([, c]) => rgb01(c)));
      }
      setWind();
      dirty = false;
      lastDrawn = null;
    }

    // The wind over the meadow: its phase runs on this loop's clock while
    // the meadow shows (still under reduced motion; none under `?freeze=1`,
    // so the harness compares a still meadow).
    function setWind() {
      gl.uniform3f(uniform('uWind'), groundShown && !frozen ? WIND.amp : 0, WIND.bands, windPhase % 1);
    }

    // The veils' CSS drift/breathe animations, reproduced on a clock that
    // only runs while the scene is visible (the engine pauses them likewise).
    function veils(dt) {
      const r = recipeRef.current;
      const still = motion.matches || frozen;
      const speedScale = veilSpeedScale(r.speed);
      const drift = mistOf(r.mist).drift;
      return scene.veils.slice(0, MAX_RIDGES).map((v0, i) => {
        // Each veil moves and scales with its ridge (camera.js), drift and all.
        const rc = view.ridges[i];
        let v = rc ? veilAt(v0, scene.ridges[i], rc, w) : v0;
        // Its opacity follows the ridge's slot as it slides back.
        if (rc && !view.rest) v = { ...v, a: veilAlpha(rc.t, view.haze, scene.ridges[i].fade) };
        // Timed by the ridge's own index, so its drift carries on as ranges join.
        const k = scene.ridges[i].noise ?? i;
        const { duration, amp: amp0 } = veilTiming(k, drift, w);
        const amp = rc && rc.s !== 1 ? amp0 * rc.s : amp0;
        const ph = (veilPhase[k] ??= [0, 0]);
        if (!still && dt > 0) {
          ph[0] += dt / (duration * speedScale);
          ph[1] += dt / (duration * 0.55 * speedScale);
        }
        return still
          ? [v.cx, v.cy, v.rx, v.ry, v.a]
          : [v.cx - amp + 2 * amp * alternate(ph[0]), v.cy, v.rx, v.ry, v.a * (0.6 + 0.4 * alternate(ph[1]))];
      });
    }

    function draw(vs) {
      const pos = new Float32Array(MAX_RIDGES * 4);
      const alpha = new Float32Array(MAX_RIDGES);
      vs.forEach((v, i) => {
        pos.set(v.slice(0, 4), i * 4);
        alpha[i] = v[4];
      });
      gl.uniform4fv(uniform('uVeil'), pos);
      gl.uniform1fv(uniform('uVeilA'), alpha);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      lastDrawn = vs;
    }

    // Redraw at rest only once a veil has moved a visible amount.
    const changed = vs =>
      !lastDrawn ||
      vs.some((v, i) => Math.abs(v[0] - lastDrawn[i][0]) * (canvas.width / w) > 0.2 || Math.abs(v[4] - lastDrawn[i][4]) > 0.002);

    function frame(now) {
      raf = 0;
      if (!w) resize();
      if (!w) return;
      // dt exactly as the engine's Wl: seconds, clamped to [.001, .05].
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      startOrbit();
      // The engine's spring (Wl): exponential smoothing at springRate.
      const target = targetNow();
      if (!settled()) {
        if (motion.matches) {
          // Reduced motion: the switch is a cut.
          value = target;
        } else {
          const k = recipeRef.current.transition?.springRate ?? 2;
          const u = 1 - Math.exp(-k * dt);
          let done = true;
          const next = value.map((v, i) => {
            const x = v + (target[i] - v) * u;
            if (Math.abs(target[i] - x) > 8e-4 * Math.max(1, Math.abs(target[i]))) done = false;
            return x;
          });
          value = done ? target : next;
        }
        dirty = true;
      }
      stepOrbit(dt);

      let crestMoved = false;
      // The idle drift (the ridges' slow breathing) runs at every scroll
      // position, the same as at the top: the scroll itself only moves and
      // scales the ridges.
      if (!orbit && !motion.matches && !frozen && recipeRef.current.idle?.seedDrift) idleT += dt;
      if (groundShown && !motion.matches && !frozen) windPhase += dt * WIND.speed;
      if (dirty) rebuild();
      else if (now - lastCrestAt >= 1000 / IDLE_HZ && Math.abs(seedOffset() - builtOffset) > 1e-5) {
        driftCrests();
        lastCrestAt = now;
        crestMoved = true;
      }
      // The wind over the meadow redraws at most IDLE_HZ times a second.
      let windMoved = false;
      if (!dirty && groundShown && !frozen && !motion.matches && now - lastWindAt >= 1000 / IDLE_HZ) {
        setWind();
        lastWindAt = now;
        windMoved = true;
      }
      const vs = veils(dt);
      if (crestMoved || windMoved || changed(vs)) draw(vs);

      const moving = !settled();
      const drifting = !motion.matches && !frozen;
      if ((moving || drifting) && visible && onScreen) raf = requestAnimationFrame(frame);
    }

    // Like Wl, the clock starts when the loop does, so the first step's dt is
    // the time to the first view.
    const kick = () => {
      if (!raf && visible && onScreen) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    kickRef.current = kick;

    const ro = new ResizeObserver(() => {
      resize();
      kick();
    });
    ro.observe(canvas);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            kick();
          });
    io?.observe(canvas);
    const onVisibility = () => {
      visible = !document.hidden;
      kick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // Motion preference changes the camera's reach (camera.js REDUCED_CAMERA).
    const onMotion = () => {
      dirty = true;
      kick();
    };
    motion.addEventListener('change', onMotion);
    // The descent: a scroll frame only marks the scene for a rebuild (new
    // uniforms and one crest pass) and asks for a view.
    const unsubscribe = subscribeDescent(() => {
      dirty = true;
      kick();
    });
    const onLost = e => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      onFail?.(Object.assign(new Error('webgl context lost'), { lost: true }));
    };
    canvas.addEventListener('webglcontextlost', onLost);

    resize();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      kickRef.current = () => {};
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      unsubscribe();
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteTexture(skyTex);
      gl.deleteTexture(crestTex);
      dropGpuCrests();
      gl.deleteTexture(grainTex);
      gl.deleteTexture(moonTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [onFail]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
