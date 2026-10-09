// L'univers : nature à la tombée de la nuit, bougie, calme.
// Décors plein cadre 1080 x 1920, lumière (lueur de bougie, voile de nuit) et petits objets.

import { W, H, rng, clamp, lerp, wave, ell, circle, rect, blob, limb, line, seg, arc, at, texture, draw } from './core.js';

// Palette crépuscule. Les scènes peuvent passer leurs propres couleurs.
export const N = {
  ink: '#2a2038',
  skyTop: '#221f47', skyMid: '#64487a', skyLow: '#de8f7c', skyGold: '#f8d49b',
  sun: '#ffe7b3', moon: '#fbeecb', star: '#fff6dc',
  isle: '#4a3d6c', isleFar: '#7a5a86',
  sea: '#3a4479', seaDeep: '#23264d', seaGlow: '#f3b98a',
  sand: '#74586a', sandDark: '#3a2d47', foam: '#f6e3d3',
  palm: '#1f1a33', leaf: '#2b3a44',
  mat: '#a2554c', matEdge: '#e9c7a0',
  wax: '#f5e8d2', flame: '#ffd27a', flameCore: '#fff6d6', glow: '255,186,104',
  wood: '#7a5240', cream: '#f1e3cf', gold: '#f2c26b',
};
export const SOL = { plage: 1500, veranda: 1540, jardin: 1520, lac: 1510 };
// Ciels : crépuscule (défaut), heure bleue, nuit.
export const PAL = {
  crepuscule: { top: N.skyTop, mid: N.skyMid, low: N.skyLow, gold: N.skyGold, halo: '255,196,140' },
  heureBleue: { top: '#131a3d', mid: '#2c477a', low: '#8c9cc4', gold: '#f2c7a6', halo: '255,205,170' },
  nuit: { top: '#0e112c', mid: '#1b2250', low: '#343c78', gold: '#5d5890', halo: '150,140,220' },
  aube: { top: '#4d5f9c', mid: '#b98fae', low: '#f2b39a', gold: '#ffe6b3', halo: '255,214,160' },   // le jour qui monte (ad-Duha)
};

/** Assombrit (k < 0) ou éclaircit (k > 0) une couleur hexadécimale. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

// ---------- lumière ----------
/** Lueur chaude autour d'une flamme : éclaire ce qui est déjà dessiné. */
export function lueur(g, x, y, r = 520, a = 0.55, t = 0) {
  const k = 1 + 0.035 * wave(t, 1.7) + 0.02 * wave(t, 3.1, 0.3);
  const gr = g.createRadialGradient(x, y, 4, x, y, r * k);
  gr.addColorStop(0, `rgba(${N.glow},${a})`);
  gr.addColorStop(0.35, `rgba(${N.glow},${a * 0.42})`);
  gr.addColorStop(1, `rgba(${N.glow},0)`);
  g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr;
  g.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4); g.restore();
}
/** Voile de nuit : assombrit les bords, garde le centre (cx, cy) clair. */
export function voileNuit(g, cx = 540, cy = 1150, a = 0.5) {
  const gr = g.createRadialGradient(cx, cy, 260, cx, cy, 1500);
  gr.addColorStop(0, 'rgba(60,45,95,0)'); gr.addColorStop(1, `rgba(34,26,64,${a})`);
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = gr;
  g.fillRect(-W, -H, W * 3, H * 3); g.restore();
}

// ---------- ciel ----------
export function ciel(g, o = {}) {
  const hz = o.horizon ?? 1010, t = o.t || 0;
  const P = o.pal || PAL.crepuscule;
  const gr = g.createLinearGradient(0, 0, 0, hz);
  gr.addColorStop(0, P.top); gr.addColorStop(0.42, P.mid); gr.addColorStop(0.8, P.low); gr.addColorStop(1, P.gold);
  g.save(); g.fillStyle = gr; g.fillRect(-W, -H, W * 3, H + hz + 4); g.restore();
  // soleil qui vient de passer sous l'horizon
  const sx = o.sunX ?? 540;
  const sg = g.createRadialGradient(sx, hz, 10, sx, hz, 640);
  const sa = o.sun === false ? 0.45 : 1;
  sg.addColorStop(0, `rgba(255,236,190,${0.95 * sa})`); sg.addColorStop(0.22, `rgba(${P.halo},${0.5 * sa})`); sg.addColorStop(1, `rgba(${P.halo},0)`);
  g.save(); g.fillStyle = sg; g.fillRect(-W, hz - 700, W * 3, 704); g.restore();
  if (o.sun !== false) circle(g, sx, hz + 6, 78, { fill: N.sun, stroke: false, tex: false, seed: 401, amp: 0.6 });
  // étoiles : plus nombreuses et plus nettes vers le haut
  const r = rng(o.seed || 5);
  g.save(); g.fillStyle = N.star;
  const nb = o.etoiles ?? 70, haut = o.etoilesH ?? 640;
  for (let i = 0; i < nb; i++) {
    const x = -60 + r() * (W + 120), y = -80 + r() * r() * haut, s = 1.6 + r() * 2.6, ph = r();
    g.globalAlpha = clamp(1 - y / (haut - 20)) * (0.55 + 0.45 * wave(t, 0.25 + ph * 0.3, ph));
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    if (s > 3.6) { g.fillRect(x - s * 2.6, y - 0.7, s * 5.2, 1.4); g.fillRect(x - 0.7, y - s * 2.6, 1.4, s * 5.2); }
  }
  g.restore();
  if (o.moon !== false) lune(g, o.moonX ?? 905, o.moonY ?? 676, o.moonR ?? 54);   // sous la zone de texte (y 200 à 580)
  // nuages allongés, sans contour, qui dérivent lentement
  const kn = hz / 1010, nc = o.nuages ?? ['#c7798a', '#e8a08c', '#f3bd96', '#8a5f8f'];
  const nu = o.nuages === false ? [] : [[230, 640 * kn, 300, 26, nc[0], 0.5], [760, 720 * kn, 360, 22, nc[1], 0.55], [420, 820 * kn, 260, 16, nc[2], 0.6], [900, 520 * kn, 220, 18, nc[3], 0.45]];
  nu.forEach(([x, y, rx, ry, c, a], i) => {
    const dx = (o.drift ?? 1) * t * (5 + i * 2);
    ell(g, x + dx, y, rx, ry, { fill: c, stroke: false, alpha: a, seed: 410 + i, amp: 3 });
    ell(g, x + dx + rx * 0.3, y - ry * 0.9, rx * 0.55, ry * 0.8, { fill: c, stroke: false, alpha: a * 0.8, seed: 420 + i, amp: 3 });
  });
  texture(g, -W, -H, W * 3, H + hz + 4, 0.05);
}

