#!/usr/bin/env node
// La banque de vrais plans du mode B. Le catalogue est dans banque.json (à la racine du skill),
// les vidéos dans banque/ (elles ne sont pas dans le dépôt : trop lourdes).
//
//   node outils/banque.mjs                     ce qu'il y a, ce qui manque, le poids
//   node outils/banque.mjs installer           dit quoi télécharger et combien ça pèse (ne télécharge rien)
//   node outils/banque.mjs installer --oui     télécharge les plans du catalogue qui manquent
//   node outils/banque.mjs cherche brume doute les plans dont la description contient un de ces mots
//   node outils/banque.mjs planche <nom>       une image par seconde -> banque/_planches/<nom>.png (pour juger un plan)
//   node outils/banque.mjs ajouter <nom> <adresse du .mp4> --page <page d'origine> --voit "..." --pour "..." [--reglages "..."] [--oui]
//       sans --oui : dit seulement le poids. Avec --oui : télécharge, mesure, inscrit au catalogue, fait la planche.
//   node outils/banque.mjs inscrire <nom> --page <page d'origine> --voit "..." --pour "..."
//       pour une vidéo qu'elle a téléchargée elle-même et posée dans banque/<nom>.mp4
//
// Règle : un téléchargement se demande avant (nom, source, poids). D'où le --oui, à ne mettre qu'après son accord.

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { run, ffmpeg, ffprobe, SKILL, opt, telecharger, poids } from './commun.mjs';

const CATALOGUE = join(SKILL, 'banque.json'), DOSSIER = join(SKILL, 'banque');
const lire = () => JSON.parse(readFileSync(CATALOGUE, 'utf8'));
const mo = o => (o / 1048576).toFixed(1).replace('.', ',') + ' Mo';
const la = p => existsSync(join(DOSSIER, p.fichier)) && statSync(join(DOSSIER, p.fichier)).size > 100000;

