'use client';

import dynamic from 'next/dynamic';
import { useTheme } from './ThemeProvider';
import SunToggle from './SunToggle';
import themes from './gradient/themes';

// Canvas/WebGL engine — browser only, and heavy enough to keep out of the
// initial bundle.
const GradientEngine = dynamic(() => import('./gradient/engine'), {
  ssr: false,
});

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
      className={`atmosphere-field ${className}`}
      style={{ '--atmo-ms': `${ms}ms`, '--atmo-ease': ease }}
    >
      <div className="atmosphere-scene" aria-hidden="true">
        <GradientEngine recipe={recipe} speed={recipe.speed} />
      </div>

      <SunToggle recipe={recipe} />
    </div>
  );
}