/** Croissant de lune avec son halo. */
export function lune(g, x, y, R = 54) {
  const hg = g.createRadialGradient(x, y, R * 0.4, x, y, R * 4);
  hg.addColorStop(0, 'rgba(251,238,203,0.34)'); hg.addColorStop(1, 'rgba(251,238,203,0)');
  g.save(); g.fillStyle = hg; g.fillRect(x - R * 4, y - R * 4, R * 8, R * 8);
  g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.clip();
  g.beginPath(); g.rect(x - R * 2, y - R * 2, R * 4, R * 4); g.arc(x + R * 0.42, y - R * 0.2, R * 0.9, 0, Math.PI * 2);
  g.fillStyle = N.moon; g.fill('evenodd'); g.restore();
}

// ---------- mer et rivage ----------
export function mer(g, o = {}) {
  const hz = o.horizon ?? 1010, bas = o.bas ?? 1340, t = o.t || 0, sx = o.sunX ?? 540;
  // îles au loin, posées sur l'horizon
  if (o.iles !== false) {
    blob(g, [[430, hz + 4], [520, hz - 40], [640, hz - 78], [760, hz - 60], [880, hz + 4]], { fill: o.ileLoin || N.isleFar, stroke: false, seed: 431, amp: 2 });
    blob(g, [[700, hz + 4], [790, hz - 58], [900, hz - 132], [1010, hz - 96], [1110, hz - 150], [1240, hz + 4]], { fill: o.ile || N.isle, stroke: false, seed: 432, amp: 2 });
  }
  const mc = o.eau || ['#c98d8c', '#8a6a92', N.sea, N.seaDeep];
  const gr = g.createLinearGradient(0, hz, 0, bas);
  gr.addColorStop(0, mc[0]); gr.addColorStop(0.16, mc[1]); gr.addColorStop(0.55, mc[2]); gr.addColorStop(1, mc[3]);
  g.save(); g.fillStyle = gr; g.fillRect(-W, hz, W * 3, bas - hz + 60); g.restore();
  // reflet du soleil : traits horizontaux qui scintillent
  const r = rng(77);
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const k = i / 46, y = hz + 8 + k * (bas - hz - 30), half = (20 + k * 120) * (0.35 + r() * 0.75), ph = r();
    const x = sx + (r() - 0.5) * (40 + k * 190) + wave(t, 0.35, ph) * 8;
    g.globalAlpha = (0.72 - k * 0.5) * (0.6 + 0.4 * wave(t, 0.6 + ph, ph));
    g.strokeStyle = o.reflet ? o.reflet[k < 0.3 ? 0 : 1] : (k < 0.3 ? '#ffe9bd' : '#f5c08f'); g.lineWidth = 3 + k * 3;
    g.beginPath(); g.moveTo(x - half, y); g.lineTo(x + half, y); g.stroke();
  }
  // petites vagues claires
  g.strokeStyle = 'rgba(220,200,230,0.22)'; g.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const y = hz + 40 + r() * (bas - hz - 80), x = -40 + r() * (W + 80) + wave(t, 0.2, r()) * 14, L = 40 + r() * 90;
    g.globalAlpha = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + L / 2, y - 5, x + L, y); g.stroke();
  }
  g.restore();
  texture(g, -W, hz, W * 3, bas - hz + 60, 0.05);
}

export function rivage(g, o = {}) {
  const y = o.y ?? 1330, t = o.t || 0, flux = wave(t, 0.12) * 10;
  const top = [[-140, y + 40], [80, y + 8 + flux], [330, y - 14 + flux], [600, y + 2 + flux], [850, y + 26 + flux], [1220, y - 6]];
  // écume, puis sable mouillé, puis sable
  line(g, top.map(([x, yy]) => [x, yy - 9]), { stroke: N.foam, lw: 9, alpha: 0.55, seed: 441 });
  const gr = g.createLinearGradient(0, y, 0, H);
  gr.addColorStop(0, '#8d6b78'); gr.addColorStop(0.2, N.sand); gr.addColorStop(1, N.sandDark);
  blob(g, [...top, [1300, H + 300], [-220, H + 300]], { fill: gr, stroke: false, seed: 442, amp: 2, texA: 0.12 });
}

