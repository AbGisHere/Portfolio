'use client';

import dynamic from 'next/dynamic';
import { useTheme } from './ThemeProvider';
import SunToggle from './SunToggle';
import themes from './gradient/themes';
import { skyGradient } from './gradient/sky';
import styles from './AtmosphereField.module.css';

// Canvas/WebGL engine — browser only, and heavy enough to keep out of the
// initial bundle.
const GradientEngine = dynamic(() => import('./gradient/engine'), {
  ssr: false,
});

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

  return (
    <div
      className={`${styles.field} ${className}`}
      style={{ ...BACKDROP, '--atmo-ms': `${ms}ms`, '--atmo-ease': ease }}
    >
      <div className={styles.scene} aria-hidden="true">
        <GradientEngine recipe={recipe} speed={recipe.speed} />
      </div>

      <SunToggle recipe={recipe} />
    </div>
  );
}
