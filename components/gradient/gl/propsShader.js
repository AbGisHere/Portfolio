/**
 * (0.3.12) The things on the desk (propsShape.js), built in code as the lamp
 * is (meshKit.js): one static mesh, drawn under the same camera and against
 * the same depth, lit by the scene and by the lamp.
 *
 * - **The notebook:** a cloth-bound board, its pages rising from the gutter,
 *   ruled, the left page written on; a fountain pen across the right.
 * - **The mug:** glazed stoneware, its drink a mirror of the sky: coffee by
 *   day, tea by night (`uTea`), the tea's tag dissolving in and out with the
 *   switch; and its steam (`STEAM_*`), on the frame loop's clock.
 * - **The sticky notes:** a pad, its top sheet's corner lifting, and one
 *   torn off, each with a few lines on it.
 * - **The glasses:** tortoiseshell, folded, their lenses mirroring the sky.
 */
import { DESK_BOX } from '../deskCamera';
import { CAMERA_GLSL, PROJECT_GLSL } from './deskShader';
import { LAMP_BLOCK_GLSL, LAMP_LIGHT_GLSL } from './lampShape';
import { LAPTOP, LAPTOP_SHADE_GLSL } from './laptopShape';
import { METAL_GLSL } from './laptopShader';
import { GLASSES_UP, PEN_ENDS, PROPS, PROPS_LIFT } from './propsShape';
import { TABLET, TABLET_SHADE_GLSL } from './tabletShape';
import { KIT_STRIDE, add, ball, box, grid, lathe, place, scale, sweep, tube, unit } from './meshKit';

/** Floats per vertex (meshKit.js): position, normal, the part, s, t. The
 * parts: 0 glaze, 1 the mug's inside and rim, 2 the drink, 3 a page,
 * 4 the pages' edges, 5 the cover, 6 the pen, 7 brass, 8 the pad's top
 * sheet, 9 the pad's edges, 10 the glasses' frame, 11 a lens, 12 the tea's
 * tag and string, 13 the loose note. */
export const PROPS_STRIDE = KIT_STRIDE;

const H = DESK_BOX.h + PROPS_LIFT;
const f = x => x.toFixed(5);
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const vec3 = hex => `vec3(${rgb(hex).map(f).join(', ')})`;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const NB = PROPS.notebook;
const [PW, PD] = NB.page;
/** The pages' top over the board, at |x| from the gutter (the notebook's
 * frame): low into the gutter, rising to flat, rounded at the fore-edge. */
export function pageY(x) {
  const a = Math.abs(x);
  const rise = 1 - Math.exp(-a / 0.011);
  return NB.board + NB.block * (0.22 + 0.78 * rise) - 0.0012 * smooth(PW - 0.008, PW, a);
}

function notebook(out) {
  const from = out.length;
  // The board, a little wider than the pages, under both.
  box(out, [-PW - 0.004, 0, -PD / 2 - 0.003], [PW + 0.004, NB.board, PD / 2 + 0.003], 5, { bottom: false });
  for (const side of [-1, 1]) {
    // The page's top: s across from the gutter (signed), t up the page.
    grid(out, 30, 4, (u, v) => {
      const x = side * (0.0012 + u * (PW - 0.0012));
      const z = -PD / 2 + v * PD;
      return { p: [x, pageY(x), z], part: 3, s: x, t: z };
    });
    // The fore-edge, and the head and foot.
    grid(out, 1, 4, (u, v) => {
      const z = -PD / 2 + v * PD;
      return { p: [side * PW, NB.board + u * (pageY(PW) - NB.board), z], part: 4, s: z, t: u };
    }, [side, 0, 0]);
    for (const end of [-1, 1]) {
      grid(out, 20, 1, (u, v) => {
        const x = side * (0.0012 + u * (PW - 0.0012));
        return { p: [x, NB.board + v * (pageY(x) - NB.board), end * PD / 2], part: 4, s: x, t: v };
      }, [0, 0, end]);
    }
  }
  // The pen on the right page, resting on it.
  const { r, len } = PROPS.pen;
  const [p0, p1] = PEN_ENDS.map(e => [e[0], pageY(e[0]) + r, e[2]]);
  const d = unit(add(p1, p0, -1));
  const body = add(p0, d, len - 0.028);
  tube(out, p0, body, r, 6, 16);
  // The section tapering to the nib, and the nib.
  lathe(out, body, d, [[r, 0], [r * 0.82, 0.012], [r * 0.6, 0.02], [0, 0.02]], 6, 16);
  lathe(out, add(body, d, 0.016), d, [[r * 0.55, 0], [0.0007, 0.012], [0, 0.0122]], 7, 12);
  // The cap's band and its clip along the top.
  lathe(out, add(p0, d, 0.052), d, [[r * 1.04, 0], [r * 1.06, 0.002], [r * 1.04, 0.004]], 7, 16);
  const up = [0, 1, 0];
  sweep(out, [0.004, 0.02, 0.034, 0.046].map(k => add(add(p0, d, k), up, r + 0.0009 - (k > 0.04 ? 0.0006 : 0))), 0.0011, 7, { seg: 8 });
  place(out, from, NB.at, NB.yaw);
}

