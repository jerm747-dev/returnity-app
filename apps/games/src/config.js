// site.config.json is read when the page opens (not baked into the build), so a new title,
// colors or artwork only need the file replaced on the server.
let current = {};
export const cfg = () => current;

export async function loadConfig() {
  try {
    const r = await fetch('site.config.json', { cache: 'no-cache' });
    current = await r.json();
  } catch {
    current = {};
  }
  const t = current.theme || {};
  const root = document.documentElement.style;
  if (t.accent) root.setProperty('--site-accent', t.accent);
  const name = current.site?.name || '';
  const g = current.games || {};
  document.title = [g.menuLabel || 'Games', name].filter(Boolean).join(' | ');
  if (t.favicon) document.querySelector('link[rel=icon]')?.setAttribute('href', t.favicon);
  return current;
}
