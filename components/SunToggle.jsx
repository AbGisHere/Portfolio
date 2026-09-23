'use client';

import { useTheme } from './ThemeProvider';

/**
 * Hit target over the sun the MIST recipe paints into the scene.
 *
 * The engine places it at:
 *   x = mist.sun%  of width
 *   y = max(0.10, clamp(glintHorizon, 0.14, 0.62) - 0.11)  of height
 *   r = 0.052  of height
 * so the same numbers position this button. Clicking swaps day/night, which
 * also moves the sun — Dusk ember puts it at 28%, Moonlit at 76%.
 */
export default function SunToggle({ recipe }) {
  const { theme, toggle } = useTheme();
  const night = theme === 'night';

  const horizon = Math.max(0.14, Math.min(0.62, recipe.glintHorizon ?? 0.42));

  const style = {
    left: `${recipe.mist?.sun ?? 50}%`,
    top: `${Math.max(0.1, horizon - 0.11) * 100}%`,
    height: '10.4%',
  };

  return (
    <button
      type="button"
      className="sun-toggle"
      style={style}
      onClick={toggle}
      aria-pressed={night}
      aria-label={night ? 'Moon — switch to day' : 'Sun — switch to night'}
      title={night ? 'Switch to day' : 'Switch to night'}
    />
  );
}