function mug(out) {
  const from = out.length;
  const { r, h, fill } = PROPS.mug;
  const up = [0, 1, 0];
  const o = [0, 0, 0];
  // Outside: the foot ring, the wall swelling a touch, to the rim.
  lathe(out, o, up, [[0, 0.0015], [0.03, 0.0015], [0.034, 0.0004], [0.036, 0], [0.0375, 0.003], [r - 0.002, 0.012], [r - 0.0008, 0.05], [r, h - 0.006], [r + 0.0002, h - 0.0015]], 0, 40);
  // The rim, rolled, and the inside down to the drink.
  const ri = r - 0.0035;
  lathe(out, o, up, [[r + 0.0002, h - 0.0015], [r - 0.0005, h], [ri + 0.0004, h], [ri, h - 0.002], [ri, fill - 0.002]], 1, 40);
  // The drink: a meniscus up the wall.
  lathe(out, o, up, [[ri, fill + 0.0009], [ri - 0.002, fill + 0.0001], [0, fill]], 2, 40);
  // The handle: a D out to the right (+x), from below the rim to low.
  const handle = [];
  for (let i = 0; i <= 26; i++) {
    const a = ((95 - (190 * i) / 26) * Math.PI) / 180;
    handle.push([0.035 + 0.028 * Math.cos(a), 0.052 + 0.03 * Math.sin(a), 0]);
  }
  sweep(out, handle, 0.0058, 0, { seg: 12 });
  // The tea's tag and string, toward the user (−z on the desk).
  const yaw = PROPS.mug.yaw;
  const dir = [Math.sin(yaw), 0, -Math.cos(yaw)];
  const side = [dir[2], 0, -dir[0]];
  const at = (rad, y, s = 0) => add(add(scale(dir, rad), side, s), up, y);
  sweep(out, [at(0.008, fill), at(0.022, fill + 0.008), at(0.033, h + 0.0004), at(ri + 0.002, h + 0.0012), at(r + 0.0012, h - 0.001), at(r + 0.0016, h - 0.012), at(r + 0.0018, 0.064)], 0.0005, 12, { seg: 5 });
  grid(out, 4, 1, (u, v) => {
    const a = (u - 0.5) * (0.022 / (r + 0.002));
    const c = Math.cos(a);
    const s = Math.sin(a);
    const rad = r + 0.0019;
    const n = add(scale(dir, c), side, s);
    return { p: add(scale(n, rad), up, 0.036 + v * 0.028), part: 12, s: u, t: v };
  }, dir);
  place(out, from, PROPS.mug.at, yaw);
}

const PAD = PROPS.pad;
function pad(out) {
  const from = out.length;
  const S = PAD.size / 2;
  box(out, [-S, 0, -S], [S, PAD.h - 0.0002, S], 9, { bottom: false });
  // The top sheet, its front right corner lifting.
  grid(out, 8, 8, (u, v) => {
    const x = -S + u * 2 * S;
    const z = -S + v * 2 * S;
    const k = Math.max(0, (u + (1 - v)) / 2 - 0.62) / 0.38;
    return { p: [x, PAD.h + 0.0055 * k * k, z], part: 8, s: x, t: z };
  });
  place(out, from, PAD.at, PAD.yaw);
  // The one torn off: flat, its free end (away from the glue, −z) lifting.
  const note = out.length;
  grid(out, 6, 8, (u, v) => {
    const x = -S + u * 2 * S;
    const z = -S + v * 2 * S;
    const k = 1 - v;
    return { p: [x, 0.0004 + 0.0035 * k * k * k, z], part: 13, s: x, t: z };
  });
  place(out, note, PROPS.note.at, PROPS.note.yaw);
}

