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
// The sun's and the moon's bearings, flat (their azimuths hold through a
// switch: each only sinks or rises on its own side, ../peaks.js).
uniform vec2 uSunH, uMoonH;

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
float march(vec3 ro, vec3 rd, float tmax) {
  float t = 1.;
  for (int i = 0; i < 300; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - terrain(p.xz, 6);
    if (h < .0012 * t) return t;
    if (t > tmax || (rd.y > 0. && p.y > 5600.)) break;
    t += max(h * .42, .2 + t * .0007);
  }
  return -1.;
}
vec3 nrm(vec3 p, float t) {
  float e = max(.8, t * .0014);
  int oc = t < 5000. ? 11 : 8;
  return normalize(vec3(terrain(p.xz - vec2(e, 0), oc) - terrain(p.xz + vec2(e, 0), oc), 2. * e,
                        terrain(p.xz - vec2(0, e), oc) - terrain(p.xz + vec2(0, e), oc)));
}

// ---- the mist: soft banks pooled low, thinning upward, torn by noise
float mistAt(vec3 p) {
  float hgt = (p.y - MIST_BASE) / MIST_RISE;
  if (hgt > 3.5) return 0.;
  vec2 q = p.xz / 1400.;
  float n = fbm(q + .5 * vec2(fbm(q * 1.7 + 3.1, 3), fbm(q * 1.7 + 8.3, 3)), 5);
  float bank = smoothstep(.32, .78, n + .35 - hgt * .3);
  return bank * exp(-max(hgt, 0.) * 1.3) * .0011;
}

struct G { float t; vec3 n; float snow; float T; float mh; float ao; float hit; vec2 hor; };

