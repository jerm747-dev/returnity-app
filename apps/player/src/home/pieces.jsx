// The arcade room's pieces. The tape deck and turntable play the site's real songs through the
// shared player (and a demo beat while there are no songs yet); the others are self-contained.
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../player.jsx';
import { audio, blip, hit, beatStart, beatStop, beatOwner, setBpm, onStep, pattern, ROWS } from './beat.js';

const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SILHOUETTE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240"><g fill="#3a3a42"><circle cx="60" cy="34" r="22"/><path d="M28 70q32-14 64 0l8 70-14 4-4 92H64l-4-70-4 70H38l-4-92-14-4z"/></g></svg>');
const Ico = {
  rew: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 6v12L2 12zm11 0v12l-9-6z" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>,
  ff: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 6v12l9-6zM2 6v12l9-6z" /></svg>,
  stop: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" /></svg>,
  eject: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l8 9H4zM4 16h16v3H4z" /></svg>,
};
const Screws = () => <><span className="screw" /><span className="screw" /><span className="screw" /><span className="screw" /></>;
export const characterOr = (src) => src || SILHOUETTE;

/* ============================== TAPE DECK ============================== */
export function TapeDeck({ tracks, artist, title, autoplay = 0 }) {
  const p = usePlayer();
  const [side, setSide] = useState('A');
  const [out, setOut] = useState(false);
  const [winding, setWinding] = useState(0); // 7 / -7 while a quick wind animation runs
  const [demoOn, setDemoOn] = useState(false);
  const demo = tracks.length === 0;
  const half = Math.ceil(tracks.length / 2);
  const sideTracks = useMemo(() => (tracks.length < 2 ? tracks : side === 'A' ? tracks.slice(0, half) : tracks.slice(half)), [tracks, side, half]);
  const mineIdx = p.current ? sideTracks.findIndex((t) => t.id === p.current.id) : -1;
  const playing = demo ? demoOn : mineIdx >= 0 && p.playing;
  const refs = { reelL: useRef(null), reelR: useRef(null), tapeL: useRef(null), tapeR: useRef(null), nL: useRef(null), nR: useRef(null) };
  const live = useRef({});
  live.current = { playing, winding, mineIdx, time: p.time, duration: p.duration, n: sideTracks.length || 1 };
  const [counter, setCounter] = useState('000');

  useEffect(() => () => { beatStop('deck'); }, []);
  useEffect(() => {
    let raf = 0, last = 0, ang = 0, demoPos = 0, lv = [0, 0];
    const loop = (now) => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      const L = live.current, v = L.winding || (L.playing ? 1 : 0);
      if (v && !reduce()) ang += v * dt * 220;
      let f;
      if (demo) { if (L.playing) demoPos = (demoPos + dt) % 600; f = demoPos / 600; }
      else f = L.mineIdx >= 0 ? (L.mineIdx + (L.duration ? L.time / L.duration : 0)) / L.n : 0;
      const rl = 28 + 16 * (1 - f), rr = 28 + 16 * f;
      refs.tapeL.current?.setAttribute('r', rl.toFixed(1)); refs.tapeR.current?.setAttribute('r', rr.toFixed(1));
      if (refs.reelL.current) refs.reelL.current.style.transform = `rotate(${ang * 44 / rl}deg)`;
      if (refs.reelR.current) refs.reelR.current.style.transform = `rotate(${ang * 44 / rr}deg)`;
      const target = L.playing ? [.55 + .35 * Math.abs(Math.sin(now / 170)) + Math.random() * .1, .5 + .4 * Math.abs(Math.sin(now / 150 + 1)) + Math.random() * .1] : [0, 0];
      lv = lv.map((l, i) => l + (target[i] - l) * .25);
      if (refs.nL.current) refs.nL.current.style.transform = `rotate(${-48 + lv[0] * 96}deg)`;
      if (refs.nR.current) refs.nR.current.style.transform = `rotate(${-48 + lv[1] * 96}deg)`;
      const secs = demo ? demoPos : (L.mineIdx >= 0 ? L.time : 0);
      setCounter(String(Math.floor(secs) % 1000).padStart(3, '0'));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps

  const wind = (dir) => { setWinding(7 * dir); setTimeout(() => setWinding(0), 650); };
  const press = (act) => {
    blip(act === 'eject' ? 330 : 880);
    if (act === 'play') {
      if (demo) { if (demoOn) { beatStop('deck'); setDemoOn(false); } else { beatStart('deck', { bass: side === 'B', onStop: () => setDemoOn(false) }); setDemoOn(true); } return; }
      p.setRate(1);
      if (mineIdx >= 0) p.toggle(); else p.playAt(sideTracks, 0);
    }
    if (act === 'stop') { if (demo) { beatStop('deck'); setDemoOn(false); } else if (playing) p.pause(); }
    if (act === 'ff') { wind(1); if (!demo && mineIdx >= 0) p.next(); }
    if (act === 'rew') { wind(-1); if (!demo && mineIdx >= 0) p.prev(); }
    if (act === 'eject') {
      if (demo) { beatStop('deck'); setDemoOn(false); } else if (playing) p.pause();
      setOut(true); setTimeout(() => { setSide((s) => (s === 'A' ? 'B' : 'A')); setOut(false); }, 650);
    }
  };
  useEffect(() => { if (autoplay && !playing) press('play'); }, [autoplay]); // eslint-disable-line react-hooks/exhaustive-deps
  const latched = (act) => (act === 'play' && playing) || (act === 'ff' && winding > 0) || (act === 'rew' && winding < 0);

  return (
    <div className="two">
      <div className="deck-unit brushed">
        <Screws />
        <div className="deck-top"><span className="engrave">Stereo cassette deck</span><span className="engrave">Type II · Normal bias</span></div>
        <div className="well"><div className={`cassette ${out ? 'out' : ''}`}>
          <svg viewBox="0 0 600 340" role="img" aria-label={`Cassette: ${title}, side ${side}`}>
            <defs><linearGradient id="sa-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b2b30" /><stop offset="1" stopColor="#16161a" /></linearGradient></defs>
            <rect x="8" y="8" width="584" height="324" rx="20" fill="url(#sa-sh)" stroke="#3a3a42" strokeWidth="3" />
            <rect x="40" y="28" width="520" height="190" rx="10" fill="#efe9dc" />
            <rect x="40" y="28" width="520" height="34" rx="10" style={{ fill: 'var(--accent)' }} /><rect x="40" y="48" width="520" height="14" style={{ fill: 'var(--accent)' }} />
            <text x="60" y="53" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="22" fill="#17130b" letterSpacing="1">{String(title).toUpperCase().slice(0, 28)}</text>
            <text x="540" y="53" textAnchor="end" fontFamily="Share Tech Mono, monospace" fontSize="16" fill="#17130b">SIDE {side}</text>
            <text x="60" y="88" fontFamily="Share Tech Mono, monospace" fontSize="14" fill="#6d675c">{String(artist).toUpperCase().slice(0, 44)}</text>
            <rect x="140" y="104" width="320" height="96" rx="48" fill="#0d0d10" />
            <circle ref={refs.tapeL} cx="208" cy="152" r="44" fill="#3b2a1e" /><circle ref={refs.tapeR} cx="392" cy="152" r="28" fill="#3b2a1e" />
            {[208, 392].map((cx, i) => (
              <g key={cx} className="reel" ref={i ? refs.reelR : refs.reelL}>
                <circle cx={cx} cy="152" r="24" fill="#efe9dc" /><circle cx={cx} cy="152" r="10" fill="#0d0d10" />
                <rect x={cx - 4} y="130" width="8" height="11" rx="2" fill="#0d0d10" /><rect x={cx - 4} y="163" width="8" height="11" rx="2" fill="#0d0d10" />
                <rect x={cx - 22} y="148" width="11" height="8" rx="2" fill="#0d0d10" /><rect x={cx + 11} y="148" width="11" height="8" rx="2" fill="#0d0d10" />
              </g>
            ))}
            <path d="M120 332 L156 262 H444 L480 332" fill="#0d0d10" stroke="#3a3a42" strokeWidth="2" />
          </svg>
        </div></div>
        <div className="meters">
          <div className="counter" aria-label={`Tape counter ${counter}`}>{counter.split('').map((d, i) => <span key={i}>{d}</span>)}</div>
          {['L', 'R'].map((ch) => (
            <div className="vu" key={ch}><svg viewBox="0 0 100 48" aria-hidden="true">
              <path d="M14 40 A40 40 0 0 1 86 40" fill="none" stroke="#2a241a" strokeWidth="1" /><path d="M68 18 A40 40 0 0 1 86 40" fill="none" stroke="#c2412b" strokeWidth="3" />
              <g stroke="#2a241a" strokeWidth="1"><path d="M18 33l3 2M28 24l2 3M40 18l1 3M52 16v3M64 18l-1 3M75 24l-2 3" /></g>
              <text x="50" y="44" textAnchor="middle" fontFamily="Share Tech Mono, monospace" fontSize="7" fill="#2a241a">VU · {ch}</text>
              <line className="needle" ref={ch === 'L' ? refs.nL : refs.nR} x1="50" y1="52" x2="50" y2="12" stroke="#151515" strokeWidth="1.2" />
            </svg></div>
          ))}
        </div>
        <div className="keys-wrap"><div className="keys" role="group" aria-label="Transport keys">
          {[['rew', 'Rew', 'Previous track'], ['play', 'Play', 'Play or pause'], ['ff', 'FF', 'Next track'], ['stop', 'Stop', 'Stop'], ['eject', 'Eject', 'Eject and flip the tape']].map(([act, label, aria]) => (
            <button key={act} type="button" className={`key ${latched(act) ? 'latched' : ''}`} onClick={() => press(act)} aria-label={aria} aria-pressed={act === 'play' ? playing : undefined}>
              <span className={`led ${latched(act) ? 'on' : ''}`} />{Ico[act]}<em>{label}</em>
            </button>
          ))}
        </div></div>
      </div>
      <div className="deck-side">
        {demo ? (
          <p className="mute small">No songs yet, so PLAY runs a demo beat. Add music on the setup page and this deck plays the album, side A then side B.</p>
        ) : (
          <ol className="tracks">
            {sideTracks.slice(0, 8).map((t, i) => (
              <li key={t.id} className={i === mineIdx ? 'on' : ''}><button type="button" onClick={() => { p.setRate(1); p.playAt(sideTracks, i); }}>{t.title}</button></li>
            ))}
            {sideTracks.length > 8 && <li className="more">+ {sideTracks.length - 8} more on side {side}</li>}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ============================== TURNTABLE ============================== */
export function Turntable({ tracks, artist, title }) {
  const p = usePlayer();
  const demo = tracks.length === 0;
  const [rpm, setRpm] = useState(33.333);
  const [pitch, setPitch] = useState(0);
  const [started, setStarted] = useState(false); // this deck started the music
  const [demoOn, setDemoOn] = useState(false);
  const rate = (rpm / 33.333) * (1 + pitch / 100);
  const on = demo ? demoOn : started && p.playing;
  const platterRef = useRef(null), armRef = useRef(null), strobeRef = useRef(null), groovesRef = useRef(null);
  const live = useRef({});
  live.current = { on, rate };

  useEffect(() => {
    const g = groovesRef.current; if (!g || g.childNodes.length) return;
    const add = (r, stroke, w) => { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', 330); c.setAttribute('cy', 300); c.setAttribute('r', r); c.setAttribute('fill', 'none'); c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', w); g.append(c); };
    for (let r = 74; r < 224; r += 3.2) add(r.toFixed(1), (r | 0) % 19 === 0 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.028)', 1);
    for (const r of [120, 160, 196]) add(r, '#050506', 2.5);
  }, []);
  // speed follows the controls while this deck has the music
  useEffect(() => { if (!demo && started) p.setRate(rate); if (demo && beatOwner() === 'turntable') setBpm(Math.round(92 * rate)); }, [rate, started, demo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { beatStop('turntable'); p.setRate(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let raf = 0, last = 0, vel = 0, ang = 0, arm = 0;
    const loop = (now) => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      const L = live.current, target = L.on ? 33.333 * 6 * L.rate : 0;
      vel += (target - vel) * Math.min(1, dt * (L.on ? 2.6 : 3.2));
      if (!reduce()) ang = (ang + vel * dt) % 360;
      platterRef.current?.setAttribute('transform', `rotate(${ang.toFixed(2)} 330 300)`);
      arm += ((L.on ? 26 : 0) - arm) * Math.min(1, dt * 2.2);
      armRef.current?.setAttribute('transform', `rotate(${arm.toFixed(2)} 660 130)`);
      strobeRef.current?.setAttribute('fill', L.on && Math.abs(vel - target) < 5 ? '#ff5b3a' : '#3a1a12');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const startStop = () => {
    blip(500);
    if (demo) {
      if (demoOn) { beatStop('turntable'); setDemoOn(false); }
      else { setDemoOn(true); setTimeout(() => beatStart('turntable', { bpm: Math.round(92 * rate), bass: true, onStop: () => setDemoOn(false) }), reduce() ? 0 : 900); }
      return;
    }
    if (on) { p.pause(); return; }
    setStarted(true); p.setRate(rate);
    if (p.current) p.play(); else p.playAt(tracks, 0);
  };
  const labelLine = !demo && started && p.current ? p.current.title : `${artist} · side A`;

  return (
    <>
      <div className="tt-scene">
        <div className="tt">
          <svg viewBox="0 0 800 600" aria-hidden="true">
            <defs>
              <linearGradient id="sa-plinth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c2c31" /><stop offset=".08" stopColor="#232327" /><stop offset="1" stopColor="#141417" /></linearGradient>
              <radialGradient id="sa-platter" cx=".5" cy=".5" r=".5"><stop offset=".92" stopColor="#b9bac0" /><stop offset=".96" stopColor="#e9e9ec" /><stop offset="1" stopColor="#7e7f85" /></radialGradient>
              <radialGradient id="sa-label" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#f6d58a" /><stop offset="1" style={{ stopColor: 'var(--accent)' }} /></radialGradient>
              <linearGradient id="sa-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".45" stopColor="#fff" stopOpacity=".09" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></linearGradient>
              <linearGradient id="sa-arm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7d7e84" /><stop offset=".5" stopColor="#f3f3f5" /><stop offset="1" stopColor="#8b8c92" /></linearGradient>
              <clipPath id="sa-disc"><circle cx="330" cy="300" r="226" /></clipPath>
            </defs>
            <rect x="10" y="20" width="780" height="570" rx="16" fill="#08080a" opacity=".6" />
            <rect x="6" y="6" width="788" height="580" rx="16" fill="url(#sa-plinth)" stroke="#36363d" strokeWidth="2" />
            <rect x="6" y="6" width="788" height="10" rx="5" fill="#fff" opacity=".05" />
            <g ref={platterRef}>
              <circle cx="330" cy="300" r="246" fill="url(#sa-platter)" />
              {[243, 237, 231].map((r, i) => <circle key={r} cx="330" cy="300" r={r} fill="none" stroke="#2b2b30" strokeWidth="3.5" strokeDasharray={`3 ${5.3 - i * .2}`} />)}
              <circle cx="330" cy="300" r="226" fill="#0e0e10" />
              <g ref={groovesRef} />
              <circle cx="330" cy="300" r="66" fill="url(#sa-label)" />
              <text x="330" y="294" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="16" fill="#17130b" letterSpacing="1">{String(title).toUpperCase().slice(0, 14)}</text>
              <text x="330" y="314" textAnchor="middle" fontFamily="Share Tech Mono, monospace" fontSize="9" fill="#3a2a10">{String(labelLine).toUpperCase().slice(0, 26)}</text>
              <circle cx="330" cy="300" r="5" fill="#d7d8dc" />
            </g>
            <circle cx="330" cy="300" r="226" fill="url(#sa-sheen)" clipPath="url(#sa-disc)" />
            <circle cx="80" cy="540" r="16" fill="#1d1d21" stroke="#3a3a42" /><circle ref={strobeRef} cx="80" cy="540" r="7" fill="#3a1a12" />
            <circle cx="660" cy="130" r="56" fill="#1d1d21" stroke="#3a3a42" strokeWidth="2" /><circle cx="660" cy="130" r="38" fill="url(#sa-arm)" />
            <rect x="700" y="300" width="16" height="44" rx="6" fill="#2a2a2f" stroke="#3a3a42" />
            <g ref={armRef}>
              <rect x="640" y="40" width="40" height="46" rx="8" fill="url(#sa-arm)" />
              <path d="M660 130 C 660 210, 700 250, 690 330 S 640 420, 612 446" fill="none" stroke="url(#sa-arm)" strokeWidth="9" strokeLinecap="round" />
              <path d="M598 434 l28 -10 l14 28 l-30 12 z" fill="#2c2c31" stroke="#8b8c92" strokeWidth="2" />
              <circle cx="660" cy="130" r="14" fill="#2c2c31" />
            </g>
            <rect x="730" y="220" width="40" height="12" rx="6" fill="#3a3a42" />
            <rect x="742" y="320" width="10" height="230" rx="5" fill="#0b0b0d" />
            <g fill="#5a5a61" fontFamily="Share Tech Mono, monospace" fontSize="11"><text x="716" y="330">−8</text><text x="726" y="439">0</text><text x="714" y="550">+8</text></g>
          </svg>
          <button className={`tt-btn tt-start ${on ? 'on' : ''}`} type="button" onClick={startStop} aria-pressed={on}><span className={`led ${on ? 'on' : ''}`} />Start · Stop</button>
          <button className={`tt-btn tt-33 ${rpm < 40 ? 'on' : ''}`} type="button" aria-pressed={rpm < 40} onClick={() => { blip(700); setRpm(33.333); }}>33</button>
          <button className={`tt-btn tt-45 ${rpm > 40 ? 'on' : ''}`} type="button" aria-pressed={rpm > 40} onClick={() => { blip(760); setRpm(45); }}>45</button>
          <input className="tt-pitch" type="range" min="-8" max="8" step="0.1" value={pitch} aria-label="Pitch, minus 8 to plus 8 percent"
            onChange={(e) => { const v = Number(e.target.value); setPitch(Math.abs(v) < .35 ? 0 : v); }} />
        </div>
      </div>
      <div className="tt-readout"><span>Speed <b>{rpm > 40 ? '45' : '33⅓'}</b></span><span>Pitch <b>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}%</b></span><span>Playback <b>{Math.round(rate * 100)}%</b></span>{demo && <span>Demo beat</span>}</div>
    </>
  );
}

/* ============================== BEAT PAD ============================== */
const ROW_NAMES = { kick: 'Kick', clap: 'Clap', hat: 'Hat', open: 'Open' };
export function BeatPad() {
  const [grid, setGrid] = useState(() => ROWS.map((r) => [...pattern[r]]));
  const [on, setOn] = useState(beatOwner() === 'pad');
  const [bpm, setBpmState] = useState(92);
  const [now, setNow] = useState(-1);
  useEffect(() => onStep((i) => setNow(beatOwner() === 'pad' ? i : -1)), []);
  useEffect(() => () => beatStop('pad'), []);
  const toggleStep = (ri, i) => {
    const r = ROWS[ri]; pattern[r][i] = pattern[r][i] ? 0 : 1;
    if (pattern[r][i]) hit(r);
    setGrid(ROWS.map((x) => [...pattern[x]]));
  };
  const play = () => { if (on) { beatStop('pad'); setOn(false); } else { beatStart('pad', { bpm, onStop: () => setOn(false) }); setOn(true); } };
  return (
    <div className="pad-unit"><div className="pad">
      <div className="pad-top">
        <button className="btn primary" type="button" onClick={play} aria-pressed={on}>{on ? 'Stop' : 'Play'}</button>
        <button className="btn" type="button" onClick={() => { ROWS.forEach((r) => pattern[r].fill(0)); setGrid(ROWS.map((x) => [...pattern[x]])); }}>Clear</button>
        <label className="tempo">Tempo <input type="range" min="70" max="140" value={bpm} onChange={(e) => { const v = +e.target.value; setBpmState(v); if (beatOwner() === 'pad') setBpm(v); }} /> <output>{bpm}</output></label>
        <span className="engrave" style={{ marginLeft: 'auto' }}>Rhythm composer · 16 step</span>
      </div>
      {ROWS.map((r, ri) => (
        <div className="pad-row" key={r}>
          <span>{ROW_NAMES[r]}</span>
          {grid[ri].map((v, i) => (
            <button key={i} type="button" className={`step g${Math.floor(i / 4) + 1} ${v ? 'on' : ''} ${now === i ? 'now' : ''}`} aria-pressed={!!v} aria-label={`${ROW_NAMES[r]} step ${i + 1}`} onClick={() => toggleStep(ri, i)} />
          ))}
        </div>
      ))}
      <div className="steps-index"><span />{Array.from({ length: 16 }, (_, i) => <i key={i}>{i + 1}</i>)}</div>
    </div></div>
  );
}

/* ============================== ERAS ============================== */
// How an era's picture is shown: mono (black and white), color (as is) or gold (the powered-up glow).
const LOOKS = { mono: 'grayscale(1) contrast(1.05)', gold: 'brightness(1.08) drop-shadow(0 0 2px #fff6d8) drop-shadow(0 0 12px rgba(255, 205, 100, .85))' };
export function Eras({ eras, character }) {
  const list = eras.length ? eras : [{ year: 'Now', name: 'Today' }];
  const [era, setEra] = useState(list.length - 1);
  const [turn, setTurn] = useState(-(list.length - 1) * (360 / list.length));
  const [pulled, setPulled] = useState(false);
  const step = 360 / list.length;
  const go = (i) => { let d = ((i - era) % list.length + list.length) % list.length; if (d === 0 && i !== era) d = list.length; setTurn((t) => t - d * step); setEra(i); };
  const e = list[era];
  const img = e.image || character;
  return (
    <>
      <div className="eras">
        <div className="orbit">
          <div className="orbit-ring" />
          <div className="orbit-spin" style={{ transform: `rotate(${turn}deg)` }}>
            {list.map((x, i) => {
              const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <button key={i} type="button" className={`era-node ${i === era ? 'on' : ''}`} aria-pressed={i === era} aria-label={`${x.year}: ${x.name}`}
                  style={{ left: `${50 + Math.cos(a) * 43}%`, top: `${50 + Math.sin(a) * 43}%`, transform: `translate(-50%, -50%) rotate(${-turn}deg)` }}
                  onClick={() => { blip(520 + i * 80); go(i); }}>{x.year}</button>
              );
            })}
          </div>
          <div className="era-center" style={{ '--glow': ['#2a2a2f', '#3b2f1d', '#1f2c2b', '#4a3713'][era % 4] }}>
            <img src={characterOr(img)} alt="" style={{ filter: LOOKS[e.look] || 'none' }} />
            <div className="era-cap"><div className="era-year">{e.year}</div><div className="era-name">{e.name}</div></div>
          </div>
        </div>
        <div className="lever">
          <div className="lever-plate brushed"><Screws /><div className="lever-slot" />
            <button className={`lever-arm ${pulled ? 'pulled' : ''}`} type="button" aria-label="Pull the lever for the next era"
              onClick={() => { setPulled(true); blip(240); setTimeout(() => { setPulled(false); go((era + 1) % list.length); blip(980); }, 260); }} />
          </div>
          <div className="lever-lights" aria-hidden="true">{list.map((_, i) => <span key={i} className={`led ${i <= era ? 'on' : ''}`} />)}</div>
        </div>
      </div>
      <div className="era-text" aria-live="polite"><strong>{e.year} · {e.name}</strong><p>{e.story || 'The story of this era goes here, in the artist\'s words.'}</p></div>
    </>
  );
}

/* ============================== POWER UP ============================== */
export function PowerUp({ power, character }) {
  const [charge, setCharge] = useState(0);
  const canvas = useRef(null), stage = useRef(null);
  const live = useRef(0); live.current = charge;
  const up = charge >= 8;
  const add = () => setCharge((c) => { if (c >= 8) return c; const n = c + 1; blip(300 + n * 90); if (n === 8) { blip(1320); setTimeout(() => blip(1760), 90); } return n; });
  useEffect(() => {
    const onKey = (e) => { if (e.code !== 'Space' || /INPUT|BUTTON|TEXTAREA/.test(e.target.tagName)) return; const r = stage.current?.getBoundingClientRect(); if (!r || r.bottom < 0 || r.top > innerHeight) return; e.preventDefault(); add(); };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const c = canvas.current, ctx = c.getContext('2d'); let raf = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { const r = c.getBoundingClientRect(); c.width = r.width * dpr; c.height = r.height * dpr; };
    size(); addEventListener('resize', size);
    const sparks = Array.from({ length: 60 }, () => ({ a: Math.random() * 6.28, d: Math.random(), s: .4 + Math.random(), y: Math.random() }));
    const rm = reduce();
    const draw = (time) => {
      const t = time / 1000, w = c.width, h = c.height, lv = live.current / 8, isUp = live.current >= 8;
      ctx.clearRect(0, 0, w, h); ctx.save(); ctx.translate(w / 2, h * .62);
      for (let i = 0; i < 70; i++) {
        const a = i * 2.39996 + (rm ? 0 : t * (.1 + lv * .6)) * (i % 2 ? 1 : -1), r0 = (.18 + ((i * 37) % 30) / 100) * w, len = (.12 + lv * .4 + (i % 5) * .03) * w;
        ctx.strokeStyle = isUp ? `rgba(255, ${210 + (i % 40)}, 130, ${.1 + lv * .22})` : `rgba(200, 205, 220, ${.04 + lv * .16})`;
        ctx.lineWidth = (1 + (i % 3)) * dpr; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len)); ctx.stroke();
      }
      ctx.restore();
      if (lv > 0) {
        const cx = w / 2, cy = h * .58;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2, wob = rm ? 0 : Math.sin(a * 6 + t * (4 + k) + k) * .05 + Math.sin(a * 11 - t * 7) * .03, upw = Math.max(0, -Math.sin(a)) * (.35 + lv * .25); const x = cx + Math.cos(a) * w * (.26 + lv * .1 + k * .03) * (1 + wob), y = cy + Math.sin(a) * h * (.4 + lv * .06 + k * .025) * (1 + wob + upw * .6); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          const g = ctx.createRadialGradient(cx, cy, w * .05, cx, cy, w * .5), col = isUp ? '255, 200, 80' : '200, 205, 225';
          g.addColorStop(0, `rgba(${col}, 0)`); g.addColorStop(.55, `rgba(${col}, ${.17 * lv})`); g.addColorStop(1, `rgba(${col}, 0)`); ctx.fillStyle = g; ctx.fill();
        }
        for (const s of sparks) { if (s.d > lv) continue; s.y = rm ? s.y : (s.y + .004 * s.s) % 1; ctx.fillStyle = isUp ? `rgba(255, 238, 190, ${1 - s.y})` : `rgba(220, 225, 240, ${1 - s.y})`; ctx.fillRect(cx + Math.cos(s.a) * w * .3 * s.d, h * (.95 - s.y * .9), 2 * dpr, 6 * dpr); }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, []);
  return (
    <div className="two">
      <div className={`p-stage ${up ? 'up' : ''}`} ref={stage}>
        <canvas ref={canvas} aria-hidden="true" />
        <span className="p-tag">{power.tag || 'Ascended'}</span>
        <img src={characterOr(character)} alt={up ? 'The artist in golden form' : 'The artist. Tap to charge.'} onClick={add} />
      </div>
      <div>
        <p className="label">Charge</p>
        <div className="ladder" role="group" aria-label="Charge ladder">{Array.from({ length: 8 }, (_, i) => <button key={i} type="button" className={`seg ${i < charge ? 'on' : ''}`} aria-label={`Charge ${i + 1}`} onClick={add} />)}</div>
        <div className="ladder-scale">{Array.from({ length: 8 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
        <div className="push-row">
          <button className="push" type="button" onClick={add}>Charge</button>
          <button className="btn" type="button" onClick={() => { setCharge(0); blip(200); }}>Power down</button>
          <span className="mute small">Tap the figure, the ladder, or press Space.</span>
        </div>
      </div>
    </div>
  );
}

/* ============================== STUDIO ============================== */
const SPOTS = { chair: { x: 21, say: 'Taking a seat.', sit: true }, mic: { x: 34, say: 'Laying down a verse.' }, desk: { x: 60, say: 'Writing the next bar…' }, table: { x: 74, say: 'Soup break.' }, records: { x: 88, say: 'Spinning a record.', play: true } };
export function Studio({ heroImage, character, tracks, name }) {
  const p = usePlayer();
  const [at, setAt] = useState(45);
  const [walk, setWalk] = useState({ on: false, left: false, dur: 0 });
  const [sit, setSit] = useState(false);
  const [bubble, setBubble] = useState('');
  const [status, setStatus] = useState(`${name || 'The artist'} is in the middle of the room.`);
  const [hop, setHop] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const walkTo = (spot) => {
    const s = SPOTS[spot]; clearTimeout(timer.current); setBubble(''); setSit(false);
    const dur = reduce() ? 10 : Math.max(400, Math.abs(s.x - at) * 55);
    setWalk({ on: true, left: s.x < at, dur }); setAt(s.x);
    setStatus(`Walking to the ${spot === 'records' ? 'record player' : spot}.`);
    timer.current = setTimeout(() => {
      setWalk((w) => ({ ...w, on: false })); if (s.sit) setSit(true); setBubble(s.say); setStatus(s.say);
      if (s.play) { if (tracks.length) { if (!p.playing) { p.setRate(1); p.current ? p.play() : p.playAt(tracks, 0); } } else beatStart('studio', { bass: true }); }
    }, dur);
  };
  const hi = () => { setHop((h) => h + 1); const lines = ['What up!', 'Welcome in.', 'Pull the lever, see the eras.']; const l = lines[Math.floor(Math.random() * lines.length)]; setBubble(l); setStatus(l); };
  useEffect(() => () => beatStop('studio'), []);
  const tr = `left ${walk.dur}ms linear`;
  return (
    <>
      <div className="room">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            <linearGradient id="sa-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e1e22" /><stop offset="1" stopColor="#151518" /></linearGradient>
            <linearGradient id="sa-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b2c20" /><stop offset="1" stopColor="#211810" /></linearGradient>
            <radialGradient id="sa-lamp" cx=".5" cy="0" r=".9"><stop offset="0" style={{ stopColor: 'var(--accent)' }} stopOpacity=".45" /><stop offset="1" style={{ stopColor: 'var(--accent)' }} stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="1600" height="800" fill="url(#sa-wall)" />
          <rect x="560" y="70" width="460" height="300" rx="6" fill="#0f0f12" stroke="#2a2a31" strokeWidth="4" />
          {heroImage && <image href={heroImage} x="566" y="76" width="448" height="252" preserveAspectRatio="xMidYMid slice" opacity=".75" />}
          <polygon points="1250,0 1310,0 1440,620 1120,620" fill="url(#sa-lamp)" /><rect x="1262" y="0" width="36" height="34" fill="#0b0b0d" />
          <rect y="600" width="1600" height="200" fill="url(#sa-floor)" />
          <g stroke="#1a120c" strokeWidth="3" opacity=".7"><line x1="0" y1="650" x2="1600" y2="650" /><line x1="0" y1="710" x2="1600" y2="710" /><line x1="0" y1="770" x2="1600" y2="770" /></g>
          <g transform="translate(150 470)"><rect width="150" height="40" rx="10" fill="#3a3a42" /><rect y="-150" width="30" height="190" rx="10" fill="#2c2c31" /><rect x="10" y="40" width="10" height="100" fill="#0b0b0d" /><rect x="130" y="40" width="10" height="100" fill="#0b0b0d" /></g>
          <g transform="translate(520 300)"><rect x="-4" y="40" width="8" height="300" fill="#9fa0a6" /><ellipse cx="0" cy="340" rx="60" ry="12" fill="#0b0b0d" /><rect x="-18" y="0" width="36" height="56" rx="18" fill="#2c2c31" /><rect x="-14" y="6" width="28" height="30" rx="14" fill="#8c8d93" /></g>
          <g transform="translate(800 470)"><rect width="240" height="22" rx="5" fill="#5a3f2a" /><rect x="14" y="22" width="12" height="110" fill="#3b2a1e" /><rect x="214" y="22" width="12" height="110" fill="#3b2a1e" /><rect x="60" y="-14" width="90" height="16" rx="3" fill="#ebe7df" /><rect x="160" y="-10" width="50" height="6" rx="3" style={{ fill: 'var(--accent)' }} transform="rotate(-15 160 -10)" /></g>
          <g transform="translate(1110 500)"><ellipse cx="80" rx="100" ry="18" fill="#3a3a42" /><rect x="72" width="16" height="100" fill="#0b0b0d" /><ellipse cx="80" cy="100" rx="50" ry="10" fill="#0b0b0d" /><path d="M50 -22 h60 a30 22 0 0 1 -60 0z" fill="#ebe7df" /><path d="M66 -34 q6 -12 0 -24 M82 -36 q6 -12 0 -24 M98 -34 q6 -12 0 -24" stroke="#ebe7df" strokeWidth="3" fill="none" opacity=".5" /></g>
          <g transform="translate(1400 470)"><rect width="160" height="130" rx="8" fill="#2c2c31" /><rect x="10" y="-30" width="140" height="30" rx="5" fill="#1d1d21" /><ellipse cx="80" cy="-30" rx="58" ry="10" fill="#0b0b0d" /><ellipse cx="80" cy="-30" rx="14" ry="3" style={{ fill: 'var(--accent)' }} /><circle cx="40" cy="70" r="20" fill="#1d1d21" /><circle cx="120" cy="70" r="20" fill="#1d1d21" /></g>
        </svg>
        {[['chair', 14, 36, 14, 44], ['mic', 32.5, 34, 9, 48], ['desk', 57.5, 52, 16, 28], ['table', 74, 52, 13, 28], ['records', 92.5, 52, 11, 30]].map(([id, l, t, w, h]) => (
          <button key={id} className="hot" type="button" style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }} onClick={() => walkTo(id)}><span>{id === 'table' ? 'Soup' : id === 'records' ? 'Records' : id[0].toUpperCase() + id.slice(1)}</span></button>
        ))}
        <div key={hop} className={`walker ${walk.left ? 'left' : ''} ${walk.on ? 'walking' : ''} ${sit ? 'sit' : ''} ${hop ? 'hop' : ''}`} style={{ left: `${at}%`, transition: tr }}
          role="button" tabIndex={0} aria-label="The artist. Tap to say hi." onClick={hi} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hi(); } }}>
          <img src={characterOr(character)} alt="" />
        </div>
        {bubble && <div className="bubble" style={{ left: `${at}%`, transition: tr }}>{bubble}</div>}
      </div>
      <p className="mute small" aria-live="polite" style={{ margin: '10px 0 0' }}>{status}</p>
    </>
  );
}

/* ============================== LINER NOTES ============================== */
export function LinerNotes({ notes, name }) {
  const story = String(notes.story || '').split(/\n\s*\n/).filter(Boolean);
  const credits = (notes.credits || []).filter((c) => c.label);
  return (
    <div className="gatefold">
      <div>
        <h4>The story</h4>
        {story.length ? story.map((s, i) => <p key={i} className="story">{s}</p>) : (
          <><p>{name ? `${name}'s` : 'The artist\'s'} words go here: the cities, the people, the eras, the album.</p><div className="ghost-line" style={{ width: '96%' }} /><div className="ghost-line" style={{ width: '88%' }} /><div className="ghost-line" style={{ width: '62%' }} /></>
        )}
      </div>
      <div><h4>Credits</h4><dl className="credits">{credits.map((c, i) => <div key={i} style={{ display: 'contents' }}><dt>{c.label}</dt><dd className={c.value ? 'set' : ''}>{c.value || 'to come'}</dd></div>)}</dl></div>
    </div>
  );
}

/* ============================== COLLECT ============================== */
export function Collect({ collect }) {
  return (
    <>
      <div className="formats">
        <div className="fmt"><div className="fmt-art"><svg viewBox="0 0 200 130" aria-hidden="true"><rect x="4" y="4" width="192" height="122" rx="10" fill="#232327" stroke="#3a3a42" strokeWidth="2" /><rect x="18" y="14" width="164" height="64" rx="6" fill="#efe9dc" /><rect x="18" y="14" width="164" height="12" rx="5" style={{ fill: 'var(--accent)' }} /><rect x="56" y="38" width="88" height="32" rx="16" fill="#0d0d10" /><g className="reel"><circle cx="76" cy="54" r="10" fill="#efe9dc" /><circle cx="76" cy="54" r="4" fill="#0d0d10" /></g><g className="reel"><circle cx="124" cy="54" r="10" fill="#efe9dc" /><circle cx="124" cy="54" r="4" fill="#0d0d10" /></g></svg></div><div><h4>Cassette</h4><p>Side A, side B.</p></div></div>
        <div className="fmt"><div className="fmt-art"><div className="disc cd" role="img" aria-label="Spinning CD" /></div><div><h4>CD</h4><p>The full album.</p></div></div>
        <div className="fmt"><div className="fmt-art"><div className="disc vinyl" role="img" aria-label="Spinning vinyl record" /></div><div><h4>Vinyl</h4><p>Made to keep.</p></div></div>
      </div>
      {(collect.items || []).length > 0 && <div className="chips">{collect.items.map((c) => <span key={c}>{c}</span>)}</div>}
    </>
  );
}

export { audio };
