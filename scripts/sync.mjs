#!/usr/bin/env node
/**
 * Copies your settings and data into each app before it runs or builds:
 *   site.config.json, tracks.json, assets/uploads/  -> apps/player/public/ and apps/games/public/
 *   apps/games/public/projects/index.json            -> the game list (every folder with an index.html)
 * Runs automatically from npm run build / npm run dev and from the setup page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig, writeTracks } from './make-tracks.mjs';
import { scope } from './scope-css.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);

const KINDS = ['game', 'app', 'site', 'tool', 'music', 'experiment'];
const STATUSES = ['prototype', 'in_progress', 'playable', 'stable', 'client'];
const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

/** Same rules as jerm747.games' games.php, so a game folder works on either. */
export function listGames(dir = rel('apps/games/public/projects')) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const slug = e.name;
    const d = path.join(dir, slug);
    if (!e.isDirectory() || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(slug) || !fs.existsSync(path.join(d, 'index.html'))) continue;
    let m = {};
    try { m = JSON.parse(fs.readFileSync(path.join(d, 'project.json'), 'utf8')); } catch { /* optional */ }
    if (m.hidden) continue;
    const coverFile = ['cover.webp', 'cover.png', 'cover.jpg', 'cover.jpeg', 'cover.gif'].find((c) => fs.existsSync(path.join(d, c)));
    const html = fs.readFileSync(path.join(d, 'index.html'), 'utf8').slice(0, 4096);
    const title = m.title || html.match(/<title>([^<]{1,80})<\/title>/i)?.[1]?.trim() || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const updated = Math.max(fs.statSync(path.join(d, 'index.html')).mtimeMs, fs.existsSync(path.join(d, 'project.json')) ? fs.statSync(path.join(d, 'project.json')).mtimeMs : 0);
    const gamepad = {}; const gamepadLabels = {};
    for (const [btn, key] of Object.entries(m.gamepad || {})) {
      if (BUTTONS.includes(btn) && typeof key === 'string' && key && key.length <= 20) { gamepad[btn] = key; gamepadLabels[btn] = clean(m.gamepadLabels?.[btn], 30); }
    }
    const okFile = (f) => typeof f === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,120}\.(webp|png|jpe?g|gif)$/i.test(f) && !f.includes('..') && fs.existsSync(path.join(d, f));
    const screenshots = (m.screenshots || []).slice(0, 12).map((s) => (typeof s === 'string' ? { src: s } : s)).filter((s) => okFile(s.src))
      .map((s) => ({ src: `projects/${slug}/${s.src}`, thumb: `projects/${slug}/${okFile(s.thumb) ? s.thumb : s.src}`, caption: clean(s.caption, 120) }));
    const dl = m.download;
    out.push({
      slug, url: `projects/${slug}/index.html`, title: clean(title, 80), tagline: clean(m.tagline, 140), description: clean(m.description, 1200),
      kind: KINDS.includes(m.kind) ? m.kind : 'experiment', status: STATUSES.includes(m.status) ? m.status : 'in_progress',
      version: clean(m.version, 20), controls: (m.controls || []).filter((c) => ['gamepad', 'keyboard', 'mouse', 'touch'].includes(c)),
      credit: clean(m.credit, 240), accent: /^#[0-9a-f]{6}$/i.test(m.accent || '') ? m.accent : '',
      cover: coverFile ? `projects/${slug}/${coverFile}?v=${Math.round(fs.statSync(path.join(d, coverFile)).mtimeMs)}` : '',
      order: Number.isFinite(m.order) ? m.order : 100, gamepad, gamepadLabels,
      download: dl && typeof dl.url === 'string' && /^(\/[\w.~/-]*|https:\/\/\S{1,300})$/.test(dl.url) ? { url: dl.url, label: clean(dl.label, 40) || 'Download' } : null,
      screenshots, updated: new Date(updated).toISOString(),
      actions: (Array.isArray(m.actions) ? m.actions : []).slice(0, 24).filter((a) => a && typeof a.key === 'string' && a.key && a.key.length <= 20)
        .map((a) => ({ id: clean(a.id || a.label, 40), label: clean(a.label || a.key, 40), key: a.key, ...(BUTTONS.includes(a.pad) ? { pad: a.pad } : {}) })),
      controllerMode: ['native', 'mapping'].includes(m.controllerMode) ? m.controllerMode : '',
    });
  }
  return out.sort((a, b) => a.order - b.order || b.updated.localeCompare(a.updated));
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const a = path.join(from, e.name); const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

export function sync({ log = console.log } = {}) {
  const config = readConfig();
  const homeCss = rel('apps', 'player', 'src', 'home');
  fs.writeFileSync(path.join(homeCss, 'home.css'), '/* Generated from home.src.css by scripts/scope-css.mjs. Edit that file instead. */\n' + scope(fs.readFileSync(path.join(homeCss, 'home.src.css'), 'utf8')));
  if (!fs.existsSync(rel('tracks.json'))) {
    const t = writeTracks(config);
    log(`Made tracks.json from your music folder: ${t.length} songs`);
  }
  for (const app of ['player', 'games']) {
    const pub = rel('apps', app, 'public');
    fs.mkdirSync(pub, { recursive: true });
    fs.copyFileSync(rel('site.config.json'), path.join(pub, 'site.config.json'));
    fs.copyFileSync(rel('tracks.json'), path.join(pub, 'tracks.json')); // the cabinet plays the songs too
    copyDir(rel('assets/uploads'), path.join(pub, 'uploads'));
  }
  const games = listGames();
  fs.writeFileSync(rel('apps/games/public/projects/index.json'), JSON.stringify({ ok: true, projects: games }, null, 2) + '\n');
  log(`Settings copied to the player and game cabinet; ${games.length} game${games.length === 1 ? '' : 's'} on the shelf`);
  return { config, games };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) sync();
