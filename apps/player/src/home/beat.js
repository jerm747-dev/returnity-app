// A small drum machine in the browser (Web Audio): the beat pad plays it, and the tape deck and
// turntable fall back to it while a site has no songs yet. One sequencer, one owner at a time.
let ac = null, master = null, noiseBuf = null;
export function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .3; master.connect(ac.destination); } catch { return null; } }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function noise() {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(); s.buffer = noiseBuf; return s;
}
export const VOICES = {
  kick(t) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .25); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(.001, t + .55); o.connect(g).connect(master); o.start(t); o.stop(t + .6); },
  clap(t) { const s = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .8; g.gain.setValueAtTime(.0001, t); [0, .012, .024].forEach((d) => { g.gain.setValueAtTime(.65, t + d); g.gain.exponentialRampToValueAtTime(.08, t + d + .01); }); g.gain.exponentialRampToValueAtTime(.001, t + .22); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + .25); },
  hat(t) { const s = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 7500; g.gain.setValueAtTime(.17, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + .08); },
  open(t) { const s = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 6500; g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + .28); },
  bass(t, f0 = 55) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f0; g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .45); o.connect(g).connect(master); o.start(t); o.stop(t + .5); },
};
export function blip(f = 660) {
  if (!audio()) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + .08);
  o.connect(g).connect(master); o.start(t); o.stop(t + .09);
}
export function hit(voice) { if (audio()) VOICES[voice](ac.currentTime); }

export const ROWS = ['kick', 'clap', 'hat', 'open'];
export const pattern = {
  kick: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0], clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
  hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], open: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
};
const seq = { owner: null, bpm: 92, step: 0, next: 0, timer: 0, bass: false };
const stopHooks = new Map();
const stepListeners = new Set();
export const onStep = (fn) => { stepListeners.add(fn); return () => stepListeners.delete(fn); };
export const beatOwner = () => seq.owner;
export const setBpm = (bpm) => { seq.bpm = bpm; };

export function beatStart(owner, { bpm = 92, bass = false, onStop } = {}) {
  if (!audio()) return;
  if (seq.owner && seq.owner !== owner) stopHooks.get(seq.owner)?.();
  if (onStop) stopHooks.set(owner, onStop);
  seq.owner = owner; seq.bpm = bpm; seq.bass = bass; seq.step = 0; seq.next = ac.currentTime + .05;
  clearInterval(seq.timer); seq.timer = setInterval(tick, 25); tick();
}
export function beatStop(owner) {
  if (seq.owner !== owner) return;
  clearInterval(seq.timer); seq.timer = 0; seq.owner = null;
  stepListeners.forEach((fn) => fn(-1));
}
function tick() {
  while (seq.next < ac.currentTime + .12) {
    const i = seq.step % 16, t = seq.next;
    for (const r of ROWS) if (pattern[r][i]) VOICES[r](t);
    if (seq.bass && (i === 0 || i === 6 || i === 10)) VOICES.bass(t, i === 10 ? 49 : 55);
    const delay = Math.max(0, (t - ac.currentTime) * 1000);
    setTimeout(() => stepListeners.forEach((fn) => fn(i)), delay);
    seq.next += 60 / seq.bpm / 4; seq.step++;
  }
}