// ---------- végétation ----------
function palme(g, ox, oy, ang, L, w, color, seed) {
  // feuille de cocotier : une nervure courbée par son poids, des folioles qui pendent de chaque côté
  const r = rng(seed), n = 26, P = [];
  for (let i = 0; i <= n; i++) { const u = i / n; P.push([ox + Math.cos(ang) * L * u, oy + Math.sin(ang) * L * u + L * 0.42 * u * u]); }
  g.save(); g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = Math.max(4, w * 0.09); g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.stroke();
  g.lineWidth = Math.max(3.5, w * 0.075);
  for (let i = 1; i <= n; i++) {
    const u = i / n, [x, y] = P[i], [px, py] = P[i - 1];
    const d = Math.hypot(x - px, y - py) || 1, dx = (x - px) / d, dy = (y - py) / d;
    const len = w * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.93 + 0.07)), 0.55) * (0.85 + r() * 0.3);
    for (const sd of [-1, 1]) {
      const ex = x + (-dy * sd * 0.75 + dx * 0.6) * len, ey = y + (dx * sd * 0.75 + dy * 0.6) * len + len * 0.38;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2, (y + ey) / 2 - len * 0.12, ex, ey); g.stroke();
    }
  }
  g.restore();
}
/** Grande feuille lisse (bananier), pour un premier plan. */
function feuille(g, ox, oy, ang, L, w, color, seed, trait) {
  const A = [], B = [], n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = ox + Math.cos(ang) * L * u, y = oy + Math.sin(ang) * L * u + L * 0.36 * u * u;
    const dx = Math.cos(ang), dy = Math.sin(ang) + 0.72 * u, d = Math.hypot(dx, dy), hw = w * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.04)), 0.6);
    A.push([x - dy / d * hw, y + dx / d * hw]); B.push([x + dy / d * hw, y - dx / d * hw]);
  }
  draw(g, [...A, ...B.reverse()], { fill: color, stroke: trait || false, lw: 3.5, seed, amp: 1.2, texA: 0.3 });
  if (trait) line(g, A.map((p, i) => [(p[0] + B[B.length - 1 - i][0]) / 2, (p[1] + B[B.length - 1 - i][1]) / 2]).filter((_, i) => i % 3 === 0), { stroke: trait, lw: 2.5, alpha: 0.6 });
}
/** Cocotier en silhouette. Origine = pied du tronc ; (tx, ty) = sommet. */
export function cocotier(g, x, y, tx, ty, o = {}) {
  const t = o.t || 0, s = o.s ?? 1, col = o.color || N.palm, sway = wave(t, 0.1, o.seed || 0) * 0.035;
  limb(g, [[x, y], [lerp(x, tx, 0.3) + (tx - x) * 0.25, lerp(y, ty, 0.42)], [tx, ty]], 38 * s, { fill: col, stroke: false, seed: 451 });
  const fr = [-2.95, -2.5, -2.05, -1.6, -1.15, -0.7, -0.3, 0.1, 2.8];
  fr.forEach((a, i) => palme(g, tx, ty, a + sway * (1 + i % 3), (330 + (i % 3) * 50) * s, 96 * s, col, 460 + i));
  for (const [dx, dy] of [[-14, 22], [16, 30], [0, 44]]) circle(g, tx + dx * s, ty + dy * s, 18 * s, { fill: col, stroke: false, tex: false });
}
/** Grandes feuilles au premier plan, dans un coin du cadre. */
export function feuillage(g, x, y, s = 1, o = {}) {
  const t = o.t || 0, col = o.color || N.leaf, dir = o.dir ?? 1;
  [[-1.25, 420, 78], [-0.85, 520, 92], [-0.45, 430, 80], [-1.65, 340, 66]].forEach(([a, L, w], i) => {
    const ang = dir > 0 ? a : Math.PI - a;
    feuille(g, x, y, ang + wave(t, 0.09, i * 0.3) * 0.03, L * s, w * s, shade(col, -0.1 * (i % 2)), 480 + i, o.trait);
  });
}

