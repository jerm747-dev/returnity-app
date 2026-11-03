// The night map behind the artist home page: town lights, an optional road and coastline, gold
// flight arcs between the tour cities with a light riding each one, straight point-to-point beams,
// and a camera that flies from city to city as the visitor scrolls past each tour stop.
// Everything comes from site.config.json → home.map. Plain canvas, no libraries.

// Region presets add a coastline and extra town lights. "us-east" covers the Atlantic coast.
export const REGIONS = {
  'us-east': {
    coast: [[40.6, -73.9], [40.1, -74.05], [39.4, -74.4], [38.93, -74.9], [38.45, -75.05], [37.9, -75.38], [37.1, -75.95], [36.9, -76.0], [36.5, -75.85], [35.9, -75.6], [35.25, -75.52], [34.7, -76.6], [34.2, -77.8], [33.85, -78.5], [33.3, -79.2], [32.75, -79.85], [32.1, -80.9], [31.5, -81.2], [30.7, -81.45], [29.9, -81.3], [28.9, -80.9], [27.9, -80.5], [26.7, -80.05], [25.8, -80.15]],
    towns: [[39.29, -76.61, 7], [39.95, -75.17, 9], [40.71, -74.0, 10], [36.85, -76.29, 6], [37.54, -77.43, 6], [36.07, -79.79, 5], [35.99, -78.9, 5], [34.0, -81.03, 5], [32.78, -79.93, 5], [32.08, -81.09, 4], [33.47, -81.97, 4], [32.84, -83.63, 4], [35.05, -85.31, 5], [35.96, -83.92, 5], [35.6, -82.55, 4], [37.27, -79.94, 4], [34.23, -77.94, 3], [35.05, -78.88, 4], [33.52, -86.8, 6], [36.16, -86.78, 6], [34.85, -82.4, 4], [34.95, -81.93, 3], [35.26, -81.19, 3], [37.23, -77.4, 3], [38.3, -77.46, 3], [34.3, -83.82, 3], [33.95, -83.38, 3], [38.03, -78.48, 3], [39.14, -77.2, 4], [38.8, -76.9, 4], [30.33, -81.66, 5], [28.54, -81.38, 6], [27.95, -82.46, 6], [25.76, -80.19, 8], [38.25, -85.76, 5], [39.1, -84.51, 6], [39.96, -83.0, 6], [40.44, -79.99, 6]],
  },
};

