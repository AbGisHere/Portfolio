// (0.5.0) The opening in 3D (../peaks.js): the hero peak and the range
// round it, their feet lost in mist, under the afternoon or the night sky.
// The terrain, the mist and the sky are maths, so nothing is downloaded.
//
// Two passes (MistCanvas.jsx). The shape pass marches the view: where each
// pixel meets the ground (its distance, its normal, its snow, its
// hollowness, how high the ground rises toward the sun's and the moon's
// bearings) and how much mist lies in front of it, written into three
// float targets; it runs only when the camera or the frame's size changes.
// The light pass shades from those, with the body's shadows, the sky and
// the bodies: a switch only relights, so its frames are cheap. Where float
// targets can't be drawn into, one pass does both (PEAKS_ALL_FS).
//
// The look (the owner's references, 2026-11-19: Ama Dablam at dusk, the
// Dolomites, misty pine valleys): snow lit warm on the faces toward the
// body and cool in shade, dark rock showing through in bands, the lower
// slopes dissolving into soft mist, thin streaks of cloud in the sky lit
// from below near the horizon. The sky and the haze come from the scene's
// own palette (the recipe's six stops), so it stays one world with the 2D
// ridges and the desk.
import { CLOUD, PEAKS } from '../peaks';

const f = x => (Number.isInteger(x) ? `${x}.` : `${x}`);
const peaks = PEAKS.map(([x, z, ht, r]) => `vec4(${f(x)}, ${f(z)}, ${f(ht)}, ${f(r)})`).join(', ');

export const PEAKS_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0., 1.); }`;

const COMMON = `
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform vec3 uCam, uLook;
uniform float uFov;
// The four bearings the ground's horizon is found for (../peaks.js BEARINGS).
uniform vec2 uBear[4];

const vec4 PEAK[${PEAKS.length}] = vec4[${PEAKS.length}](${peaks});
// The mist: its floor, and the height it thins out by.
const float MIST_BASE = ${f(CLOUD.base)};
const float MIST_RISE = ${f(CLOUD.rise)};
const mat2 M = mat2(.8, .6, -.6, .8);

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p, int oct) {
  float s = 0., a = .5;
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * noise(p); p = M * p * 2.02; a *= .5; }
  return s;
}
float ridged(vec2 p, int oct) {
  float s = 0., a = .5, w = 1.;
  for (int i = 0; i < 12; i++) {
    if (i >= oct) break;
    float n = 1. - abs(noise(p) * 2. - 1.);
    n *= n; s += n * a * w; w = clamp(n * 1.6, 0., 1.);
    p = M * p * 2.03; a *= .5;
  }
  return s;
}

// ---- the ground
float peak(vec2 p, vec4 P, float sc, float det) {
  // Four broad faces and the ridges between them (the owner, 2026-11-19:
  // not spires, not blobs; believable forms with rich erosion).
  vec2 q = mat2(.83, .56, -.56, .83) * (p - P.xy);
  float dd = mix(length(q) * 1.06, (abs(q.x) + abs(q.y)) * .77, .6) / P.w;
  float k = max(1. - dd, 0.);
  // A firm summit over flanks that fall away straight, then flare: neither
  // a spire nor a dome. The detail is in the erosion, not the outline.
  float prof = pow(k, 1.2) * 1.25 + k * .18;
  return 950. * sc + P.z * sc * prof * det;
}
float terrain(vec2 p, int oct) {
  float d = length(p), ring = smoothstep(1100., 3400., d);
  float mask = .45 + .55 * noise(p / 3800. + vec2(3.1, 1.7));
  float valley = 380. + fbm(p / 1500., 3) * 420.;
  float range = .78 * ridged(p / 2800., oct) + .22 * fbm(p / 2600., min(oct, 5));
  float h = mix(valley, range * 3200. * mask + 450., ring);
  // Erosion: gullies and spurs down every face, finer as they go.
  float det = .8 + .36 * ridged(p / 560. + vec2(5.3, 2.1), min(oct, 9));
  for (int i = 0; i < ${PEAKS.length}; i++) h = max(h, peak(p, PEAK[i], i == 0 ? 1. : .62, det));
  return h;
}
// Nothing stands above this: a ray past it, climbing, has missed.
const float CEILING = 4400.;
float march(vec3 ro, vec3 rd, float tmax, float t0) {
  float t = max(t0, 1.), tp = t, hp = 1.;
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - terrain(p.xz, 5);
    if (h < .0015 * t) {
      // Between the last step above and this one, where the ground was met.
      return mix(tp, t, hp / max(hp - h, 1e-4));
    }
    if (t > tmax || (rd.y > 0. && p.y > CEILING)) break;
    tp = t; hp = h;
    t += max(h * .62, .4 + t * .0012);
  }
  return -1.;
}
vec3 nrm(vec3 p, float t) {
  float e = max(.8, t * .0014);
  int oc = t < 5000. ? 10 : 7;
  return normalize(vec3(terrain(p.xz - vec2(e, 0), oc) - terrain(p.xz + vec2(e, 0), oc), 2. * e,
                        terrain(p.xz - vec2(0, e), oc) - terrain(p.xz + vec2(0, e), oc)));
}

