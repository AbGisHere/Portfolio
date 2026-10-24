/**
 * Where the scroll comes to rest: progress along a stretch where the camera
 * holds still for a while (the camera's own keyframes hold there:
 * ../gradient/deskCamera.js DESK_PATH, CONTACT_PATH). When scrolling stops
 * near one, the scroll layer (../SmoothScroll.jsx) glides onto it.
 *
 * - desk .025: the end of the pull-back, the sun half set behind the ridges.
 * - desk .5: the top-down shot over the desk.
 * - contact .02: (0.4.0) the reading position, the laptop's screen.
 * - contact .96: (0.4.0) straight down over the pool: the contact hold.
 */
export const DESK_STOPS = [0.025, 0.5];
export const CONTACT_STOPS = [0.02, 0.96];

/** How near a stop (share of the viewport's height) a resting scroll is
 * drawn onto it. */
export const STOP_REACH = 0.5;
