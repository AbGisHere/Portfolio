'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import SunToggle from './SunToggle';
import themes from './gradient/themes';
import { skyGradient } from './gradient/sky';
import styles from './AtmosphereField.module.css';

// Two renderers for the same recipe, both browser-only and kept out of the
// initial bundle: the WebGL one (default) and the generated SVG engine it was
// ported from, loaded only as the fallback.
const MistCanvas = dynamic(() => import('./gradient/gl/MistCanvas'), { ssr: false });
const GradientEngine = dynamic(() => import('./gradient/engine'), { ssr: false });

// `?renderer=gl|svg` forces one (parity checks, debugging); otherwise WebGL2
// when the browser has it.
function pickRenderer() {
  const forced = new URLSearchParams(window.location.search).get('renderer');
  if (forced === 'gl' || forced === 'svg') return forced;
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    probe?.getExtension('WEBGL_lose_context')?.loseContext();
    return probe ? 'gl' : 'svg';
  } catch {
    return 'svg';
  }
}

// Painted behind the engine: what shows before its chunk arrives, and in any
// frame it drops, instead of the page's near-black. Both skies are handed to
// CSS so the right one is up before hydration (see the theme script in
// app/layout.jsx).
const BACKDROP = {
  '--sky-day': skyGradient(themes.day.recipe),
  '--sky-night': skyGradient(themes.night.recipe),
};

/**
 * One scene, one sun, one clock. Switching theme hands the engine a new recipe
 * and its spring walks every value across at once: sun position and colour,
 * ridge height, sharpness and silhouette, haze, and the sky's colour stops.
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
  const { ms, ease } = recipe.transition;
  // Decided after mount (it needs the browser); the CSS backdrop covers the gap.
  const [renderer, setRenderer] = useState(null);
  useEffect(() => setRenderer(pickRenderer()), []);
  const fallBack = useCallback(() => setRenderer('svg'), []);

  return (
    <div
      className={`${styles.field} ${className}`}
      style={{ ...BACKDROP, '--atmo-ms': `${ms}ms`, '--atmo-ease': ease }}
    >
      <div className={styles.scene} aria-hidden="true" data-renderer={renderer ?? undefined}>
        {renderer === 'gl' && <MistCanvas recipe={recipe} onFail={fallBack} />}
        {renderer === 'svg' && <GradientEngine recipe={recipe} speed={recipe.speed} />}
      </div>

      <SunToggle recipe={recipe} />
    </div>
  );
}
