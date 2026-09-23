'use client';

import { useEffect, useRef } from 'react';
import { FRAGMENT, MAX_RIDGES, VERTEX } from './mistShader';
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
import styles from './MistCanvas.module.css';

const SKY_TEXELS = 1024;
const GRAIN_SIZE = 256;
const MAX_DPR = 2;

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

function createProgram(gl) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
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

    const settled = () => {
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

    // Recompute layout, colours and textures from the current spring value.
    function rebuild() {
      const r = recipeRef.current;
      const stops = toHexStops(value);
      const target = mistOf(r.mist);
      const mist = { ...target, haze: value[2], height: value[3], sharp: value[4], sun: value[5], seed: value[6] };
      scene = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect });
      const { ridges, sun } = scene;
      // The painted sun's centre, for the harness's hit-target check.
      const host = canvas.parentElement;
      if (host) {
        host.dataset.sunCx = sun.x.toFixed(2);
        host.dataset.sunCy = sun.y.toFixed(2);
      }
      const n = Math.min(ridges.length, MAX_RIDGES);

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
      gl.uniform3f(uniform('uSun'), sun.x, sun.y, sun.r);
      gl.uniform3fv(uniform('uSunCol'), rgb01(rgbToHex(value, 7)));
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

      if (dirty) rebuild();
      const vs = veils(dt);
      if (changed(vs)) draw(vs);

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
      gl.deleteTexture(grainTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [onFail]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
