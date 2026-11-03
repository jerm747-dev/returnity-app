import { coverSvg, albumCoverSvg, colorFor, initials, svgDataUrl } from '../../../shared/covers.js';

// site.config.json and tracks.json are read when the page opens, so changing your name, colors or
// songs only needs those files replaced on the server; no rebuild.
export let config = {};
export let tracks = [];
export let albums = [];

const FONTS = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif',
  mono: 'ui-monospace, Menlo, Consolas, monospace',
};

function applyTheme() {
  const t = config.theme || {};
  const s = document.documentElement.style;
  for (const [k, v] of Object.entries({ accent: t.accent, bg: t.background, surface: t.surface, text: t.text, muted: t.muted })) {
    if (v) s.setProperty(`--${k}`, v);
  }
  if (FONTS[t.font]) s.setProperty('--font', FONTS[t.font]);
  if (t.favicon) document.querySelector('link[rel=icon]')?.setAttribute('href', t.favicon);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.background || '#0e0f13');
  const d = config.site?.description;
  if (d) document.querySelector('meta[name=description]')?.setAttribute('content', d);
  document.documentElement.lang = config.site?.language || 'en';
}

const coverCache = new Map();
/** A song's artwork: its album's cover, or a marble cover in a palette color with your mark */
export function coverOf(track) {
  if (!track) return '';
  const album = albums.find((a) => a.id === track.album);
  if (album?.cover) return album.cover;
  if (coverCache.has(track.id)) return coverCache.get(track.id);
  const c = config.music?.covers || {};
  const url = svgDataUrl(coverSvg({
    id: track.id,
    color: album?.color || colorFor(track.id, c.colors),
    mark: c.mark || initials(config.site?.artist || config.site?.name),
    markStyle: c.markStyle || 'auto',
  }));
  coverCache.set(track.id, url);
  return url;
}

/** A song's glow color (its palette color, or its album color) */
export function glowOf(track) {
  if (!track) return config.theme?.accent || '#f5a524';
  const album = albums.find((a) => a.id === track.album);
  return album?.color || colorFor(track.id, config.music?.covers?.colors);
}

export function albumCover(album) {
  if (album.cover) return album.cover;
  return svgDataUrl(albumCoverSvg({ id: album.id, title: album.title, artist: album.artist || config.site?.artist, color: album.color, markStyle: config.music?.covers?.markStyle }));
}

export async function loadData() {
  const get = (f) => fetch(f, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [c, t] = await Promise.all([get('site.config.json'), get('tracks.json')]);
  config = c || {};
  tracks = Array.isArray(t) ? t : [];
  albums = (config.music?.albums || []).filter((a) => a && a.id && a.title);
  applyTheme();
  return { config, tracks };
}
