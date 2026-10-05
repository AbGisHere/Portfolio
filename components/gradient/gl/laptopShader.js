/**
 * (0.3.8) The laptop on the desk, where the descent ends (ROADMAP.md, "0.3 —
 * the desk"). Built in code, as the desk is: two rounded aluminium slabs,
 * the base and the lid, meshed once here and drawn in the same context,
 * under the same camera and against the same depth.
 *
 * - **The lid** turns on its hinge (`uLid`), shut through the top-down hold
 *   and opening over arc 2 (deskCamera.js `lidAt`).
 * - **The finish** is the recipe's `metal`: silver by day, space black by
 *   night, blended on the switch like every other recipe colour. It's lit
 *   live by the scene (the low body's light, the sky's from above) and
 *   mirrors the sky, more so at grazing angles.
 * - **The deck, the lid and the screen** come from one small texture drawn
 *   once (`laptopTexels`): the keys, their well, the speaker grilles and
 *   the trackpad on the deck; the logo on the lid, polished. The screen is a
 *   placeholder glow in the recipe's `screenTop` → `screenFoot`, waking as
 *   the lid opens (`uWake`), under black glass.
 */
import { LAPTOP, LAPTOP_SHADE_GLSL } from './laptopShape';
import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';

const { w: W, d: D, base: BASE_H, lid: LID_H, corner: RC, hingeIn: HINGE_IN, gap: GAP } = LAPTOP;
const HINGE_Z = D / 2 - HINGE_IN;
/** The screen on the lid's inner face (metres): its size and its top
 * bezel, from the lid's free edge. */
const SCREEN = { w: 0.2965, h: 0.1925, top: 0.0075 };
const f = x => x.toFixed(5);

/** Floats per vertex: position (3), normal (3), part (0 the base, 1 the lid). */
export const LAPTOP_STRIDE = 7;

/**
 * A rounded slab, centred on x and z, from y 0 to `h`: its outline a
 * rounded rectangle (corner radius `rc`), its top and bottom edges rounded
 * over (`rt`, `rb`). Triangles, `LAPTOP_STRIDE` floats a vertex.
 */
function slab({ h, rt, rb, part }) {
  const NC = 10; // segments per corner
  const NE = 4; // per rounded edge
  // The profile, bottom to top: inset from the outline, height, normal.
  const prof = [];
  for (let i = 0; i <= NE; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / NE);
    prof.push([rb * (1 - Math.cos(a)), rb * (1 + Math.sin(a)), Math.cos(a), Math.sin(a)]);
  }
  for (let i = 0; i <= NE; i++) {
    const a = (Math.PI / 2) * (i / NE);
    prof.push([rt * (1 - Math.cos(a)), h - rt * (1 - Math.sin(a)), Math.cos(a), Math.sin(a)]);
  }
  const ring = ([o, y, nh, ny]) => {
    const pts = [];
    for (const [sx, sz, a0] of [[1, 1, 0], [-1, 1, 0.5], [-1, -1, 1], [1, -1, 1.5]]) {
      const cx = sx * (W / 2 - RC);
      const cz = sz * (D / 2 - RC);
      for (let j = 0; j <= NC; j++) {
        const t = (a0 + (0.5 * j) / NC) * Math.PI;
        pts.push([cx + (RC - o) * Math.cos(t), y, cz + (RC - o) * Math.sin(t), nh * Math.cos(t), ny, nh * Math.sin(t)]);
      }
    }
    return pts;
  };
  const rings = prof.map(ring);
  const out = [];
  const v = p => out.push(...p, part);
  for (let k = 0; k + 1 < rings.length; k++) {
    const a = rings[k];
    const b = rings[k + 1];
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      v(a[i]), v(a[j]), v(b[j]);
      v(a[i]), v(b[j]), v(b[i]);
    }
  }
  // The flat bottom and top, fanned from the middle.
  for (const [r, y, ny] of [[rings[0], 0, -1], [rings[rings.length - 1], h, 1]]) {
    for (let i = 0; i < r.length; i++) {
      const j = (i + 1) % r.length;
      v([0, y, 0, 0, ny, 0]), v([r[i][0], y, r[i][2], 0, ny, 0]), v([r[j][0], y, r[j][2], 0, ny, 0]);
    }
  }
  return out;
}

