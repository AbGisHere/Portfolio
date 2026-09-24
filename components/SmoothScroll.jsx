'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isPinned, setDescent } from './scroll/descent';
import styles from './SmoothScroll.module.css';

/**
 * The site's scroll layer. Mounted once in the root layout, it renders
 * nothing visible and does two jobs:
 *
 * - Publishes the descent's progress. `about` is how far the page has
 *   scrolled through the `[data-descent="about"]` track (DescentTrack), 0 → 1
 *   across its scrollable span, written to the descent store. It's a pure
 *   function of scroll position: no easing beyond Lenis's own smoothing, so
 *   scrolling back retraces exactly. A page without a track publishes 0.
 *   `?scroll=` pins the store and nothing is published.
 * - Smooths wheel scrolling with Lenis, loaded after first paint (idle) so it
 *   stays out of first-load JS. Until then, under reduced motion, and on
 *   touch-first devices (no Lenis at all), a passive native scroll listener
 *   publishes instead. Keyboard scrolling stays native: Lenis doesn't touch
 *   keys, and nothing snaps.
 *
 * Why not Lenis on phones: it only smooths the wheel (syncTouch stays off),
 * so on touch it adds nothing, but it still puts non-passive touchstart/
 * touchmove/wheel listeners on the window. Those make every touch scroll wait
 * on the main thread, which redraws the scene each scroll frame, and the
 * phone's collapsing toolbar juddered in and out while scrolling.
 *
 * The span is the track's height less the *large* viewport height (the probe
 * below, 100lvh), not innerHeight, so a mobile URL bar collapsing or
 * expanding doesn't change the denominator and progress doesn't jump.
 */
export default function SmoothScroll() {
  const pathname = usePathname();
  const probe = useRef(null);
  const remeasure = useRef(null);

  useEffect(() => {
    const pinned = isPinned();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Touch-first (phones, tablets): native scrolling only. A laptop with a
    // touchscreen still reports a fine pointer and keeps Lenis for its wheel.
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)');
    const native = () => reduce.matches || touch.matches;
    let track = null;
    let start = 0;
    let span = 1;
    let lenis = null;
    let loading = false;
    let dead = false;
    let idleId = null;

    const publish = (y = window.scrollY) => {
      if (pinned) return;
      setDescent({ about: track ? (y - start) / span : 0 });
    };

    const measure = () => {
      track = document.querySelector('[data-descent="about"]');
      if (track) {
        const y = lenis ? lenis.animatedScroll : window.scrollY;
        start = track.getBoundingClientRect().top + window.scrollY;
        span = Math.max(1, track.offsetHeight - (probe.current?.offsetHeight || window.innerHeight));
        publish(y);
      } else {
        publish();
      }
    };
    remeasure.current = measure;

    const onNative = () => publish();
    const onLenis = (l) => publish(l.animatedScroll);

    const startLenis = () => {
      if (dead || lenis || loading || native()) return;
      loading = true;
      import('lenis').then(({ default: Lenis }) => {
        loading = false;
        if (dead || lenis || native()) return;
        lenis = new Lenis({ autoRaf: true, smoothWheel: true, anchors: false });
        lenis.on('scroll', onLenis);
        window.removeEventListener('scroll', onNative);
        measure();
      }, () => {
        // Chunk failed: stay on native scroll.
        loading = false;
      });
    };

    const stopLenis = () => {
      if (!lenis) return;
      lenis.destroy();
      lenis = null;
      window.addEventListener('scroll', onNative, { passive: true });
      measure();
    };

    const onMotionPref = () => (native() ? stopLenis() : startLenis());

    window.addEventListener('scroll', onNative, { passive: true });
    window.addEventListener('resize', measure);
    reduce.addEventListener('change', onMotionPref);
    touch.addEventListener('change', onMotionPref);
    // Catches the track mounting or unmounting, and content changing height.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    measure();

    if (!native()) {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(startLenis, { timeout: 1500 });
      } else {
        idleId = window.setTimeout(startLenis, 200);
      }
    }

    return () => {
      dead = true;
      remeasure.current = null;
      if (idleId != null) {
        if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
      window.removeEventListener('scroll', onNative);
      window.removeEventListener('resize', measure);
      reduce.removeEventListener('change', onMotionPref);
      touch.removeEventListener('change', onMotionPref);
      ro.disconnect();
      lenis?.destroy();
    };
  }, []);

  // A route change swaps the page (and its track, or lack of one).
  useEffect(() => {
    remeasure.current?.();
  }, [pathname]);

  return <div ref={probe} className={styles.probe} aria-hidden="true" />;
}
