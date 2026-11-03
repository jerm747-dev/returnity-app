// The artist home page: hero, a scroll-driven tour of the artist's cities over a night map, and an
// arcade room of pieces in a 4×2 grid. All of it is set in site.config.json → home.
import { useEffect, useMemo, useRef, useState } from 'react';
import { config, tracks } from '../data.js';
import { mountNightMap } from './nightmap.js';
import { TapeDeck, Turntable, BeatPad, Eras, PowerUp, Studio, LinerNotes, Collect } from './pieces.jsx';
import './home.css';

const ICON = {
  deck: <svg viewBox="0 0 44 44"><rect x="5" y="11" width="34" height="22" rx="3" /><circle cx="16" cy="22" r="4" /><circle cx="28" cy="22" r="4" /><path d="M12 33l3-5h14l3 5" /></svg>,
  turntable: <svg viewBox="0 0 44 44"><rect x="4" y="8" width="36" height="28" rx="3" /><circle cx="19" cy="22" r="10" /><circle cx="19" cy="22" r="2.5" /><path d="M35 11v6l-6 9" /></svg>,
  beatpad: <svg viewBox="0 0 44 44"><rect x="4" y="12" width="36" height="20" rx="2" /><path d="M9 26h4M16 26h4M23 26h4M30 26h4" /><circle cx="11" cy="18" r="1.2" /><circle cx="25" cy="18" r="1.2" /></svg>,
  eras: <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="15" strokeDasharray="3 3" /><circle cx="22" cy="7" r="3" /><circle cx="37" cy="22" r="3" /><circle cx="22" cy="37" r="3" /><circle cx="7" cy="22" r="3" /></svg>,
  power: <svg viewBox="0 0 44 44"><path d="M24 5L12 25h9l-2 14 13-21h-9z" /></svg>,
  studio: <svg viewBox="0 0 44 44"><rect x="17" y="6" width="10" height="15" rx="5" /><path d="M12 18a10 10 0 0020 0M22 28v9M15 37h14" /></svg>,
  notes: <svg viewBox="0 0 44 44"><path d="M6 9h14a3 3 0 013 3v24a3 3 0 00-3-3H6zM38 9H26a3 3 0 00-3 3v24a3 3 0 013-3h12z" /></svg>,
  collect: <svg viewBox="0 0 44 44"><circle cx="16" cy="24" r="11" /><circle cx="16" cy="24" r="3" /><rect x="25" y="11" width="15" height="10" rx="2" /><path d="M27 33h11" /></svg>,
};
export const PIECES = [
  { id: 'deck', name: 'Tape deck', sub: 'Side A, side B', button: 'Press play', intro: 'Piano keys latch down like the real thing. Eject flips the tape.', how: 'The tape deck runs like the real thing: piano keys for play, stop, track skip and eject.' },
  { id: 'turntable', name: 'Turntable', sub: 'Spin the record', button: 'Spin the record', intro: 'Seen from a little above. Start spins the platter up, the arm drops in, and the pitch fader changes the speed.', how: 'Press Start, then slide the pitch fader to speed the record up or slow it down.' },
  { id: 'beatpad', name: 'Beat pad', sub: 'Program 16 steps', button: 'Make a beat', intro: 'A 16-step pattern in the style of the classic drum machines. Tap steps on and off, then press play.', how: 'Tap the colored keys to turn steps on and off, then press Play.' },
  { id: 'eras', name: 'Eras', sub: 'Then to now', button: 'Walk the eras', intro: 'The eras of the story on one orbit. Pull the lever or tap a year.', how: 'Pull the lever to spin the orbit through each era.' },
  { id: 'power', name: 'Power up', sub: 'Charge the ladder', button: 'Power up', intro: '', how: 'Fill the eight-light ladder to reach the golden form.' },
  { id: 'studio', name: 'Studio', sub: 'Walk around the room', button: 'Step into the studio', intro: 'Tap something in the room and the artist walks over. Tap them to say hi.', how: 'Tap the chair, mic, desk, soup or records and watch the walk.' },
  { id: 'notes', name: 'Liner notes', sub: 'The story', button: 'Read the notes', intro: 'The story behind the album, in the artist\'s own words.', how: 'Open the gatefold to read the story and the credits.' },
  { id: 'collect', name: 'Collect', sub: 'Tape, CD, vinyl', button: 'See the formats', intro: '', how: 'Every format of the album, side by side.' },
];
const DRAFT = <span className="draft">Draft</span>;