// ---- the mist: soft banks pooled low, thinning upward, torn by noise
float mistAt(vec3 p) {
  float hgt = (p.y - MIST_BASE) / MIST_RISE;
  if (hgt > 4.5) return 0.;
  vec2 q = p.xz / 1400.;
  float n = fbm(q + .5 * vec2(noise(q * 1.7 + 3.1), noise(q * 1.7 + 8.3)), 4);
  // Its top heaps and dips: banks where the noise is high rise up to four
  // times as far, the rest lies low, so there is no level surface.
  float top = .6 + 3.6 * smoothstep(.35, .8, n);
  float body = smoothstep(top, top - 1.1, hgt);
  float bill = noise(p.xz / 260. + hgt * .7);
  return body * (.55 + .45 * bill) * .0016;
}

// Where a pattern lies on the ground: from above on gentle slopes, along
// the face (across it and up it) on steep ones, so nothing stretches down
// a cliff.
vec2 faceUV(vec3 p, vec3 n) {
  vec2 tg = normalize(vec2(-n.z, n.x) + 1e-5);
  float steep = smoothstep(.75, .35, n.y);
  return mix(p.xz, vec2(dot(p.xz, tg), p.y * 1.15), steep);
}

struct G { float t; vec3 n; float snow; float T; float mh; float ao; float hit; vec4 hor; };

// How high the ground rises toward a bearing, seen from p: the tangent of
// the horizon's elevation. A body below it is hidden, so the light pass
// shades with this instead of marching a shadow every frame.
float horizon(vec3 p, vec2 dir) {
  float m = -1., t = 15.;
  for (int i = 0; i < 18; i++) {
    vec2 q = p.xz + dir * t;
    float h = terrain(q, 3) - p.y;
    m = max(m, h / t);
    t *= 1.38;
    if (t > 16000.) break;
  }
  return m;
}

vec3 viewRay(out vec3 f, out vec3 r, out vec3 u, out float lens, out vec2 uv) {
  uv = (gl_FragCoord.xy * 2. - uRes) / uRes.y;
  f = normalize(uLook - uCam); r = normalize(cross(f, vec3(0, 1, 0))); u = cross(r, f);
  lens = 1. / tan(radians(uFov) * .5);
  return normalize(f * lens + uv.x * r + uv.y * u);
}

G geo(vec3 rd, float tStart) {
  G g;
  g.t = march(uCam, rd, 80000., tStart);
  g.hit = g.t > 0. ? 1. : 0.;
  g.n = vec3(0, 1, 0); g.snow = 0.; g.ao = 1.; g.hor = vec4(-1);
  vec3 p = uCam + rd * max(g.t, 0.);
  if (g.hit > 0.) {
    g.n = nrm(p, g.t);
    float alt = p.y;
    // Snow where the slope holds it, more of it higher up; the steepest
    // faces bare, in bands (the rock's strata).
    float line = 1500. + fbm(p.xz / 650., 3) * 450.;
    // The breakup varies with place and height together, so no pattern
    // smears into stripes down a steep face.
    vec2 fu = faceUV(p, g.n);
    float bn = noise(fu / 32.);
    float strata = noise(vec2(alt / 38. + fbm(fu / 260., 3) * 3. + bn * .8, 1.7));
    float holds = g.n.y + .1 * (fbm(fu / 45., 3) - .5) + .1 * (strata - .5) + .09 * (bn - .5);
    g.snow = smoothstep(line - 120., line + 120., alt) * smoothstep(.36, .5, holds);
    g.snow = max(g.snow, smoothstep(.55, .68, holds) * smoothstep(1300., 1600., alt));
    // Fine relief the heightfield is too coarse for, in the light only:
    // rough on rock, soft under snow.
    vec2 bq = fu / 9.;
    float b0 = fbm(bq, 3), bx = fbm(bq + vec2(.3, 0.), 3), bz = fbm(bq + vec2(0., .3), 3);
    vec2 bq2 = fu / 38.;
    float c0 = noise(bq2), cx = noise(bq2 + vec2(.25, 0.)), cz = noise(bq2 + vec2(0., .25));
    float rough = mix(1., .3, g.snow) * smoothstep(9000., 1500., g.t);
    g.n = normalize(g.n - vec3((bx - b0) * 2.2 + (cx - c0) * 1.2, 0., (bz - b0) * 2.2 + (cz - c0) * 1.2) * rough);
    g.ao = clamp(.6 + (alt - terrain(p.xz, 3)) / 300., .3, 1.);
  }
  // The mist between the eye and what it sees: its depth (transmittance)
  // and how high in it the light was gathered (the light pass lights it).
  float end = g.hit > 0. ? g.t : 60000.;
  float tau = 0., hw = 0., w = 0.;
  float t0 = 0., t1 = end;
  float top = MIST_BASE + MIST_RISE * 4.5;
  if (rd.y < 0.) t0 = max(0., (top - uCam.y) / rd.y); else if (uCam.y > top) t1 = 0.;
  if (t1 > t0) {
    float dt = (t1 - t0) / 18.;
    float j = hash(gl_FragCoord.xy) * dt;
    for (int i = 0; i < 18; i++) {
      vec3 q = uCam + rd * (t0 + j + dt * float(i));
      float dn = mistAt(q) * dt;
      float a = exp(-tau);
      tau += dn;
      hw += a * dn * clamp((q.y - MIST_BASE) / (MIST_RISE * 4.5), 0., 1.);
      w += a * dn;
    }
  }
  g.T = exp(-tau);
  g.mh = w > 0. ? hw / w : 0.;
  return g;
}
`;

const SHADE = `
uniform sampler2D uFlow;
// Noise from the flow texture (five octaves baked in): one or two reads,
// not a dozen noise sums.
float tn(vec2 p) { return texture(uFlow, p).r; }
float tn2(vec2 p) { return texture(uFlow, p).r * .62 + texture(uFlow, p * 2.73 + .37).g * .38; }
uniform float uByMoon;
uniform vec3 uSunDir, uMoonDir, uLightDir;
uniform vec3 uStops[6];
uniform vec3 uBody;
uniform float uNight, uGlow, uA;

