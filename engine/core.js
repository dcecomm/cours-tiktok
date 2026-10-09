// Moteur crayon : primitives de dessin « fait main » sur Canvas 2D.
// Tourne dans Node (@napi-rs/canvas, voir render.mjs) comme dans un navigateur.
// Toutes les coordonnées sont en pixels d'une image 1080 x 1920.

export const W = 1080, H = 1920;

// Palette relevée sur l'ad source (Mushilo). Les scènes peuvent passer leurs propres couleurs.
export const C = {
  ink: '#2b221e',
  white: '#fbfaf6',
  skin: '#f4c7a3', skinShade: '#e5a986', cheek: '#ef8c88',
  hair: '#5a3823',
  shirt: '#c95b43', jeans: '#2f3f5f', shoe: '#3a2a22',
  mint: '#cfe6dd', tile: '#bcdcd0', cream: '#f2e4cb', sand: '#e9dcc4',
  sky: '#dbe8f1', grid: '#c7dbe8', navy: '#28315a', peach: '#efc5a3',
  wood: '#b98a5b', woodDark: '#8d6440', cabinet: '#8fbfa6',
  green: '#6fae5c', greenDark: '#3f8a4c', red: '#d8524b', yellow: '#f3c24f',
  orange: '#ee8a3c', blue: '#9ec3e6', blueDark: '#3d5fa8', pink: '#ea93a3',
  gray: '#8c8f96', paper: '#f6efe2',
};

// ---------- hasard déterministe (jamais Math.random : le rendu doit être rejouable) ----------
export function hash(...args) {
  let h = 2166136261 >>> 0;
  const s = args.join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- temps et courbes ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  lin: p => p,
  in: p => p * p,
  out: p => 1 - (1 - p) * (1 - p),
  io: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  outCubic: p => 1 - Math.pow(1 - p, 3),
  inCubic: p => p * p * p,
  outBack: p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  outElastic: p => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};
/** Apparition avec rebond : 0 avant t0, ~1.1 puis 1 après. */
export const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : ease.outBack(prog(t, t0, t0 + d)));
/** Transition douce de a vers b entre t0 et t0+d. */
export const tween = (t, t0, d, a, b, e = ease.io) => lerp(a, b, e(prog(t, t0, t0 + d)));
export const wave = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * Math.PI * 2);

// ---------- fabrique de canvas (Node ou navigateur) ----------
let makeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};
export function setCanvasFactory(fn) { makeCanvas = fn; }
export function canvas(w, h) { return makeCanvas(w, h); }

// ---------- texture crayon de couleur ----------
// Une tuile de hachures diagonales, sombres et claires, posée par-dessus chaque aplat.
let HATCH = null;
function hatchTile() {
  const S = 360, c = canvas(S, S), g = c.getContext('2d');
  const r = rng(77);
  g.lineCap = 'round';
  for (let i = 0; i < 1500; i++) {
    const x = r() * S, y = r() * S, L = 14 + r() * 46, a = -1.05 + (r() - 0.5) * 0.22;
    const dark = r() < 0.55;
    g.strokeStyle = dark ? `rgba(40,25,15,${0.035 + r() * 0.07})` : `rgba(255,255,255,${0.02 + r() * 0.035})`;   // hachures claires discrètes : sur un décor sombre elles font « pluie »
    g.lineWidth = 1.2 + r() * 2.6;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L);
      g.stroke();
    }
  }
  return c;
}
function hatch(ctx) {
  if (!HATCH) HATCH = { tile: hatchTile(), pat: null };
  if (!HATCH.pat) HATCH.pat = ctx.createPattern(HATCH.tile, 'repeat');
  return HATCH.pat;
}

