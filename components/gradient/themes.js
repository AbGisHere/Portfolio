import duskEmber from './recipes/dusk-ember';
import moonlit from './recipes/moonlit';

/**
 * A theme is a recipe plus its label. Everything visual is decided in the
 * recipe files — the renderers hold no look of their own — so adding a scene is
 * just another entry here.
 */
const themes = {
  day: { id: 'day', label: 'Day', next: 'night', recipe: duskEmber },
  night: { id: 'night', label: 'Night', next: 'day', recipe: moonlit },
};

export const DEFAULT_THEME = 'day';

export default themes;
