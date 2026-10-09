// Les tableaux : des compositions complètes (décor + elle + lumière), prêtes à poser dans une scène.
//   T.plage(g, S, { pose: 'doua', eyes: 'closed' })
// S = l'état de la scène (S.t = temps). Les options vont au personnage, sauf `decor` (options du décor).

import { soeur, soeurDos, soeurSujud, mainsDoua } from './soeur.js';
import * as D from './nature.js';

const { SOL } = D;

/** Plage au crépuscule, lanterne et thé. */
export function plage(g, S, o = {}) {
  D.plage(g, { t: S.t, ...o.decor });
  D.tapis(g, 560, SOL.plage + 26, 400, 80);
  D.lanterne(g, 930, SOL.plage + 20, 1.0, { t: S.t });
  if (o.the !== false) D.the(g, 196, SOL.plage + 44, 1.0, { t: S.t });
  soeur(g, { x: 560, y: SOL.plage, t: S.t, ...o });
  D.lueur(g, 930, SOL.plage - 120, 760, 0.5, S.t);
  D.voileNuit(g, 560, 1180, 0.55);
  D.lucioles(g, [40, 800, 270, 560], 6, S.t, 9);
  D.lucioles(g, [800, 700, 260, 420], 5, S.t, 14);
}
/** La même plage, elle de dos, face à la mer. */
export function plageDos(g, S, o = {}) {
  D.plage(g, { t: S.t, sunX: 540, cocotier: o.cocotier, ...o.decor });
  D.lanterne(g, 880, SOL.plage + 30, 0.9, { t: S.t });
  soeurDos(g, { x: 540, y: SOL.plage, t: S.t, ...o });
  D.lueur(g, 880, SOL.plage - 100, 700, 0.42, S.t);
  D.voileNuit(g, 540, 1150, 0.55);
  D.lucioles(g, [40, 800, 300, 560], 6, S.t, 9);
}
/** Véranda cosy : arche sur la mer, coussins, table basse aux bougies, plante. */
export function veranda(g, S, o = {}) {
  D.veranda(g, { t: S.t, ...o.decor });
  D.plante(g, 130, SOL.veranda - 150, 1.2, { t: S.t });
  D.tapis(g, 560, SOL.veranda + 30, 420, 84, { color: '#8c4a52', edge: '#e9c7a0' });
  D.coussin(g, 300, SOL.veranda - 60, 0.95, '#c98a4b', -0.12);
  D.coussin(g, 800, SOL.veranda - 64, 0.9, '#a55a55', 0.14);
  soeur(g, { x: 560, y: SOL.veranda, t: S.t, robe: '#6f8f9a', ...o });
  D.tableBasse(g, 880, SOL.veranda + 140, 0.82, { t: S.t, the: o.the });
  D.lueur(g, 850, SOL.veranda - 40, 820, 0.52, S.t);
  D.voileNuit(g, 560, 1150, 0.5);
}
/** Jardin de nuit : lanternes dans l'herbe, lucioles. */
export function jardin(g, S, o = {}) {
  D.jardin(g, { t: S.t, ...o.decor });
  D.tapis(g, 540, SOL.jardin + 26, 400, 80, { color: '#7c4a66', edge: '#e9c7a0' });
  D.lanterne(g, 190, SOL.jardin + 40, 0.9, { t: S.t });
  D.lanterne(g, 900, SOL.jardin + 10, 0.72, { t: S.t + 0.5 });
  soeur(g, { x: 540, y: SOL.jardin, t: S.t, robe: '#8c6f8e', voile: '#f3e3d2', ...o });
  D.lueur(g, 190, SOL.jardin - 110, 700, 0.5, S.t);
  D.lueur(g, 900, SOL.jardin - 90, 520, 0.4, S.t + 0.5);
  D.voileNuit(g, 540, 1200, 0.45);
  D.lucioles(g, [40, 700, 1000, 700], 16, S.t, 5);
}
/** Lac de montagne à l'heure bleue. */
export function lac(g, S, o = {}) {
  D.lac(g, { t: S.t, ...o.decor });
  D.tapis(g, 500, SOL.lac + 26, 400, 80, { color: '#9a5a4a', edge: '#f0d2a8' });
  D.lanterne(g, 150, SOL.lac + 40, 0.95, { t: S.t });
  if (o.the !== false) D.the(g, 850, SOL.lac + 50, 1.0, { t: S.t });
  soeur(g, { x: 500, y: SOL.lac, t: S.t, robe: '#b0766a', voile: '#f3e6d6', ...o });
  D.lueur(g, 150, SOL.lac - 110, 760, 0.5, S.t);
  D.voileNuit(g, 520, 1180, 0.5);
  D.lucioles(g, [560, 760, 480, 520], 7, S.t, 11);
}
/** Gros plan sur la flamme. */
export function flamme(g, S, o = {}) { D.flammeGros(g, { t: S.t, ...o }); }
/** Le ciel seul. o.filante = [début, fin] en temps local de la scène. */
export function ciel(g, S, o = {}) {
  D.cielSeul(g, { t: S.t, ...o.decor });
  if (o.filante) D.filante(g, 180, 520, 520, 700, S.k(o.filante[0], o.filante[1]));
  D.voileNuit(g, 600, 900, 0.35);
}
/** Gros plan : ses mains ouvertes, la mer au loin. */
export function mains(g, S, o = {}) {
  D.ciel(g, { t: S.t, sunX: 540, moonX: 880, moonY: 740, ...o.decor });
  D.mer(g, { t: S.t, sunX: 540, bas: 2000 });
  mainsDoua(g, 540, 1420, 1.55, { t: S.t, ...o });
  D.lueur(g, 540, 1330, 620, 0.4, S.t);
  D.lucioles(g, [240, 820, 600, 520], 10, S.t, 17);
  D.voileNuit(g, 540, 1300, 0.5);
}
/** Prosternation sur la plage, face à la mer. o.fardeau = 0..1 (les pierres posées sur son dos s'envolent), absent = pas de pierres. */
export function sujud(g, S, o = {}) {
  D.plage(g, { t: S.t, sunX: 250, ...o.decor });
  D.tapis(g, 520, SOL.plage + 24, 450, 74, { color: '#8c4a52', edge: '#e9c7a0' });
  D.lanterne(g, 950, SOL.plage + 26, 0.95, { t: S.t });
  soeurSujud(g, { x: 580, y: SOL.plage, s: 1.12, t: S.t, ...o });
  if (o.fardeau != null) D.fardeau(g, 610, SOL.plage - 270, o.fardeau, S.t);
  D.lueur(g, 950, SOL.plage - 110, 760, 0.48, S.t);
  D.voileNuit(g, 560, 1200, 0.55);
  D.lucioles(g, [40, 820, 300, 520], 6, S.t, 9);
}
/** L'épreuve qui passe : la plage sous l'orage, puis le ciel se dégage. o.k = 0 (couvert) .. 1 (dégagé). Elle est de dos, face à la mer. */
export function orage(g, S, o = {}) {
  D.plage(g, { t: S.t, sunX: 540, cocotier: false, ...o.decor });
  D.orage(g, o.k ?? 0, S.t, { bas: 960 });
  if (o.elle !== false) soeurDos(g, { x: 540, y: SOL.plage, t: S.t, ...o });
  D.lanterne(g, 880, SOL.plage + 30, 0.9, { t: S.t });
  D.lueur(g, 880, SOL.plage - 100, 700, 0.42, S.t);
  D.voileNuit(g, 540, 1150, 0.55 + 0.25 * (1 - (o.k ?? 0)));
}
/** Le passage étroit qui s'ouvre sur la mer et la lumière. o.k = 0 (étroit) .. 1 (ouvert). */
export function passage(g, S, o = {}) {
  D.ciel(g, { t: S.t, sunX: 540, moon: false, ...o.decor });
  D.mer(g, { t: S.t, sunX: 540, bas: 2000, iles: false });
  D.passage(g, o.k ?? 0, S.t, o);
}
/** Une barque et sa lanterne sur la mer, sous la lune. o.x = position de la barque. */
export function barque(g, S, o = {}) {
  const nuit = ['#2a3364', '#38427c', '#494e8a', '#232a58'];
  D.ciel(g, { t: S.t, pal: D.PAL.nuit, sun: false, horizon: 1060, etoiles: 150, etoilesH: 900, moonX: 800, moonY: 700, moonR: 78, nuages: nuit, ...o.decor });
  D.mer(g, { t: S.t, horizon: 1060, bas: 2000, iles: false, sunX: 800, eau: ['#4b548c', '#2e376c', '#1c2350', '#12173a'], reflet: ['#fbf0cf', '#b9c0e6'] });
  D.barque(g, o.x ?? 500, o.y ?? 1470, o.s ?? 1.25, S.t);
  D.voileNuit(g, o.x ?? 500, 1350, 0.45);
}
/** Le sentier de lumières qui monte vers l'horizon. o.k = 0..1. */
export function sentier(g, S, o = {}) {
  D.ciel(g, { t: S.t, pal: D.PAL.heureBleue, sun: false, horizon: 1140, moonX: 545, moonY: 760, moonR: 70, nuages: ['#4f64a0', '#93a0c8', '#d9b3a6', '#34467e'], ...o.decor });
  D.montagnes(g, 1140, ['#6377a8', '#42548a', '#2a3660']);
  D.herbe(g, 1130);
  D.sentier(g, o.k ?? 1, S.t);
  D.voileNuit(g, 540, 1300, 0.4);
}

