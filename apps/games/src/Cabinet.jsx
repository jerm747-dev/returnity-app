import { cfg } from './config.js';

// The side panels. Home screen: your artwork (games.wings.left/right.image), your gradient, or the
// built-in sunset gradient that matches the marquee. While a game plays: that game's cover.
function Wing({ side, project }) {
  const w = cfg().games?.wings?.[side] || {};
  const art = project?.cover || w.image || '';
  const grad = Array.isArray(w.gradient) && w.gradient.length >= 2
    ? { background: `linear-gradient(${side === 'left' ? 160 : 205}deg, ${w.gradient.join(', ')})` }
    : undefined;
  return (
    <aside className={`cabinet-wing cabinet-wing--${side} ${art ? 'has-art' : ''}`} style={grad}
      aria-label={project ? `${project.title} cabinet artwork` : `${side} cabinet panel`}>
      {art && <img className="cabinet-wing-art" src={art} alt={project ? `${project.title} cover` : ''} />}
      <div className="cabinet-wing-grain" aria-hidden="true" />
      <span className="cabinet-wing-number" aria-hidden="true">{side === 'left' ? '01' : '02'}</span>
      {w.word && <span className="cabinet-wing-word" aria-hidden="true">{w.word}</span>}
      <div className="cabinet-wing-caption">
        <span className="cabinet-eyebrow">{project ? 'Now playing' : cfg().site?.name}</span>
        {project ? <strong>{project.title}</strong> : w.caption && <strong className="cabinet-home-title">{w.caption}</strong>}
        <span className="cabinet-wing-rule" aria-hidden="true" />
      </div>
    </aside>
  );
}

export default function Cabinet({ children, project }) {
  const g = cfg().games || {};
  return (
    <div className={`cabinet ${project ? 'cabinet--playing' : ''}`}>
      <header className="cabinet-marquee">
        <span className="cabinet-speaker" aria-hidden="true" />
        <a href="./" className="cabinet-logo" aria-label={`${g.title || ''} ${g.titleAccent || ''} home`.trim()}>
          {g.title}{g.titleAccent && <span>{g.titleAccent}</span>}
        </a>
        <span className="cabinet-speaker" aria-hidden="true" />
        {g.subtitle && <p>{g.subtitle}</p>}
      </header>
      <Wing side="left" project={project} />
      <div className="cabinet-bezel"><div className="cabinet-screen">{children}</div></div>
      <Wing side="right" project={project} />
      <div className="cabinet-deck" aria-hidden="true">
        <span className="cabinet-deck-label">{g.deck?.left}</span>
        <span className="cabinet-deck-line" /><i /><i /><i />
        <span className="cabinet-deck-label">{g.deck?.right}</span>
      </div>
    </div>
  );
}
