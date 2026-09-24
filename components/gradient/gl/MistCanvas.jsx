'use client';

import { useEffect, useRef } from 'react';
import { FRAGMENT, MAX_RIDGES, VERTEX } from './mistShader';
import { CREST_FRAGMENT, CREST_VERTEX } from './crestShader';
import { LAYERS, buildHashTable } from './hashTable';
import {
  airOpacity,
  alternate,
  bakeSky,
  hexToRgb,
  layout,
  mistColour,
  mistOf,
  mix,
  rimColour,
  rimOpacity,
  ridgeBlur,
  ridgeColour,
  ridgeFootMix,
  sampleCrest,
  sunColour,
  veilTiming,
} from './mistGeometry';
import { GEO, beginOrbit, ease, orbitBodies, orbitScene, restX } from '../orbit';
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
 * The MIST atmosphere drawn on the GPU. Same recipe, same maths as the SVG
 * engine (mistGeometry.js), but a frame is one draw call: the CPU recomputes
 * geometry only while the transition is moving, and at rest only the veils'
 * drift uniforms change. `onFail` hands over to the SVG engine if WebGL2 is
 * missing, the shader won't build, or the context is lost.
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
    gl.uniform1i(uniform('uSky'), 0);
    gl.uniform1i(uniform('uCrest'), 1);
    gl.uniform1i(uniform('uGrain'), 2);

    const skyPixels = new Uint8Array(SKY_TEXELS * 4);
    let crest = new Float32Array(0);
    let crestDims = '';

    // ---- state
    let value = targetVector(recipeRef.current); // mounts at rest, like Wl
    let w = 0;
    let h = 0;
    let dirty = true; // geometry / colours need recomputing
    let scene = null; // last layout
    let veilPhase = []; // [drift, breathe] per veil, in cycles
    let lastDrawn = null;
    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let onScreen = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Harness hooks (scripts/README.md): `?grain=0` drops the grain, whose
    // noise is random per load; `?freeze=1` holds the veils at their resting
    // phase (no drift, full opacity), as the SVG engine sits with its CSS
    // animation removed.
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
    // the SVG engine) — bodies, palette keyframes and geometry dials all on
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
        : { ...beginOrbit(sunRecipe, r, geo, shownStops ?? toHexStops(value)), t: 0, e: 0, scene: null };
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
        orbit = null;
        shownStops = null;
        // Landed on the target seed exactly: breathe from here (sin 0 = 0).
        idleT = 0;
      }
      dirty = true;
    }

    const settled = () => {
      if (orbit || recipeRef.current !== sunRecipe) return false;
      const target = targetVector(recipeRef.current);
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
    function ensureHashTable(ridge, N) {
      const g = crestGpu;
      const key = `${w}|${ridge.U}|${ridge.Q}|${ridge.x0}|${ridge.dx}`;
      if (g.table && g.tableKey === key && N >= g.table.nLo && N <= g.table.nHi) return true;
      const r = recipeRef.current;
      const slack = ((r.idle?.seedDrift ?? 0) + 1) * 0.73;
      const seeds = [value[6] * 0.73, mistOf(r.mist).seed * 0.73, N];
      const nLo = Math.min(...seeds) - slack;
      const nHi = Math.max(...seeds) + slack;
      const eAt = x => (x - w / 2) / ridge.U + 0.5;
      const table = buildHashTable(eAt(ridge.x0), eAt(ridge.x0 + ridge.Q * ridge.dx), nLo, nHi);
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
      if (!ensureHashTable(ridge, N)) {
        dropGpuCrests();
        return false;
      }
      const base = new Float32Array(MAX_RIDGES);
      const lift = new Float32Array(MAX_RIDGES);
      for (let i = 0; i < n; i++) {
        base[i] = ridges[i].base;
        lift[i] = ridges[i].L;
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
      for (let i = 0; i < n; i++) sampleCrest(ridges[i], cols, scale, crest, i * cols);
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
      const { ridges } = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect });
      uploadCrest(ridges, Math.min(ridges.length, MAX_RIDGES));
    }

    // Recompute layout, colours and textures from the current spring value.
    function rebuild() {
      const r = recipeRef.current;
      // Mid-switch the palette runs through the target's keyframes (dawn,
      // day…) on the switch's clock, and the ridges are relit from it; at
      // rest it's the spring's, as ever.
      const stops = orbit?.scene ? orbit.scene.stops : toHexStops(value);
      if (orbit?.scene) shownStops = stops;
      const target = mistOf(r.mist);
      builtOffset = seedOffset();
      const mist = { ...target, haze: value[2], height: value[3], sharp: value[4], sun: value[5], seed: value[6] + builtOffset };
      scene = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, crests: !crestGpu });
      // At rest, one body where `layout` put it; mid-switch, both on the arc
      // (whose far end is the target's resting spot — same height, its x).
      const { sun } = scene;
      const lit = orbit?.scene
        ? orbitBodies(orbit, orbit.e, { w, h, sun: { ...sun, x: restX(target.sun, w, h) }, ridges: scene.ridges })
        : [{ ...sun, col: rgbToHex(value, 7), glow: 1, alpha: 1, wash: 0 }];
      // The painted sun's centre, for the harness's hit-target check.
      const host = canvas.parentElement;
      if (host) {
        host.dataset.sunCx = sun.x.toFixed(2);
        host.dataset.sunCy = sun.y.toFixed(2);
        host.dataset.seed = mist.seed.toFixed(4);
      }
      let { ridges } = scene;
      const n = Math.min(ridges.length, MAX_RIDGES);
      if (!gpuCrests(ridges, n, mist.seed, mist.sharp)) {
        if (!ridges[0]?.ys) {
          scene = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect });
          ({ ridges } = scene);
        }
        uploadCrest(ridges, n);
      }

      bakeSky(stops, r.divs, SKY_TEXELS, skyPixels);
      gl.activeTexture(gl.TEXTURE0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SKY_TEXELS, 1, gl.RGBA, gl.UNSIGNED_BYTE, skyPixels);

      const M = mistColour(stops);
      const haze = value[2];
      const f = (k, fn) => {
        const a = new Float32Array(MAX_RIDGES * k);
        for (let i = 0; i < n; i++) a.set([].concat(fn(ridges[i], i)), i * k);
        return a;
      };
      const fills = ridges.slice(0, n).map(rd => {
        const A = ridgeColour(stops, rd.t, haze);
        return [A, mix(A, M, 0.16), mix(A, M, ridgeFootMix(rd.t, haze))];
      });
      gl.uniform2f(uniform('uSize'), w, h);
      gl.uniform2f(uniform('uRes'), canvas.width, canvas.height);
      gl.uniform1f(uniform('uDpr'), canvas.width / w);
      gl.uniform1i(uniform('uBodies'), lit.length);
      gl.uniform3fv(uniform('uBody'), lit.flatMap(b => [b.x, b.y, b.r]).concat([0, 0, 0]).slice(0, 6));
      gl.uniform3fv(uniform('uBodyCol'), lit.flatMap(b => rgb01(b.col)).concat([0, 0, 0]).slice(0, 6));
      gl.uniform1fv(uniform('uBodyGlow'), lit.map(b => b.glow * b.alpha).concat([0]).slice(0, 2));
      gl.uniform1fv(uniform('uBodyA'), lit.map(b => b.alpha).concat([0]).slice(0, 2));
      gl.uniform1fv(uniform('uBodyWash'), lit.map(b => b.wash).concat([0]).slice(0, 2));
      gl.uniform1i(uniform('uCount'), n);
      gl.uniform1fv(uniform('uTop'), f(1, rd => rd.top));
      gl.uniform1fv(uniform('uBase'), f(1, rd => rd.base));
      gl.uniform3fv(uniform('uFillA'), f(3, (_, i) => rgb01(fills[i][0])));
      gl.uniform3fv(uniform('uFillB'), f(3, (_, i) => rgb01(fills[i][1])));
      gl.uniform3fv(uniform('uFillC'), f(3, (_, i) => rgb01(fills[i][2])));
      gl.uniform3fv(uniform('uRimCol'), f(3, rd => rgb01(rimColour(stops, rd.t, haze))));
      gl.uniform1fv(uniform('uRimA'), f(1, rd => rimOpacity(rd.t)));
      gl.uniform1fv(uniform('uBlur'), f(1, rd => (ridgeBlur(rd.t, h) > 0.4 ? ridgeBlur(rd.t, h) : 0)));
      gl.uniform1fv(uniform('uFade'), f(1, rd => rd.fade));
      gl.uniform1f(uniform('uRimW'), Math.max(1, h * 0.0035));
      gl.uniform3fv(uniform('uMist'), rgb01(M));
      gl.uniform1f(uniform('uAirA'), airOpacity(haze));
      gl.uniform1f(uniform('uGrainA'), noGrain ? 0 : (Math.max(0, Math.min(100, r.grain ?? 0)) / 100) * 0.5);
      dirty = false;
      lastDrawn = null;
    }

    // The veils' CSS drift/breathe animations, reproduced on a clock that
    // only runs while the scene is visible (the engine pauses them likewise).
    function veils(dt) {
      const r = recipeRef.current;
      const still = motion.matches || frozen;
      const speed = r.speed;
      const speedScale = speed == null || speed <= 0 ? 1 : 50 / Math.max(1, speed);
      const drift = mistOf(r.mist).drift;
      return scene.veils.slice(0, MAX_RIDGES).map((v, i) => {
        const { duration, amp } = veilTiming(i, drift, w);
        const ph = (veilPhase[i] ??= [0, 0]);
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
      const target = targetVector(recipeRef.current);
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
      if (!orbit && !motion.matches && !frozen && recipeRef.current.idle?.seedDrift) idleT += dt;
      if (dirty) rebuild();
      else if (now - lastCrestAt >= 1000 / IDLE_HZ && Math.abs(seedOffset() - builtOffset) > 1e-5) {
        driftCrests();
        lastCrestAt = now;
        crestMoved = true;
      }
      const vs = veils(dt);
      if (crestMoved || changed(vs)) draw(vs);

      const moving = !settled();
      const drifting = !motion.matches && !frozen;
      if ((moving || drifting) && visible && onScreen) raf = requestAnimationFrame(frame);
    }

    // Like Wl, the clock starts when the loop does, so the first step's dt is
    // the time to the first frame.
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
    motion.addEventListener('change', kick);
    const onLost = e => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      onFail?.(new Error('webgl context lost'));
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
      motion.removeEventListener('change', kick);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteTexture(skyTex);
      gl.deleteTexture(crestTex);
      dropGpuCrests();
      gl.deleteTexture(grainTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [onFail]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
