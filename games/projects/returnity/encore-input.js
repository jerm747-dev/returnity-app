/* Port of Encore’s eight-way controller. Returnity owns the game key and gamepad maps. */
(() => {
 'use strict';
 const sectors = [['right'],['up','right'],['up'],['up','left'],
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
  let active = new Set();

  function sync() {
   for (const button of buttons) {
    const held = active.has(button.dataset.key);
    button.classList.toggle('held', held);
    button.setAttribute('aria-pressed', String(held));
   }
   for (const segment of segments) {
    const keys = segment.dataset.directions.split(' ');
    segment.classList.toggle('lit', keys.every(key => active.has(key)));
   }
  }
  function reconcile() {
   const next = new Set([...sources.values()].flat());
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
  function clear() {
   sources.clear(); padPointers.clear(); reconcile();
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
     setSource('pointer-' + event.pointerId, [key]);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture'])
     button.addEventListener(name, releasePointer);
   }
   // Real buttons also work when reached with Tab, Enter or Space.
   button.addEventListener('keydown', event => {
    if (!['Space','Enter'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat || !enabled()) return;
    setSource('button-' + event.code, [key]);
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
    setSource('assistive-' + key, [key]);
    setTimeout(() => setSource('assistive-' + key, []), 140);
   });
  }
  root.addEventListener('contextmenu', event => event.preventDefault());
  sync();
  return {clear};
 }
 globalThis.EncoreInput = {directions, mount};
})();

