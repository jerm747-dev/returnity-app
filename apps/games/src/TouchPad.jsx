import { useEffect, useRef } from 'react';
import { FACE } from './controls.js';

// On-screen buttons over a game: an 8-way pad (slide your thumb around it) and up to four face
// buttons. Each one presses the key the game expects, through send(type, key).
export default function TouchPad({ touch, keys, send }) {
  const held = useRef(new Map()); // pointerId -> Set of control names
  const down = useRef(new Map()); // control name -> count of pointers holding it

  const press = (name) => {
    const n = (down.current.get(name) || 0) + 1;
    down.current.set(name, n);
    if (n === 1 && keys[name]) { send('keydown', keys[name]); try { navigator.vibrate?.(8); } catch { /* no vibration */ } }
  };
  const release = (name) => {
    const n = (down.current.get(name) || 0) - 1;
    if (n <= 0) { down.current.delete(name); if (keys[name]) send('keyup', keys[name]); } else down.current.set(name, n);
  };
  const setHeld = (id, names) => {
    const before = held.current.get(id) || new Set();
    for (const n of before) if (!names.has(n)) release(n);
    for (const n of names) if (!before.has(n)) press(n);
    if (names.size) held.current.set(id, names); else held.current.delete(id);
  };

  // Let go of everything if the overlay goes away mid-press
  useEffect(() => () => { for (const id of [...held.current.keys()]) setHeld(id, new Set()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dirsAt = (el, e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const s = new Set();
    if (Math.hypot(x, y) < 0.12) return s; // dead center
    const a = Math.atan2(y, x) * 180 / Math.PI; // 0 = right, 90 = down
    if (a > -67.5 && a < 67.5) s.add('right');
    if (a > 22.5 && a < 157.5) s.add('down');
    if (a > 112.5 || a < -112.5) s.add('left');
    if (a > -157.5 && a < -22.5) s.add('up');
    return s;
  };

  const pad = {
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setHeld(e.pointerId, dirsAt(e.currentTarget, e)); },
    onPointerMove: (e) => { if (held.current.has(e.pointerId) || e.buttons) setHeld(e.pointerId, dirsAt(e.currentTarget, e)); },
    onPointerUp: (e) => setHeld(e.pointerId, new Set()),
    onPointerCancel: (e) => setHeld(e.pointerId, new Set()),
  };
  const btn = (name) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setHeld(e.pointerId, new Set([name])); },
    onPointerUp: (e) => setHeld(e.pointerId, new Set()),
    onPointerCancel: (e) => setHeld(e.pointerId, new Set()),
  });

  const faces = FACE.filter((b) => keys[b]);
  return (
    <div className={`tp tp-${touch.size} ${touch.swap ? 'tp-swap' : ''}`} style={{ opacity: touch.opacity }} onContextMenu={(e) => e.preventDefault()}>
      <div className="tp-dpad" {...pad} role="group" aria-label="Direction pad">
        <span className="tp-arrow tp-up" /><span className="tp-arrow tp-right" /><span className="tp-arrow tp-down" /><span className="tp-arrow tp-left" />
      </div>
      {faces.length > 0 && (
        <div className={`tp-face tp-face-${faces.length}`} role="group" aria-label="Action buttons">
          {faces.map((b) => <button key={b} type="button" className={`tp-btn face-${b}`} aria-label={`${b} button`} {...btn(b)}>{b}</button>)}
        </div>
      )}
    </div>
  );
}