// ---------- objets ----------
/** Tapis ovale sous le personnage. Origine = centre. */
export function tapis(g, x, y, rx = 430, ry = 82, o = {}) {
  ell(g, x, y, rx, ry, { fill: o.color || N.mat, stroke: N.ink, lw: 4.5, seed: 501 });
  ell(g, x, y, rx - 26, ry - 14, { fill: null, stroke: o.edge || N.matEdge, lw: 4, dash: [16, 14], seed: 502, alpha: 0.8 });
  ell(g, x, y, rx - 62, ry - 30, { fill: null, stroke: shade(o.color || N.mat, -0.22), lw: 3.5, seed: 503 });
}
/** Flamme vivante. Origine = base de la flamme (haut de la mèche). */
export function flamme(g, x, y, s = 1, t = 0) {
  const k = 1 + 0.07 * wave(t, 2.3) + 0.05 * wave(t, 5.1, 0.4), lean = wave(t, 0.9) * 5 * s;
  const hg = g.createRadialGradient(x, y - 26 * s, 2, x, y - 26 * s, 120 * s);
  hg.addColorStop(0, `rgba(${N.glow},0.75)`); hg.addColorStop(1, `rgba(${N.glow},0)`);
  g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = hg; g.fillRect(x - 130 * s, y - 160 * s, 260 * s, 260 * s); g.restore();
  blob(g, [[x, y + 4 * s], [x + 17 * s, y - 14 * s], [x + 11 * s + lean * 0.4, y - 40 * s * k], [x + lean, y - 68 * s * k], [x - 11 * s + lean * 0.4, y - 40 * s * k], [x - 17 * s, y - 14 * s]], { fill: N.flame, stroke: '#e89a4a', lw: 2.5, tex: false, seed: 511, amp: 0.5 });
  blob(g, [[x, y], [x + 8 * s, y - 12 * s], [x + lean * 0.5, y - 36 * s * k], [x - 8 * s, y - 12 * s]], { fill: N.flameCore, stroke: false, tex: false, seed: 512, amp: 0.3 });
}
/** Bougie pilier. Origine = centre de la base. */
export function bougie(g, x, y, s = 1, o = {}) {
  const h = (o.h ?? 130) * s, w = (o.w ?? 74) * s;
  rect(g, x - w / 2, y - h, w, h, 10 * s, { fill: o.color || N.wax, stroke: N.ink, lw: 4, seed: 521 });
  ell(g, x, y - h + 2, w / 2 - 4, 9 * s, { fill: shade(o.color || N.wax, -0.1), stroke: false, tex: false });
  line(g, [[x - w / 2 + 12 * s, y - h + 10 * s], [x - w / 2 + 14 * s, y - h + 44 * s], [x - w / 2 + 9 * s, y - h + 60 * s]], { stroke: shade(o.color || N.wax, -0.16), lw: 5 * s });
  seg(g, x, y - h + 2, x, y - h - 12 * s, { lw: 3.5, stroke: N.ink });
  flamme(g, x, y - h - 12 * s, s, (o.t || 0) + (o.ph || 0));
}
/** Lanterne posée au sol (cage sombre, bougie dedans). Origine = centre de la base. */
export function lanterne(g, x, y, s = 1, o = {}) {
  at(g, x, y, s, h => {
    const m = '#3b2c3f';
    rect(h, -66, -18, 132, 18, 6, { fill: m, stroke: N.ink, lw: 4, seed: 531 });
    rect(h, -54, -236, 108, 220, 8, { fill: 'rgba(255,214,150,0.2)', stroke: false, tex: false });
    bougie(h, 0, -18, 0.72, { t: o.t, h: 110, w: 70 });
    for (const sx of [-54, 54]) seg(h, sx, -236, sx, -18, { lw: 6, stroke: m });
    seg(h, 0, -236, 0, -150, { lw: 3, stroke: m, alpha: 0.5 });
    blob(h, [[-70, -236], [70, -236], [44, -276], [0, -292], [-44, -276]], { fill: m, stroke: N.ink, lw: 4, seed: 532 });
    arc(h, 0, -292, 30, 34, Math.PI, Math.PI * 2, { lw: 5, stroke: m });
  });
}
/** Verre de thé fumant. Origine = centre de la base. */
export function the(g, x, y, s = 1, o = {}) {
  const t = o.t || 0;
  at(g, x, y, s, h => {
    ell(h, 0, -2, 62, 13, { fill: N.cream, stroke: N.ink, lw: 3.5, seed: 541 });
    blob(h, [[-36, -92], [36, -92], [30, -40], [26, -8], [-26, -8], [-30, -40]], { fill: 'rgba(250,235,215,0.35)', stroke: N.ink, lw: 3.5, tex: false, seed: 542 });
    blob(h, [[-33, -74], [33, -74], [29, -40], [25, -11], [-25, -11], [-29, -40]], { fill: '#c9783d', stroke: false, tex: false, seed: 543, alpha: 0.9 });
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.22 + i / 3) % 1, x0 = (i - 1) * 16, yy = -104 - p * 120;
      line(h, [[x0, yy + 56], [x0 + 10 * wave(p, 1.4, i), yy + 28], [x0 - 8 * wave(p, 1.1, i), yy]], { stroke: '#fff3e2', lw: 5, alpha: 0.42 * Math.sin(Math.PI * p), seed: 544 + i });
    }
  });
}
/** Lucioles : points de lumière qui flottent. zone = [x, y, w, h]. */
export function lucioles(g, zone, n = 12, t = 0, seed = 9) {
  const r = rng(seed), [zx, zy, zw, zh] = zone;
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const bx = zx + r() * zw, by = zy + r() * zh, ph = r(), f = 0.05 + r() * 0.08;
    const x = bx + wave(t, f, ph) * 46, y = by + wave(t, f * 1.3, ph + 0.25) * 34 - t * 3;
    const a = 0.45 + 0.55 * wave(t, 0.4 + ph * 0.4, ph), R = 13 + r() * 12;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, `rgba(255,236,170,${0.9 * clamp(a)})`); gr.addColorStop(0.25, `rgba(255,214,130,${0.45 * clamp(a)})`); gr.addColorStop(1, 'rgba(255,214,130,0)');
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
  }
  g.restore();
}

// ---------- décor complet ----------
/** Plage au crépuscule : ciel, mer, rivage, cocotier, feuillage. Le sol est à SOL.plage. */
export function plage(g, o = {}) {
  const t = o.t || 0;
  o = { sunX: 262, ...o };
  ciel(g, { t, ...o });
  mer(g, { t, ...o });
  rivage(g, { t, y: o.rivage ?? 1330 });
  if (o.cocotier !== false) cocotier(g, -40, 1420, 112, 446, { t });
  if (o.feuillage) feuillage(g, 1130, 1010, 1, { t, dir: -1 });
}

