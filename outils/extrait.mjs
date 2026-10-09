#!/usr/bin/env node
// Prépare la voix d'un short à partir du cours.
//
//   node outils/extrait.mjs <dossier du cours> --mots 00:41:10 00:43:30
//       liste les mots de ce passage avec leur heure exacte dans le cours (pour choisir où couper)
//   node outils/extrait.mjs <dossier du cours> <dossier du short>
//       lit <short>/coupe.json, découpe sa voix, la nettoie, et cale chaque mot :
//       -> <short>/voice/voice.wav et <short>/voice/words.json
//
// coupe.json : { "segments": [[2472.3, 2525.1], [2551.0, 2582.4]], "retirer": [[2490.2, 2493.6]], "resserrer": 1.0 }
// Temps en secondes du cours (ou "00:41:12.30"). Plusieurs segments = on saute ce qu'il y a entre eux
// (une parenthèse, une question d'élève). "retirer" = petites coupes à l'intérieur (une hésitation).
// "resserrer" = durée maximale d'un silence ; au-delà il est ramené à 0,6 s (false pour ne rien toucher).
// Sa voix n'est jamais modifiée : on coupe, on nettoie le souffle, on met au bon volume.

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run, ffmpeg, whisper, modele, duree, silences, hms, sec, opt, motsDepuisJetons } from './commun.mjs';

const args = process.argv.slice(2);
const cours = resolve(args[0] || '.');
const W = whisper(), M = modele();

/** Mots d'un fichier son 16 kHz, calés par whisper (-dtw). */
function mots(wav16, decal = 0, amorce = '') {
  const base = wav16.replace(/\.wav$/, '');
  run(W, ['-m', M, '-l', 'fr', '-t', '8', '-f', wav16, '-ojf', '-of', base, '-np', '-mc', '0', '-dtw', 'large.v3.turbo', '-nfa', ...(amorce ? ['--prompt', amorce] : [])]);
  const j = JSON.parse(readFileSync(base + '.json', 'utf8'));
  rmSync(base + '.json');
  return motsDepuisJetons(j, decal);
}
const AMORCE = "Cours de sciences islamiques, en français, avec des mots arabes : Allah, le Prophète, Coran, sourate, verset, hadith, sunna, iman, dou'a, sabr, tawakkul, dhikr.";

if (opt(args, 'mots')) {
  const i = args.indexOf('--mots'), a = sec(args[i + 1]), b = sec(args[i + 2]);
  const tmp = join(cours, 'transcript', `mots_${Math.round(a)}_${Math.round(b)}.wav`);
  mkdirSync(join(cours, 'transcript'), { recursive: true });
  run(ffmpeg(), ['-v', 'error', '-y', '-ss', String(a), '-t', String(b - a), '-i', join(cours, 'audio16k.wav'), tmp]);
  const ws = mots(tmp, a, AMORCE);
  rmSync(tmp);
  const cache = join(cours, 'transcript', `mots_${Math.round(a)}_${Math.round(b)}.json`);
  writeFileSync(cache, JSON.stringify(ws));
  // une ligne par phrase ; l'heure (en secondes du cours) est redonnée après chaque pause, les pauses sont notées
  let ligne = '', prev = null; const out = [];
  for (const m of ws) {
    const pause = prev ? m.start - prev.end : 0;
    if (prev && /[.?!…]$/.test(prev.w)) { out.push(ligne); ligne = ''; }
    if (!ligne) ligne = `${m.start.toFixed(2)}  `;
    else if (pause > 0.3) ligne += ` ⟨${pause.toFixed(1)}⟩ [${m.start.toFixed(2)}] `;
    else ligne += ' ';
    ligne += opt(args, 'detail') ? `${m.w}@${m.start.toFixed(2)}` : m.w; prev = m;
  }
  if (ligne) out.push(ligne + `   ⟨fin ${prev.end.toFixed(2)}⟩`);
  console.log(out.join('\n'));
  process.exit(0);
}

