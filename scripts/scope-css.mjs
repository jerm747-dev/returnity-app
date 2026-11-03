// Scopes apps/player/src/home/home.src.css under .home and writes home.css next to it, so the
// artist page never fights the player's own styles. Run: node scripts/scope-css.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../apps/player/src/home/', import.meta.url));
const SCOPE = '.home';

export function scope(css, root = SCOPE) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '', i = 0;
  const block = (from) => { let d = 0; for (let j = from; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) return j; } return css.length - 1; };
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    const close = block(open);
    const inner = css.slice(open + 1, close);
    if (/^@(keyframes|font-face)/.test(head)) out += `${head}{${inner}}\n`;
    else if (head.startsWith('@')) out += `${head}{\n${scope(inner, root)}}\n`;
    else {
      const sel = head.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s === ':scope' ? root : s.startsWith(':scope') ? root + s.slice(6) : `${root} ${s}`).join(', ');
      out += `${sel} {${inner.trim()}}\n`;
    }
    i = close + 1;
  }
  return out;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = readFileSync(dir + 'home.src.css', 'utf8');
  writeFileSync(dir + 'home.css', '/* Generated from home.src.css by scripts/scope-css.mjs. Edit that file instead. */\n' + scope(src));
  console.log('home.css written');
}