vec3 S[6];
vec3 LIGHT;

// The moon's near side (public/moon.jpg: NASA's LRO map, public domain,
// projected onto a disc); until it has loaded, the drawn one stands in.
uniform sampler2D uMoonTex;
uniform float uMoonReady;
// The light's shadow: the body against the ground's horizon toward it.
uniform float uLightAz;
uniform vec4 uBearAz;
float shadow(G g) {
  float tl = uLightDir.y / max(length(uLightDir.xz), 1e-4);
  // The horizon toward the light: blended between the bearings either side.
  float a = clamp(uLightAz, uBearAz.x, uBearAz.w);
  float th = a < uBearAz.y ? mix(g.hor.x, g.hor.y, (a - uBearAz.x) / (uBearAz.y - uBearAz.x))
           : a < uBearAz.z ? mix(g.hor.y, g.hor.z, (a - uBearAz.y) / (uBearAz.z - uBearAz.y))
           : mix(g.hor.z, g.hor.w, (a - uBearAz.z) / (uBearAz.w - uBearAz.z));
  return smoothstep(-.035, .035, tl - th);
}

uniform float uLapse;

// ---- the air, as real skies are lit: the body's light scattered by air
// (Rayleigh: blue overhead, white toward the horizon) and haze (Mie: the
// glow round the body), reddened through the air it crosses, so the same
// model gives the afternoon, the gold and orange of sunset, the blue
// twilight after it and the pink Belt of Venus opposite. Worked in
// physical light, then brought to the screen (ACES), so the sky, the snow
// and the mist share one light.
const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float BM = 3.5e-6;
const float HR = 8000.;
const float HM = 1200.;
const float PI = 3.14159265;
const float SUN_I = 20.;
const float MOON_I = .0045;
float airmass(float y) {
  float z = degrees(acos(clamp(y, -1., 1.)));
  return 1. / max(cos(radians(min(z, 90.))) + .15 * pow(max(93.885 - z, .4), -1.253), .028);
}
// Ozone, high up: it takes the green out of a low sun's light, which is why
// real sunsets go orange and magenta, and twilight deep blue.
const vec3 OZONE = vec3(.65e-6, 1.88e-6, .085e-6) * 9000.;
vec3 tau0() { float a = uCam.y; return BR * HR * exp(-a / HR) + vec3(BM * HM * exp(-a / HM) * 1.1) + OZONE; }
// A body's light where it reaches (reddened by the air on the way), and
// fading out as it goes under.
vec3 reach(vec3 L, float I) { return I * exp(-tau0() * airmass(max(L.y, 0.) + .004)) * smoothstep(-.1, .02, L.y); }
vec3 scatter(vec3 rd, vec3 L, float I) {
  float mu = dot(rd, L);
  float phR = 3. / (16. * PI) * (1. + mu * mu);
  float g = .76;
  float phM = (1. - g * g) / (4. * PI * pow(1. + g * g - 2. * g * mu, 1.5));
  float a = uCam.y;
  vec3 tR = BR * HR * exp(-a / HR), tM = vec3(BM * HM * exp(-a / HM));
  vec3 tau = (tR + tM) * airmass(max(rd.y, 0.) + .01);
  vec3 oz = exp(-OZONE * airmass(max(rd.y, 0.) + .01) * .5);
  vec3 ph = (tR * phR + tM * phM) / (tR + tM);
  vec3 lit = I * exp(-tau0() * airmass(max(L.y, 0.) + .004) * .9);
  vec3 c = lit * ph * (1. - exp(-tau)) * oz * smoothstep(-.07, .01, L.y);
  // Twilight: after the body is down the sky stays lit from above the
  // horizon, overhead longest, blue, until it is some 10° under.
  float tw = smoothstep(-.18, -.02, L.y) * (1. - smoothstep(0., .08, L.y));
  c += I * vec3(.0005, .0011, .0028) * tw * (.4 + .6 * smoothstep(0., .6, rd.y));
  return c;
}
float EXPO;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
// By night the eye loses colour and sees blue (the Purkinje shift): moonlit
// snow silver-blue, the sky navy, as in night photographs.
vec3 toScreen(vec3 c) {
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(c, l * vec3(.55, .72, 1.18), smoothstep(.3, 1., uNight) * .75);
  vec3 o = aces(c * EXPO);
  float lo = dot(o, vec3(.2126, .7152, .0722));
  return max(mix(vec3(lo), o, 1.18), 0.);
}
// The sky in physical light.
vec3 skyRaw(vec3 rd) {
  vec3 c = scatter(rd, uSunDir, SUN_I) + scatter(rd, uMoonDir, MOON_I);
  // The Belt of Venus: a pink band low opposite a sun at the horizon, over
  // the blue of the earth's own shadow.
  vec2 rf = normalize(rd.xz + 1e-5), sf = normalize(uSunDir.xz + 1e-5);
  float opp = pow(max(-dot(rf, sf), 0.), 1.5);
  float low = smoothstep(.12, -.01, uSunDir.y) * smoothstep(-.12, -.01, uSunDir.y);
  c += SUN_I * vec3(.011, .005, .0065) * opp * low * exp(-pow((rd.y - .07) / .045, 2.));
  // The night's own glow: airglow low down, the dark above.
  c += vec3(.0006, .0009, .0021) * (1. + 3. * exp(-max(rd.y, 0.) * 7.));
  return c;
}
// The body's light on the ground and the sky's in the shade, on screen.
vec3 bodyLight() { return toScreen(reach(uLightDir, uByMoon > .5 ? MOON_I : SUN_I) * (uByMoon > .5 ? 1.7 : .11)) * 1.25; }
vec3 skyLight() { return toScreen(skyRaw(normalize(vec3(0., 1., 0.) + uLightDir * .3)) * .55); }