// ---------- grain papier, posé une fois sur l'image finie ----------
let PAPER = null;
export function paperLayer(w = W, h = H) {
  if (PAPER && PAPER.width === w) return PAPER;
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const r = rng(12345);
  for (let i = 0; i < (w * h) / 55; i++) {
    const v = 150 + r() * 90;
    g.fillStyle = `rgba(${v | 0},${(v * 0.93) | 0},${(v * 0.85) | 0},${0.05 + r() * 0.1})`;
    const s = 1 + r() * 2.2;
    g.fillRect(r() * w, r() * h, s, s);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI, L = 8 + r() * 26;
    g.strokeStyle = `rgba(120,100,80,${0.04 + r() * 0.06})`;
    g.lineWidth = 0.8 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
  // vignette très légère
  const gr = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(200,185,165,0.22)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  PAPER = c;
  return c;
}
export function applyPaper(ctx, w = W, h = H, strength = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = strength;
  ctx.drawImage(paperLayer(w, h), 0, 0, w, h);
  ctx.restore();
}

// ---------- tracés tremblés ----------
function openNoise(seed, amp, scale = 55) {
  const r = rng(seed), ph = [r() * 6.3, r() * 6.3, r() * 6.3];
  return s => amp * (0.62 * Math.sin(s / scale + ph[0]) + 0.3 * Math.sin(s / scale * 2.3 + ph[1]) + 0.14 * Math.sin(s / scale * 5.1 + ph[2]));
}
function closedNoise(seed, amp, P) {
  // fréquences entières sur le périmètre : pas de raccord visible à la fermeture
  const r = rng(seed), ph = [r() * 6.3, r() * 6.3, r() * 6.3];
  const k = [Math.max(2, Math.round(P / 420)), Math.max(3, Math.round(P / 170)), Math.max(5, Math.round(P / 70))];
  return s => amp * (0.62 * Math.sin(2 * Math.PI * k[0] * s / P + ph[0]) + 0.3 * Math.sin(2 * Math.PI * k[1] * s / P + ph[1]) + 0.14 * Math.sin(2 * Math.PI * k[2] * s / P + ph[2]));
}
function perimeter(pts, closed) {
  let P = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; P += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  return P;
}
/** Densifie un contour et le décale selon sa normale : c'est ce qui donne le trait fait main. */
export function wobble(pts, closed = true, seed = 1, amp = 1.4, step = 6) {
  if (amp === 0 || pts.length < 2) return pts;
  const P = perimeter(pts, closed) || 1;
  const n = closed ? closedNoise(seed, amp, P) : openNoise(seed, amp);
  const out = [];
  let s = 0;
  const segs = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    const L = Math.hypot(x2 - x1, y2 - y1);
    const k = Math.max(1, Math.ceil(L / step));
    const nx = L ? -(y2 - y1) / L : 0, ny = L ? (x2 - x1) / L : 0;
    for (let j = 0; j < k; j++) {
      const p = j / k, o = n(s + L * p);
      out.push([x1 + (x2 - x1) * p + nx * o, y1 + (y2 - y1) * p + ny * o]);
    }
    s += L;
  }
  if (!closed) {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, o = n(s);
    out.push([b[0] - (b[1] - a[1]) / L * o, b[1] + (b[0] - a[0]) / L * o]);
  }
  return out;
}

// ---------- générateurs de contours (points) ----------
export function ellPts(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2) {
  const n = Math.max(24, Math.ceil(Math.max(rx, ry) * Math.abs(a1 - a0) / 7));
  const out = [];
  const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
  for (let i = 0; i < (full ? n : n + 1); i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}
export function rectPts(x, y, w, h, r = 0) {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const out = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (Math.PI / 2) * i / 6; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return out;
}
/** Courbe de Catmull-Rom passant par les points donnés. */
export function curvePts(pts, closed = false, seg = 10) {
  const out = [], n = pts.length;
  const P = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < seg; j++) {
      const t = j / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
/** Contour d'un membre (bras, jambe, tube) épais le long d'une ligne brisée, bouts arrondis. */
export function limbPts(line, width) {
  const pts = curvePts(line, false, 8), hw = width / 2, L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    L.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw]);
    R.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw]);
  }
  const end = pts[pts.length - 1], pe = pts[pts.length - 2] || pts[0];
  const start = pts[0], ps = pts[1] || pts[0];
  const cap = (c, from, dir) => {
    const out = [], a0 = Math.atan2(from[1] - c[1], from[0] - c[0]);
    for (let i = 1; i < 8; i++) { const a = a0 + dir * Math.PI * i / 8; out.push([c[0] + Math.cos(a) * hw, c[1] + Math.sin(a) * hw]); }
    return out;
  };
  return [...L, ...cap(end, L[L.length - 1], -1), ...R.reverse(), ...cap(start, R[R.length - 1], -1)];
}

// ---------- dessin ----------
function trace(ctx, P, closed) {
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (closed) ctx.closePath();
}
/**
 * Dessine un contour : aplat + texture crayon + trait d'encre tremblé.
 * o = { fill, stroke (couleur | false), lw, tex (bool), texA, alpha, closed, seed, amp }
 */
