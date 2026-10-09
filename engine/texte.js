// Le texte à l'écran : le titre du short (en haut, tout du long) et les sous-titres (ses mots,
// calés sur sa voix). Posés par-dessus l'image finie : la caméra ne les fait pas bouger.
// Règle de DA : le tiers haut de chaque décor reste calme, c'est la place du texte.

import { W, clamp, prog, ease } from './core.js';

const SERIF = '"Cours Serif", "Georgia", serif', ITAL = '"Cours Serif Italic", "Georgia", serif';
const FORT = /[.?!…:]["»)]?$/, DOUX = /[,;]["»)]?$/;

/** Applique les corrections d'affichage aux mots (la voix, elle, ne change jamais).
 *  glossaire : { "sorate": "sourate" } (mot entier, sans tenir compte de la casse ni de la ponctuation)
 *  parIndex  : { "12": "sourate", "40": "" } (mot numéro 12 ; texte vide = mot non affiché) */
export function corriger(words, glossaire = {}, parIndex = {}) {
  const cle = s => s.toLowerCase().normalize('NFC').replace(/^[«"(\s]+|[.,;:!?…»")\s]+$/g, '');
  const G = Object.fromEntries(Object.entries(glossaire).map(([k, v]) => [cle(k), v]));
  return words.map((m, i) => {
    let aff = m.w;
    const k = cle(m.w);
    if (k in G) aff = m.w.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), G[k]);
    if (String(i) in parIndex) aff = parIndex[i];
    return { ...m, aff };
  });
}

const PETITS = new Set("le la les l' de des du d' à au aux un une et ou que qu' qui ce cet cette ces se s' on il elle je j' tu nous vous ne n' en dans sur par pour avec sans si mon ma mes ton ta tes son sa ses notre votre leur est a y très plus c'est qu'il qu'elle comme mais donc car ni où dès quand puis lorsque parce vers chez entre".split(' '));
const cle = s => s.toLowerCase().replace(/^[«"(\s]+|[.,;:!?…»")\s]+$/g, '');
const long = arr => arr.reduce((a, x) => a + x.txt.length + 1, 0) - 1;

/** Regroupe les mots en sous-titres de une ou deux lignes, coupés là où elle respire :
 *  fin de phrase, pause, virgule ; jamais sur un petit mot (« le », « de », « que ») laissé en bout de ligne. */
export function construireCues(words, o = {}) {
  const maxLigne = o.maxLigne ?? 24, maxCue = maxLigne * 2 - 2, pause = o.pause ?? 0.55;
  const items = words.map((m, i) => ({ txt: m.aff ?? m.w, start: m.start, end: m.end, i })).filter(x => x.txt !== '');
  const cues = []; let cur = [];
  const fermer = () => { if (cur.length) cues.push({ mots: cur }); cur = []; };
  for (const m of items) {
    const prev = cur[cur.length - 1];
    if (prev && (m.start - prev.end > pause || FORT.test(prev.txt))) fermer();
    else if (prev && long(cur) + 1 + m.txt.length > maxCue) {
      // trop long : on coupe à la dernière virgule si elle n'arrive pas trop tôt, sinon avant les petits mots de la fin
      let k = -1;
      for (let j = cur.length - 2; j >= 0; j--) if (DOUX.test(cur[j].txt) && long(cur.slice(0, j + 1)) >= maxCue * 0.45) { k = j + 1; break; }
      if (k < 0) { k = cur.length; while (k > 1 && cur.length - k < 2 && PETITS.has(cle(cur[k - 1].txt))) k--; }
      const reste = cur.slice(k); cur = cur.slice(0, k); fermer(); cur = reste;
    }
    cur.push(m);
  }
  fermer();
  // un mot seul et court rejoint le sous-titre d'avant quand il y tient
  for (let i = cues.length - 1; i > 0; i--) {
    const c = cues[i].mots, p = cues[i - 1].mots;
    if (c.length === 1 && long(c) < 9 && long(p) + 1 + long(c) <= maxCue && c[0].start - p[p.length - 1].end < pause && !FORT.test(p[p.length - 1].txt)) { p.push(...c); cues.splice(i, 1); }
  }
  cues.forEach((c, i) => {
    c.t0 = Math.max(0, c.mots[0].start - 0.1);
    const fin = c.mots[c.mots.length - 1].end, suiv = cues[i + 1];
    c.t1 = Math.max(fin + 0.4, c.t0 + 0.9);
    if (suiv) c.t1 = Math.min(c.t1, suiv.mots[0].start - 0.12);
    // deux lignes équilibrées si le texte dépasse une ligne
    const total = long(c.mots);
    c.coupe = c.mots.length;
    if (total > maxLigne) {
      let best = 1e9, acc = 0;
      c.mots.forEach((x, k) => {
        acc += x.txt.length + 1;
        const d = Math.abs(acc - 1 - total / 2) + (DOUX.test(x.txt) ? -5 : 0) + (PETITS.has(cle(x.txt)) ? 7 : 0);
        if (k < c.mots.length - 1 && d < best) { best = d; c.coupe = k + 1; }
      });
    }
    c.texte = c.mots.map((x, k) => (k === c.coupe ? '/ ' : '') + x.txt).join(' ');
  });
  return cues;
}

