import { skyRamp } from './skyRamp';

/**
 * A recipe's sky as a CSS gradient, from the same smooth ramp every renderer
 * paints (see skyRamp.js). Used for the backdrop behind the renderer and for
 * scenes that can't run one.
 */
export function skyGradient({ stops, divs }) {
  const list = skyRamp(stops, divs).map(([o, c]) => `${c} ${(o * 100).toFixed(2)}%`);
  return `linear-gradient(180deg, ${list.join(', ')})`;
}