/** La pierre sur la plage (la difficulté : une seule), et les lanternes qui s'allument à côté d'elle (les facilités).
 *  o.l1, o.l2 = 0..1 : chaque lanterne apparaît et s'allume. */
export function pierre(g, S, o = {}) {
  D.plage(g, { t: S.t, sunX: 250, ...o.decor });
  D.rocher(g, 540, SOL.plage + 20, 1.15);
  [[230, o.l1], [850, o.l2]].forEach(([x, k], i) => {
    if (!k) return;
    g.save(); g.globalAlpha = Math.min(1, k * 1.6);
    D.lanterne(g, x, SOL.plage + 34, 1.1 * (0.85 + 0.15 * Math.min(1, k)), { t: S.t + i * 0.4 });
    g.restore();
    D.lueur(g, x, SOL.plage - 100, 620, 0.5 * Math.min(1, k), S.t + i * 0.4);
  });
  D.voileNuit(g, 540, 1180, 0.55);
  D.lucioles(g, [60, 820, 960, 480], 7, S.t, 9);
}
/** Deux femmes ensemble dans la véranda : l'une parle, l'autre écoute (demander de l'aide, être accompagnée). */
export function ensemble(g, S, o = {}) {
  D.veranda(g, { t: S.t, ...o.decor });
  D.tapis(g, 545, SOL.veranda + 34, 500, 92, { color: '#8c4a52', edge: '#e9c7a0' });
  soeur(g, { x: 345, y: SOL.veranda, s: 0.86, t: S.t, robe: '#6f8f9a', pose: 'parle', eyes: 'open', mouth: 'smile', look: [1, 0], ...o });
  soeur(g, { x: 765, y: SOL.veranda + 8, s: 0.84, t: S.t + 0.8, robe: '#b0766a', voile: '#ead6c2', skin: '#dba983', pose: 'repos', eyes: 'happy', mouth: 'smile', ...o.amie });
  D.bougie(g, 555, SOL.veranda + 150, 0.95, { t: S.t, h: 110 });
  D.lueur(g, 555, SOL.veranda - 10, 820, 0.5, S.t);
  D.voileNuit(g, 550, 1180, 0.5);
}
/** Le terrier : un petit trou dans une butte du jardin. o.orbes = [k, k] (0..1) : des lumières y entrent. o.eclat = 0..1 : le trou s'illumine. */
export function terrier(g, S, o = {}) {
  D.jardin(g, { t: S.t, ...o.decor });
  const tx = 560, ty = 1476;
  D.butteTerrier(g, tx, ty, o.eclat || 0);
  if (o.eclat) D.lueur(g, tx, ty, 520 * o.eclat, 0.7 * o.eclat, S.t);
  for (const k of o.orbes || []) {
    if (k <= 0 || k >= 1) continue;
    const e = k * k * (3 - 2 * k), u = 1 - e;
    const x = u * u * 90 + 2 * u * e * 760 + e * e * tx, y = u * u * 760 + 2 * u * e * 900 + e * e * ty;
    D.orbe(g, x, y, 26 * (1 - 0.45 * e), Math.min(1, k * 6) * Math.min(1, (1 - k) * 8));
  }
  D.lucioles(g, [40, 760, 1000, 500], 9, S.t, 5);
  D.voileNuit(g, tx, 1380, 0.4);
}
/** L'aube sur la plage : le jour qui monte, sans étoiles, la mer claire. o.elle = false pour le paysage seul (place d'une légende). */
export function aube(g, S, o = {}) {
  D.plage(g, { t: S.t, pal: D.PAL.aube, sunX: 300, moon: false, etoiles: 0, nuages: ['#f3c0b4', '#f7d2b0', '#fbe2c0', '#c9a6c0'],
    eau: ['#f4cbb0', '#c6a9c6', '#7f93c2', '#4a5f96'], reflet: ['#fff3d2', '#ffd9a8'], ile: '#7d6f9c', ileLoin: '#a590b4', ...o.decor });
  if (o.elle !== false) {
    D.tapis(g, 560, SOL.plage + 26, 400, 80);
    if (o.the !== false) D.the(g, 196, SOL.plage + 44, 1.0, { t: S.t });
    soeur(g, { x: 560, y: SOL.plage, t: S.t, ...o });
  }
  D.voileNuit(g, 540, 1100, 0.28);
}
// ---------- écrire un short en quelques lignes ----------
const TOUS = { plage, plageDos, veranda, jardin, lac, flamme, ciel, mains, sujud, orage, passage, barque, sentier, pierre, ensemble, terrier, aube };
// mouvements de caméra lents, qui alternent d'un plan à l'autre (elle ne s'arrête jamais, elle ne se presse jamais)
const CAMS = [
  { from: [540, 985, 1.0], to: [540, 1015, 1.09] },
  { from: [545, 1020, 1.1], to: [540, 975, 1.0] },
  { from: [520, 990, 1.03], to: [562, 1005, 1.1] },
  { from: [560, 1010, 1.1], to: [525, 985, 1.02] },
];
/**
 * Transforme une liste de plans en scènes. Un plan = [mot d'entrée, tableau, options, réglages].
 *   mot d'entrée : index du mot (voir voice/mots.txt) ou début du mot ('épreuv')
 *   options : objet, ou fonction S => objet pour animer au mot (S.w('mot'), S.k(a, b))
 *   réglages : { cam, lead, transDur, plus: (g, S) => dessin par-dessus }
 */
export function plans(liste) {
  return liste.map(([cue, nom, opts, reglages = {}], i) => {
    const { plus, ...reste } = reglages;
    if (!TOUS[nom]) throw new Error(`Tableau inconnu : ${nom}. Tableaux : ${Object.keys(TOUS).join(', ')}`);
    return {
      id: `${i + 1}-${nom}`, cue, cam: CAMS[i % CAMS.length], ...reste,
      draw(g, S) { TOUS[nom](g, S, typeof opts === 'function' ? opts(S) : (opts || {})); if (plus) plus(g, S); },
    };
  });
}