function ombre(g, fn, blur = 18, a = 0.9) {
  g.save(); g.shadowColor = `rgba(22,14,40,${a})`; g.shadowBlur = blur; g.shadowOffsetY = 3; fn(); g.restore();
}

/** Sous-titre au temps t. Les mots déjà dits sont pleins, les mots à venir sont en retrait. */
export function dessinerSousTitres(g, cues, t, o = {}) {
  const c = cues.find(c => t >= c.t0 && t < c.t1);
  if (!c) return;
  const size = o.size ?? 62, y0 = o.y ?? 480, inter = size * 1.28;
  const a = Math.min(prog(t, c.t0, c.t0 + 0.14), 1 - prog(t, c.t1 - 0.16, c.t1));
  const lignes = c.coupe < c.mots.length ? [c.mots.slice(0, c.coupe), c.mots.slice(c.coupe)] : [c.mots];
  g.save();
  g.font = `${size}px ${SERIF}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  const esp = g.measureText(' ').width;
  lignes.forEach((L, li) => {
    const ws = L.map(x => g.measureText(x.txt).width);
    const total = ws.reduce((s, v) => s + v, 0) + esp * (L.length - 1);
    let k = Math.min(1, (W - 120) / total), x = (W - total * k) / 2;
    const y = y0 + (li - (lignes.length - 1) / 2) * inter;
    if (k < 1) g.font = `${size * k}px ${SERIF}`;
    L.forEach((m, j) => {
      const dit = ease.out(prog(t, m.start - 0.06, m.start + 0.1));
      g.globalAlpha = clamp(a) * (0.6 + 0.4 * dit);
      ombre(g, () => { g.fillStyle = o.color || '#fff6e6'; g.fillText(m.txt, x, y); });
      x += (ws[j] + esp) * k;
    });
  });
  g.restore();
}

/** Titre du short : en haut, tout du long. Plus grand pendant l'accroche, puis il se pose. */
export function dessinerTitre(g, titre, t, o = {}) {
  if (!titre) return;
  const lignes = Array.isArray(titre) ? titre : String(titre).split('\n');
  const k = 1 + 0.16 * (1 - ease.io(prog(t, o.accroche ?? 3.2, (o.accroche ?? 3.2) + 0.9)));
  const size = (o.size ?? 54) * k, y0 = (o.y ?? 250);
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${size}px ${ITAL}`;
  g.globalAlpha = (o.alpha ?? 1) * prog(t, 0, 0.01);
  lignes.forEach((l, i) => {
    let s = size; const w = g.measureText(l).width;
    if (w > W - 150) { s = size * (W - 150) / w; g.font = `${s}px ${ITAL}`; }
    ombre(g, () => { g.fillStyle = o.color || '#f6cf8a'; g.fillText(l, W / 2, y0 + i * size * 1.22); }, 14, 0.8);
  });
  // filet doré sous le titre
  const yb = y0 + (lignes.length - 1) * size * 1.22 + size * 0.86;
  g.globalAlpha *= 0.75; g.strokeStyle = '#f6cf8a'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(W / 2 - 46, yb); g.lineTo(W / 2 + 46, yb); g.stroke();
  g.restore();
}

/** Signature discrète en fin de vidéo (nom du compte), facultative. */
export function dessinerSignature(g, texte, t, fin, o = {}) {
  if (!texte) return;
  const a = prog(t, fin - 2.2, fin - 1.4);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `44px ${ITAL}`;
  ombre(g, () => { g.fillStyle = '#fff6e6'; g.fillText(texte, W / 2, o.y ?? 640); });
  g.restore();
}

/** Légende posée dans l'image (une traduction, une référence de sourate). Jamais un mot qu'elle n'a pas dit ou écrit :
 *  on y met ce qui est sur sa diapo. lignes = ['...', '...'], la dernière ligne est la source (plus petite). */
export function legende(g, lignes, alpha = 1, y = 660, o = {}) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha; g.textAlign = 'center'; g.textBaseline = 'middle';
  const k = g.canvas.width / W; g.setTransform(k, 0, 0, k, 0, 0);          // posée sur l'écran : la caméra ne la déplace pas
  if (o.ombre !== false) {                                                // une ombre douce derrière : lisible même sur un ciel clair
    const h = lignes.length * 58 + 40, yc = y + (lignes.length - 1) * 29;
    g.save(); g.translate(W / 2, yc); g.scale(1, h / 620);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 620); gr.addColorStop(0, 'rgba(28,22,48,0.46)'); gr.addColorStop(0.55, 'rgba(28,22,48,0.3)'); gr.addColorStop(1, 'rgba(28,22,48,0)');
    g.fillStyle = gr; g.fillRect(-620, -620, 1240, 1240); g.restore();
  }
  lignes.forEach((l, i) => {
    const src = o.source !== false && i === lignes.length - 1 && lignes.length > 1, size = src ? 32 : (o.size ?? 44);
    g.font = `${size}px ${src ? SERIF : ITAL}`;
    ombre(g, () => { g.fillStyle = src ? '#f6cf8a' : '#fff6e6'; g.fillText(l, W / 2, y + i * 58 + (src ? 10 : 0)); }, 14, 0.85);
  });
  g.restore();
}
