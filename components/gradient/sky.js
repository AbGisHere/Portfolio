import { skyRamp } from './skyRamp';
import themes from './themes';

/**
 * A recipe's sky as a CSS gradient, from the same smooth ramp every renderer
 * paints (see skyRamp.js). Used for the backdrop behind the renderer and for
 * scenes that can't run one.
 */
export function skyGradient({ stops, divs }) {
  const list = skyRamp(stops, divs).map(([o, c]) => `${c} ${(o * 100).toFixed(2)}%`);
  return `linear-gradient(180deg, ${list.join(', ')})`;
}

/**
 * Both scenes' skies as CSS variables (`--sky-day`, `--sky-night`): the
 * atmosphere's backdrop and the error pages' static sky, so the right one is
 * up before hydration (see the theme script in app/layout.jsx).
 */
export const SKY_VARS = {
  '--sky-day': skyGradient(themes.day.recipe),
  '--sky-night': skyGradient(themes.night.recipe),
};
