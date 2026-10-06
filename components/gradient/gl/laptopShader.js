/**
 * (0.3.8) The laptop on the desk, where the descent ends (ROADMAP.md, "0.3 —
 * the desk"). Built in code, as the desk is: two rounded aluminium slabs,
 * the base and the lid, meshed once here and drawn in the same context,
 * under the same camera and against the same depth.
 *
 * - **The lid** turns on its hinge (`uLid`), shut through the top-down hold
 *   and opening over arc 2 (deskCamera.js `lidAt`).
 * - **The finish** is one space black (`LAPTOP.metal`, 0.3.9), by day and
 *   by night: the night only lights it less. It's lit live by the scene
 *   (the low body's light, the sky's from above) and shines (`shine`: GGX,
 *   Fresnel, the sky mirrored), its rounded edges smoother than its faces.
 * - **The screen's light** (0.3.9) falls on the deck and the desk, mostly
 *   by night, and the keyboard's backlight shines through the legends.
 * - **The deck, the lid and the screen** come from one small texture drawn
 *   once (`laptopTexels`): the keys, their well, the speaker grilles and
 *   the trackpad on the deck; the logo on the lid, polished. The screen is a
 *   placeholder glow in the recipe's `screenTop` → `screenFoot`, waking as
 *   the lid opens (`uWake`), under black glass.
 */
import { LAPTOP, LAPTOP_SHADE_GLSL } from './laptopShape';
import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { LAMP_LIGHT_GLSL } from './lampShape';

const { w: W, d: D, base: BASE_H, lid: LID_H, corner: RC, hingeIn: HINGE_IN, gap: GAP } = LAPTOP;
const HINGE_Z = D / 2 - HINGE_IN;
/** The screen on the lid's inner face (metres): its size and its top
 * bezel, from the lid's free edge. */
const SCREEN = LAPTOP.screen;
// The screen's middle, from the hinge, along the lid.
const SCR_FROM_HINGE = D / 2 - SCREEN.top - SCREEN.h / 2 + HINGE_Z;
const f = x => x.toFixed(5);

/** Floats per vertex: position (3), normal (3), part (0 the base, 1 the lid). */
export const LAPTOP_STRIDE = 7;

/**
 * A rounded slab, centred on x and z, from y 0 to `h`: its outline a
 * `w` × `d` rounded rectangle (corner radius `rc`), its top and bottom edges
 * rounded over (`rt`, `rb`). Triangles, `LAPTOP_STRIDE` floats a vertex
 * (the tablet and its books, 0.3.10, take them too).
 */