// ---------- autres paysages ----------
/** Montagnes en trois plans, posées sur l'horizon. */
export function montagnes(g, hz, c = ['#7084b4', '#485a8e', '#2c3862']) {
  const st = { stroke: false, amp: 2, texA: 0.22 };
  blob(g, [[-120, hz + 4], [60, hz - 150], [210, hz - 250], [330, hz - 190], [470, hz - 300], [640, hz - 210], [800, hz - 270], [960, hz - 160], [1200, hz + 4]], { fill: c[0], seed: 701, ...st });
  blob(g, [[-120, hz + 4], [90, hz - 90], [260, hz - 170], [430, hz - 110], [560, hz - 60], [720, hz - 150], [900, hz - 110], [1200, hz + 4]], { fill: c[1], seed: 702, ...st });
  blob(g, [[-120, hz + 4], [120, hz - 50], [300, hz - 80], [520, hz - 30], [820, hz - 70], [1200, hz + 4]], { fill: c[2], seed: 703, ...st });
}
/** Sol d'herbe sombre avec quelques touffes. */
export function herbe(g, y, o = {}) {
  const c = o.couleurs || ['#2e4656', '#1c2b3c', '#111a29'];
  const gr = g.createLinearGradient(0, y, 0, H);
  gr.addColorStop(0, c[0]); gr.addColorStop(0.25, c[1]); gr.addColorStop(1, c[2]);
  blob(g, [[-140, y + 30], [120, y + 4], [380, y - 12], [640, y + 6], [900, y - 8], [1220, y + 22], [1300, H + 300], [-220, H + 300]], { fill: gr, stroke: false, seed: 711, amp: 2, texA: 0.12 });
  const r = rng(o.seed || 31);
  g.save(); g.strokeStyle = shade(c[0], 0.12); g.lineWidth = 4; g.lineCap = 'round'; g.globalAlpha = 0.6;
  for (let i = 0; i < 26; i++) {
    const x = r() * W, yy = y + 30 + r() * 440, h = 14 + r() * 20;
    for (const d of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + d * 8, yy - h * 0.6, x + d * 22, yy - h); g.stroke(); }
  }
  g.restore();
}
/** Arbre rond en silhouette. Origine = pied. */
export function arbre(g, x, y, s = 1, color = '#141c30') {
  at(g, x, y, s, h => {
    limb(h, [[0, 0], [-8, -200], [6, -420]], 44, { fill: color, stroke: false, seed: 721 });
    limb(h, [[0, -300], [70, -400], [120, -470]], 20, { fill: color, stroke: false, seed: 722 });
    for (const [cx, cy, r] of [[0, -560, 190], [-150, -470, 130], [160, -500, 140], [-60, -700, 130], [100, -690, 120]]) circle(h, cx, cy, r, { fill: color, stroke: false, seed: 723 + cx, amp: 5, texA: 0.2 });
  });
}
/** Pot de plante aux grandes feuilles. Origine = centre de la base du pot. */
export function plante(g, x, y, s = 1, o = {}) {
  at(g, x, y, s, h => {
    feuillage(h, -10, -110, 0.7, { t: o.t, dir: 1, color: o.color || '#5a8a70', trait: N.ink });
    feuillage(h, 10, -110, 0.64, { t: o.t, dir: -1, color: o.color || '#4a7a64', trait: N.ink });
    blob(h, [[-78, -130], [78, -130], [60, 0], [-60, 0]], { fill: '#b06a4f', stroke: N.ink, lw: 4, seed: 731 });
    rect(h, -86, -146, 172, 30, 8, { fill: '#c07a5c', stroke: N.ink, lw: 4, seed: 732 });
  });
}
/** Table basse avec deux bougies et un verre de thé. Origine = centre du pied. */
export function tableBasse(g, x, y, s = 1, o = {}) {
  at(g, x, y, s, h => {
    for (const sx of [-1, 1]) limb(h, [[sx * 120, -86], [sx * 138, 0]], 18, { fill: '#5d3d30', stroke: N.ink, lw: 3.5, seed: 741 + sx });
    ell(h, 0, -96, 190, 34, { fill: N.wood, stroke: N.ink, lw: 4, seed: 743 });
    bougie(h, -84, -104, 0.9, { t: o.t, h: 150 });
    bougie(h, 4, -98, 0.8, { t: o.t, h: 86, ph: 0.4 });
    if (o.the !== false) the(h, 104, -92, 0.72, { t: o.t });
  });
}
/** Coussin. Origine = centre. */
export function coussin(g, x, y, s = 1, color = '#b5654f', rot = 0) {
  at(g, x, y, s, h => {
    blob(h, [[-120, -64], [0, -76], [120, -64], [132, 0], [120, 64], [0, 74], [-120, 64], [-132, 0]], { fill: color, stroke: N.ink, lw: 4, seed: 751 });
    line(h, [[-84, -30], [0, -20], [84, -30]], { lw: 3, stroke: shade(color, -0.22) });
  }, rot);
}
/** Étoile filante. p = 0..1. */
export function filante(g, x0, y0, x1, y1, p) {
  if (p <= 0 || p >= 1) return;
  const hx = lerp(x0, x1, p), hy = lerp(y0, y1, p), tx = lerp(x0, x1, Math.max(0, p - 0.35)), ty = lerp(y0, y1, Math.max(0, p - 0.35));
  const gr = g.createLinearGradient(tx, ty, hx, hy);
  gr.addColorStop(0, 'rgba(255,246,220,0)'); gr.addColorStop(1, `rgba(255,246,220,${0.95 * Math.sin(Math.PI * p)})`);
  g.save(); g.strokeStyle = gr; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke(); g.restore();
}
/** Ronds de lumière flous (arrière-plan d'un gros plan). */
export function bokeh(g, n = 14, t = 0, seed = 21, zone = [0, 200, W, 1500]) {
  const r = rng(seed);
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const R = 40 + r() * 90, ph = r(), x = zone[0] + r() * zone[2] + wave(t, 0.03 + ph * 0.03, ph) * 30, y = zone[1] + r() * zone[3] + wave(t, 0.04, ph + 0.3) * 24;
    const a = (0.1 + r() * 0.14) * (0.7 + 0.3 * wave(t, 0.2 + ph * 0.2, ph));
    const gr = g.createRadialGradient(x, y, R * 0.55, x, y, R);
    gr.addColorStop(0, `rgba(${N.glow},${a})`); gr.addColorStop(1, `rgba(${N.glow},0)`);
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
  }
  g.restore();
}

