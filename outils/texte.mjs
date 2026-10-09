#!/usr/bin/env node
// Affiche les sous-titres d'un short tels qu'ils seront à l'écran (corrections et ajouts compris), pour les relire.
//   node outils/texte.mjs <dossier du short>                      les sous-titres, avec leur seconde
//   node outils/texte.mjs <dossier du short> --mots               tous les mots avec leur numéro
//   node outils/texte.mjs <dossier du short> --cherche épreuv     numéro et seconde des mots qui commencent ainsi (pour caler un plan)
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SKILL } from './commun.mjs';
import { corriger, construireCues } from '../engine/texte.js';

const args = process.argv.slice(2), dir = resolve(args[0]);
const lire = (f, def) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def;
const voice = lire(join(dir, 'voice', 'words.json'));
const corr = lire(join(dir, 'corrections.json'), {}), parMot = Object.fromEntries(Object.entries(corr).filter(([k]) => !/^\d+$/.test(k)));
const mots = corriger(voice.words, { ...lire(join(SKILL, 'glossaire.json'), {}), ...parMot }, corr);
if (args.includes('--cherche')) {   // numéros des mots qui commencent par chaque racine : --cherche épreuv facilit
  const n = x => x.toLowerCase().normalize('NFD').replace(/[^a-z0-9']/g, '');
  for (const r of args.slice(args.indexOf('--cherche') + 1)) console.log(`${r} : ${mots.map((m, i) => n(m.w).startsWith(n(r)) ? `${i}@${m.start.toFixed(1)}` : '').filter(Boolean).join(' ')}`);
  process.exit(0);
}
if (args.includes('--mots')) { console.log(mots.map((m, i) => `${i}:${m.aff}`).join(' ')); process.exit(0); }
for (const a of lire(join(dir, 'ajouts.json'), [])) mots.push({ w: a.w, aff: a.w, start: a.start, end: a.end });
if (existsSync(join(dir, 'ajouts.json'))) mots.sort((x, y) => x.start - y.start);
console.log(construireCues(mots).map(c => `${c.t0.toFixed(1)}|${c.texte.replace(' / ', ' ')}`).join('\n'));
console.log(`(durée ${voice.duration} s)`);
