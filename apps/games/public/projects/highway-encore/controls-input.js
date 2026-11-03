/* Eight-way touch pad and shared keyboard/touch ownership. No dependencies. */
(() => {
 'use strict';
 const mapping = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',
  ArrowUp:'jump',KeyW:'jump',ArrowDown:'down',KeyS:'down',Space:'jump',
  KeyX:'flip',ShiftLeft:'speed',ShiftRight:'speed'};
 const sectors = [['right'],['jump','right'],['jump'],['jump','left'],
  ['left'],['down','left'],['down'],['down','right']];

 // Coordinates are relative to the pad center; radius is half its width.
 function directions(dx, dy, radius) {
  const distance = Math.hypot(dx, dy) / radius;
  if (distance < .18 || distance > 1.12) return [];
  const sector = (Math.round(Math.atan2(-dy, dx) / (Math.PI / 4)) + 8) % 8;
  return sectors[sector].slice();
 }

 function mount({root, press, release, enabled}) {
  const pad = root.querySelector('.dpad');
  const buttons = [...root.querySelectorAll('[data-key]')];
  const segments = [...root.querySelectorAll('[data-directions]')];
  const sources = new Map(), padPointers = new Set();
  let active = new Set(), speedLock = false;

  function sync() {
   for (const button of buttons) {
    const held = active.has(button.dataset.key);
    button.classList.toggle('held', held);
    button.setAttribute('aria-pressed', String(held));
    if (button.dataset.key === 'speed') {
     button.dataset.latched = String(speedLock);
     button.setAttribute('aria-label', speedLock ? 'Speed on — tap to turn off' : 'Speed — tap to turn on');
    }
   }
   for (const segment of segments) {
    const keys = segment.dataset.directions.split(' ');
    segment.classList.toggle('lit', keys.every(key => active.has(key)));
   }
  }
  function reconcile() {
   const next = new Set([...sources.values()].flat());
   if (speedLock) next.add('speed');
   for (const key of active) if (!next.has(key)) release(key);
   for (const key of next) if (!active.has(key)) press(key);
   active = next;
   sync();
  }
  function setSource(id, keys) {
   if (keys.length) sources.set(id, keys);
   else sources.delete(id);
   reconcile();
  }
  function toggleSpeed() { speedLock = !speedLock; reconcile(); }
  function clear() {
   sources.clear(); padPointers.clear(); speedLock = false; reconcile();
  }
  function point(event) {
   const r = pad.getBoundingClientRect();
   return directions(event.clientX - r.left - r.width / 2,
    event.clientY - r.top - r.height / 2, r.width / 2);
  }
  function canPoint(event) {
   return enabled() && !(event.pointerType === 'mouse' && event.button !== 0);
  }
  pad.addEventListener('pointerdown', event => {
   if (!canPoint(event)) return;
   event.preventDefault();
   pad.setPointerCapture(event.pointerId);
   padPointers.add(event.pointerId);
   setSource('pointer-' + event.pointerId, point(event));
  });
  pad.addEventListener('pointermove', event => {
   if (!padPointers.has(event.pointerId)) return;
   event.preventDefault();
   setSource('pointer-' + event.pointerId, enabled() ? point(event) : []);
  });
  function releasePointer(event) {
   padPointers.delete(event.pointerId);
   setSource('pointer-' + event.pointerId, []);
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture'])
   pad.addEventListener(name, releasePointer);

  for (const button of buttons) {
   const key = button.dataset.key;
   if (!button.closest('.dpad')) {
    button.addEventListener('pointerdown', event => {
     if (!canPoint(event)) return;
     event.preventDefault();
     button.setPointerCapture(event.pointerId);
     if (key === 'speed') toggleSpeed();
     else setSource('pointer-' + event.pointerId, [key]);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture'])
     button.addEventListener(name, releasePointer);
   }
   // Real buttons also work when reached with Tab, Enter or Space.
   button.addEventListener('keydown', event => {
    if (!['Space','Enter'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat || !enabled()) return;
    if (key === 'speed') toggleSpeed();
    else setSource('button-' + event.code, [key]);
   });
   button.addEventListener('keyup', event => {
    if (!['Space','Enter'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation();
    setSource('button-' + event.code, []);
   });
   button.addEventListener('blur', () => {
    setSource('button-Space', []); setSource('button-Enter', []);
   });
   button.addEventListener('click', event => {
    // Screen-reader activation has no physical pointer or keyboard event.
    if (event.detail !== 0 || !enabled()) return;
    if (key === 'speed') toggleSpeed();
    else {
     setSource('assistive-' + key, [key]);
     setTimeout(() => setSource('assistive-' + key, []), 140);
    }
   });
  }
  root.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('keydown', event => {
   const key = mapping[event.code];
   if (!key || !enabled()) return;
   if (event.code === 'Space' && document.activeElement?.tagName === 'BUTTON'
       && !document.activeElement.closest('.deck')) return;
   event.preventDefault();
   if (!event.repeat) setSource('keyboard-' + event.code, [key]);
  });
  window.addEventListener('keyup', event => {
   if (!mapping[event.code]) return;
   if (sources.has('keyboard-' + event.code)) event.preventDefault();
   setSource('keyboard-' + event.code, []);
  });
  sync();
  return {clear};
 }
 globalThis.EncoreInput = {directions, mount};
})();
