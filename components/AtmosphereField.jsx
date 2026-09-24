'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import SunToggle from './SunToggle';
import themes from './gradient/themes';
import { skyGradient } from './gradient/sky';
import styles from './AtmosphereField.module.css';

// Two renderers for the same recipe, both browser-only and kept out of the
// initial bundle: WebGL (default) and the layered DOM fallback.
const MistCanvas = dynamic(() => import('./gradient/gl/MistCanvas'), { ssr: false });
const LayeredScene = dynamic(() => import('./gradient/layers/LayeredScene'), { ssr: false });

const RENDERERS = ['gl', 'layers'];
// After a lost WebGL context, how long to wait before trying WebGL again, and
// how many times.
const RETRY_MS = 2000;
const RETRIES = 3;

const hasWebGL2 = () => {
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    probe?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!probe;
  } catch {
    return false;
  }
};

// `?renderer=gl|layers` forces one (parity checks, debugging); otherwise
// WebGL2 when the browser has it, else the layered fallback.
function pickRenderer() {
  const forced = new URLSearchParams(window.location.search).get('renderer');
  if (RENDERERS.includes(forced)) return forced;
  return hasWebGL2() ? 'gl' : 'layers';
}

// Painted behind the renderer: what shows before its chunk arrives, and in any
// frame it drops, instead of the page's near-black. Both skies are handed to
// CSS so the right one is up before hydration (see the theme script in
// app/layout.jsx).
const BACKDROP = {
  '--sky-day': skyGradient(themes.day.recipe),
  '--sky-night': skyGradient(themes.night.recipe),
};

/**
 * One scene, one clock. Switching theme hands the renderer a new recipe and
 * the sky turns to it (components/gradient/orbit.js): the sun and moon cross
 * on one arc while the palette passes through the in-between skies and the
 * ridges reshape, all on the same ease; at rest the spring holds the scene.
 *
 * The sky used to be two stacked CSS gradients crossfading on opacity, which
 * looked symmetric but wasn't — compositing a dark layer over a light one
 * kills brightness far faster than the reverse, so night arrived early and day
 * arrived in a late rush. Interpolating the stops instead is symmetric by
 * construction, and it's the same animation the ridges are already on.
 */
export default function AtmosphereField({ className = '' }) {
  const { theme } = useTheme();
  const { recipe } = themes[theme];
  // Decided after mount (it needs the browser); the CSS backdrop covers the gap.
  const [renderer, setRenderer] = useState(null);
  useEffect(() => setRenderer(pickRenderer()), []);
  // WebGL failed. If the context was lost (a GPU reset, a backgrounded tab),
  // the layered fallback covers while WebGL gets a few more tries; if it
  // never built, the fallback stays.
  const retries = useRef(0);
  const retry = useRef(0);
  const fallBack = useCallback(err => {
    setRenderer('layers');
    if (!err?.lost || retries.current >= RETRIES) return;
    retries.current += 1;
    clearTimeout(retry.current);
    retry.current = setTimeout(() => hasWebGL2() && setRenderer('gl'), RETRY_MS);
  }, []);
  useEffect(() => () => clearTimeout(retry.current), []);

  return (
    <div
      className={`${styles.field} ${className}`}
      style={BACKDROP}
    >
      <div className={styles.scene} aria-hidden="true" data-renderer={renderer ?? undefined}>
        {renderer === 'gl' && <MistCanvas recipe={recipe} onFail={fallBack} />}
        {renderer === 'layers' && <LayeredScene recipe={recipe} />}
      </div>

      <SunToggle recipe={recipe} />
    </div>
  );
}
