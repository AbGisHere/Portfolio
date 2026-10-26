'use client';

import { useEffect, useRef } from 'react';
import { FRAGMENT, MAX_RIDGES, OFF_FLAGS, VERTEX } from './mistShader';
import { CREST_FRAGMENT, CREST_VERTEX } from './crestShader';
import { buildHashTable } from './hashTable';
import { QUALITY, adaptiveQuality } from './adaptiveQuality';
import {
  FAR_VEIL,
  GRAIN_SIZE,
  MAX_DPR,
  alternate,
  bakeSky,
  crestExtension,
  grainOpacity,
  grainTexels,
  layout,
  mistOf,
  rimWidth,
  sampleCrest,
  sunColour,
  veilAlpha,
  veilSpeedScale,
  veilTiming,
} from './mistGeometry';
import { hexToRgb, mix, rgb01, rgbToHex } from '../colour';
import { MOON_SIZE, moonFace } from '../moonFace';
import { GEO, beginOrbit, ease, orbitScene } from '../orbit';
import { sceneAt } from '../scene';
import { DEPTH, boxSeen, cameraMetres, deskWidest, groundAt, pitchSpan, planeAt, toVirtual } from '../deskCamera';
import { GRASS, GRASS_FRAGMENT, GRASS_HAZE, GRASS_INSTANCES, GRASS_VERTEX, GRASS_VERTS } from './grassShader';
import { MAX_PRINTS, REACH, createWalker } from './footsteps';
import { bootOf, seeded } from './bootPrint';
import { MEADOW_SIZE, meadowTexels } from './meadowTexture';
import { FLOWERS, FLOWER_FRAGMENT, FLOWER_INSTANCES, FLOWER_VERTEX, FLOWER_VERTS } from './flowerShader';
import { LONE_SHADOW, TREE_FRAGMENT, TREE_STRIDE, TREE_VERTEX, treeLayout } from './treeShader';
import { DESK_FRAGMENT, DESK_STRIDE, DESK_VERTEX, deskLayout } from './deskShader';
import { LAPTOP_FRAGMENT, LAPTOP_STRIDE, LAPTOP_TEX, LAPTOP_VERTEX, laptopMesh, laptopTexels } from './laptopShader';
import { LAPTOP } from './laptopShape';
import { TABLET_FRAGMENT, TABLET_STRIDE, TABLET_TEX, TABLET_VERTEX, tabletMesh, tabletTexels } from './tabletShader';
import { TABLET } from './tabletShape';
import { LAMP_FRAGMENT, LAMP_STRIDE, LAMP_VERTEX, lampMesh } from './lampShader';
import { LAMP, LAMP_POSE, lampAt, lampClear, lampHitOn, lampSegments, makeFlicker } from './lampShape';
import { HOUSE_DEPTH_FRAGMENT, HOUSE_FRAGMENT, HOUSE_LIGHT_DATA, HOUSE_STRIDE, HOUSE_VERTEX, houseMesh } from './houseShader';
import { CURTAIN_STRIDE, curtainMesh } from './houseRooms';
import { HOUSE_BOUNDS, MOUND, POOL, moundY } from './houseShape';

// (0.4.13) The pool's and the hill's boxes (metres), for whether they're in
// the frame.
const POOL_BOX = [[POOL.at[0] - POOL.w / 2 - 0.5, POOL.at[1] - POOL.deep - 0.2, POOL.at[2] - POOL.d / 2 - 0.5], [POOL.at[0] + POOL.w / 2 + 0.5, POOL.at[1] + 0.3, POOL.at[2] + POOL.d / 2 + 0.5]];
const MOUND_BOX = [[MOUND.at[0] - MOUND.r[0] * 1.12, 0, MOUND.at[1] - MOUND.r[1] * 1.12], [MOUND.at[0] + MOUND.r[0] * 1.12, MOUND.h, MOUND.at[1] + MOUND.r[1] * 1.12]];
import { makeWater } from './poolWater';
import { PROBE, PROBE_BACKDROP_FRAGMENT, PROBE_BACKDROP_VERTEX, PROBE_FACES, makeProbes, probeLayout } from './mirrorProbe';
import { personMesh } from './personMesh';
import { makeBloom } from './bloom';
import { BIRD_FRAGMENT, BIRD_VERTEX, jointsOf } from './birdShader';
import { BIRD_STRIDE, birdMesh } from './birdShape';
import { BIRD_INSTANCE, birdsAt } from './birdFlight';
import { butterfliesAt, butterflyMesh } from './butterflies';
import { firefliesAt, fireflyMesh } from './fireflies';
import { GLASS_FRAGMENT, GLASS_VERTEX, glassMesh } from './houseGlass';
import { SHADOW_FRAGMENT, SHADOW_VERTEX, lightDir, makeShadow } from './houseShadow';
import { PROPS_FRAGMENT, PROPS_STRIDE, PROPS_VERTEX, STEAM_FRAGMENT, STEAM_VERTEX, STEAM_WISPS, propsMesh } from './propsShader';
import { FOOT_MIST, MEADOW_FLOWERS, MEADOW_FOOT, MEADOW_PAINT, MEADOW_VERTEX } from './meadowShader';
import {
  DESCENT_VEIL,
  DRIFT_GAIN_MAX,
  WIND,
  descentWidest,
  driftGains,
  veilAt,
} from '../camera';
import { getDescent, subscribeDescent } from '../../scroll/descent';
import { getFreeCam, subscribeFreeCam } from '../freeCam';
import { publishSunSpot } from '../sunSpot';
import { publishLampSpot } from '../lampSpot';
import { getLampPose, subscribeLampPose } from '../lampPose';
import { treeSeed } from '../treeSeed';
import { grainTile, layGrain } from '../grainLayer';
import styles from './MistCanvas.module.css';

const SKY_TEXELS = 1024;
// (0.2.4) The shader's cost grows with device pixels, so past a 4K frame
// the resolution scales down instead (a 5K display at 2× would be 14.7 M; a
// 16" laptop at 2× is 7.7 M, under it): the scene is haze, blur and soft
// edges, which hide the difference.
const MAX_PIXELS = 3840 * 2160;
// At rest (no scroll, switch or spring), the idle drift, the wind and the
// veils redraw together at most this often (0.2.4: was 60 for the crests,
// and every frame a veil moved). At the drift's fastest a ridge moves about
// .09 px per update, so it looks the same, and the GPU gets to rest between.
const IDLE_HZ = 30;

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
  for (let i = STOPS_AT; i < v.length; i += 3) out.push(rgbToHex(v.slice(i, i + 3)));
  return out;
};

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

// A pass's own program, or null if this GPU can't build it: the pass is
// then left out, never the frame (a driver can reject valid GLSL, e.g.
// Adreno's linker on the grass's footprint loop before 0.3.4).
function passProgram(gl, name, vs, fs) {
  try {
    return createProgram(gl, vs, fs);
  } catch (err) {
    console.warn(`[atmosphere] the ${name} pass is off on this GPU:`, err.message || 'no log');
    return null;
  }
}

// (0.4.32) Non-blocking parallel shader compilation via KHR_parallel_shader_compile.
// Kicks off compile and link on background driver threads without blocking the main thread.
function startPassProgram(gl, name, vs, fs) {
  try {
    const p = gl.createProgram();
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vs);
    gl.compileShader(vShader);
    gl.attachShader(p, vShader);

    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fs);
    gl.compileShader(fShader);
    gl.attachShader(p, fShader);

    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);

    return { name, prog: p, vs: vShader, fs: fShader, ready: false, failed: false };
  } catch (err) {
    console.warn(`[atmosphere] the ${name} pass failed to start:`, err.message || 'no log');
    return { name, prog: null, vs: null, fs: null, ready: false, failed: true };
  }
}