/** Lac de montagne à l'heure bleue. Le sol est à SOL.lac. */
export function lac(g, o = {}) {
  const t = o.t || 0, hz = 1010;
  ciel(g, { t, pal: PAL.heureBleue, sun: false, horizon: hz, moonX: 240, moonY: 620, moonR: 58, nuages: ['#4f64a0', '#93a0c8', '#d9b3a6', '#34467e'], ...o });
  montagnes(g, hz);
  mer(g, { t, horizon: hz, bas: 1360, iles: false, sunX: 240, eau: ['#a9b2d0', '#5b6ea4', '#2e3f74', '#1a2247'], reflet: ['#fdf3d6', '#cdd6ee'] });
  herbe(g, 1340);
  if (o.arbre !== false) arbre(g, 1010, 1420, 1.25);
}
/** Jardin tropical de nuit. Le sol est à SOL.jardin. */
export function jardin(g, o = {}) {
  const t = o.t || 0, hz = 1160;
  ciel(g, { t, pal: PAL.nuit, sun: false, horizon: hz, etoiles: 130, etoilesH: 980, moonX: 800, moonY: 620, moonR: 66, nuages: ['#2a3364', '#38427c', '#494e8a', '#232a58'], ...o });
  blob(g, [[-120, hz + 6], [80, hz - 110], [300, hz - 60], [520, hz - 140], [760, hz - 70], [980, hz - 120], [1200, hz + 6]], { fill: '#1a2244', stroke: false, seed: 761, amp: 2, texA: 0.2 });
  for (const [x, r] of [[60, 120], [250, 90], [430, 110], [640, 96], [830, 120], [1020, 100]]) circle(g, x, hz + 30, r, { fill: '#162038', stroke: false, seed: 770 + x, amp: 4, texA: 0.2 });
  herbe(g, hz + 60, { couleurs: ['#26394a', '#18263a', '#0e1626'] });
  cocotier(g, 1100, hz + 140, 960, 560, { t, s: 0.8, color: '#10162c' });
  feuillage(g, -70, 1330, 1.15, { t, dir: 1, color: '#1d3340' });
  feuillage(g, 1150, 1420, 1.0, { t, dir: -1, color: '#1a2e3a' });
}
/** Véranda : un mur chaud, une grande arche ouverte sur la mer, un plancher. Le sol est à SOL.veranda. */
export function veranda(g, o = {}) {
  const t = o.t || 0, mur = 1250;
  const mg = g.createLinearGradient(0, 0, 0, mur);
  mg.addColorStop(0, '#4e3547'); mg.addColorStop(1, '#6d4852');
  g.save(); g.fillStyle = mg; g.fillRect(-W, -H, W * 3, H + mur); g.restore();
  texture(g, -W, -H, W * 3, H + mur, 0.08);
  const ax = 150, aw = 780, top = 190, bas = 1090, r = aw / 2;
  const arche = () => { g.beginPath(); g.moveTo(ax, bas); g.lineTo(ax, top + r); g.arc(ax + r, top + r, r, Math.PI, 0); g.lineTo(ax + aw, bas); g.closePath(); };
  g.save(); arche(); g.clip();
  ciel(g, { t, horizon: 940, sunX: 330, moonX: 750, moonY: 730, moonR: 46, ...o });
  mer(g, { t, horizon: 940, bas: 1100, sunX: 330, iles: o.iles });
  g.restore();
  g.save(); arche(); g.lineJoin = 'round'; g.lineWidth = 18; g.strokeStyle = '#3a2838'; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#94707a'; g.stroke(); g.restore();
  // voilages : deux pans qui tombent de chaque côté de l'arche
  for (const sx of [-1, 1]) {
    const X = v => 540 + sx * v, sway = wave(t, 0.08, sx * 0.2) * 8;
    blob(g, [[X(396), 420], [X(350), 372], [X(300), 470], [X(292), 700], [X(304 + sway * 0.5), 900], [X(276 + sway), 1086], [X(396), 1092], [X(402), 760]], { fill: '#ecdcc8', stroke: N.ink, lw: 3.5, seed: 781 + sx, alpha: 0.92, texA: 0.25 });
    line(g, [[X(352), 470], [X(340), 720], [X(336 + sway * 0.6), 1070]], { stroke: '#cdb9a2', lw: 3 });
    line(g, [[X(376), 440], [X(372), 760], [X(372), 1076]], { stroke: '#cdb9a2', lw: 3 });
  }
  rect(g, ax - 46, bas - 4, aw + 92, 36, 8, { fill: N.wood, stroke: N.ink, lw: 4, seed: 783 });
  // plancher
  const fg = g.createLinearGradient(0, mur, 0, H);
  fg.addColorStop(0, '#63443c'); fg.addColorStop(1, '#2f2029');
  rect(g, -W, mur, W * 3, H, 0, { fill: fg, stroke: false, seed: 784, texA: 0.25 });
  seg(g, -W, mur, W * 2, mur, { lw: 5, stroke: '#3a2838' });
  g.save(); g.strokeStyle = 'rgba(40,24,34,0.35)'; g.lineWidth = 3;
  for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(540 + i * 110, mur); g.lineTo(540 + i * 330, H + 100); g.stroke(); }
  g.restore();
}
/** Gros plan : une bougie dans le noir chaud. */
export function flammeGros(g, o = {}) {
  const t = o.t || 0;
  const gr = g.createRadialGradient(540, 1150, 80, 540, 1150, 1500);
  gr.addColorStop(0, '#5a3640'); gr.addColorStop(0.45, '#2c1d33'); gr.addColorStop(1, '#141024');
  g.save(); g.fillStyle = gr; g.fillRect(-W, -H, W * 3, H * 3); g.restore();
  texture(g, -W, -H, W * 3, H * 3, 0.05);
  bokeh(g, 16, t, o.seed || 21);
  rect(g, -W, 1740, W * 3, H, 0, { fill: '#3a2530', stroke: false, seed: 791, texA: 0.2 });
  bougie(g, 540, 1760, 3.0, { t, h: 150, w: 92 });
  lueur(g, 540, 1180, 900, 0.5, t);
}
/** Le ciel seul : la lune, les étoiles, deux palmes en bas. */
export function cielSeul(g, o = {}) {
  const t = o.t || 0;
  ciel(g, { t, pal: PAL.nuit, sun: false, horizon: 1640, etoiles: 190, etoilesH: 1500, moonX: 730, moonY: 860, moonR: 104, nuages: ['#2a3364', '#38427c', '#494e8a', '#232a58'], ...o });
  g.save(); g.fillStyle = '#141a38'; g.fillRect(-W, 1640, W * 3, H); g.restore();
  mer(g, { t, horizon: 1640, bas: 2000, iles: false, sunX: 730, eau: ['#4b548c', '#2e376c', '#1c2350', '#12173a'], reflet: ['#fbf0cf', '#b9c0e6'] });
  cocotier(g, -60, 2050, 150, 1360, { t, color: '#0c1024' });
  cocotier(g, 1150, 2050, 960, 1470, { t, s: 0.9, color: '#0c1024', seed: 3 });
}

/** Le fardeau : des pierres sombres qui pèsent, puis s'élèvent et deviennent lumière. k = 0 (posées) .. 1 (envolées).
 *  Origine = le point où elles reposent. */