vec3 sky(vec3 rd) {
  vec3 c = skyRaw(rd);
  // High cloud on a layer 9 km up, so it crowds toward the horizon as real
  // cloud does: patches of fibrous cirrus and soft altocumulus with clear
  // sky between, combed (not smeared) by the wind, sweeping across through
  // a switch (the timelapse). Thin, so the sky shows through; silvered
  // toward the body; lit by the body's light up where it floats, so it
  // burns orange and pink after the ground has gone into shadow.
  if (rd.y > .005) {
    vec2 sp = rd.xz * (9000. / rd.y) / 9000.;
    vec2 q = mat2(.94, .34, -.34, .94) * sp + vec2(uLapse * 1.6, uLapse * .3);
    float cover = smoothstep(.42, .7, tn(q * .05 + .3));
    vec2 w = q + .6 * (texture(uFlow, q * .15 + .7).rg - .5) * 2.;
    float fib = tn2(vec2(w.x * .17, w.y * .5));
    float soft = tn2(w * .3 + .45);
    float dens = smoothstep(.48, .78, mix(fib, soft, .35)) * cover;
    dens *= smoothstep(.005, .06, rd.y);
    float a = clamp(dens * .75, 0., .8) * (1. - .75 * smoothstep(.3, 1., uNight));
    vec3 Lhi = normalize(uSunDir + vec3(0., .05, 0.));
    float fwd = pow(max(dot(rd, uSunDir), 0.), 5.);
    vec3 lit = reach(Lhi, SUN_I) * (.055 + .35 * fwd) * (.75 + .25 * soft) + reach(uMoonDir, MOON_I) * .12;
    vec3 cc = lit + skyRaw(vec3(0., 1., 0.)) * .5;
    c = mix(c, cc, a);
  }
  return toScreen(c);
}
vec3 stars(vec3 rd) {
  vec3 c = vec3(0);
  for (int l = 0; l < 3; l++) {
    float sc = l == 0 ? 160. : l == 1 ? 340. : 700.;
    vec3 q = rd * sc, id = floor(q), fq = fract(q) - .5;
    if (hash3(id + float(l) * 17.) < (l == 0 ? .975 : l == 1 ? .94 : .9)) continue;
    vec3 jit = vec3(hash3(id + 1.3), hash3(id + 2.7), hash3(id + 4.1)) - .5;
    float d = length(fq - jit * .6);
    float b = l == 0 ? 1.2 + 2.5 * pow(hash3(id + 9.1), 3.) : l == 1 ? .35 + .6 * pow(hash3(id + 9.1), 3.) : .18;
    vec3 tint = mix(vec3(1., .82, .66), vec3(.75, .84, 1.), hash3(id + 5.5));
    c += tint * b * 1.4 * (smoothstep(.08, 0., d) + (l == 0 ? .25 * exp(-d * 14.) : 0.));
  }
  // The Milky Way: a band across the sky, mottled, its dark lanes down it.
  vec3 ax = normalize(vec3(.85, .32, .18));
  float lat = dot(rd, ax);
  float band = exp(-pow(lat * 5.5, 2.));
  // Coordinates along the band and across it (so the noise lies in it
  // evenly, not in streaks from a pole).
  vec3 e1 = normalize(cross(ax, vec3(0., 1., 0.))), e2 = cross(ax, e1);
  float along = atan(dot(rd, e2), dot(rd, e1));
  vec2 bp = vec2(along * 14., lat * 14.);
  float m = tn2(bp * .34);
  float lanes = smoothstep(.36, .62, tn2(bp * vec2(.085, .2) + .6));
  float grain = tn(bp * .7 + .3);
  c += mix(vec3(.5, .55, .75), vec3(.85, .78, .7), m) * .13 * band * (.2 + m) * (.2 + .8 * lanes) * (.6 + .8 * grain);
  // Fewer near the moon (its glow outshines them) and down low (the air).
  return c * smoothstep(.02, .22, rd.y) * (1. - .8 * pow(max(dot(rd, uMoonDir), 0.), 20.));
}

// The haze between the eye and the far ranges: the horizon's colours, the
// way the 2D ridges fade layer by layer.
vec3 haze(vec3 c, vec3 rd, float t) {
  float k = 1. - exp(-max(t - 2000., 0.) / 30000.);
  vec3 to = toScreen(skyRaw(normalize(vec3(rd.x, max(rd.y, .02), rd.z))));
  return mix(c, to, clamp(k, 0., .85));
}

