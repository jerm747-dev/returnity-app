// Music in the arcade: the site's songs keep playing on the shelf and inside games, and a small
// music player opens over either one (the in-game mini player from jerm747.com, rebuilt here).
//
// The cabinet is its own page (/games/), so it has its own <audio>. When someone comes over from
// the music player, the song they were on is handed over through localStorage and carries on
// with their first tap or key press; going back to Music hands it back the same way.
//
// Opening it:
//   shelf      Music button in the top bar, Start on a controller, M on a keyboard
//   in a game  Music button in the game toolbar, or the game asks (its own pause screen):
//     game → arcade  sound-arcade-music-hello   is there music here? (we answer -ready)
//     game → arcade  sound-arcade-music-open    open the music player (jerm747-music-open works too)
//     arcade → game  sound-arcade-music-opened / -closed   so the game can pause and take focus back
// Inside it: arrows or the d-pad move, A/Enter picks, Y/Space play-pause, LB/RB or Q/E skip, B/Esc closes.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { coverSvg, colorFor, initials, svgDataUrl } from '../../../shared/covers.js';
import { cfg } from './config.js';
import { BTN } from './input.js';

const HANDOFF = 'sound-arcade.nowPlaying';
const VOL_KEY = 'sound-arcade.volume';
const Ctx = createContext(null);
export const useMusic = () => useContext(Ctx);

const readHandoff = () => { try { return JSON.parse(localStorage.getItem(HANDOFF) || 'null'); } catch { return null; } };
const fmt = (s) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

