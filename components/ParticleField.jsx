'use client';

import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 140;
const ACCENT = '255, 90, 31';
const TEAL = '61, 107, 107';

export default function ParticleField() {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      r: Math.random() * 1.6 + 0.6,
      hue: Math.random() > 0.82 ? ACCENT : TEAL,
    }));

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = (e.clientX - rect.left) / rect.width;
      pointer.current.y = (e.clientY - rect.top) / rect.height;
    }

    function onScroll() {
      const y = window.scrollY;
      scrollVelocity = y - lastScrollY;
      lastScrollY = y;
    }

    function tick() {
      frame = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, width, height);

      scrollVelocity *= 0.9;
      const px = pointer.current.x;
      const py = pointer.current.y;

      for (const p of particles) {
        // drift
        p.x += p.vx + scrollVelocity * 0.00004;
        p.y += p.vy;

        // wrap
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
        if (p.y < -0.02) p.y = 1.02;
        if (p.y > 1.02) p.y = -0.02;

        // cursor attraction
        if (px >= 0 && px <= 1) {
          const dx = px - p.x;
          const dy = py - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.18) {
            const pull = (0.18 - dist) * 0.012;
            p.x += dx * pull;
            p.y += dy * pull;
          }
        }

        const cx = p.x * width;
        const cy = p.y * height;
        const flicker = 0.35 + Math.sin(frame * 0.02 + cx) * 0.15;

        ctx.beginPath();
        ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue}, ${flicker.toFixed(2)})`;
        ctx.fill();
      }
    }

    resize();
    tick();

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />;
}