vec3 ground(G g, vec3 rd) {
  // Under deep mist nothing of the ground shows: skip its light.
  if (g.T < .004) return vec3(0);
  vec3 p = uCam + rd * g.t;
  vec3 n = g.n;
  float alt = p.y;
  vec2 fu = faceUV(p, n);
  float bn = noise(fu / 32.);
  float strata = noise(vec2(alt / 38. + fbm(fu / 260., 3) * 3. + bn * .8, 1.7));
  vec3 rock = mix(vec3(.08, .07, .068), vec3(.24, .21, .19), strata);
  rock = mix(rock, vec3(.12, .095, .075), noise(fu / 120.) * .6);
  // Below the snow and the scree, pine: dark, blue-green.
  float pine = smoothstep(1650., 1250., alt + noise(p.xz / 90.) * 200.) * smoothstep(.55, .75, n.y);
  rock = mix(rock, vec3(.02, .045, .045), pine);
  vec3 alb = mix(rock, vec3(.86, .87, .88), g.snow);
  float dif = max(dot(n, uLightDir), 0.);
  float sh = dif > 0. ? shadow(g) : 0.;
  // Shaded snow takes the sky's light paler than rock does (it scatters
  // inside itself): a soft grey-blue, not a saturated blue.
  vec3 sk = skyLight();
  vec3 skSnow = mix(vec3(dot(sk, vec3(.2126, .7152, .0722))), sk, .55) * 1.3;
  vec3 c = alb * (bodyLight() * dif * sh + mix(sk, skSnow, g.snow) * (.5 + .5 * n.y) * g.ao);
  // Bounce: with the body ahead, the faces toward the viewer are backlit,
  // but the sunlit mist and snowfields before them throw light back onto
  // them (warm, strongest low down, near the mist), as in a real backlit
  // range; only into the shade the body leaves.
  vec2 back = normalize(-rd.xz);
  float facing = max(dot(normalize(n.xz + 1e-4), back), 0.) * (1. - n.y * .5);
  float lowness = smoothstep(MIST_BASE + MIST_RISE * 6., MIST_BASE, alt);
  vec3 bounce = bodyLight() * mix(vec3(1.), vec3(1., .9, .78), .5) * (.16 + .22 * lowness);
  c += alb * bounce * facing * (1. - dif * sh) * g.ao;
  // Snow is matte: no sheen, only a faint glitter of crystals in the light.
  c += g.snow * bodyLight() * dif * sh * step(.997, hash(floor(p.xz * 1.7 + p.y * .9))) * .5;
  return haze(c, rd, g.t);
}

// The mist, lit: its tops catch the body's light, its depths take the sky's
// and the shade's; toward the body it glows (light through it).
vec3 mistLit(G g, vec3 rd) {
  // Mist is bright: water droplets scatter nearly all the light that falls
  // on them. Its tops take the body's light and the sky's, white; its
  // depths only the sky's, a soft grey-blue; toward the body it glows
  // (light through it).
  float fwd = pow(max(dot(rd, uLightDir), 0.), 5.);
  vec3 bl = bodyLight();
  vec3 sun = mix(bl, vec3(dot(bl, vec3(.3, .5, .2))), .4);
  vec3 sk = skyLight();
  vec3 lo = sk * 1.35 + sun * .12;
  vec3 hi = sun * .72 + sk * 1.05;
  return mix(lo, hi, smoothstep(.05, .75, g.mh)) + sun * fwd * .4;
}