// Polls COMPLETION_STATUS_KHR each frame without blocking. Once complete, checks
// LINK_STATUS and returns the compiled program, or null while still in flight.
function pollPassProgram(gl, ext, handle) {
  if (!handle || handle.failed || !handle.prog) return null;
  if (handle.ready) return handle.prog;
  if (ext) {
    if (!gl.getProgramParameter(handle.prog, ext.COMPLETION_STATUS_KHR)) {
      return null;
    }
  }
  if (!gl.getProgramParameter(handle.prog, gl.LINK_STATUS)) {
    const pLog = gl.getProgramInfoLog(handle.prog) ?? '';
    const vsLog = handle.vs ? (gl.getShaderInfoLog(handle.vs) ?? '') : '';
    const fsLog = handle.fs ? (gl.getShaderInfoLog(handle.fs) ?? '') : '';
    console.warn(`[atmosphere] the ${handle.name} pass failed to link:`, pLog, vsLog ? `\nVS: ${vsLog}` : '', fsLog ? `\nFS: ${fsLog}` : '');
    handle.failed = true;
    return null;
  }
  if (handle.vs) {
    gl.detachShader(handle.prog, handle.vs);
    gl.deleteShader(handle.vs);
    handle.vs = null;
  }
  if (handle.fs) {
    gl.detachShader(handle.prog, handle.fs);
    gl.deleteShader(handle.fs);
    handle.fs = null;
  }
  handle.ready = true;
  return handle.prog;
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

/**
 * The MIST atmosphere drawn on the GPU (maths in mistGeometry.js): a frame is
 * one draw call, the CPU recomputes geometry only while the transition is
 * moving, and at rest only the veils' drift uniforms change. `onFail` hands
 * over to the layered fallback if WebGL2 is missing or the shader won't
 * build, or (with `err.lost`) if the context is lost.
 */
export default function MistCanvas({ recipe, onFail }) {
  const canvasRef = useRef(null);
  const grainRef = useRef(null);
  const recipeRef = useRef(recipe);
  const kickRef = useRef(() => {});

  // New recipe → new spring target; the running loop picks it up.
  useEffect(() => {
    recipeRef.current = recipe;
    kickRef.current();
  }, [recipe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const grainEl = grainRef.current;
    const params = new URLSearchParams(window.location.search);
    const noGrain = params.get('grain') === '0';
    const noGrass = params.get('grass') === '0';
    const noTrees = params.get('trees') === '0';
    const noDesk = params.get('table') === '0';
    const noLaptop = params.get('laptop') === '0';
    const noLamp = params.get('lamp') === '0';
    const noProps = params.get('props') === '0';
    const noHouse = params.get('house') === '0';
    const noAO = params.get('hao') === '0';
    const noGlass = params.get('glass') === '0';
    const noMirror = params.get('mirror') === '0';
    const noCaustics = params.get('caustics') === '0';
    const noBloom = params.get('bloom') === '0';
    let gl;
    let prog;
    let extParallel = null;
    try {
      // (0.3.1) A depth buffer, for the grass and the desk (the scene's
      // fullscreen pass only writes it under the desk camera).
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: true, stencil: false });
      if (!gl) throw new Error('webgl2 unavailable');
      extParallel = gl.getExtension('KHR_parallel_shader_compile');
      // Profiling (harness only): `?off=grain,veil` compiles those features
      // out of the shader (mistShader.js OFF_FLAGS).
      const off = (params.get('off') ?? '').split(',').filter(k => OFF_FLAGS.includes(k));
      prog = createProgram(gl, VERTEX, FRAGMENT.replace('// @defines', off.map(k => `#define OFF_${k.toUpperCase()}\n`).join('')));
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

    // (0.4.32) Non-blocking parallel compiles: start compiling secondary
    // pass shaders at load on background driver threads. Polled non-blocking
    // each frame via KHR_parallel_shader_compile.
    const grassAsync = !noGrass ? startPassProgram(gl, 'grass', GRASS_VERTEX, GRASS_FRAGMENT) : null;
    const flowerAsync = !noGrass ? startPassProgram(gl, 'flowers', FLOWER_VERTEX, FLOWER_FRAGMENT) : null;
    const treeAsync = !noTrees ? startPassProgram(gl, 'trees', TREE_VERTEX, TREE_FRAGMENT) : null;
    const deskAsync = !noDesk ? startPassProgram(gl, 'desk', DESK_VERTEX, DESK_FRAGMENT) : null;
    const laptopAsync = !noLaptop ? startPassProgram(gl, 'laptop', LAPTOP_VERTEX, LAPTOP_FRAGMENT) : null;
    const tabletAsync = !noLaptop ? startPassProgram(gl, 'tablet', TABLET_VERTEX, TABLET_FRAGMENT) : null;
    const lampAsync = !noLamp ? startPassProgram(gl, 'lamp', LAMP_VERTEX, LAMP_FRAGMENT) : null;
    const propsAsync = !noProps ? startPassProgram(gl, 'props', PROPS_VERTEX, PROPS_FRAGMENT) : null;
    const steamAsync = !noProps ? startPassProgram(gl, 'steam', STEAM_VERTEX, STEAM_FRAGMENT) : null;
    const birdAsync = startPassProgram(gl, 'birds', BIRD_VERTEX, BIRD_FRAGMENT);
    const meadowPaintAsync = startPassProgram(gl, 'meadow paint', MEADOW_VERTEX, MEADOW_PAINT);
    const meadowFlowersAsync = startPassProgram(gl, 'painted flowers', MEADOW_VERTEX, MEADOW_FLOWERS);
    const meadowFootAsync = startPassProgram(gl, 'foot mist', MEADOW_VERTEX, MEADOW_FOOT);
    const probeBackdropAsync = startPassProgram(gl, 'probe backdrop', PROBE_BACKDROP_VERTEX, PROBE_BACKDROP_FRAGMENT);

    // The house's fragment shader is too heavy to compile at scroll 0 on lower-end
    // mobile GPUs (e.g. PowerVR GE8320 on Vivo Y21 loses context). Start house
    // compiles only when approaching the house, on direct navigation, or when
    // house preparation is scheduled.
    let houseAsync = null;
    let shadowAsync = null;
    let glassAsync = null;
    let depthAsync = null;

    let houseBuilt = null;
    let houseWarmed = false;
    let warmHouse = null;

    const startHouseCompiles = () => {
      if (houseAsync || noHouse) return;
      houseAsync = startPassProgram(gl, 'house', HOUSE_VERTEX, HOUSE_FRAGMENT);
      shadowAsync = startPassProgram(gl, 'house-shadow', SHADOW_VERTEX, SHADOW_FRAGMENT);
      if (!noGlass) glassAsync = startPassProgram(gl, 'house-glass', GLASS_VERTEX, GLASS_FRAGMENT);
      if (!noAO && gl.getExtension('EXT_color_buffer_float')) {
        depthAsync = startPassProgram(gl, 'house-depth', HOUSE_VERTEX, HOUSE_DEPTH_FRAGMENT);
      }
    };

    const ensureWarmHouse = () => {
      if (houseWarmed || noHouse) return;
      houseWarmed = true;
      startHouseCompiles();
      if (houseBuilt && warmHouse) warmHouse();
    };

    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/house') || params.has('contact'))) {
      ensureWarmHouse();
    }

    // (0.3.1) The grass pass (grassShader.js): its own program, and an empty
    // vertex array (every blade comes from its instance number). Compiled
    // non-blocking in parallel at load; prepared without blocking the hero.
    // Null until built; false if this GPU can't build it.
    let grass = null;
    const grassProgram = () => {
      if (grass !== null) return grass;
      if (noGrass) return (grass = false);
      const gp = pollPassProgram(gl, extParallel, grassAsync);
      if (!gp) return grassAsync?.failed ? (grass = false) : null;
      const GU = {};
      grass = { prog: gp, vao: gl.createVertexArray(), u: name => (GU[name] ??= gl.getUniformLocation(gp, name)) };
      return grass;
    };
    // (0.3.5) The flowers in the grass (flowerShader.js), built like it.
    let flowers = null;
    const flowerProgram = () => {
      if (flowers !== null) return flowers;
      if (noGrass) return (flowers = false);
      const fp = pollPassProgram(gl, extParallel, flowerAsync);
      if (!fp) return flowerAsync?.failed ? (flowers = false) : null;
      const FU = {};
      flowers = { prog: fp, vao: gl.createVertexArray(), u: name => (FU[name] ??= gl.getUniformLocation(fp, name)) };
      return flowers;
    };
    // (0.3.5) The trees (treeShader.js): their layout is fixed, so it goes
    // up once, as per-instance data: the wood, the leaves, then the shadows
    // (each its own vertex array over the one buffer: their own vertex counts and blend).
    let trees = null;
    const treeProgram = () => {
      if (trees !== null) return trees;
      if (noTrees) return (trees = false);
      const tp = pollPassProgram(gl, extParallel, treeAsync);
      if (!tp) return treeAsync?.failed ? (trees = false) : null;
      // (0.3.11) The copses jittered by the visitor's seed (new on a hard refresh).
      const { data, wood, parts } = treeLayout(treeSeed());
      const tb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const arrayFrom = first => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        for (let i = 0; i < 3; i++) {
          gl.enableVertexAttribArray(i);
          gl.vertexAttribPointer(i, 4, gl.FLOAT, false, TREE_STRIDE * 4, first * TREE_STRIDE * 4 + i * 16);
          gl.vertexAttribDivisor(i, 1);
        }
        gl.bindVertexArray(null);
        return vao;
      };
      const vao = arrayFrom(0);
      const leafVao = arrayFrom(wood);
      const shadowVao = arrayFrom(parts);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const TU = {};
      trees = {
        prog: tp, vao, leafVao, shadowVao, buf: tb, wood, leaves: parts - wood, shadows: data.length / TREE_STRIDE - parts,
        u: name => (TU[name] ??= gl.getUniformLocation(tp, name)),
      };
      return trees;
    };
    // (0.3.6) The desk (deskShader.js): fixed too, up once, the planks then
    // its shadow, as the trees are.
    let desk = null;
    const deskProgram = () => {
      if (desk !== null) return desk;
      if (noDesk) return (desk = false);
      const dp = pollPassProgram(gl, extParallel, deskAsync);
      if (!dp) return deskAsync?.failed ? (desk = false) : null;
      const { data, wood } = deskLayout();
      const db = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, db);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const arrayFrom = first => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        for (let i = 0; i < 3; i++) {
          gl.enableVertexAttribArray(i);
          gl.vertexAttribPointer(i, 4, gl.FLOAT, false, DESK_STRIDE * 4, first * DESK_STRIDE * 4 + i * 16);
          gl.vertexAttribDivisor(i, 1);
        }
        gl.bindVertexArray(null);
        return vao;
      };
      const vao = arrayFrom(0);
      const shadowVao = arrayFrom(wood);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const DU = {};
      desk = { prog: dp, vao, shadowVao, buf: db, wood, u: name => (DU[name] ??= gl.getUniformLocation(dp, name)) };
      return desk;
    };
    // (0.3.8) The laptop (laptopShader.js): its mesh up once, and its
    // texture (the keys, the trackpad, the logo) drawn once, on unit 6.
    let laptop = null;
    const laptopProgram = () => {
      if (laptop !== null) return laptop;
      if (noLaptop) return (laptop = false);
      const lp = pollPassProgram(gl, extParallel, laptopAsync);
      if (!lp) return laptopAsync?.failed ? (laptop = false) : null;
      const { data, count } = laptopMesh();
      const lb = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, lb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, LAPTOP_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.activeTexture(gl.TEXTURE6);
      const tex = texture(gl, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, LAPTOP_TEX.w, LAPTOP_TEX.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, laptopTexels());
      gl.generateMipmap(gl.TEXTURE_2D);
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      gl.activeTexture(gl.TEXTURE0);
      const LU = {};
      laptop = { prog: lp, vao, buf: lb, tex, count, u: name => (LU[name] ??= gl.getUniformLocation(lp, name)) };
      return laptop;
    };
    // (0.3.10) The tablet and its books (tabletShader.js), on portrait
    // frames: placed once, the back's texture on unit 7.
    let tablet = null;
    const tabletProgram = () => {
      if (tablet !== null) return tablet;
      if (noLaptop) return (tablet = false);
      const tp = pollPassProgram(gl, extParallel, tabletAsync);
      if (!tp) return tabletAsync?.failed ? (tablet = false) : null;
      const { data, count } = tabletMesh();
      const tb = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, tb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 3, 7], [4, 3, 10]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, TABLET_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.activeTexture(gl.TEXTURE7);
      const tex = texture(gl, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TABLET_TEX.w, TABLET_TEX.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, tabletTexels());
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.activeTexture(gl.TEXTURE0);
      const TU = {};
      tablet = { prog: tp, vao, buf: tb, tex, count, u: name => (TU[name] ??= gl.getUniformLocation(tp, name)) };
      return tablet;
    };
    // (0.3.11) The desk lamp (lampShader.js): no texture; its mesh rebuilt
    // whenever its top half is dragged to a new pose (../lampPose.js).
    let lamp = null;
    const lampProgram = () => {
      if (lamp !== null) return lamp;
      if (noLamp) return (lamp = false);
      const mp = pollPassProgram(gl, extParallel, lampAsync);
      if (!mp) return lampAsync?.failed ? (lamp = false) : null;
      const pose = getLampPose();
      const { data, count } = lampMesh(pose);
      const mb = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, mb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 1, 7]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, LAMP_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const MU = {};
      lamp = { prog: mp, vao, buf: mb, count, pose, u: name => (MU[name] ??= gl.getUniformLocation(mp, name)) };
      dirty = true;
      kickRef.current();
      return lamp;
    };
    // (0.3.12) The things on the desk (propsShader.js): one mesh, built once;
    // and the steam off the mug, a small pass of its own (no buffer).
    let props = null;
    const propsProgram = () => {
      if (props !== null) return props;
      if (noProps) return (props = false);
      const pp = pollPassProgram(gl, extParallel, propsAsync);
      if (!pp) return propsAsync?.failed ? (props = false) : null;
      const { data, count } = propsMesh();
      const pb = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, PROPS_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const PU = {};
      props = { prog: pp, vao, buf: pb, count, u: name => (PU[name] ??= gl.getUniformLocation(pp, name)) };
      return props;
    };
    // (0.4.0) The house on the hill and its pool (houseShader.js; in 3D
    // from 0.4.1): one mesh, built once. (0.4.13) Built in a worker
    // (houseWorker.js) from the page's load, as it takes seconds; null
    // until it's back, then the program and buffers on first use.
    let house = null;
    let houseWorker = null;
    const updateHouseBuffer = () => {
      if (!house || !houseBuilt) return;
      const { data, count, lawn, glass: panes } = houseBuilt.house;
      gl.bindBuffer(gl.ARRAY_BUFFER, house.buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      house.count = count;
      house.lawn = lawn;
      house.panes = panes;
      dirty = true;
      kickRef.current();
    };
    const buildHouse = () => {
      if (houseWorker || houseBuilt) return;
      const here = () => {
        houseBuilt = { house: houseMesh(), curtains: curtainMesh() };
        updateHouseBuffer();
        if (houseWarmed && warmHouse) warmHouse();
      };
      try {
        houseWorker = new Worker(new URL('./houseWorker.js', import.meta.url));
        houseWorker.onmessage = e => {
          houseBuilt = e.data;
          houseWorker?.terminate();
          houseWorker = null;
          updateHouseBuffer();
          if (houseWarmed && warmHouse) warmHouse();
          // (Redrawn with it, even at rest.)
          dirty = true;
          kickRef.current();
        };
        houseWorker.onerror = () => {
          houseWorker?.terminate();
          houseWorker = null;
          here();
        };
        houseWorker.postMessage(null);
      } catch {
        here();
      }
    };
    const houseProgram = () => {
      if (house !== null) return house;
      if (noHouse) return (house = false);
      ensureWarmHouse();
      buildHouse();
      if (!houseBuilt) return null;
      const hp = pollPassProgram(gl, extParallel, houseAsync);
      if (!hp) return houseAsync?.failed ? (house = false) : null;
      const { data, count, lawn, glass: panes } = houseBuilt.house;
      const hb = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, hb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, HOUSE_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const HU = {};
      // (0.4.4) The curtains: their own buffer, both their shapes.
      const cm = houseBuilt.curtains;
      const cb = gl.createBuffer();
      const cvao = gl.createVertexArray();
      gl.bindVertexArray(cvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cb);
      gl.bufferData(gl.ARRAY_BUFFER, cm.data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7], [4, 3, 9], [5, 3, 12]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, CURTAIN_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      // (0.4.30) The lights' data, a texel each, on unit 16 for good (0–15
      // are taken; WebGL2 gives at least 32).
      const lt = gl.createTexture();
      gl.activeTexture(gl.TEXTURE16);
      gl.bindTexture(gl.TEXTURE_2D, lt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, HOUSE_LIGHT_DATA.width, HOUSE_LIGHT_DATA.height, 0, gl.RGBA, gl.FLOAT, HOUSE_LIGHT_DATA.data);
      gl.activeTexture(gl.TEXTURE0);
      house = { prog: hp, vao, buf: hb, count, lawn, panes, curtains: { vao: cvao, buf: cb, count: cm.count }, u: name => (HU[name] ??= gl.getUniformLocation(hp, name)) };
      return house;
    };
    // (0.4.2) The pool's water (poolWater.js), on texture unit 8: made the
    // first time the pool's in view (null: it can't run here).
    let water;
    const waterSim = () => (water === undefined ? (water = makeWater(gl, 8)) : water);
    // Whether the pool can be seen: the camera turned to the house.
    let poolSeen = false;
    // Whether the caustics' map has been drawn (texture unit 10).
    let causticsReady = false;
    // And whether the house can (turned at least 50° toward it).
    let houseSeen = false;
    // (0.4.13) And the hill's lawn (wider than the house).
    let lawnSeen = false;
    // (0.4.2) The sun's shadow over the house (houseShadow.js): its depth
    // map on texture unit 9 and the program that draws it (null: none here).
    let shadow = null;
    const houseShadow = () => {
      if (shadow !== null) return shadow;
      if (noHouse) return (shadow = false);
      ensureWarmHouse();
      const sp = pollPassProgram(gl, extParallel, shadowAsync);
      if (!sp) return shadowAsync?.failed ? (shadow = false) : null;
      const map = makeShadow(gl, 9);
      if (!map) return (shadow = false);
      shadow = { prog: sp, map, u: gl.getUniformLocation(sp, 'uLightVP') };
      return shadow;
    };
    // (0.4.2) The glass and the water (houseGlass.js): their mesh and the
    // copy of the frame they bend (texture unit 11, the canvas's size).
    let glass = null;
    const glassProgram = () => {
      if (glass !== null) return glass;
      if (noHouse || noGlass) return (glass = false);
      const hp = houseProgram();
      if (hp === null) return null;
      if (!hp) return (glass = false);
      ensureWarmHouse();
      const gp = pollPassProgram(gl, extParallel, glassAsync);
      if (!gp) return glassAsync?.failed ? (glass = false) : null;
      const mesh = glassMesh(hp.panes);
      const gb = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gb);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, 9 * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const GU = {};
      glass = { prog: gp, vao, buf: gb, mesh, tex: gl.createTexture(), size: [0, 0], u: name => (GU[name] ??= gl.getUniformLocation(gp, name)) };
      return glass;
    };
    // (0.4.2) The house's depth along the view, at the canvas's size, for its
    // ambient occlusion (texture unit 13): its program and target (null:
    // none here).
    let aoPass = null;
    const aoTarget = () => {
      if (aoPass === false) return false;
      if (noHouse || noAO || !gl.getExtension('EXT_color_buffer_float')) return (aoPass = false);
      if (aoPass === null) {
        ensureWarmHouse();
        const dp = pollPassProgram(gl, extParallel, depthAsync);
        if (!dp) return depthAsync?.failed ? (aoPass = false) : null;
        const AU = {};
        aoPass = { prog: dp, u: name => (AU[name] ??= gl.getUniformLocation(dp, name)), tex: gl.createTexture(), depth: gl.createRenderbuffer(), fbo: gl.createFramebuffer(), size: [0, 0] };
      }
      if (!aoPass) return null;
      const size = [canvas.width, canvas.height];
      if (aoPass.size[0] !== size[0] || aoPass.size[1] !== size[1]) {
        aoPass.size = size;
        gl.activeTexture(gl.TEXTURE13);
        gl.bindTexture(gl.TEXTURE_2D, aoPass.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, size[0], size[1], 0, gl.RED, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindRenderbuffer(gl.RENDERBUFFER, aoPass.depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, size[0], size[1]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aoPass.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, aoPass.tex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, aoPass.depth);
        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.activeTexture(gl.TEXTURE0);
        if (!ok) return (aoPass = false);
      }
      return aoPass;
    };
    // The house's depth into it, before the frame.
    function drawHouseDepth() {
      const g = houseProgram();
      const a = g && aoTarget();
      if (!a) return false;
      const { pitch: P, cm: c } = meadowAt;
      gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
      gl.viewport(0, 0, a.size[0], a.size[1]);
      gl.clearColor(1e4, 0, 0, 1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(a.prog);
      gl.uniform4f(a.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(a.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(a.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(a.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(a.u('uDepthAB'), ...DEPTH_AB);
      gl.uniformMatrix4fv(a.u('uLightVP'), false, IDENTITY);
      gl.uniform2f(a.u('uMirror'), 0, 0);
      houseGeometry(g, a.u, 'all');
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE13);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(prog);
      return true;
    }
    let aoReady = false;
    // (0.4.2) The pool's mirror image's target: a quarter of the canvas (the
    // water's ripples blur it anyway), its depth.
    let reflect = null;
    const reflectTarget = () => {
      const size = [Math.max(1, canvas.width >> 2), Math.max(1, canvas.height >> 2)];
      if (reflect && reflect.size[0] === size[0] && reflect.size[1] === size[1]) return reflect;
      if (reflect === false) return null;
      if (!reflect) reflect = { tex: gl.createTexture(), depth: gl.createRenderbuffer(), fbo: gl.createFramebuffer(), size: [0, 0] };
      reflect.size = size;
      gl.activeTexture(gl.TEXTURE12);
      gl.bindTexture(gl.TEXTURE_2D, reflect.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size[0], size[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, reflect.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, size[0], size[1]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, reflect.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reflect.tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, reflect.depth);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
      if (!ok) {
        reflect = false;
        return null;
      }
      return reflect;
    };
    // The frame so far, into the glass's copy: only where the house is on
    // the screen (its bounds' corners projected; the whole frame if any
    // corner is behind the camera).
    const houseRect = () => {
      const { pitch: P, cm: c } = meadowAt;
      const { lo, hi } = HOUSE_BOUNDS;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        const p = [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]];
        const dx = p[0] - c.x;
        const dz = p[2] - c.z;
        const q = [dx * P.yc - dz * P.ys, p[1] - c.y, dx * P.ys + dz * P.yc];
        const zp = -q[1] * P.sin + q[2] * P.cos;
        if (zp <= 0.05) return [0, 0, canvas.width, canvas.height];
        const vp = -q[1] * P.cos - q[2] * P.sin;
        const sx = P.sx + (P.zoom * P.f * q[0]) / zp;
        const sy = P.sy + (P.zoom * P.f * vp) / zp;
        x0 = Math.min(x0, sx);
        x1 = Math.max(x1, sx);
        y0 = Math.min(y0, sy);
        y1 = Math.max(y1, sy);
      }
      const k = canvas.width / w;
      const X0 = Math.max(0, Math.floor(x0 * k) - 4);
      const X1 = Math.min(canvas.width, Math.ceil(x1 * k) + 4);
      const Y0 = Math.max(0, canvas.height - Math.ceil(y1 * k) - 4);
      const Y1 = Math.min(canvas.height, canvas.height - Math.floor(y0 * k) + 4);
      return X1 > X0 && Y1 > Y0 ? [X0, Y0, X1 - X0, Y1 - Y0] : null;
    };
    const copyFrame = (g, full = false) => {
      gl.activeTexture(gl.TEXTURE11);
      gl.bindTexture(gl.TEXTURE_2D, g.tex);
      if (g.size[0] !== canvas.width || g.size[1] !== canvas.height) {
        g.size = [canvas.width, canvas.height];
        // (The canvas has no alpha: its copy is RGB.)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, canvas.width, canvas.height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      const r = full ? [0, 0, canvas.width, canvas.height] : houseRect();
      if (r) gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, r[0], r[1], r[0], r[1], r[2], r[3]);
      gl.activeTexture(gl.TEXTURE0);
    };
    // (0.4.4) The birds (birdShader.js): a program, and per species its mesh
    // and a buffer of its flock's instances, filled every frame.
    let birdPass = null;
    const birdProgram = () => {
      if (birdPass !== null) return birdPass;
      const bp = pollPassProgram(gl, extParallel, birdAsync);
      if (!bp) return birdAsync?.failed ? (birdPass = false) : null;
      // (0.4.24) And the butterflies, a fourth kind; (0.4.26) the
      // fireflies a fifth, last (their light is added on).
      const kinds = ['swallow', 'kite', 'goose', 'butterfly', 'firefly'].map((name, kind) => {
        const { data, count } = name === 'butterfly' ? butterflyMesh() : name === 'firefly' ? fireflyMesh() : birdMesh(name);
        const mb = gl.createBuffer();
        const ib = gl.createBuffer();
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, mb);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7]]) {
          gl.enableVertexAttribArray(i);
          gl.vertexAttribPointer(i, n, gl.FLOAT, false, BIRD_STRIDE * 4, at * 4);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, ib);
        for (const [i, at] of [[4, 0], [5, 4], [6, 8]]) {
          gl.enableVertexAttribArray(i);
          gl.vertexAttribPointer(i, 4, gl.FLOAT, false, BIRD_INSTANCE * 4, at * 4);
          gl.vertexAttribDivisor(i, 1);
        }
        gl.bindVertexArray(null);
        return { name, kind, vao, mb, ib, count, joints: name === 'firefly' ? { shoulder: [0, 0, 0], wrist: 0 } : jointsOf(name) };
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const BU = {};
      birdPass = { prog: bp, kinds, u: name => (BU[name] ??= gl.getUniformLocation(bp, name)) };
      return birdPass;
    };
    // (0.4.26) `glow`: the fireflies alone, added on after the sky's pass
    // (which would paint over them where they're before it), by night.
    function drawBirds(glow = false) {
      const g = birdProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours } = meadowAt;
      const flocks = glow ? { firefly: firefliesAt(skyT, houseNight()) } : { ...birdsAt(skyT, birdWeight), butterfly: butterfliesAt(skyT, birdWeight) };
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uHaze'), rgb01(meadowAt.mist ?? colours.env[1]));
      gl.uniform1f(g.u('uNight'), houseNight());
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      if (glow) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
      }
      for (const k of g.kinds) {
        const data = flocks[k.name];
        if (!data) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, k.ib);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.uniform1i(g.u('uKind'), k.kind);
        gl.uniform3fv(g.u('uShoulder'), k.joints.shoulder);
        gl.uniform1f(g.u('uWrist'), k.joints.wrist);
        gl.bindVertexArray(k.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, k.count, data.length / BIRD_INSTANCE);
      }
      if (glow) {
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.useProgram(prog);
    }
    const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    let steam = null;
    const steamProgram = () => {
      if (steam !== null) return steam;
      if (noProps) return (steam = false);
      const sp = pollPassProgram(gl, extParallel, steamAsync);
      if (!sp) return steamAsync?.failed ? (steam = false) : null;
      const SU = {};
      steam = { prog: sp, vao: gl.createVertexArray(), u: name => (SU[name] ??= gl.getUniformLocation(sp, name)) };
      return steam;
    };
    const DEPTH_AB = (() => {
      const n = DEPTH.near * 40;
      const f = DEPTH.far * 40;
      return [(f + n) / (f - n), (-2 * f * n) / (f - n)];
    })();
    // What the grass draws with, from the last rebuild (null: no grass).
    let grassAt = null;
    // The footsteps: the walker, and the camera they're cast through.
    const walker = createWalker();
    // (0.3.2) This load's boot; `?boot=<n>` draws boot n (stills).
    const bootN = new URLSearchParams(window.location.search).get('boot');
    const boot = bootOf(bootN ? seeded(Number(bootN)) : Math.random);
    // The live prints as uniforms, for the ground and the grass alike.
    const printsNow = () => {
      const now = performance.now() / 1000;
      const live = grassAt ? walker.live(now) : [];
      const pos = new Float32Array(MAX_PRINTS * 4);
      const foot = new Float32Array(MAX_PRINTS);
      live.forEach((q, i) => {
        pos.set([q.x, q.z, q.angle, now - q.t], i * 4);
        foot[i] = q.foot;
      });
      return { pos, foot, n: live.length };
    };
    const setPrints = (u, p) => {
      gl.uniform4fv(u('uPrints'), p.pos);
      gl.uniform1fv(u('uFoot'), p.foot);
      gl.uniform1i(u('uPrintN'), p.n);
      gl.uniform4fv(u('uBoot'), boot);
    };
    let footCam = null;

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
    // (0.3.2) The meadow's paint: tiled in world space, so it repeats and
    // mipmaps (anisotropic where the browser has it: the ground is seen
    // at a grazing angle). Building it takes ~20–30 ms, so it waits for the
    // browser to be idle after load, or for the meadow pass if that comes
    // first; never on the load path.
    let meadowTex = null;
    const meadowTexture = () => {
      if (meadowTex) return meadowTex;
      gl.activeTexture(gl.TEXTURE5);
      meadowTex = texture(gl, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, MEADOW_SIZE, MEADOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, meadowTexels());
      gl.generateMipmap(gl.TEXTURE_2D);
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return meadowTex;
    };
    const idle = window.requestIdleCallback ?? (cb => setTimeout(cb, 1500));
    const warmIdles = [];

    const cleanGL = () => {
      // (Leaving the state as the frame loop expects it.)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(prog);
    };

    const scheduleQueue = (steps, delay = 5000) => {
      const next = deadline => {
        if (!steps.length) return;
        if (deadline && typeof deadline.timeRemaining === 'function' && !deadline.didTimeout && deadline.timeRemaining() < 4) {
          warmIdles.push(idle(next, { timeout: delay }));
          return;
        }
        const step = steps.shift();
        if (step) {
          const res = step();
          cleanGL();
          if (res === 'pending') {
            steps.push(step);
          } else if (res === 'done' || res === true) {
            dirty = true;
            kickRef.current();
          }
        }
        if (steps.length) warmIdles.push(idle(next, { timeout: delay }));
      };
      warmIdles.push(idle(next, { timeout: delay }));
    };

    // (0.4.32) Progressive preparation: prepare the desk scene during the
    // mountain section/idle, so by the descent to the desk, programs and geometry
    // are already prepared without blocking the hero.
    // Screen shape: warm the visible device for the current screen orientation first.
    const isPortrait = () => (typeof window !== 'undefined' && window.innerHeight > window.innerWidth);
    scheduleQueue([
      () => {
        meadowTexture();
        return 'done';
      },
      () => {
        if (noGrass) return 'disabled';
        const g = grassProgram();
        const f = flowerProgram();
        if (g === null || f === null) return 'pending';
        return 'done';
      },
      () => {
        if (noTrees) return 'disabled';
        const t = treeProgram();
        return t === null ? 'pending' : 'done';
      },
      () => {
        if (noDesk) return 'disabled';
        const d = deskProgram();
        return d === null ? 'pending' : 'done';
      },
      () => {
        if (noProps) return 'disabled';
        const p = propsProgram();
        return p === null ? 'pending' : 'done';
      },
      () => {
        if (noLamp) return 'disabled';
        const l = lampProgram();
        return l === null ? 'pending' : 'done';
      },
      () => {
        if (noLaptop) return 'disabled';
        const dev = isPortrait() ? tabletProgram() : laptopProgram();
        return dev === null ? 'pending' : 'done';
      },
      () => {
        if (noLaptop) return 'disabled';
        const dev = isPortrait() ? laptopProgram() : tabletProgram();
        return dev === null ? 'pending' : 'done';
      },
    ]);

    // (0.4.32) The house: geometry generated by worker, but shader compilation
    // and idle queue preparation are deferred until reaching the desk stretch
    // or direct navigation, preventing GPU context loss on mobile hero views.
    warmHouse = () => {
      if (noHouse) return;
      startHouseCompiles();
      // (Last, the shadow map under the light as it is: unless the light
      // moves first, the house's first frame finds it drawn.)
      const shadowNow = () => {
        const g = houseProgram();
        const sh = houseShadow();
        if (g === null || sh === null) return 'pending';
        if (g && sh && meadowAt) houseShadowMap(g, sh, meadowAt.colours);
        return 'done';
      };
      scheduleQueue([
        () => (houseProgram() === null ? 'pending' : 'done'),
        () => (houseShadow() === null ? 'pending' : 'done'),
        () => {
          const gp = glassProgram();
          return gp === null ? 'pending' : 'done';
        },
        () => (aoTarget() === null ? 'pending' : 'done'),
        () => (birdProgram() === null ? 'pending' : 'done'),
        () => {
          waterSim();
          return 'done';
        },
        () => {
          bloom ??= makeBloom(gl, 14) || false;
          return 'done';
        },
        shadowNow,
      ]);
    };
    gl.uniform1i(uniform('uMoon'), 4);
    gl.uniform1i(uniform('uSky'), 0);
    gl.uniform1i(uniform('uCrest'), 1);
    gl.uniform1i(uniform('uGrain'), 2);

    const veilPos = new Float32Array(MAX_RIDGES * 4);
    const veilAlphaBuf = new Float32Array(MAX_RIDGES);

    const skyPixels = new Uint8Array(SKY_TEXELS * 4);
    let crest = new Float32Array(0);
    let crestDims = '';

    // ---- state
    let value = targetVector(recipeRef.current); // mounts at rest, like Wl
    // Switches only move the seed forward (orbit.js SEED_RATE); this is how
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
    // (0.3) The closing shot's sky (clouds, birds, stars): shown, and its
    // clock, seconds on this loop's clock while it shows.
    let lifeShown = false;
    let birdWeight = 0;
    // (0.4.26) Whether the fireflies were drawn (they keep the frames coming).
    let fliesOn = false;
    // (0.3.2) The meadow's paint is in the frame (its wind and clouds move).
    let meadowShown = false;
    // What the meadow pass draws with, from the last rebuild (null: none).
    let meadowAt = null;
    // Past this the flowers are under a pixel and in the haze (metres).
    const FLOWER_M = 45;
    // (0.3.2) The meadow pass (meadowShader.js): its paint and its flowers,
    // each its own small program, compiled in parallel at load and polled non-blocking.
    // Subpasses (paint, flowers, foot mist) are tracked and initialized independently
    // so pending effects are never permanently cached as null.
    let meadowVao = null;
    let meadowPaint = null;
    let meadowFlowers = null;
    let meadowFoot = null;
    const meadowPrograms = () => {
      const make = handle => {
        const prog = pollPassProgram(gl, extParallel, handle);
        if (!prog) return handle?.failed ? false : null;
        const U = {};
        return { prog, u: name => (U[name] ??= gl.getUniformLocation(prog, name)) };
      };
      if (!meadowPaint) {
        const res = make(meadowPaintAsync);
        if (res === null) return null;
        meadowPaint = res;
      }
      if (!meadowFlowers) {
        const res = make(meadowFlowersAsync);
        if (res) {
          meadowFlowers = res;
          dirty = true;
          kickRef.current();
        } else if (res === false) {
          meadowFlowers = false;
        }
      }
      if (!meadowFoot) {
        const res = make(meadowFootAsync);
        if (res) {
          meadowFoot = res;
          dirty = true;
          kickRef.current();
        } else if (res === false) {
          meadowFoot = false;
        }
      }
      if (!meadowVao) meadowVao = gl.createVertexArray();
      return {
        paint: meadowPaint || null,
        flowers: meadowFlowers || null,
        foot: meadowFoot || null,
        vao: meadowVao,
      };
    };
    let skyT = 0;
    let raf = 0;
    let last = 0;
    let woke = true;
    let visible = !document.hidden;
    let onScreen = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let bloom;
    // (0.4.13) Start the house's build (above) once the page is idle.
    if (!noHouse) warmIdles.push(idle(buildHouse, { timeout: 3000 }));
    const frozen = params.get('freeze') === '1';
    // `?skyt=12` starts the closing sky's clock there (stills of the birds
    // and clouds at a given moment, with `?freeze=1`).
    skyT = Number(params.get('skyt')) || 0;

    // Idle drift: at rest the seed breathes ±`idle.seedDrift` around its
    // target on a `idle.period`-second sine, so the ridges slowly shift. Only
    // the crest outlines depend on the seed, so a drift step reruns the crest
    // pass (on the CPU path, re-samples and re-uploads the crest texture) and
    // nothing else, at most IDLE_HZ times a second. Off under reduced motion and `?freeze=1`; its clock, like the
    // veils', only runs while the scene is on screen.
    let idleT = 0;
    let builtOffset = 0;
    let lastIdleAt = -Infinity;
    // `?driftAt=0.25` pins the drift offset (harness: compare crest paths
    // mid-drift); it applies even with `?freeze=1`.
    const driftAt = params.has('driftAt') ? Number(params.get('driftAt')) : null;
    const seedOffset = () => {
      if (driftAt != null) return driftAt;
      const idle = recipeRef.current.idle;
      // Mid-switch the drift the switch started from fades out on its clock
      // (see startOrbit).
      if (orbit) return (orbit.drift ?? 0) * (1 - orbit.e);
      if (!idle?.seedDrift || motion.matches || frozen) return 0;
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
      // The idle drift stays per ridge, with its gain (camera.js driftGains),
      // and fades out over the switch: folded into the start seed, it moved
      // every ridge by the bare offset, so under the camera (gains up to
      // DRIFT_GAIN_MAX) the ridges jumped on the switch's first frame. Where
      // it lands is unchanged, and at the top (gain 1) so is every frame.
      // (A pinned `?driftAt` stays pinned.)
      if (orbit && driftAt == null) {
        orbit.drift = builtOffset;
        orbit.geo[6] -= builtOffset;
      }
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
        // The switch drew the target's palette exactly on its last frame;
        // the spring's colours ran alongside and may still be a step short
        // of it, so land them too, or the sky shifts a level on handover.
        value = targetNow();
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

    // Adaptive quality (0.2.4, ./adaptiveQuality.js): the resolution step,
    // from frame intervals. `?adapt=0` holds the full level (harness);
    // `data-quality` on the scene wrapper says which is set.
    const quality = params.get('adapt') === '0' ? null : adaptiveQuality(() => resize());
    const level = () => quality?.level ?? 0;
    // `?cap=0` (harness, 0.2.11: `npm run sharp`) lifts the MAX_PIXELS cap,
    // so large high-DPI frames draw at native (still at most MAX_DPR).
    const pixelCap = params.get('cap') === '0' ? Infinity : MAX_PIXELS;
    // (0.2.11) Grain is one-CSS-px noise: drawn under the pixel cap or a
    // quality step, it gets resampled up to the screen and goes soft (`npm
    // run sharp`: the only thing the cap visibly softens). So whenever the
    // canvas is below the device's pixels, the grain leaves the shader for
    // the layered renderer's overlay at device pixels (../grainLayer.js):
    // the same blend, composited sharp.
    let grainOut = false;
    let grainA = -1;
    let tile = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      if (!nw || !nh) return;
      const cap = Math.sqrt(pixelCap / (nw * nh));
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, cap) * QUALITY[level()];
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      grainOut = !noGrain && dpr < (window.devicePixelRatio || 1) - 1e-3;
      grainEl.style.display = grainOut ? '' : 'none';
      if (grainOut) layGrain(grainEl, (tile ??= grainTile()), nw, nh);
      w = nw;
      h = nh;
      dirty = true;
      lastDrawn = null;
      if (canvas.parentElement) canvas.parentElement.dataset.quality = String(QUALITY[level()]);
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
    // current spring value to the target seed, ± the idle drift (at its
    // largest gain, camera.js DRIFT_GAIN_MAX). It's rebuilt only when the
    // frame changes or an offset leaves that range.
    // It also covers the widest noise range the descent can need (every
    // ridge at its smallest, about = 1), so scrolling never rebuilds it.
    function ensureHashTable(ridge, nMin, nMax, ext) {
      const g = crestGpu;
      const key = `${w}|${ridge.U}|${ridge.Q}|${ridge.x0}|${ridge.dx}|${ext}`;
      if (g.table && g.tableKey === key && nMin >= g.table.nLo && nMax <= g.table.nHi) return true;
      const r = recipeRef.current;
      const slack = ((r.idle?.seedDrift ?? 0) * DRIFT_GAIN_MAX + 1) * 0.73;
      const seeds = [value[6] * 0.73, (mistOf(r.mist).seed + seedShift) * 0.73, nMin, nMax];
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

    // Render the crests for `ridges` at noise seed `seed` plus the idle
    // drift `offset` (times each ridge's gain under the camera) into the
    // crest texture. Returns false (after switching to the CPU path) if the
    // float target or the hash table can't be set up.
    function gpuCrests(ridges, n, seed, offset, sharp) {
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
      // Each ridge's noise offset, as `layout` computes it with `drift`.
      const gains = view.gains;
      const Ns = Array.from({ length: n }, (_, i) => (seed + offset * (gains?.[i] ?? 1)) * 0.73);
      const ridge = ridges[0];
      if (!ensureHashTable(ridge, Math.min(...Ns), Math.max(...Ns), view.ext)) {
        dropGpuCrests();
        return false;
      }
      const noise = new Float32Array(MAX_RIDGES);
      const base = new Float32Array(MAX_RIDGES);
      const lift = new Float32Array(MAX_RIDGES);
      const scale = new Float32Array(MAX_RIDGES).fill(1);
      const foot = new Float32Array(MAX_RIDGES);
      const ext = new Int32Array(MAX_RIDGES);
      // One row per ridge, by its noise index (crestShader.js).
      for (let i = 0; i < n; i++) {
        const k = ridges[i].noise ?? i;
        noise[k] = Ns[i];
        base[k] = ridges[i].base;
        lift[k] = ridges[i].L;
        scale[k] = rc[i].s;
        foot[k] = rc[i].foot;
        ext[k] = crestExtension(rc[i].s / (view.m ?? 1), w, h, ridge.dx);
      }
      gl.useProgram(g.prog);
      gl.uniform1i(g.u('uOrigin'), g.table.origin);
      gl.uniform1f(g.u('uW'), w);
      gl.uniform1f(g.u('uU'), ridge.U);
      gl.uniform1f(g.u('uX0'), ridge.x0);
      gl.uniform1f(g.u('uDx'), ridge.dx);
      gl.uniform1i(g.u('uLast'), ridge.Q);
      gl.uniform1f(g.u('uDpr'), cols / w);
      gl.uniform1fv(g.u('uN'), noise);
      gl.uniform1f(g.u('uSharp'), sharp / 100);
      gl.uniform1fv(g.u('uBase'), base);
      gl.uniform1fv(g.u('uL'), lift);
      gl.uniform1fv(g.u('uS'), scale);
      gl.uniform1f(g.u('uM'), view.m ?? 1);

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
      for (let i = 0; i < n; i++) {
        const cam = view.m > 1 ? { ...view.ridges[i], m: view.m } : view.ridges[i];
        sampleCrest(ridges[i], cols, scale, crest, (ridges[i].noise ?? i) * cols, cam);
      }
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
      if (gpuCrests(scene.ridges, count, value[6], builtOffset, value[4])) return;
      const mist = { ...mistOf(r.mist), haze: value[2], height: value[3], sharp: value[4], sun: value[5], seed: value[6] };
      const scales = view.rest ? null : view.ridges.map(rc => rc.s / (view.m ?? 1));
      const drift = { offset: builtOffset, gains: view.gains };
      const { ridges } = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, scales, ranges: view.ranges, drift });
      uploadCrest(ridges, Math.min(ridges.length, MAX_RIDGES));
    }

    // Recompute layout, colours and textures from the current spring value
    // and the descent's progress.
    function rebuild() {
      const r = recipeRef.current;
      const { about, desk, contact = 0 } = getDescent();
      const free = getFreeCam();
      // Mid-switch the palette runs through the target's keyframes (dawn,
      // day…) on the switch's clock, and the ridges are relit from it; at
      // rest it's the spring's, as ever. The descent's time of day goes on
      // top (camera.js): both scenes' overlays, blended on the switch.
      const base = orbit?.scene ? orbit.scene.stops : toHexStops(value);
      if (orbit?.scene) shownStops = base;
      builtOffset = seedOffset();
      // The seed without the idle drift: that goes on per ridge (`drift`).
      const mist = { ...mistOf(r.mist), haze: value[2], height: value[3], sharp: value[4], sun: value[5], seed: value[6] };
      // The frame (../scene.js): the camera, a pure function of `about`,
      // mid-switch blended between the scenes' amounts; the ridges laid out
      // from the spring's dials; the bodies; the paint, light and meadow. The
      // hash table is sized for the widest reach, so scrolling never
      // rebuilds it.
      const frame = sceneAt({
        recipe: r,
        orbit,
        e: orbit ? orbit.e : 1,
        turning: !!orbit?.scene,
        base,
        haze: value[2],
        about,
        desk,
        contact,
        free,
        reduced: motion.matches,
        w,
        h,
        layoutAt: ranges => layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, crests: false, ranges }),
        restCol: rgbToHex(value.slice(7, 10)),
        maxRidges: MAX_RIDGES,
      });
      const { cam, stops, lit } = frame;
      scene = frame.layout;
      view = frame.view;
      view.ranges = cam.ranges;
      view.haze = frame.haze;
      // Each ridge's idle-drift gain (camera.js DRIFT_GAIN_MAX): null at rest.
      view.gains = driftGains(view);
      // Under the 0.3 camera's pitch the crest texture spans the virtual
      // plane's wider reach (`m`, deskCamera.js pitchSpan), and the hash
      // table the 0.3 camera's (rebuilt once on the way in).
      const { pitch } = frame;
      view.pitch = pitch;
      view.m = pitch ? pitchSpan(pitch, w, h, frame.ground ? frame.ground.top : h) : 1;
      const widest = pitch ? deskWidest(scene, h, r) : descentWidest(scene, h, orbit ? [r, orbit.prev] : [r]);
      view.ext = crestExtension(widest, w, h, scene.ridges[0]?.dx ?? 1);
      // The painted sun's centre, for the hit target (SunToggle, through
      // ../sunSpot.js) and the harness.
      const host = canvas.parentElement;
      const { spot } = frame;
      publishSunSpot(spot.x, spot.y);
      if (host) {
        host.dataset.sunCx = spot.x.toFixed(2);
        host.dataset.sunCy = spot.y.toFixed(2);
        host.dataset.seed = (value[6] + builtOffset).toFixed(4);
      }
      let { ridges } = scene;
      const n = Math.min(ridges.length, MAX_RIDGES);
      if (!gpuCrests(ridges, n, value[6], builtOffset, mist.sharp)) {
        if (!ridges[0]?.ys || !view.rest) {
          const scales = view.rest ? null : view.ridges.map(rc => rc.s / (view.m ?? 1));
          const drift = { offset: builtOffset, gains: view.gains };
          ({ ridges } = layout(w, h, { size: value[0], horizon: value[1], mist, aspect: r.aspect, scales, ranges: cam.ranges, drift }));
        }
        uploadCrest(ridges, n);
      }

      bakeSky(stops, r.divs, SKY_TEXELS, skyPixels);
      gl.activeTexture(gl.TEXTURE0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SKY_TEXELS, 1, gl.RGBA, gl.UNSIGNED_BYTE, skyPixels);

      const paint = frame.paints;
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
      // A setting body's halo and how far it has set (camera.js bodyAt).
      gl.uniform2fv(uniform('uBodyHalo'), lit.flatMap(b => b.halo ?? [1, 1]).concat([1, 1]).slice(0, 4));
      gl.uniform1fv(uniform('uBodySet'), lit.map(b => b.set ?? 0).concat([0]).slice(0, 2));
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
      // (0.2.2) The body's light on the ridges: camera.js ridgeLightAt.
      const { light } = frame;
      const { st } = light;
      gl.uniform1fv(uniform('uLitA'), f(1, (_, i) => (st > 0 ? light.la[i] : 0)));
      gl.uniform1fv(uniform('uShadeA'), f(1, () => (st > 0 ? light.sh : 0)));
      if (st > 0) {
        gl.uniform3fv(uniform('uLitCol'), rgb01(light.col));
        gl.uniform3fv(uniform('uShadeCol'), light.shade);
        gl.uniform3f(uniform('uLitAt'), light.x, light.spread, light.depth);
        gl.uniform1f(uniform('uLitBase'), light.base);
      }
      // The veils and air: the haze, glowing with the body's light.
      gl.uniform3fv(uniform('uMist'), rgb01(light.mist));
      gl.uniform1f(uniform('uAirA'), frame.air);
      gl.uniform1f(uniform('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(r));
      if (grainOut && grainA !== grainOpacity(r)) {
        grainA = grainOpacity(r);
        grainEl.style.opacity = String(grainA);
      }
      // The sky and the meadow.
      // (0.2.2) The sky under the camera: camera.js skyUnder.
      const { sky } = frame;
      gl.uniform1f(uniform('uSkyShift'), sky.shift);
      gl.uniform1f(uniform('uSkyScale'), sky.scale);
      gl.uniform1f(uniform('uHorizon'), view.horizon);
      const { ground } = frame;
      groundShown = !!ground;
      gl.uniform1f(uniform('uFront'), ground ? ground.top : h);
      if (ground) {
        gl.uniform4f(uniform('uGroundY'), ...ground.stops.map(([y]) => y));
        gl.uniform3fv(uniform('uGroundCol'), ground.stops.flatMap(([, c]) => rgb01(c)));
      }
      // (0.3) The camera's pitch, the ground under it and the desk.
      gl.uniform1i(uniform('uPitched'), pitch ? 1 : 0);
      if (!pitch) {
        meadowShown = false;
        meadowAt = null;
        poolSeen = false;
        houseSeen = false;
        lawnSeen = false;
      }
      if (pitch) {
        gl.uniform4f(uniform('uPitch'), pitch.cos, pitch.sin, pitch.f, pitch.zoom);
        gl.uniform2f(uniform('uYaw'), pitch.yc, pitch.ys);
        gl.uniform4f(uniform('uPrin'), pitch.sx, pitch.sy, pitch.vx, pitch.vy);
        gl.uniform1f(uniform('uCm'), view.m);
        gl.uniform2f(uniform('uEye'), cam.eye, cam.back);
        const cm = cameraMetres(cam);
        gl.uniform3f(uniform('uCamM'), cm.x, cm.y, cm.z);
        gl.uniform2f(uniform('uHazeAt'), ...GRASS_HAZE);
        if (frame.grass) {
          gl.uniform3fv(uniform('uGrassGround'), rgb01(frame.grass.ground));
          gl.uniform3fv(uniform('uGrassFar'), rgb01(frame.grass.far));
          gl.uniform3fv(uniform('uGrassSky'), frame.grass.sky);
        }
        // (0.3.2) The meadow's paint comes in as the camera comes down from
        // where the descent starts (~64 m), so that frame is the 0.2 meadow.
        const sm = Math.min(1, Math.max(0, (64 - cm.y) / 22));
        meadowShown = !!frame.grass && sm > 0;
        // The rows the pass can touch (CSS px from the top): the ground's
        // first, and the first within FLOWER_M (the flowers'). Down the
        // optical centre's column, the nearest ground on each row.
        const rowWhere = test => {
          if (test(0)) return 0;
          let lo = 0;
          let hi = h;
          if (!test(hi)) return h;
          for (let i = 0; i < 20; i++) {
            const mid = (lo + hi) / 2;
            if (test(mid)) hi = mid;
            else lo = mid;
          }
          return lo;
        };
        // (0.4.2) The house and the pool, where they're seen (the water from
        // above it only). (0.4.13) Seen means in the frame, not only turned
        // toward: looking straight down at the desk as the camera turns,
        // none of their passes run.
        const seen = (lo, hi) => boxSeen(pitch, cm, w, h, lo, hi);
        poolSeen = !!frame.grass && cm.y > POOL.at[1] + 0.05 && seen(POOL_BOX[0], POOL_BOX[1]);
        houseSeen = !!frame.grass && seen(HOUSE_BOUNDS.lo, HOUSE_BOUNDS.hi);
        lawnSeen = !!frame.grass && seen(MOUND_BOX[0], MOUND_BOX[1]);
        if (desk > 0.1 || contact > 0 || houseSeen || lawnSeen) {
          ensureWarmHouse();
        }
        meadowAt = frame.grass
          ? {
              pitch, cam, cm, front: ground ? ground.top : h, colours: frame.grass, a: sm * sm * (3 - 2 * sm), lid: frame.lid, device: frame.device,
              top: rowWhere(y => groundAt(pitch, cam, pitch.sx, y) !== null),
              near: rowWhere(y => (groundAt(pitch, cam, pitch.sx, y)?.d ?? Infinity) < FLOWER_M),
              // (0.3.5) How far the meadow runs to the mountains' foot down
              // the centre (metres): a tree past it would stand on the
              // ridges. Unbounded while the foot is above the frame.
              farM: (() => {
                if (!ground) return 0;
                const row = rowWhere(y => (toVirtual(pitch, pitch.sx, y)?.y ?? Infinity) > ground.top);
                return row <= 0 ? 1e5 : groundAt(pitch, cam, pitch.sx, row + 1)?.d ?? 1e5;
              })(),
              // The foot's mist (MEADOW_FOOT): its colour, the plain's at the
              // foot leaned to the haze, and its rows, from its highest top
              // over the foot down to where it's thinned out on the plain.
              mist: ground ? mix(ground.stops[0][1], light.mist, 0.15) : null,
              mistRows: ground
                ? [
                    rowWhere(y => (toVirtual(pitch, pitch.sx, y)?.y ?? Infinity) > ground.top - (FOOT_MIST.up[0] + FOOT_MIST.up[1]) * h),
                    rowWhere(y => (toVirtual(pitch, pitch.sx, y)?.y ?? Infinity) > view.horizon + (ground.top - view.horizon) / FOOT_MIST.plain),
                  ]
                : null,
            }
          : null;
      }
      // (0.3.11) Where the lamp's shade is on screen, for its hit target
      // (LampToggle, through ../lampSpot.js): live wherever the lamp is in
      // the frame and big enough to see (the owner, 2026-10-06: clickable
      // from anywhere, not only at the holds); null elsewhere.
      // Its outline (every part) goes with the camera, for a drag.
      const lampPose = meadowAt ? lampPoseNow() : null;
      const hit = meadowAt && !noLamp && lampProgram() ? lampHitOn(meadowAt.pitch, meadowAt.cm, lampPose) : null;
      const shown = hit && hit.r >= 4 && hit.x + hit.w > 0 && hit.x < w && hit.y + hit.h > 0 && hit.y < h;
      publishLampSpot(shown ? { ...hit, cam: { P: meadowAt.pitch, cm: meadowAt.cm }, pose: lampPose, device: meadowAt.device } : null);
      // The grass, once the camera is low enough to see blades.
      const cmY = pitch ? cam.eye * 40 : Infinity;
      grassAt = pitch && frame.grass && cmY < GRASS.over && !noGrass
        ? { pitch, cam: cameraMetres(cam), colours: frame.grass, haze: frame.ground ? frame.ground.stops[1][1] : frame.grass.ground }
        : null;
      footCam = grassAt ? { pitch, cam } : null;
      if (!footCam) walker.lift();
      const { life } = frame;
      lifeShown = !!life;
      // (0.4.4) The birds by day, as many as the sky's life has (none under
      // reduced motion: they'd hang in the air).
      birdWeight = life && !motion.matches ? life.amount * life.birds : 0;
      gl.uniform1f(uniform('uLifeA'), life ? life.amount : 0);
      if (life) {
        // Under reduced motion the sky holds still and the birds stay away.
        gl.uniform2f(uniform('uLifeMix'), motion.matches ? 0 : life.birds, life.stars);
        gl.uniform3fv(uniform('uCloudLit'), rgb01(life.cloud[0]));
        gl.uniform3fv(uniform('uCloudShade'), rgb01(life.cloud[1]));
        gl.uniform3fv(uniform('uBirdCol'), rgb01(life.bird));
        gl.uniform1f(uniform('uSkyT'), skyT);
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
      // Mid-switch the drift eases between the scenes' on the switch's
      // clock, so the veils' swing never jumps when the theme changes.
      const to = mistOf(r.mist).drift;
      const from = orbit ? mistOf(orbit.prev.mist).drift : to;
      const drift = from + (to - from) * (orbit ? orbit.e : 1);
      return scene.veils.slice(0, MAX_RIDGES).map((v0, i) => {
        // Each veil moves and scales with its ridge (camera.js), drift and all.
        const rc = view.ridges[i];
        let v = rc ? veilAt(v0, scene.ridges[i], rc, w) : v0;
        // Its opacity follows the ridge's slot as it slides back.
        // The far ridge and the distant ranges thin theirs (FAR_VEIL).
        // (Past the top every veil thins a little, DESCENT_VEIL, and the
        // far ridge's and the distant ranges' more, FAR_VEIL.)
        if (rc && !view.rest) v = { ...v, a: veilAlpha(rc.t, view.haze, scene.ridges[i].fade) * (1 - FAR_VEIL * (rc.flat ?? 0)) * (1 - DESCENT_VEIL * view.k) };
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

    function drawGrass(prints) {
      const g = grassProgram();
      if (!g) return;
      const { pitch: P, cam: c, colours, haze } = grassAt;
      gl.useProgram(g.prog);
      gl.bindVertexArray(g.vao);
      gl.depthFunc(gl.LESS);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform1f(g.u('uT'), windPhase / WIND.speed);
      gl.uniform1f(g.u('uWindA'), motion.matches || frozen ? 0 : 1);
      gl.uniform1f(g.u('uRebound'), motion.matches ? 0 : 1);
      setPrints(g.u, prints);
      gl.uniform3fv(g.u('uRoot'), rgb01(colours.root));
      gl.uniform3fv(g.u('uMid'), rgb01(colours.mid));
      gl.uniform3fv(g.u('uTip'), rgb01(colours.tip));
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform1f(g.u('uPxCss'), w / canvas.width);
      gl.uniform4fv(g.u('uTreeShadow'), noTrees ? [0, 0, 0, 1e-3] : LONE_SHADOW);
      gl.uniform3fv(g.u('uShade'), rgb01(colours.shade));
      gl.uniform3fv(g.u('uHaze'), rgb01(haze));
      gl.uniform2f(g.u('uHazeAt'), ...GRASS_HAZE);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, GRASS_VERTS, GRASS_INSTANCES);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.5) The flowers, among the blades and against their depth. They
    // grow in the meadow texture's drifts, so it's built first.
    function drawFlowers(prints) {
      const g = flowerProgram();
      if (!g) return;
      const { pitch: P, cam: c, colours, haze } = grassAt;
      meadowTexture();
      gl.useProgram(g.prog);
      gl.bindVertexArray(g.vao);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform1f(g.u('uT'), windPhase / WIND.speed);
      gl.uniform1f(g.u('uWindA'), motion.matches || frozen ? 0 : 1);
      gl.uniform1f(g.u('uRebound'), motion.matches ? 0 : 1);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform1f(g.u('uPxCss'), w / canvas.width);
      gl.uniform4fv(g.u('uTreeShadow'), noTrees ? [0, 0, 0, 1e-3] : LONE_SHADOW);
      gl.uniform3fv(g.u('uShade'), rgb01(colours.shade));
      gl.uniform1i(g.u('uMeadow'), 5);
      setPrints(g.u, prints);
      gl.uniform3fv(g.u('uMid'), rgb01(colours.mid));
      gl.uniform3fv(g.u('uTip'), rgb01(colours.tip));
      gl.uniform3fv(g.u('uFlower'), rgb01(colours.flower));
      gl.uniform3fv(g.u('uBloom'), rgb01(colours.bloom));
      gl.uniform3fv(g.u('uPetal'), rgb01(colours.petal));
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uHaze'), rgb01(haze));
      gl.uniform2f(g.u('uHazeAt'), ...GRASS_HAZE);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, FLOWER_VERTS, FLOWER_INSTANCES);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.5) The trees, against the same depth.
    // A shadow multiplied into the scene's ground and nothing else: pinned
    // to the far plane, it passes only where no solid thing stands (the
    // blades and the desk shade themselves: grassShader.js, deskShader.js),
    // writing no depth.
    function shadeInto(drawShadow) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.DST_COLOR, gl.ZERO);
      gl.depthMask(false);
      gl.depthRange(1, 1);
      gl.depthFunc(gl.LEQUAL);
      drawShadow();
      gl.depthFunc(gl.LESS);
      gl.depthRange(0, 1);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    function drawTrees(shade) {
      const g = treeProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours, a, mist, farM } = meadowAt;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform1f(g.u('uT'), windPhase / WIND.speed);
      gl.uniform1f(g.u('uWindA'), motion.matches || frozen ? 0 : 1);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      // (Turned to the house there are no mountains' foot to fade at.)
      gl.uniform1f(g.u('uFarM'), houseSeen ? 1e5 : farM);
      gl.uniform1f(g.u('uA'), a);
      gl.uniform3fv(g.u('uShadeC'), rgb01(colours.leafShade));
      gl.uniform3fv(g.u('uLeaf'), rgb01(colours.leaf));
      gl.uniform3fv(g.u('uLit'), rgb01(colours.leafLit));
      gl.uniform3fv(g.u('uBark'), rgb01(colours.bark));
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uHaze'), rgb01(mist));
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.uniform3fv(g.u('uShadow'), rgb01(colours.shade));
      if (shade) {
        // The shadows, multiplied into the ground (the blades in front of
        // it keep theirs: grassShader.js), writing no depth.
        gl.bindVertexArray(g.shadowVao);
        shadeInto(() => gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, g.shadows));
      } else {
        // The wood (six-sided tubes, 36 vertices each), then the leaves.
        gl.bindVertexArray(g.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, g.wood);
        gl.bindVertexArray(g.leafVao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, g.leaves);
      }
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.6) The desk: its planks, writing their depth, or (`shade`) its
    // shadow multiplied into the ground, writing none.
    function drawDesk(shade) {
      const g = deskProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours } = meadowAt;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3fv(g.u('uWood'), rgb01(colours.wood));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uShadow'), rgb01(colours.shade));
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      const lid = ((meadowAt.lid ?? 0) * Math.PI) / 180;
      gl.uniform2f(g.u('uLid'), Math.cos(lid), Math.sin(lid));
      gl.uniform3fv(g.u('uGlow'), laptopLight().glow);
      gl.uniform1f(g.u('uTablet'), meadowAt.device === 'tablet' && !noLaptop ? 1 : 0);
      gl.uniform1f(g.u('uProps'), noProps ? 0 : 1);
      lampUniforms(g, true);
      if (shade) {
        gl.bindVertexArray(g.shadowVao);
        shadeInto(() => gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1));
      } else {
        gl.bindVertexArray(g.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, g.wood);
      }
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.9) The laptop's screen as a light: its mean colour as it wakes,
    // stronger by night (how dark the sky overhead is), for the laptop's
    // deck and the desk's top; and the keyboard's backlight, by night only.
    function laptopLight() {
      const { colours, lid: deg = 0 } = meadowAt;
      const t = Math.min(1, Math.max(0, (deg - 20) / 60));
      const wake = t * t * (3 - 2 * t);
      const [r, g, b] = rgb01(colours.env[0]);
      const sky = 0.299 * r + 0.587 * g + 0.114 * b;
      const night = 1 - Math.min(1, Math.max(0, (sky - 0.12) / 0.43));
      const top = rgb01(colours.screenTop);
      const foot = rgb01(colours.screenFoot);
      const k = wake * (0.06 + 7 * night * night);
      const lit = night * night * wake;
      return { wake, night, glow: top.map((v, i) => ((v + foot[i]) / 2) * k), backlight: [0.85 * lit, 0.88 * lit, 0.95 * lit] };
    }

    // (0.3.11) The lamp's light: on by night (the recipe's `lamp`), its
    // bulb's colour; by night, at rest, an occasional stutter (lampShape.js
    // makeFlicker) on the frame loop's clock. Never under reduced motion,
    // `?freeze=1` or mid-switch.
    // Mid-switch it follows the sky's turn: switching to night it comes up
    // as the sky darkens, to day it fades as the light comes back.
    const flicker = makeFlicker();
    // The pose as drawn: the dragged one, unless it would stand in this
    // frame's device (a rotation can swap the laptop for the tablet).
    function lampPoseNow() {
      const p = getLampPose();
      return lampClear(p, meadowAt?.device ?? 'laptop') ? p : LAMP_POSE;
    }
    // (0.4.8) The house's night: the scene's own day or night (its recipe's
    // lamp), turned with the switch, not the sky's brightness (a dusk sky
    // is half dark by day).
    function houseNight() {
      if (!orbit) return recipeRef.current.lamp ? 1 : 0;
      const t = Math.min(1, Math.max(0, orbit.e));
      const e = t * t * (3 - 2 * t);
      return orbit.next.lamp ? (orbit.prev.lamp ? 1 : e) : orbit.prev.lamp ? 1 - e : 0;
    }
    function lampLight() {
      if (noLamp) return [0, 0, 0];
      let k = recipeRef.current.lamp ? 1 : 0;
      if (orbit) {
        const smooth = (a, b, x) => {
          const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
          return t * t * (3 - 2 * t);
        };
        k = orbit.next.lamp ? (orbit.prev.lamp ? 1 : smooth(0.05, 1, orbit.e)) : orbit.prev.lamp ? 1 - smooth(0, 0.8, orbit.e) : 0;
      } else if (k && !motion.matches && !frozen) k *= flicker(skyT);
      return rgb01(LAMP.bulb).map(v => v * k * LAMP.power);
    }
    // Where the lamp's bulb is and where its shade points, for every pass
    // its light falls on; with `segs`, the arms and shade its shadow is
    // cast from (the desk).
    function lampUniforms(g, segs) {
      const pose = lampPoseNow();
      const at = lampAt(pose);
      gl.uniform3fv(g.u('uLamp'), lampLight());
      gl.uniform3fv(g.u('uLampBulb'), at.bulb);
      gl.uniform3fv(g.u('uLampAxis'), at.axis);
      if (segs) gl.uniform3fv(g.u('uLampSeg'), lampSegments(at));
    }

    // (0.3.11) The lamp on the desk, writing its depth.
    function drawLamp() {
      const g = lampProgram();
      if (!g) return;
      const pose = lampPoseNow();
      if (g.pose !== pose) {
        const { data, count } = lampMesh(pose);
        gl.bindBuffer(gl.ARRAY_BUFFER, g.buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        g.count = count;
        g.pose = pose;
      }
      const { pitch: P, cm: c, colours } = meadowAt;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3fv(g.u('uPaint'), rgb01(LAMP.paint));
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uWood'), rgb01(colours.wood));
      lampUniforms(g);
      gl.uniform1f(g.u('uNight'), laptopLight().night);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.bindVertexArray(g.vao);
      gl.drawArrays(gl.TRIANGLES, 0, g.count);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.12) What's in the mug: 0 coffee (night), 1 tea (day, the recipe's
    // `tea`). Mid-switch it turns with the sky, as the lamp does.
    function teaNow() {
      let k = recipeRef.current.tea ? 1 : 0;
      if (orbit) {
        const t = Math.min(1, Math.max(0, (orbit.e - 0.15) / 0.7));
        const e = t * t * (3 - 2 * t);
        k = orbit.next.tea ? (orbit.prev.tea ? 1 : e) : orbit.prev.tea ? 1 - e : 0;
      }
      return k;
    }

    // (0.3.12) The things on the desk, writing their depth.
    function drawProps() {
      const g = propsProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours } = meadowAt;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uWood'), rgb01(colours.wood));
      gl.uniform1f(g.u('uNight'), laptopLight().night);
      gl.uniform1f(g.u('uTea'), teaNow());
      const lid = ((meadowAt.lid ?? 0) * Math.PI) / 180;
      gl.uniform2f(g.u('uLid'), Math.cos(lid), Math.sin(lid));
      gl.uniform1f(g.u('uTablet'), meadowAt.device === 'tablet' && !noLaptop ? 1 : 0);
      lampUniforms(g);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.bindVertexArray(g.vao);
      gl.drawArrays(gl.TRIANGLES, 0, g.count);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.4.4) The house's mesh, then its curtains (tied back by day, drawn
    // closed by night: closing on the switch's clock as the lamp's light
    // comes up), under whichever program is bound (`u` its uniforms).
    // (0.4.12) `part`: 'solid' (all but the lawn), 'lawn', or 'all'.
    function houseGeometry(g, u, part = 'solid') {
      gl.uniform1f(u('uMorph'), 0);
      gl.bindVertexArray(g.vao);
      const [from, to] = part === 'lawn' ? [0, g.lawn] : part === 'solid' ? [g.lawn, g.count] : [0, g.count];
      gl.drawArrays(gl.TRIANGLES, from, to - from);
      if (part === 'lawn') {
        gl.bindVertexArray(null);
        return;
      }
      gl.uniform1f(u('uMorph'), houseNight());
      gl.bindVertexArray(g.curtains.vao);
      gl.drawArrays(gl.TRIANGLES, 0, g.curtains.count);
      gl.bindVertexArray(null);
    }

    // (0.4.18) The mirrors' probes (mirrorProbe.js, texture unit 15): made
    // when the house is first in view; each mirror's six faces drawn a face
    // a frame while it's within reach, and again as the switch relights
    // the house.
    let probes;
    let probeSet = null;
    let probing = false;
    const mirrorProbes = () => {
      if (!houseBuilt) return false;
      if (probes === undefined) probes = (!noMirror && houseBuilt.house.mirrors?.length && makeProbes(gl, 15)) || false;
      if (probes && !probeSet) probeSet = probeLayout(houseBuilt.house.mirrors).map(m => ({ ...m, faces: 0, night: -1 }));
      return probes;
    };
    // (0.4.24) The person, for checking its design in place (the walk isn't
    // built): `?person=x,z,yaw[,pose]` stands it there (metres, degrees;
    // `stand`, `stride` or `pass`), lit by the house's pass. Off without it.
    const personAt = (() => {
      const q = params.get('person');
      if (!q) return null;
      const [x, z, yaw = 180, name = 'stride'] = q.split(',');
      return { x: +x || 0, z: +z || 0, yaw: ((+yaw || 0) * Math.PI) / 180, name };
    })();
    let person = null;
    const personBuffer = () => {
      if (person !== null || !personAt) return person;
      const { data, count } = personMesh(personAt.name);
      const c = Math.cos(personAt.yaw);
      const sn = Math.sin(personAt.yaw);
      const y = moundY(personAt.x, personAt.z);
      for (let i = 0; i < data.length; i += HOUSE_STRIDE) {
        const [x, py, z, nx, ny, nz] = data.slice(i, i + 6);
        data.set([personAt.x + c * x + sn * z, y + py, personAt.z - sn * x + c * z, c * nx + sn * nz, ny, -sn * nx + c * nz], i);
      }
      const b = gl.createBuffer();
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [i, n, at] of [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7]]) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, HOUSE_STRIDE * 4, at * 4);
      }
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      return (person = { vao, buf: b, count });
    };
    function mirrorUniforms(g, on) {
      const set = probes ? probeSet : null;
      gl.uniform1f(g.u('uProbeOn'), on && set ? 1 : 0);
      if (!set) return;
      probes.bind();
      gl.uniform1i(g.u('uProbe'), 15);
      gl.uniform1i(g.u('uProbeN'), set.length);
      gl.uniform3fv(g.u('uProbeAt'), set.flatMap(m => m.at));
      gl.uniform3fv(g.u('uProbeLo'), set.flatMap(m => m.lo));
      gl.uniform3fv(g.u('uProbeHi'), set.flatMap(m => m.hi));
      gl.uniform3fv(g.u('uMirrorAt'), set.flatMap(m => m.c));
      gl.uniform1fv(g.u('uProbeReady'), set.map(m => (m.faces >= 6 || m.night >= 0 ? 1 : 0)));
    }
    // One face of the probe most in need of it, if any is (true: drawn).
    let backdrop = null;
    const probeBackdrop = () => {
      if (backdrop !== null) return backdrop;
      if (noHouse || noMirror) return (backdrop = false);
      const bp = pollPassProgram(gl, extParallel, probeBackdropAsync);
      if (!bp) return probeBackdropAsync?.failed ? (backdrop = false) : null;
      const BU = {};
      backdrop = { prog: bp, vao: gl.createVertexArray(), u: name => (BU[name] ??= gl.getUniformLocation(bp, name)) };
      return backdrop;
    };
    function probeStep() {
      const pr = mirrorProbes();
      if (!pr || !houseProgram()) return false;
      const b = probeBackdrop();
      if (b === null) return false;
      const night = houseNight();
      const cm = meadowAt.cm;
      let k = -1;
      let best = Infinity;
      probeSet.forEach((m, i) => {
        const d = Math.hypot(m.c[0] - cm.x, m.c[1] - cm.y, m.c[2] - cm.z);
        const stale = m.faces < 6 || Math.abs(m.night - night) > 0.03;
        if (stale && d < PROBE.reach && d < best) {
          best = d;
          k = i;
        }
      });
      if (k < 0) return false;
      const m = probeSet[k];
      if (m.faces >= 6) {
        m.faces = 0;
        m.night = -1;
      }
      const f = m.faces;
      const [yaw, pitch] = PROBE_FACES[f];
      const S = pr.size;
      const view = { P: { cos: Math.cos(pitch), sin: Math.sin(pitch), f: S / 2, zoom: 1, yc: Math.cos(yaw), ys: Math.sin(yaw), sx: S / 2, sy: S / 2 }, c: { x: m.at[0], y: m.at[1], z: m.at[2] }, size: S };
      const sky = meadowAt.colours.env;
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.disable(gl.BLEND);
      // (0.4.26) The house, its lawn, then the outdoors where they left the
      // face empty.
      pr.face(k, f, rgb01(sky[1]), () => {
        drawHouse(false, false, view);
        drawHouse(false, true, view);
        if (!b) return;
        gl.useProgram(b.prog);
        gl.uniform2f(b.u('uYP'), yaw, pitch);
        gl.uniform3fv(b.u('uTop'), rgb01(sky[0]));
        gl.uniform3fv(b.u('uLow'), rgb01(sky[1]));
        gl.uniform3fv(b.u('uHaze'), rgb01(meadowAt.mist ?? sky[1]));
        gl.uniform1f(b.u('uNight'), night);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
        gl.bindVertexArray(b.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.depthMask(true);
        gl.depthFunc(gl.LESS);
        gl.useProgram(prog);
      });
      gl.viewport(0, 0, canvas.width, canvas.height);
      m.faces = f + 1;
      if (m.faces === 6) m.night = night;
      return true;
    }

    // (0.4.2) The sun's shadow map of the house, redrawn when the light
    // moves (houseShadow.js).
    function houseShadowMap(g, sh, colours) {
      sh.map.render(m => {
        gl.useProgram(sh.prog);
        gl.uniformMatrix4fv(sh.u, false, m);
        gl.bindVertexArray(g.vao);
        gl.drawArrays(gl.TRIANGLES, g.lawn, g.count - g.lawn);
      }, lightDir(colours.dir));
      gl.viewport(0, 0, canvas.width, canvas.height);
      sh.map.bind();
    }

    // (0.4.0) The house and its pool, writing their depth. (0.4.12) Or,
    // `lawn`, only the hill's lawn: after the grass and the ground (the
    // blades stand over it), and the meadow's paint goes on over it as over
    // the ground (meadowShader.js writes the hill's depth).
    // (0.4.18) `view`: drawn for a mirror's probe instead, from its camera
    // ({ P, c, size }: no shadow map redrawn, no occlusion, no grain).
    function drawHouse(mirror = false, lawn = false, view = null, who = false) {
      const g = houseProgram();
      if (!g) return;
      const { colours } = meadowAt;
      const P = view ? view.P : meadowAt.pitch;
      const c = view ? view.c : meadowAt.cm;
      const [fw, fh] = view ? [view.size, view.size] : [w, h];
      // (0.4.2) The sun's shadow map, redrawn when the light moves.
      const sh = houseShadow();
      if (sh && !mirror && !lawn && !view) houseShadowMap(g, sh, colours);
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, fw, fh);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uWood'), rgb01(colours.far));
      gl.uniform3fv(g.u('uLawn'), rgb01(colours.far));
      gl.uniform3fv(g.u('uLawnNear'), rgb01(colours.ground));
      gl.uniform3fv(g.u('uHaze'), rgb01(colours.env[1]));
      gl.uniform2f(g.u('uHazeAt'), ...GRASS_HAZE);
      gl.uniform1f(g.u('uNight'), houseNight());
      gl.uniformMatrix4fv(g.u('uLightVP'), false, sh ? sh.map.matrix : IDENTITY);
      gl.uniform1i(g.u('uShadow'), 9);
      gl.uniform1i(g.u('uLightData'), 16);
      gl.uniform1f(g.u('uShadowOn'), sh ? 1 : 0);
      gl.uniform1i(g.u('uCaustics'), 10);
      gl.uniform1f(g.u('uCausticsOn'), causticsReady && poolSeen ? 1 : 0);
      gl.uniform2f(g.u('uMirror'), mirror ? 1 : 0, POOL.at[1]);
      gl.uniform1i(g.u('uAO'), 13);
      gl.uniform1f(g.u('uAOOn'), aoReady && !mirror && !view ? 1 : 0);
      gl.uniform2f(g.u('uAORes'), canvas.width, canvas.height);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut || view ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      mirrorUniforms(g, !view && !mirror);
      if (who) {
        const pb = personBuffer();
        gl.uniform1f(g.u('uAOOn'), 0);
        gl.uniform1f(g.u('uMorph'), 0);
        gl.bindVertexArray(pb.vao);
        gl.drawArrays(gl.TRIANGLES, 0, pb.count);
        gl.bindVertexArray(null);
      } else if (lawn) houseGeometry(g, g.u, 'lawn'); else if (!mirror && !view && aoReady) {
        // (0.4.2) Its depth first, colour off (the depth pass's program,
        // which shades nothing), then each pixel shaded once.
        const a = aoPass;
        gl.useProgram(a.prog);
        gl.colorMask(false, false, false, false);
        houseGeometry(g, a.u);
        gl.colorMask(true, true, true, true);
        gl.useProgram(g.prog);
        gl.depthFunc(gl.LEQUAL);
        houseGeometry(g, g.u);
        gl.depthFunc(gl.LESS);
      } else houseGeometry(g, g.u);
      gl.useProgram(prog);
    }

    // (0.4.2) The glass and the water, last, over copies of the frame: the
    // windows and the water, then the terrace's glass in front of them.
    function drawGlass() {
      const g = glassProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours } = meadowAt;
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      // (0.4.2) The house mirrored in the pool, at a quarter of the frame, for
      // the water to show (texture unit 12; clear where nothing stands).
      const mirrored = poolSeen && !noMirror && !!reflectTarget();
      if (mirrored) {
        const rt = reflectTarget();
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
        gl.viewport(0, 0, rt.size[0], rt.size[1]);
        gl.clearColor(0, 0, 0, 0);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.depthFunc(gl.LESS);
        drawHouse(true);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.activeTexture(gl.TEXTURE12);
        gl.bindTexture(gl.TEXTURE_2D, rt.tex);
        gl.activeTexture(gl.TEXTURE0);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
      }
      copyFrame(g);
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uWood'), rgb01(colours.far));
      gl.uniform1f(g.u('uNight'), houseNight());
      gl.uniform1i(g.u('uScene'), 11);
      const sim = poolSeen ? waterSim() : null;
      sim?.bind();
      gl.uniform1i(g.u('uWater'), 8);
      gl.uniform1f(g.u('uWaterOn'), sim ? 1 : 0);
      gl.uniform1f(g.u('uWaterT'), skyT);
      gl.uniform1i(g.u('uReflect'), 12);
      gl.uniform1f(g.u('uReflectOn'), mirrored ? 1 : 0);
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniformMatrix4fv(g.u('uLightVP'), false, shadow ? shadow.map.matrix : IDENTITY);
      gl.uniform1i(g.u('uShadow'), 9);
      gl.uniform1f(g.u('uShadowOn'), shadow ? 1 : 0);
      gl.bindVertexArray(g.vao);
      const { windows, rails, water: pool } = g.mesh;
      gl.drawArrays(gl.TRIANGLES, windows[0], windows[1]);
      gl.drawArrays(gl.TRIANGLES, pool[0], pool[1]);
      // (The terrace's glass bends the same copy: what's behind it there is
      // mostly the sky and the meadow, drawn before.)
      gl.drawArrays(gl.TRIANGLES, rails[0], rails[1]);
      gl.bindVertexArray(null);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.useProgram(prog);
    }

    // (0.3.12) The steam off the mug, over everything drawn, behind what
    // stands in front of it (depth tested, writing none). Its clock is the
    // closing sky's (still under reduced motion and `?freeze=1`).
    function drawSteam() {
      const g = steamProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours } = meadowAt;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform1f(g.u('uT'), skyT);
      gl.uniform1f(g.u('uSteam'), 1);
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uLamp'), lampLight());
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(g.vao);
      gl.drawArrays(gl.TRIANGLES, 0, STEAM_WISPS * 6);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
      gl.useProgram(prog);
    }

    // (0.3.8) The laptop on the desk, writing its depth.
    function drawLaptop() {
      const g = laptopProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours, lid: deg = 0 } = meadowAt;
      const lid = (deg * Math.PI) / 180;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform2f(g.u('uLid'), Math.cos(lid), Math.sin(lid));
      gl.uniform3f(g.u('uAt'), ...LAPTOP.at);
      gl.uniform3fv(g.u('uMetal'), rgb01(LAPTOP.metal));
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uWood'), rgb01(colours.wood));
      gl.uniform3fv(g.u('uScreenTop'), rgb01(colours.screenTop));
      gl.uniform3fv(g.u('uScreenFoot'), rgb01(colours.screenFoot));
      // The screen wakes as the lid lifts past ~20°, fully lit by ~80°.
      const shine = laptopLight();
      gl.uniform1f(g.u('uWake'), shine.wake);
      gl.uniform3fv(g.u('uGlow'), shine.glow);
      gl.uniform3fv(g.u('uBacklight'), shine.backlight);
      gl.uniform1f(g.u('uNight'), shine.night);
      lampUniforms(g);
      gl.uniform1i(g.u('uDeck'), 6);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.bindVertexArray(g.vao);
      gl.drawArrays(gl.TRIANGLES, 0, g.count);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.10) The tablet and its books, where a portrait frame's path
    // ends, writing their depth; lit as the laptop is.
    function drawTablet() {
      const g = tabletProgram();
      if (!g) return;
      const { pitch: P, cm: c, colours } = meadowAt;
      gl.useProgram(g.prog);
      gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
      gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
      gl.uniform4f(g.u('uScreen'), P.sx, P.sy, w, h);
      gl.uniform3f(g.u('uCam'), c.x, c.y, c.z);
      gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
      gl.uniform2fv(g.u('uSunDir'), colours.dir);
      gl.uniform3f(g.u('uAt'), ...TABLET.at);
      gl.uniform3fv(g.u('uMetal'), rgb01(TABLET.metal));
      gl.uniform3fv(g.u('uSun'), rgb01(colours.sun));
      gl.uniform3fv(g.u('uSky'), colours.sky);
      gl.uniform3fv(g.u('uEnvTop'), rgb01(colours.env[0]));
      gl.uniform3fv(g.u('uEnvLow'), rgb01(colours.env[1]));
      gl.uniform3fv(g.u('uWood'), rgb01(colours.wood));
      gl.uniform3fv(g.u('uScreenTop'), rgb01(colours.screenTop));
      gl.uniform3fv(g.u('uScreenFoot'), rgb01(colours.screenFoot));
      // Its screen wakes when the laptop's would, as the camera comes round.
      const shine = laptopLight();
      gl.uniform1f(g.u('uWake'), shine.wake);
      gl.uniform1f(g.u('uNight'), shine.night);
      lampUniforms(g);
      gl.uniform1i(g.u('uBack'), 7);
      gl.uniform1i(g.u('uGrain'), 2);
      gl.uniform1f(g.u('uGrainA'), noGrain || grainOut ? 0 : grainOpacity(recipeRef.current));
      gl.uniform1f(g.u('uCssPerPx'), w / canvas.width);
      gl.uniform1f(g.u('uResY'), canvas.height);
      gl.bindVertexArray(g.vao);
      gl.drawArrays(gl.TRIANGLES, 0, g.count);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    // (0.3.2) The meadow pass over the scene's ground: the paint multiplied
    // in (×2·src, so it lightens and darkens), then the flowers added.
    function drawMeadow(prints) {
      if (!meadowAt || (!meadowShown && !prints.n)) return;
      const M = meadowPrograms();
      if (!M) return;
      meadowTexture();
      const { pitch: P, cam: c, cm, front, colours, a, top, near, mist, mistRows } = meadowAt;
      if (top >= h) return;
      gl.bindVertexArray(M.vao);
      gl.enable(gl.BLEND);
      // Each pass only over the rows it can touch (scissor rows count up
      // from the canvas's foot, in device px).
      gl.enable(gl.SCISSOR_TEST);
      const rows = y => Math.min(canvas.height, Math.ceil(((h - y) / h) * canvas.height) + 2);
      const passes = grassAt ? [M.paint, M.flowers] : [M.paint];
      if (mist && meadowShown) passes.push(M.foot);
      for (const g of passes) {
        if (!g) continue;
        gl.useProgram(g.prog);
        if (g === M.paint) {
          gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR);
          gl.scissor(0, 0, canvas.width, rows(top));
        } else if (g === M.foot) {
          const [y0, y1] = mistRows;
          if (y0 >= h || y1 <= y0) continue;
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.scissor(0, Math.max(0, rows(y1) - 4), canvas.width, rows(y0) - Math.max(0, rows(y1) - 4));
          gl.uniform3fv(g.u('uFootMist'), rgb01(mist));
        } else {
          if (near >= h) continue;
          gl.blendFunc(gl.ONE, gl.ONE);
          gl.scissor(0, 0, canvas.width, rows(near));
        }
        gl.uniform2f(g.u('uRes'), canvas.width, canvas.height);
        gl.uniform2f(g.u('uSize'), w, h);
        gl.uniform4f(g.u('uPitch'), P.cos, P.sin, P.f, P.zoom);
        gl.uniform2f(g.u('uYaw'), P.yc, P.ys);
        gl.uniform4f(g.u('uPrin'), P.sx, P.sy, P.vx, P.vy);
        gl.uniform1f(g.u('uFront'), front);
        gl.uniform2f(g.u('uEye'), c.eye, c.back);
        gl.uniform3f(g.u('uCamM'), cm.x, cm.y, cm.z);
        gl.uniform2f(g.u('uDepthAB'), ...DEPTH_AB);
        gl.uniform2f(g.u('uHazeAt'), ...GRASS_HAZE);
        gl.uniform1i(g.u('uMeadow'), 5);
        gl.uniform1f(g.u('uMeadowA'), meadowShown ? a : 0);
        gl.uniform1f(g.u('uGrassT'), windPhase / WIND.speed);
        gl.uniform1f(g.u('uWindA'), motion.matches || frozen ? 0 : 1);
        gl.uniform3fv(g.u('uGrassGround'), rgb01(colours.ground));
        gl.uniform3fv(g.u('uGrassMid'), rgb01(colours.mid));
        gl.uniform3fv(g.u('uGrassTip'), rgb01(colours.tip));
        gl.uniform3fv(g.u('uShade'), rgb01(colours.shade));
        gl.uniform3fv(g.u('uFlower'), rgb01(colours.flower));
        gl.uniform3fv(g.u('uBloom'), rgb01(colours.bloom));
        // (0.3.5) The painted flowers fade in where the grass's own fade out
        // (none fade where those can't be drawn).
        if (g === M.flowers) gl.uniform2fv(g.u('uFlowerNear'), flowers ? FLOWERS.fade : [-2, -1]);
        setPrints(g.u, prints);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.useProgram(prog);
    }

    function draw(vs) {
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i];
        const off = i * 4;
        veilPos[off] = v[0];
        veilPos[off + 1] = v[1];
        veilPos[off + 2] = v[2];
        veilPos[off + 3] = v[3];
        veilAlphaBuf[i] = v[4];
      }
      gl.uniform4fv(uniform('uVeil'), veilPos);
      gl.uniform1fv(uniform('uVeilA'), veilAlphaBuf);
      const prints = printsNow();
      gl.viewport(0, 0, canvas.width, canvas.height);
      // (0.4.18) A face of a mirror's probe, while one wants it (and the
      // next frame comes for the next).
      probing = !!meadowAt && !noDesk && !noHouse && houseSeen && probeStep();
      // (0.4.2) The house's depth first, for its ambient occlusion.
      aoReady = !!meadowAt && !noDesk && !noHouse && !noAO && houseSeen && drawHouseDepth();
      const grassOn = !!grassAt && !!grassProgram();
      // (0.3.5) The trees show as soon as the meadow's paint does.
      const treesOn = !!meadowAt?.mist && meadowShown && meadowAt.a > 0.01 && !noTrees && !!treeProgram();
      // (0.3.6) The desk shows whenever the camera's pitched over the meadow.
      const deskOn = !!meadowAt && !noDesk && !!deskProgram();
      if (!grassOn && !treesOn && !deskOn) {
        gl.disable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        drawMeadow(prints);
        lastDrawn = vs;
        return;
      }
      // (0.3.7) The solid things first, writing their depth: the desk
      // (0.3.6), the grass, its flowers and the trees (0.3.5). Then the
      // scene, on the far plane, only where none of them stands, so its
      // shader never runs under them; then the shadows multiplied into it.
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.depthFunc(gl.LESS);
      // (0.3.10) The device before the desk, so the desk's top isn't shaded
      // behind it.
      if (deskOn && !noLaptop) (meadowAt.device === 'tablet' ? drawTablet : drawLaptop)();
      if (deskOn && !noLamp) drawLamp();
      if (deskOn && !noProps) drawProps();
      if (deskOn && !noHouse && houseSeen) drawHouse();
      if (deskOn && personAt && houseProgram()) drawHouse(false, false, null, true);
      if (deskOn) drawDesk(false);
      if (grassOn) {
        drawGrass(prints);
        drawFlowers(prints);
      }
      if (treesOn) drawTrees(false);
      if (birdWeight > 0 && meadowAt) drawBirds();
      gl.useProgram(prog);
      gl.bindVertexArray(null);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      if (deskOn) drawDesk(true);
      if (treesOn) drawTrees(true);
      if (deskOn && !noHouse && lawnSeen) drawHouse(false, true);
      // Then the meadow over the ground the blades leave uncovered (the
      // depth test skips the rest), writing no depth.
      gl.depthMask(false);
      drawMeadow(prints);
      if (deskOn && !noProps) drawSteam();
      gl.depthMask(true);
      if (deskOn && !noHouse && !noGlass && houseSeen) drawGlass();
      // (0.4.26) The fireflies by night (fireflies.js), added on.
      fliesOn = !!meadowAt && !motion.matches && houseNight() > 0.05;
      if (fliesOn) drawBirds(true);
      // (0.4.6) By night round the house, the bright spills a glow.
      const night = houseNight();
      if (deskOn && !noHouse && houseSeen && night > 0.01 && glass && !noBloom) {
        bloom ??= makeBloom(gl, 14) || false;
        if (bloom) {
          copyFrame(glass, true);
          bloom.apply(glass.tex, canvas.width, canvas.height, 0.7 * night);
          gl.useProgram(prog);
        }
      }
      gl.disable(gl.DEPTH_TEST);
      lastDrawn = vs;
    }

    // Profiling (harness only): `?bench=200` redraws the frame that many
    // times once the scene has settled, each draw followed by a one-pixel
    // read so the GPU has finished it, and puts the median and p90 GPU ms on
    // the scene wrapper (`data-bench`, "median p90"), with the same loop
    // around a bare clear as the read's own overhead (`data-bench-base`).
    const benchN = Number(params.get('bench')) || 0;
    function bench() {
      const host = canvas.parentElement;
      if (!host || !lastDrawn || dirty) return void setTimeout(bench, 250);
      const px = new Uint8Array(4);
      const time = fn => {
        const ms = [];
        for (let i = 0; i < benchN + 10; i++) {
          const t0 = performance.now();
          fn();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (i >= 10) ms.push(performance.now() - t0);
        }
        ms.sort((a, b) => a - b);
        return `${ms[ms.length >> 1].toFixed(3)} ${ms[Math.floor(ms.length * 0.9)].toFixed(3)}`;
      };
      host.dataset.benchBase = time(() => gl.clear(gl.COLOR_BUFFER_BIT));
      host.dataset.bench = time(() => draw(lastDrawn));
    }
    if (benchN) setTimeout(bench, 2500);

    // Redraw at rest only once a veil has moved a visible amount.
    const changed = vs =>
      !lastDrawn ||
      vs.some((v, i) => Math.abs(v[0] - lastDrawn[i][0]) * (canvas.width / w) > 0.2 || Math.abs(v[4] - lastDrawn[i][4]) > 0.002);

    function frame(now) {
      raf = 0;
      if (!w) resize();
      if (!w) return;
      // dt exactly as the engine's Wl: seconds, clamped to [.001, .05].
      const gap = now - last;
      const dt = Math.min(0.05, Math.max(0.001, gap / 1000));
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
      // The closing sky, the meadow and the grass in the wind move every frame, not on
      // the idle tick; so do footprints springing back.
      const living = ((lifeShown || !!grassAt || meadowShown || poolSeen || fliesOn) && !motion.matches && !frozen) || (!!grassAt && walker.live(performance.now() / 1000).length > 0);
      if (living) skyT += dt;
      // A scroll, a switch or the spring redraws every frame; at rest the
      // drift, the wind and the veils share one IDLE_HZ tick.
      const busy = dirty;
      // (The first frame after a wake is timed from the kick, not a frame.)
      quality?.sample(woke ? -1 : gap, woke ? false : busy, now);
      woke = false;
      if (busy) rebuild();
      const tick = !busy && now - lastIdleAt >= 1000 / IDLE_HZ;
      let windMoved = false;
      if (tick) {
        lastIdleAt = now;
        if (Math.abs(seedOffset() - builtOffset) > 1e-5) {
          driftCrests();
          crestMoved = true;
        }
        // The wind over the meadow.
        if (groundShown && !frozen && !motion.matches) {
          setWind();
          windMoved = true;
        }
      }
      // The birds fly at the display's rate, not the idle tick's.
      if (living && !busy) gl.uniform1f(uniform('uSkyT'), skyT);
      const vs = veils(dt);
      // (0.4.2) The pool's water steps while it's in view.
      if (poolSeen && !motion.matches && !frozen && waterSim()) {
        water.step(dt);
        // (0.4.2) And the sun's caustics on its floor from the new surface.
        if (meadowAt && !noCaustics) causticsReady = water.caustics(lightDir(meadowAt.colours.dir), 10, skyT);
        gl.useProgram(prog);
      }
      if (busy || crestMoved || windMoved || living || probing || (tick && changed(vs))) draw(vs);

      const moving = !settled();
      const drifting = !motion.matches && !frozen;
      if ((moving || drifting || living || probing) && visible && onScreen) raf = requestAnimationFrame(frame);
    }

    // Like Wl, the clock starts when the loop does, so the first step's dt is
    // the time to the first view.
    const kick = () => {
      if (!raf && visible && onScreen) {
        last = performance.now();
        woke = true;
        raf = requestAnimationFrame(frame);
      }
    };
    kickRef.current = kick;

    const ro = new ResizeObserver(() => {
      // A new frame size is a new load: every level may be tried again.
      quality?.reset();
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
    // (0.4.2) The /house route's free camera, moved.
    const unsubscribeFree = subscribeFreeCam(() => {
      dirty = true;
      kick();
    });
    // (0.3.11) A drag of the lamp: its mesh, light and outline follow.
    const unsubscribeLamp = subscribeLampPose(() => {
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

    // (0.3.1) Footsteps: the pointer cast onto the ground while the grass
    // shows. A moving mouse walks; a touch taps one step.
    function onPointer(e) {
      // (0.4.2) Over the pool, the pointer stirs the water.
      if (poolSeen && water && meadowAt && !motion.matches && (e.type === 'pointermove' || e.type === 'pointerdown')) {
        const rect = canvas.getBoundingClientRect();
        const q = planeAt(meadowAt.pitch, meadowAt.cam, e.clientX - rect.left, e.clientY - rect.top, POOL.at[1]);
        if (q && water.drop(q.x, q.z, e.type === 'pointerdown' ? 0.5 : 0.3, e.type === 'pointerdown' ? 0.03 : 0.008)) kick();
      }
      if (!footCam) return;
      // Not while on (or dragging) the lamp.
      if (e.target?.closest?.('[data-lamp-toggle]')) return void walker.lift();
      const rect = canvas.getBoundingClientRect();
      const g = groundAt(footCam.pitch, footCam.cam, e.clientX - rect.left, e.clientY - rect.top);
      if (!g || g.d > REACH) return void walker.lift();
      const t = performance.now() / 1000;
      if (e.type === 'pointerdown' && e.pointerType === 'touch') walker.tap(g, cameraMetres(footCam.cam), t);
      else if (e.type === 'pointermove' && e.pointerType !== 'touch') {
        if (!walker.move(g, t)) return;
      } else return;
      kick();
    }
    function onPointerOut() {
      walker.lift();
    }
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('pointerleave', onPointerOut);
    window.addEventListener('blur', onPointerOut);

    resize();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      for (const id of warmIdles) (window.cancelIdleCallback ?? clearTimeout)(id);
      houseWorker?.terminate();
      kickRef.current = () => {};
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      unsubscribe();
      unsubscribeLamp();
      unsubscribeFree();
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteTexture(skyTex);
      gl.deleteTexture(crestTex);
      dropGpuCrests();
      gl.deleteTexture(grainTex);
      gl.deleteTexture(moonTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      if (laptop) gl.deleteTexture(laptop.tex);
      if (tablet) gl.deleteTexture(tablet.tex);
      publishLampSpot(null);
      water?.dispose();
      if (bloom) bloom.dispose();
      if (probes) probes.dispose();
      if (birdPass) {
        for (const k of birdPass.kinds) {
          gl.deleteVertexArray(k.vao);
          gl.deleteBuffer(k.mb);
          gl.deleteBuffer(k.ib);
        }
        gl.deleteProgram(birdPass.prog);
      }
      shadow?.map.dispose();
      if (glass) gl.deleteTexture(glass.tex);
      if (aoPass) {
        gl.deleteTexture(aoPass.tex);
        gl.deleteRenderbuffer(aoPass.depth);
        gl.deleteFramebuffer(aoPass.fbo);
        gl.deleteProgram(aoPass.prog);
      }
      if (reflect) {
        gl.deleteTexture(reflect.tex);
        gl.deleteRenderbuffer(reflect.depth);
        gl.deleteFramebuffer(reflect.fbo);
      }
      if (shadow) gl.deleteProgram(shadow.prog);
      if (meadowVao) gl.deleteVertexArray(meadowVao);
      if (meadowPaint) gl.deleteProgram(meadowPaint.prog);
      if (meadowFlowers) gl.deleteProgram(meadowFlowers.prog);
      if (meadowFoot) gl.deleteProgram(meadowFoot.prog);
      if (backdrop) {
        gl.deleteProgram(backdrop.prog);
        gl.deleteVertexArray(backdrop.vao);
      }
      for (const p of [grass, flowers, trees, desk, laptop, tablet, lamp, props, house, glass, steam]) {
        if (!p) continue;
        gl.deleteProgram(p.prog);
        for (const v of [p.vao, p.leafVao, p.shadowVao]) if (v) gl.deleteVertexArray(v);
        if (p.buf) gl.deleteBuffer(p.buf);
      }
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('pointerleave', onPointerOut);
      window.removeEventListener('blur', onPointerOut);
    };
  }, [onFail]);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas ref={grainRef} className={styles.grain} style={{ display: 'none' }} />
    </>
  );
}
