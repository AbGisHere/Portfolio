import { airOpacity, mistColour, mistOf, ridgePaint } from './gl/mistGeometry';
import { orbitBodies, restX } from './orbit';
import {
  DESCENT_AIR,
  blendPaint,
  bodyAt,
  descentAt,
  descentPaint,
  frameAt,
  groundPaint,
  hiddenAt,
  meadowOf,
  ridgeLightAt,
  scrollHaze,
  scrollPalette,
  scrollPaletteSwitch,
  skyUnder,
} from './camera';
import { deskPeaksCamera, peaksAt } from './peaks';

// (0.5.3) Where the flight starts easing into the desk path's camera.
const FLIGHT_JOIN = 0.85;
import { cameraMetres, contactCameraAt, deskCameraAt, freeCameraAt, deskFrameAt, deviceFor, deskSkyAt, grassLit, grassOf, lidAt, pitchOf, skyLifeAt, toScreen } from './deskCamera';

/**
 * One frame of the scene, as both renderers paint it: the descent's camera
 * and time of day, the ridges placed and painted, the sun and moon (on the
 * switch's arc, then moved by the camera), their light on the ridges, the
 * meadow, the sky under the camera and the air. Pure: the renderers only map
 * what it returns to uniforms (GL) or CSS (layered).
 *
 * What differs between the renderers comes in as arguments:
 * - `base`, `haze`: the resting palette and haze (GL: the spring's; layered:
 *   the switch's scene or the recipe).
 * - `layoutAt(ranges)`: the ridges' layout with the descent's world ranges
 *   (GL: from the spring's dials; layered: the fixed silhouette it loaded).
 * - `sun`: where the body rests unscrolled (default: that layout's).
 * - `restCol`: the resting body's colour (GL: the spring's; layered: the
 *   palette's `sunColour`).
 * - `orbit`, `e`: the switch (null at rest) and its progress, which blend the
 *   two scenes' camera, haze, light and meadow. `turning` says it has a
 *   scene yet (GL's first switch frame has none): the palette runs through
 *   the switch's keyframes and the bodies ride the arc only once it does.
 * - `maxRidges`: how many ridges get painted (the shader's MAX_RIDGES).
 * - `peaksOff`: no 3D opening (`?peaks=0`, and the layered renderer).
 */