// A body as the 2D scene draws it: a soft disc 10.4% of the frame's height
// across (the button's size, SunToggle.module.css), round on the frame.
vec3 drawSun(vec3 c, vec2 uv, vec3 f, vec3 r, vec3 u, float lens) {
  float z = dot(uSunDir, f);
  if (z <= 0.) return c;
  vec2 sp = vec2(dot(uSunDir, r), dot(uSunDir, u)) * lens / z;
  // Low, the air bends its lower edge up (flattened) and dims and reddens
  // it (the light that reaches us); high, it burns white.
  float alt = uSunDir.y;
  vec2 dv = uv - sp;
  dv.y *= 1. + .28 * smoothstep(.07, 0., alt);
  float R = .104, d = length(dv) / R, px = 2.5 / uRes.y / R;
  float up = smoothstep(-.12, -.02, alt);
  vec3 L = reach(uSunDir, SUN_I);
  float high = smoothstep(.005, .09, alt);
  // The disc: a white-hot core once it's up (it outshines its own colour),
  // its rim darker (limb darkening) and its colour plain while it's low.
  float mu = sqrt(max(1. - d * d, 0.));
  float limb = mix(.55 + .45 * pow(mu, .6), 1., high * .8);
  // (Low, it's still the brightest thing in the sky: deep orange, its own
  // colour, not lost in the glow.)
  vec3 hue = L / max(max(L.r, L.g), 1e-4);
  vec3 disc = mix(min(hue * 1.08, vec3(1.)), vec3(1.), high * high) * limb;
  // Its glow: a tight bright halo and a wide soft one, both its colour, and
  // faint rays (the eye's and a lens's star) once it's bright.
  float o = max(d - 1., 0.);
  vec3 glowC = toScreen(L * mix(.6, .35, high));
  float halo = .5 * exp(-o * 2.2) + .2 * exp(-o * .45) + .06 * exp(-o * .1);
  float ang = atan(dv.y, dv.x);
  float rays = (pow(abs(cos(ang * 3. + .3)), 60.) + .6 * pow(abs(cos(ang * 4. - .7)), 90.)) * exp(-o * .55) * high * .35;
  c = mix(c, glowC, clamp(up * (halo + rays) * mix(.55, 1., high), 0., 1.));
  return mix(c, disc, up * smoothstep(1. + px, 1. - px, d));
}
// The moon as it is: its near side's seas where they are (Imbrium, Serenity,
// Tranquillity, Crisis, Fertility, Nectar, Clouds, Moisture, the Ocean of
// Storms, the Sea of Cold), its bright young craters (Tycho with its rays,
// Copernicus, Kepler, Aristarchus), the highlands pocked with old ones, a
// waxing gibbous phase with a soft terminator, and its halo.
float sea(vec2 q, vec2 c, vec2 r, float rot) {
  vec2 d = q - c;
  d = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * d;
  float e = length(d / r);
  return smoothstep(1.08, .82, e + .22 * (fbm(q * 7. + c * 3., 3) - .5));
}
vec3 drawMoon(vec3 c, vec2 uv, vec3 f, vec3 r, vec3 u, float lens) {
  float z = dot(uMoonDir, f);
  if (z <= 0.) return c;
  vec2 sp = vec2(dot(uMoonDir, r), dot(uMoonDir, u)) * lens / z;
  float R = .104;
  float malt = uMoonDir.y;
  vec2 q = (uv - sp) / R;
  q.y *= 1. + .28 * smoothstep(.07, 0., malt);
  float d = length(q), px = 2.5 / uRes.y / R;
  float up = smoothstep(-.12, -.02, uMoonDir.y);
  float mare = 0.;
  mare = max(mare, sea(q, vec2(-.34, .36), vec2(.3, .25), .3));
  mare = max(mare, sea(q, vec2(.14, .38), vec2(.15, .14), 0.));
  mare = max(mare, sea(q, vec2(.3, .14), vec2(.2, .16), .5));
  mare = max(mare, sea(q, vec2(.64, .3), vec2(.11, .09), 0.));
  mare = max(mare, sea(q, vec2(.5, -.1), vec2(.1, .17), .2));
  mare = max(mare, sea(q, vec2(.31, -.25), vec2(.08, .08), 0.));
  mare = max(mare, sea(q, vec2(-.15, -.33), vec2(.17, .13), .4));
  mare = max(mare, sea(q, vec2(-.46, -.37), vec2(.09, .09), 0.));
  mare = max(mare, sea(q, vec2(-.62, .05), vec2(.24, .42), .15));
  mare = max(mare, sea(q, vec2(.02, .66), vec2(.48, .07), -.05));
  mare = max(mare, sea(q, vec2(.03, .2), vec2(.07, .06), 0.));
  float hi = fbm(q * 5. + 1.3, 5);
  vec3 col = mix(vec3(.86, .84, .8) * (.86 + .24 * hi), vec3(.5, .5, .52) * (.85 + .3 * hi), mare * .9);
  // Old craters: rimmed pits in the highlands, fewer in the seas.
  vec2 gq = q * 9., gi = floor(gq), gf = fract(gq) - .5;
  vec2 cj = hash2(gi) - .5;
  float cr = .16 + .2 * hash(gi + 3.3);
  float cd = length(gf - cj * .4) / cr;
  float pit = hash(gi + 7.1) > .55 ? smoothstep(1., .7, cd) * .1 - smoothstep(1.15, 1., cd) * smoothstep(.9, 1., cd) * .08 : 0.;
  col *= 1. - pit * (1. - mare * .7);
  // The young bright craters and Tycho's rays.
  vec2 ty = vec2(-.12, -.68);
  float rays = pow(max(cos(atan(q.y - ty.y, q.x - ty.x) * 14. + fbm(q * 3., 2) * 4.), 0.), 6.) * smoothstep(.9, .1, length(q - ty));
  col += vec3(.18) * rays * .6;
  col += vec3(.35) * smoothstep(.05, .02, length(q - ty));
  col += vec3(.22) * smoothstep(.045, .02, length(q - vec2(-.27, .12)));
  col += vec3(.16) * smoothstep(.03, .012, length(q - vec2(-.5, .16)));
  col += vec3(.3) * smoothstep(.028, .01, length(q - vec2(-.62, .36)));
  if (uMoonReady > .5) {
    vec3 tex = pow(texture(uMoonTex, vec2(q.x, -q.y) * .5 + .5).rgb, vec3(2.2));
    col = tex * 1.55;
  }
  // The phase: waxing gibbous, lit from the right, the terminator soft,
  // the bright limb a touch dimmer (the regolith's own falloff).
  vec3 sn = vec3(q, sqrt(max(1. - d * d, 0.)));
  float lit = smoothstep(-.18, .12, dot(sn, normalize(vec3(.85, .05, .52))));
  col *= mix(.035, 1., lit) * 1.12;
  // Low, through more air: amber, then honey, dimmer; high, silver.
  vec3 tr = exp(-tau0() * airmass(max(malt, 0.) + .004));
  vec3 tint = tr / max(max(tr.r, tr.g), 1e-3);
  float high = smoothstep(.02, .3, malt);
  col *= mix(tint * mix(.55, 1., smoothstep(-.02, .08, malt)), vec3(1.), high);
  float out1 = max(d - 1., 0.);
  vec3 haloC = mix(vec3(.85, .6, .35), vec3(.62, .7, .9), high);
  c += haloC * up * (.07 * exp(-out1 * 1.3) + .03 * exp(-out1 * .22)) * step(1., d);
  return mix(c, col, up * smoothstep(1. + px, 1. - px, d));
}