export function MusicProvider({ children }) {
  const audio = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [open, setOpen] = useState(false);
  const [volume, setVolumeState] = useState(() => { try { return Number(localStorage.getItem(VOL_KEY) ?? 1); } catch { return 1; } });
  const pendingSeek = useRef(0);
  const current = tracks[index] || null;

  if (!audio.current && typeof Audio !== 'undefined') { audio.current = new Audio(); audio.current.preload = 'metadata'; }

  // Songs live one folder up (the music player's tracks.json and audio/)
  useEffect(() => {
    let off = false;
    fetch('tracks.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => {
      if (off || !Array.isArray(list)) return;
      const fixed = list.map((t) => ({ ...t, src: /^(https?:|\/)/.test(t.url || '') ? t.url : `../${t.url}` }));
      setTracks(fixed);
      const h = readHandoff();
      const i = h ? fixed.findIndex((t) => t.id === h.id) : -1;
      if (i >= 0) {
        pendingSeek.current = h.time || 0;
        setIndex(i);
        // Carry on with the first tap or key press if it was playing a moment ago
        if (h.playing && Date.now() - (h.at || 0) < 10 * 60 * 1000) {
          const go = () => { audio.current?.play().catch(() => {}); };
          window.addEventListener('pointerdown', go, { once: true, capture: true });
          window.addEventListener('keydown', go, { once: true, capture: true });
        }
      }
    });
    return () => { off = true; };
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a || !current) return;
    if (!a.src.endsWith(current.src)) {
      a.src = current.src; setTime(0); setDuration(0);
      if (pendingSeek.current) { const t = pendingSeek.current; pendingSeek.current = 0; a.addEventListener('loadedmetadata', () => { a.currentTime = Math.min(t, a.duration || t); }, { once: true }); return; }
    }
    a.play().catch(() => setPlaying(false));
  }, [current]);

  const next = useCallback(() => {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) { let j; do j = Math.floor(Math.random() * tracks.length); while (j === index); setIndex(j); return; }
    setIndex((i) => (i + 1) % tracks.length);
  }, [tracks.length, index, shuffle]);
  const prev = useCallback(() => {
    const a = audio.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    setIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);
  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (!current && tracks.length) { setIndex(0); return; }
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }, [current, tracks.length]);
  const playIndex = useCallback((i) => {
    if (i === index) { audio.current?.play().catch(() => {}); return; }
    setIndex(i);
  }, [index]);
  const seek = useCallback((t) => { const a = audio.current; if (a) a.currentTime = Math.max(0, Math.min(t, a.duration || t)); }, []);
  const setVolume = useCallback((v) => { setVolumeState(v); try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* storage off */ } }, []);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return undefined;
    let last = 0;
    let leaving = false; // the browser pauses audio while a page unloads; keep the last real state
    const save = (force) => {
      if (leaving || !current || (!force && Date.now() - last < 2000)) return;
      last = Date.now();
      try { localStorage.setItem(HANDOFF, JSON.stringify({ id: current.id, time: a.currentTime, playing: !a.paused, at: Date.now() })); } catch { /* storage off */ }
    };
    const on = {
      play: () => { setPlaying(true); save(true); },
      pause: () => { setPlaying(false); setTimeout(() => save(true), 250); }, // a page that's leaving pauses its audio first; this never runs then
      timeupdate: () => { setTime(a.currentTime); save(false); },
      durationchange: () => setDuration(a.duration || 0),
      ended: () => next(),
    };
    for (const [k, f] of Object.entries(on)) a.addEventListener(k, f);
    const leave = () => { save(true); leaving = true; };
    window.addEventListener('pagehide', leave);
    return () => { for (const [k, f] of Object.entries(on)) a.removeEventListener(k, f); window.removeEventListener('pagehide', leave); };
  }, [current, next]);

  // Lock screen / headset buttons
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: (current.artists || []).join(', ') || cfg().site?.artist || '' });
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
    } catch { /* not supported */ }
  }, [current, next, prev]);

  const value = useMemo(() => ({ tracks, current, index, playing, time, duration, shuffle, volume, open, setOpen, next, prev, toggle, playIndex, seek, setShuffle, setVolume }),
    [tracks, current, index, playing, time, duration, shuffle, volume, open, next, prev, toggle, playIndex, seek, setVolume]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const coverCache = new Map();
export function coverOf(t) {
  if (!t) return '';
  const albums = cfg().music?.albums || [];
  const album = albums.find((a) => a.id === t.album);
  if (album?.cover) return /^(https?:|data:|\/)/.test(album.cover) ? album.cover : `../${album.cover}`;
  if (coverCache.has(t.id)) return coverCache.get(t.id);
  const c = cfg().music?.covers || {};
  const url = svgDataUrl(coverSvg({ id: t.id, color: album?.color || colorFor(t.id, c.colors), mark: c.mark || initials(cfg().site?.artist || cfg().site?.name), markStyle: c.markStyle || 'auto' }));
  coverCache.set(t.id, url);
  return url;
}

/** The ♪ button for the shelf's top bar and the game toolbar: shows what's playing */
export function MusicButton() {
  const m = useMusic();
  if (!m.tracks.length) return null;
  return (
    <button className={`sb-btn music-btn ${m.playing ? 'is-playing' : ''}`} onClick={() => m.setOpen(true)} title="Music (Start on a controller, M on a keyboard)">
      <span className="music-eq" aria-hidden="true"><i /><i /><i /></span>
      <span className="music-btn-text">{m.current && m.playing ? m.current.title : 'Music'}</span>
    </button>
  );
}

/** The music player over the shelf or the game */
export function MusicPanel({ inGame = false }) {
  const m = useMusic();
  const dlg = useRef(null);
  const listRef = useRef(null);
  const [q, setQ] = useState('');
  const [album, setAlbum] = useState('');
  const albums = (cfg().music?.albums || []).filter((a) => m.tracks.some((t) => t.album === a.id));
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return m.tracks.map((t, i) => ({ t, i })).filter(({ t }) => (!album || t.album === album) && (!s || `${t.title} ${(t.artists || []).join(' ')}`.toLowerCase().includes(s)));
  }, [m.tracks, q, album]);
  const live = useRef(m);
  live.current = m;

  useEffect(() => {
    const d = dlg.current;
    if (!d) return undefined;
    d.showModal();
    document.body.dataset.viewer = 'music';
    requestAnimationFrame(() => {
      const on = listRef.current?.querySelector('.is-on') || d.querySelector('.mp-play');
      on?.scrollIntoView({ block: 'nearest' });
      d.querySelector('.mp-play')?.focus();
    });
    return () => { document.body.dataset.viewer = ''; if (d.open) d.close(); };
  }, []);

  // Keyboard and controller inside the panel
  useEffect(() => {
    const d = dlg.current;
    const focusables = () => [...d.querySelectorAll('button:not([disabled]), input, select, a[href]')].filter((el) => el.offsetParent !== null);
    const move = (dir) => {
      const list = focusables(); const i = list.indexOf(document.activeElement);
      const el = list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i + dir)))];
      el?.focus(); el?.scrollIntoView({ block: 'nearest' });
    };
    const onKey = (e) => {
      const typing = /^(INPUT|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range';
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); live.current.setOpen(false); return; }
      if (typing) return;
      const k = e.key.toLowerCase();
      if (k === 'q') { e.preventDefault(); live.current.prev(); }
      else if (k === 'e') { e.preventDefault(); live.current.next(); }
      else if (k === 'm') { e.preventDefault(); live.current.setOpen(false); }
      else if (k === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); live.current.toggle(); }
      else if (e.key === 'ArrowDown' && e.target.type !== 'range') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp' && e.target.type !== 'range') { e.preventDefault(); move(-1); }
      e.stopPropagation();
    };
    d.addEventListener('keydown', onKey);
    const onCancel = (e) => { e.preventDefault(); live.current.setOpen(false); };
    d.addEventListener('cancel', onCancel);

    let raf = 0; const held = new Set(); let repeatAt = 0; let first = true;
    const loop = (now) => {
      let pad = null;
      try { pad = Array.from(navigator.getGamepads?.() || []).find(Boolean); } catch { /* none */ }
      if (pad) {
        const b = (i) => !!(pad.buttons[i]?.pressed || pad.buttons[i]?.value > 0.5);
        const [, ay = 0] = pad.axes || [];
        const state = { up: b(BTN.UP) || ay < -0.5, down: b(BTN.DOWN) || ay > 0.5, a: b(BTN.A), b: b(BTN.B), y: b(BTN.Y), lb: b(BTN.LB), rb: b(BTN.RB), start: b(BTN.START) };
        if (first) { Object.entries(state).forEach(([k, v]) => v && held.add(k)); first = false; } // the press that opened us
        for (const [k, v] of Object.entries(state)) {
          if (!v) { held.delete(k); continue; }
          const fresh = !held.has(k);
          const rep = (k === 'up' || k === 'down') && now > repeatAt;
          if (!fresh && !rep) continue;
          held.add(k); repeatAt = now + (fresh ? 380 : 110);
          if (k === 'up') move(-1);
          if (k === 'down') move(1);
          if (k === 'a') document.activeElement?.click?.();
          if (k === 'b' || k === 'start') live.current.setOpen(false);
          if (k === 'y') live.current.toggle();
          if (k === 'lb') live.current.prev();
          if (k === 'rb') live.current.next();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); d.removeEventListener('keydown', onKey); d.removeEventListener('cancel', onCancel); };
  }, []);

  const c = m.current;
  const site = cfg().site || {};
  return (
    <dialog ref={dlg} className="mp" aria-label="Music" onClick={(e) => { if (e.target === dlg.current) m.setOpen(false); }}>
      <div className="mp-box">
        <header className="mp-head">
          <span className="mp-kicker">{inGame ? 'Game paused · music' : 'Music'}</span>
          <button className="mp-x" onClick={() => m.setOpen(false)} aria-label="Close music">×</button>
        </header>

        <div className="mp-now">
          <img className="mp-cover" src={coverOf(c || m.tracks[0])} alt="" />
          <div className="mp-meta">
            <strong>{c ? c.title : 'Pick a song'}</strong>
            <span>{c ? [(c.artists || []).join(', ') || site.artist, c.bpm && `${c.bpm} BPM`].filter(Boolean).join(' · ') : `${m.tracks.length} songs`}</span>
            <div className="mp-seek">
              <small>{fmt(m.time)}</small>
              <input type="range" min="0" max={m.duration || 0} step="0.5" value={Math.min(m.time, m.duration || 0)} onChange={(e) => m.seek(Number(e.target.value))} aria-label="Position" disabled={!c} />
              <small>{fmt(m.duration)}</small>
            </div>
          </div>
        </div>
        <div className="mp-ctl">
          <button onClick={m.prev} aria-label="Previous song" disabled={!c}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
          </button>
          <button className="mp-play" onClick={m.toggle} aria-label={m.playing ? 'Pause' : 'Play'}>
            {m.playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>}
          </button>
          <button onClick={m.next} aria-label="Next song" disabled={!c}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
          </button>
          <button className={m.shuffle ? 'is-on' : ''} onClick={() => m.setShuffle(!m.shuffle)} aria-pressed={m.shuffle} aria-label="Shuffle">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.5c2.3 0 3.6 1 5 3.2l1.2 1.8c1.2 1.8 2.1 2.6 4 2.6H20M17 12l3 2.6-3 2.4M4 17h3.5c1.6 0 2.6-.6 3.6-1.8M14.6 8.6c.9-1 1.9-1.6 3.4-1.6H20M17 4.6 20 7l-3 2.4" /></svg>
          </button>
          <label className="mp-vol"><span className="sr">Volume</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6" /></svg>
            <input type="range" min="0" max="1" step="0.05" value={m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label="Volume" />
          </label>
        </div>

        <div className="mp-filter">
          <input type="search" placeholder={`Search ${m.tracks.length} songs`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search songs" />
          {albums.length > 0 && (
            <select value={album} onChange={(e) => setAlbum(e.target.value)} aria-label="Album">
              <option value="">All songs</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          )}
        </div>
        <ol className="mp-list" ref={listRef}>
          {shown.map(({ t, i }) => (
            <li key={t.id} className={i === m.index ? 'is-on' : ''}>
              <button onClick={() => m.playIndex(i)} aria-current={i === m.index ? 'true' : undefined}>
                <img src={coverOf(t)} alt="" loading="lazy" />
                <span><b>{t.title}</b><small>{[(t.artists || []).join(', '), t.bpm && `${t.bpm} BPM`].filter(Boolean).join(' · ')}</small></span>
                {i === m.index && m.playing && <span className="music-eq is-playing" aria-label="Playing"><i /><i /><i /></span>}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="mp-empty">{m.tracks.length ? 'No songs match.' : 'No songs on this site yet.'}</li>}
        </ol>

        <footer className="mp-foot">
          <span className="mp-keys">{inGame ? 'B or Esc returns to the game' : 'B or Esc closes'} · LB/RB skip · Y play/pause</span>
          <a href="../#/music">{inGame ? 'Full library (leaves the game) ↗' : 'Full library ↗'}</a>
        </footer>
      </div>
    </dialog>
  );
}
