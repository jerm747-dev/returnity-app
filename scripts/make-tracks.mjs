#!/usr/bin/env node
/**
 * Turns the audio files in your music folder into the song list the player shows (tracks.json).
 *
 *   npm run tracks                 # reads the folder in site.config.json (music.audioFolder, default "music")
 *   node scripts/make-tracks.mjs ./some/folder
 *
 * What it reads from a file name (all optional):
 *   "0003 Who We Are.mp3"           a leading number sets the order; the title shows "Who We Are"
 *   "LIP 03 Song Name.mp3"          an album prefix from music.albums (track 3 of that album)
 *   "Song Name B96PM.mp3"           tempo: B96PM, 96BPM, 96 BPM or 96.41BPM
 *   "Song 20251113 172819.wav"      a date stamp (otherwise the file's own date is used)
 *   "Song Name-404.mp3"             a take number; files with the same title become versions of one song
 *   "Song ft Someone.mp3"           featured artists (ft, ft., feat, featuring)
 *   ALL-CAPS-NAMES become Title Case.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Ii|Iii|Iv|Vi|Vii)\b/g, (m) => m.toUpperCase());
const isShouting = (s) => s === s.toUpperCase() && /[A-Z]{3}/.test(s);
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Parse one file name. albums: [{ id, prefix }] from site.config.json */
export function parseName(file, albums = []) {
  let name = file.replace(AUDIO_EXT, '').replace(/_/g, ' ').trim();
  const out = { file, order: null, album: null, trackNo: null, bpm: null, date: null, take: null, featuring: [] };

  const lead = name.match(/^(\d{2,8})[\s.-]+(?=\S)/);
  if (lead) { out.order = Number(lead[1]); name = name.slice(lead[0].length); }

  for (const a of albums) {
    if (!a.prefix) continue;
    const re = new RegExp(`^${a.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s.-]+(\\d{1,3})?[\\s.-]*`, 'i');
    const m = name.match(re);
    if (m) { out.album = a.id; if (m[1]) out.trackNo = Number(m[1]); name = name.slice(m[0].length); break; }
  }

  const bpm = name.match(/(?:^|[\s-])B?(\d{2,3}(?:\.\d{1,2})?)\s?B?PM\b/i);
  if (bpm) { const v = Number(bpm[1]); if (v >= 40 && v <= 300) out.bpm = v; name = name.replace(bpm[0], ' '); }

  const date = name.match(/(?:^|[\s-])(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[\s-]+\d{4,6})?(?=$|[\s-])/);
  if (date) { out.date = `${date[1]}-${date[2]}-${date[3]}`; name = name.replace(date[0], ' '); }

  const feat = name.match(/\s(?:ft\.?|feat\.?|featuring)\s+(.+)$/i);
  if (feat) { out.featuring = feat[1].split(/\s*(?:,|&| and | x )\s*/i).map((s) => s.trim()).filter(Boolean); name = name.slice(0, feat.index); }

  const take = name.match(/[\s-]+(\d{1,4})[\s-]*$/);
  if (take && name.replace(take[0], '').trim()) { out.take = Number(take[1]); name = name.slice(0, take.index); }

  name = name.replace(/[-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (isShouting(name) || (name === name.toLowerCase() && /[a-z]{3}/.test(name))) name = titleCase(name);
  if (out.featuring.length) out.featuring = out.featuring.map((f) => (isShouting(f) ? titleCase(f) : f));
  out.title = name || file.replace(AUDIO_EXT, '');
  return out;
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * entries: [{ file, date? }]  (date: the file's own date, used when the name has none)
 * Returns the song list, grouped so takes of the same title are versions of one song.
 */
export function makeTracks(entries, config = {}) {
  const albums = config.music?.albums || [];
  const artist = config.site?.artist || '';
  const songs = new Map();
  for (const { file, date } of entries) {
    const p = parseName(file, albums);
    const key = `${p.album || ''}|${slug(p.title)}`;
    const version = {
      label: p.take != null ? `Take ${p.take}` : 'Original',
      file, url: 'audio/' + encodeURIComponent(file).replace(/%2F/g, '/'), date: p.date || date || null, bpm: p.bpm,
    };
    let s = songs.get(key);
    if (!s) {
      s = {
        id: [p.album, slug(p.title)].filter(Boolean).join('-') || slug(file),
        title: p.title,
        sortTitle: p.order != null ? `${String(p.order).padStart(8, '0')} ${p.title}` : p.title,
        artists: [artist, ...p.featuring].filter(Boolean),
        album: p.album, trackNo: p.trackNo, bpm: p.bpm, date: version.date,
        url: version.url, versions: [],
      };
      songs.set(key, s);
    }
    s.versions.push(version);
    for (const f of p.featuring) if (!s.artists.includes(f)) s.artists.push(f);
  }
  const list = [...songs.values()];
  for (const s of list) {
    // Newest take plays by default; the song's date is its earliest version
    s.versions.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.label.localeCompare(a.label, undefined, { numeric: true }));
    s.url = s.versions[0].url;
    s.bpm = s.bpm ?? s.versions.find((v) => v.bpm)?.bpm ?? null;
    s.date = s.versions.map((v) => v.date).filter(Boolean).sort()[0] || null;
    if (s.versions.length === 1) s.versions = s.versions.map(({ label, ...v }) => ({ label: 'Original', ...v }));
  }
  // Unique ids
  const seen = new Map();
  for (const s of list) { const n = seen.get(s.id) || 0; seen.set(s.id, n + 1); if (n) s.id = `${s.id}-${n + 1}`; }
  return list.sort((a, b) => a.sortTitle.localeCompare(b.sortTitle, undefined, { numeric: true }));
}

/** Read a folder and return entries with each file's own date */
export function scanFolder(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d, rel = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, rel + e.name + '/');
      else if (AUDIO_EXT.test(e.name)) {
        const st = fs.statSync(full);
        const times = [st.mtimeMs, st.birthtimeMs].filter((ms) => ms > 0);
        out.push({ file: rel + e.name, date: times.length ? ymd(new Date(Math.min(...times))) : null });
      }
    }
  };
  walk(dir);
  return out;
}

export function readConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
}

/** Scan the music folder and write tracks.json next to site.config.json. Returns the songs. */
export function writeTracks(config = readConfig(), folder) {
  const dir = path.resolve(ROOT, folder || config.music?.audioFolder || 'music');
  const entries = scanFolder(dir).map((e) => ({ ...e, file: e.file.split(path.sep).join('/') }));
  const tracks = makeTracks(entries, config);
  fs.writeFileSync(path.join(ROOT, 'tracks.json'), JSON.stringify(tracks, null, 2) + '\n');
  return tracks;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tracks = writeTracks(readConfig(), process.argv[2]);
  console.log(`tracks.json: ${tracks.length} song${tracks.length === 1 ? '' : 's'} (${tracks.reduce((n, t) => n + t.versions.length, 0)} files)`);
}
