import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGamepad, buzz, toggleFullscreen, setDisplayOrientation, HOLD_TO_EXIT_MS, BTN } from './input.js';
import PadIcon from './PadIcon.jsx';
import Cabinet from './Cabinet.jsx';
import { cfg } from './config.js';
import ControlsPanel from './ControlsPanel.jsx';
import { useMusic, MusicButton, MusicPanel } from './music.jsx';
import TouchPad from './TouchPad.jsx';
import { useControls, useDisplay, loadDisplay, plan, enterFullscreen, exitFullscreen, fsElement, keyName } from './controls.js';

// Full screen the arcade turned on (so leaving a game only undoes our own)
let arcadeFullscreen = false;
import './cabinet.css';

const KIND_LABEL = { game: 'Games', app: 'Apps', site: 'Sites', tool: 'Tools', music: 'Music', experiment: 'Experiments' };
const KIND_COLOR = { game: '#A897C9', app: '#86B0A5', site: '#8DA4C4', tool: '#C2AE7E', music: '#C4909B', experiment: '#9A9FA8' };
const STATUS_LABEL = { prototype: 'Prototype', in_progress: 'Work in progress', playable: 'Playable', stable: 'Stable', client: 'Client project' };
const CONTROL_LABEL = { gamepad: 'Controller', keyboard: 'Keyboard', mouse: 'Mouse', touch: 'Touch' };
const BRIDGE_INDEX = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

// Visitor stats are left out of the kit; add your own analytics here if you want them.
function track() {}

function keyCode(key) {
  if (key === ' ') return 'Space';
  if (/^[a-z]$/i.test(key)) return 'Key' + key.toUpperCase();
  if (/^[0-9]$/.test(key)) return 'Digit' + key;
  if (key === 'Shift') return 'ShiftLeft';
  if (key === 'Control') return 'ControlLeft';
  return key;
}

function Glyph({ name, source }) {
  if (source === 'gamepad') return <span className={`glyph glyph-pad glyph-${name}`}>{name}</span>;
  const keys = { A: 'Enter', B: 'Esc', X: 'C', Y: 'F', LB: 'Q', RB: 'E' };
  return <span className="glyph glyph-key">{keys[name] || name}</span>;
}

function Hints({ source, inPlayer }) {
  if (source === 'touch') return null;
  if (inPlayer) {
    return (
      <div className="hints">
        {source === 'gamepad'
          ? <span><Glyph name="Select" source="gamepad" /> + <Glyph name="Start" source="gamepad" /> hold to return</span>
          : <span><span className="glyph glyph-key">Esc</span> hold to return</span>}
      </div>
    );
  }
  return (
    <div className="hints" aria-hidden="true">
      <span><Glyph name="A" source={source} /> Open</span>
      <span><Glyph name="X" source={source} /> Controls</span>
      <span><Glyph name="Y" source={source} /> Fullscreen</span>
      <span><Glyph name="LB" source={source} /><Glyph name="RB" source={source} /> Category</span>
    </div>
  );
}

function Art({ project, big }) {
  const color = project.accent || KIND_COLOR[project.kind];
  // Any cover shape fits: full art in front, a blurred copy fills the rest of the frame.
  if (project.cover) {
    return (
      <div className="art-cover">
        <img className="art-backdrop" src={project.cover} alt="" aria-hidden="true" loading="lazy" />
        <img className="art-img" src={project.cover} alt={`${project.title} cover art`} loading="lazy" />
      </div>
    );
  }
  const initials = project.title.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  return (
    <div className={`art-gen ${big ? 'art-big' : ''}`} style={{ '--c': color }}>
      <span>{initials}</span>
    </div>
  );
}