function mesurer(fichier) {
  const j = JSON.parse(run(ffprobe(), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', fichier]).stdout);
  return { duree: +(+j.format.duration).toFixed(1), taille: `${j.streams[0].width}x${j.streams[0].height}` };
}
function planche(nom) {
  const p = lire().plans.find(x => x.nom === nom); if (!p) throw new Error(`« ${nom} » n'est pas au catalogue.`);
  const f = join(DOSSIER, p.fichier); if (!existsSync(f)) throw new Error(`${p.fichier} n'est pas dans banque/ (node outils/banque.mjs installer).`);
  const d = mesurer(f).duree, ips = Math.min(1, 40 / d), n = Math.max(1, Math.ceil(d * ips)), cols = Math.min(10, n);
  mkdirSync(join(DOSSIER, '_planches'), { recursive: true });
  const out = join(DOSSIER, '_planches', nom + '.png');
  run(ffmpeg(), ['-v', 'error', '-y', '-i', f, '-vf', `fps=${ips.toFixed(4)},scale=216:384:force_original_aspect_ratio=increase,crop=216:384,tile=${cols}x${Math.ceil(n / cols)}`, '-frames:v', '1', out]);
  console.log(`${out}\n  une image ${ips === 1 ? 'par seconde' : `toutes les ${(1 / ips).toFixed(1)} s`}, ${cols} par ligne. La lire : un visage, un véhicule, un texte, un objet au bord du cadre ?`);
}

const args = process.argv.slice(2), cmd = args[0] || 'liste', oui = args.includes('--oui');
const cat = existsSync(CATALOGUE) ? lire() : { plans: [] };

if (cmd === 'liste') {
  const manque = cat.plans.filter(p => !la(p));
  for (const p of cat.plans) console.log(`${la(p) ? '  ' : '✗ '}${p.nom.padEnd(24)} ${String(p.duree).padStart(5)} s  ${p.voit}${p.reglages ? `\n${' '.repeat(34)}! ${p.reglages}` : ''}`);
  console.log(`\n${cat.plans.length} plans au catalogue, ${cat.plans.length - manque.length} sur l'ordinateur${manque.length ? `, ${manque.length} à télécharger (${mo(manque.reduce((s, p) => s + p.poids_mo * 1048576, 0))}) : node outils/banque.mjs installer` : '.'}`);
} else if (cmd === 'cherche') {
  const mots = args.slice(1).filter(a => !a.startsWith('--')).map(m => m.toLowerCase());
  for (const p of cat.plans.filter(p => mots.some(m => `${p.nom} ${p.voit} ${p.pour}`.toLowerCase().includes(m))))
    console.log(`${p.nom}  (${p.duree} s)\n   on voit : ${p.voit}\n   pour    : ${p.pour}${p.reglages ? `\n   réglage : ${p.reglages}` : ''}`);
} else if (cmd === 'planche') {
  planche(args[1]);
} else if (cmd === 'installer') {
  const seul = opt(args, 'seulement'), manque = cat.plans.filter(p => !la(p) && p.source && (!seul || seul === true || String(seul).split(',').includes(p.nom)));
  if (!manque.length) { console.log(`La banque est complète : ${cat.plans.length} plans.`); process.exit(0); }
  const total = manque.reduce((s, p) => s + p.poids_mo * 1048576, 0);
  console.log(`${manque.length} vidéo${manque.length > 1 ? 's' : ''} à télécharger depuis Pexels (videos.pexels.com), ${mo(total)} en tout, dans ${DOSSIER} :`);
  console.log(manque.map(p => `  ${p.fichier} (${String(p.poids_mo).replace('.', ',')} Mo)`).join('\n'));
  if (!oui) { console.log(`\nRien n'est téléchargé. Après son accord : node outils/banque.mjs installer --oui`); process.exit(2); }
  mkdirSync(DOSSIER, { recursive: true });
  let rate = 0;
  for (const p of manque) {
    try { const o = await telecharger(p.source, join(DOSSIER, p.fichier)); console.log(`  OK      ${p.fichier}  ${mo(o)}`); }
    catch (e) { rate++; console.log(`  ÉCHEC   ${p.fichier} : ${e.message}`); }
  }
  const reste = cat.plans.filter(p => !la(p)).length;
  console.log(rate ? `\n${rate} vidéo(s) non téléchargée(s) : relancer la commande. Si une adresse ne répond plus, chercher un plan de rechange (references/banque.md).`
    : reste ? `\nTéléchargé. Il manque encore ${reste} vidéo(s) du catalogue.` : `\nLa banque est complète : ${cat.plans.length} plans.`);
  process.exit(rate ? 1 : 0);
} else if (cmd === 'ajouter') {
  const [nom, url] = args.slice(1).filter(a => !a.startsWith('--') && a !== opt(args, 'page') && a !== opt(args, 'voit') && a !== opt(args, 'pour') && a !== opt(args, 'reglages'));
  if (!nom || !/^https?:\/\//.test(url || '')) { console.error('usage : node outils/banque.mjs ajouter <nom> <adresse du .mp4> --page <page> --voit "..." --pour "..." [--oui]'); process.exit(1); }
  if (cat.plans.some(p => p.nom === nom)) { console.error(`« ${nom} » existe déjà au catalogue. Prendre un autre nom.`); process.exit(1); }
  const o = await poids(url);
  console.log(`${nom}.mp4, source ${new URL(url).host}, ${o ? mo(o) : 'poids inconnu'}`);
  if (!oui) { console.log(`Rien n'est téléchargé. Après son accord, la même commande avec --oui.`); process.exit(2); }
  mkdirSync(DOSSIER, { recursive: true });
  const fichier = nom + '.mp4', taille = await telecharger(url, join(DOSSIER, fichier));
  const p = { nom, fichier, voit: String(opt(args, 'voit', 'à décrire après avoir lu la planche')), pour: String(opt(args, 'pour', '')), ...(opt(args, 'reglages') ? { reglages: String(opt(args, 'reglages')) } : {}),
    ...mesurer(join(DOSSIER, fichier)), poids_mo: +(taille / 1048576).toFixed(1), source: url, page: String(opt(args, 'page', '')) };
  cat.plans.push(p); writeFileSync(CATALOGUE, JSON.stringify(cat, null, 1) + '\n');
  console.log(`Inscrit au catalogue : ${nom} (${p.duree} s, ${p.taille}).`);
  planche(nom);
  console.log(`Corriger « voit », « pour » et « reglages » dans banque.json d'après ce que la planche montre.`);
} else if (cmd === 'inscrire') {
  const nom = args[1], fichier = nom + '.mp4';
  if (!nom || !existsSync(join(DOSSIER, fichier))) { console.error(`Poser d'abord la vidéo dans ${join(DOSSIER, (nom || '<nom>') + '.mp4')}.`); process.exit(1); }
  if (cat.plans.some(p => p.nom === nom)) { console.error(`« ${nom} » existe déjà au catalogue.`); process.exit(1); }
  const p = { nom, fichier, voit: String(opt(args, 'voit', 'à décrire après avoir lu la planche')), pour: String(opt(args, 'pour', '')), ...(opt(args, 'reglages') ? { reglages: String(opt(args, 'reglages')) } : {}),
    ...mesurer(join(DOSSIER, fichier)), poids_mo: +(statSync(join(DOSSIER, fichier)).size / 1048576).toFixed(1), source: '', page: String(opt(args, 'page', '')) };
  cat.plans.push(p); writeFileSync(CATALOGUE, JSON.stringify(cat, null, 1) + '\n');
  console.log(`Inscrit au catalogue : ${nom} (${p.duree} s, ${p.taille}). Sans adresse de téléchargement : cette vidéo ne sera pas réinstallée toute seule sur un autre ordinateur.`);
  planche(nom);
} else {
  console.error(`Commande inconnue : ${cmd}. Voir le haut de outils/banque.mjs.`); process.exit(1);
}