// The light, in two parts: what's there (the ground or the sky, with the
// bodies) and the mist before it, with how much of the first shows
// through. The composite (PEAKS_MIX_FS) moves the mist over them each frame.
void lightParts(G g, vec3 rd, vec2 uv, vec3 f, vec3 r, vec3 u, float lens, out vec3 base, out vec3 mist) {
  for (int i = 0; i < 6; i++) S[i] = pow(uStops[i], vec3(2.2));
  LIGHT = mix(pow(uBody, vec3(2.2)), vec3(1.), .15 * (1. - uNight));
  EXPO = mix(1.05, 30., smoothstep(.0, 1., uNight));
  if (g.hit > 0.) base = ground(g, rd);
  else {
    base = sky(rd) + stars(rd) * uNight;
    base = drawSun(base, uv, f, r, u, lens);
    base = drawMoon(base, uv, f, r, u, lens);
  }
  mist = mistLit(g, rd);
}
`;

// The coarse pass, at a quarter of the size each way: how far each ray
// gets before it is near the ground (a little short of it, so the full
// pass, starting there, never steps over a ridge a coarse ray missed).
export const PEAKS_COARSE_FS = `#version 300 es
${COMMON}
uniform vec2 uFull;
out vec4 o;
void main() {
  // This texel's block of 4 × 4 full pixels: its centre, in the full
  // frame's view coordinates.
  vec2 uv = (gl_FragCoord.xy * 4. * 2. - uFull) / uFull.y;
  vec3 f = normalize(uLook - uCam), r = normalize(cross(f, vec3(0, 1, 0))), u = cross(r, f);
  float lens = 1. / tan(radians(uFov) * .5);
  // The corner rays of this coarse texel's block, the nearest of them.
  float best = 1e9;
  for (int k = 0; k < 4; k++) {
    vec2 o2 = vec2(k & 1, k >> 1) * 2. - 1.;
    vec2 q = uv + o2 * 4. / uFull.y;
    vec3 rd = normalize(f * lens + q.x * r + q.y * u);
    float t = march(uCam, rd, 80000., 1.);
    best = min(best, t < 0. ? 80000. : t);
  }
  o = vec4(best * .82 * .001, 0., 0., 1.);
}`;

// Each pixel's ground horizon toward the four bearings, at half the size
// each way (the shadows are soft; the light pass reads it filtered).
export const PEAKS_HOR_FS = `#version 300 es
${COMMON}
uniform sampler2D uG0;
out vec4 o;
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy) * 2;
  vec4 a = texelFetch(uG0, px, 0);
  if (a.x <= 0.) { o = vec4(-1); return; }
  vec2 uv = (vec2(px) + .5) * 2. / uRes - 1.;
  uv.x *= uRes.x / uRes.y;
  vec3 f = normalize(uLook - uCam), r = normalize(cross(f, vec3(0, 1, 0))), u = cross(r, f);
  vec3 rd = normalize(f / tan(radians(uFov) * .5) + uv.x * r + uv.y * u);
  vec3 n = vec3(a.y, sqrt(max(1. - a.y * a.y - a.z * a.z, 0.)), a.z);
  vec3 p = uCam + rd * a.x * 1000. + n * 3.;
  o = vec4(horizon(p, uBear[0]), horizon(p, uBear[1]), horizon(p, uBear[2]), horizon(p, uBear[3]));
}`;

// The shape pass: two float targets.
export const PEAKS_GEO_FS = `#version 300 es
${COMMON}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform sampler2D uCoarse;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = geo(rd, texelFetch(uCoarse, ivec2(gl_FragCoord.xy) / 4, 0).x * 1000.);
  o0 = vec4(g.t * .001, g.n.x, g.n.z, g.snow);
  o1 = vec4(g.T, g.mh, g.ao, g.hit);
}`;

// The light pass, reading them.
const READ_G = `
uniform sampler2D uG0, uG1, uG2;
uniform float uReady, uReveal;
G readG() {
  if (uReady < .5) {
    G s; s.t = -1.; s.n = vec3(0, 1, 0); s.snow = 0.; s.T = 1.; s.mh = 0.; s.ao = 1.; s.hit = 0.; s.hor = vec4(-1);
    return s;
  }
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uG0, px, 0), b = texelFetch(uG1, px, 0);
  G g;
  g.t = a.x * 1000.; g.n = vec3(a.y, sqrt(max(1. - a.y * a.y - a.z * a.z, 0.)), a.z); g.snow = a.w;
  g.T = b.x; g.mh = b.y; g.ao = b.z; g.hit = b.w;
  g.hor = texture(uG2, gl_FragCoord.xy / uRes);
  return g;
}`;

// The mist's motion: a wind field from a small tiling noise texture
// (uFlow, made once on the CPU), sampled where the ray crosses the mist's
// middle, rolling on with the clock and faster through a switch (the
// timelapse), so the banks drift and part. Three texture reads a pixel.
const FLOW = `
uniform float uT, uLapseMix;
float mistFlow(vec3 rd) {
  float mid = MIST_BASE + MIST_RISE * 1.2;
  if (rd.y >= -.002) return 1.;
  vec2 p = (uCam + rd * ((mid - uCam.y) / rd.y)).xz;
  // One wind (all of it drifts the same way, the larger forms slower), read
  // at three scales turned to unrelated angles, so the texture's repeat
  // never lines up into a pattern.
  float clock = uT * .05 + uLapseMix * 1.8;
  vec2 wind = normalize(vec2(1., .32)) * clock;
  vec2 q1 = mat2(.82, .57, -.57, .82) * (p / 5600.) + wind * .35;
  vec2 q2 = mat2(.36, -.93, .93, .36) * (p / 2300.) + wind * .7;
  vec2 q3 = mat2(-.6, .8, -.8, -.6) * (p / 900.) + wind * 1.2;
  vec2 warp = texture(uFlow, q1 * .7 + .13).rg - .5;
  float a = texture(uFlow, q1 + warp * .35).r;
  float b = texture(uFlow, q2 + warp * .25).g;
  float c = texture(uFlow, q3).r;
  float v = a * .5 + b * .33 + c * .17;
  return mix(.25, 2.2, smoothstep(.3, .72, v));
}
vec3 compose(vec3 base, vec3 mist, float T0, vec3 rd) {
  float T = T0 < .9999 ? pow(T0, mistFlow(rd)) : T0;
  return mix(mist, base, T);
}`;

// The light pass: both parts into two targets (the mist's transmittance,
// square-rooted for its precision, in the second's alpha).
export const PEAKS_FS = `#version 300 es
${COMMON}
${SHADE}
${READ_G}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = readG();
  vec3 base, mist;
  lightParts(g, rd, uv, f, r, u, lens, base, mist);
  o0 = vec4(pow(base, vec3(1. / 2.2)), 1.);
  o1 = vec4(pow(mist, vec3(1. / 2.2)), sqrt(g.T));
}`;

// The composite, every frame: the two parts and the mist's motion.
export const PEAKS_MIX_FS = `#version 300 es
${COMMON}
uniform sampler2D uFlow;
${FLOW}
uniform sampler2D uBase, uMist;
uniform float uA;
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 base = texelFetch(uBase, px, 0).rgb;
  vec4 m = texelFetch(uMist, px, 0);
  vec3 c = m.a > .9999 ? base : pow(compose(pow(base, vec3(2.2)), pow(m.rgb, vec3(2.2)), m.a * m.a, rd), vec3(1. / 2.2));
  c += (hash(gl_FragCoord.xy) - .5) / 255.;
  o = vec4(c * uA, uA);
}`;

// The light and the composite in one, for the drop (the camera moving).
export const PEAKS_LIT_FS = `#version 300 es
${COMMON}
${SHADE}
${READ_G}
${FLOW}
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = readG();
  vec3 base, mist;
  lightParts(g, rd, uv, f, r, u, lens, base, mist);
  vec3 lin = compose(base, mist, g.T, rd);
  // The first load: the mountains fade in over the sky that was there.
  if (g.hit > 0. && uReveal < 1.) lin = mix(sky(rd), lin, uReveal);
  vec3 c = pow(lin, vec3(1. / 2.2)) + (hash(gl_FragCoord.xy) - .5) / 255.;
  o = vec4(c * uA, uA);
}`;

// Both in one, where float targets can't be drawn into.
export const PEAKS_ALL_FS = `#version 300 es
${COMMON}
${SHADE}
${FLOW}
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = geo(rd, 1.);
  vec3 p0 = uCam + rd * max(g.t, 0.) + g.n * 3.;
  g.hor = g.hit > 0. ? vec4(horizon(p0, uBear[0]), horizon(p0, uBear[1]), horizon(p0, uBear[2]), horizon(p0, uBear[3])) : vec4(-1);
  vec3 base, mist;
  lightParts(g, rd, uv, f, r, u, lens, base, mist);
  vec3 c = pow(compose(base, mist, g.T, rd), vec3(1. / 2.2)) + (hash(gl_FragCoord.xy) - .5) / 255.;
  o = vec4(c * uA, uA);
}`;


// The mist's wind field: 128² tiling value-noise fbm, two channels, made
// once (about a millisecond) so the composite reads it instead of working
// noise out per pixel.
export function flowNoise(N = 128) {
  const out = new Uint8Array(N * N * 4);
  const grid = (seed, g) => {
    const v = new Float32Array(g * g);
    let x = seed * 2654435761;
    for (let i = 0; i < v.length; i++) {
      x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0;
      v[i] = x / 4294967296;
    }
    return v;
  };
  const sample = (v, g, u, w) => {
    const x = u * g, y = w * g;
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a, b) => v[((b % g) + g) % g * g + (((a % g) + g) % g)];
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const octaves = [4, 8, 16, 32, 64].map((g, k) => [g, grid(k + 1, g), grid(k + 11, g)]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let r = 0, gch = 0, amp = 0.5, tot = 0;
      for (const [g, va, vb] of octaves) {
        r += amp * sample(va, g, x / N, y / N);
        gch += amp * sample(vb, g, x / N, y / N);
        tot += amp;
        amp *= 0.5;
      }
      const o = (y * N + x) * 4;
      out[o] = (r / tot) * 255;
      out[o + 1] = (gch / tot) * 255;
      out[o + 2] = 0;
      out[o + 3] = 255;
    }
  return out;
}