/** The base and the lid, each in its own frame (the lid turned in the
 * vertex stage): `{ data, count }`. */
export function laptopMesh() {
  const data = new Float32Array([
    ...slab({ h: BASE_H, rt: 0.0022, rb: 0.0045, part: 0 }),
    ...slab({ h: LID_H, rt: 0.0016, rb: 0.0016, part: 1 }),
  ]);
  return { data, count: data.length / LAPTOP_STRIDE };
}

/** The deck and lid texture's size (texels): the laptop's plan, ~3.3 a mm. */
export const LAPTOP_TEX = { w: 1024, h: Math.round((1024 * D) / W) };

/**
 * The laptop's texture, drawn once on a 2D canvas over its plan (x across,
 * the back edge at the top): r the keycaps; g how dark the deck is there
 * (the keys' well, the grilles' holes, the trackpad's edge); b the
 * trackpad; a the logo on the lid, flipped so it reads upright from behind
 * the open lid. RGBA bytes.
 */
export function laptopTexels() {
  const { w: TW, h: TH } = LAPTOP_TEX;
  const k = TW / W;
  const layer = draw => {
    const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(TW, TH) : Object.assign(document.createElement('canvas'), { width: TW, height: TH });
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, TW, TH);
    // Metres: x from the middle, y from the back edge.
    ctx.setTransform(k, 0, 0, k, (W / 2) * k, 0);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    draw(ctx);
    return ctx.getImageData(0, 0, TW, TH).data;
  };
  // (Not `roundRect`: Safari before 16 lacks it.)
  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  // The keyboard: 15 units across, a function row of short keys, then five.
  const P = 0.0182;
  const G = 0.0018;
  const KW = 15 * P - G;
  const top = 0.0125;
  const fnH = 0.0098;
  const rows = [
    [1.5, ...Array(12).fill(1), 1.5],
    [...Array(13).fill(1), 2],
    [1.5, ...Array(12).fill(1), 1.5],
    [1.75, ...Array(11).fill(1), 2.25],
    [2.25, ...Array(10).fill(1), 2.75],
    [1, 1, 1, 1.25, 5.5, 1.25, 1, 'arrows'],
  ];
  const keys = [];
  let y = top;
  rows.forEach((row, ri) => {
    const kh = ri === 0 ? fnH : P - G;
    let x = -KW / 2;
    for (const u of row) {
      if (u === 'arrows') {
        // Left, up over down (half height), right.
        keys.push([x, y + kh / 2, P - G, kh / 2]);
        keys.push([x + P, y, P - G, kh / 2 - G / 2]);
        keys.push([x + P, y + kh / 2 + G / 2, P - G, kh / 2 - G / 2]);
        keys.push([x + 2 * P, y + kh / 2, P - G, kh / 2]);
        x += 3 * P;
        continue;
      }
      keys.push([x, y, u * P - G, kh]);
      x += u * P;
    }
    y += kh + G;
  });
  const kbBottom = y - G;
  const pad = { w: 0.1485, h: 0.0905 };
  const padY = D - 0.0075 - pad.h;
  const caps = layer(ctx => {
    for (const [x, ky, kw, kh] of keys) {
      rr(ctx, x, ky, kw, kh, 0.0013);
      ctx.fill();
    }
  });
  const dark = layer(ctx => {
    rr(ctx, -KW / 2 - 0.0012, top - 0.0012, KW + 0.0024, kbBottom - top + 0.0024, 0.0025);
    ctx.fill();
    // The grilles: fine holes either side of the keys.
    ctx.globalAlpha = 0.9;
    for (const sx of [-1, 1]) {
      for (let gx = KW / 2 + 0.003; gx < KW / 2 + 0.0145; gx += 0.0011) {
        for (let gy = top; gy < kbBottom; gy += 0.0011) {
          ctx.beginPath();
          ctx.arc(sx * gx, gy, 0.0003, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // The trackpad's edge.
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.0006;
    rr(ctx, -pad.w / 2, padY, pad.w, pad.h, 0.004);
    ctx.stroke();
  });
  const trackpad = layer(ctx => {
    rr(ctx, -pad.w / 2, padY, pad.w, pad.h, 0.004);
    ctx.fill();
  });
  const logo = layer(ctx => {
    // About 42 mm tall in the lid's middle, its leaf toward the free edge.
    const s = 0.042 / 104;
    ctx.translate(0, D / 2);
    ctx.scale(s, -s);
    ctx.translate(-50, -56);
    ctx.beginPath();
    ctx.moveTo(50, 30);
    ctx.bezierCurveTo(40, 23, 24, 21, 14, 31);
    ctx.bezierCurveTo(2, 43, 2, 65, 10, 81);
    ctx.bezierCurveTo(17, 95, 27, 105, 36, 104);
    ctx.bezierCurveTo(43, 103, 46, 100, 50, 100);
    ctx.bezierCurveTo(54, 100, 57, 103, 64, 104);
    ctx.bezierCurveTo(73, 105, 83, 93, 89, 80);
    ctx.bezierCurveTo(94, 70, 96, 50, 88, 37);
    ctx.bezierCurveTo(80, 25, 64, 22, 50, 30);
    ctx.fill();
    // The bite.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(104, 55, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // The leaf.
    ctx.beginPath();
    ctx.moveTo(49, 25);
    ctx.quadraticCurveTo(48, 6, 68, 1);
    ctx.quadraticCurveTo(69, 20, 49, 25);
    ctx.fill();
  });
  const out = new Uint8Array(TW * TH * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = caps[i];
    out[i + 1] = dark[i];
    out[i + 2] = trackpad[i];
    out[i + 3] = logo[i];
  }
  return out;
}

export const LAPTOP_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;

${CAMERA_GLSL}
uniform vec2 uLid;      // cos, sin of how far the lid's open
uniform vec3 uAt;       // the base's foot centre (metres)
out vec3 vLocal;        // in its part's own frame, before the hinge
out vec3 vLocalN;
out vec3 vWorld;
out vec3 vNorm;
flat out float vPart;

${PROJECT_GLSL}
void main() {
  vLocal = aPos;
  vLocalN = aNorm;
  vPart = aPart;
  vec3 p = aPos;
  vec3 n = aNorm;
  if (aPart > 0.5) {
    // The lid: turned about the hinge, on the base's deck.
    p.z -= ${f(HINGE_Z)};
    p = vec3(p.x, p.y * uLid.x - p.z * uLid.y, p.y * uLid.y + p.z * uLid.x);
    n = vec3(n.x, n.y * uLid.x - n.z * uLid.y, n.y * uLid.y + n.z * uLid.x);
    p += vec3(0.0, ${f(BASE_H + GAP)}, ${f(HINGE_Z)});
  }
  vWorld = uAt + p;
  vNorm = n;
  gl_Position = project(vWorld);
}
`;

export const LAPTOP_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec2 uLid;
uniform vec3 uAt;
uniform vec3 uMetal;
uniform vec3 uSun;      // the body's light
uniform vec3 uSky;      // the sky's tint overhead (max channel 1)
uniform vec3 uEnvTop;   // the sky mirrored: overhead, and toward the horizon
uniform vec3 uEnvLow;
uniform vec3 uWood;
uniform vec3 uScreenTop;
uniform vec3 uScreenFoot;
uniform float uWake;    // the screen: 0 off … 1 lit
uniform sampler2D uDeck;
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vLocal;
in vec3 vLocalN;
in vec3 vWorld;
in vec3 vNorm;
flat in float vPart;
out vec4 outColor;

${LAPTOP_SHADE_GLSL}
// What a polished surface mirrors along R: the sky above the horizon, the
// desk's wood below it.
vec3 envAt(vec3 R) {
  return R.y > 0.0
    ? mix(uEnvLow, uEnvTop, smoothstep(0.0, 0.7, R.y))
    : mix(uEnvLow * 0.6, uWood * 0.45, smoothstep(0.0, -0.25, R.y));
}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = laptopLight();
  vec3 H = normalize(L + V);
  float nv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - nv, 5.0);
  vec3 env = envAt(reflect(-V, N));
  float lam = dot(N, L);
  vec3 lit = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.25 + 0.15 * max(N.y, 0.0));
  float sheen = pow(max(dot(N, H), 0.0), 28.0) * smoothstep(-0.05, 0.25, lam);
  // Bead-blasted aluminium: mostly its own colour, lit; a soft sheen, and
  // the sky mirrored at grazing angles.
  vec3 metal = uMetal * lit * 0.85 + uMetal * env * 0.25 + uSun * sheen * (0.12 + 0.3 * uMetal) + env * fres * 0.35;
  vec3 col = metal;
  vec2 uv = vec2(vLocal.x / ${f(W)} + 0.5, 0.5 - vLocal.z / ${f(D)});
  if (vPart < 0.5 && vLocalN.y > 0.9) {
    // The deck: the keys in their well, the grilles, the trackpad.
    vec4 t = texture(uDeck, uv);
    vec3 well = vec3(0.01) + env * (0.02 + 0.2 * fres);
    vec3 caps = vec3(0.1) * lit + uSun * sheen * 0.06 + env * fres * 0.12;
    col = mix(col, well, t.g);
    col = mix(col, caps, t.r);
    col += t.b * (env * (0.04 + 0.3 * fres) + uSun * pow(max(dot(N, H), 0.0), 80.0) * 0.15);
    // In the open lid's shadow; and by night, lit a little by the screen.
    col *= 1.0 - 0.55 * laptopLid(vWorld - uAt);
    float near = exp(-max(${f(HINGE_Z)} - vLocal.z, 0.0) * 9.0);
    col += (uScreenTop + uScreenFoot) * 0.5 * uWake * near * mix(0.12, 0.04, t.g) * (1.0 - 0.6 * t.r);
  } else if (vPart > 0.5 && vLocalN.y > 0.9) {
    // The lid's back: the logo, polished to a mirror.
    float a = texture(uDeck, uv).a;
    vec3 mirror = env * 1.05 + uSun * pow(max(dot(N, H), 0.0), 120.0) * 0.9;
    col = mix(col, mirror, a);
  } else if (vPart > 0.5 && vLocalN.y < -0.9) {
    // The lid's face: black glass, and the screen behind it.
    vec2 s = vec2(vLocal.x, vLocal.z + ${f(D / 2 - SCREEN.top - SCREEN.h / 2)});
    float in_ = 1.0 - smoothstep(-0.0004, 0.0004, laptopBox(s, vec2(${f(SCREEN.w / 2)}, ${f(SCREEN.h / 2)}), 0.0025));
    float down = clamp(0.5 + s.y / ${f(SCREEN.h)}, 0.0, 1.0);
    vec3 glow = mix(uScreenTop, uScreenFoot, smoothstep(0.0, 1.0, down));
    glow *= 1.0 + 0.25 * exp(-dot(s - vec2(0.03, -0.03), s - vec2(0.03, -0.03)) * 300.0);
    vec3 glass = vec3(0.015) + env * (0.04 + 0.6 * fres);
    col = glass + glow * uWake * in_;
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