const GL = PROPS.glasses;
function glasses(out) {
  const from = out.length;
  const c = Math.cos(GL.lean);
  const s = Math.sin(GL.lean);
  // The front, leaning back on the folded arms: (u across, v up it).
  const front = (u, v, n = 0) => [u, 0.004 + v * s + n * c, v * c - n * s];
  const [rx, ry] = GL.lens;
  const cx = GL.gap / 2 + rx;
  for (const k of [-1, 1]) {
    // The rim: a soft rectangle, a little wider at the top.
    const rim = [];
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const w = rx * (1 + 0.06 * sa);
      rim.push(front(k * cx + w * Math.sign(ca) * Math.abs(ca) ** 0.75, GLASSES_UP + ry * Math.sign(sa) * Math.abs(sa) ** 0.8));
    }
    sweep(out, rim, 0.0024, 10, { closed: true, seg: 8 });
    // The lens inside it.
    grid(out, 6, 22, (u, v) => {
      const a = v * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const w = rx * (1 + 0.06 * sa) * u * 0.98;
      const lu = w * Math.sign(ca) * Math.abs(ca) ** 0.75;
      const lv = ry * u * 0.98 * Math.sign(sa) * Math.abs(sa) ** 0.8;
      return { p: front(k * cx + lu, GLASSES_UP + lv, -0.0004), part: 11, s: lu / rx, t: lv / ry };
    }, [0, c, -s]);
  }
  // The bridge, arching between the rims.
  const bridge = [];
  for (let i = 0; i <= 8; i++) {
    const u = -GL.gap / 2 - 0.001 + (i / 8) * (GL.gap + 0.002);
    bridge.push(front(u, GLASSES_UP + ry * 0.45 + 0.004 * Math.sin((i / 8) * Math.PI)));
  }
  sweep(out, bridge, 0.0021, 10, { seg: 8 });
  // The hinges, and the arms folded in behind the front, one over the
  // other, the earpieces bent down at their ends.
  const eu = cx + rx + 0.003;
  const ev = GLASSES_UP + ry * 0.5;
  for (const k of [-1, 1]) {
    const hinge = front(k * eu, ev);
    ball(out, hinge, 0.0027, 7, 8);
    const z = hinge[2] + (k > 0 ? 0.004 : 0.011);
    const y = k > 0 ? 0.0026 : 0.0068;
    const arm = [hinge, [k * (eu - 0.004), y + 0.002, z - 0.002], [k * (eu - 0.012), y, z]];
    for (let i = 1; i <= 8; i++) arm.push([k * (eu - 0.012) - k * (i / 8) * 0.105, y, z + 0.002 * (i / 8)]);
    arm.push([k * (eu - 0.012) - k * 0.118, Math.max(0.0024, y - 0.004), z + 0.006]);
    sweep(out, arm, 0.0019, 10, { seg: 8 });
  }
  place(out, from, GL.at, GL.yaw);
}

/** Everything on the desk but the device and the lamp, placed: `{ data,
 * count }`. Built once. */
export function propsMesh() {
  const out = [];
  notebook(out);
  mug(out);
  pad(out);
  glasses(out);
  const data = new Float32Array(out);
  return { data, count: data.length / PROPS_STRIDE };
}

export const PROPS_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in float aPart;
layout(location = 3) in vec2 aST;

${CAMERA_GLSL}
out vec3 vWorld;
out vec3 vNorm;
out vec2 vST;
flat out int vPart;

${PROJECT_GLSL}
void main() {
  vWorld = aPos;
  vNorm = aNorm;
  vST = aST;
  vPart = int(aPart + 0.5);
  gl_Position = project(vWorld);
}
`;

const M = PROPS.mug;
export const PROPS_FRAGMENT = `#version 300 es
precision highp float;

${CAMERA_GLSL}
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uWood;
uniform float uNight;
uniform float uTea;     // 0 coffee, 1 tea (dissolving between, with a switch)
uniform vec2 uLid;      // the laptop's lid: cos, sin of how far it's open
uniform float uTablet;  // 1: the tablet stands there instead
uniform sampler2D uGrain;
uniform float uGrainA;
uniform float uCssPerPx;
uniform float uResY;

in vec3 vWorld;
in vec3 vNorm;
in vec2 vST;
flat in int vPart;
out vec4 outColor;

