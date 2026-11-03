/**
 * Starting palettes for the Cover Studio (tools/cover-studio.html).
 * Each is a few hand-picked colors; spread() turns them into smooth in-between shades.
 * A null in the list starts a new color family that doesn't blend with the one before it.
 */
export const SEASONS = [
  { id: "fall", name: "Fall Sunset", about: "Burnt orange, amber and gold fading into rust, cranberry and plum dusk.",
    stops: ["#e8a33d", "#f28c28", "#e2662c", "#c94a32", "#b5383f", "#a8344f", "#9b4a7a", "#8a5aa8", "#c77b3f", "#d9a441", "#b9a03c", "#e8a33d"] },
  { id: "summer", name: "Summer Sunset", about: "Golden hour: apricot, coral and pink running into violet sky and warm sea teal.",
    stops: ["#ffd56b", "#ffb36b", "#ff8c6b", "#ff6a6a", "#ff5e8a", "#ff7eb6", "#e47ff5", "#b07cf7", "#7f8cf5", "#4fb8f7", "#2ec4b6", "#ffd56b"] },
  { id: "winter", name: "Winter Holiday", about: "Royal and icy blues, frost and silver, with evergreen, holly red and a little gold.",
    // separate families (null = don't blend across): blues & frost, silver, evergreens, holly reds, gold
    stops: ["#2f6fe0", "#4f95ff", "#8cc4ff", "#c7e3ff", "#e6eef8", null, "#c9d3e3", "#a9b8d0", null, "#9fdcc6", "#46b97f", "#2f9e6e", null, "#c8304a", "#e8586a", null, "#f2c14e", "#f7d77e"] },
  { id: "spring", name: "Spring Bloom", about: "Cherry blossom, lilac and daffodil with fresh new-leaf greens and clear sky.",
    stops: ["#f7a8cf", "#ff9fb2", "#ffb38a", "#ffd166", "#e6e46b", "#a8e063", "#6fd39a", "#7ed6df", "#8fb8ff", "#b4a0ff", "#d9a0f5", "#f7a8cf"] },
];

/**
 * Single-color palettes: each runs one color from deep to pale. The darkest shades stay light
 * enough for a dark center mark to read.
 */
export const SINGLES = [
  { id: "mono", name: "Monochrome", about: "Graphite to silver to soft white. Calm and classic.",
    stops: ["#4b4f59", "#6b707c", "#9096a2", "#b9bec8", "#e3e6eb"] },
  { id: "blue", name: "All Blue", about: "Deep navy through royal and sky blue to ice.",
    stops: ["#1f3c9e", "#2a5fd6", "#3f8cf5", "#73b4ff", "#b3d8ff", "#dff0ff"] },
  { id: "red", name: "All Red", about: "Wine and crimson through bright red to coral and blush.",
    stops: ["#8e1b2b", "#b8233a", "#e0383f", "#f2605a", "#ff8f86", "#ffc4bd"] },
  { id: "green", name: "All Green", about: "Forest and emerald through grass to mint.",
    stops: ["#1e6b3a", "#24914c", "#36b65f", "#68d27a", "#a6e8a0", "#d6f7cc"] },
  { id: "orange", name: "All Orange", about: "Burnt orange through tangerine to apricot and cream.",
    stops: ["#a3420f", "#d25a14", "#f07a1e", "#ff9a3d", "#ffbd73", "#ffdcb0"] },
  { id: "purple", name: "All Purple", about: "Deep violet through amethyst to lavender.",
    stops: ["#4b2593", "#6a35c4", "#8a52e8", "#a97cf5", "#c9a9fa", "#e6d6ff"] },
];

// ---- spread a few stops into n smooth colors (blended in a perceptual space, so midpoints don't go muddy)
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hexToOklab = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const oklabToHex = ([L, A, B]) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255).toString(16).padStart(2, "0")).join("");
};
export function spread(stops, n = 128) {
  // Split into families at nulls; each family gets colors in proportion to how many blends it has
  const fams = []; let cur = [];
  for (const c of stops) { if (c === null) { if (cur.length) fams.push(cur); cur = []; } else cur.push(c); }
  if (cur.length) fams.push(cur);
  const weight = fams.map((f) => Math.max(1, f.length - 1));
  const total = weight.reduce((a, b) => a + b, 0);
  const counts = weight.map((w) => Math.floor((w / total) * n));
  for (let i = 0; counts.reduce((a, b) => a + b, 0) < n; i = (i + 1) % counts.length) counts[i]++;
  const out = [];
  fams.forEach((fam, fi) => {
    const labs = fam.map(hexToOklab), segs = Math.max(1, labs.length - 1), m = counts[fi];
    for (let i = 0; i < m; i++) {
      const t = (m === 1 ? 0 : i / (m - 1)) * (labs.length - 1), k = Math.min(Math.floor(t), labs.length - 1), f = t - k;
      const a = labs[k], b = labs[Math.min(k + 1, labs.length - 1)];
      out.push(oklabToHex(a.map((v, j) => v + (b[j] - v) * f)));
    }
  });
  return out;
}
