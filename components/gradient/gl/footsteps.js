/**
 * (0.3.1) The footsteps in the grass: an invisible person walking where the
 * pointer goes (ROADMAP.md, "0.3 — the desk"). Pure bookkeeping, no GL: the
 * renderer feeds it ground points (deskCamera.js groundAt) and reads the
 * live prints back as uniforms for the grass (grassShader.js).
 *
 * - A moving mouse lays alternating left and right prints along its path,
 *   one STRIDE apart, each turned the way it's walking.
 * - A tap is one print, facing away from the camera, the other foot to
 *   the last.
 * - Each print is a boot (bootPrint.js): `foot` is 1 for the right, -1 for
 *   the left, its sole mirrored.
 * - A print presses its blades flat at once, holds, then lets them spring
 *   back (grassShader.js footStrength); after LIFE seconds it's gone.
 *
 * Times are seconds on the footprint clock (the scene's third clock).
 */

/** Metres between one print and the next. */
export const STRIDE = 0.36;
/** Half the distance between the left and right feet, metres. */
export const GAIT = 0.09;
/** Seconds a print lives (pressed, held, sprung back). */
export const LIFE = 3.4;
/** How many prints the grass reads at once (grassShader.js MAX_PRINTS). */
export const MAX_PRINTS = 24;
/** How far from the camera's foot a step can land, metres (the grass's reach). */
export const REACH = 30;

export function createWalker() {
  let last = null;
  let side = 1;
  const prints = [];

  // `side` 1 lands the foot left of the path (shader's +x is right).
  const add = (x, z, angle, t) => {
    prints.push({ x, z, angle, t, foot: -side });
    if (prints.length > MAX_PRINTS) prints.shift();
  };

  return {
    /** The pointer is over ground point `g` ({ x, z }, metres) at time t. */
    move(g, t) {
      if (!last) {
        last = { x: g.x, z: g.z };
        return false;
      }
      const dx = g.x - last.x;
      const dz = g.z - last.z;
      const dist = Math.hypot(dx, dz);
      // A jump (a scroll moved the ground under a still pointer, or it came
      // back from far away) restarts the walk rather than striding across.
      if (dist > STRIDE * 6) {
        last = { x: g.x, z: g.z };
        return false;
      }
      if (dist < STRIDE) return false;
      const ux = dx / dist;
      const uz = dz / dist;
      side = -side;
      // The foot lands beside the path, turned along it.
      add(g.x - uz * GAIT * side, g.z + ux * GAIT * side, Math.atan2(ux, uz), t);
      last = { x: g.x, z: g.z };
      return true;
    },
    /** A tap at ground point `g`: one print, facing away from `from`. */
    tap(g, from, t) {
      side = -side;
      add(g.x, g.z, Math.atan2(g.x - from.x, g.z - from.z), t);
      last = null;
    },
    /** The pointer left the ground (or the meadow left the frame). */
    lift() {
      last = null;
    },
    /** The prints still alive at t, oldest first. */
    live(t) {
      while (prints.length && t - prints[0].t > LIFE) prints.shift();
      return prints;
    },
  };
}
