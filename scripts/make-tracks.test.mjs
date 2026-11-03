// npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseName, makeTracks } from './make-tracks.mjs';
import { coverSvg, albumCoverSvg, colorFor, initials } from '../shared/covers.js';
import { listGames } from './sync.mjs';

const albums = [{ id: 'demo', prefix: 'DEMO' }];

test('order number, take and tempo', () => {
  const p = parseName('000001 REAMP-RUBY-REDRUM-404-B173PM.mp3');
  assert.equal(p.title, 'Reamp Ruby Redrum');
  assert.equal(p.order, 1);
  assert.equal(p.take, 404);
  assert.equal(p.bpm, 173);
});

test('album prefix and track number', () => {
  const p = parseName('DEMO 03 Purple Rain Drops.mp3', albums);
  assert.equal(p.album, 'demo');
  assert.equal(p.trackNo, 3);
  assert.equal(p.title, 'Purple Rain Drops');
});

test('date stamp, decimal tempo, featuring', () => {
  assert.equal(parseName('COFFEE SHOP 20251113 172819.wav').date, '2025-11-13');
  assert.equal(parseName('Night Drive B96.41PM.mp3').bpm, 96.41);
  assert.deepEqual(parseName('Summer Song ft J Read & Sir Abstraxxx.mp3').featuring, ['J Read', 'Sir Abstraxxx']);
  assert.equal(parseName('song_name_final.m4a').title, 'Song Name Final');
});

test('takes of one title become versions, newest first', () => {
  const t = makeTracks([
    { file: 'Bounce-12.mp3', date: '2026-01-01' },
    { file: 'Bounce-13.mp3', date: '2026-02-01' },
    { file: 'Other.mp3', date: '2026-01-05' },
  ], { site: { artist: 'Default Artist' }, music: { albums } });
  assert.equal(t.length, 2);
  const b = t.find((x) => x.title === 'Bounce');
  assert.deepEqual(b.versions.map((v) => v.label), ['Take 13', 'Take 12']);
  assert.equal(b.url, 'audio/Bounce-13.mp3');
  assert.equal(b.date, '2026-01-01');
  assert.deepEqual(b.artists, ['Default Artist']);
});

test('covers draw with the mark and stay the same per song', () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff'];
  assert.equal(colorFor('night-drive', colors), colorFor('night-drive', colors));
  assert.equal(initials('Default Artist'), 'DA');
  const svg = coverSvg({ id: 'x', color: '#ff0000', mark: 'DA' });
  assert.match(svg, /<svg[\s\S]*>DA<\/text>/);
  assert.match(albumCoverSvg({ title: 'Demo <Tape>', artist: 'Me' }), /Demo &lt;Tape&gt;/);
});

test('the sample game is on the shelf', () => {
  const games = listGames();
  assert.ok(games.some((g) => g.slug === 'flight-control-deck' && g.title === 'Flight Control Deck'));
});

test('controls: game actions, unique touch buttons, key and button maps', async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const { actionsFor, defaultsFor, plan } = await import('../apps/games/src/controls-core.js');
  const game = { slug: 't', actions: [{ id: 'left', key: 'ArrowLeft' }, { id: 'jump', label: 'Jump', key: ' ', pad: 'A' }, { id: 'punch', label: 'Punch', key: 'j', pad: 'X' }] };
  assert.equal(actionsFor(game).find((a) => a.id === 'left').pad, 'LEFT');
  const d = defaultsFor(game);
  assert.deepEqual(d.touch.face, { A: 'jump', B: '', X: 'punch', Y: '' });
  const p = plan(game, { ...d, keys: { jump: 'k' }, pad: { punch: 'B' } });
  assert.equal(p.keyMap.k, ' ');
  assert.equal(p.bridge.B, 'j');
  assert.equal(p.bridge.A, ' ');
  const fromBridge = actionsFor({ gamepad: { A: ' ', UP: 'w' }, gamepadLabels: { A: 'Jump' } });
  assert.equal(fromBridge.find((a) => a.id === 'up').pad, 'UP');
  assert.ok(fromBridge.some((a) => a.label === 'Jump' && a.key === ' '));
});