export function draw(ctx, pts, o = {}) {
  if (!pts || pts.length < 2) return;
  const closed = o.closed !== false;
  const seed = o.seed ?? hash(pts.length, Math.round(pts[0][0]), Math.round(pts[0][1]), Math.round(pts[pts.length >> 1][0]));
  const P = wobble(pts, closed, seed, o.amp ?? 1.5);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.beginPath();
  trace(ctx, P, closed);
  if (o.fill && closed) {
    ctx.fillStyle = o.fill;
    ctx.fill();
    if (o.tex !== false) {
      const ga = ctx.globalAlpha;
      ctx.globalAlpha = ga * (o.texA ?? 0.4);
      ctx.fillStyle = hatch(ctx);
      ctx.fill();
      ctx.globalAlpha = ga;
    }
  }
  if (o.stroke !== false && o.stroke !== null && (o.lw ?? 5) > 0) {
    ctx.strokeStyle = o.stroke || C.ink;
    ctx.lineWidth = o.lw ?? 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.stroke();
  }
  ctx.restore();
}
export const ell = (ctx, cx, cy, rx, ry, o = {}) => draw(ctx, ellPts(cx, cy, rx, ry), o);
export const circle = (ctx, cx, cy, r, o = {}) => draw(ctx, ellPts(cx, cy, r, r), o);
export const rect = (ctx, x, y, w, h, r = 0, o = {}) => draw(ctx, rectPts(x, y, w, h, r), o);
export const poly = (ctx, pts, o = {}) => draw(ctx, pts, o);
export const blob = (ctx, pts, o = {}) => draw(ctx, curvePts(pts, true), o);
export const limb = (ctx, line, width, o = {}) => draw(ctx, limbPts(line, width), o);
/** Trait ouvert (ligne, courbe) sans remplissage. */
export function line(ctx, pts, o = {}) {
  const p = o.smooth === false ? pts : curvePts(pts, false, 10);
  draw(ctx, p, { ...o, closed: false, fill: null });
}
export const seg = (ctx, x1, y1, x2, y2, o = {}) => draw(ctx, [[x1, y1], [x2, y2]], { ...o, closed: false, fill: null });
/** Arc ouvert (sourire, sourcil, anse). */
export const arc = (ctx, cx, cy, rx, ry, a0, a1, o = {}) => draw(ctx, ellPts(cx, cy, rx, ry, a0, a1), { ...o, closed: false, fill: null });
/** Pointillés (contour « avant / après »). */
export function dotted(ctx, pts, o = {}) {
  ctx.save();
  ctx.fillStyle = o.color || C.blueDark;
  const P = wobble(pts, true, 3, 0.6, 3);
  const gap = o.gap ?? 16, r = o.r ?? 3.2;
  let acc = 0;
  for (let i = 1; i < P.length; i++) {
    acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (acc >= gap) { acc = 0; ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- texte ----------
export const FONT = { round: 'Crayon Round', bold: 'Crayon Bold', hand: 'Crayon Hand' };
/**
 * Texte posé à la main : légère rotation, contour optionnel.
 * o = { size, font, color, align, baseline, rot, stroke, lw, weight, spacing }
 */
export function text(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.font = `${o.weight || ''} ${o.size || 48}px "${o.font || FONT.round}", "Arial Rounded MT Bold", "Arial"`.trim();
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw || Math.max(4, (o.size || 48) * 0.16);
    ctx.strokeText(str, 0, 0);
  }
  ctx.fillStyle = o.color || C.ink;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
export function textWidth(ctx, str, size, font = FONT.round) {
  ctx.save(); ctx.font = `${size}px "${font}"`; const w = ctx.measureText(str).width; ctx.restore(); return w;
}

// ---------- utilitaires de pose ----------
/** Place un dessin en coordonnées locales : translate, échelle, rotation. */
export function at(ctx, x, y, s, fn, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (s !== 1) ctx.scale(s, s);
  fn(ctx);
  ctx.restore();
}
/** Fond plein, avec un léger dégradé radial pour ne pas faire « aplat numérique ». */
export function fillBg(ctx, color, color2) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  if (color2) {
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.5, H * 0.8);
    g.addColorStop(0, color); g.addColorStop(1, color2);
    ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  }
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = hatch(ctx);
  ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.restore();
}

/** Pose la texture crayon sur une zone déjà peinte (dégradés de ciel, de mer). */
export function texture(ctx, x, y, w, h, alpha = 0.13) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = hatch(ctx); ctx.fillRect(x, y, w, h); ctx.restore();
}
