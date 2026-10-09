#!/usr/bin/env node
// Range les shorts finis dans un dossier de livraison, avec pour chacun une fiche à relire avant de publier.
//   node outils/livrer.mjs <dossier du cours> <dossier de livraison> [--mode-b]
//   --mode-b : livre les shorts de <cours>/mode-b (vraies vidéos) ; la fiche liste alors chaque plan et sa page Pexels.
// Pour chaque short monté (out/short.mp4) : « NN - Titre.mp4 » et « NN - Titre.txt »
// (titre, légende proposée, hashtags, minutes du cours, coupes faites, texte des sous-titres).

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { hms } from './commun.mjs';

const modeB = process.argv.includes('--mode-b'), BASE = modeB ? 'mode-b' : 'shorts';
const [cours, sortie] = process.argv.slice(2).filter(a => !a.startsWith('--')).map(p => resolve(p));
const lire = (f, def) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def;
mkdirSync(sortie, { recursive: true });
const recap = [];
for (const d of readdirSync(join(cours, BASE)).sort()) {
  const dir = join(cours, BASE, d), mp4 = join(dir, 'out', 'short.mp4');
  if (!existsSync(mp4)) continue;
  const tl = lire(join(dir, 'out', 'timeline.json'), {}), fiche = lire(join(dir, 'fiche.json'), {}), voix = lire(join(dir, 'voice', 'words.json'), {});
  const titre = [].concat(tl.titre || d).join(' ').replace(/\s+/g, ' ').trim();
  const nom = `${d.slice(0, 2)} - ${titre.replace(/[?:"*<>|/\\]/g, '').replace(/\s+/g, ' ').trim()}${modeB ? ' (mode B)' : ''}`;
  copyFileSync(mp4, join(sortie, nom + '.mp4'));
  const segs = (voix.segments || []).filter(Array.isArray), coupes = existsSync(join(dir, 'voice', 'coupes.txt')) ? readFileSync(join(dir, 'voice', 'coupes.txt'), 'utf8').split('\n').filter(l => /coupe demandée|hésitation retirée|silence raccourci/.test(l)) : [];
  const texte = existsSync(join(dir, 'texte.txt')) ? readFileSync(join(dir, 'texte.txt'), 'utf8').replace(/\{\s*[\d.]+\s*-\s*[\d.]+\s*:\s*([^}]*)\}/g, '$1').replace(/[ \t]+/g, ' ').trim() : '';
  // les raccords : l'endroit de la vidéo où deux morceaux du cours se rejoignent, à écouter en premier
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  let cumul = 0; const raccords = segs.slice(0, -1).map(([a, b]) => mmss(cumul += b - a));
  // mode B : la liste des plans, avec le moment où chacun entre et sa page d'origine
  const spec = lire(join(dir, 'plans.json'), null), mots = voix.words || [];
  const plansB = spec && Array.isArray(spec.plans) ? spec.plans.flatMap(p => { const w = typeof p.mot === 'number' ? mots[p.mot] : null; return [`${w ? mmss(w.start ?? w.s ?? 0) : '    '}  ${p.note || p.fichier}`, ...(p.page ? [`      ${p.page}`] : [])]; }) : [];
  writeFileSync(join(sortie, nom + '.txt'), [
    `TITRE À L'ÉCRAN`, titre, '',
    `LÉGENDE PROPOSÉE (à adapter, ce sont ses idées avec ses mots)`, fiche.legende || '', '',
    `HASHTAGS`, fiche.hashtags || '#islam #rappel #coran #rappelislamique #foi #sérénité', '',
    `DURÉE`, `${Math.round(tl.duration || voix.duration || 0)} secondes`, '',
    `PASSAGE DU COURS`, segs.length ? `de ${hms(segs[0][0])} à ${hms(segs[segs.length - 1][1])}` : '', '',
    `CE QUI A ÉTÉ COUPÉ`, `${coupes.filter(l => /coupe demandée/.test(l)).length} coupe(s) choisie(s), ${coupes.filter(l => /hésitation/.test(l)).length} hésitation(s) retirée(s), ${coupes.filter(l => /silence/.test(l)).length} silence(s) raccourci(s).`,
    ...(fiche.coupes ? [fiche.coupes] : []),
    ...(raccords.length ? [`Raccords à écouter en premier (minute:seconde dans la vidéo) : ${[...new Set(raccords)].join(', ')}.`] : []), '',
    ...(plansB.length ? [`LES PLANS (vidéos gratuites de la banque Pexels, aucun visage net)`, ...plansB, ''] : []),
    ...(fiche.aVerifier || plansB.length ? [`À VÉRIFIER AVANT DE PUBLIER`, ...(fiche.aVerifier ? [fiche.aVerifier] : []), ...(plansB.length ? [`Mode B : regarder chaque plan. Les femmes voilées sont montrées de dos ou en ombre : à elle de dire si chaque image lui convient.`] : []), ''] : []),
    `TEXTE DES SOUS-TITRES (à relire mot à mot)`, texte, '',
  ].join('\n'));
  recap.push(`${nom}   (${Math.round(tl.duration || 0)} s)`);
}
writeFileSync(join(sortie, 'LISEZ-MOI.txt'), [
  'SHORTS TIRÉS DU COURS', '',
  ...recap, '',
  'Avant de publier une vidéo :',
  '1. L\'écouter en entier : uniquement sa voix, aucune élève, aucun prénom.',
  '2. Relire les sous-titres (fichier .txt du même nom), surtout les mots arabes et les versets.',
  '3. Vérifier que la coupe ne change pas le sens de ce qu\'elle a dit dans le cours.',
  'Si un mot est à corriger, le dire à Claude : il corrige le texte et refait la vidéo.', '',
].join('\n'));
console.log(recap.join('\n'));