export function slab({ h, rt, rb, part, w: W = LAPTOP.w, d: D = LAPTOP.d, rc: RC = LAPTOP.corner }) {
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

/**
 * The logo's path, filled, centred on the origin in a box ~100 units across
 * and 104 tall, its leaf toward −y (the laptop's lid; the tablet's back).
 */
export function appleLogo(ctx) {
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
}

/** The deck and lid texture's size (texels): the laptop's plan, ~3.3 a mm. */
export const LAPTOP_TEX = { w: 1024, h: Math.round((1024 * D) / W) };

/**
 * The laptop's texture, drawn once on a 2D canvas over its plan (x across,
 * the back edge at the top): r the keycaps; g how dark the deck is there
 * (the keys' well, the grilles' holes, the trackpad's edge); b the
 * trackpad, and the keys' legends on the caps (0.3.9); a the logo on the lid, flipped so it reads upright from behind
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
  // (0.3.9) What each key says: letters in the middle, words small in a
  // corner; the arrows' are drawn.
  const labels = [
    ['esc', ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`), ''],
    ['`', ...'1234567890-='.split(''), 'delete'],
    ['tab', ...'QWERTYUIOP[]\\'.split('')],
    ['caps lock', ...'ASDFGHJKL;\''.split(''), 'return'],
    ['shift', ...'ZXCVBNM,./'.split(''), 'shift'],
    ['fn', 'control', 'option', 'command', '', 'command', 'option'],
  ];
  const keys = [];
  let y = top;
  rows.forEach((row, ri) => {
    const kh = ri === 0 ? fnH : P - G;
    let x = -KW / 2;
    row.forEach((u, ki) => {
      if (u === 'arrows') {
        // Left, up over down (half height), right.
        keys.push([x, y + kh / 2, P - G, kh / 2, '<']);
        keys.push([x + P, y, P - G, kh / 2 - G / 2, '^']);
        keys.push([x + P, y + kh / 2 + G / 2, P - G, kh / 2 - G / 2, 'v']);
        keys.push([x + 2 * P, y + kh / 2, P - G, kh / 2, '>']);
        x += 3 * P;
        return;
      }
      keys.push([x, y, u * P - G, kh, labels[ri][ki] ?? '', ki > row.length / 2]);
      x += u * P;
    });
    y += kh + G;
  });
  const kbBottom = y - G;
  const pad = { w: 0.1485, h: 0.0905 };
  const padY = D - 0.0075 - pad.h;
  // Each cap's sides rise over ~0.7 mm, in three steps added up: the shader
  // reads their slope as the bevel (0.3.9).
  const caps = layer(ctx => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 / 3;
    for (const inset of [0, 0.00035, 0.0007]) {
      for (const [x, ky, kw, kh] of keys) {
        rr(ctx, x + inset, ky + inset, kw - 2 * inset, kh - 2 * inset, 0.0013 - inset * 0.8);
        ctx.fill();
      }
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
  // The trackpad, and the keys' legends (on the caps, so never over it).
  const trackpad = layer(ctx => {
    rr(ctx, -pad.w / 2, padY, pad.w, pad.h, 0.004);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const at = (mx, my) => [(mx + W / 2) * k, my * k];
    for (const [x, ky, kw, kh, label, right] of keys) {
      if (!label) continue;
      const [cx, cy] = at(x + kw / 2, ky + kh / 2);
      if ('<^v>'.includes(label)) {
        const r = 0.0013 * k;
        const [dx, dy] = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], v: [0, 1] }[label];
        ctx.beginPath();
        ctx.moveTo(cx + dx * r, cy + dy * r);
        ctx.lineTo(cx - dx * r * 0.6 - dy * r * 0.8, cy - dy * r * 0.6 - dx * r * 0.8);
        ctx.lineTo(cx - dx * r * 0.6 + dy * r * 0.8, cy - dy * r * 0.6 + dx * r * 0.8);
        ctx.fill();
      } else if (label.length === 1 || ky < top + fnH) {
        ctx.font = `${Math.round((label.length === 1 ? 0.0042 : 0.0021) * k)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
      } else {
        ctx.font = `${Math.round(0.0022 * k)}px sans-serif`;
        ctx.textAlign = right ? 'right' : 'left';
        ctx.textBaseline = 'alphabetic';
        const [lx, ly] = at(right ? x + kw - 0.0018 : x + 0.0018, ky + kh - 0.0018);
        ctx.fillText(label, lx, ly);
      }
    }
  });
  const logo = layer(ctx => {
    // About 42 mm tall in the lid's middle, its leaf toward the free edge.
    const s = 0.042 / 104;
    ctx.translate(0, D / 2);
    ctx.scale(s, -s);
    appleLogo(ctx);
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

/**
 * GLSL: the finish's light, shared by the laptop and the tablet (0.3.9):
 * `envAt` (the sky and desk a polished surface mirrors), `shine` (GGX,
 * Fresnel), `noise2` (the bead blast's mottle). Needs `uSun`, `uEnvTop`,
 * `uEnvLow`, `uWood`, `uSunDir`.
 */
export const METAL_GLSL = `// What a polished surface mirrors along R: the sky above the horizon, the
// desk's wood below it.
// (0.3.9) With the structure a metal shows: the bright band just above the
// horizon, the glow round the body, a sky uneven round the compass, the
// meadow's dark green below the horizon and the desk under it all.
float envNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 envAt(vec3 R) {
  if (R.y > 0.0) {
    vec3 sky = mix(uEnvLow * 1.35, uEnvLow, smoothstep(0.0, 0.18, R.y));
    sky = mix(sky, uEnvTop, smoothstep(0.12, 0.8, R.y));
    sky *= 0.8 + 0.4 * envNoise(vec2(atan(R.z, R.x) * 2.5, R.y * 5.0));
    vec3 Ls = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
    return sky + uSun * (pow(max(dot(R, Ls), 0.0), 8.0) * 0.6 + pow(max(dot(R, Ls), 0.0), 60.0) * 1.5);
  }
  return mix(uEnvLow * 0.5, uWood * 0.45, smoothstep(0.0, -0.25, R.y));
}
// (0.3.9) The light off a surface of roughness \`a\` (GGX, Schlick's
// Fresnel from F0, Kelemen's visibility): the body's highlight, and the sky
// mirrored, blurred toward the horizon's colour as it roughens.
float ggx(float nh, float a) {
  float a2 = a * a;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * d * d);
}
float gSat = 1.0; // how much of the sky's colour a reflection keeps
float gSpec = 0.12; // how strongly it shows the body's highlight
vec3 shine(vec3 N, vec3 V, vec3 L, float a, float f0) {
  vec3 H = normalize(L + V);
  float nl = max(dot(N, L), 0.0);
  float nv = max(dot(N, V), 0.0);
  float lh = max(dot(L, H), 0.0);
  float fl = f0 + (1.0 - f0) * pow(1.0 - lh, 5.0);
  float spec = ggx(max(dot(N, H), 0.0), a) * fl * 0.25 / max(lh * lh, 0.1) * nl;
  float fv = f0 + (1.0 - f0) * pow(1.0 - nv, 5.0) * (1.0 - 0.7 * a);
  vec3 R = reflect(-V, N);
  vec3 env = mix(envAt(R), (uEnvTop + uEnvLow) * 0.5, a * 0.8);
  env = mix(vec3(dot(env, vec3(0.299, 0.587, 0.114))), env, gSat);
  return uSun * min(spec, 24.0) * gSpec + env * fv;
}

// A soft value noise over the finish's plan: the bead blast's faint mottle.
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

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
uniform vec3 uGlow;     // the screen's light, as it reaches the deck and desk
uniform vec3 uBacklight; // the keyboard's backlight (by night, lid open)
uniform float uNight;   // 0 day … 1 night: how dim the scene's light is
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
${METAL_GLSL}
${LAMP_LIGHT_GLSL}
// The lid's frame turned to the world's, as the vertex stage turns it.
vec3 lidToWorld(vec3 n) { return vec3(n.x, n.y * uLid.x - n.z * uLid.y, n.y * uLid.y + n.z * uLid.x); }

// (0.3.9) The lit screen as the base's metal mirrors it: where the ray
// along R meets the lid's face inside the screen, its glow, blurred with
// the surface's roughness \`a\` and the distance (alpha: how much it covers).
vec4 screenIn(vec3 q, vec3 R, float a) {
  vec3 c = vec3(0.0, ${f(BASE_H + GAP)} + ${f(SCR_FROM_HINGE)} * uLid.y, ${f(HINGE_Z)} - ${f(SCR_FROM_HINGE)} * uLid.x);
  vec3 ns = vec3(0.0, -uLid.x, -uLid.y);
  float den = dot(R, ns);
  if (den > -1e-3) return vec4(0.0);
  float t = dot(c - q, ns) / den;
  if (t <= 0.0) return vec4(0.0);
  vec3 h = q + R * t - c;
  vec2 s = vec2(h.x, dot(h, vec3(0.0, -uLid.y, uLid.x)));
  float blur = 0.004 + t * a * 0.6;
  float in_ = (1.0 - smoothstep(-blur, blur, abs(s.x) - ${f(SCREEN.w / 2)})) * (1.0 - smoothstep(-blur, blur, abs(s.y) - ${f(SCREEN.h / 2)}));
  vec3 glow = mix(uScreenTop, uScreenFoot, clamp(0.5 + s.y / ${f(SCREEN.h)}, 0.0, 1.0));
  return vec4(glow * uWake, in_);
}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = laptopLight();
  vec3 q = vWorld - uAt;
  float lam;
  // (0.3.9) The lid's top rolls over into its sides across a few mm, so
  // its outline catches the light on one side and falls dark on the other.
  if (vPart > 0.5 && vLocalN.y > 0.9) {
    vec2 hb = vec2(${f(W / 2)}, ${f(D / 2)});
    float d0 = laptopBox(vLocal.xz, hb, ${f(RC)});
    vec2 gr = vec2(laptopBox(vLocal.xz + vec2(0.0005, 0.0), hb, ${f(RC)}) - d0, laptopBox(vLocal.xz + vec2(0.0, 0.0005), hb, ${f(RC)}) - d0) / 0.0005;
    float bev = 1.0 - smoothstep(0.0, 0.0035, -d0);
    N = normalize(N + lidToWorld(vec3(gr.x, 0.0, gr.y)) * bev * bev * 0.6);
  }
  lam = dot(N, L);
  // Space black stays neutral: the sky tints it only a little.
  // By night the moon's light is weaker and bluer; the finish stays the
  // same black, only lit less.
  vec3 lit = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.12 + 0.08 * max(N.y, 0.0) + 0.25 * uNight) * mix(1.0, 0.42, uNight);
  // The screen's light (0.3.9): soft from the lid's face, more by night.
  vec3 spill = uGlow * laptopGlow(q, N);
  // Anodised space black: a dark dye under a fine bead blast. The rounded
  // edges are smoother, so they carry crisp lines of light.
  float edge = vPart < 0.5
    ? smoothstep(0.98, 0.9, abs(vLocalN.y)) * smoothstep(0.05, 0.25, abs(vLocalN.y)) * step(${f(BASE_H * 0.5)}, vLocal.y)
    : smoothstep(0.98, 0.9, abs(vLocalN.y)) * smoothstep(0.05, 0.25, abs(vLocalN.y));
  // The bead blast's mottle, over the flat faces: a touch rougher and
  // darker here, smoother and lighter there.
  vec2 mp = abs(vLocalN.y) > 0.5 ? vLocal.xz : vec2(vLocal.x + vLocal.z, vLocal.y);
  float mot = noise2(mp * 60.0) * 0.6 + noise2(mp * 260.0) * 0.4;
  float rough = mix(0.3 + 0.08 * mot, 0.12, edge);
  // Anodised aluminium is a metal under a thin dye: most of what it shows
  // is what it mirrors (F0 ~0.22, the sky half greyed and tinted by the
  // dye), little of its own colour; a broad satin sheen round the body's
  // light from the bead blast; the edges, polished, mirror much more.
  vec3 tint = mix(vec3(1.0), uMetal / max(max(uMetal.r, uMetal.g), max(uMetal.b, 1e-3)), 0.5);
  gSat = 0.5;
  gSpec = 0.3;
  vec3 col = uMetal * (lit * (0.5 + 0.06 * mot) + spill * 5.0) + tint * shine(N, V, L, rough, mix(0.22, 0.55, edge));
  gSat = 1.0;
  gSpec = 0.12;
  if (vPart < 0.5) {
    vec4 sr = screenIn(q, reflect(-V, N), rough);
    col += tint * sr.rgb * sr.a * (0.22 + 0.5 * pow(1.0 - max(dot(N, V), 0.0), 5.0));
  }
  vec3 Hs = normalize(L + V);
  col += uSun * tint * ggx(max(dot(N, Hs), 0.0), 0.7) * 0.35 * max(dot(N, L), 0.0) * (0.85 + 0.3 * mot);
  // (0.3.9) What tells its thickness from afar: the rounded top edges
  // catch the horizon's light in a fine line, and the sides, facing the
  // open meadow, sit a shade lighter than the top.
  float lightLvl = mix(1.0, 0.42, uNight);
  col += edge * (uEnvLow * 0.3 + uSun * 0.12) * lightLvl * (vPart < 0.5 ? 1.0 : 0.25);
  if (abs(vLocalN.y) < 0.3) col += uMetal * 0.35 * lightLvl * mix(vec3(1.0), uEnvLow, 0.3);
  // The seam: where the shut lid meets the base, a dark line round it.
  float shut = 1.0 - smoothstep(0.02, 0.15, uLid.y);
  if (abs(vLocalN.y) < 0.95) {
    float seam = vPart > 0.5 ? 1.0 - smoothstep(0.0, 0.0012, vLocal.y) : smoothstep(${f(BASE_H - 0.0012)}, ${f(BASE_H)}, vLocal.y);
    col *= 1.0 - 0.7 * seam * shut;
  }
  // In against the desk, the base's sides darken.
  if (vPart < 0.5 && abs(vLocalN.y) < 0.9) col *= mix(0.45, 1.0, smoothstep(0.0, 0.006, vLocal.y));
  vec2 uv = vec2(vLocal.x / ${f(W)} + 0.5, 0.5 - vLocal.z / ${f(D)});
  if (vPart < 0.5 && vLocal.y > ${f(BASE_H - 0.004)} && vLocal.z < ${f(-D / 2 + 0.005)}) {
    // The scoop in the front edge, for a thumb to lift the lid.
    float sc = (1.0 - smoothstep(0.03, 0.036, abs(vLocal.x))) * smoothstep(${f(-D / 2 + 0.005)}, ${f(-D / 2 + 0.001)}, vLocal.z);
    col *= 1.0 - 0.3 * sc;
  }
  if (vPart < 0.5 && vLocalN.y > 0.9) {
    // The deck: the keys in their well, the grilles, the trackpad.
    vec4 t = texture(uDeck, uv);
    // Each cap's bevel, from its sides' slope in the texture.
    vec2 e = vec2(1.0 / ${f(LAPTOP_TEX.w)}, 1.0 / ${f(LAPTOP_TEX.h)});
    float dx = texture(uDeck, uv + vec2(e.x, 0.0)).r - texture(uDeck, uv - vec2(e.x, 0.0)).r;
    float dz = texture(uDeck, uv - vec2(0.0, e.y)).r - texture(uDeck, uv + vec2(0.0, e.y)).r;
    vec3 Nk = normalize(vec3(-dx * 0.45, 1.0, -dz * 0.45));
    float cap = smoothstep(0.0, 0.4, t.r);
    float lamK = dot(Nk, L);
    vec3 litK = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lamK)) * mix(vec3(1.0), uSky, 0.3) * mix(1.0, 0.42, uNight);
    float flat_ = smoothstep(0.85, 1.0, t.r);
    vec3 caps = vec3(0.075) * (litK + spill * 5.0) + shine(Nk, V, L, mix(0.5, 0.62, flat_), 0.04) * 0.8;
    vec3 well = vec3(0.012) * (lit + spill * 4.0) + shine(N, V, L, 0.6, 0.03) * 0.25;
    col = mix(col, well, t.g * (1.0 - cap));
    col = mix(col, caps, cap);
    // The trackpad's glass: smoother than the deck round it.
    col = mix(col, uMetal * (lit * 0.75 + spill * 3.0) + shine(N, V, L, 0.24, 0.05), t.b * (1.0 - cap));
    // The legends: pale ink by day; by night the backlight shines through
    // them, and leaks round each key (blurred caps, read from a coarser mip,
    // less the caps themselves).
    float ink = t.b * cap;
    col = mix(col, vec3(0.32) * litK, ink * 0.6);
    col += uBacklight * ink;
    float leak = textureLod(uDeck, uv, 2.2).r * (1.0 - cap) * t.g;
    col += uBacklight * (leak * 0.55 + cap * 0.025);
    // In the open lid's shadow, and in close to the hinge.
    col *= 1.0 - 0.55 * laptopLid(q);
    col *= 1.0 - 0.3 * uLid.y * exp(-max(${f(HINGE_Z)} - vLocal.z, 0.0) * 60.0);
  } else if (vPart > 0.5 && vLocalN.y > 0.9) {
    // The lid's back: the logo, polished to a mirror.
    float a = texture(uDeck, uv).a;
    // Polished, it mirrors the sky, but as a dark grey mirror: neutral,
    // a little lighter than the black round it, the body's light crisp.
    gSat = 0.15;
    col = mix(col, uMetal * 0.9 * lit + shine(N, V, L, 0.08, 0.45) * 1.15, a);
    gSat = 1.0;
  } else if (vPart > 0.5 && vLocalN.y < -0.9) {
    // The lid's face: a thin rubber rim, then black glass, the screen
    // behind it with the camera's notch at its top; the glass mirrors the
    // sky and the body over it all.
    float rim = smoothstep(-0.0012, -0.0008, laptopBox(vLocal.xz, vec2(${f(W / 2)}, ${f(D / 2)}), ${f(RC)}));
    vec2 s = vec2(vLocal.x, vLocal.z + ${f(D / 2 - SCREEN.top - SCREEN.h / 2)});
    float in_ = 1.0 - smoothstep(-0.0003, 0.0003, laptopBox(s, vec2(${f(SCREEN.w / 2)}, ${f(SCREEN.h / 2)}), 0.0025));
    vec2 nc = s - vec2(0.0, ${f(-SCREEN.h / 2)});
    float notch = 1.0 - smoothstep(-0.0002, 0.0002, laptopBox(nc, vec2(0.0155, 0.0058), 0.0016));
    in_ *= 1.0 - notch;
    float down = clamp(0.5 + s.y / ${f(SCREEN.h)}, 0.0, 1.0);
    vec3 glow = mix(uScreenTop, uScreenFoot, smoothstep(0.0, 1.0, down));
    glow *= 1.0 + 0.25 * exp(-dot(s - vec2(0.03, -0.03), s - vec2(0.03, -0.03)) * 300.0);
    // The panel's light falls off a little toward its edges, as an LCD's does.
    vec2 ed = abs(s) / vec2(${f(SCREEN.w / 2)}, ${f(SCREEN.h / 2)});
    glow *= 1.0 - 0.08 * smoothstep(0.7, 1.0, max(ed.x, ed.y));
    // The camera: a dark lens with a blue glint, in the notch.
    vec2 cm = nc - vec2(0.0, 0.0026);
    float lens = 1.0 - smoothstep(0.0006, 0.0008, length(cm));
    float glint = (1.0 - smoothstep(0.0, 0.00025, length(cm - vec2(0.0002, 0.0002)))) * lens;
    vec3 glass = vec3(0.008) + glow * uWake * in_;
    glass = mix(glass, vec3(0.02), lens) + vec3(0.12, 0.2, 0.35) * glint;
    col = mix(glass + shine(N, V, L, 0.05, 0.04), vec3(0.012) + shine(N, V, L, 0.6, 0.04) * 0.3, rim);
  }
  // (0.3.11) The lamp's light: on the black finish, and the bulb caught
  // as a highlight; the open lid shades what's behind it.
  vec3 ll = lampLight(vWorld, N);
  if (ll.r > 0.0) {
    vec3 Lb = lampFrom(vWorld);
    float occ = laptopLidAlong(vWorld - uAt, Lb, lampFar(vWorld));
    col += ll * (1.0 - occ) * (uMetal * 0.9 + ggx(max(dot(N, normalize(Lb + V)), 0.0), 0.3) * 0.05);
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
