import { useEffect, useRef, useState } from 'react';
import {
  actionsFor, useControls, saveControls, resetControls, keyName, isDir, FACE, PAD_INDEX,
  useDisplay, saveDisplay,
} from './controls.js';

const TABS = [['keyboard', 'Keyboard'], ['controller', 'Controller'], ['touch', 'Touch'], ['display', 'Display']];
const firstPad = () => { try { return Array.from(navigator.getGamepads?.() || []).find(Boolean) || null; } catch { return null; } };
const pressedButtons = (pad) => Object.entries(PAD_INDEX).filter(([, i]) => pad?.buttons[i]?.pressed || pad?.buttons[i]?.value > 0.5).map(([b]) => b);

/** Set up a game's controls before it starts. Opens from the shelf (Controls, or X on a controller). */
export default function ControlsPanel({ project, onClose, onPlay, inGame = false }) {
  const dlg = useRef(null);
  const c = useControls(project);
  const display = useDisplay();
  const [tab, setTab] = useState('keyboard');
  const [listen, setListen] = useState(null); // { kind: 'key' | 'pad', id }
  const [live, setLive] = useState([]);
  const [padName, setPadName] = useState('');
  const acts = actionsFor(project);
  const listenRef = useRef(listen);
  listenRef.current = listen;

  useEffect(() => {
    const d = dlg.current;
    d?.showModal();
    document.body.dataset.viewer = '1'; // the shelf ignores input while this is open
    return () => { document.body.dataset.viewer = ''; if (d?.open) d.close(); };
  }, []);

  const update = (fn) => { const next = structuredClone(c); fn(next); saveControls(project, next); };

  // Give an action a key or button; whatever had it before swaps to the old one.
  function assign(kind, id, value) {
    update((n) => {
      const field = kind === 'key' ? 'keys' : 'pad';
      const current = (a) => n[field][a.id] ?? (kind === 'key' ? a.key : a.pad);
      const mine = acts.find((a) => a.id === id);
      const other = acts.find((a) => a.id !== id && current(a) === value);
      if (other) n[field][other.id] = current(mine);
      n[field][id] = value;
    });
    setListen(null);
  }

  // Keyboard capture
  useEffect(() => {
    const onKey = (e) => {
      const l = listenRef.current;
      if (!l || l.kind !== 'key') return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { setListen(null); return; }
      assign('key', l.id, e.key);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Controller: live test, capture, and B to close. One loop for the panel's life, reading the
  // latest state through refs, so a re-render can't forget which buttons were already held.
  const latest = useRef({});
  latest.current = { assign, onClose };
  const heldAtStart = useRef(null); // buttons already down when "Change" was clicked
  const listenPad = (id) => { heldAtStart.current = new Set(pressedButtons(firstPad())); setListen({ kind: 'pad', id }); };
  useEffect(() => {
    let raf = 0;
    let wasB = true;
    const loop = () => {
      const pad = firstPad();
      const now = pressedButtons(pad);
      setLive((prev) => (prev.join() === now.join() ? prev : now));
      const name = pad ? pad.id.replace(/\(.*?\)/g, '').trim().slice(0, 40) : '';
      setPadName((prev) => (prev === name ? prev : name));
      const l = listenRef.current;
      if (l?.kind === 'pad') {
        const before = heldAtStart.current ||= new Set(now);
        const fresh = now.find((b) => !before.has(b));
        if (fresh) { heldAtStart.current = null; latest.current.assign('pad', l.id, fresh); } else for (const b of [...before]) if (!now.includes(b)) before.delete(b);
        wasB = now.includes('B'); // a B press used for mapping must not close the panel
      } else {
        const b = now.includes('B');
        if (b && !wasB) latest.current.onClose();
        wasB = b;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const keyFor = (a) => c.keys[a.id] ?? a.key;
  const padFor = (a) => c.pad[a.id] ?? a.pad;
  const faceActs = acts.filter((a) => !isDir(a.id));

  return (
    <dialog ref={dlg} className="cp" onClose={onClose} onCancel={(e) => { if (listen) { e.preventDefault(); setListen(null); } }} aria-labelledby="cp-title">
      <header className="cp-head">
        <div>
          <p className="cp-eyebrow">Controls</p>
          <h2 id="cp-title">{project.title}</h2>
        </div>
        <button type="button" className="sb-btn" onClick={onClose} aria-label="Close controls">Close</button>
      </header>
      <nav className="cp-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => { setTab(id); setListen(null); }}>{label}</button>
        ))}
      </nav>

      <div className="cp-body">
        {tab === 'keyboard' && (
          <>
            <p className="cp-note">Pick an action, then press the key you want for it. Esc cancels.</p>
            <ul className="cp-list">
              {acts.map((a) => (
                <li key={a.id}>
                  <span>{a.label}</span>
                  <button type="button" className={`cp-bind ${listen?.id === a.id && listen.kind === 'key' ? 'is-listening' : ''} ${keyFor(a) !== a.key ? 'is-changed' : ''}`}
                    onClick={() => setListen({ kind: 'key', id: a.id })}>
                    {listen?.id === a.id && listen.kind === 'key' ? 'Press a key…' : keyName(keyFor(a))}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'controller' && (
          <>
            <div className="cp-radio" role="radiogroup" aria-label="Who handles the controller">
              <label><input type="radio" checked={c.padMode !== 'native'} onChange={() => update((n) => { n.padMode = 'mapping'; })} /> Use my button map</label>
              <label><input type="radio" checked={c.padMode === 'native'} onChange={() => update((n) => { n.padMode = 'native'; })} /> Let the game read the controller</label>
            </div>
            <p className="cp-note">{padName ? `Connected: ${padName}` : 'No controller yet. Press any button on it to connect.'}
              {live.length > 0 && <> · Pressed: <b>{live.join(' + ')}</b></>}</p>
            {c.padMode === 'native'
              ? <p className="cp-note">This game has its own controller support; look in its own menu for more options.</p>
              : (
                <ul className="cp-list">
                  {acts.map((a) => (
                    <li key={a.id}>
                      <span>{a.label}</span>
                      <button type="button" className={`cp-bind ${listen?.id === a.id && listen.kind === 'pad' ? 'is-listening' : ''} ${padFor(a) !== a.pad ? 'is-changed' : ''}`}
                        onClick={() => listenPad(a.id)}>
                        {listen?.id === a.id && listen.kind === 'pad' ? 'Press a button…' : padFor(a) ? <span className={`glyph glyph-pad glyph-${padFor(a)}`}>{padFor(a)}</span> : 'Not set'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            <p className="cp-note">Hold Select + Start for 1.5 seconds in any game to come back to the shelf.</p>
          </>
        )}

        {tab === 'touch' && (
          <>
            <label className="cp-check"><input type="checkbox" checked={c.touch.on} onChange={(e) => update((n) => { n.touch.on = e.target.checked; })} /> Show on-screen buttons</label>
            {(project.controls || []).includes('touch') && <p className="cp-note">This game has its own touch controls. Turn these on only if you prefer them.</p>}
            <div className={`cp-touch ${c.touch.on ? '' : 'is-off'}`}>
              <div className="cp-grid2">
                <label>Size
                  <select value={c.touch.size} onChange={(e) => update((n) => { n.touch.size = e.target.value; })}><option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option></select>
                </label>
                <label>See-through
                  <input type="range" min="0.25" max="1" step="0.05" value={c.touch.opacity} onChange={(e) => update((n) => { n.touch.opacity = Number(e.target.value); })} />
                </label>
              </div>
              <label className="cp-check"><input type="checkbox" checked={c.touch.swap} onChange={(e) => update((n) => { n.touch.swap = e.target.checked; })} /> Buttons on the left, pad on the right</label>
              <div className="cp-grid2">
                {FACE.map((b) => (
                  <label key={b}><span><span className={`glyph glyph-pad glyph-${b}`}>{b}</span> button</span>
                    <select value={c.touch.face[b] || ''} onChange={(e) => update((n) => { n.touch.face[b] = e.target.value; })}>
                      <option value="">Hidden</option>
                      {faceActs.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className={`cp-touch-preview ${c.touch.swap ? 'is-swap' : ''}`} style={{ opacity: c.touch.opacity }} aria-hidden="true">
                <span className="cp-dpad"><i /><i /><i /><i /></span>
                <span className="cp-face">{FACE.map((b) => c.touch.face[b] && <i key={b} className={`face-${b}`}>{b}</i>)}</span>
              </div>
            </div>
          </>
        )}

        {tab === 'display' && (
          <>
            <label className="cp-check"><input type="checkbox" checked={display.fill} onChange={(e) => saveDisplay({ ...display, fill: e.target.checked })} /> Arcade mode: the game fills the whole window</label>
            <label className="cp-check"><input type="checkbox" checked={display.native} onChange={(e) => saveDisplay({ ...display, native: e.target.checked })} /> Go full screen when a game starts</label>
            <label className="cp-check"><input type="checkbox" checked={display.hideBar} onChange={(e) => saveDisplay({ ...display, hideBar: e.target.checked })} /> Tuck the game toolbar away while playing</label>
            <label className="cp-inline">Screen direction on phones
              <select value={display.orientation} onChange={(e) => saveDisplay({ ...display, orientation: e.target.value })}>
                <option value="auto">Follow the device</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option>
              </select>
            </label>
            <p className="cp-note">These apply to every game on this device. Some browsers (iPhone Safari) don't allow full screen or locking the direction; the game still fills the window.</p>
          </>
        )}
      </div>

      <footer className="cp-foot">
        {tab !== 'display' && <button type="button" className="sb-btn" onClick={() => { resetControls(project); setListen(null); }}>Reset this game</button>}
        <span className="cp-saved">Saved on this device</span>
        <button type="button" className="sb-launch" onClick={() => { onClose(); onPlay(); }}>{inGame ? 'Back to the game' : `Play ${project.title}`}</button>
      </footer>
    </dialog>
  );
}
