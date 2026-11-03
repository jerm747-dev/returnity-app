/**
 * Cover artwork, shared by the music player and the Cover Studio (tools/cover-studio.html).
 *
 * Songs without their own artwork get a marble color panel in a dark frame, in a color from the
 * palette (site.config.json → music.covers.colors), with a soft shade, a radial fade and your mark
 * in the middle (music.covers.mark, e.g. your initials). The song's id picks the color, so a song
 * always looks the same and a big library gets an even mix.
 *
 * Albums can use albumCoverSvg(): the same marble with the album title and artist on it.
 * Plain ES module, no dependencies, so any page or build tool can import it.
 */

export function hash(s) { // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const lumOf = (hex) => {
  const n = parseInt(String(hex).slice(1), 16);
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

/** Mark ink for a cover color. style: "auto" | "dark" | "light" | any "#rrggbb" */
export function markFor(color, style = 'auto') {
  const m = style === 'auto' ? (lumOf(color) > 0.179 ? 'dark' : 'light') : style; // 0.179: dark and white read equally well
  if (m === 'dark') return { ink: '#0b0c10', text: 0.72, ring: 0.26 };
  if (m === 'light') return { ink: '#ffffff', text: 0.92, ring: 0.34 };
  return /^#[0-9a-f]{6}$/i.test(m) ? { ink: m, text: 0.95, ring: 0.45 } : { ink: '#0b0c10', text: 0.72, ring: 0.26 };
}

/** The palette color for a song id */
export function colorFor(id, colors) {
  const list = colors?.length ? colors : ['#f5a524'];
  return list[hash(String(id).split('~')[0]) % list.length];
}

/** Initials from a name, for the default mark: "Default Artist" -> "DA" */
export function initials(name, max = 3) {
  return String(name || '').trim().split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, max).toUpperCase();
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function marble(id, c) {
  const h = hash(String(id));
  const seed = h % 997; // each song's marble has its own veins
  const turn = -40 + ((h >>> 5) % 50); // and its own angle
  const gap = 110 + ((h >>> 9) % 70); // how far apart the veins run
  const defs = `<clipPath id="p"><rect x="40" y="40" width="432" height="432" rx="44"/></clipPath>
<pattern id="vl" width="512" height="${gap}" patternUnits="userSpaceOnUse"><rect y="0" width="512" height="2.2" fill="#fff"/><rect y="${Math.round(gap * 0.42)}" width="512" height="1" fill="#fff" opacity=".7"/></pattern>
<pattern id="vd" width="512" height="${gap + 23}" patternUnits="userSpaceOnUse"><rect y="${Math.round(gap / 2)}" width="512" height="1.4" fill="#000"/></pattern>
<filter id="w" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.0065" numOctaves="5" seed="${seed}" result="t"/>
<feDisplacementMap in="SourceGraphic" in2="t" scale="150" xChannelSelector="R" yChannelSelector="G"/>
<feGaussianBlur stdDeviation=".7"/>
</filter>
<filter id="c" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="3" seed="${seed + 7}"/>
<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1.6 0 -.62"/>
</filter>
<linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
<stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/>
</linearGradient>
<radialGradient id="r" cx="256" cy="246" r="330" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>
<stop offset=".6" stop-color="#0b0c10" stop-opacity=".12"/><stop offset="1" stop-color="#0b0c10" stop-opacity=".62"/>
</radialGradient>
<radialGradient id="f" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="${c}" stop-opacity=".16"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const body = `<rect width="512" height="512" fill="#15171e"/>
<rect width="512" height="512" fill="url(#f)"/>
<rect x="40" y="40" width="432" height="432" rx="44" fill="${c}"/>
<g clip-path="url(#p)">
<g transform="rotate(${turn} 256 256)">
<rect x="-140" y="-140" width="792" height="792" filter="url(#c)" opacity=".22"/>
<rect x="-140" y="-140" width="792" height="792" fill="url(#vl)" filter="url(#w)" opacity=".55"/>
<rect x="-140" y="-140" width="792" height="792" fill="url(#vd)" filter="url(#w)" opacity=".18"/>
</g>
<rect x="40" y="40" width="432" height="432" fill="url(#s)"/>
<rect x="40" y="40" width="432" height="432" fill="url(#r)"/>
</g>
<rect x="41.5" y="41.5" width="429" height="429" rx="42.5" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3"/>`;
  return { defs, body };
}

/**
 * A song cover as an SVG string.
 *   coverSvg({ id, color, mark: "DA", markStyle: "auto" })
 * The mark shrinks to fit: up to 4 characters read well.
 */
export function coverSvg({ id, color, mark = '', markStyle = 'auto' }) {
  const c = color || '#f5a524';
  const mk = markFor(c, markStyle);
  const { defs, body } = marble(id, c);
  const text = String(mark).slice(0, 6);
  const size = text.length <= 3 ? 58 : text.length === 4 ? 48 : 38;
  const markSvg = text
    ? `<circle cx="256" cy="256" r="104" fill="none" stroke="${mk.ink}" stroke-width="5" opacity="${mk.ring}"/>
<text x="256" y="${256 + Math.round(size * 0.34)}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="${size}" font-weight="800" fill="${mk.ink}" opacity="${mk.text}" letter-spacing="1">${esc(text)}</text>`
    : `<circle cx="256" cy="256" r="104" fill="none" stroke="${mk.ink}" stroke-width="5" opacity="${mk.ring}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>${defs}</defs>
${body}
${markSvg}
</svg>`;
}

function wrapWords(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * An album cover: the marble with the album title (up to 3 lines) and the artist under it.
 *   albumCoverSvg({ id, title, artist, color, markStyle })
 */
export function albumCoverSvg({ id, title = 'Album Title', artist = '', color, markStyle = 'auto' }) {
  const c = color || '#9b6bea';
  const mk = markFor(c, markStyle);
  const { defs, body } = marble(id || title, c);
  const lines = wrapWords(title, 14);
  const size = lines.length >= 3 ? 46 : lines.length === 2 ? 54 : 62;
  const top = 256 - ((lines.length - 1) * size * 1.05) / 2 - (artist ? 18 : 0);
  const titleSvg = lines.map((l, i) => `<text x="256" y="${Math.round(top + i * size * 1.05 + size * 0.34)}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="${size}" font-weight="800" fill="${mk.ink}" opacity="${Math.min(1, mk.text + 0.08)}">${esc(l)}</text>`).join('\n');
  const artistY = Math.round(top + (lines.length - 1) * size * 1.05 + size * 0.34 + 46);
  const artistSvg = artist ? `<text x="256" y="${artistY}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="24" font-weight="600" letter-spacing="4" fill="${mk.ink}" opacity="${mk.text * 0.85}">${esc(String(artist).toUpperCase())}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>${defs}</defs>
${body}
<rect x="96" y="${Math.round(top - size)}" width="320" height="2" fill="${mk.ink}" opacity="${mk.ring}"/>
${titleSvg}
${artistSvg}
</svg>`;
}

export const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
