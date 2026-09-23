import duskEmber from './recipes/dusk-ember';
import moonlit from './recipes/moonlit';

/**
 * A theme is a recipe plus its label. Everything visual is decided in the
 * recipe files — the engine holds no look of its own — so adding a scene is
 * just another entry here.
 */
const themes = {
  day: { id: 'day', label: 'Day', next: 'night', recipe: duskEmber },
  night: { id: 'night', label: 'Night', next: 'day', recipe: moonlit },
};

export const DEFAULT_THEME = 'day';

export default themes;
