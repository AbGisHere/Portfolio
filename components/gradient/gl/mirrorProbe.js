/**
 * (0.4.18) The house's mirrors reflect their rooms (they were a grey
 * shine): each mirror has a probe, its room seen from a point in front of
 * it as six square faces (a cube's), drawn by the house's own pass and kept
 * in one atlas. A mirror's pixel follows its reflected ray to the walls of
 * its room's box (ZONES) and reads what the probe saw there, so the
 * reflection shifts with the viewing angle as a mirror's does, parallax
 * and all, near the room's surfaces (box-projected).
 *
 * The probes are drawn a face at a time, one a frame, while the house is
 * in view and its mirror within REACH of the camera; drawn again as the
 * day/night switch relights the house. Inside a probe the mirrors show
 * their plain glass (no mirror in a mirror). (0.4.26) What's past a
 * window shows the outdoors, softly: the hill's lawn round the house,
 * then a backdrop (PROBE_BACKDROP) of the sky, the woods' crowns along the
 * horizon, hazed, and the meadow under it (it was the sky's colour alone).
 */

import { FLOOR, STOREY, ZONES } from './houseShape';

export const PROBE = { size: 384, max: 6, reach: 28 };
const COLS = 2;
const ROWS = PROBE.max / COLS;

// The faces: +z, +x, −z, −x (level), then down and up; the yaw and pitch
// the scene's camera takes for each (deskCamera.js: yaw from +z toward +x,
// pitch down).
export const PROBE_FACES = [
  [0, 0],
  [Math.PI / 2, 0],
  [Math.PI, 0],
  [Math.PI * 1.5, 0],
  [0, Math.PI / 2],
  [0, -Math.PI / 2],
];

const inBox = (p, [lo, hi]) => p.every((v, i) => v >= lo[i] - 0.03 && v <= hi[i] + 0.03);

// Rooms that light as part of a bigger zone but reflect as their own: the
// foyer, walled off from the open plan by its partition and the timber.
const OWN = [[[4.62, FLOOR, -67.46], [7.72, FLOOR + STOREY - 0.37, -63.28]]];

/** Each mirror's probe: where it stands (a metre in front of the glass,
 * inside the room) and its room's box. `mirrors`: { c, n } from the mesh. */
export function probeLayout(mirrors) {
  return mirrors.slice(0, PROBE.max).map(({ c, n }) => {
    const ahead = c.map((v, i) => v + n[i] * 0.3);
    const zone = OWN.find(z => inBox(ahead, z)) ?? ZONES.find(z => inBox(ahead, z)) ?? ZONES[2];
    const [lo, hi] = zone;
    const at = c.map((v, i) => Math.min(hi[i] - 0.25, Math.max(lo[i] + 0.25, v + n[i] * (i === 1 ? 0 : 1.0))));
    return { c, n, at, lo: [...lo], hi: [...hi] };
  });
}

/** The lookup, for the house's fragment shader. */
export const PROBE_GLSL = `uniform sampler2D uProbe;
uniform float uProbeOn;      // 0 while a probe is being drawn
uniform int uProbeN;
uniform vec3 uProbeAt[${PROBE.max}];
uniform vec3 uProbeLo[${PROBE.max}];
uniform vec3 uProbeHi[${PROBE.max}];
uniform vec3 uMirrorAt[${PROBE.max}];
uniform float uProbeReady[${PROBE.max}];

// The probe of the mirror nearest p (-1: none ready).
int probeOf(vec3 p) {
  int k = -1;
  float best = 2.0;
  for (int i = 0; i < ${PROBE.max}; i++) {
    if (i >= uProbeN) break;
    float d = distance(p, uMirrorAt[i]);
    if (d < best && uProbeReady[i] > 0.5) {
      best = d;
      k = i;
    }
  }
  return k;
}

// What probe k saw along r from p: where r meets its room's box, from the
// probe's own point.
vec3 probeLook(vec3 p, vec3 r, int k) {
  vec3 rr = mix(r, vec3(1e-4), vec3(lessThan(abs(r), vec3(1e-4))));
  vec3 t1 = (uProbeLo[k] - p) / rr;
  vec3 t2 = (uProbeHi[k] - p) / rr;
  vec3 tf = max(t1, t2);
  float t = max(min(min(tf.x, tf.y), tf.z), 0.0);
  vec3 d = p + r * t - uProbeAt[k];
  vec3 a = abs(d);
  int face;
  float yaw = 0.0;
  float pitch = 0.0;
  if (a.y >= a.x && a.y >= a.z) {
    face = d.y < 0.0 ? 4 : 5;
    pitch = d.y < 0.0 ? 1.5707963 : -1.5707963;
  } else if (a.x >= a.z) {
    face = d.x > 0.0 ? 1 : 3;
    yaw = d.x > 0.0 ? 1.5707963 : 4.7123890;
  } else {
    face = d.z > 0.0 ? 0 : 2;
    yaw = d.z > 0.0 ? 0.0 : 3.1415927;
  }
  float c = cos(yaw);
  float s = sin(yaw);
  vec3 q = vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
  float cp = cos(pitch);
  float sp = sin(pitch);
  float zp = -q.y * sp + q.z * cp;
  float vp = -q.y * cp - q.z * sp;
  vec2 uv = clamp(vec2(q.x, -vp) / max(zp, 1e-4) * 0.5 + 0.5, ${(0.5 / PROBE.size).toFixed(6)}, ${(1 - 0.5 / PROBE.size).toFixed(6)});
  vec2 org = vec2(float(k % ${COLS}) * 3.0 + float(face % 3), float(k / ${COLS}) * 2.0 + float(face / 3));
  return texture(uProbe, (org + uv) / vec2(${COLS * 3}.0, ${ROWS * 2}.0)).rgb;
}
`;