// How high the ground rises toward a bearing, seen from p: the tangent of
// the horizon's elevation. A body below it is hidden, so the light pass
// shades with this instead of marching a shadow every frame.
float horizon(vec3 p, vec2 dir) {
  float m = -1., t = 12.;
  for (int i = 0; i < 40; i++) {
    vec2 q = p.xz + dir * t;
    float h = terrain(q, 4) - p.y;
    m = max(m, h / t);
    t *= 1.16;
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

G geo(vec3 rd) {
  G g;
  g.t = march(uCam, rd, 80000.);
  g.hit = g.t > 0. ? 1. : 0.;
  g.n = vec3(0, 1, 0); g.snow = 0.; g.ao = 1.; g.hor = vec2(-1);
  vec3 p = uCam + rd * max(g.t, 0.);
  if (g.hit > 0.) {
    g.n = nrm(p, g.t);
    float alt = p.y;
    // Snow where the slope holds it, more of it higher up; the steepest
    // faces bare, in bands (the rock's strata).
    float line = 1500. + fbm(p.xz / 650., 3) * 450.;
    float strata = noise(vec2(alt / 38. + fbm(p.xz / 260., 3) * 3., 1.7));
    float holds = g.n.y + .1 * (fbm(p.xz / 45., 3) - .5) + .12 * (strata - .5);
    g.snow = smoothstep(line - 120., line + 120., alt) * smoothstep(.36, .5, holds);
    g.snow = max(g.snow, smoothstep(.55, .68, holds) * smoothstep(1300., 1600., alt));
    g.ao = clamp(.6 + (alt - terrain(p.xz, 3)) / 300., .3, 1.);
    vec3 lift = p + g.n * 3.;
    g.hor = vec2(horizon(lift, uSunH), horizon(lift, uMoonH));
  }
  // The mist between the eye and what it sees: its depth (transmittance)
  // and how high in it the light was gathered (the light pass lights it).
  float end = g.hit > 0. ? g.t : 60000.;
  float tau = 0., hw = 0., w = 0.;
  float t0 = 0., t1 = end;
  float top = MIST_BASE + MIST_RISE * 3.5;
  if (rd.y < 0.) t0 = max(0., (top - uCam.y) / rd.y); else if (uCam.y > top) t1 = 0.;
  if (t1 > t0) {
    float dt = (t1 - t0) / 28.;
    float j = hash(gl_FragCoord.xy) * dt;
    for (int i = 0; i < 28; i++) {
      vec3 q = uCam + rd * (t0 + j + dt * float(i));
      float dn = mistAt(q) * dt;
      float a = exp(-tau);
      tau += dn;
      hw += a * dn * clamp((q.y - MIST_BASE) / (MIST_RISE * 3.5), 0., 1.);
      w += a * dn;
    }
  }
  g.T = exp(-tau);
  g.mh = w > 0. ? hw / w : 0.;
  return g;
}
`;

const SHADE = `
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
float shadow(G g) {
  float tl = uLightDir.y / max(length(uLightDir.xz), 1e-4);
  float th = uByMoon > .5 ? g.hor.y : g.hor.x;
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
  c += I * vec3(.0016, .0032, .0075) * tw * (.4 + .6 * smoothstep(0., .6, rd.y));
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
    float cover = smoothstep(.42, .7, fbm(q * .35 + 11.3, 4));
    vec2 w = q + .6 * vec2(fbm(q * 1.1 + 1.7, 4), fbm(q * 1.1 + 6.1, 4));
    float fib = fbm(vec2(w.x * 1.2, w.y * 3.6), 7);
    float soft = fbm(w * 2.1 + 3.3, 6);
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
  float m = fbm(bp * 2.4, 7);
  float lanes = smoothstep(.36, .62, fbm(bp * vec2(.6, 1.4) + 4.2, 6));
  float grain = fbm(bp * 5. + 9.1, 4);
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
  if (g.T < .02) return vec3(0);
  vec3 p = uCam + rd * g.t;
  vec3 n = g.n;
  float alt = p.y;
  float strata = noise(vec2(alt / 38. + fbm(p.xz / 260., 3) * 3., 1.7));
  vec3 rock = mix(vec3(.08, .07, .068), vec3(.24, .21, .19), strata);
  rock = mix(rock, vec3(.12, .095, .075), noise(p.xz / 120.) * .6);
  // Below the snow and the scree, pine: dark, blue-green.
  float pine = smoothstep(1650., 1250., alt + noise(p.xz / 90.) * 200.) * smoothstep(.55, .75, n.y);
  rock = mix(rock, vec3(.02, .045, .045), pine);
  vec3 alb = mix(rock, vec3(.92, .93, .95), g.snow);
  float dif = max(dot(n, uLightDir), 0.);
  float sh = dif > 0. ? shadow(g) : 0.;
  vec3 c = alb * (bodyLight() * dif * sh + skyLight() * (.5 + .5 * n.y) * g.ao);
  // Snow's sheen toward the body.
  vec3 hlf = normalize(uLightDir - rd);
  c += g.snow * bodyLight() * sh * pow(max(dot(n, hlf), 0.), 40.) * .25;
  return haze(c, rd, g.t);
}

// The mist, lit: its tops catch the body's light, its depths take the sky's
// and the shade's; toward the body it glows (light through it).
vec3 mistLit(G g, vec3 rd) {
  float fwd = pow(max(dot(rd, uLightDir), 0.), 4.);
  vec3 lo = skyLight() * .95;
  vec3 hi = bodyLight() * .75 + skyLight() * .6;
  return mix(lo, hi, smoothstep(0., .8, g.mh)) + bodyLight() * fwd * .35;
}

// A body as the 2D scene draws it: a soft disc 10.4% of the frame's height
// across (the button's size, SunToggle.module.css), round on the frame.
vec3 drawSun(vec3 c, vec2 uv, vec3 f, vec3 r, vec3 u, float lens) {
  float z = dot(uSunDir, f);
  if (z <= 0.) return c;
  vec2 sp = vec2(dot(uSunDir, r), dot(uSunDir, u)) * lens / z;
  // Flattened a little at the horizon (the air bends its lower edge up).
  vec2 dv = uv - sp;
  dv.y *= 1. + .25 * smoothstep(.06, 0., uSunDir.y);
  float R = .104, d = length(dv) / R, px = 2.5 / uRes.y / R;
  float up = smoothstep(-.12, -.02, uSunDir.y);
  vec3 sunC = toScreen(reach(uSunDir, SUN_I) * .5) * 1.05 + vec3(.04, .03, .02);
  c = mix(c, sunC, up * (.42 * exp(-max(d - 1., 0.) * 1.6) + .14 * exp(-max(d - 1., 0.) * .3)));
  return mix(c, sunC * (.94 + .06 * sqrt(max(1. - d * d, 0.))), up * smoothstep(1. + px, 1. - px, d));
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
  vec2 q = (uv - sp) / R;
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
  float out1 = max(d - 1., 0.);
  c += vec3(.62, .7, .9) * up * (.07 * exp(-out1 * 1.3) + .03 * exp(-out1 * .22)) * step(1., d);
  return mix(c, col, up * smoothstep(1. + px, 1. - px, d));
}

vec4 lightPass(G g, vec3 rd, vec2 uv, vec3 f, vec3 r, vec3 u, float lens) {
  for (int i = 0; i < 6; i++) S[i] = pow(uStops[i], vec3(2.2));
  LIGHT = mix(pow(uBody, vec3(2.2)), vec3(1.), .15 * (1. - uNight));
  EXPO = mix(1.05, 30., smoothstep(.0, 1., uNight));
  vec3 c;
  if (g.hit > 0.) c = ground(g, rd);
  else {
    c = sky(rd) + stars(rd) * uNight;
    c = drawSun(c, uv, f, r, u, lens);
    c = drawMoon(c, uv, f, r, u, lens);
  }
  c = mix(mistLit(g, rd), c, g.T);
  c = pow(c, vec3(1. / 2.2));
  c += (hash(gl_FragCoord.xy) - .5) / 255.;
  return vec4(c * uA, uA);
}
`;

// The shape pass: two float targets.
export const PEAKS_GEO_FS = `#version 300 es
${COMMON}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  G g = geo(rd);
  o0 = vec4(g.t * .001, g.n.x, g.n.z, g.snow);
  o1 = vec4(g.T, g.mh, g.ao, g.hit);
  o2 = vec4(g.hor, 0., 0.);
}`;

// The light pass, reading them.
export const PEAKS_FS = `#version 300 es
${COMMON}
${SHADE}
uniform sampler2D uG0, uG1, uG2;
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uG0, px, 0), b = texelFetch(uG1, px, 0);
  G g;
  g.t = a.x * 1000.; g.n = vec3(a.y, sqrt(max(1. - a.y * a.y - a.z * a.z, 0.)), a.z); g.snow = a.w;
  g.T = b.x; g.mh = b.y; g.ao = b.z; g.hit = b.w;
  g.hor = texelFetch(uG2, px, 0).xy;
  o = lightPass(g, rd, uv, f, r, u, lens);
}`;

// Both in one, where float targets can't be drawn into.
export const PEAKS_ALL_FS = `#version 300 es
${COMMON}
${SHADE}
out vec4 o;
void main() {
  vec3 f, r, u; float lens; vec2 uv;
  vec3 rd = viewRay(f, r, u, lens, uv);
  o = lightPass(geo(rd), rd, uv, f, r, u, lens);
}`;
