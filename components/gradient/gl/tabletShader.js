/**
 * (0.3.10) The tablet on the desk, where the descent ends on a portrait
 * frame (ROADMAP.md, "Portrait viewports get a tablet"), leaning on a stack
 * of cloth hardbacks. Built in code, as the laptop is, from the same
 * rounded slabs (laptopShader.js `slab`), placed once here (nothing on it
 * moves) and drawn under the same camera and against the same depth.
 *
 * - **The finish** is the laptop's: one space black, aluminium (`METAL_GLSL`),
 *   relit by night, never swapped. The logo is on its back, polished, with
 *   the camera island in the corner.
 * - **The screen** is black glass edge to edge, the panel under it a
 *   placeholder glow in the recipe's `screenTop` → `screenFoot`, waking as
 *   the laptop's lid would open (`uWake`).
 * - **The books:** cloth over board, cream page edges, foil on the spines.
 */
import { appleLogo, METAL_GLSL, LAPTOP_STRIDE, slab } from './laptopShader';
import { BOOKS, REST_AT, TABLET, TABLET_N, TABLET_U } from './tabletShape';
import { LAPTOP_SHADE_GLSL } from './laptopShape';
import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';

const { w: W, d: D, t: T, corner: RC, screen: SCREEN } = TABLET;
const f = x => x.toFixed(5);
const vec3 = v => `vec3(${v.map(f).join(', ')})`;
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Floats per vertex: in its part's own frame position (3) and normal
 * (3), the part (0 the tablet, 1 … the books), then placed: position (3)
 * and normal (3), from the tablet's foot. */
export const TABLET_STRIDE = LAPTOP_STRIDE + 6;

/** The tablet and its books, placed: `{ data, count }`. */
export function tabletMesh() {
  const out = [];
  const add = (verts, place) => {
    for (let i = 0; i < verts.length; i += LAPTOP_STRIDE) {
      const v = verts.slice(i, i + LAPTOP_STRIDE);
      out.push(...v, ...place(v.slice(0, 3), 1), ...place(v.slice(3, 6), 0));
    }
  };
  // The tablet: its back on the slab's foot (y 0), its screen on top;
  // turned up about its foot edge to lean back at TABLET.lean.
  add(slab({ h: T, rt: 0.0009, rb: 0.0009, part: 0, w: W, d: D, rc: RC }), ([x, y, z], p) => {
    const s = z + (D / 2) * p;
    return [x, s * TABLET_U[1] + y * TABLET_N[1], s * TABLET_U[2] + y * TABLET_N[2]];
  });
  BOOKS.forEach((b, i) => {
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    add(slab({ h: b.h, rt: 0.0014, rb: 0.0014, part: i + 1, w: b.w, d: b.d, rc: 0.002 }), ([x, y, z], p) => [
      x * c - z * s + b.x * p,
      y + b.y * p,
      x * s + z * c + b.z * p,
    ]);
  });
  const data = new Float32Array(out);
  return { data, count: data.length / TABLET_STRIDE };
}

/** The back's texture (texels): its plan, ~2 a mm. */
export const TABLET_TEX = { w: 448, h: Math.round((448 * D) / W) };

/**
 * The tablet's back, drawn once over its plan (x across, its foot at the
 * top row): r the camera island, g its lenses, b the flash, a the logo,
 * drawn to read upright from behind it. RGBA bytes.
 */
export function tabletTexels() {
  const { w: TW, h: TH } = TABLET_TEX;
  const k = TW / W;
  const layer = draw => {
    const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(TW, TH) : Object.assign(document.createElement('canvas'), { width: TW, height: TH });
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, TW, TH);
    // Metres from the middle: x across, then up the tablet.
    ctx.setTransform(k, 0, 0, k, (W / 2) * k, (D / 2) * k);
    ctx.fillStyle = '#fff';
    draw(ctx);
    return ctx.getImageData(0, 0, TW, TH).data;
  };
  // Seen from behind, the island is top left: up the tablet, and +x.
  const ix = W / 2 - 0.0175;
  const iz = D / 2 - 0.026;
  const disc = (ctx, x, z, r) => {
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const island = layer(ctx => {
    const [w, h, r] = [0.0165, 0.034, 0.0075];
    const [x, y] = [ix - w / 2, iz - h / 2];
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  });
  const lenses = layer(ctx => {
    disc(ctx, ix, iz + 0.008, 0.0046);
    disc(ctx, ix, iz - 0.0075, 0.0032);
  });
  const flash = layer(ctx => disc(ctx, ix + 0.0045, iz - 0.0005, 0.0012));
  const logo = layer(ctx => {
    // About 40 mm tall in the middle, its leaf up the tablet; mirrored
    // across, since it's read from behind.
    const s = 0.04 / 104;
    ctx.scale(-s, -s);
    appleLogo(ctx);
  });
  const out = new Uint8Array(TW * TH * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = island[i];
    out[i + 1] = lenses[i];
    out[i + 2] = flash[i];
    out[i + 3] = logo[i];
  }
  return out;
}

