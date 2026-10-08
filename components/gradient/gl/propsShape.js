/**
 * (0.3.12) The things on the desk besides the device and the lamp (ROADMAP.md,
 * "0.3 — the desk"): an open notebook with a pen on it, a mug, a pad of
 * sticky notes with one loose, and a pair of folded glasses. Where each
 * stands and its size (metres), what a drag of the lamp keeps clear of,
 * and the shadows they throw on the desk. Shared by their own shader
 * (propsShader.js), the desk's (deskShader.js) and the lamp's
 * (lampShape.js).
 *
 * The desk's user sits at −z (the laptop's keys face that way), so each
 * thing is turned to them. Everything stands clear of the laptop, the
 * tablet's stack of books and the lamp's base, on both kinds of frame.
 */
import { DESK_BOX } from '../deskCamera';

// Each thing stands on the planks' top: the desk's planks sit up to 1.5 mm
// proud of DESK_BOX.h (deskShader.js, each a little off), so the things
// stand just over the highest, or a plank would hide a flat sheet.
export const PROPS_LIFT = 0.0016;
const H = DESK_BOX.h + PROPS_LIFT;

export const PROPS = {
  // Front left: open flat, its spine along z, turned a little for a
  // right hand. One page's width (x) and height (z); the cover's board,
  // and the pages' block either side.
  notebook: { at: [-0.36, H, -0.085], yaw: 0.2, page: [0.148, 0.21], board: 0.0022, block: 0.0048, cover: '#3a2b22', paper: '#EFE8D8', rule: '#9DAFC2', ink: '#1F2B4D' },
  // Across the right page, a fountain pen, black with a brass clip.
  pen: { len: 0.142, r: 0.0046, body: '#1C1B1E', brass: '#B8925A' },
  // Front right of the device: stoneware, glazed a deep sea green outside
  // and cream inside, its handle to the right. Coffee by day, tea by night
  // (a recipe's `tea`), the tea's tag over the rim.
  mug: { at: [0.33, H, -0.17], yaw: 0.5, r: 0.041, h: 0.096, fill: 0.077, glaze: '#3E6B6B', inside: '#E8DFCC', coffee: '#2B170C', crema: '#8C5C35', tea: '#8E3E10', tag: '#EADCBE' },
  // Left of the device, behind: a pad of sticky notes and one torn off.
  pad: { at: [-0.255, H, 0.165], yaw: -0.22, size: 0.076, h: 0.011, paper: '#F4D468', ink: '#2A2A33' },
  note: { at: [-0.35, H, 0.25], yaw: 0.38 },
  // Right of the device, in the lamp's pool: folded, lenses up, the front
  // leaning back on the folded arms.
  glasses: { at: [0.265, H, 0.03], yaw: -0.35, lean: (28 * Math.PI) / 180, rim: '#4A2A18', lens: [0.025, 0.019], gap: 0.017 },
};

/** The glasses' front: its lens centres' height up the leaning front. */
export const GLASSES_UP = 0.021;
const { glasses: G, mug: M, notebook: NB, pad: PD } = PROPS;
// How high the front's top stands off the desk.
const GLASSES_H = 0.004 + (GLASSES_UP + G.lens[1] + 0.004) * Math.sin(G.lean);

/** The pen's ends on the notebook's right page, in the notebook's frame. */
export const PEN_ENDS = [
  [0.035, 0, -0.07],
  [0.035 + 0.142 * Math.sin(0.62), 0, -0.07 + 0.142 * Math.cos(0.62)],
];

/** Each thing's outline on the desk as a turned box: centre (x, z), half
 * sizes (x, z), its turn, its height. */
const FOOT = (() => {
  const nb = [NB.at[0], NB.at[2], NB.page[0] + 0.004, NB.page[1] / 2 + 0.003, NB.yaw, NB.board + NB.block + 0.01];
  const mug = [M.at[0], M.at[2], M.r + 0.012, M.r + 0.012, M.yaw, M.h];
  const pad = [PD.at[0], PD.at[2], PD.size / 2, PD.size / 2, PD.yaw, PD.h];
  const note = [PROPS.note.at[0], PROPS.note.at[2], PD.size / 2, PD.size / 2, PROPS.note.yaw, 0.004];
  const gl = [G.at[0], G.at[2], G.gap / 2 + G.lens[0] * 2 + 0.008, (GLASSES_UP + G.lens[1] + 0.004) * Math.cos(G.lean) / 2 + 0.004, G.yaw, GLASSES_H];
  return { notebook: nb, mug, pad, note, glasses: gl };
})();

