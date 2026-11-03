#!/usr/bin/env node
/**
 * Builds the whole site into dist/, ready to upload:
 *   dist/            the music player (your home page)
 *   dist/games/      the game cabinet (if games.enabled)
 *   dist/audio/      your music files (skip with --no-audio when only code changed)
 *
 *   npm run build
 *   npm run build -- --no-audio
 *
 * Installs the packages first if they aren't there yet (needs internet the first time).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sync } from './sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function run(cmd, args, { cwd = ROOT, log = console.log } = {}) {
  return new Promise((resolve, reject) => {
    log(`> ${cmd.replace('.cmd', '')} ${args.join(' ')}`);
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0' } });
    const pipe = (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => log(l));
    p.stdout.on('data', pipe);
    p.stderr.on('data', pipe);
    p.on('error', (e) => reject(new Error(e.code === 'ENOENT' ? 'npm was not found. Install Node.js (it includes npm) from nodejs.org, then try again.' : e.message)));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd.replace('.cmd', '')} ${args.join(' ')} stopped with code ${code}`))));
  });
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const a = path.join(from, e.name); const b = path.join(to, e.name);
    if (e.isDirectory()) n += copyDir(a, b); else { fs.copyFileSync(a, b); n++; }
  }
  return n;
}

export async function build({ log = console.log, audio = true } = {}) {
  const t0 = Date.now();
  const { config } = sync({ log });
  if (!fs.existsSync(rel('node_modules', 'vite'))) {
    log('First build: installing packages (needs internet, takes a minute)...');
    await run(NPM, ['install', '--no-audit', '--no-fund'], { log });
  }
  await run(NPM, ['run', 'build', '-w', 'apps/player'], { log });
  const gamesOn = config.games?.enabled !== false;
  if (gamesOn) await run(NPM, ['run', 'build', '-w', 'apps/games'], { log });

  log('Putting the site together in dist/ ...');
  fs.rmSync(rel('dist'), { recursive: true, force: true });
  copyDir(rel('apps/player/dist'), rel('dist'));
  if (gamesOn) copyDir(rel('apps/games/dist'), rel('dist/games'));
  if (audio) {
    const n = copyDir(path.resolve(ROOT, config.music?.audioFolder || 'music'), rel('dist/audio'));
    log(`Copied ${n} music file${n === 1 ? '' : 's'} to dist/audio/`);
  } else log('Skipped music files (--no-audio). Your server keeps the ones already uploaded.');
  log(`Done in ${Math.round((Date.now() - t0) / 1000)}s. Upload everything inside dist/ to your web host.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build({ audio: !process.argv.includes('--no-audio') }).catch((e) => { console.error(e.message); process.exit(1); });
}