export const TABLET_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;
layout(location = 3) in vec3 aWorld;
layout(location = 4) in vec3 aWorldN;

${CAMERA_GLSL}
uniform vec3 uAt;       // the tablet's foot (metres)
out vec3 vLocal;        // in its part's own frame, before it's placed
out vec3 vLocalN;
out vec3 vWorld;
out vec3 vNorm;
flat out int vPart;

${PROJECT_GLSL}
void main() {
  vLocal = aPos;
  vLocalN = aNorm;
  vPart = int(aPart + 0.5);
  vWorld = uAt + aWorld;
  vNorm = aWorldN;
  gl_Position = project(vWorld);
}
`;

export const TABLET_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec2 uLid;      // unused here; LAPTOP_SHADE_GLSL reads it
uniform vec3 uAt;
uniform vec3 uMetal;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uWood;
uniform vec3 uScreenTop;
uniform vec3 uScreenFoot;
uniform float uWake;
uniform float uNight;
uniform sampler2D uBack;
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vLocal;
in vec3 vLocalN;
in vec3 vWorld;
in vec3 vNorm;
flat in int vPart;
out vec4 outColor;

const vec3 CLOTH[${BOOKS.length}] = vec3[](${BOOKS.map(b => vec3(rgb(b.cloth))).join(', ')});
const vec3 BOOK[${BOOKS.length}] = vec3[](${BOOKS.map(b => vec3([b.w, b.d, b.h])).join(', ')});
const float SPINE[${BOOKS.length}] = float[](${BOOKS.map(b => f(b.spine)).join(', ')});

${LAPTOP_SHADE_GLSL}
${METAL_GLSL}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = laptopLight();
  float lam = dot(N, L);
  vec3 lit = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.12 + 0.08 * max(N.y, 0.0) + 0.25 * uNight) * mix(1.0, 0.42, uNight);
  float lightLvl = mix(1.0, 0.42, uNight);
  float low = vWorld.y - uAt.y;
  vec3 col;
  if (vPart == 0) {
    // The tablet: space black aluminium, as the laptop's (0.3.9), off
    // its face (the face is glass, and most of what's seen of it).
    if (vLocalN.y <= 0.9) {
      float edge = smoothstep(0.98, 0.9, abs(vLocalN.y)) * smoothstep(0.05, 0.25, abs(vLocalN.y));
      vec2 mp = abs(vLocalN.y) > 0.5 ? vLocal.xz : vec2(vLocal.x + vLocal.z, vLocal.y);
      float mot = noise2(mp * 60.0) * 0.6 + noise2(mp * 260.0) * 0.4;
      float rough = mix(0.3 + 0.08 * mot, 0.12, edge);
      vec3 tint = mix(vec3(1.0), uMetal / max(max(uMetal.r, uMetal.g), max(uMetal.b, 1e-3)), 0.5);
      gSat = 0.5;
      gSpec = 0.3;
      col = uMetal * lit * (0.5 + 0.06 * mot) + tint * shine(N, V, L, rough, mix(0.22, 0.55, edge));
      gSat = 1.0;
      gSpec = 0.12;
      vec3 Hs = normalize(L + V);
      col += uSun * tint * ggx(max(dot(N, Hs), 0.0), 0.7) * 0.35 * max(dot(N, L), 0.0) * (0.85 + 0.3 * mot);
      col += edge * (uEnvLow * 0.3 + uSun * 0.12) * lightLvl * 0.5;
      if (abs(vLocalN.y) < 0.3) col += uMetal * 0.35 * lightLvl * mix(vec3(1.0), uEnvLow, 0.3);
    }
    vec2 uv = vec2(vLocal.x / ${f(W)} + 0.5, vLocal.z / ${f(D)} + 0.5);
    if (vLocalN.y < -0.9) {
      // The back: the logo, polished; the camera island, its lenses dark
      // glass; a shade where it rests on the books.
      vec4 t = texture(uBack, uv);
      gSat = 0.15;
      col = mix(col, uMetal * 0.9 * lit + shine(N, V, L, 0.08, 0.45) * 1.15, t.a);
      col = mix(col, uMetal * 0.8 * lit + shine(N, V, L, 0.18, 0.3), t.r);
      gSat = 1.0;
      col = mix(col, vec3(0.01) + shine(N, V, L, 0.04, 0.06), t.g);
      col = mix(col, vec3(0.55, 0.5, 0.4) * lit * 0.4, t.b);
      col *= 1.0 - 0.45 * exp(-abs(vLocal.z - ${f(REST_AT - D / 2)}) / 0.012);
    } else if (vLocalN.y > 0.9) {
      // The face: black glass to the edge, the screen under it with a
      // black border round it, and the front camera in the border's side.
      vec2 s = vLocal.xz;
      float in_ = 1.0 - smoothstep(-0.0003, 0.0003, laptopBox(s, vec2(${f(SCREEN.w / 2)}, ${f(SCREEN.h / 2)}), ${f(SCREEN.r)}));
      float down = clamp(0.5 - s.y / ${f(SCREEN.h)}, 0.0, 1.0);
      vec3 glow = mix(uScreenTop, uScreenFoot, smoothstep(0.0, 1.0, down));
      glow *= 1.0 + 0.25 * exp(-dot(s - vec2(0.02, 0.04), s - vec2(0.02, 0.04)) * 200.0);
      vec2 ed = abs(s) / vec2(${f(SCREEN.w / 2)}, ${f(SCREEN.h / 2)});
      glow *= 1.0 - 0.08 * smoothstep(0.7, 1.0, max(ed.x, ed.y));
      vec2 cm = s - vec2(${f(-(W / 2 - (W - SCREEN.w) / 4))}, 0.0);
      float lens = 1.0 - smoothstep(0.0007, 0.0009, length(cm));
      float glint = (1.0 - smoothstep(0.0, 0.0003, length(cm - vec2(0.0002, 0.0002)))) * lens;
      // Where the glass meets the aluminium, a hairline.
      float rim = smoothstep(-0.0006, -0.0002, laptopBox(s, vec2(${f(W / 2)}, ${f(D / 2)}), ${f(RC)}));
      vec3 glass = vec3(0.008) + glow * uWake * in_;
      glass = mix(glass, vec3(0.02), lens) + vec3(0.12, 0.2, 0.35) * glint;
      col = mix(glass + shine(N, V, L, 0.05, 0.04), uMetal * lit * 0.6, rim);
    }
    // Its foot, in against the desk.
    col *= mix(0.55, 1.0, smoothstep(0.0, 0.006, low));
  } else {
    // A book: cloth over board, the pages' edges between the boards.
    int i = vPart - 1;
    vec3 b = BOOK[i];
    vec3 cloth = CLOTH[i];
    float weave = 0.92 + 0.08 * noise2(vLocal.xz * 900.0 + vLocal.y * 700.0);
    vec3 clothCol = cloth * lit * weave + shine(N, V, L, 0.75, 0.04) * 0.35;
    float spine = step(0.5, vLocalN.z * SPINE[i]) * step(abs(vLocalN.y), 0.5);
    float side = step(abs(vLocalN.y), 0.5) * (1.0 - spine);
    col = clothCol;
    if (vLocalN.y > 0.5) {
      // The cover: the hinge's groove, a little in from the spine.
      float g = abs(vLocal.z * SPINE[i] - (b.y / 2.0 - 0.009));
      col *= 1.0 - 0.25 * (1.0 - smoothstep(0.0004, 0.001, g));
    }
    if (side > 0.5) {
      // The pages: cream, finely lined, shaded in under the boards.
      float cb = 0.0026;
      float y = vLocal.y;
      float pg = smoothstep(cb - 0.0003, cb, y) * (1.0 - smoothstep(b.z - cb, b.z - cb + 0.0003, y));
      float lines = 0.9 + 0.1 * noise2(vec2(y * 4000.0, (vLocal.x + vLocal.z) * 30.0));
      float tuck = smoothstep(cb, cb + 0.0025, y) * (1.0 - smoothstep(b.z - cb - 0.0025, b.z - cb, y));
      vec3 pages = vec3(0.95, 0.88, 0.74) * (lit + uSky * 0.12 * (1.0 - uNight)) * lines * mix(0.7, 1.0, tuck);
      col = mix(clothCol * 0.85, pages, pg);
    } else if (spine > 0.5) {
      // The spine: foil bands near each end and the title in the middle;
      // gold on dark cloth, dark ink on light.
      float x = abs(vLocal.x);
      float band = step(abs(x - (b.x / 2.0 - 0.02)), 0.0012);
      float title = step(x, 0.038) * step(abs(vLocal.y - b.z / 2.0), b.z * 0.18);
      float light = step(0.5, dot(cloth, vec3(0.299, 0.587, 0.114)));
      vec3 foil = mix(vec3(0.62, 0.48, 0.22) * lit * 0.6 + shine(N, V, L, 0.25, 0.6) * vec3(1.0, 0.8, 0.45), vec3(0.12, 0.1, 0.08) * lit, light);
      col = mix(col, foil, max(band, title));
    }
    // In against the desk, and where the books meet.
    float meet = min(vLocal.y, b.z - vLocal.y);
    if (abs(vLocalN.y) < 0.9) col *= mix(i == 0 ? 0.55 : 0.75, 1.0, smoothstep(0.0, 0.004, i == 0 ? vLocal.y : meet));
  }
  if (uGrainA > 0.0) {
    ivec2 g = ivec2(mod(floor(vec2(gl_FragCoord.x, uResY - gl_FragCoord.y) * uCssPerPx), 256.0));
    float gn = texelFetch(uGrain, g, 0).r;
    vec3 ov = mix(2.0 * col * gn, 1.0 - 2.0 * (1.0 - col) * (1.0 - gn), step(0.5, col));
    col = mix(col, ov, uGrainA);
  }
  outColor = vec4(col, 1.0);
}
`;
