#!/usr/bin/env node
/**
 * The setup page's helper. Runs on your own computer only (http://localhost:7470).
 *
 *   npm start            opens the setup page in your browser
 *   npm start -- --no-open --port 7471
 *
 * It saves site.config.json, scans your music folder, takes image uploads (logo, covers, artwork),
 * and runs npm install / npm run build with the log shown live on the page. It uses nothing but
 * Node itself, so it works before `npm install` has ever run.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeTracks, scanFolder } from '../scripts/make-tracks.mjs';
import { sync } from '../scripts/sync.mjs';
import { build } from '../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);
const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 7470;
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.opus': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

// ---------- the task log the page polls ----------
const log = { lines: [], task: null, ok: null, started: 0 };
const say = (line) => { log.lines.push(String(line)); if (log.lines.length > 4000) log.lines.splice(0, 1000); };
let child = null; // a dev server, if one is running

async function runTask(name, fn) {
  if (log.task) throw Object.assign(new Error(`Wait for "${log.task}" to finish first.`), { status: 409 });
  log.lines = []; log.task = name; log.ok = null; log.started = Date.now();
  say(`== ${name} ==`);
  fn().then(() => { log.ok = true; say('== finished =='); }, (e) => { log.ok = false; say(`!! ${e.message}`); })
    .finally(() => { log.task = null; });
}

function npm(argsList) {
  return new Promise((resolve, reject) => {
    say(`> npm ${argsList.join(' ')}`);
    const p = spawn(NPM, argsList, { cwd: ROOT, shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0' } });
    const pipe = (d) => String(d).split(/\r?\n/).filter(Boolean).forEach(say);
    p.stdout.on('data', pipe); p.stderr.on('data', pipe);
    p.on('error', (e) => reject(new Error(e.code === 'ENOENT' ? 'npm was not found. Install Node.js (it includes npm) from nodejs.org, then restart this page.' : e.message)));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`npm ${argsList.join(' ')} stopped with code ${code}`))));
  });
}

function startDev(app) {
  stopDev();
  sync({ log: say });
  say(`> npm run dev -w apps/${app}`);
  child = spawn(NPM, ['run', 'dev', '-w', `apps/${app}`, '--', '--port', app === 'games' ? '5174' : '5173', '--strictPort'], { cwd: ROOT, shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0' } });
  child.app = app;
  const pipe = (d) => String(d).split(/\r?\n/).filter(Boolean).forEach(say);
  child.stdout.on('data', pipe); child.stderr.on('data', pipe);
  child.on('close', (code) => { say(`dev server stopped (${code ?? 'closed'})`); child = null; });
  child.on('error', (e) => { say(`!! ${e.code === 'ENOENT' ? 'npm was not found. Install Node.js from nodejs.org.' : e.message}`); child = null; });
}
function stopDev() { if (child) { try { process.platform === 'win32' ? exec(`taskkill /pid ${child.pid} /T /F`) : child.kill(); } catch { /* gone */ } child = null; } }

// ---------- config ----------
const CONFIG = rel('site.config.json');
const readConfig = () => JSON.parse(fs.readFileSync(CONFIG, 'utf8'));

/** Pretty JSON, but color lists stay on one line so the file stays readable */
export function formatConfig(cfg) {
  return JSON.stringify(cfg, null, 2)
    .replace(/\[\n\s+("#[0-9a-fA-F]{3,8}",?\n\s+)*"#[0-9a-fA-F]{3,8}"\n\s+\]/g, (m) => '[' + m.match(/"#[0-9a-fA-F]{3,8}"/g).join(', ') + ']') + '\n';
}

function validate(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('Settings must be a JSON object.');
  if (!cfg.site || typeof cfg.site !== 'object') throw new Error('Settings are missing the "site" section.');
  const bad = JSON.stringify(cfg).match(/<\s*script/i);
  if (bad) throw new Error('Settings can\'t contain <script> tags.');
  return cfg;
}

function state() {
  let cfg = null; let cfgError = '';
  try { cfg = readConfig(); } catch (e) { cfgError = e.message; }
  let tracks = [];
  try { tracks = JSON.parse(fs.readFileSync(rel('tracks.json'), 'utf8')); } catch { /* not made yet */ }
  const folder = path.resolve(ROOT, cfg?.music?.audioFolder || 'music');
  const dist = rel('dist', 'index.html');
  return {
    ok: true, config: cfg, configError: cfgError,
    node: process.version, installed: fs.existsSync(rel('node_modules', 'vite')),
    musicFolder: path.relative(ROOT, folder) || '.', musicFiles: scanFolder(folder).length,
    tracks: tracks.length, built: fs.existsSync(dist) ? fs.statSync(dist).mtime.toISOString() : null,
    task: log.task, dev: child ? child.app : null,
  };
}

