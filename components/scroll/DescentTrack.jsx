import styles from './DescentTrack.module.css';

/**
 * How tall each stretch's scroll track is, in large-viewport heights (lvh).
 * The first track's progress runs 0 → 1 over (length - 100) of them: at
 * 200, one full screen of scrolling carries `about` from 0 to 1. Tune here.
 */
export const TRACK_LVH = {
  // (0.5.3) The pull-back from the 3D peaks onto the meadow plateau.
  about: 240,
  // A track after the first starts where the one before ends, so it scrolls
  // its whole length: carry `desk` uniformly from the meadow onto the desk
  // and laptop.
  desk: 360,
  // (0.4.0) Round to the house and down onto its pool. (0.4.10) A longer
  // turn, looking down, and the path up to the house.
  contact: 500,
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