const short = resolve(args[1] || '.');
const coupe = JSON.parse(readFileSync(join(short, 'coupe.json'), 'utf8'));
const source = coupe.source || JSON.parse(readFileSync(join(cours, 'source.json'), 'utf8')).source;
mkdirSync(join(short, 'voice'), { recursive: true });
const wav = join(short, 'voice', 'voice.wav'), w16 = join(short, 'voice', 'voice16k.wav');
const maxPause = coupe.resserrer === false ? Infinity : (coupe.resserrer ?? 0.75), PAUSE = coupe.pause ?? 0.5;

// Le son d'une visio est sourd (tout est sous 1 kHz) et inégal. On l'éclaircit et on l'égalise, sans le déformer :
// coupe-bas, souffle, moins de « boîte » à 260 Hz, présence à 3,6 kHz, air au-dessus de 7,5 kHz,
// sifflantes adoucies, compression douce (les mots faibles remontent), limiteur, volume -16 LUFS.
const NETTOYAGE = coupe.son || [
  'highpass=f=85', 'afftdn=nr=10:nf=-48:tn=1',
  'equalizer=f=260:t=q:w=1.0:g=-3', 'equalizer=f=3600:t=q:w=0.9:g=4', 'highshelf=f=7500:g=3',
  'deesser=i=0.3', 'acompressor=threshold=-21dB:ratio=2.5:attack=12:release=180:makeup=3dB:knee=6dB',
  'alimiter=limit=-1.5dB:level=disabled', 'loudnorm=I=-16:TP=-1.5:LRA=7', 'aresample=48000',
].join(',');

// ---- le son du cours en mémoire (16 kHz), pour poser chaque coupe dans un creux entre deux mots ----
let PCM = null;
function pcm() {
  if (!PCM) { const b = readFileSync(join(cours, 'audio16k.wav')), off = b.indexOf('data') + 8, n = Math.floor((b.length - off) / 2); PCM = new Int16Array(n); for (let i = 0; i < n; i++) PCM[i] = b.readInt16LE(off + i * 2); }
  return PCM;
}
function energie(x) { const p = pcm(), i = Math.round(x * 16000), n = 320; if (i < 0 || i + n >= p.length) return Infinity; let e = 1; for (let k = 0; k < n; k++) e += p[i + k] * p[i + k]; return e; }
/** Le creux d'énergie le plus proche de t (pour les bords d'un segment). */
function creux(t, marge = 0.09) {
  let best = Infinity, bt = t;
  for (let x = t - marge; x <= t + marge; x += 0.005) { const e = energie(x) * (1 + Math.abs(x - t) * 3); if (e < best) { best = e; bt = x + 0.01; } }
  return +bt.toFixed(3);
}
/** Le vrai silence le plus proche de t, à un quart de seconde près (pour une coupe à l'intérieur d'une phrase).
 *  L'heure d'un mot est juste à 0,1 s près : couper à cette heure laisse parfois un bout de mot. On coupe donc
 *  dans le silence voisin, et seulement à défaut dans le creux le plus proche. */