// Screenshot strip on a game's page; tapping one opens a full-size viewer (←/→, swipe, Esc to close).
function Gallery({ shots, title }) {
  const [open, setOpen] = useState(-1);
  const dlg = useRef(null);
  const touchX = useRef(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open >= 0 && !d.open) d.showModal();
    if (open < 0 && d.open) d.close();
    document.body.dataset.viewer = open >= 0 ? '1' : '';
  }, [open]);
  useEffect(() => () => { document.body.dataset.viewer = ''; }, []);
  if (!shots?.length) return null;
  const step = (n) => setOpen((i) => (i + n + shots.length) % shots.length);
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };
  const shot = shots[Math.max(0, open)];
  return (
    <div className="sb-shots">
      <p className="sb-shots-label">Screenshots</p>
      <div className="sb-shots-row">
        {shots.map((s, i) => (
          <button key={s.src} type="button" className="sb-shot" onClick={() => setOpen(i)} aria-label={`View screenshot ${i + 1}: ${s.caption || title}`}>
            <img src={s.thumb || s.src} alt="" loading="lazy" width="480" height="270" />
          </button>
        ))}
      </div>
      <dialog ref={dlg} className="sb-viewer" onClose={() => setOpen(-1)} onKeyDown={onKey}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(-1); }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX); if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); touchX.current = null; }}>
        {open >= 0 && (
          <figure>
            <img src={shot.src} alt={shot.caption || `${title} screenshot`} />
            <figcaption><span>{shot.caption}</span><span>{open + 1} / {shots.length}</span></figcaption>
          </figure>
        )}
        <button type="button" className="sb-viewer-btn sb-viewer-prev" onClick={() => step(-1)} aria-label="Previous screenshot">‹</button>
        <button type="button" className="sb-viewer-btn sb-viewer-next" onClick={() => step(1)} aria-label="Next screenshot">›</button>
        <button type="button" className="sb-viewer-btn sb-viewer-close" onClick={() => setOpen(-1)} aria-label="Close">×</button>
      </dialog>
    </div>
  );
}