${METAL_GLSL}
${LAPTOP_SHADE_GLSL}
${TABLET_SHADE_GLSL}
${LAMP_LIGHT_GLSL}
${LAMP_BLOCK_GLSL}

// Handwriting at a glance: a line's run of words, each a wobbling stroke.
// \`x\` along the line from its start, \`y\` up from its rule (metres),
// \`len\` how far it runs, \`k\` which line; 0 … 1 ink.
float hand(float x, float y, float len, float k, float fw) {
  if (x < 0.0 || x > len) return 0.0;
  float w = floor(x / 0.0135 + hash2(vec2(k, 3.0)) * 3.0);
  float inWord = fract(x / 0.0135 + hash2(vec2(k, 3.0)) * 3.0);
  if (inWord > 0.62 + 0.3 * hash2(vec2(w, k))) return 0.0;
  float c = 0.0017 + 0.0009 * sin(x * 2100.0 + k * 7.0 + w) * (0.55 + 0.45 * sin(x * 640.0 + w * 3.0));
  // Now and then a tall letter.
  c += 0.0012 * smoothstep(0.82, 1.0, sin(x * 410.0 + w * 5.0 + k));
  float d = abs(y - c);
  return 1.0 - smoothstep(0.00022, 0.00022 + fw, d);
}