export function sceneAt({
  recipe: r,
  orbit = null,
  e = 1,
  turning = !!orbit,
  base,
  haze,
  about,
  desk = 0,
  contact = 0,
  free = null,
  reduced = false,
  w,
  h,
  layoutAt,
  sun: rest,
  restCol,
  maxRidges = Infinity,
  peaksOff = false,
}) {
  const p = orbit ? e : 1;
  const from = orbit ? orbit.prev : r;
  // The camera, blended between the scenes' amounts mid-switch, and the
  // descent's time of day over the palette.
  // Past the pull-back (`desk` > 0) the 0.3 camera takes over from where
  // it left off (deskCamera.js).
  // (0.4.0) Past the desk (`contact` > 0) the contact path does.
  // (0.4.2) The dev-only /house route's free camera takes over from both.
  const onDesk = desk > 0 || contact > 0 || !!free;
  const camOpts = { reduced, from: orbit?.prev, e: p, device: deviceFor(w, h), peaks: !peaksOff };
  const cam = free
    ? freeCameraAt(free, r, camOpts)
    : contact > 0
    ? contactCameraAt(contact, r, camOpts)
    : onDesk
      ? deskCameraAt(desk, r, camOpts)
      : descentAt(about, r, { reduced, from: orbit?.prev, e: p });
  const stops = turning ? scrollPaletteSwitch(base, orbit.prev, orbit.next, about, e) : scrollPalette(base, r, about);
  // Past the top the world ranges join the layout (under the frame, or sunk
  // behind the far ridge), and the camera brings them in by geometry alone.
  const layout = layoutAt(cam.ranges);
  const view = onDesk ? deskFrameAt(layout, h, cam) : frameAt(layout, h, cam);
  // The haze thins toward evening (the recipe's `scroll.haze`).
  const hz = view.rest ? haze : scrollHaze(haze, from, r, p, about);

  // At rest, one body where `layout` put it; mid-switch, both on the arc
  // (whose far end is the target's resting spot: same height, its x). Then
  // the descent moves them: each sets toward the horizon as the camera tilts
  // the sky up (bodyAt). Mid-switch the resting look passes from the
  // outgoing body to the incoming one on the switch's clock, and the arc
  // goes under behind the far ridge where the camera has put it (hiddenAt),
  // so a switch and a scroll combine on every frame.
  const sun = rest ?? layout.sun;
  const sunX = restX(mistOf(r.mist).sun, w, h);
  // (The recipe's own ranges, not the descent's extra far ones.)
  const own = layout.ridges.filter(rd => !rd.extra);
  const place = { w, h, restY: sun.y };
  const hidden = turning ? hiddenAt(r, view, { ...place, r: sun.r, far: layout.ridges.indexOf(own[0]) }) : null;
  const lit = turning
    ? orbitBodies(orbit, e, { w, h, sun: { ...sun, x: sunX }, ridges: own, hidden }).map((b, i) =>
        bodyAt(b, i === 0 ? orbit.prev : orbit.next, view, { ...place, look: i === 0 ? 1 - e : e }),
      )
    : [bodyAt({ ...sun, col: restCol, face: r.body === 'moon' ? 1 : 0, glow: 1, alpha: 1, wash: 0, squash: 0 }, r, view, place)];
  // The painted body's centre, for the hit target (sunSpot.js) and the
  // harness: at rest the body as painted; mid-switch where it will land,
  // moved by the descent too.
  const painted = turning ? bodyAt({ ...sun, x: sunX }, r, view, place) : lit[0];
  // (0.3.11) Where the desk's light comes from: mid-switch it swings from
  // the outgoing body's resting spot to the incoming one's on the switch's
  // clock, so the shadows on the desk and the grass turn with the sky
  // rather than jump.
  const fromX = turning ? restX(mistOf(orbit.prev.mist).sun, w, h) : sunX;
  const litFrom = turning ? bodyAt({ ...sun, x: fromX + (sunX - fromX) * e }, r, view, place) : painted;
  // Everything above is on the 0.2 camera's image plane; the 0.3 camera's
  // pitch takes it to the screen (null: no pitch). The hit target goes where
  // the body lands there (off the frame once the camera looks down).
  const pitch = onDesk ? pitchOf(cam, view, w, h) : null;
  const shown = pitch ? toScreen(pitch, painted.x, painted.y) : painted;
  // (0.5.0) Over the opening the body is the 3D scene's (../peaks.js).
  // (0.5.3) On the desk's paths the same peaks, from the desk's camera,
  // behind the meadow (not over the dev route's free camera).
  const deskPeaks = onDesk && pitch && !free ? deskPeaksCamera(cameraMetres(cam), cam, pitch, w, h) : null;
  // (0.5.3) The flight's last stretch eases into the desk path's first
  // camera (its lens, shifted, and its focal length), so there's no cut.
  let flight = deskPeaks;
  if (!onDesk && !peaksOff && about > FLIGHT_JOIN) {
    const c0 = deskCameraAt(0, r, camOpts);
    const v0 = deskFrameAt(layoutAt(c0.ranges), h, c0);
    const P0 = pitchOf(c0, v0, w, h);
    if (P0) flight = { join: deskPeaksCamera(cameraMetres(c0), c0, P0, w, h), t: (about - FLIGHT_JOIN) / (1 - FLIGHT_JOIN) };
  }
  const peaks = peaksAt({ recipe: r, orbit: turning ? orbit : null, e, about, onDesk, w, h, off: peaksOff, desk: flight });
  const at = peaks && peaks.a > 0.5 ? peaks.spot : shown;
  const spot = at ? { x: at.x, y: at.y } : { x: -1e4, y: -1e4 };
  const life = onDesk ? skyLifeAt(desk, r, stops, { prev: turning ? orbit.prev : null, e }) : null;

  // Ridges: past the top each is lit for the slot it has reached (its `t`),
  // and takes the descent's painted colours (descentPaint) on the camera's
  // clock.
  const drawn = layout.ridges.slice(0, maxRidges);
  const ridges = view.rest ? drawn : drawn.map((rd, i) => ({ ...rd, t: view.ridges[i].t, flat: view.ridges[i].flat }));
  const studio = ridgePaint(stops, ridges, hz, h);
  const paints = view.rest ? studio : studio.map((pt, i) => blendPaint(pt, descentPaint(stops, ridges[i], h), view.k));
  const M = mistColour(stops);
  // The body's light on the ridges (ridgeLightAt).
  const light = ridgeLightAt({ lit, orbit, stops, M, ts: ridges.map(rd => rd.t), w, h });
  // The meadow below the front ridge.
  const n = ridges.length;
  const ground = n ? groundPaint(stops, meadowOf(from, r, p), paints[n - 1].fill[2], view, h, hz) : null;

  const grassObj = onDesk || peaks ? grassLit(grassOf(r, { prev: turning ? orbit.prev : null, e }), { stops, light, body: litFrom, pitch, w }) : null;
  if (peaks && grassObj) peaks.meadow = { ground: grassObj.ground, far: grassObj.far, sky: grassObj.sky };

  return {
    cam,
    // (0.5.0) The opening in 3D (null: not drawn).
    peaks,
    stops,
    layout,
    view,
    haze: hz,
    M,
    lit,
    painted,
    spot,
    pitch,
    ridges,
    paints,
    light,
    ground,
    // The sky under the camera: frame row y shows the ramp at (y × scale + shift).
    sky: onDesk ? deskSkyAt(view, h, pitch, life) : skyUnder(view, h),
    // (0.3) The closing shot's sky: clouds, birds, stars (null: none).
    life,
    // (0.3.1) The grass's colours under the desk camera (null: none).
    grass: onDesk ? grassObj : null,
    // (0.3.8) The laptop's lid, degrees open (0: shut, or no desk).
    lid: onDesk ? lidAt(desk) : 0,
    // (0.3.10) The device on the desk: the tablet on a portrait frame.
    device: deviceFor(w, h),
    // The air band's opacity, thinned under the camera.
    air: airOpacity(hz) * (view.rest ? 1 : 1 - DESCENT_AIR * view.k),
  };
}
