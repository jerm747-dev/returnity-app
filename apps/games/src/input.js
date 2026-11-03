// Controller + keyboard input for the sandbox launcher.
// Standard gamepad mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 8 Select, 9 Start, 12-15 D-pad, 16 Home.
import { useEffect, useRef, useState } from 'react';

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
const REPEAT_DELAY = 360;
const REPEAT_RATE = 110;
const DEAD = 0.5;
export const HOLD_TO_EXIT_MS = 1500;

function connectedPads() {
  try { return Array.from(navigator.getGamepads?.() || []).filter(Boolean); } catch { return []; }
}

// Directions from the D-pad or left stick.
function directions(p) {
  const b = (i) => !!p.buttons[i]?.pressed;
  const [x = 0, y = 0] = p.axes;
  return {
    up: b(BTN.UP) || y < -DEAD,
    down: b(BTN.DOWN) || y > DEAD,
    left: b(BTN.LEFT) || x < -DEAD,
    right: b(BTN.RIGHT) || x > DEAD,
  };
}

export function buzz(ms = 18, strength = 0.25) {
  for (const p of connectedPads()) {
    try { p.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }); } catch { /* not supported */ }
  }
}

/**
 * Polls controllers every frame.
 * mode "menu": sends actions (up/down/left/right/a/b/y/lb/rb) with key-repeat.
 * mode "player": only watches the exit combo (hold Select+Start, or press Home), reports hold progress.
 */
export function useGamepad({ mode, onAction, onExitProgress, onExit }) {
  const [pads, setPads] = useState([]);
  const handlers = useRef({ onAction, onExitProgress, onExit });
  handlers.current = { onAction, onExitProgress, onExit };

  useEffect(() => {
    let raf = 0;
    const prev = new Map(); // action -> {down, next}
    let holdStart = 0;
    let sig = '';
    let homeWasDown = false;

    const tick = (now) => {
      const list = connectedPads();
      const nextSig = list.map((p) => p.index + p.id).join('|');
      if (nextSig !== sig) { sig = nextSig; setPads(list.map((p) => ({ index: p.index, id: p.id }))); }
      const p = list[0];

      if (p && mode === 'menu') {
        const d = directions(p);
        const b = (i) => !!p.buttons[i]?.pressed;
        const state = { up: d.up, down: d.down, left: d.left, right: d.right, a: b(BTN.A), b: b(BTN.B), x: b(BTN.X), y: b(BTN.Y), lb: b(BTN.LB), rb: b(BTN.RB), start: b(BTN.START) };
        for (const [action, isDown] of Object.entries(state)) {
          const s = prev.get(action) || { down: false, next: 0 };
          const repeats = ['up', 'down', 'left', 'right'].includes(action);
          if (isDown && !s.down) { handlers.current.onAction?.(action, 'gamepad'); s.next = now + REPEAT_DELAY; }
          else if (isDown && repeats && now >= s.next) { handlers.current.onAction?.(action, 'gamepad'); s.next = now + REPEAT_RATE; }
          s.down = isDown;
          prev.set(action, s);
        }
      }

      if (p && mode === 'player') {
        const combo = !!p.buttons[BTN.SELECT]?.pressed && !!p.buttons[BTN.START]?.pressed;
        const home = !!p.buttons[BTN.HOME]?.pressed;
        if (home && !homeWasDown) handlers.current.onExit?.();
        homeWasDown = home;
        if (combo) {
          if (!holdStart) holdStart = now;
          const progress = Math.min(1, (now - holdStart) / HOLD_TO_EXIT_MS);
          handlers.current.onExitProgress?.(progress);
          if (progress >= 1) { holdStart = 0; handlers.current.onExitProgress?.(0); handlers.current.onExit?.(); }
        } else if (holdStart) {
          holdStart = 0;
          handlers.current.onExitProgress?.(0);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onConnect = () => { sig = ''; };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onConnect);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onConnect);
    };
  }, [mode]);

  return pads;
}

export async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen();
      try { screen.orientation?.unlock?.(); } catch { /* browser default */ }
    }
  } catch { /* not allowed here */ }
}

// Explicit orientation requests never rotate a game by CSS or reset its state.
export async function setDisplayOrientation(mode = 'auto') {
  if (mode === 'auto') { try { screen.orientation?.unlock?.(); } catch {} return 'Auto: follows your device orientation.'; }
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    if (!screen.orientation?.lock) throw new Error('unsupported');
    await screen.orientation.lock(mode);
    return `${mode === 'portrait' ? 'Portrait' : 'Landscape'} fullscreen selected.`;
  } catch { return 'Rotate your device to switch orientation; this browser does not allow an orientation lock.'; }
}
