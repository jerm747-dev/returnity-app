// Arcade-level controls (no React here, so tests can run it): what each game's actions are, how the player has mapped them
// (keyboard, controller, on-screen touch buttons), and display settings. Saved per device.
import { cfg } from './config.js';

export const PAD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
export const PAD_INDEX = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
export const FACE = ['A', 'B', 'X', 'Y'];
const DIRS = [
  { id: 'up', label: 'Up', key: 'ArrowUp', pad: 'UP' },
  { id: 'down', label: 'Down', key: 'ArrowDown', pad: 'DOWN' },
  { id: 'left', label: 'Left', key: 'ArrowLeft', pad: 'LEFT' },
  { id: 'right', label: 'Right', key: 'ArrowRight', pad: 'RIGHT' },
];
export const isDir = (id) => ['up', 'down', 'left', 'right'].includes(id);

const KEY_NAMES = { ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Control: 'Ctrl' };
export const keyName = (k) => (!k ? '–' : KEY_NAMES[k] || (k.length === 1 ? k.toUpperCase() : k));

/**
 * A game's actions. From project.json "actions" when it has them:
 *   "actions": [{ "id": "jump", "label": "Jump", "key": " ", "pad": "A" }, ...]
 * otherwise from its controller map ("gamepad"), plus the arrow keys.
 */
export function actionsFor(p) {
  if (Array.isArray(p?.actions) && p.actions.length) {
    return p.actions.filter((a) => a && a.key).map((a, i) => ({
      id: String(a.id || a.label || `action-${i}`), label: String(a.label || keyName(a.key)), key: a.key,
      // up/down/left/right default to the d-pad (and the left stick follows the d-pad)
      pad: PAD_BUTTONS.includes(a.pad) ? a.pad : DIRS.find((d) => d.id === a.id)?.pad,
    }));
  }
  const out = DIRS.map((d) => ({ ...d }));
  const bridge = Object.entries(p?.gamepad || {});
  for (const [btn, key] of bridge) {
    const dir = out.find((d) => d.key === key);
    if (dir) { dir.pad = btn; continue; }
    if (out.some((a) => a.key === key)) continue;
    out.push({ id: `key-${key}`, label: p.gamepadLabels?.[btn] || keyName(key), key, pad: btn });
  }
  if (!bridge.length) {
    out.push({ id: 'action', label: 'Action', key: ' ', pad: 'A' });
    out.push({ id: 'confirm', label: 'Confirm / Start', key: 'Enter', pad: 'START' });
  }
  return out;
}

// ---------- saved settings ----------
const KEY = (slug) => `sound-arcade.controls.${slug}`;
const DISPLAY_KEY = 'sound-arcade.display';
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } };
export const isTouchDevice = () => typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && matchMedia('(pointer: coarse)').matches;

/** Defaults for a game before the player changes anything */
export function defaultsFor(p) {
  const acts = actionsFor(p).filter((a) => !isDir(a.id));
  // Touch buttons: actions mapped to A/B/X/Y keep that button; the rest fill the free buttons in order
  const face = {};
  const used = new Set();
  for (const b of FACE) { const a = acts.find((x) => x.pad === b); if (a) { face[b] = a.id; used.add(a.id); } }
  const rest = acts.filter((a) => !used.has(a.id));
  for (const b of FACE) if (!face[b]) face[b] = rest.shift()?.id || '';
  const hasBridge = Object.keys(p?.gamepad || {}).length > 0;
  const nativePad = p?.controllerMode ? p.controllerMode === 'native' : !hasBridge && (p?.controls || []).includes('gamepad') && !(p?.actions?.length);
  const nativeTouch = (p?.controls || []).includes('touch');
  return {
    keys: {}, // actionId -> key the player presses
    pad: {}, // actionId -> controller button
    padMode: nativePad ? 'native' : 'mapping',
    touch: { on: isTouchDevice() && !nativeTouch, swap: false, size: 'm', opacity: 0.55, face },
  };
}

const cache = new Map();
export function loadControls(p) {
  const saved = read(KEY(p.slug), {});
  const d = defaultsFor(p);
  return { ...d, ...saved, keys: { ...saved.keys }, pad: { ...saved.pad }, touch: { ...d.touch, ...saved.touch, face: { ...d.touch.face, ...saved.touch?.face } } };
}
export function saveControls(p, value) { write(KEY(p.slug), value); cache.delete(p.slug); emit(); }
export function resetControls(p) { try { localStorage.removeItem(KEY(p.slug)); } catch { /* storage off */ } cache.delete(p.slug); emit(); }

export const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
/** The saved controls for a game, the same object until something changes (for React) */
export function controlsSnapshot(p) {
  if (!p) return null;
  if (!cache.has(p.slug)) cache.set(p.slug, loadControls(p));
  return cache.get(p.slug);
}

/** What the arcade does while a game runs, built from the game's actions and the saved choices */
export function plan(p, c) {
  const acts = actionsFor(p);
  const keyMap = {}; // pressed key -> key the game expects
  for (const a of acts) {
    const k = c.keys[a.id];
    if (k && k !== a.key) keyMap[k.length === 1 ? k.toLowerCase() : k] = a.key;
  }
  const bridge = {}; // controller button -> key
  if (c.padMode !== 'native') for (const a of acts) { const b = c.pad[a.id] ?? a.pad; if (b) bridge[b] = a.key; }
  const touchKeys = {};
  for (const d of DIRS) { const a = acts.find((x) => x.id === d.id) || d; touchKeys[d.id] = a.key; }
  for (const b of FACE) { const a = acts.find((x) => x.id === c.touch.face[b]); if (a) touchKeys[b] = a.key; }
  return { acts, keyMap, bridge, touchKeys };
}

// ---------- display ----------
export function displayDefaults() {
  const d = cfg().games?.display || {};
  return { fill: d.fill !== false, native: d.native !== false, orientation: d.orientation || 'auto', hideBar: d.hideBar !== false };
}
let displayCache = null;
export const loadDisplay = () => (displayCache ||= { ...displayDefaults(), ...read(DISPLAY_KEY, {}) });
export function saveDisplay(v) { displayCache = null; write(DISPLAY_KEY, v); emit(); }

// ---------- browser fullscreen (with the older Safari names) ----------
export const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
export async function enterFullscreen(orientation = 'auto') {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || fsElement()) return !!fsElement();
  try { await req.call(el); } catch { return false; }
  if (orientation !== 'auto') { try { await screen.orientation?.lock?.(orientation); } catch { /* not allowed on this device */ } }
  return true;
}
export async function exitFullscreen() {
  if (!fsElement()) return;
  try { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* already out */ }
  try { screen.orientation?.unlock?.(); } catch { /* ok */ }
}
