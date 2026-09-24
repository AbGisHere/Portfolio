import styles from './DescentTrack.module.css';

/**
 * How tall each stretch's scroll track is, in large-viewport heights (lvh).
 * Progress runs 0 → 1 over (length - 100) of them: at 200, one full screen
 * of scrolling carries `about` from 0 to 1. Tune here.
 */
export const TRACK_LVH = {
  about: 200,
};

/**
 * An empty block that gives a page scroll length for one stretch of the
 * descent. The scroll layer (components/SmoothScroll.jsx) finds it by
 * `data-descent` and publishes progress through it. Content for the stretch
 * can go inside later.
 */
export default function DescentTrack({ name, children }) {
  const lvh = TRACK_LVH[name] ?? 100;
  return (
    <div
      data-descent={name}
      className={styles.track}
      style={{ '--track-lvh': lvh }}
    >
      {children}
    </div>
  );
}
