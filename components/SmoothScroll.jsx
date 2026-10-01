'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isPinned, setDescent } from './scroll/descent';
import { DESK_STOPS, STOP_REACH } from './scroll/stops';
import styles from './SmoothScroll.module.css';

/**
 * The site's scroll layer. Mounted once in the root layout, it renders
 * nothing visible and does two jobs:
 *
 * - Publishes the descent's progress. Each `[data-descent]` track
 *   (DescentTrack) publishes its name's progress, 0 → 1, to the descent
 *   store: the first (`about`) across its scrollable span, each later one
 *   (`desk`) from where the one before ends across its whole height. It's a
 *   pure function of scroll position: no easing beyond Lenis's own
 *   smoothing, so scrolling back retraces exactly. A page without tracks
 *   publishes 0. `?scroll=` and `?desk=` pin the store and nothing is
 *   published.
 * - Rests the scroll on the descent's stops (./scroll/stops.js): when
 *   scrolling comes to rest within STOP_REACH of one, it glides onto it
 *   (Lenis, or a smooth native scroll). A fast scroll passes straight
 *   through; reduced motion never snaps (the camera's holds still pause).
 * - Smooths wheel scrolling with Lenis, loaded after first paint (idle) so it
 *   stays out of first-load JS. Until then, under reduced motion, and on
 *   touch-first devices (no Lenis at all), a passive native scroll listener
 *   publishes instead. Keyboard scrolling stays native: Lenis doesn't touch
 *   keys, and only the stops above snap.
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
    // Each track: { name, start, span }, in page order.
    let tracks = [];
    let lenis = null;
    let loading = false;
    let dead = false;
    let idleId = null;

    const publish = (y = window.scrollY) => {
      if (pinned) return;
      const next = { about: 0, desk: 0 };
      for (const t of tracks) next[t.name] = (y - t.start) / t.span;
      setDescent(next);
    };

    const measure = () => {
      const vh = probe.current?.offsetHeight || window.innerHeight;
      tracks = [...document.querySelectorAll('[data-descent]')].map((el, i) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        // The first track starts at its top; a later one where the one
        // before it ended (its top a viewport below the fold).
        return i === 0
          ? { name: el.dataset.descent, start: top, span: Math.max(1, el.offsetHeight - vh) }
          : { name: el.dataset.descent, start: top - vh, span: Math.max(1, el.offsetHeight) };
      });
      publish(lenis ? lenis.animatedScroll : window.scrollY);
    };
    remeasure.current = measure;

    // The stops: once scrolling has rested a moment (and no finger is
    // down), glide onto the nearest one in reach.
    let snapId = 0;
    let touching = false;
    const settle = () => {
      if (pinned || reduce.matches || touching) return;
      if (lenis?.isScrolling) return void schedule();
      const y = lenis ? lenis.animatedScroll : window.scrollY;
      const vh = probe.current?.offsetHeight || window.innerHeight;
      const desk = tracks.find(t => t.name === 'desk');
      if (!desk) return;
      let best = null;
      for (const at of DESK_STOPS) {
        const s = desk.start + at * desk.span;
        const d = Math.abs(s - y);
        if (d > 1 && d < STOP_REACH * vh && (best == null || d < Math.abs(best - y))) best = s;
      }
      if (best == null) return;
      if (lenis) lenis.scrollTo(best, { duration: 0.9 });
      else window.scrollTo({ top: best, behavior: 'smooth' });
    };
    const schedule = () => {
      window.clearTimeout(snapId);
      snapId = window.setTimeout(settle, 160);
    };
    const onTouch = (e) => {
      touching = e.type === 'touchstart';
      if (!touching) schedule();
    };

    const onNative = () => {
      publish();
      schedule();
    };
    const onLenis = (l) => {
      publish(l.animatedScroll);
      schedule();
    };

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
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchend', onTouch, { passive: true });
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
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchend', onTouch);
      window.clearTimeout(snapId);
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
