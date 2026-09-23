'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Fades/slides its children in as a group once the wrapper enters the
 * viewport. Use for card grids, link lists, CTA blocks — anything that
 * isn't a SplitText headline.
 */
export default function Reveal({ as: Tag = 'div', children, className = '', stagger = 0.08 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.children.length ? Array.from(el.children) : [el];

    const anim = gsap.fromTo(
      targets,
      { y: 32, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, [stagger]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