export function fardeau(g, x, y, k = 0, t = 0, n = 4) {
  const r = rng(61), e = k * k * (3 - 2 * k);
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 74 + (r() - 0.5) * 20, w = 50 + r() * 22, h = 36 + r() * 14, dl = i * 0.12;
    const ki = clamp((e - dl) / (1 - dl * 0.9)), px = x + dx + ki * dx * 0.5, py = y - h * 0.6 - (i % 2) * 34 - ki * (260 + i * 50) + wave(t, 0.3, i * 0.2) * 3 * (1 - ki);
    if (ki < 1) blob(g, [[px - w, py + h * 0.5], [px - w * 0.8, py - h * 0.5], [px - w * 0.1, py - h], [px + w * 0.7, py - h * 0.6], [px + w, py + h * 0.3], [px + w * 0.3, py + h]], { fill: '#4a4058', stroke: N.ink, lw: 4, seed: 801 + i, alpha: 1 - ki });
    if (ki > 0.05) {
      g.save(); g.globalCompositeOperation = 'screen';
      for (let j = 0; j < 5; j++) {
        const a = r() * 6.28, d = 20 + r() * 70 * ki, lx = px + Math.cos(a) * d, ly = py + Math.sin(a) * d - ki * 60 * r(), R = 16 + r() * 12;
        const gr = g.createRadialGradient(lx, ly, 0, lx, ly, R), al = Math.sin(Math.PI * Math.min(1, ki * 1.05)) * 0.9;
        gr.addColorStop(0, `rgba(255,236,170,${al})`); gr.addColorStop(1, 'rgba(255,214,130,0)');
        g.fillStyle = gr; g.fillRect(lx - R, ly - R, R * 2, R * 2);
      }
      g.restore();
    } else for (let j = 0; j < 5; j++) { r(); r(); r(); r(); }
  }
}

// ---------- images de sens (les idées du cours, en paysage) ----------
/** L'épreuve qui passe : des nuages sombres et la pluie couvrent le ciel, puis s'écartent. k = 0 (couvert) .. 1 (dégagé). */
export function orage(g, k = 0, t = 0, o = {}) {
  const e = k * k * (3 - 2 * k), bas = o.bas ?? 1000, c = o.color || '#2b2743';
  // pluie
  if (e < 0.85) {
    const r = rng(41);
    g.save(); g.strokeStyle = `rgba(200,205,235,${0.34 * (1 - e / 0.85)})`; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const x = r() * (W + 200) - 100, sp = 900 + r() * 500, y = ((r() * 1400 + t * sp) % 1400) + 380, L = 26 + r() * 30;
      if (y > (o.pluieBas ?? 1500)) continue;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - L * 0.22, y + L); g.stroke();
    }
    g.restore();
  }
  // nuages : deux rideaux qui s'ouvrent vers la gauche et la droite
  const nu = [[150, 360, 330, 150], [470, 300, 380, 170], [820, 370, 340, 150], [300, 560, 300, 120], [700, 580, 330, 130], [1000, 540, 260, 120], [60, 600, 240, 110], [540, 720, 300, 100]];
  nu.forEach(([x, y, rx, ry], i) => {
    const dir = x < 540 ? -1 : 1, dx = dir * e * (760 + i * 40), dy = -e * 60;
    const yy = Math.min(y, bas - ry) + dy + wave(t, 0.05, i * 0.13) * 8;
    for (const [ox, oy, kx] of [[0, 0, 1], [-rx * 0.5, ry * 0.2, 0.62], [rx * 0.5, ry * 0.15, 0.66], [0, -ry * 0.45, 0.6]]) ell(g, x + dx + ox, yy + oy, rx * kx, ry * kx, { fill: shade(c, (i % 3) * 0.05), stroke: false, seed: 820 + i, amp: 4, alpha: 0.96 * (1 - e * 0.5), texA: 0.2 });
  });
}
/** Le passage étroit : deux falaises sombres, et entre elles une voie qui s'ouvre sur la lumière. k = 0 (étroit) .. 1 (ouvert). */
export function passage(g, k = 0, t = 0, o = {}) {
  const e = k * k * (3 - 2 * k), demi = lerp(o.etroit ?? 46, o.large ?? 330, e), c = o.color || '#1d1a30';
  for (const sx of [-1, 1]) {
    const X = v => 540 + sx * (demi + v);
    blob(g, [[X(0), 2100], [X(10), 1500], [X(-16), 1150], [X(22), 860], [X(-8), 600], [X(40), 380], [X(120), 250], [X(300), 180], [X(900), 160], [X(900), 2100]], { fill: c, stroke: false, seed: 840 + sx, amp: 3, texA: 0.25 });
    line(g, [[X(60), 2000], [X(70), 1500], [X(46), 1150], [X(84), 860], [X(56), 620], [X(110), 420]], { stroke: shade(c, 0.14), lw: 5, alpha: 0.6 });
    line(g, [[X(210), 2000], [X(190), 1400], [X(230), 900], [X(200), 520]], { stroke: shade(c, 0.1), lw: 4, alpha: 0.5 });
  }
  // la lumière qui passe entre les deux parois
  const gr = g.createRadialGradient(540, 1000, 10, 540, 1000, 500 + 500 * e);
  gr.addColorStop(0, `rgba(255,226,170,${0.38 + 0.2 * e})`); gr.addColorStop(1, 'rgba(255,226,170,0)');
  g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(-W, -H, W * 3, H * 3); g.restore();
}
/** Petite barque avec sa lanterne, sur l'eau. Origine = milieu de la coque, à la ligne d'eau. */
export function barque(g, x, y, s = 1, t = 0) {
  at(g, x, y + wave(t, 0.16) * 6 * s, s, h => {
    blob(h, [[-150, -34], [150, -34], [112, 22], [-112, 22]], { fill: '#5a3d36', stroke: N.ink, lw: 4, seed: 851 });
    line(h, [[-132, -10], [0, -4], [132, -10]], { stroke: '#3e2a28', lw: 3 });
    seg(h, 10, -34, 10, -150, { lw: 5, stroke: '#3e2a28' });
    lanterne(h, 10, -150, 0.34, { t });
    g.save(); g.restore();
  }, wave(t, 0.16, 0.25) * 0.03);
  lueur(g, x + 10 * s, y - 190 * s, 300 * s, 0.4, t);
  // reflet
  g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#ffd98a'; g.lineWidth = 3 * s; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const yy = y + (34 + i * 20) * s, hw = (50 - i * 6) * s * (0.7 + 0.3 * wave(t, 0.5, i * 0.2)); g.beginPath(); g.moveTo(x - hw, yy); g.lineTo(x + hw, yy); g.stroke(); }
  g.restore();
}
/** Le chemin : un sentier de petites lumières qui monte vers l'horizon. k = 0..1 : les lumières s'allument une à une. */
export function sentier(g, k = 1, t = 0, o = {}) {
  const P = o.points || [[540, 1880], [420, 1700], [600, 1540], [470, 1410], [570, 1300], [510, 1210], [545, 1140]];
  line(g, P, { stroke: '#6a5a78', lw: 26, alpha: 0.5 });
  line(g, P, { stroke: '#8b7892', lw: 10, alpha: 0.5 });
  P.forEach(([x, y], i) => {
    const s = lerp(0.62, 0.2, i / (P.length - 1)), on = clamp(k * P.length - i);
    if (on <= 0) return;
    const side = i % 2 ? 1 : -1;
    g.save(); g.globalAlpha = on;
    lanterne(g, x + side * 110 * s * 1.6, y, s, { t: t + i * 0.3 });
    lueur(g, x + side * 110 * s * 1.6, y - 130 * s, 380 * s, 0.4 * on, t + i * 0.3);
    g.restore();
  });
}