export default function Home() {
  const h = config.home || {};
  const site = config.site || {};
  const map = h.map || {};
  const cities = useMemo(() => (map.cities || []).filter((c) => c && c.name && c.lat !== '' && c.lon !== '' && Number.isFinite(+c.lat) && Number.isFinite(+c.lon)), [map.cities]);
  const stops = cities.filter((c) => c.stop !== false);
  const pieces = PIECES.filter((d) => h.arcade?.pieces?.[d.id] !== false && (d.id !== 'eras' || (h.eras || []).length > 0));
  const [current, setCurrent] = useState(pieces[0]?.id);
  const [autoplay, setAutoplay] = useState(0);
  const canvasRef = useRef(null), tourRef = useRef(null), stageRef = useRef(null), mapApi = useRef(null);
  const stopRefs = useRef([]);
  const showMap = map.enabled !== false && cities.length > 0;
  const artist = site.artist || site.name || '';
  const albumTitle = `${h.title || ''}${h.titleLight || ''}` || site.name || '';
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!showMap || !canvasRef.current) return undefined;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e2ad4f';
    mapApi.current = mountNightMap(canvasRef.current, { map: { ...map, cities }, accent, reduce, getStops: () => stopRefs.current.filter(Boolean), getTour: () => tourRef.current });
    const later = setTimeout(() => mapApi.current?.remeasure(), 400);
    addEventListener('load', mapApi.current.remeasure);
    return () => { clearTimeout(later); removeEventListener('load', mapApi.current?.remeasure); mapApi.current?.destroy(); mapApi.current = null; };
  }, [showMap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => mapApi.current?.remeasure(), 60); return () => clearTimeout(t); }, [current]);
  useEffect(() => {
    const els = stopRefs.current.filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver((list) => list.forEach((e) => e.target.querySelector('.stop-card')?.classList.toggle('is-here', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stops.length]);

  const open = (id, play = false) => {
    if (!pieces.some((x) => x.id === id)) return;
    setCurrent(id);
    if (play && id === 'deck') setAutoplay((n) => n + 1);
    requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
  };
  const onTabKey = (e) => {
    const i = pieces.findIndex((x) => x.id === current); let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % pieces.length; if (e.key === 'ArrowLeft') n = (i - 1 + pieces.length) % pieces.length;
    if (n >= 0) { e.preventDefault(); setCurrent(pieces[n].id); document.getElementById(`sa-tab-${pieces[n].id}`)?.focus(); }
  };
  const def = pieces.find((x) => x.id === current);
  const common = { tracks, artist, title: albumTitle };
  const body = {
    deck: <TapeDeck {...common} autoplay={autoplay} />,
    turntable: <Turntable {...common} />,
    beatpad: <BeatPad />,
    eras: <Eras eras={h.eras || []} character={h.character} />,
    power: <PowerUp power={h.power || {}} character={h.character} />,
    studio: <Studio heroImage={h.heroImage} character={h.character} tracks={tracks} name={artist} />,
    notes: <LinerNotes notes={h.notes || {}} name={artist} />,
    collect: <Collect collect={h.collect || {}} />,
  };
  const intro = { power: h.power?.text, collect: h.collect?.text };
  const headTitle = { power: h.power?.heading };

  return (
    <div className="home">
      {showMap && <canvas ref={canvasRef} className="home-map" aria-hidden="true" />}
      <header className="h-hero">
        <div className="h-wrap h-hero-grid">
          <div>
            <p className="h-label">{[artist, h.eyebrow].filter(Boolean).join(' · ')}</p>
            <h1 className="h-word"><b>{h.title}</b>{h.titleLight}</h1>
            {h.thesis && <p className="h-thesis">{h.thesis}</p>}
            {stops.length > 1 && (
              <p className="h-route" aria-label={`Route: ${stops.map((s) => s.name).join(', ')}`}>
                {stops.map((s, i) => <span key={i} className={i === stops.length - 1 ? 'now' : ''}>{i > 0 && <i />}{s.short || s.name}</span>)}
              </p>
            )}
            <div className="h-btns">
              {stops.length > 0 && <a className="h-btn primary" href="#sa-tour" onClick={(e) => { e.preventDefault(); tourRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }}>Take the tour</a>}
              {pieces.length > 0 && <button className="h-btn" type="button" onClick={() => open(current)}>Open the arcade room</button>}
            </div>
          </div>
          {h.heroImage && <figure className="h-mural"><img src={h.heroImage} alt={`${artist} artwork`} /></figure>}
        </div>
      </header>

      {stops.length > 0 && (
        <section className="h-tour" ref={tourRef} id="sa-tour" aria-label={`The route: ${stops.map((s) => s.name).join(', ')}`}>
          <div className="h-wrap">
            {h.tourLabel && <p className="h-label">{h.tourLabel}</p>}
            {stops.map((c, i) => {
              const target = pieces.find((x) => x.id === c.open);
              return (
                <div className="stop" key={i} ref={(el) => { stopRefs.current[i] = el; }}>
                  <article className="stop-card">
                    <p className="stop-num">Stop {i + 1} of {stops.length} · {c.name}</p>
                    {c.heading && <h2>{c.heading}</h2>}
                    {c.quote && <blockquote>“{c.quote.replace(/^["“]|["”]$/g, '')}”</blockquote>}
                    {c.story && <p>{c.story} {c.draft && DRAFT}</p>}
                    {!c.story && c.draft && <p>{DRAFT}</p>}
                    {target && <div className="how"><b>How to play</b>{c.how || target.how}</div>}
                    {target && <div className="h-btns"><button className="h-btn primary" type="button" onClick={() => open(target.id, target.id === 'deck')}>{c.button || target.button}</button></div>}
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pieces.length > 0 && (
        <section className="h-arcade">
          <div className="h-wrap">
            <div className="h-arcade-head"><div><p className="h-label">The arcade room</p><h2>{h.arcade?.title || 'Pick something to play'}</h2></div></div>
            <div className="tiles" role="tablist" aria-label="Pieces" onKeyDown={onTabKey}>
              {pieces.map((x) => (
                <button key={x.id} className="tile" role="tab" id={`sa-tab-${x.id}`} aria-selected={current === x.id} aria-controls="sa-stage" tabIndex={current === x.id ? 0 : -1} onClick={() => setCurrent(x.id)}>
                  {ICON[x.id]}<strong>{x.name}</strong><span>{x.id === 'power' ? (h.power?.heading ? 'Charge the ladder' : x.sub) : x.sub}</span>
                </button>
              ))}
            </div>
            <div className="stage-panel" id="sa-stage" role="tabpanel" aria-labelledby={`sa-tab-${current}`} ref={stageRef}>
              <div className="piece-head"><div><h3>{headTitle[current] || def?.name}</h3>{(intro[current] || def?.intro) && <p>{intro[current] || def.intro}</p>}</div>
                {(current === 'deck' || current === 'turntable') && tracks.length === 0 && <span className="draft">Demo audio</span>}</div>
              {body[current]}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