function silenceProche(t, marge = 0.25, bord = 'debut') {
  const E = []; let max = 1;
  for (let x = t - marge; x <= t + marge; x += 0.005) { const e = energie(x); E.push([x, e]); if (e > max && e < Infinity) max = e; }
  const seuil = max * 0.004; let best = null;
  for (let a = 0; a < E.length; a++) {
    if (E[a][1] >= seuil) continue;
    let b = a; while (b + 1 < E.length && E[b + 1][1] < seuil) b++;
    if (b - a >= 5) {
      // début de coupe : juste après la fin du mot gardé. Fin de coupe : 80 ms avant le mot qui reprend (son attaque reste entière).
      const lo = E[a][0] + (bord === 'debut' ? 0.04 : 0.015), hi = Math.max(lo, E[b][0] - (bord === 'fin' ? 0.08 : 0));
      const c = Math.min(Math.max(t, lo), hi), d = Math.abs(c - t); if (!best || d < best.d) best = { d, t: c };
    }
    a = b;
  }
  return best ? +(best.t + 0.01).toFixed(3) : creux(t);
}
/** segments moins les passages à retirer (tout en temps du cours). */
function soustraire(segs, trous) {
  let out = segs.map(s => Array.isArray(s) ? [...s] : s);
  for (const [x, y] of trous) out = out.flatMap(sg => !Array.isArray(sg) ? [sg] : (([a, b]) => (y <= a || x >= b) ? [[a, b]] : [[a, x], [y, b]].filter(([c, d]) => d - c > 0.06))(sg));
  return out;
}
/** Découpe et met bout à bout en fondu enchaîné de 30 ms, puis nettoie. Sa voix n'est ni accélérée ni transformée. */
function construire(segs) {
  const X = 0.03;
  const entrees = segs.flatMap((sg, i) => {
    const rep = !Array.isArray(sg), a = rep ? sg.a : sg[0], b = rep ? sg.b : sg[1];
    const a2 = Math.max(0, a - (i ? X / 2 : 0)), b2 = b + (i < segs.length - 1 ? X / 2 : 0);
    return ['-ss', a2.toFixed(3), '-t', (b2 - a2).toFixed(3), '-i', rep ? sg.r : source];
  });
  // une phrase redite au téléphone n'a ni le niveau ni la bande du cours : on la rapproche (coupe à 11,5 kHz, même volume)
  let chaine = segs.map((sg, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=mono${Array.isArray(sg) ? '' : ',highpass=f=85,lowpass=f=11500,loudnorm=I=-21:TP=-2:LRA=11,aresample=48000'}[s${i}]`).join(';'), cur = 's0';
  for (let i = 1; i < segs.length; i++) { chaine += `;[${cur}][s${i}]acrossfade=d=${X}:c1=tri:c2=tri[x${i}]`; cur = `x${i}`; }
  chaine += `;[${cur}]afade=t=in:d=0.02,${NETTOYAGE},apad=pad_dur=${coupe.queue ?? 0.3}[v]`;
  run(ffmpeg(), ['-v', 'error', '-y', ...entrees, '-filter_complex', chaine, '-map', '[v]', '-c:a', 'pcm_s16le', wav]);
  run(ffmpeg(), ['-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '16000', w16]);
  return mots(w16, 0, AMORCE);
}
/** temps du short -> temps du cours */
const versCours = (segs, t) => { let acc = 0; for (const sg of segs) { const rep = !Array.isArray(sg), a = rep ? sg.a : sg[0], b = rep ? sg.b : sg[1]; if (t <= acc + (b - a)) return rep ? null : a + (t - acc); acc += b - a; } const d = segs[segs.length - 1]; return Array.isArray(d) ? d[1] : null; };
const cle = w => w.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

let segs, words; const journal = [], alertes = [];
// --texte : on a seulement corrigé texte.txt, on recale le texte sur la voix sans refaire le son
const seulTexte = !!opt(args, 'texte') && existsSync(join(short, 'voice', 'entendu.json'));
if (seulTexte) { const e = JSON.parse(readFileSync(join(short, 'voice', 'entendu.json'), 'utf8')); segs = e.segments; words = e.words; journal.push(...e.journal); alertes.push(...e.alertes); }
else {
// 0. les coupes demandées, posées dans un creux
// une coupe marquée "exact" ([a, b, "exact"]) est prise telle quelle : pour couper au centième près (réparer un trou
// de la visio dans un mot, reprendre sur l'attaque d'une consonne), quand le silence voisin n'est pas le bon endroit
const demandes = (coupe.retirer || []).map(([a, b, mode]) => mode === 'exact' ? [sec(a), sec(b)] : [silenceProche(sec(a), 0.25, 'debut'), silenceProche(sec(b), 0.25, 'fin')]);
// les bords d'un segment se posent dans le silence voisin : 80 ms avant le premier mot, juste après le dernier.
// (l'heure donnée par --mots est en retard de 0,1 à 0,3 s : prise telle quelle, elle mange l'attaque du mot.)
segs = soustraire(coupe.segments.map(([a, b, mode]) => mode === 'exact' ? [sec(a), sec(b)] : [silenceProche(sec(a), 0.3, 'fin'), silenceProche(sec(b), 0.3, 'debut')]), demandes);
// reprises : une phrase qu'elle a redite (au téléphone) remplace un passage du cours
//   "reprises": [{ "fichier": "reprises/front.m4a", "de": 0.4, "a": 3.9, "remplace": [796.2, 801.9] }]
for (const r of coupe.reprises || []) {
  const [A, B] = r.remplace.map(sec), f = resolve(short, r.fichier);
  if (!existsSync(f)) throw new Error(`Reprise introuvable : ${f}`);
  segs = soustraire(segs, [[silenceProche(A, 0.25, 'debut'), silenceProche(B, 0.25, 'fin')]]);
  const pos = segs.findIndex(sg => Array.isArray(sg) && sg[0] >= B - 0.3);
  segs.splice(pos < 0 ? segs.length : pos, 0, { r: f, a: sec(r.de ?? 0), b: sec(r.a ?? duree(f)) });
  journal.push(`reprise posée à la place de ${hms(A)} -> ${hms(B)} : ${r.fichier}`);
}
words = construire(segs);
journal.push(...demandes.map(([a, b]) => `coupe demandée : ${hms(a)} (${(b - a).toFixed(1)} s retirées)`));
const texte0 = words.map(m => cle(m.w)).filter(Boolean);

// 1. les hésitations : un son isolé entre deux mots, que la transcription n'a pas écrit (« euh », faux départ)
if (coupe.hesitations !== false) {
  const sil = silences(wav, -38, 0.1), fin = duree(wav), trous = [];
  const bruits = []; let t = 0;
  for (const [s0, s1] of sil) { if (s0 - t > 0.1) bruits.push([t, s0]); t = s1; }
  if (fin - t > 0.1) bruits.push([t, fin]);
  for (const [n0, n1] of bruits) {
    if (n1 - n0 > 0.9 || n0 < 0.3) continue;
    const i = words.findIndex(m => m.start > n0 - 0.02);
    if (i <= 0) continue;
    const avant = words[i - 1], apres = words[i];
    const c0 = versCours(segs, n0 - 0.04), c1 = versCours(segs, n1 + 0.04);
    if (c0 != null && c1 != null && c1 > c0 && n0 > avant.end + 0.05 && n1 < apres.start - 0.08) { trous.push([c0, c1]); journal.push(`hésitation retirée : ${hms(c0)} (${(n1 - n0).toFixed(2)} s, entre « ${avant.w} » et « ${apres.w} »)`); }
  }
  if (trous.length) { segs = soustraire(segs, trous); words = construire(segs); }
}
// 2. les silences : au-delà de `resserrer`, ramenés à `pause` (elle respire, mais on n'attend pas)
if (maxPause < Infinity) {
  const sil = silences(wav, -38, 0.25), trous = [];
  for (const [s0, s1] of sil) {
    if (s1 - s0 <= maxPause || s0 < 0.15) continue;
    // (l'heure des mots est moins sûre que la mesure du son : un silence mesuré est un silence, même si un mot semble y tomber)
    const c0 = versCours(segs, s0 + PAUSE / 2), c1 = versCours(segs, s1 - PAUSE / 2);
    if (c0 == null || c1 == null || c1 <= c0) continue;
    trous.push([c0, c1]);
    journal.push(`silence raccourci : ${hms(c0)} (${(s1 - s0).toFixed(1)} s -> ${PAUSE} s)`);
  }
  if (trous.length) { segs = soustraire(segs, trous); words = construire(segs); }
}
rmSync(w16);
// 3. contrôles : aucun mot perdu par les coupes automatiques, et ce qui reste de non écrit ou de trop long
const texte1 = words.map(m => cle(m.w)).filter(Boolean);
if (texte0.join(' ') !== texte1.join(' ')) {
  const perdus = texte0.filter((w, i) => texte1[i] !== w).slice(0, 6);
  alertes.push(`ATTENTION : le texte a changé après les coupes automatiques (${texte0.length} mots -> ${texte1.length}). Premiers écarts : ${perdus.join(', ')}. Relire voice/mots.txt ; au besoin "hesitations": false.`);
}
const sil = silences(wav, -38, 0.2);
for (let i = 1; i < words.length; i++) {
  const a = words[i - 1].end, b = words[i].start;
  if (b - a < 0.8) continue;
  const muet = sil.reduce((s, [x, y]) => s + Math.max(0, Math.min(y, b) - Math.max(x, a)), 0);
  if (b - a - muet > 0.6) {
    // où est le son, dans ce trou ? (pour le retirer, ou pour l'écrire à la main dans ajouts.json : récitation en arabe)
    let x = a, y = b; for (const [s0, s1] of sil) { if (s0 <= x + 0.05 && s1 > x) x = s1; if (s1 >= y - 0.05 && s0 < y) y = s0; }
    alertes.push(`parole non écrite : ${(b - a - muet).toFixed(1)} s après le mot ${i - 1} « ${words[i - 1].w} », dans le short de ${x.toFixed(2)} à ${y.toFixed(2)} (cours ${(versCours(segs, a) ?? 0).toFixed(2)} -> ${(versCours(segs, b) ?? 0).toFixed(2)})`);
  }
}
writeFileSync(join(short, 'voice', 'entendu.json'), JSON.stringify({ words, segments: segs, journal, alertes }));
}
// 4. le texte de référence (texte.txt) : c'est lui qui s'affiche. La transcription ne sert plus qu'à donner l'heure de chaque mot.
//    Elle change d'un passage à l'autre et se trompe parfois sur un mot ; le texte relu, lui, ne bouge pas.
const refFile = join(short, 'texte.txt');
if (existsSync(refFile)) {
  // un passage que la transcription n'écrit pas (une récitation en arabe) se pose à la main, entre accolades :
  //   {39.35-41.20: Fa inna ma'al-'usri yusrâ.}    ces mots s'affichent de 39,35 s à 41,20 s du short
  const poseMain = [];
  const texteLibre = readFileSync(refFile, 'utf8').replace(/\{\s*([\d.]+)\s*-\s*([\d.]+)\s*:\s*([^}]*)\}/g, (_, a, b, mots) => { poseMain.push({ a: +a, b: +b, mots: mots.trim().replace(/\s+([:;?!»])/g, '\u00a0$1').replace(/«\s+/g, '«\u00a0').split(/[ \t\n]+/) }); return ` \u0001${poseMain.length - 1} `; });
  const brut = texteLibre.split(/\s+/).filter(Boolean), ref = [];
  for (const tk of brut) {                                    // la ponctuation seule rejoint le mot voisin (« moi ? »)
    if (tk[0] === '\u0001') { ref.push(tk); continue; }
    if (!/[\p{L}\p{N}]/u.test(tk)) { if (/^[«(]/.test(tk)) ref.push(tk + ' \u0000'); else if (ref.length) ref[ref.length - 1] += ' ' + tk; continue; }
    if (ref.length && ref[ref.length - 1].endsWith('\u0000')) ref[ref.length - 1] = ref[ref.length - 1].slice(0, -1) + tk; else ref.push(tk);
  }
  const places = [];                                          // [position dans ref libre, bloc]
  for (let k = ref.length - 1; k >= 0; k--) if (ref[k][0] === '\u0001') { places.unshift([k, poseMain[+ref[k].slice(1)]]); ref.splice(k, 1); }
  places.forEach((pl, q) => { pl[0] -= q; });
  const R = ref.map(cle), Hy = words.map(m => cle(m.w)), n = R.length, m = Hy.length;
  const sub = (a, b) => a === b ? 0 : (a.length > 2 && b.length > 2 && (a.startsWith(b.slice(0, 3)) || b.startsWith(a.slice(0, 3))) ? 0.5 : 1.3);
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) D[i][0] = i; for (let j = 1; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + sub(R[i - 1], Hy[j - 1]), D[i - 1][j] + 1, D[i][j - 1] + 1);
  const paire = new Array(n).fill(null); let i = n, j = m;
  while (i > 0 && j > 0) {
    if (D[i][j] === D[i - 1][j - 1] + sub(R[i - 1], Hy[j - 1])) { paire[i - 1] = j - 1; i--; j--; }
    else if (D[i][j] === D[i - 1][j] + 1) i--; else j--;
  }
  const fin = duree(wav), out = ref.map((w, k) => paire[k] != null ? { w, start: words[paire[k]].start, end: words[paire[k]].end } : { w, start: null, end: null });
  const poses = [];
  for (let k = 0; k < n; k++) {
    if (out[k].start != null) continue;
    let e = k; while (e < n && out[e].start == null) e++;
    const t0 = k ? out[k - 1].end : 0, t1 = e < n ? out[e].start : fin - 0.2, lon = out.slice(k, e).reduce((a, x) => a + x.w.length + 1, 0);
    let t = t0 + Math.min(0.08, Math.max(0, t1 - t0) / 4); const larg = Math.max(t1 - t - 0.04, 0.12 * (e - k));
    for (let q = k; q < e; q++) { const dq = larg * (out[q].w.length + 1) / lon; out[q].start = +t.toFixed(3); out[q].end = +(t + dq).toFixed(3); t += dq; }
    // jamais après le mot calé qui suit : l'ordre des mots reste celui du texte
    for (let q = e - 1; q >= k; q--) { const lim = (q + 1 < n ? out[q + 1].start : fin) - 0.03; if (out[q].start > lim) out[q].start = +Math.max(0, lim).toFixed(3); out[q].end = Math.max(out[q].start + 0.02, Math.min(out[q].end, lim + 0.03)); }
    poses.push(out.slice(k, e).map(x => x.w).join(' ') + ` (${out[k].start.toFixed(1)} s)`);
    k = e - 1;
  }
  const diff = paire.filter((q, k) => q != null && R[k] !== Hy[q]).length;
  const ecarts = paire.map((q, k) => q != null && R[k] !== Hy[q] && R[k].slice(0, 4) !== Hy[q].slice(0, 4) ? `${ref[k]} / ${words[q].w} (${words[q].start.toFixed(1)} s)` : null).filter(Boolean);
  if (ecarts.length) alertes.push(`écrit / entendu, à vérifier : ${ecarts.join(' | ')}`);
  // ce que la transcription entend et qui n'est pas dans le texte : un bout de mot resté après une coupe, ou un mot oublié dans texte.txt
  const pris = new Set(paire.filter(q => q != null)), enPlus = words.map((m, q) => pris.has(q) || cle(m.w).length < 3 ? null : `${m.w} (${m.start.toFixed(1)} s)`).filter(Boolean);
  if (enPlus.length) alertes.push(`entendu en plus du texte, à vérifier : ${enPlus.join(' | ')}`);
  journal.push(`texte de référence : ${n} mots, ${n - poses.reduce((a, x) => a + x.split(' ').length - 2, 0)} calés sur sa voix, ${diff} entendus autrement par la transcription`);
  if (poses.length) journal.push(`mots posés à la main entre deux mots calés : ${poses.join(' | ')}`);
  // réinsertion des blocs posés à la main
  for (let q = places.length - 1; q >= 0; q--) {
    const [pos, bl] = places[q], lon = bl.mots.reduce((a, x) => a + x.length + 1, 0); let t = bl.a;
    const ws = bl.mots.map(w => { const dq = (bl.b - bl.a) * (w.length + 1) / lon, o = { w, start: +t.toFixed(3), end: +(t + dq).toFixed(3) }; t += dq; return o; });
    out.splice(pos, 0, ...ws);
  }
  for (let k = 1; k < out.length; k++) if (out[k].start < out[k - 1].start) out[k].start = out[k - 1].start + 0.01;   // l'ordre du texte, toujours
  words = out;
}
const d = duree(wav);
writeFileSync(join(short, 'voice', 'words.json'), JSON.stringify({ words, duration: +d.toFixed(3), segments: segs }));
writeFileSync(join(short, 'voice', 'mots.txt'), words.map((m, i) => `${String(i).padStart(4)}  ${m.start.toFixed(2).padStart(7)}  ${m.w}`).join('\n') + '\n');
writeFileSync(join(short, 'voice', 'coupes.txt'), [`Passages du cours gardés (${segs.length}) :`, ...segs.map(sg => Array.isArray(sg) ? `  ${hms(sg[0])} -> ${hms(sg[1])}  (${(sg[1] - sg[0]).toFixed(1)} s)` : `  reprise ${sg.r.split(/[\\/]/).pop()}  (${(sg.b - sg.a).toFixed(1)} s)`), '', ...journal, ...alertes].join('\n') + '\n');
console.log(`${wav}  (${d.toFixed(1)} s, ${words.length} mots, ${segs.length} segments)`);
for (const l of [...journal, ...alertes]) console.log('  ' + l);
