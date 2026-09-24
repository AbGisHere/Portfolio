'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { getDescent, subscribeDescent } from './scroll/descent';
import styles from './SunToggle.module.css';

/**
 * Hit target over the sun the MIST recipe paints into the scene.
 *
 * The renderers place it at:
 *   x = mist.sun%  of width, kept 1.5r clear of either edge
 *   y = max(0.10, clamp(glintHorizon, 0.14, 0.62) - 0.11)  of height
 *   r = 0.052  of height
 * so the same numbers position this button (the edge clamp lives in
 * SunToggle.module.css, in container units). Clicking swaps day/night, which
 * also moves the sun — Dusk ember puts it at 28%, Moonlit at 76%.
 *
 * The button doesn't follow the sun's arc: it jumps straight to where the sun
 * will land and ignores clicks until the switch has finished
 * (`transition.ms`).
 *
 * Once the descent starts, the painted sun moves with the camera and this
 * target doesn't follow it: it fades over `about` 0.05 → 0.1 (which mostly
 * matters for the focus ring) and past 0.1 is inert, so it can't be clicked
 * or focused. Written straight to the element from the descent store, not
 * through React state, so scrolling never re-renders it.
 */
const FADE_FROM = 0.05;
const FADE_TO = 0.1;
export default function SunToggle({ recipe }) {
  const { theme, toggle } = useTheme();
  const night = theme === 'night';
  const [busy, setBusy] = useState(false);
  const first = useRef(true);
  const button = useRef(null);

  useEffect(() => {
    const el = button.current;
    let off = null;
    const apply = ({ about = 0 }) => {
      const fade = Math.min(1, Math.max(0, (about - FADE_FROM) / (FADE_TO - FADE_FROM)));
      el.style.setProperty('--descent-fade', String(1 - fade));
      const gone = about > FADE_TO;
      if (gone === off) return;
      off = gone;
      el.inert = gone;
      if (gone) {
        el.tabIndex = -1;
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-hidden');
      }
    };
    apply(getDescent());
    return subscribeDescent(apply);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    setBusy(true);
    const id = setTimeout(() => setBusy(false), recipe.transition?.ms ?? 1250);
    return () => clearTimeout(id);
  }, [theme, recipe]);

  const horizon = Math.max(0.14, Math.min(0.62, recipe.glintHorizon ?? 0.42));

  const style = {
    '--sun-x': `${recipe.mist?.sun ?? 50}%`,
    top: `${Math.max(0.1, horizon - 0.11) * 100}%`,
  };

  return (
    <button
      ref={button}
      type="button"
      className={styles.toggle}
      style={style}
      onClick={busy ? undefined : toggle}
      aria-disabled={busy || undefined}
      data-busy={busy || undefined}
      aria-pressed={night}
      aria-label={night ? 'Moon — switch to day' : 'Sun — switch to night'}
      title={night ? 'Switch to day' : 'Switch to night'}
    />
  );
}