/** Livre ouvert (pages nues : on n'écrit jamais de faux texte sacré). Origine = bas de la reliure.
 *  o.lueur = 0..1 : une lumière monte des pages. */
export function livre(g, x, y, s = 1, o = {}) {
  at(g, x, y, s, h => {
    const c = o.color || '#2f5d50';
    blob(h, [[-118, -4], [-110, -74], [0, -54], [110, -74], [118, -4], [0, 16]], { fill: c, stroke: N.ink, lw: 4, seed: 861 });
    blob(h, [[-104, -14], [-98, -78], [-42, -88], [0, -64], [0, 2], [-52, -16]], { fill: '#fbf3e2', stroke: N.ink, lw: 3.5, seed: 862 });
    blob(h, [[104, -14], [98, -78], [42, -88], [0, -64], [0, 2], [52, -16]], { fill: '#f5ead4', stroke: N.ink, lw: 3.5, seed: 863 });
    if (o.lueur) {
      const gr = h.createRadialGradient(0, -70, 6, 0, -110, 300);
      gr.addColorStop(0, `rgba(255,236,180,${0.8 * o.lueur})`); gr.addColorStop(0.35, `rgba(255,214,140,${0.32 * o.lueur})`); gr.addColorStop(1, 'rgba(255,214,140,0)');
      h.save(); h.globalCompositeOperation = 'screen'; h.fillStyle = gr; h.fillRect(-320, -430, 640, 520); h.restore();
    }
  });
}

/** Un rocher sombre (la difficulté : une seule, délimitée). Origine = centre de la base. */
export function rocher(g, x, y, s = 1) {
  at(g, x, y, s, h => {
    ell(h, 0, 8, 210, 26, { fill: 'rgba(30,20,50,0.32)', stroke: false, tex: false, amp: 0 });
    blob(h, [[-176, 2], [-192, -72], [-132, -152], [-30, -192], [84, -172], [162, -112], [192, -40], [164, 6], [0, 14]], { fill: '#4a4058', stroke: N.ink, lw: 4.5, seed: 871 });
    line(h, [[-120, -120], [-40, -150], [50, -134]], { stroke: '#6a5f78', lw: 4 });
    line(h, [[60, -90], [110, -60], [120, -20]], { stroke: '#372f44', lw: 4 });
    line(h, [[-130, -50], [-90, -20]], { stroke: '#372f44', lw: 4 });
  });
}
/** Petite boule de lumière qui voyage (la facilité qui suit la difficulté). */
export function orbe(g, x, y, r = 26, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 5);
  gr.addColorStop(0, `rgba(255,240,190,${0.95 * a})`); gr.addColorStop(0.18, `rgba(255,214,130,${0.6 * a})`); gr.addColorStop(1, 'rgba(255,214,130,0)');
  g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10); g.restore();
  g.save(); g.globalAlpha = a; g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(x, y, r * 0.5, 0, Math.PI * 2); g.fill(); g.restore();
}
/** La butte et son terrier (un petit trou sombre). Origine = centre du trou. eclat = 0..1 : le trou s'illumine de l'intérieur. */
export function butteTerrier(g, x, y, eclat = 0) {
  blob(g, [[x - 380, y + 110], [x - 300, y - 60], [x - 150, y - 170], [x + 20, y - 200], [x + 190, y - 140], [x + 320, y - 20], [x + 390, y + 110]], { fill: '#243445', stroke: N.ink, lw: 4.5, seed: 881, texA: 0.25 });
  line(g, [[x - 250, y - 40], [x - 130, y - 120], [x + 10, y - 140]], { stroke: '#31465a', lw: 4 });
  ell(g, x, y, 80, 64, { fill: '#070a13', stroke: N.ink, lw: 4.5, seed: 882, tex: false });
  if (eclat > 0) {
    const gr = g.createRadialGradient(x, y, 4, x, y, 90);
    gr.addColorStop(0, `rgba(255,236,170,${eclat})`); gr.addColorStop(1, `rgba(255,200,110,${0.25 * eclat})`);
    g.save(); g.beginPath(); g.ellipse(x, y, 74, 58, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = gr; g.fillRect(x - 90, y - 70, 180, 140); g.restore();
  }
  for (const [dx, h] of [[-120, 30], [-96, 22], [106, 26], [130, 34]]) { g.save(); g.strokeStyle = '#3a5568'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + dx, y + 40); g.quadraticCurveTo(x + dx + 6, y + 40 - h * 0.6, x + dx + (dx < 0 ? -10 : 10), y + 40 - h); g.stroke(); g.restore(); }
}
