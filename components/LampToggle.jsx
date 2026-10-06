'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { getLampSpot, subscribeLampSpot } from './gradient/lampSpot';
import { saveLampPose, setLampPose } from './gradient/lampPose';
import { lampAt, poseFree, screenToWorld } from './gradient/gl/lampShape';
import styles from './LampToggle.module.css';

// How far (px) a press moves before it's a drag, not a click.
const DRAG_PX = 5;

/**
 * (0.3.11) The desk lamp as a control: the sun toggle's counterpart at the
 * other end of the page (ROADMAP.md, "The lamp is a theme toggle").
 *
 * - **A click** anywhere on it switches the theme: on, it's night; off,
 *   it's day.
 * - **A drag** moves its top half: the head goes where the pointer takes
 *   it, as far as the arms reach, stopping where it would meet the
 *   device or the desk, and stays there (gradient/lampPose.js).
 *   The arrow keys do the same from the keyboard: left and right turn it,
 *   up and down raise and lower the head.
 *
 * The renderer publishes the lamp's outline on screen with the camera that
 * draws it (gradient/lampSpot.js): the button is the box round it, clipped
 * to the lamp's own shape, written straight to the element so scrolling
 * never re-renders it. It's there wherever the lamp is in the frame and big
 * enough to see; elsewhere, and wherever no desk is drawn, it's hidden and
 * out of the tab order. Like the sun's, a click sits out a switch.
 */
export default function LampToggle({ recipe }) {
  const { theme, toggle } = useTheme();
  const night = theme === 'night';
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  const button = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const el = button.current;
    const apply = spot => {
      el.hidden = !spot;
      if (!spot) return;
      el.style.left = `${spot.x}px`;
      el.style.top = `${spot.y}px`;
      el.style.width = `${spot.w}px`;
      el.style.height = `${spot.h}px`;
      el.style.clipPath = `path('${spot.path}')`;
    };
    apply(getLampSpot());
    return subscribeLampSpot(apply);
  }, []);

  useEffect(() => {
    // Only a real switch, not the stored theme read on load (nor Strict
    // Mode's second run).
    if (first.current === theme) return undefined;
    const was = first.current;
    first.current = theme;
    if (was === null) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    setBusy(true);
    const id = setTimeout(() => setBusy(false), recipe.transition?.ms ?? 1250);
    return () => clearTimeout(id);
  }, [theme, recipe]);

  // A point on the page, in the scene's CSS px.
  const local = e => {
    const r = button.current.parentElement.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onPointerDown = e => {
    const spot = getLampSpot();
    if (!spot || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const { P, cm } = spot.cam;
    const head = lampAt(spot.pose).head;
    const [x, y] = local(e);
    const at = screenToWorld(P, cm, head, x, y);
    drag.current = { x0: e.clientX, y0: e.clientY, head, grab: head.map((v, i) => v - at[i]), moved: false, id: e.pointerId };
    button.current.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_PX) return;
    const spot = getLampSpot();
    if (!spot) return;
    d.moved = true;
    button.current.dataset.dragging = '';
    const { P, cm } = spot.cam;
    const [x, y] = local(e);
    const w = screenToWorld(P, cm, d.head, x, y).map((v, i) => v + d.grab[i]);
    // As far as it goes before it meets the device or the desk.
    setLampPose(poseFree(spot.pose, w, spot.device));
  };

  const onPointerUp = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    delete button.current.dataset.dragging;
    if (d.moved) saveLampPose();
    // The click that follows a drag isn't a switch.
    drag.current = d.moved ? { moved: true, at: performance.now() } : null;
  };

  const onClick = () => {
    const d = drag.current;
    drag.current = null;
    if ((d?.moved && performance.now() - d.at < 500) || busy) return;
    toggle();
  };

  const onKeyDown = e => {
    const step = { ArrowLeft: [0.08, 0], ArrowRight: [-0.08, 0], ArrowUp: [0, 0.015], ArrowDown: [0, -0.015] }[e.key];
    if (!step) return;
    e.preventDefault();
    const spot = getLampSpot();
    if (!spot) return;
    const p = spot.pose;
    const at = lampAt({ ...p, yaw: p.yaw + step[0] });
    setLampPose(poseFree(p, [at.head[0], at.head[1] + step[1], at.head[2]], spot.device));
    saveLampPose();
  };

  return (
    <button
      ref={button}
      type="button"
      hidden
      className={styles.toggle}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      aria-disabled={busy || undefined}
      data-busy={busy || undefined}
      data-lamp-toggle=""
      aria-label={night ? 'Lamp — switch off, to day' : 'Lamp — switch on, to night'}
      aria-description="Drag, or use the arrow keys, to move it"
    />
  );
}