export default function Arcade() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [cat, setCat] = useState('all');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(null);
  const [source, setSource] = useState('keyboard');
  const tileRefs = useRef([]);
  const pushed = useRef(false);
  const [copied, setCopied] = useState('');
  const [panel, setPanel] = useState(null); // game whose Controls panel is open
  const display = useDisplay();
  const music = useMusic();

  useEffect(() => {
    track('view');
    // On PHP hosting, api/games.php lists the projects/ folder live (upload a game folder and it
    // shows up). Anywhere else, the list made at build time (projects/index.json) is used.
    const get = (url) => fetch(url, { cache: 'no-cache' }).then((r) => r.json()).then((d) => { if (!d.ok) throw new Error(d.error); return d.projects; });
    get('api/games.php')
      .catch(() => get('projects/index.json'))
      .then(setProjects)
      .catch(() => setError("The game list didn't load. Refresh to try again."));
  }, []);

  // Shareable links: <your site>/games/#/play/<folder> opens that game directly.
  const slugFromHash = () => (window.location.hash.match(/^#\/play\/([A-Za-z0-9._-]+)/) || [])[1] || '';
  useEffect(() => {
    if (!projects) return;
    const sync = () => {
      const slug = slugFromHash();
      const p = slug && projects.find((x) => x.slug === slug);
      if (p) {
        setPlaying((cur) => { if (!cur || cur.slug !== p.slug) track('launch', p.slug); return p; });
        const i = projects.indexOf(p);
        if (i >= 0) { setCat('all'); setIndex(i); }
      } else {
        setPlaying(null);
      }
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, [projects]);

  const exitGame = useCallback(() => {
    if (arcadeFullscreen) { arcadeFullscreen = false; exitFullscreen(); }
    setPlaying(null);
    if (slugFromHash()) {
      if (pushed.current) { pushed.current = false; window.history.back(); }
      else window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const copyLink = async (p) => {
    const url = `${window.location.origin}${window.location.pathname}#/play/${p.slug}`;
    try { await navigator.clipboard.writeText(url); setCopied(p.slug); setTimeout(() => setCopied(''), 2000); }
    catch { window.prompt('Copy this link', url); }
  };

  const cats = useMemo(() => {
    const kinds = [...new Set((projects || []).map((p) => p.kind))];
    return ['all', ...Object.keys(KIND_LABEL).filter((k) => kinds.includes(k))];
  }, [projects]);

  const shown = useMemo(() => (projects || []).filter((p) => cat === 'all' || p.kind === cat), [projects, cat]);
  const current = shown[Math.min(index, shown.length - 1)];

  useEffect(() => {
    const tile = tileRefs.current[index];
    const shelf = tile?.parentElement;
    if (tile && shelf) shelf.scrollTo({ left: tile.offsetLeft - shelf.offsetLeft - (shelf.clientWidth - tile.clientWidth) / 2, behavior: 'smooth' });
  }, [index, cat]);

  // Swipeable details: one full-width page per game in the current section. Swiping picks the game;
  // picking a game any other way (tiles, arrows, keys, controller) slides the pages to it.
  const slides = useRef(null);
  const pointerTile = useRef(-1); // first tap on a tile selects it, a second tap opens it
  const indexRef = useRef(index);
  const settle = useRef(0);
  const lastCat = useRef(cat);
  indexRef.current = index;
  const stride = (el) => (el.children[1] ? el.children[1].offsetLeft - el.children[0].offsetLeft : el.clientWidth) || el.clientWidth;
  useEffect(() => {
    const el = slides.current;
    if (!el || !el.clientWidth) return;
    const target = Math.min(index, shown.length - 1) * stride(el);
    const jump = lastCat.current !== cat;
    lastCat.current = cat;
    if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: jump ? 'auto' : 'smooth' });
  }, [index, cat, shown.length]);
  useEffect(() => {
    const el = slides.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { el.scrollTo({ left: indexRef.current * stride(el), behavior: 'auto' }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [projects, playing]);
  const onSlidesScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = slides.current;
      if (!el || !el.clientWidth) return;
      const i = Math.max(0, Math.min(shown.length - 1, Math.round(el.scrollLeft / stride(el))));
      if (i !== indexRef.current) { setIndex(i); buzz(); }
    }, 90);
  };

  const launch = useCallback((p) => {
    if (!p) return;
    // Full screen has to start from the tap or key press itself, so ask before the game loads
    const d = loadDisplay();
    if (d.native && !fsElement()) enterFullscreen(d.orientation).then((ok) => { if (ok) arcadeFullscreen = true; });
    track('launch', p.slug);
    buzz(40, 0.4);
    setPlaying(p);
    window.history.pushState(null, '', `#/play/${p.slug}`);
    pushed.current = true;
  }, []);

  const moveCat = (dir) => {
    const i = cats.indexOf(cat);
    const next = cats[(i + dir + cats.length) % cats.length];
    setCat(next);
    setIndex(0);
    buzz();
  };

  const onAction = (action, from) => {
    if (document.body.dataset.viewer) return; // screenshot viewer handles its own keys
    setSource(from);
    if (action === 'left') { setIndex((i) => Math.max(0, i - 1)); buzz(); }
    if (action === 'right') { setIndex((i) => Math.min(shown.length - 1, i + 1)); buzz(); }
    if (action === 'up' || action === 'lb') moveCat(-1);
    if (action === 'down' || action === 'rb') moveCat(1);
    if (action === 'a') launch(current);
    if (action === 'y') toggleFullscreen();
    if (action === 'x' && current) setPanel(current);
    if (action === 'start') music.setOpen(true);
  };

  const pads = useGamepad({ mode: playing ? 'off' : 'menu', onAction });

  useEffect(() => {
    if (pads.length) setSource('gamepad');
  }, [pads.length]);

  useEffect(() => {
    if (playing) return;
    const onKey = (e) => {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'a', ' ': 'a', f: 'y', F: 'y', q: 'lb', Q: 'lb', e: 'rb', E: 'rb', c: 'x', C: 'x', m: 'start', M: 'start' };
      const action = map[e.key];
      if (!action) return;
      if (action === 'a' && e.target.closest?.('button, a') && e.target.dataset.tile === undefined) return;
      e.preventDefault();
      onAction(action, 'keyboard');
    };
    const onTouch = () => setSource('touch');
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('touchstart', onTouch); };
  });

  // Arcade mode puts the game over the whole window; otherwise it plays inside the cabinet screen.
  if (playing) {
    const game = <Player project={playing} source={source} onExit={exitGame} />;
    return display.fill ? game : <Cabinet project={playing}>{game}</Cabinet>;
  }

  return (
    <Cabinet>
    <div className="sb">
      <header className="sb-top">
        <a className="sb-brand" href="./">
          <PadIcon />
          <span>{cfg().games?.title}<b>{cfg().games?.titleAccent}</b></span>
          <span className="sb-sub">Choose your game</span>
        </a>
        <div className="sb-status">
          <span className={`sb-input ${pads.length ? 'is-live' : ''}`}>
            {pads.length ? `Controller: ${pads[0].id.replace(/\(.*?\)/g, '').trim().slice(0, 32) || 'connected'}` : 'No controller, press any button to connect'}
          </span>
          <MusicButton />
          {current && <button className="sb-btn" onClick={() => setPanel(current)}>Controls</button>}
          <button className="sb-btn" onClick={toggleFullscreen}>Fullscreen</button>
        </div>
      </header>

      <nav className="sb-cats" aria-label="Categories">
        {cats.map((c) => (
          <button key={c} className={`sb-cat ${c === cat ? 'is-on' : ''}`} onClick={() => { setCat(c); setIndex(0); }}>
            {c === 'all' ? 'All' : KIND_LABEL[c]}
            <span>{c === 'all' ? projects?.length || 0 : projects.filter((p) => p.kind === c).length}</span>
          </button>
        ))}
      </nav>

      <main className="sb-main">
        {error && <p className="sb-empty">{error}</p>}
        {!projects && !error && <p className="sb-empty">Loading games…</p>}
        {projects && shown.length === 0 && (
          <p className="sb-empty">New games are on the way. Check back soon.</p>
        )}

        {current && (
          <div className="sb-slider">
          <div className="sb-slides" ref={slides} onScroll={onSlidesScroll} aria-roledescription="carousel" aria-label="Game details · swipe for the next game">
          {shown.map((current, i) => (
          <section className="sb-detail sb-slide" key={current.slug} aria-roledescription="slide" aria-label={`${i + 1} of ${shown.length}: ${current.title}`} aria-hidden={i !== index} inert={i !== index}>
            <div className="sb-hero"><Art project={current} big /></div>
            <div className="sb-info">
              <p className="sb-chips">
                <span className="chip" style={{ '--c': KIND_COLOR[current.kind] }}>{KIND_LABEL[current.kind].replace(/s$/, '')}</span>
                <span className={`chip chip-status status-${current.status}`}>{STATUS_LABEL[current.status]}</span>
                {current.version && <span className="chip chip-ghost">{current.version}</span>}
              </p>
              <h1>{current.title}</h1>
              {current.tagline && <p className="sb-tagline">{current.tagline}</p>}
              {current.description && <p className="sb-desc">{current.description}</p>}
              {current.controls.length > 0 && (
                <p className="sb-controls">Plays with {current.controls.map((c) => CONTROL_LABEL[c]).join(', ').replace(/, ([^,]*)$/, ' or $1')}</p>
              )}
              <div className="sb-actions">
                <button className="sb-launch" onClick={() => launch(current)}>
                  {source !== 'touch' && <Glyph name="A" source={source} />} Open {current.title}
                </button>
                <button className="sb-btn sb-controls-btn" onClick={() => setPanel(current)}>
                  {source !== 'touch' && <Glyph name="X" source={source} />} Controls
                </button>
                <button className="sb-btn" onClick={() => copyLink(current)}>{copied === current.slug ? 'Link copied' : 'Copy link'}</button>
                <a className="sb-btn" href={current.url} target="_blank" rel="noopener">Open in new tab</a>
                {current.download?.url && (
                  <a className="sb-btn sb-download" href={current.download.url} target="_blank" rel="noopener">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></svg>
                    {current.download.label || 'Download'}
                  </a>
                )}
              </div>
              <Gallery shots={current.screenshots} title={current.title} />
              {current.credit && <p className="sb-credit">{current.credit}</p>}
            </div>
          </section>
          ))}
          </div>
          {shown.length > 1 && (
            <>
              <button className="sb-step sb-step-prev" aria-label="Previous game" disabled={index === 0} onClick={() => { setIndex((i) => Math.max(0, i - 1)); buzz(); }}>‹</button>
              <button className="sb-step sb-step-next" aria-label="Next game" disabled={index === shown.length - 1} onClick={() => { setIndex((i) => Math.min(shown.length - 1, i + 1)); buzz(); }}>›</button>
              <div className="sb-dots" aria-hidden="true">{shown.map((p, i) => <i key={p.slug} className={i === index ? 'is-on' : ''} />)}</div>
            </>
          )}
          </div>
        )}

        <div className="sb-shelf" role="listbox" aria-label="Games">
          {shown.map((p, i) => (
            <button
              key={p.slug}
              ref={(el) => { tileRefs.current[i] = el; }}
              data-tile
              role="option"
              aria-selected={i === index}
              className={`tile ${i === index ? 'is-on' : ''}`}
              onPointerDown={() => { pointerTile.current = i; }}
              onClick={() => { pointerTile.current = -1; if (i === indexRef.current) launch(p); else { setIndex(i); buzz(); } }}
              onFocus={() => { if (pointerTile.current !== i) setIndex(i); }}
            >
              <Art project={p} />
              <span className="tile-title">{p.title}</span>
              <span className="tile-meta">{STATUS_LABEL[p.status]}</span>
            </button>
          ))}
        </div>
      </main>

      {panel && <ControlsPanel project={panel} onClose={() => setPanel(null)} onPlay={() => launch(panel)} />}
      {music.open && <MusicPanel />}
      <footer className="sb-foot">
        <Hints source={source} />
        <span className="sb-note">
          {cfg().games?.footer || <>Games by {cfg().site?.artist || cfg().site?.name}. Music at <a href="../">{cfg().site?.name || 'the main site'}</a>.</>}
        </span>
      </footer>
    </div>
    </Cabinet>
  );
}

function Player({ project, source, onExit }) {
  const frame = useRef(null);
  const [hold, setHold] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [panel, setPanel] = useState(false);
  const [notice, setNotice] = useState('');
  const [isFs, setIsFs] = useState(!!fsElement());
  const controls = useControls(project);
  const display = useDisplay();
  const [barOn, setBarOn] = useState(true);
  const music = useMusic();
  const { acts, keyMap, bridge, touchKeys } = useMemo(() => plan(project, controls), [project, controls]);
  const hasBridge = Object.keys(bridge).length > 0;
  const live = useRef({ keyMap, bridge });
  live.current = { keyMap, bridge };

  useGamepad({ mode: 'player', onExitProgress: setHold, onExit });

  // Press a key inside the game, as if it came from the keyboard
  const send = useCallback((type, key) => {
    try {
      const doc = frame.current?.contentDocument;
      const W = frame.current?.contentWindow;
      if (!doc || !W) return;
      const ev = new W.KeyboardEvent(type, { key, code: keyCode(key), bubbles: true, cancelable: true });
      (doc.activeElement || doc.body || doc).dispatchEvent(ev);
    } catch { /* not ready, or a game from another site */ }
  }, []);

  // The toolbar tucks away after a few seconds; the small pad button brings it back.
  useEffect(() => {
    if (!display.hideBar || !barOn || panel) return;
    const t = setTimeout(() => setBarOn(false), 3500);
    return () => clearTimeout(t);
  }, [barOn, display.hideBar, panel]);

  // Keyboard: hold Esc to return; remapped keys become the keys the game expects; keys pressed
  // while the toolbar has focus still reach the game.
  useEffect(() => {
    let start = 0;
    let raf = 0;
    const loop = (now) => {
      if (!start) return;
      const p = Math.min(1, (now - start) / HOLD_TO_EXIT_MS);
      setHold(p);
      if (p >= 1) { start = 0; setHold(0); onExit(); return; }
      raf = requestAnimationFrame(loop);
    };
    const handler = (fromParent) => (e) => {
      if (!e.isTrusted) return; // our own pressed keys
      if (document.body.dataset.viewer === 'music') return; // the music player has the keys
      if (e.key === 'Escape') {
        if (e.type === 'keydown' && !e.repeat && !start) { start = performance.now(); raf = requestAnimationFrame(loop); }
        if (e.type === 'keyup') { start = 0; cancelAnimationFrame(raf); setHold(0); }
        return;
      }
      if (document.body.dataset.viewer) return; // Controls panel open
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const to = live.current.keyMap[k];
      if (to) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!e.repeat || e.type === 'keyup') send(e.type, to);
      } else if (fromParent && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Tab') {
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); // don't click the focused toolbar button
        send(e.type, e.key);
      }
    };
    const onParent = handler(true);
    const onGame = handler(false);
    let gameWin = null;
    const attach = () => {
      try {
        const w = frame.current?.contentWindow;
        if (w && w !== gameWin) { gameWin = w; w.addEventListener('keydown', onGame, true); w.addEventListener('keyup', onGame, true); }
      } catch { /* another site's game */ }
    };
    window.addEventListener('keydown', onParent, true);
    window.addEventListener('keyup', onParent, true);
    const iframe = frame.current;
    iframe?.addEventListener('load', attach);
    attach();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onParent, true);
      window.removeEventListener('keyup', onParent, true);
      try { gameWin?.removeEventListener('keydown', onGame, true); gameWin?.removeEventListener('keyup', onGame, true); } catch { /* gone */ }
      iframe?.removeEventListener('load', attach);
    };
  }, [onExit, send]);

  // Messages from the game: close back to the shelf, or ask for full screen (Get Down's buttons do this)
  useEffect(() => {
    const onMessage = async (e) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      const type = e.data && e.data.type;
      if (type === 'jerm747-catalog-close' || type === 'jerm747-games-exit' || type === 'sound-arcade-exit') onExit();
      if (type === 'sound-arcade-music-hello') e.source.postMessage({ type: 'sound-arcade-music-ready' }, location.origin);
      if (type === 'sound-arcade-music-open' || type === 'jerm747-music-open') musicOpen.current(true);
      if (type === 'jerm747-getdown-fullscreen' || type === 'sound-arcade-fullscreen') {
        const want = typeof e.data.want === 'boolean' ? e.data.want : !fsElement();
        if (want) { if (await enterFullscreen(display.orientation)) arcadeFullscreen = true; else setNotice('Full screen isn\'t available in this browser. The game fills the window instead.'); }
        else { arcadeFullscreen = false; await exitFullscreen(); }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onExit, display.orientation]);

  // The music player over the game: tell the game when it opens and closes, and hand focus back
  const musicOpen = useRef(music.setOpen);
  musicOpen.current = music.setOpen;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (music.open === wasOpen.current) return;
    wasOpen.current = music.open;
    try { frame.current?.contentWindow?.postMessage({ type: music.open ? 'sound-arcade-music-opened' : 'sound-arcade-music-closed' }, location.origin); } catch { /* gone */ }
    if (!music.open) { try { frame.current?.contentWindow?.focus(); } catch { frame.current?.focus(); } }
  }, [music.open]);

  // Tell the game when full screen changes, so its own button can say "Exit full screen"
  useEffect(() => {
    const on = () => {
      const fs = !!fsElement();
      setIsFs(fs);
      if (!fs) arcadeFullscreen = false;
      try {
        const w = frame.current?.contentWindow;
        w?.postMessage({ type: 'jerm747-getdown-fs', on: fs }, location.origin);
        w?.postMessage({ type: 'sound-arcade-fs', on: fs }, location.origin);
      } catch { /* gone */ }
    };
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);

  // Controller map: buttons (and the left stick, as the d-pad) press keys in the game
  useEffect(() => {
    if (!hasBridge) return;
    let raf = 0;
    const down = new Map(); // button -> key it pressed
    const loop = () => {
      let pad = null;
      try { pad = Array.from(navigator.getGamepads?.() || []).find(Boolean); } catch { /* none */ }
      const map = live.current.bridge;
      if (pad && !document.body.dataset.viewer) {
        const combo = pad.buttons[BTN.SELECT]?.pressed && pad.buttons[BTN.START]?.pressed;
        const [ax = 0, ay = 0] = pad.axes || [];
        const stick = { LEFT: ax < -0.5, RIGHT: ax > 0.5, UP: ay < -0.5, DOWN: ay > 0.5 };
        for (const [btn, key] of Object.entries(map)) {
          const b = pad.buttons[BRIDGE_INDEX[btn]];
          const pressed = !combo && ((!!b && (b.pressed || b.value > 0.5)) || !!stick[btn]);
          if (pressed && !down.has(btn)) { down.set(btn, key); send('keydown', key); }
          else if (!pressed && down.has(btn)) { send('keyup', down.get(btn)); down.delete(btn); }
        }
      }
      for (const [btn, key] of [...down]) if (map[btn] !== key) { send('keyup', key); down.delete(btn); } // map changed mid-press
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); down.forEach((key) => send('keyup', key)); };
  }, [project.slug, hasBridge, send]);

  const toggleFs = async () => {
    if (fsElement()) { arcadeFullscreen = false; await exitFullscreen(); return; }
    if (await enterFullscreen(display.orientation)) arcadeFullscreen = true;
    else setNotice('Full screen isn\'t available in this browser. The game fills the window instead.');
  };

  const mapRows = acts.filter((a) => controls.padMode !== 'native' && (controls.pad[a.id] ?? a.pad));
  return (
    <div className={`player ${display.fill ? 'is-fill' : ''}`}>
      <iframe
        ref={frame}
        src={project.url}
        title={project.title}
        allow="gamepad; fullscreen; autoplay; screen-wake-lock"
        allowFullScreen
        onLoad={() => { try { frame.current.contentWindow.focus(); } catch { frame.current?.focus(); } }}
      />
      {!barOn && <button className="player-peek" onClick={() => setBarOn(true)} aria-label="Show game toolbar"><PadIcon /></button>}
      <div className={`player-bar ${barOn ? 'is-on' : ''}`} aria-hidden={!barOn} inert={barOn ? undefined : ''}>
        <button className="sb-btn" onClick={onExit}>Back to shelf</button>
        <span className="player-title">{project.title}</span>
        <Hints source={source} inPlayer />
        {mapRows.length > 0 && <button className="sb-btn" onClick={() => setShowMap(!showMap)}>{showMap ? 'Hide map' : 'Controller map'}</button>}
        <MusicButton />
        <button className="sb-btn" onClick={() => setPanel(true)}>Controls</button>
        <button className="sb-btn" onClick={toggleFs}>{isFs ? 'Exit full screen' : 'Full screen'}</button>
      </div>
      {notice && <p className="display-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss">×</button></p>}
      {showMap && (
        <div className="player-map">
          <h2>Controller map</h2>
          <dl>
            {mapRows.map((a) => {
              const b = controls.pad[a.id] ?? a.pad;
              return <div key={a.id}><dt><span className={`glyph glyph-pad glyph-${b}`}>{b}</span></dt><dd>{a.label} <small>({keyName(controls.keys[a.id] ?? a.key)})</small></dd></div>;
            })}
          </dl>
        </div>
      )}
      {controls.touch.on && <TouchPad touch={controls.touch} keys={touchKeys} send={send} />}
      {music.open && <MusicPanel inGame />}
      {panel && <ControlsPanel project={project} inGame onClose={() => { setPanel(false); try { frame.current?.contentWindow?.focus(); } catch { /* ok */ } }} onPlay={() => {}} />}
      {hold > 0 && (
        <div className="hold" role="status" aria-label="Returning to shelf">
          <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" className="hold-track" /><circle cx="40" cy="40" r="34" className="hold-fill" style={{ strokeDashoffset: 214 * (1 - hold) }} /></svg>
          <span>Shelf</span>
        </div>
      )}
    </div>
  );
}
