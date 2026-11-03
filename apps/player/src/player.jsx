import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { coverOf, config, tracks } from './data.js';

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);

const VOL_KEY = 'sound-arcade.volume';
// The song in progress, shared with the game cabinet (/games/), so music carries between the two
const HANDOFF = 'sound-arcade.nowPlaying';
const readHandoff = () => { try { return JSON.parse(localStorage.getItem(HANDOFF) || 'null'); } catch { return null; } };

/** One <audio> for the whole site: queue, play/pause, next/previous, seek, shuffle, lock-screen controls */
export function PlayerProvider({ children }) {
  const audio = useRef(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [error, setError] = useState('');
  const [volume, setVolumeState] = useState(() => { try { return Number(localStorage.getItem(VOL_KEY) ?? 1); } catch { return 1; } });
  const current = queue[index] || null;

  if (!audio.current && typeof Audio !== 'undefined') { audio.current = new Audio(); audio.current.preload = 'metadata'; }

  // Coming back from the arcade: pick up the song where it was. It keeps playing if the browser
  // allows it; otherwise it waits on the player bar for a tap.
  const resume = useRef(null);
  useEffect(() => {
    const h = readHandoff();
    const i = h ? tracks.findIndex((t) => t.id === h.id) : -1;
    if (i < 0) return;
    resume.current = { time: h.time || 0, play: !!h.playing && Date.now() - (h.at || 0) < 10 * 60 * 1000 };
    setQueue(tracks); setIndex(i);
  }, []);

  const playAt = useCallback((list, i) => {
    setQueue(list);
    setIndex(i);
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a || !current) return;
    setError('');
    const src = current.url;
    if (!a.src.endsWith(src)) { const r = a.playbackRate; a.src = src; a.playbackRate = r; setTime(0); setDuration(0); }
    const r = resume.current; resume.current = null;
    if (r) { a.addEventListener('loadedmetadata', () => { a.currentTime = Math.min(r.time, a.duration || r.time); }, { once: true }); if (!r.play) return; }
    a.play().catch(() => setPlaying(false));
  }, [current]);

  const next = useCallback(() => {
    if (!queue.length) return;
    if (shuffle && queue.length > 1) { let j; do j = Math.floor(Math.random() * queue.length); while (j === index); setIndex(j); return; }
    setIndex((i) => (i + 1) % queue.length);
  }, [queue, index, shuffle]);

  const prev = useCallback(() => {
    const a = audio.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    setIndex((i) => (i - 1 + queue.length) % queue.length);
  }, [queue.length]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !current) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }, [current]);

  const seek = useCallback((t) => { if (audio.current) audio.current.currentTime = Math.max(0, Math.min(t, audio.current.duration || t)); }, []);
  const play = useCallback(() => { audio.current?.play().catch(() => {}); }, []);
  const pause = useCallback(() => { audio.current?.pause(); }, []);
  // Playback speed, for the turntable's 33/45 and pitch fader. Pitch follows speed, like vinyl.
  const [rate, setRateState] = useState(1);
  const setRate = useCallback((r) => {
    const a = audio.current; if (!a) return;
    const v = Math.max(0.5, Math.min(2, r));
    try { a.preservesPitch = v === 1; a.webkitPreservesPitch = v === 1; } catch { /* older browsers */ }
    a.playbackRate = v; setRateState(v);
  }, []);
  const setVolume = useCallback((v) => { setVolumeState(v); try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* storage off */ } }, []);

  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const on = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => setTime(a.currentTime),
      durationchange: () => setDuration(a.duration || 0),
      ended: () => next(),
      error: () => { setPlaying(false); setError("This song didn't load. Check that the file is in the audio folder on your server."); },
    };
    for (const [k, f] of Object.entries(on)) a.addEventListener(k, f);
    return () => { for (const [k, f] of Object.entries(on)) a.removeEventListener(k, f); };
  }, [next]);

  // Remember the song in progress for the game cabinet
  useEffect(() => {
    const a = audio.current;
    if (!a || !current) return undefined;
    let last = 0;
    let leaving = false; // the browser pauses audio while a page unloads; keep the last real state
    const save = (force) => {
      if (leaving || (!force && Date.now() - last < 2000)) return;
      last = Date.now();
      try { localStorage.setItem(HANDOFF, JSON.stringify({ id: current.id, time: a.currentTime, playing: !a.paused, at: Date.now() })); } catch { /* storage off */ }
    };
    const now = () => save(true); const tick = () => save(false);
    const bye = () => { save(true); leaving = true; };
    const paused = () => setTimeout(now, 250); // a page that's leaving pauses its audio first; this never runs then
    a.addEventListener('play', now); a.addEventListener('pause', paused); a.addEventListener('timeupdate', tick);
    window.addEventListener('pagehide', bye);
    return () => { a.removeEventListener('play', now); a.removeEventListener('pause', paused); a.removeEventListener('timeupdate', tick); window.removeEventListener('pagehide', bye); };
  }, [current]);

  // Lock screen / headphone controls
  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artists?.join(', ') || config.site?.artist || '',
      album: config.site?.name || '',
      artwork: [{ src: coverOf(current), sizes: '512x512', type: coverOf(current).startsWith('data:image/svg') ? 'image/svg+xml' : 'image/jpeg' }],
    });
    const h = { play: toggle, pause: toggle, previoustrack: prev, nexttrack: next };
    for (const [k, f] of Object.entries(h)) { try { navigator.mediaSession.setActionHandler(k, f); } catch { /* unsupported */ } }
  }, [current, toggle, prev, next]);

  // Space bar plays/pauses when you're not typing
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || /input|textarea|select|button/i.test(e.target.tagName) || !current) return;
      e.preventDefault(); toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, current]);

  const value = useMemo(() => ({ current, queue, index, playing, time, duration, volume, shuffle, error, rate, playAt, toggle, play, pause, next, prev, seek, setVolume, setShuffle, setRate }),
    [current, queue, index, playing, time, duration, volume, shuffle, error, rate, playAt, toggle, play, pause, next, prev, seek, setVolume, setRate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const clock = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
