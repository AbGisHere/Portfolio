'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { getFreeCam, setFreeCam } from './gradient/freeCam';
import { pinDescent } from './scroll/descent';
import styles from './HouseExplorer.module.css';

/**
 * (0.4.2) The dev-only /house route: fly a free camera round the house and
 * through it (gradient/freeCam.js). Click the frame to look with the mouse
 * (Esc lets go); WASD to move, Space and C up and down, Shift faster, the
 * wheel to zoom. The places below jump straight there.
 */
const PLACES = {
  Approach: { x: 0, y: 5.3, z: -44, yaw: Math.PI, pitch: 0.06 },
  Porch: { x: 1.5, y: 5.3, z: -57.2, yaw: Math.PI - 0.15, pitch: 0.05 },
  Foyer: { x: 6.2, y: 5.3, z: -63.8, yaw: Math.PI - 0.3, pitch: 0.1 },
  Living: { x: -1.2, y: 5.2, z: -64.2, yaw: Math.PI + 0.55, pitch: 0.12 },
  Dining: { x: 4.2, y: 5.3, z: -64.4, yaw: Math.PI - 0.5, pitch: 0.2 },
  Kitchen: { x: 1.8, y: 5.3, z: -72.0, yaw: Math.PI - 0.45, pitch: 0.18 },
  Study: { x: 0.9, y: 5.3, z: -73.8, yaw: Math.PI + 0.5, pitch: 0.15 },
  Landing: { x: -5.0, y: 8.9, z: -72.0, yaw: Math.PI + 0.45, pitch: 0.2 },
  Bedroom: { x: 1.9, y: 8.9, z: -71.8, yaw: Math.PI + 0.45, pitch: 0.2 },
  Wardrobe: { x: -0.6, y: 8.9, z: -76.1, yaw: Math.PI, pitch: 0.15 },
  'En-suite': { x: 3.3, y: 8.9, z: -71.7, yaw: Math.PI - 0.6, pitch: 0.2 },
  Guest: { x: 3.2, y: 8.9, z: -76.8, yaw: Math.PI / 2 + 0.3, pitch: 0.15 },
  Terrace: { x: 6.5, y: 8.8, z: -59.2, yaw: Math.PI + 0.55, pitch: 0.25 },
  'Pool, above': { x: 0, y: 14, z: -60.7, yaw: Math.PI, pitch: 1.5 },
  // (0.4.28) For the lighting's comparison.
  'From the meadow': { x: 0, y: 6, z: -38, yaw: Math.PI, pitch: 0.03 },
  Cascade: { x: -4.9, y: 8.9, z: -74.4, yaw: Math.PI * 1.5, pitch: 0.05 },
  Passage: { x: 1.6, y: 8.9, z: -78.1, yaw: Math.PI * 1.5, pitch: 0.05 },
  Stair: { x: -4.6, y: 5.3, z: -71.2, yaw: Math.PI + 0.75, pitch: -0.15 },
};

// (0.4.28) The camera as a query (?cam=x,y,z,yaw,pitch,zoom), to open on
// a view.
const camFromQuery = () => {
  const q = new URLSearchParams(window.location.search).get('cam');
  const n = q?.split(',').map(Number);
  if (!n || n.length !== 6 || n.some(x => !Number.isFinite(x))) return null;
  const [x, y, z, yaw, pitch, zoom] = n;
  return { x, y, z, yaw, pitch, zoom };
};
const SPEED = 2.4;

export default function HouseExplorer() {
  const surface = useRef(null);
  const [where, setWhere] = useState('');
  const { theme, toggle } = useTheme();
  const [styling, setStyling] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('styling') || '0.4.31';
    }
    return '0.4.31';
  });

  const toggleStyling = () => {
    const next = styling === '0.4.31' ? '0.4.28' : '0.4.31';
    setStyling(next);
    if (typeof window !== 'undefined' && window.__setHouseStyling) {
      window.__setHouseStyling(next);
      const url = new URL(window.location.href);
      url.searchParams.set('styling', next);
      window.history.replaceState(null, '', url.toString());
    } else if (typeof window !== 'undefined') {
      const c = getFreeCam();
      const camStr = c ? `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)},${c.yaw.toFixed(3)},${c.pitch.toFixed(3)},${c.zoom.toFixed(2)}` : '';
      window.location.search = `?cam=${camStr}&styling=${next}`;
    }
  };

  useEffect(() => {
    pinDescent({ about: 1, desk: 1, contact: 0.64 });
    // (For the harness: set the camera from the console or a script.)
    window.__houseCam = setFreeCam;
    setFreeCam({ on: true, ...PLACES.Approach, zoom: 1, ...camFromQuery() });
    const keys = new Set();
    const down = e => {
      if (e.target instanceof HTMLButtonElement) return;
      keys.add(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC'].includes(e.code)) e.preventDefault();
    };
    const up = e => keys.delete(e.code);
    const look = e => {
      if (document.pointerLockElement !== surface.current) return;
      const c = getFreeCam();
      if (!c) return;
      const k = 0.0022 / c.zoom;
      setFreeCam({ yaw: c.yaw + e.movementX * k, pitch: c.pitch + e.movementY * k });
    };
    const wheel = e => {
      const c = getFreeCam();
      if (c) setFreeCam({ zoom: c.zoom * Math.exp(-e.deltaY * 0.0012) });
    };
    let raf = 0;
    let last = performance.now();
    let shown = 0;
    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = getFreeCam();
      if (c) {
        const fwd = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
        const side = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
        const lift = (keys.has('Space') ? 1 : 0) - (keys.has('KeyC') ? 1 : 0);
        if (fwd || side || lift) {
          const v = SPEED * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 1);
          const [s, co] = [Math.sin(c.yaw), Math.cos(c.yaw)];
          setFreeCam({ x: c.x + (s * fwd + co * side) * v, z: c.z + (co * fwd - s * side) * v, y: Math.max(0.3, c.y + lift * v) });
        }
        if (now - shown > 120) {
          shown = now;
          const deg = r => Math.round((r * 180) / Math.PI);
          setWhere(`x ${c.x.toFixed(1)}  y ${c.y.toFixed(1)}  z ${c.z.toFixed(1)}  ·  yaw ${deg(c.yaw)}°  pitch ${deg(c.pitch)}°  ·  zoom ${c.zoom.toFixed(2)}`);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', look);
    window.addEventListener('wheel', wheel, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', look);
      window.removeEventListener('wheel', wheel);
      setFreeCam({ on: false });
      pinDescent(null);
    };
  }, []);

  return (
    <>
      <div ref={surface} className={styles.surface} onClick={() => surface.current?.requestPointerLock()} aria-hidden="true" />
      <div className={styles.hud}>
        <h1>House (dev)</h1>
        <p>Click to look (Esc lets go) · WASD move · Space / C up, down · Shift faster · wheel zooms</p>
        <div className={styles.where}>{where}</div>
        <div className={styles.row}>
          {Object.entries(PLACES).map(([name, p]) => (
            <button key={name} type="button" onClick={() => setFreeCam({ ...p, zoom: 1 })}>
              {name}
            </button>
          ))}
          <button type="button" onClick={toggle}>{theme === 'night' ? 'Day' : 'Night'}</button>
          <button type="button" onClick={toggleStyling} style={{ borderColor: 'rgb(255 180 80 / 60%)', color: '#ffb450' }}>
            Compare: {styling === '0.4.31' ? '0.4.31 (Lived-in)' : '0.4.28 (Classic)'}
          </button>
        </div>
      </div>
    </>
  );
}
