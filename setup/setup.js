// Setup page. Talks to setup/server.mjs when started with `npm start`; opened as a plain file it
// still fills in and exports settings.
import { coverSvg, albumCoverSvg, colorFor, initials, svgDataUrl } from '/shared/covers.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let cfg = null;
let online = false;
let dirty = false;

// ---------- small helpers ----------
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function set(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex6 = (v, fallback = '#000000') => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : fallback);
const imgSrc = (p) => (!p ? '' : /^(https?:|data:)/.test(p) ? p : online ? '/' + p.replace(/^\//, '') : p);

async function api(path, opts = {}) {
  const r = await fetch(path, opts);
  let d = null;
  try { d = await r.json(); } catch { throw new Error('The setup helper didn\'t answer. Is the npm start window still open?'); }
  if (!r.ok || !d.ok) throw new Error(d?.error || 'Something went wrong.');
  return d;
}

function note(text, kind = '') {
  const el = $('#save-state');
  el.textContent = text;
  el.className = `save-state ${kind}`;
}

function markDirty() {
  dirty = true;
  note(online ? 'Unsaved changes' : 'Not saved (export to keep)', 'warn');
  renderPreview();
}

// ---------- fill the form from cfg, and write changes back ----------
function bindFields() {
  for (const el of $$('[data-path]')) {
    const v = get(cfg, el.dataset.path);
    if (el.type === 'checkbox') el.checked = v !== false && v != null ? !!v : false;
    else if (el.type === 'color') el.value = hex6(v, '#888888');
    else el.value = v ?? '';
    el.oninput = el.onchange = () => {
      const val = el.type === 'checkbox' ? el.checked : el.value;
      set(cfg, el.dataset.path, val);
      if (el.dataset.path === 'site.artist' || el.dataset.path === 'music.covers.markStyle') renderAlbums();
      markDirty();
    };
  }
  for (const box of $$('[data-upload]')) renderUpload(box);
  for (const box of $$('[data-gradient]')) renderGradient(box);
  renderSocial();
  renderAlbums();
  renderHome();
  renderPreview();
}

// Image fields: thumbnail, Choose / Remove
function renderUpload(box) {
  const path = box.dataset.upload;
  const val = get(cfg, path) || '';
  const label = box.querySelector('span').outerHTML;
  box.innerHTML = `${label}<div class="upload-ctl">${val ? `<img src="${esc(imgSrc(val))}" alt="">` : '<i class="upload-none">none</i>'}
    <button type="button" class="btn small" data-act="pick">${val ? 'Change' : 'Choose image'}</button>
    ${val ? '<button type="button" class="btn small ghost" data-act="clear">Remove</button>' : ''}</div>`;
  box.querySelector('[data-act=pick]').onclick = () => pickImage((p) => { set(cfg, path, p); renderUpload(box); markDirty(); });
  const clr = box.querySelector('[data-act=clear]');
  if (clr) clr.onclick = () => { set(cfg, path, ''); renderUpload(box); markDirty(); };
}

function pickImage(done) {
  if (!online) { alert('Images upload through the setup helper. Start it with npm start, or type an image address into site.config.json.'); return; }
  const input = $('#upload-file');
  input.value = '';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    note('Uploading…');
    try {
      const d = await api(`/api/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
      done(d.path);
      note('Image added. Save to keep it.', 'warn');
    } catch (e) { note(e.message, 'bad'); }
  };
  input.click();
}

// Color lists (splash, cabinet gradients): swatches + add/remove
function renderGradient(box) {
  const path = box.dataset.gradient;
  const list = Array.isArray(get(cfg, path)) ? get(cfg, path) : [];
  const label = box.querySelector('.label').outerHTML;
  box.innerHTML = `${label}${list.map((c, i) => `<span class="grad-sw"><input type="color" value="${hex6(c)}" data-i="${i}" aria-label="Color ${i + 1}"><button type="button" data-del="${i}" aria-label="Remove color ${i + 1}">×</button></span>`).join('')}
    ${list.length < 4 ? '<button type="button" class="btn small" data-add>+ Color</button>' : ''}
    ${box.dataset.optional && list.length ? '<button type="button" class="btn small ghost" data-reset>Use default</button>' : ''}`;
  const save = (next) => { set(cfg, path, next); renderGradient(box); markDirty(); };
  $$('input[type=color]', box).forEach((inp) => { inp.oninput = () => { const next = [...list]; next[+inp.dataset.i] = inp.value; set(cfg, path, next); markDirty(); }; });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => save(list.filter((_, i) => i !== +b.dataset.del)); });
  const add = $('[data-add]', box);
  if (add) add.onclick = () => save([...list, list.length ? list.at(-1) : (cfg.theme?.accent || '#f5a524'), ...(list.length === 0 && box.dataset.optional ? ['#3b1d5e'] : [])]);
  const reset = $('[data-reset]', box);
  if (reset) reset.onclick = () => save([]);
}

function renderSocial() {
  const list = cfg.social ||= [];
  const box = $('#social');
  box.innerHTML = list.map((s, i) => `<div class="list-row">
    <input value="${esc(s.label)}" data-i="${i}" data-k="label" placeholder="Name (Instagram)" aria-label="Link name">
    <input value="${esc(s.url)}" data-i="${i}" data-k="url" placeholder="https://…" aria-label="Link address">
    <button type="button" class="btn small ghost" data-del="${i}" aria-label="Remove link">Remove</button></div>`).join('') || '<p class="muted small">No links yet.</p>';
  $$('input', box).forEach((inp) => { inp.oninput = () => { list[+inp.dataset.i][inp.dataset.k] = inp.value; markDirty(); }; });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => { list.splice(+b.dataset.del, 1); renderSocial(); markDirty(); }; });
}

const slugify = (s) => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function renderAlbums() {
  const list = (cfg.music ||= {}).albums ||= [];
  const box = $('#albums');
  box.innerHTML = list.map((a, i) => {
    const art = a.cover ? imgSrc(a.cover) : svgDataUrl(albumCoverSvg({ id: a.id, title: a.title || 'Album', artist: a.artist || cfg.site?.artist, color: a.color, markStyle: cfg.music?.covers?.markStyle }));
    return `<div class="album-row">
      <img src="${esc(art)}" alt="" class="album-art">
      <div class="album-fields">
        <input value="${esc(a.title)}" data-i="${i}" data-k="title" placeholder="Album title" aria-label="Album title">
        <input value="${esc(a.prefix)}" data-i="${i}" data-k="prefix" placeholder="File prefix (DEMO)" aria-label="File name prefix">
        <input value="${esc(a.artist)}" data-i="${i}" data-k="artist" placeholder="Artist (blank = yours)" aria-label="Album artist">
        <label class="color mini">Color <input type="color" value="${hex6(a.color, '#9b6bea')}" data-i="${i}" data-k="color"></label>
      </div>
      <div class="album-btns">
        <button type="button" class="btn small" data-cover="${i}">${a.cover ? 'Change cover' : 'Upload cover'}</button>
        ${a.cover ? `<button type="button" class="btn small ghost" data-uncover="${i}">Use drawn cover</button>` : ''}
        <button type="button" class="btn small ghost" data-del="${i}">Remove</button>
      </div></div>`;
  }).join('') || '<p class="muted small">No albums. Every song shows in the main list either way.</p>';
  $$('input', box).forEach((inp) => {
    inp.oninput = () => {
      const a = list[+inp.dataset.i];
      a[inp.dataset.k] = inp.value;
      if (inp.dataset.k === 'title' && (!a.id || a._auto)) { a.id = slugify(inp.value) || `album-${+inp.dataset.i + 1}`; a._auto = true; }
      markDirty();
    };
    inp.onchange = () => renderAlbums();
  });
  $$('[data-cover]', box).forEach((b) => { b.onclick = () => pickImage((p) => { list[+b.dataset.cover].cover = p; renderAlbums(); markDirty(); }); });
  $$('[data-uncover]', box).forEach((b) => { b.onclick = () => { list[+b.dataset.uncover].cover = ''; renderAlbums(); markDirty(); }; });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => { list.splice(+b.dataset.del, 1); renderAlbums(); markDirty(); }; });
}

// ---------- home page: cities, eras, credits ----------
// Common cities so typing a name fills in its position. Anything else: type the latitude/longitude.
const CITIES = {
  'Atlanta': [33.749, -84.388], 'Austin': [30.267, -97.743], 'Baltimore': [39.290, -76.612], 'Birmingham': [33.519, -86.810],
  'Boston': [42.360, -71.059], 'Charleston': [32.777, -79.931], 'Charlotte': [35.227, -80.843], 'Chicago': [41.878, -87.630],
  'Cleveland': [41.499, -81.694], 'Columbia': [34.000, -81.035], 'Dallas': [32.777, -96.797], 'Denver': [39.739, -104.990],
  'Detroit': [42.331, -83.046], 'Durham': [35.994, -78.899], 'Greensboro': [36.073, -79.792], 'Greenville': [34.853, -82.394],
  'Houston': [29.760, -95.370], 'Jacksonville': [30.332, -81.656], 'Kansas City': [39.100, -94.579], 'Las Vegas': [36.170, -115.140],
  'Los Angeles': [34.052, -118.244], 'Louisville': [38.253, -85.759], 'Memphis': [35.150, -90.049], 'Miami': [25.762, -80.192],
  'Nashville': [36.163, -86.781], 'New Orleans': [29.951, -90.072], 'New York': [40.713, -74.006], 'Norfolk': [36.851, -76.286],
  'Oakland': [37.804, -122.271], 'Orlando': [28.538, -81.379], 'Philadelphia': [39.953, -75.165], 'Phoenix': [33.448, -112.074],
  'Pittsburgh': [40.441, -79.996], 'Raleigh': [35.780, -78.640], 'Richmond': [37.541, -77.436], 'Savannah': [32.081, -81.091],
  'Seattle': [47.606, -122.332], 'St. Louis': [38.627, -90.199], 'Tampa': [27.951, -82.457], 'Washington, D.C.': [38.907, -77.037],
  'Winston-Salem': [36.100, -80.244],
};
const PIECE_NAMES = { deck: 'Tape deck', turntable: 'Turntable', beatpad: 'Beat pad', eras: 'Eras', power: 'Power up', studio: 'Studio', notes: 'Liner notes', collect: 'Collect' };
const homeOf = () => { const h = cfg.home ||= {}; h.map ||= {}; h.map.cities ||= []; h.eras ||= []; h.notes ||= {}; h.notes.credits ||= []; h.collect ||= {}; return h; };

function renderHome() {
  const h = homeOf();
  $('#city-names').innerHTML = Object.keys(CITIES).map((n) => `<option value="${esc(n)}">`).join('');
  renderCities(); renderEras(); renderCredits();
  const road = $('#map-road');
  road.value = (h.map.road || []).map((p) => p.join(', ')).join('\n');
  road.oninput = () => { h.map.road = road.value.split('\n').map((l) => l.split(/[,\s]+/).filter(Boolean).map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite)); markDirty(); };
  const items = $('#collect-items');
  items.value = (h.collect.items || []).join(', ');
  items.oninput = () => { h.collect.items = items.value.split(',').map((x) => x.trim()).filter(Boolean); markDirty(); };
}

function renderHighlight() {
  const h = homeOf(); const sel = $('#map-highlight');
  sel.innerHTML = `<option value="">Last stop</option>${h.map.cities.filter((c) => c.name).map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}`;
  sel.value = h.map.highlight || '';
  sel.onchange = () => { h.map.highlight = sel.value; markDirty(); };
}

function renderCities() {
  const list = homeOf().map.cities; const box = $('#cities');
  let n = 0;
  box.innerHTML = list.map((c, i) => {
    const stop = c.stop !== false; if (stop) n++;
    const f = (k, label, extra = '', cls = '') => `<label class="${cls}">${label}<input data-i="${i}" data-k="${k}" value="${esc(c[k])}" ${extra}></label>`;
    return `<details class="city" ${c._open ? 'open' : ''} data-i="${i}">
      <summary>${esc(c.name || 'New city')} <small>${stop ? `Stop ${n}` : 'Light only'}${c.quote ? ' · quote' : ''}${c.draft ? ' · draft' : ''}</small></summary>
      <div class="city-grid">
        ${f('name', 'City', 'list="city-names" placeholder="Start typing…"', 'wide')}
        ${f('short', 'Short name <em>route line</em>', 'placeholder="D.C."')}
        ${f('mapLabel', 'Map label', 'placeholder="same as short"')}
        ${f('lat', 'Latitude', 'inputmode="decimal"')}
        ${f('lon', 'Longitude', 'inputmode="decimal"')}
        <label class="check"><input type="checkbox" data-i="${i}" data-k="stop" ${stop ? 'checked' : ''}> A stop on the tour</label>
        <label class="check"><input type="checkbox" data-i="${i}" data-k="draft" ${c.draft ? 'checked' : ''}> Mark text as draft</label>
        ${stop ? `${f('heading', 'Card heading', '', 'wide')}
        <label class="wide">Opens <select data-i="${i}" data-k="open"><option value="">Nothing</option>${Object.entries(PIECE_NAMES).map(([id, nm]) => `<option value="${id}" ${c.open === id ? 'selected' : ''}>${nm}</option>`).join('')}</select></label>
        ${f('quote', 'Quote <em>the artist\'s words</em>', '', 'full')}
        <label class="full">Story <textarea data-i="${i}" data-k="story" rows="2">${esc(c.story)}</textarea></label>
        ${c.open ? `${f('button', 'Button text <em>blank = default</em>', '', 'wide')}${f('how', 'How to play <em>blank = default</em>', '', 'wide')}` : ''}` : ''}
      </div>
      <div class="city-btns">
        <button type="button" class="btn small ghost" data-up="${i}" ${i ? '' : 'disabled'}>Move up</button>
        <button type="button" class="btn small ghost" data-down="${i}" ${i < list.length - 1 ? '' : 'disabled'}>Move down</button>
        <button type="button" class="btn small ghost" data-del="${i}">Remove</button>
      </div></details>`;
  }).join('') || '<p class="muted small">No cities yet. Add the places the story travels through, in order.</p>';
  $$('details', box).forEach((d) => { d.ontoggle = () => { list[+d.dataset.i]._open = d.open; }; });
  $$('[data-k]', box).forEach((el) => {
    const c = list[+el.dataset.i]; const k = el.dataset.k;
    el.oninput = () => {
      if (el.type === 'checkbox') c[k] = el.checked;
      else if (k === 'lat' || k === 'lon') c[k] = el.value === '' ? '' : Number(el.value);
      else c[k] = el.value;
      if (k === 'name') {
        const hit = CITIES[el.value.trim()];
        if (hit) { c.lat = hit[0]; c.lon = hit[1]; $(`[data-i="${el.dataset.i}"][data-k=lat]`, box).value = hit[0]; $(`[data-i="${el.dataset.i}"][data-k=lon]`, box).value = hit[1]; }
        if (!c.id || c._autoId) { c.id = slugify(el.value) || `city-${+el.dataset.i + 1}`; c._autoId = true; }
      }
      markDirty();
    };
    if (el.type === 'checkbox' || el.tagName === 'SELECT' || k === 'name' || k === 'quote') el.onchange = () => { renderCities(); };
  });
  const move = (i, d) => { const [c] = list.splice(i, 1); list.splice(i + d, 0, c); renderCities(); markDirty(); };
  $$('[data-up]', box).forEach((b) => { b.onclick = () => move(+b.dataset.up, -1); });
  $$('[data-down]', box).forEach((b) => { b.onclick = () => move(+b.dataset.down, 1); });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => { list.splice(+b.dataset.del, 1); renderCities(); markDirty(); }; });
  renderHighlight();
}

function renderEras() {
  const list = homeOf().eras; const box = $('#eras');
  box.innerHTML = list.map((e, i) => `<div class="era-row">
    <input data-i="${i}" data-k="year" value="${esc(e.year)}" placeholder="Year" aria-label="Year">
    <input data-i="${i}" data-k="name" value="${esc(e.name)}" placeholder="Name (Then, Now)" aria-label="Era name">
    <input data-i="${i}" data-k="story" value="${esc(e.story)}" placeholder="A line about this era" aria-label="Era story">
    <select data-i="${i}" data-k="look" aria-label="Picture look"><option value="color">Color</option><option value="mono" ${e.look === 'mono' ? 'selected' : ''}>Black &amp; white</option><option value="gold" ${e.look === 'gold' ? 'selected' : ''}>Gold glow</option></select>
    <span class="album-btns">${e.image ? `<img src="${esc(imgSrc(e.image))}" alt="">` : ''}
      <button type="button" class="btn small" data-img="${i}">${e.image ? 'Change' : 'Picture'}</button>
      ${e.image ? `<button type="button" class="btn small ghost" data-noimg="${i}">Use cutout</button>` : ''}
      <button type="button" class="btn small ghost" data-del="${i}" aria-label="Remove era">×</button></span></div>`).join('') || '<p class="muted small">No eras. The Eras piece is hidden until you add some.</p>';
  $$('[data-k]', box).forEach((el) => { el.oninput = el.onchange = () => { list[+el.dataset.i][el.dataset.k] = el.value; markDirty(); }; });
  $$('[data-img]', box).forEach((b) => { b.onclick = () => pickImage((p) => { list[+b.dataset.img].image = p; renderEras(); markDirty(); }); });
  $$('[data-noimg]', box).forEach((b) => { b.onclick = () => { list[+b.dataset.noimg].image = ''; renderEras(); markDirty(); }; });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => { list.splice(+b.dataset.del, 1); renderEras(); markDirty(); }; });
}

function renderCredits() {
  const list = homeOf().notes.credits; const box = $('#credits');
  box.innerHTML = list.map((c, i) => `<div class="list-row">
    <input value="${esc(c.label)}" data-i="${i}" data-k="label" placeholder="Written by" aria-label="Credit">
    <input value="${esc(c.value)}" data-i="${i}" data-k="value" placeholder="Name" aria-label="Who">
    <button type="button" class="btn small ghost" data-del="${i}">Remove</button></div>`).join('') || '<p class="muted small">No credits yet.</p>';
  $$('input', box).forEach((inp) => { inp.oninput = () => { list[+inp.dataset.i][inp.dataset.k] = inp.value; markDirty(); }; });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => { list.splice(+b.dataset.del, 1); renderCredits(); markDirty(); }; });
}

// ---------- live preview ----------
const SAMPLE = ['Night Drive', 'Morning Coffee', 'Bounce House', 'First Light', 'Second Wind', 'Summer Song'];
function renderPreview() {
  const t = cfg.theme || {}; const s = cfg.site || {}; const sp = cfg.splash || {};
  const pv = $('#preview');
  pv.style.setProperty('--p-accent', t.accent || '#f5a524');
  pv.style.setProperty('--p-bg', t.background || '#0e0f13');
  pv.style.setProperty('--p-surface', t.surface || '#171920');
  pv.style.setProperty('--p-text', t.text || '#f2f3f5');
  pv.style.setProperty('--p-muted', t.muted || '#9aa0ad');
  pv.dataset.font = t.font || 'system';
  const g = sp.gradient?.length >= 2 ? sp.gradient : [t.accent || '#f5a524', '#ff4fd8', '#19c3ff'];
  const spl = $('#pv-splash');
  spl.style.setProperty('--g1', g[0]); spl.style.setProperty('--g2', g[1]); spl.style.setProperty('--g3', g[2] || g[0]);
  spl.style.backgroundImage = sp.image ? `linear-gradient(#0006, #0006), url("${imgSrc(sp.image)}")` : '';
  $('#pv-splash-title').innerHTML = esc(sp.title || s.headerTitle || s.name) + (!sp.title && s.headerAccent ? `<b>${esc(s.headerAccent)}</b>` : '');
  $('#pv-tag').textContent = s.tagline || '';
  $('#pv-enter').textContent = sp.subtitle || 'Tap to enter';
  $('#pv-title').innerHTML = esc(s.headerTitle || s.name) + (s.headerAccent ? `<b>${esc(s.headerAccent)}</b>` : '');
  const logo = $('#pv-logo');
  logo.hidden = !t.logo; if (t.logo) logo.src = imgSrc(t.logo);
  $('#pv-name').textContent = s.name || '';
  const c = cfg.music?.covers || {};
  const mark = c.mark || initials(s.artist || s.name);
  $('#pv-rows').innerHTML = SAMPLE.slice(0, 4).map((n) => `<div><img src="${svgDataUrl(coverSvg({ id: n, color: colorFor(n, c.colors), mark, markStyle: c.markStyle }))}" alt=""><span>${n}<small>${esc(s.artist || '')}</small></span></div>`).join('');
  $('#cover-samples').innerHTML = SAMPLE.map((n) => `<img src="${svgDataUrl(coverSvg({ id: n, color: colorFor(n, c.colors), mark, markStyle: c.markStyle }))}" alt="Sample cover for ${n}" title="${n}">`).join('');
}

// ---------- save / import / export ----------
function cleanForSave() {
  const out = structuredClone(cfg);
  for (const a of out.music?.albums || []) { delete a._auto; a.id = a.id || slugify(a.title); }
  if (out.music) out.music.albums = (out.music.albums || []).filter((a) => a.title);
  if (out.social) out.social = out.social.filter((x) => x.label || x.url);
  if (out.home?.map?.cities) out.home.map.cities = out.home.map.cities.filter((c) => c.name).map(({ _open, _autoId, ...c }) => ({ ...c, id: c.id || slugify(c.name) }));
  if (out.home?.notes?.credits) out.home.notes.credits = out.home.notes.credits.filter((c) => c.label || c.value);
  if (out.home?.eras) out.home.eras = out.home.eras.filter((e) => e.year || e.name);
  return out;
}

async function save() {
  const out = cleanForSave();
  if (!online) { exportJson(); return false; }
  note('Saving…');
  try {
    await api('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) });
    dirty = false;
    note(`Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'good');
    return true;
  } catch (e) { note(e.message, 'bad'); return false; }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(cleanForSave(), null, 2) + '\n'], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'site.config.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  if (!online) note('Exported. Put site.config.json in the kit folder.', 'good');
}

function importJson() {
  const input = $('#import-file');
  input.value = '';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      const next = JSON.parse(await f.text());
      if (!next.site) throw new Error('That file has no "site" section. Is it a site.config.json?');
      cfg = next;
      $('#form').hidden = false;
      bindFields();
      markDirty();
      note(online ? 'Imported. Press Save to use it.' : 'Imported.', 'warn');
    } catch (e) { note(e instanceof SyntaxError ? 'That file isn\'t valid JSON.' : e.message, 'bad'); }
  };
  input.click();
}

// ---------- music scan ----------
async function scan() {
  if (!online) { note('Scanning needs the setup helper (npm start).', 'bad'); return; }
  if (dirty) await save(); // album prefixes affect the scan
  $('#scan-state').textContent = 'Scanning…';
  try {
    const d = await api('/api/tracks', { method: 'POST' });
    $('#scan-state').textContent = d.count ? `${d.count} song${d.count === 1 ? '' : 's'} found` : 'No audio files found in the music folder yet.';
    const albums = Object.fromEntries((cfg.music?.albums || []).map((a) => [a.id, a.title]));
    $('#songs').innerHTML = d.count ? `<table><thead><tr><th>Title</th><th>Album</th><th>BPM</th><th>Date</th><th>Versions</th></tr></thead><tbody>${d.tracks.map((t) => `<tr title="${esc(t.file)}"><td>${esc(t.title)}</td><td>${esc(albums[t.album] || '')}</td><td>${t.bpm ?? ''}</td><td>${t.date ?? ''}</td><td>${t.versions}</td></tr>`).join('')}</tbody></table>${d.count > d.tracks.length ? `<p class="muted small">Showing the first ${d.tracks.length}.</p>` : ''}` : '';
  } catch (e) { $('#scan-state').textContent = e.message; }
}

// ---------- build + log ----------
let logNext = 0; let polling = null;
async function run(task) {
  if (!online) { note('Building needs the setup helper (npm start).', 'bad'); return; }
  if (task.startsWith('build') && dirty && !(await save())) return;
  try {
    await api('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task }) });
    const log = $('#log'); log.hidden = false;
    if (task !== 'stop' && !task.startsWith('dev')) { log.textContent = ''; logNext = 0; }
    poll();
  } catch (e) { note(e.message, 'bad'); }
}

function poll() {
  clearTimeout(polling);
  const tick = async () => {
    try {
      const d = await api(`/api/log?since=${logNext}`);
      if (d.lines.length) {
        const log = $('#log');
        log.textContent += d.lines.join('\n') + '\n';
        log.scrollTop = log.scrollHeight;
      }
      logNext = d.next;
      setBusy(!!d.task);
      if (d.task || d.dev) polling = setTimeout(tick, 700);
      else { refreshState(); if (d.result === true) note('Build finished. Preview it, then upload dist/.', 'good'); if (d.result === false) note('The build stopped. See the log.', 'bad'); }
    } catch { polling = setTimeout(tick, 2000); }
  };
  tick();
}

function setBusy(busy) {
  for (const b of ['#btn-build', '#btn-build-code', ...$$('[data-run]').map((x) => x)]) {
    const el = typeof b === 'string' ? $(b) : b;
    if (el && el.dataset.run !== 'stop') el.disabled = busy;
  }
  $('#btn-build').textContent = busy ? 'Working…' : 'Save and build site';
}

async function refreshState() {
  try {
    const st = await api('/api/state');
    $('#music-folder').textContent = st.musicFolder;
    const bits = [
      `Node ${st.node}`,
      st.installed ? 'packages installed' : 'packages not installed yet (the first build installs them; needs internet)',
      `${st.musicFiles} audio file${st.musicFiles === 1 ? '' : 's'} in ${st.musicFolder}/`,
      `${st.tracks} song${st.tracks === 1 ? '' : 's'} in the list`,
      st.built ? `last built ${new Date(st.built).toLocaleString()}` : 'not built yet',
    ];
    $('#build-status').textContent = bits.join(' · ');
    if (!$('#scan-state').textContent) $('#scan-state').textContent = st.musicFiles !== undefined ? `${st.musicFiles} audio file${st.musicFiles === 1 ? '' : 's'} in the folder` : '';
    if (st.task || st.dev) { $('#log').hidden = false; poll(); }
    return st;
  } catch { return null; }
}

// ---------- section nav highlight ----------
function navSpy() {
  const links = $$('.steps a');
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === `#${e.target.id}`));
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('#form > section').forEach((s) => obs.observe(s));
}

// ---------- start ----------
async function start() {
  $('#btn-save').onclick = save;
  $('#btn-export').onclick = exportJson;
  $('#btn-import').onclick = importJson;
  $('#btn-scan').onclick = scan;
  $('#btn-build').onclick = () => run('build');
  $('#btn-build-code').onclick = () => run('build-code');
  $$('[data-run]').forEach((b) => { b.onclick = () => run(b.dataset.run); });
  $('#add-social').onclick = () => { (cfg.social ||= []).push({ label: '', url: '' }); renderSocial(); markDirty(); };
  $('#add-city').onclick = () => { homeOf().map.cities.forEach((c) => { c._open = false; }); homeOf().map.cities.push({ id: '', name: '', short: '', lat: '', lon: '', stop: true, heading: '', quote: '', story: '', open: '', draft: false, _open: true, _autoId: true }); renderCities(); markDirty(); };
  $('#add-era').onclick = () => { homeOf().eras.push({ year: '', name: '', story: '', image: '', look: 'color' }); renderEras(); markDirty(); };
  $('#add-credit').onclick = () => { homeOf().notes.credits.push({ label: '', value: '' }); renderCredits(); markDirty(); };
  $('#add-album').onclick = () => { const n = (cfg.music.albums ||= []).length + 1; cfg.music.albums.push({ id: `album-${n}`, title: '', prefix: '', artist: '', cover: '', color: '#9b6bea', _auto: true }); renderAlbums(); markDirty(); };
  window.addEventListener('beforeunload', (e) => { if (dirty && online) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } });
  navSpy();

  try {
    const st = await api('/api/state');
    online = true;
    if (!st.config) throw new Error(`site.config.json couldn't be read: ${st.configError}`);
    cfg = st.config;
    $('#offline').hidden = true;
    $('#form').hidden = false;
    bindFields();
    note('All saved', 'good');
    refreshState();
  } catch (e) {
    note(online ? e.message : 'Setup helper not running', 'bad');
  }
}
start();
