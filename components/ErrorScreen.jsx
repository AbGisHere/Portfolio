import AtmosphereField from './AtmosphereField';
import Stage from './Stage';
import themes from './gradient/themes';
import { skyGradient } from './gradient/sky';
import styles from './ErrorScreen.module.css';

// The scrim takes its tint from each scene's deepest stop, so it belongs to
// the palette rather than sitting on it.
const TINTS = {
  '--deep-day': themes.day.recipe.stops.at(-1),
  '--deep-night': themes.night.recipe.stops.at(-1),
};

const STATIC_SKY = {
  '--sky-day': skyGradient(themes.day.recipe),
  '--sky-night': skyGradient(themes.night.recipe),
};

/**
 * Shared by the 404, the route error boundary and the last-resort global
 * error, so the three can't drift apart. `live` runs the real atmosphere;
 * global-error passes `live={false}` and gets the recipes' skies as plain CSS,
 * since whatever broke may be the renderer itself.
 *
 * These are derived surfaces: see "Derived surfaces follow the site" in
 * CLAUDE.md.
 */
export default function ErrorScreen({ title, message, children, live = true }) {
  return (
    <Stage>
      {live ? (
        <AtmosphereField />
      ) : (
        <div className={styles.staticSky} style={STATIC_SKY} aria-hidden="true" />
      )}
      <div className={styles.copy} style={TINTS}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>{children}</div>
      </div>
    </Stage>
  );
}

export const actionClass = styles.action;