// ---------- http ----------
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('That file is over 30 MB.'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function serveFile(res, file, req) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found', 'text/plain');
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const size = fs.statSync(file).size;
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/); // audio seeking
  if (range) {
    const start = range[1] ? Number(range[1]) : 0; const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

/** Map a URL path under a folder, refusing anything that climbs out of it */
function inside(base, urlPath) {
  const p = path.normalize(path.join(base, decodeURIComponent(urlPath)));
  return p === base || p.startsWith(base + path.sep) ? p : null;
}

const server = http.createServer(async (req, res) => {
  try {
    // Only this computer, and only this page: blocks other sites in your browser from calling it.
    const host = (req.headers.host || '').replace(/:\d+$/, '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return send(res, 403, { ok: false, error: 'Open the setup page at http://localhost:' + PORT });
    if (req.method !== 'GET' && req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(req.headers.origin)) return send(res, 403, { ok: false, error: 'Blocked.' });

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;

    if (p === '/api/state') return send(res, 200, state());
    if (p === '/api/log') { const since = Number(url.searchParams.get('since') || 0); return send(res, 200, { ok: true, lines: log.lines.slice(since), next: log.lines.length, task: log.task, result: log.ok, dev: child ? child.app : null }); }

    if (p === '/api/config' && req.method === 'PUT') {
      const cfg = validate(JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8')));
      fs.writeFileSync(CONFIG + '.tmp', formatConfig(cfg));
      fs.renameSync(CONFIG + '.tmp', CONFIG);
      return send(res, 200, { ok: true, saved: new Date().toISOString() });
    }

    if (p === '/api/tracks' && req.method === 'POST') {
      const tracks = writeTracks(readConfig());
      return send(res, 200, { ok: true, count: tracks.length, tracks: tracks.slice(0, 400).map((t) => ({ title: t.title, album: t.album, bpm: t.bpm, date: t.date, versions: t.versions.length, file: t.versions[0].file })) });
    }

    if (p === '/api/upload' && req.method === 'POST') {
      const name = String(url.searchParams.get('name') || 'image').replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
      if (!/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(name)) return send(res, 400, { ok: false, error: 'Pick a PNG, JPG, WebP, GIF, SVG or ICO image.' });
      const body = await readBody(req);
      if (/\.svg$/i.test(name) && /<script|on\w+\s*=/i.test(body.toString('utf8'))) return send(res, 400, { ok: false, error: 'That SVG contains scripts. Export a plain SVG or a PNG instead.' });
      fs.mkdirSync(rel('assets', 'uploads'), { recursive: true });
      const file = `${Date.now().toString(36)}-${name}`;
      fs.writeFileSync(rel('assets', 'uploads', file), body);
      return send(res, 200, { ok: true, path: `uploads/${file}` });
    }

    if (p === '/api/run' && req.method === 'POST') {
      const { task } = JSON.parse((await readBody(req, 10000)).toString('utf8') || '{}');
      if (task === 'install') await runTask('Install packages', () => npm(['install', '--no-audit', '--no-fund']));
      else if (task === 'build') await runTask('Build site', () => build({ log: say, audio: true }));
      else if (task === 'build-code') await runTask('Build site (code only)', () => build({ log: say, audio: false }));
      else if (task === 'sync') await runTask('Copy settings into the apps', async () => { sync({ log: say }); });
      else if (task === 'dev-player' || task === 'dev-games') { if (!fs.existsSync(rel('node_modules', 'vite'))) throw Object.assign(new Error('Install packages first (Build does it for you).'), { status: 400 }); startDev(task.slice(4)); }
      else if (task === 'stop') stopDev();
      else return send(res, 400, { ok: false, error: 'Unknown task.' });
      return send(res, 200, { ok: true });
    }

    // Built site preview: /preview/ serves dist/ exactly as your host will
    if (p === '/preview' ) { res.writeHead(302, { Location: '/preview/' }); return res.end(); }
    if (p.startsWith('/preview/')) {
      let f = inside(rel('dist'), p.slice('/preview'.length));
      if (f && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (f && !fs.existsSync(f) && !fs.existsSync(rel('dist', 'index.html'))) return send(res, 404, '<p style="font:16px system-ui;padding:2em">Nothing built yet. Go back and press <b>Build site</b>.</p>', 'text/html; charset=utf-8');
      return f ? serveFile(res, f, req) : send(res, 404, 'Not found', 'text/plain');
    }
    if (p.startsWith('/uploads/')) { const f = inside(rel('assets', 'uploads'), p.slice('/uploads'.length)); return f ? serveFile(res, f, req) : send(res, 404, 'Not found', 'text/plain'); }
    if (p.startsWith('/shared/')) { const f = inside(rel('shared'), p.slice('/shared'.length)); return f ? serveFile(res, f, req) : send(res, 404, 'Not found', 'text/plain'); }
    if (p.startsWith('/tools/')) { const f = inside(rel('tools'), p.slice('/tools'.length)); return f ? serveFile(res, f, req) : send(res, 404, 'Not found', 'text/plain'); }
    if (p === '/site.config.json') return serveFile(res, CONFIG, req);
    const f = inside(rel('setup'), p === '/' ? '/index.html' : p);
    if (f && !f.endsWith('.mjs')) return serveFile(res, f, req);
    return send(res, 404, 'Not found', 'text/plain');
  } catch (e) {
    return send(res, e.status || (e instanceof SyntaxError ? 400 : 500), { ok: false, error: e instanceof SyntaxError ? 'That isn\'t valid JSON.' : e.message });
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is busy. Is the setup page already open? Or run: npm start -- --port ${PORT + 1}`);
  else console.error(e.message);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Setup page: ${url}\n  Leave this window open while you work. Press Ctrl+C to stop.\n`);
  if (!args.includes('--no-open')) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, () => { /* no browser to open: the address above still works */ });
  }
});

process.on('SIGINT', () => { stopDev(); process.exit(0); });