const rand = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const ease = (x) => x * x * (3 - 2 * x);
const hexRgb = (hex) => { const n = parseInt(String(hex || '#e2ad4f').replace('#', '').slice(0, 6), 16) || 0xe2ad4f; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * mountNightMap(canvas, { map, accent, getStops, getTour, reduce })
 *   map:      home.map from the settings ({ cities, road, region, returnArc, highlight })
 *   getStops: () => the tour stop elements, in order (one per stop city)
 *   getTour:  () => the tour section element
 * Returns { remeasure, destroy }.
 */
export function mountNightMap(canvas, { map, accent, getStops, getTour, reduce }) {
  const ctx = canvas.getContext('2d');
  const cities = (map.cities || []).filter((c) => Number.isFinite(+c.lat) && Number.isFinite(+c.lon)).map((c) => ({ ...c, lat: +c.lat, lon: +c.lon }));
  const stops = cities.filter((c) => c.stop !== false);
  const extras = cities.filter((c) => c.stop === false);
  const region = REGIONS[map.region] || { coast: [], towns: [] };
  const road = (map.road || []).filter((p) => Array.isArray(p) && p.length >= 2);
  const bright = cities.find((c) => c.id && c.id === map.highlight) || stops[stops.length - 1];
  const legs = stops.slice(1).map((c, i) => [stops[i], c, i % 2 ? .3 : .32]);
  const [ar, ag, ab] = hexRgb(accent);
  const gold = (a) => `rgba(${ar}, ${ag}, ${ab}, ${a})`;

  // Frame: everything in the settings, padded, at least 4° tall
  const lats = cities.map((c) => c.lat), lons = cities.map((c) => c.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2, midLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const k = Math.cos(midLat * Math.PI / 180);
  const spanY = Math.max(4, (Math.max(...lats) - Math.min(...lats)) * 1.5), spanX = Math.max(4 / k, (Math.max(...lons) - Math.min(...lons)) * 1.35) * k;

  let W = 0, H = 0, dpr = 1, view = null, keys = [], tourPos = -1, raf = 0, dots = [];
  const cam = { lat: midLat, lon: midLon, s: 1, fx: .5, fy: .5 };
  const proj = (lat, lon) => [W * cam.fx + (lon - cam.lon) * k * cam.s, H * cam.fy + (cam.lat - lat) * cam.s];

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const narrow = W < 900;
    const s0 = Math.min((narrow ? W * 1.05 : W * .58) / spanX, H * .84 / spanY);
    view = { s0, narrow, ovFx: narrow ? .5 : (W - spanX * s0 / 2 - W * .03) / W };
    const r = rand(747);
    dots = [];
    for (const [la, lo, n] of region.towns) for (let i = 0; i < n * 9; i++) { const a = r() * 6.283, d = r() ** 2 * .28 * Math.sqrt(n / 4); dots.push([la + Math.sin(a) * d, lo + Math.cos(a) * d / k, r()]); }
    const corridor = road.length > 1 ? road : stops.map((c) => [c.lat, c.lon]);
    for (let i = 0; corridor.length > 1 && i < 300; i++) { const seg = Math.floor(r() * (corridor.length - 1)), t = r(); const [a1, b1] = corridor[seg], [a2, b2] = corridor[seg + 1]; dots.push([a1 + (a2 - a1) * t + (r() - .5) * .35, b1 + (b2 - b1) * t + (r() - .5) * .45, r()]); }
    for (const c of cities) for (let i = 0; i < (c === bright ? 260 : c.stop === false ? 70 : 170); i++) { const a = r() * 6.283, d = r() ** 1.6 * .42; dots.push([c.lat + Math.sin(a) * d, c.lon + Math.cos(a) * d / k, r()]); }
  }

  const frameFor = (c) => (!c
    ? { lat: midLat, lon: midLon, s: view.s0, fx: view.ovFx, fy: .5 }
    : { lat: c.lat, lon: c.lon, s: view.s0 * (c === bright ? 2.5 : 2.2) * (view.narrow ? 1.15 : 1), fx: view.narrow ? .5 : .7, fy: view.narrow ? .3 : .5 });

  function remeasure() {
    const els = getStops?.() || [], tour = getTour?.();
    if (!els.length || !tour) { keys = []; return; }
    const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2; };
    keys = [
      { y: innerHeight * .5, f: frameFor(null), i: -1 },
      ...els.slice(0, stops.length).map((el, i) => ({ y: mid(el), f: frameFor(stops[i]), i })),
      { y: tour.getBoundingClientRect().bottom + scrollY + innerHeight * .35, f: frameFor(null), i: stops.length },
    ];
  }

  function updateCam() {
    if (!keys.length) { Object.assign(cam, frameFor(null)); tourPos = -1; return; }
    const y = scrollY + innerHeight * .5;
    let a = keys[0], b = keys[0], t = 0;
    if (y >= keys[keys.length - 1].y) a = b = keys[keys.length - 1];
    else if (y > keys[0].y) for (let j = 0; j < keys.length - 1; j++) if (y < keys[j + 1].y) { a = keys[j]; b = keys[j + 1]; t = (y - a.y) / (b.y - a.y); break; }
    const e = ease(Math.min(1, Math.max(0, (t - .2) / .6))); // hold on each city while its card is centered
    const L = (p, q) => p + (q - p) * e;
    cam.lat = L(a.f.lat, b.f.lat); cam.lon = L(a.f.lon, b.f.lon); cam.fx = L(a.f.fx, b.f.fx); cam.fy = L(a.f.fy, b.f.fy);
    cam.s = Math.exp(L(Math.log(a.f.s), Math.log(b.f.s)));
    tourPos = L(a.i, b.i);
  }

  function arcPoint(a, b, t, lift) {
    const [x1, y1] = proj(a.lat, a.lon), [x2, y2] = proj(b.lat, b.lon);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const cx = mx + (dy / len) * len * lift, cy = my - (dx / len) * len * lift * Math.sign(dx || 1);
    const u = 1 - t; return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2];
  }
  const line = (pts) => { ctx.beginPath(); pts.forEach(([la, lo], i) => { const [x, y] = proj(la, lo); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };

  function draw(time) {
    const t = time / 1000;
    updateCam();
    const zoom = Math.min(1.8, Math.sqrt(cam.s / view.s0));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0e0e11'); sky.addColorStop(1, '#09090b');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (region.coast.length) {
      line(region.coast); const last = region.coast[region.coast.length - 1], first = region.coast[0];
      ctx.lineTo(W + 60, proj(last[0], last[1])[1]); ctx.lineTo(W + 60, -60); ctx.lineTo(proj(first[0], first[1])[0], -60); ctx.closePath();
      ctx.fillStyle = 'rgba(4, 4, 6, .55)'; ctx.fill();
      line(region.coast); ctx.strokeStyle = gold(.2); ctx.lineWidth = 1.2; ctx.stroke();
    }
    for (const [la, lo, v] of dots) {
      const [x, y] = proj(la, lo); if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      const tw = reduce ? .8 : .55 + .45 * Math.sin(t * (1 + v * 2) + v * 40);
      ctx.fillStyle = `rgba(255, ${190 + v * 50 | 0}, ${90 + v * 80 | 0}, ${(.25 + v * .5) * tw})`;
      const sz = (v > .85 ? 1.8 : 1.1) * zoom; ctx.fillRect(x, y, sz, sz);
    }
    if (road.length > 1) { line(road); ctx.strokeStyle = gold(.5); ctx.lineWidth = 2.2; ctx.shadowColor = gold(1); ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.setLineDash([3, 7]);
    for (const [a, b] of legs) { line([[a.lat, a.lon], [b.lat, b.lon]]); ctx.strokeStyle = 'rgba(150, 200, 195, .45)'; ctx.lineWidth = 1.3; ctx.stroke(); }
    ctx.setLineDash([]);
    const arcs = [...legs]; if (map.returnArc !== false && stops.length > 2) arcs.push([stops[stops.length - 1], stops[0], -.55]);
    arcs.forEach(([a, b, lift], i) => {
      const ret = i === legs.length;
      ctx.beginPath(); for (let s = 0; s <= 40; s++) { const [x, y] = arcPoint(a, b, s / 40, lift); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = ret ? 'rgba(210, 160, 175, .3)' : 'rgba(255, 220, 140, .75)'; ctx.lineWidth = ret ? 1.2 : 1.8;
      if (ret) ctx.setLineDash([2, 8]); ctx.stroke(); ctx.setLineDash([]);
      const p = reduce ? .55 : ((t * (ret ? .07 : .16) + i * .33) % 1);
      for (let k2 = 0; k2 < 8; k2++) { const q = p - k2 * .012; if (q < 0) continue; const [x, y] = arcPoint(a, b, q, lift); ctx.fillStyle = ret ? `rgba(220, 170, 185, ${.7 - k2 * .08})` : `rgba(255, 238, 190, ${.95 - k2 * .11})`; ctx.beginPath(); ctx.arc(x, y, (ret ? 2 : 2.6) - k2 * .22, 0, 6.283); ctx.fill(); }
    });
    // the tour traveler
    if (legs.length && tourPos > -1 && tourPos < stops.length) {
      const tp = Math.min(legs.length, Math.max(0, tourPos)), leg = Math.min(legs.length - 1, Math.floor(tp)), [a, b, lift] = legs[leg];
      const [x, y] = arcPoint(a, b, tp - leg, lift), fade = Math.min(1, tourPos + 1, stops.length - tourPos);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26 * zoom); g.addColorStop(0, `rgba(255, 250, 232, ${fade})`); g.addColorStop(.3, gold(.5 * fade)); g.addColorStop(1, gold(0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26 * zoom, 0, 6.283); ctx.fill();
      ctx.strokeStyle = `rgba(255, 250, 232, ${.7 * fade})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, (9 + (reduce ? 0 : Math.sin(t * 4) * 2)) * zoom, 0, 6.283); ctx.stroke();
    }
    // city glows; the highlighted city brightest, with turning rays and twinkles
    for (const c of cities) {
      const [x, y] = proj(c.lat, c.lon), hi = c === bright, small = c.stop === false;
      const near = Math.max(0, 1 - Math.abs(tourPos - stops.indexOf(c)));
      const pulse = reduce ? 1 : 1 + .12 * Math.sin(t * (hi ? 2.2 : 1.4) + x);
      const R = (hi ? 46 : small ? 16 : 28) * pulse * (1 + (stops.includes(c) ? near * .7 : 0)) * Math.min(1.4, zoom);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, hi ? 'rgba(255, 248, 220, 1)' : 'rgba(255, 232, 170, .95)'); g.addColorStop(.25, gold(hi ? .75 : .5)); g.addColorStop(1, gold(0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
      if (hi) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? .3 : t * .25);
        for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); const len = (i % 2 ? 46 : 82) * pulse; const rg = ctx.createLinearGradient(0, 0, len, 0); rg.addColorStop(0, 'rgba(255, 242, 205, .8)'); rg.addColorStop(1, 'rgba(255, 242, 205, 0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.lineTo(len, 0); ctx.lineTo(0, 1.4); ctx.fill(); }
        ctx.restore();
        for (let i = 0; i < 14; i++) { const a = i * 2.4 + t * .3, d = 22 + (i * 17) % 50, tw = reduce ? .6 : (Math.sin(t * 3 + i * 1.7) + 1) / 2, sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d * .7; ctx.fillStyle = `rgba(255, 246, 225, ${tw})`; ctx.fillRect(sx - .8, sy - 3 * tw, 1.6, 6 * tw); ctx.fillRect(sx - 3 * tw, sy - .8, 6 * tw, 1.6); }
      }
      ctx.font = `500 ${hi ? 11 : 10}px 'Share Tech Mono', ui-monospace, monospace`;
      ctx.fillStyle = hi ? gold(.95) : 'rgba(235, 231, 223, .7)';
      const leftLabel = hi && x > W * .55; ctx.textAlign = leftLabel ? 'right' : 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillText(String(c.mapLabel || c.name || '').toUpperCase(), x + (leftLabel ? -16 : 14), y + (small ? -10 : 4));
    }
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  const onResize = () => { layout(); remeasure(); if (reduce) requestAnimationFrame(draw); };
  const onScroll = () => { if (reduce) requestAnimationFrame(draw); };
  layout(); remeasure(); raf = requestAnimationFrame(draw);
  addEventListener('resize', onResize);
  addEventListener('scroll', onScroll, { passive: true });
  return {
    remeasure: () => { remeasure(); if (reduce) requestAnimationFrame(draw); },
    destroy: () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); removeEventListener('scroll', onScroll); },
  };
}