/**
 * The probes' atlas on texture `unit`, and a face's target to draw into
 * (null: it can't run). `face(k, f, clear, draw)`: binds the face's
 * target (its viewport, cleared to `clear`), calls draw(), and blits it
 * into the atlas; leaves the default framebuffer bound.
 */
export function makeProbes(gl, unit) {
  const S = PROBE.size;
  const atlas = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, atlas);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S * COLS * 3, S * ROWS * 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, S, S);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  let ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  // The atlas as a target too: each face blitted into its place.
  const into = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, into);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, atlas, 0);
  ok = ok && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  if (!ok) {
    for (const t of [atlas, tex]) gl.deleteTexture(t);
    gl.deleteRenderbuffer(depth);
    gl.deleteFramebuffer(fbo);
    gl.deleteFramebuffer(into);
    return null;
  }
  return {
    size: S,
    face(k, f, clear, draw) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, S, S);
      gl.clearColor(clear[0], clear[1], clear[2], 1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      draw();
      const x = ((k % COLS) * 3 + (f % 3)) * S;
      const y = (Math.floor(k / COLS) * 2 + Math.floor(f / 3)) * S;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, into);
      gl.blitFramebuffer(0, 0, S, S, x, y, x + S, y + S, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    bind() {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.activeTexture(gl.TEXTURE0);
    },
    dispose() {
      for (const t of [atlas, tex]) gl.deleteTexture(t);
      gl.deleteRenderbuffer(depth);
      gl.deleteFramebuffer(fbo);
      gl.deleteFramebuffer(into);
    },
  };
}

/**
 * (0.4.26) The outdoors behind a probe's face, wherever the house and its
 * lawn left it empty (drawn at the far plane, depth LEQUAL): the sky above
 * the horizon, a band of tree crowns of uneven height along it, the meadow
 * below, all fading into the haze toward the horizon; darker by night.
 * `uYP` the face's yaw and pitch (PROBE_FACES).
 */
export const PROBE_BACKDROP_VERTEX = `#version 300 es
out vec2 vP;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  vP = p;
  gl_Position = vec4(p, 1.0, 1.0);
}
`;

export const PROBE_BACKDROP_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vP;
uniform vec2 uYP;
uniform vec3 uTop;
uniform vec3 uLow;
uniform vec3 uHaze;
uniform float uNight;
out vec4 outColor;
float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float n1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f));
}
void main() {
  float y = uYP.x;
  float p = uYP.y;
  vec3 f = vec3(sin(y) * cos(p), -sin(p), cos(y) * cos(p));
  vec3 r = vec3(cos(y), 0.0, -sin(y));
  vec3 u = vec3(sin(y) * sin(p), cos(p), cos(y) * sin(p));
  vec3 d = normalize(f + r * vP.x + u * vP.y);
  float az = atan(d.x, d.z);
  float lit = mix(1.0, 0.22, uNight);
  vec3 sky = mix(uLow, uTop, smoothstep(0.0, 0.6, d.y));
  // Each crown a rounded bump, their heights uneven.
  float k = az * 40.0;
  float bump = sqrt(max(0.0, 1.0 - pow(fract(k) * 2.0 - 1.0, 2.0)));
  float crown = 0.02 + 0.045 * n1(az * 7.0) + (0.012 + 0.03 * h1(floor(k))) * bump;
  vec3 trees = mix(vec3(0.17, 0.25, 0.12) * lit, uHaze, 0.5);
  vec3 meadow = mix(vec3(0.3, 0.42, 0.17) * lit, uHaze, exp(d.y * 10.0) * 0.8);
  vec3 col = d.y < 0.0 ? meadow : d.y < crown ? mix(trees, sky, smoothstep(crown - 0.01, crown, d.y)) : sky;
  outColor = vec4(col, 1.0);
}
`;
