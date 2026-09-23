'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Splits text into per-word spans and reveals them with a stagger.
 * `trigger="load"` fires immediately (hero); `trigger="scroll"` fires
 * when the element enters the viewport.
 */
export default function SplitText({
  as: Tag = 'span',
  children,
  className = '',
  trigger = 'scroll',
  delay = 0,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.querySelectorAll('.split-word');

    const anim = gsap.fromTo(
      words,
      { yPercent: 120, opacity: 0, rotate: 4 },
      {
        yPercent: 0,
        opacity: 1,
        rotate: 0,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.045,
        delay,
        scrollTrigger:
          trigger === 'scroll'
            ? {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none none',
              }
            : undefined,
      }
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, [trigger, delay]);

  const text = typeof children === 'string' ? children : '';
  const words = text.split(' ');

  return (
    <Tag ref={ref} className={className}>
      {words.map((word, i) => (
        <span className="split-line" key={i} style={{ overflow: 'hidden', display: 'inline-block' }}>
          <span className="split-word">{word}</span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
