#!/usr/bin/env node
// Transcrit une rediffusion de cours, en local et gratuitement (whisper.cpp).
//
//   node outils/transcrire.mjs <vidéo ou audio du cours> <dossier du cours> [--pas 600] [--precis]
//
// Le cours est découpé en morceaux d'environ 10 minutes, coupés dans un silence. Chaque morceau
// fini est gardé : si l'ordinateur s'arrête ou si on ferme la fenêtre, relancer la même commande
// reprend là où ça s'était arrêté.
// Sorties : <dossier>/audio16k.wav, <dossier>/transcript.json, <dossier>/transcript.txt

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run, ffmpeg, whisper, modele, duree, silences, hms, opt } from './commun.mjs';

const args = process.argv.slice(2);
if (args.length < 2) { console.error('usage : node outils/transcrire.mjs <vidéo du cours> <dossier du cours>'); process.exit(1); }
const source = resolve(args[0]), dir = resolve(args[1]);
const pas = Number(opt(args, 'pas', 600));
const amorce = opt(args, 'amorce', "Cours de sciences islamiques, en français, avec des mots arabes : Allah, le Prophète, Coran, sourate, verset, hadith, sunna, tawhid, iman, salat, dou'a, sabr, tawakkul, dhikr, tajwid, Ramadan.");
mkdirSync(join(dir, 'transcript'), { recursive: true });

const wav = join(dir, 'audio16k.wav');
if (!existsSync(wav)) {
  console.log('Extraction du son…');
  run(ffmpeg(), ['-v', 'error', '-y', '-i', source, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
}
writeFileSync(join(dir, 'source.json'), JSON.stringify({ source }, null, 2));
const total = duree(wav);

// points de coupe : le silence le plus proche de chaque multiple de `pas`
const planFile = join(dir, 'transcript', 'plan.json');
let coupes;
if (existsSync(planFile)) coupes = JSON.parse(readFileSync(planFile, 'utf8'));
else {
  console.log('Recherche des silences…');
  const sil = silences(wav).map(([a, b]) => (a + b) / 2);
  coupes = [0];
  for (let t = pas; t < total - pas * 0.3; t += pas) {
    const proche = sil.filter(s => Math.abs(s - t) < pas * 0.25).sort((a, b) => Math.abs(a - t) - Math.abs(b - t))[0];
    coupes.push(+(proche ?? t).toFixed(2));
  }
  coupes.push(+total.toFixed(2));
  writeFileSync(planFile, JSON.stringify(coupes));
}

const W = whisper(), M = modele();
const n = coupes.length - 1, t0 = Date.now();
for (let i = 0; i < n; i++) {
  const base = join(dir, 'transcript', `p_${String(i).padStart(3, '0')}`);
  if (existsSync(base + '.json')) continue;
  const a = coupes[i], b = coupes[i + 1];
  process.stdout.write(`Morceau ${i + 1}/${n}  ${hms(a)} -> ${hms(b)} … `);
  const d = Date.now();
  // décodage rapide par défaut (les extraits retenus sont retranscrits ensuite avec précision)
  const vite = opt(args, 'precis') ? [] : ['-bs', '1', '-bo', '1'];
  run(W, ['-m', M, '-l', 'fr', '-t', '8', '-f', wav, '-ot', String(Math.round(a * 1000)), '-d', String(Math.round((b - a) * 1000)),
    '-oj', '-of', base + '.tmp', '-np', '-mc', '0', '--prompt', amorce, ...vite]);
  const j = JSON.parse(readFileSync(base + '.tmp.json', 'utf8'));
  writeFileSync(base + '.json', JSON.stringify(j.transcription.map(s => ({ t0: s.offsets.from / 1000, t1: s.offsets.to / 1000, text: s.text.trim() }))));
  console.log(`${((Date.now() - d) / 1000).toFixed(0)} s`);
}

// fusion : un fichier complet, et un texte lisible (un paragraphe par respiration)
const segs = [];
for (let i = 0; i < n; i++) segs.push(...JSON.parse(readFileSync(join(dir, 'transcript', `p_${String(i).padStart(3, '0')}.json`), 'utf8')));
const propres = segs.filter((s, i) => s.text && !(i > 2 && s.text === segs[i - 1].text && s.text === segs[i - 2].text));   // boucles de répétition
writeFileSync(join(dir, 'transcript.json'), JSON.stringify(propres));
const lignes = []; let cur = null;
for (const s of propres) {
  if (cur && s.t0 - cur.t1 < 1.6 && cur.text.length < 520) { cur.text += ' ' + s.text; cur.t1 = s.t1; }
  else { if (cur) lignes.push(cur); cur = { ...s }; }
}
if (cur) lignes.push(cur);
writeFileSync(join(dir, 'transcript.txt'), lignes.map(l => `[${hms(l.t0)}] ${l.text}`).join('\n') + '\n');
console.log(`Transcription complète : ${join(dir, 'transcript.txt')}  (${hms(total)} de cours, ${((Date.now() - t0) / 60000).toFixed(1)} min de calcul)`);