/** Each thing's bounds (world boxes [lo, hi]): the lamp keeps clear of them. */
export const PROPS_KEEP_OUT = Object.values(FOOT).map(([x, z, hx, hz, yaw, h]) => {
  const ex = Math.abs(Math.cos(yaw)) * hx + Math.abs(Math.sin(yaw)) * hz;
  const ez = Math.abs(Math.sin(yaw)) * hx + Math.abs(Math.cos(yaw)) * hz;
  // The glasses' outline is from their front's foot (the back edge is
  // where it leans to): its middle a little back of `at`.
  return [[x - ex, H, z - ez], [x + ex, H + h, z + ez]];
});
// The glasses' box from their foot, which leans back toward +z (turned).
{
  const [x, z, hx, hz, yaw, h] = FOOT.glasses;
  const dx = Math.sin(yaw) * hz;
  const dz = Math.cos(yaw) * hz;
  const ex = Math.abs(Math.cos(yaw)) * hx + Math.abs(Math.sin(yaw)) * hz;
  const ez = Math.abs(Math.sin(yaw)) * hx + Math.abs(Math.cos(yaw)) * hz;
  PROPS_KEEP_OUT[4] = [[x + dx - ex, H, z + dz - ez], [x + dx + ex, H + h, z + dz + ez]];
}

const f = x => x.toFixed(5);
const v2 = (a, b) => `vec2(${f(a)}, ${f(b)})`;

/**
 * GLSL: how far a point on the desk's top (world) lies in the things'
 * shadow from the scene's light (0 … 1): the mug as an upright capsule
 * cast along the light (`lampCast`), each flat thing as its outline cast
 * from its height, and a contact dark round every one. Needs
 * LAMP_SHADE_GLSL (`lampCast`) and LAPTOP_SHADE_GLSL (`laptopLight`).
 */
export const PROPS_SHADE_GLSL = (() => {
  const rect = k => {
    const [x, z, hx, hz, yaw, h] = FOOT[k];
    // Into its own frame: the inverse of meshKit.js `place`.
    return `propRect(p, run, ${v2(x, z)}, ${v2(hx, hz)}, ${v2(Math.cos(yaw), Math.sin(yaw))}, ${f(h)})`;
  };
  const [gx, gz, ghx, ghz, gyaw] = FOOT.glasses;
  const back = [gx + Math.sin(gyaw) * ghz, gz + Math.cos(gyaw) * ghz];
  return `float propBox(vec2 p, vec2 c, vec2 hs, vec2 cs) {
  vec2 d = p - c;
  vec2 q = vec2(cs.x * d.x - cs.y * d.y, cs.y * d.x + cs.x * d.y);
  vec2 e = abs(q) - hs;
  return length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
}
float propRect(vec2 p, vec2 run, vec2 c, vec2 hs, vec2 cs, float h) {
  // A point's in the shadow when, back up the light, it meets the thing:
  // the outline swept along the light, close enough steps that a low
  // light's long shadow stays whole.
  float d = propBox(p, c, hs, cs);
  for (int i = 1; i <= 5; i++) d = min(d, propBox(p + run * h * (float(i) / 5.0), c, hs, cs));
  float s = 0.002 + 0.04 * h;
  return max((1.0 - smoothstep(-s, s, d)) * 0.75, exp(-max(d, 0.0) / 0.003) * 0.5);
}
float propsShade(vec3 w) {
  vec3 L = laptopLight();
  vec2 run = L.xz / L.y;
  vec2 p = w.xz;
  float sh = lampCast(p, run, vec3(${f(M.at[0])}, ${f(H)}, ${f(M.at[2])}), vec3(${f(M.at[0])}, ${f(H + M.h - M.r * 0.6)}, ${f(M.at[2])}), ${f(M.r)});
  float out_ = max(length(p - ${v2(M.at[0], M.at[2])}) - ${f(M.r)}, 0.0);
  sh = max(sh, exp(-out_ / 0.006) * 0.75 + exp(-out_ / 0.03) * 0.2);
  sh = max(sh, ${rect('notebook')});
  sh = max(sh, ${rect('pad')});
  sh = max(sh, ${rect('note')} * 0.6);
  // The glasses: a light shade under the leaning front, through its lenses.
  sh = max(sh, propRect(p, run, ${v2(...back)}, ${v2(ghx, ghz)}, ${v2(Math.cos(gyaw), Math.sin(gyaw))}, ${f(GLASSES_H)}) * 0.45);
  return sh;
}
`;
})();

/** GLSL: (0.3.12) how much of the lamp's light the mug blocks on its way
 * to a point (0 … 1), the mug as its box. Needs LAMP_BLOCK_GLSL. */
export const PROPS_BLOCK_GLSL = (() => {
  const lo_ = [M.at[0] - M.r, H, M.at[2] - M.r];
  const hi_ = [M.at[0] + M.r, H + M.h, M.at[2] + M.r];
  return `float lampBlockMug(vec3 w) { return lampHitsBox(w, lampFrom(w), lampFar(w), vec3(${lo_.map(f).join(', ')}), vec3(${hi_.map(f).join(', ')})); }
`;
})();