void main() {
  vec3 N = normalize(vNorm);
  vec3 V = normalize(uCam - vWorld);
  // Paper's both sides are its face.
  if (dot(N, V) < 0.0 && (vPart == 3 || vPart == 8 || vPart == 13 || vPart == 12)) N = -N;
  // How fast the surface's own coordinate runs across a pixel (out here,
  // where every fragment takes it).
  float fwT = fwidth(vST.y) + 1e-6;
  vec3 L = normalize(vec3(uSunDir.x, 0.55, uSunDir.y));
  float lam = dot(N, L);
  // (Darker by night than the lamp's enamel: paper and glaze would glow
  // against the desk's night wood.)
  vec3 lit = mix(0.5, 1.15, smoothstep(-0.45, 0.65, lam)) * mix(vec3(1.0), uSky, 0.12 + 0.08 * max(N.y, 0.0) + 0.25 * uNight) * mix(1.0, 0.26, uNight);
  // In against the desk, the low sides darken.
  float ao = mix(mix(0.62, 1.0, smoothstep(${f(H)}, ${f(H + 0.008)}, vWorld.y)), 1.0, max(N.y, 0.0));
  // The lamp's light, blocked by the device in its way, as on the desk.
  vec3 ll = vec3(0.0);
  if (uLamp.r > 0.0) {
    ll = lampLight(vWorld, N);
    if (ll.r > 0.0) {
      vec3 Lb = lampFrom(vWorld);
      float far = lampFar(vWorld);
      float occ = uTablet > 0.5
        ? max(tabletAlong(vWorld - vec3(${TABLET.at.map(f).join(', ')}), Lb, far), lampBlockBooks(vWorld))
        : max(laptopLidAlong(vWorld - vec3(${LAPTOP.at.map(f).join(', ')}), Lb, far), lampBlockBase(vWorld));
      ll *= 1.0 - 0.9 * occ;
    }
  }
  vec3 col;
  float tag = 0.0;
  if (vPart == 3 || vPart == 4) {
    // Paper: ruled across, the left page written on; dark into the gutter.
    vec3 paper = ${vec3(NB.paper)};
    float s = vST.x;
    float t = vST.y;
    if (vPart == 3) {
      float top = ${f(PD / 2 - 0.022)};
      // Rule k at top − k·7.1 mm; y up from the one below.
      float k = ceil((top - t) / 0.0071);
      float y = t - (top - k * 0.0071);
      float rule = (1.0 - smoothstep(0.00012, 0.00012 + fwT, min(y, 0.0071 - y))) * step(t, top + 0.0005) * step(${f(-PD / 2 + 0.012)}, t);
      paper = mix(paper, ${vec3(NB.rule)}, rule * 0.55);
      if (k >= 1.0) {
        float lineLen = hash2(vec2(k, 1.0)) < 0.18 ? 0.0 : 0.04 + 0.085 * hash2(vec2(k, 2.0));
        if (k > 18.0) lineLen = 0.0;
        float x0 = s < 0.0 ? ${f(-PW + 0.014)} : 0.016;
        if (s > 0.0 && k > 4.0) lineLen = 0.0;
        float ink = hand(s - x0, y, lineLen, k + step(0.0, s) * 40.0, fwT);
        paper = mix(paper, ${vec3(NB.ink)}, ink * 0.85);
      }
      paper *= mix(0.62, 1.0, smoothstep(0.0, 0.016, abs(s)));
    } else {
      paper *= 0.8;
    }
    col = paper * lit * ao + paper * ll;
  } else if (vPart == 5) {
    // The cover: book cloth, a fine weave.
    vec3 c = ${vec3(NB.cover)} * (0.9 + 0.2 * noise2(vWorld.xz * 900.0));
    col = c * lit * ao + c * ll + shine(N, V, L, 0.5, 0.03) * 0.4;
  } else if (vPart == 6) {
    // The pen: black resin, polished.
    vec3 c = ${vec3(PROPS.pen.body)};
    col = c * lit + c * ll + shine(N, V, L, 0.1, 0.05) * 0.9;
  } else if (vPart == 7) {
    // Brass.
    vec3 c = ${vec3(PROPS.pen.brass)};
    gSat = 0.5;
    col = c * (lit * 0.35 + ll * 0.8) + c * shine(N, V, L, 0.22, 0.85) * 1.1;
    gSat = 1.0;
  } else if (vPart <= 2) {
    float rad = length(vWorld.xz - vec2(${f(M.at[0])}, ${f(M.at[2])}));
    if (vPart == 0) {
      // Glazed stoneware: a fine speckle under a glossy coat, pooling
      // darker toward the foot.
      vec3 c = ${vec3(M.glaze)} * (0.92 + 0.12 * noise2(vWorld.xz * 2400.0 + vWorld.y * 1300.0));
      c *= mix(0.78, 1.0, smoothstep(${f(H)}, ${f(H + 0.03)}, vWorld.y));
      col = c * lit * ao + c * ll + shine(N, V, L, 0.08, 0.045);
    } else if (vPart == 1) {
      // Cream inside, darker down the well.
      vec3 c = ${vec3(M.inside)};
      float well = rad < ${f(M.r - 0.0034)} ? mix(0.35, 1.0, smoothstep(${f(H + M.fill)}, ${f(H + M.h)}, vWorld.y)) : 1.0;
      col = (c * lit + c * ll) * well + shine(N, V, L, 0.08, 0.04) * well;
    } else {
      // The drink: coffee with a ring of crema, or tea; a dark mirror of
      // the sky, the rim's shadow round its edge.
      float q = rad / ${f(M.r - 0.0035)};
      vec3 coffee = mix(${vec3(M.coffee)}, ${vec3(M.crema)}, smoothstep(0.62, 0.97, q) * (0.75 + 0.25 * noise2(vWorld.xz * 3000.0)));
      vec3 c = mix(coffee, ${vec3(M.tea)}, uTea);
      col = c * (lit * 0.7 + ll) * mix(1.0, 0.6, smoothstep(0.75, 1.0, q)) + shine(N, V, L, 0.03, 0.025) * 0.55;
    }
  } else if (vPart == 8 || vPart == 13 || vPart == 9) {
    // Sticky notes: a few lines in pencil-dark ink; the pad's sides
    // darker, sheet on sheet.
    vec3 c = ${vec3(PAD.paper)};
    if (vPart != 9) {
      float S = ${f(PAD.size / 2)};
      float k = ceil((S - 0.006 - vST.y) / 0.0105);
      float y = vST.y - (S - 0.006 - k * 0.0105);
      float n = vPart == 8 ? 3.0 : 2.0;
      float len = k >= 1.0 && k <= n ? 0.03 + 0.024 * hash2(vec2(k, float(vPart))) : 0.0;
      float x = vST.x + S - 0.01;
      float ink = hand(x, y, len, k + float(vPart) * 9.0, fwT);
      // On the pad, the first line struck through: done.
      if (vPart == 8 && k == 1.0 && x > 0.0 && x < len) ink = max(ink, 1.0 - smoothstep(0.0002, 0.0002 + fwT, abs(y - 0.0018)));
      c = mix(c, ${vec3(PAD.ink)}, ink * 0.8);
    } else {
      c *= 0.84;
    }
    col = c * lit * ao + c * ll;
  } else if (vPart == 10) {
    // Tortoiseshell: amber clouded with dark, glossy.
    float m = noise2(vST * vec2(260.0, 4.0) + vWorld.xz * 500.0);
    vec3 c = mix(${vec3(GL.rim)}, vec3(0.62, 0.36, 0.14), smoothstep(0.45, 0.85, m));
    c = mix(c, vec3(0.08, 0.04, 0.02), smoothstep(0.55, 0.15, m) * 0.6);
    col = c * lit * ao + c * ll + shine(N, V, L, 0.1, 0.045);
  } else if (vPart == 11) {
    // A lens: the desk under it, dimmed, and the sky mirrored.
    if (dot(N, V) < 0.0) N = -N;
    vec3 under = uWood * lit * 0.85 + uWood * ll;
    col = under + shine(N, V, L, 0.03, 0.04) * 1.2 + vec3(0.02, 0.05, 0.04) * pow(1.0 - max(dot(N, V), 0.0), 3.0);
  } else {
    // The tea's tag and string, there only with the tea: they dissolve
    // in and out with the switch, speckled, not faded.
    float d = 0.7 * noise2(vWorld.xy * 1400.0 + vWorld.z * 900.0) + 0.3 * hash2(floor(vWorld.xz * 9000.0));
    if (d >= uTea * 1.02 - 0.01) discard;
    vec3 c = ${vec3(M.tag)};
    // A printed band across the tag's top.
    c = mix(c, vec3(0.55, 0.2, 0.12), step(0.7, vST.y) * step(vST.y, 0.86) * step(0.02, vST.x) * step(vST.x, 0.98));
    col = c * lit + c * ll;
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

/** Where the steam rises from: the drink's middle (world). */
export const STEAM_AT = [M.at[0], H + M.fill, M.at[2]];
/** The steam's wisps, each a quad facing the camera (6 vertices each). */
export const STEAM_WISPS = 3;

export const STEAM_VERTEX = `#version 300 es
precision highp float;

${CAMERA_GLSL}
out vec2 vUV;
flat out float vI;

${PROJECT_GLSL}
void main() {
  int i = gl_VertexID / 6;
  int k = gl_VertexID % 6;
  vec2 c = vec2(k == 1 || k == 2 || k == 4 ? 1.0 : 0.0, k == 2 || k == 4 || k == 5 ? 1.0 : 0.0);
  vec3 at = vec3(${STEAM_AT.map(f).join(', ')});
  vec3 to = uCam - at;
  vec3 right = cross(vec3(0.0, 1.0, 0.0), to);
  right = length(right.xz) > 1e-4 ? normalize(right) : vec3(1.0, 0.0, 0.0);
  float fi = float(i);
  vec3 p = at + right * ((c.x - 0.5) * 0.07 + (fi - 1.0) * 0.008) + vec3(0.0, c.y * 0.16 + 0.004, 0.0);
  vUV = c;
  vI = fi;
  gl_Position = project(p);
}
`;

export const STEAM_FRAGMENT = `#version 300 es
precision highp float;

uniform float uT;       // seconds, the frame loop's clock
uniform float uSteam;   // how much shows (0 … 1)
uniform vec3 uSun;
uniform vec3 uEnvTop;
uniform vec3 uEnvLow;
uniform vec3 uLamp;

in vec2 vUV;
flat in float vI;
out vec4 outColor;

void main() {
  float y = vUV.y;
  float t = uT;
  // Each wisp a thread curling up and out, thickening as it climbs.
  float c = 0.5 + (0.13 * sin(y * 5.0 - t * 1.25 + vI * 2.1) + 0.07 * sin(y * 11.0 - t * 2.0 + vI * 4.3)) * y;
  float w = 0.035 + 0.16 * y;
  float a = exp(-pow((vUV.x - c) / w, 2.0));
  // It comes in puffs that drift up it, and fades in above the rim and out
  // as it climbs.
  float puffs = 0.55 + 0.45 * sin(y * 9.0 - t * 1.6 + vI * 1.7);
  float fade = smoothstep(0.02, 0.14, y) * (1.0 - smoothstep(0.35, 1.0, y));
  float alpha = a * puffs * fade * 0.28 * uSteam;
  vec3 col = min(vec3(1.0), uEnvTop * 0.6 + uEnvLow * 0.5 + uSun * 0.35 + uLamp * 0.3 + 0.12);
  outColor = vec4(col * alpha, alpha);
}
`;
