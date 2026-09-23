'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';

const STRENGTH = 0.35;
const TILT_MAX = 8;

export default function MagneticCard({ children, className = '' }) {
  const ref = useRef(null);
  const glowRef = useRef(null);

  function onMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const px = relX / rect.width - 0.5;
    const py = relY / rect.height - 0.5;

    gsap.to(el, {
      x: px * rect.width * STRENGTH * 0.12,
      y: py * rect.height * STRENGTH * 0.12,
      rotateX: -py * TILT_MAX,
      rotateY: px * TILT_MAX,
      duration: 0.5,
      ease: 'power3.out',
      transformPerspective: 700,
    });

    if (glowRef.current) {
      glowRef.current.style.setProperty('--gx', `${relX}px`);
      glowRef.current.style.setProperty('--gy', `${relY}px`);
      glowRef.current.style.opacity = '1';
    }
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, {
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: 'elastic.out(1, 0.5)',
    });
    if (glowRef.current) glowRef.current.style.opacity = '0';
  }

  return (
    <div
      ref={ref}
      className={`magnetic-card ${className}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div ref={glowRef} className="magnetic-card-glow" aria-hidden="true" />
      <div className="magnetic-card-body">{children}</div>
    </div>
  );
}
