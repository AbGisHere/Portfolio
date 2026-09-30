import duskEmber from './recipes/dusk-ember';
import moonlit from './recipes/moonlit';

/**
 * A theme is a recipe plus the theme the sun toggle switches to. Everything
 * visual is decided in the recipe files — the renderers hold no look of their
 * own — so adding a scene is just another entry here.
 */
const themes = {
  day: { next: 'night', recipe: duskEmber },
  night: { next: 'day', recipe: moonlit },
};

export const DEFAULT_THEME = 'day';

export default themes;
