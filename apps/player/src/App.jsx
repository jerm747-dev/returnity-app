import { useEffect, useMemo, useState } from 'react';
import { config, tracks, albums, coverOf, glowOf, albumCover } from './data.js';
import { usePlayer, clock } from './player.jsx';
import Home from './home/Home.jsx';

// ---------- routing: #/  #/song/<id>  #/album/<id>  #/about  #/contact ----------
function parse() {
  const [, page = '', id = ''] = window.location.hash.replace(/^#/, '').split('/');
  return { page, id: decodeURIComponent(id) };
}
function useRoute() {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => { setR(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

const site = () => config.site || {};
const gamesOn = () => config.games?.enabled !== false;
export const homeOn = () => config.home?.enabled !== false;
// With the artist home page on, the song library lives at #/music
export const musicHref = () => (homeOn() ? '#/music' : '#/');

// ---------- intro splash ----------
function shouldShowSplash() {
  const mode = config.splash?.show || 'visit';
  if (/[?&]intro=1/.test(location.search)) return true;
  try {
    if (mode === 'off') return false;
    if (mode === 'always') return true;
    if (mode === 'first') return !localStorage.getItem('sound-arcade.seen');
    return !sessionStorage.getItem('sound-arcade.seen');
  } catch { return mode !== 'off'; }
}

function Splash({ onDone }) {
  const s = config.splash || {};
  const g = s.gradient?.length >= 2 ? s.gradient : [config.theme?.accent || '#f5a524', '#ff4fd8', '#19c3ff'];
  const done = () => {
    try { sessionStorage.setItem('sound-arcade.seen', '1'); localStorage.setItem('sound-arcade.seen', '1'); } catch { /* storage off */ }
    onDone();
  };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.code === 'Space') { e.preventDefault(); done(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <button className="splash" onClick={done} style={{ '--g1': g[0], '--g2': g[1], '--g3': g[2] || g[0] }} aria-label="Enter the site">
      {s.image && <img className="splash-img" src={s.image} alt="" />}
      <span className="splash-title">{s.title || site().headerTitle || site().name}{!s.title && site().headerAccent && <b>{site().headerAccent}</b>}</span>
      {site().tagline && <span className="splash-tag">{site().tagline}</span>}
      <span className="splash-enter">{s.subtitle || 'Tap to enter'}</span>
    </button>
  );
}

// ---------- header + menu ----------
function Header({ onMenu }) {
  const s = site();
  const logo = config.theme?.logo;
  return (
    <header className="top">
      <a className="brand" href="#/" aria-label={`${s.name || 'Home'} home`}>
        {logo ? <img src={logo} alt="" className="brand-logo" /> : null}
        <span className="brand-title">{s.headerTitle || s.name}{s.headerAccent && <b>{s.headerAccent}</b>}</span>
      </a>
      <nav className="top-nav" aria-label="Main">
        {homeOn() && <a href="#/">Home</a>}
        <a href={musicHref()}>Music</a>
        {gamesOn() && <a href="games/">{config.games?.menuLabel || 'Games'}</a>}
        <a href="#/about">{config.about?.heading || 'About'}</a>
        <a href="#/contact">{config.contact?.heading || 'Contact'}</a>
      </nav>
      <button className={`menu-btn menu-btn--${config.theme?.menuIcon === 'dots' ? 'dots' : 'lines'}`} onClick={onMenu} aria-label="Open menu"><span /><span /><span /></button>
    </header>
  );
}

function Menu({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  const social = (config.social || []).filter((x) => x.url);
  return (
    <div className={`menu menu--${['left', 'top'].includes(config.theme?.menuSide) ? config.theme.menuSide : 'right'} ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={open ? undefined : ''} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <nav className="menu-panel" aria-label="Site menu" onClick={(e) => e.target.closest('a') && onClose()}>
        <button className="menu-close" onClick={onClose} aria-label="Close menu">×</button>
        <p className="menu-name">{site().name}</p>
        {homeOn() && <a href="#/">Home</a>}
        <a href={musicHref()}>All music <small>{tracks.length} songs</small></a>
        {albums.map((a) => <a key={a.id} href={`#/album/${a.id}`} style={{ '--c': a.color }} className="menu-album">{a.title}</a>)}
        {gamesOn() && <a href="games/">{config.games?.menuLabel || 'Games'}</a>}
        <a href="#/about">{config.about?.heading || 'About'}</a>
        <a href="#/contact">{config.contact?.heading || 'Contact'}</a>
        {social.length > 0 && <div className="menu-social">{social.map((x) => <a key={x.label} href={x.url} target="_blank" rel="noopener">{x.label}</a>)}</div>}
      </nav>
    </div>
  );
}

// ---------- library ----------
const TEMPOS = [
  { id: '', label: 'Any tempo' }, { id: '0-89', label: 'Under 90 BPM' }, { id: '90-109', label: '90–109 BPM' },
  { id: '110-129', label: '110–129 BPM' }, { id: '130-999', label: '130+ BPM' },
];
const SORTS = [{ id: 'order', label: 'Default order' }, { id: 'az', label: 'A–Z' }, { id: 'new', label: 'Newest' }, { id: 'bpm', label: 'Tempo' }];

function useFilters() {
  const [q, setQ] = useState('');
  const [tempo, setTempo] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('order');
  const years = useMemo(() => [...new Set(tracks.map((t) => t.date?.slice(0, 4)).filter(Boolean))].sort().reverse(), []);
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    let out = tracks.filter((t) => {
      if (words.length) { const hay = `${t.title} ${(t.artists || []).join(' ')}`.toLowerCase(); if (!words.every((w) => hay.includes(w))) return false; }
      if (tempo) { const [lo, hi] = tempo.split('-').map(Number); if (!t.bpm || Math.round(t.bpm) < lo || Math.round(t.bpm) > hi) return false; }
      if (year && !t.date?.startsWith(year)) return false;
      return true;
    });
    if (sort === 'az') out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'new') out = [...out].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (sort === 'bpm') out = [...out].sort((a, b) => (a.bpm || 999) - (b.bpm || 999));
    return out;
  }, [q, tempo, year, sort]);
  return { q, setQ, tempo, setTempo, year, setYear, sort, setSort, years, list };
}

function TrackRow({ t, list, i }) {
  const { current, playing, playAt, toggle } = usePlayer();
  const on = current?.id === t.id;
  const play = () => (on ? toggle() : playAt(list, i));
  const showTempo = config.music?.showTempo !== false && t.bpm;
  return (
    <li className={`row ${on ? 'is-on' : ''}`} style={{ '--glow': glowOf(t) }}>
      <button className="row-play" onClick={play} aria-label={`${on && playing ? 'Pause' : 'Play'} ${t.title}`}>
        <img src={coverOf(t)} alt="" loading="lazy" width="56" height="56" />
        <span className="row-icon" aria-hidden="true">{on && playing ? '❚❚' : '▶'}</span>
      </button>
      <a className="row-text" href={`#/song/${encodeURIComponent(t.id)}`}>
        <span className="row-title">{t.title}</span>
        <span className="row-meta">{(t.artists || []).join(', ')}{t.versions?.length > 1 && ` · ${t.versions.length} versions`}</span>
      </a>
      <span className="row-side">{showTempo ? `${Math.round(t.bpm)} BPM` : ''}{t.date && <small>{t.date.slice(0, 4)}</small>}</span>
    </li>
  );
}

function Library() {
  const f = useFilters();
  if (!tracks.length) {
    return (
      <main className="page">
        <div className="empty-lib">
          <h1>No songs yet</h1>
          <p>Put your audio files in the <code>music</code> folder, then run the setup page's <strong>Scan music</strong> button (or <code>npm run tracks</code>) and build again.</p>
        </div>
      </main>
    );
  }
  return (
    <main className="page">
      <section className="hero">
        <h1>{site().name}</h1>
        {site().tagline && <p>{site().tagline}</p>}
      </section>
      <div className="filters" role="search">
        <input type="search" value={f.q} onChange={(e) => f.setQ(e.target.value)} placeholder="Search songs and artists" aria-label="Search" />
        <select value={f.tempo} onChange={(e) => f.setTempo(e.target.value)} aria-label="Tempo">{TEMPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        {f.years.length > 1 && (
          <select value={f.year} onChange={(e) => f.setYear(e.target.value)} aria-label="Year">
            <option value="">Any year</option>{f.years.map((y) => <option key={y}>{y}</option>)}
          </select>
        )}
        <select value={f.sort} onChange={(e) => f.setSort(e.target.value)} aria-label="Sort">{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </div>
      <p className="count">{f.list.length === tracks.length ? `${tracks.length} songs` : `${f.list.length} of ${tracks.length} songs`}</p>
      {albums.length > 0 && !f.q && (
        <div className="album-strip">
          {albums.map((a) => (
            <a key={a.id} href={`#/album/${a.id}`} className="album-card" style={{ '--c': a.color }}>
              <img src={albumCover(a)} alt="" loading="lazy" /><span>{a.title}</span>
            </a>
          ))}
        </div>
      )}
      <ol className="rows">{f.list.map((t, i) => <TrackRow key={t.id} t={t} list={f.list} i={i} />)}</ol>
    </main>
  );
}

function SongPage({ id }) {
  const t = tracks.find((x) => x.id === id);
  const { current, playing, playAt, toggle } = usePlayer();
  if (!t) return <main className="page"><p>That song isn't here. <a href={musicHref()}>Back to the music</a></p></main>;
  const album = albums.find((a) => a.id === t.album);
  const playVersion = (v) => {
    const one = { ...t, id: `${t.id}~${v.label}`, url: v.url, title: t.versions.length > 1 ? `${t.title} (${v.label})` : t.title };
    playAt([one], 0);
  };
  const on = current?.id === t.id || current?.id?.startsWith(`${t.id}~`);
  return (
    <main className="page song" style={{ '--glow': glowOf(t) }}>
      <a className="back" href={musicHref()}>All music</a>
      <div className="song-head">
        <img className="song-cover" src={coverOf(t)} alt={`${t.title} cover`} />
        <div>
          <h1>{t.title}</h1>
          <p className="song-artists">{(t.artists || []).join(', ')}</p>
          <p className="song-meta">
            {album && <a href={`#/album/${album.id}`}>{album.title}</a>}
            {t.bpm && config.music?.showTempo !== false && <span>{Math.round(t.bpm)} BPM</span>}
            {t.date && <span>{t.date}</span>}
          </p>
          <button className="btn" onClick={() => (on ? toggle() : playAt([t], 0))}>{on && playing ? 'Pause' : 'Play'}</button>
        </div>
      </div>
      {t.versions?.length > 1 && (
        <section className="versions">
          <h2>Versions</h2>
          <ul>{t.versions.map((v) => <li key={v.file}><button className="link" onClick={() => playVersion(v)}>▶ {v.label}</button><span>{v.date}</span></li>)}</ul>
        </section>
      )}
    </main>
  );
}

function AlbumPage({ id }) {
  const a = albums.find((x) => x.id === id);
  const list = useMemo(() => tracks.filter((t) => t.album === id).sort((x, y) => (x.trackNo || 999) - (y.trackNo || 999)), [id]);
  const { playAt } = usePlayer();
  if (!a) return <main className="page"><p>That album isn't here. <a href={musicHref()}>Back to the music</a></p></main>;
  return (
    <main className="page album" style={{ '--glow': a.color }}>
      <a className="back" href={musicHref()}>All music</a>
      <div className="song-head">
        <img className="song-cover" src={albumCover(a)} alt={`${a.title} cover`} />
        <div>
          <h1>{a.title}</h1>
          <p className="song-artists">{a.artist || site().artist}</p>
          <p className="song-meta"><span>{list.length} songs</span></p>
          {list.length > 0 && <button className="btn" onClick={() => playAt(list, 0)}>Play album</button>}
        </div>
      </div>
      {list.length === 0 && <p className="muted">No songs yet. Files that start with "{a.prefix}" go on this album.</p>}
      <ol className="rows">{list.map((t, i) => <TrackRow key={t.id} t={t} list={list} i={i} />)}</ol>
    </main>
  );
}

const paras = (text) => String(text || '').split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>);

function About() {
  const a = config.about || {};
  return (
    <main className="page prose">
      <h1>{a.heading || 'About'}</h1>
      {a.photo && <img className="about-photo" src={a.photo} alt={site().realName || site().name} />}
      {paras(a.body)}
      {(site().realName || site().location) && <p className="muted">{[site().realName, site().location].filter(Boolean).join(' · ')}</p>}
    </main>
  );
}

function Contact() {
  const c = config.contact || {};
  const social = (config.social || []).filter((x) => x.url);
  return (
    <main className="page prose">
      <h1>{c.heading || 'Contact'}</h1>
      {c.workingOn && <p className="lead">{c.workingOn}</p>}
      {c.email && <p><a className="big-link" href={`mailto:${c.email}`}>{c.email}</a></p>}
      {c.phone && <p><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a></p>}
      {c.responseNote && <p className="muted">{c.responseNote}</p>}
      {social.length > 0 && <ul className="social">{social.map((x) => <li key={x.label}><a href={x.url} target="_blank" rel="noopener">{x.label}</a></li>)}</ul>}
    </main>
  );
}

// ---------- player bar ----------
function PlayerBar() {
  const p = usePlayer();
  if (!p.current) return null;
  const t = p.current;
  return (
    <div className="bar" style={{ '--glow': glowOf(t) }} role="region" aria-label="Player">
      <img className="bar-cover" src={coverOf(t)} alt="" />
      <div className="bar-info">
        <span className="bar-title">{t.title}</span>
        <span className="bar-artist">{(t.artists || []).join(', ')}</span>
      </div>
      <div className="bar-controls">
        <button onClick={() => p.setShuffle(!p.shuffle)} aria-pressed={p.shuffle} className={`bar-small ${p.shuffle ? 'is-on' : ''}`} aria-label="Shuffle">⤮</button>
        <button onClick={p.prev} aria-label="Previous">⏮</button>
        <button onClick={p.toggle} className="bar-main" aria-label={p.playing ? 'Pause' : 'Play'}>{p.playing ? '❚❚' : '▶'}</button>
        <button onClick={p.next} aria-label="Next">⏭</button>
      </div>
      <div className="bar-seek">
        <span>{clock(p.time)}</span>
        <input type="range" min="0" max={p.duration || 0} step="0.1" value={Math.min(p.time, p.duration || 0)} onChange={(e) => p.seek(Number(e.target.value))} aria-label="Seek" />
        <span>{clock(p.duration)}</span>
      </div>
      <input className="bar-vol" type="range" min="0" max="1" step="0.01" value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} aria-label="Volume" />
      {p.error && <p className="bar-error" role="alert">{p.error}</p>}
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const [splash, setSplash] = useState(shouldShowSplash);
  const { current } = usePlayer();

  useEffect(() => {
    const name = site().name || '';
    const t = route.page === 'song' ? tracks.find((x) => x.id === route.id)?.title
      : route.page === 'album' ? albums.find((x) => x.id === route.id)?.title
      : route.page === 'about' ? config.about?.heading || 'About'
      : route.page === 'contact' ? config.contact?.heading || 'Contact'
      : route.page === 'music' ? 'Music' : '';
    document.title = [t, name].filter(Boolean).join(' | ') || 'Music';
  }, [route]);

  return (
    <div className={`app ${current ? 'has-bar' : ''}`}>
      {splash && <Splash onDone={() => setSplash(false)} />}
      <Header onMenu={() => setMenu(true)} />
      <Menu open={menu} onClose={() => setMenu(false)} />
      {route.page === 'song' ? <SongPage id={route.id} />
        : route.page === 'album' ? <AlbumPage id={route.id} />
        : route.page === 'about' ? <About />
        : route.page === 'contact' ? <Contact />
        : route.page === 'music' || !homeOn() ? <Library />
        : <Home />}
      <footer className="foot">
        <span>© {new Date().getFullYear()} {site().realName || site().name}</span>
        {gamesOn() && <a href="games/">{config.games?.menuLabel || 'Games'}</a>}
      </footer>
      <PlayerBar />
    </div>
  );
}
