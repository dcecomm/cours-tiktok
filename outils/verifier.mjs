#!/usr/bin/env node
// Vérifie que l'ordinateur a tout ce qu'il faut. À lancer après l'installation, et quand quelque chose ne marche pas.
//   node outils/verifier.mjs            les programmes et les fichiers sont-ils là ?
//   node outils/verifier.mjs --essai    en plus : fabrique un vrai petit short de bout en bout (2 minutes)
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { SKILL, ffmpeg, ffprobe } from './commun.mjs';

let ok = true;
const dire = (bon, quoi, aide = '') => { if (!bon) ok = false; console.log(`${bon ? 'OK    ' : 'MANQUE'}  ${quoi}${bon || !aide ? '' : `\n          -> ${aide}`}`); };
const marche = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); return !r.error && r.status === 0; };

dire(Number(process.versions.node.split('.')[0]) >= 20, `Node ${process.versions.node}`, 'installer Node 20 ou plus récent (nodejs.org)');
dire(marche(ffmpeg(), ['-version']) && marche(ffprobe(), ['-version']), 'ffmpeg et ffprobe', 'node outils/installer.mjs');
dire(existsSync(join(SKILL, 'node_modules', '@napi-rs', 'canvas')), 'moteur de dessin (@napi-rs/canvas)', 'node outils/installer.mjs (ou npm install dans le dossier du skill)');
try { const { whisper } = await import('./commun.mjs'); const w = whisper(); dire(spawnSync(w, ['--help'], { encoding: 'utf8' }).status !== null, `transcription : ${w}`, 'le programme ne se lance pas : node outils/installer.mjs'); } catch (e) { dire(false, 'transcription (whisper-cli)', 'node outils/installer.mjs'); }
try { const { modele } = await import('./commun.mjs'); dire(true, `modèle : ${modele()}`); } catch (e) { dire(false, 'modèle ggml-large-v3-turbo.bin', 'node outils/installer.mjs'); }
for (const son of ['mer', 'pluie', 'vent']) dire(existsSync(join(SKILL, 'assets', 'ambiance', `${son}.m4a`)), `fond sonore assets/ambiance/${son}.m4a`, 'node outils/ambiance.mjs');
const serif = ['/System/Library/Fonts/Supplemental/Georgia.ttf', 'C:/Windows/Fonts/georgia.ttf', join(SKILL, 'assets', 'fonts', 'Serif-Regular.ttf')].some(f => existsSync(f));
dire(serif, 'police des sous-titres (Georgia)', 'poser une police dans assets/fonts/Serif-Regular.ttf et Serif-Italic.ttf');
let plans = [];
if (existsSync(join(SKILL, 'banque.json'))) {
  plans = JSON.parse(readFileSync(join(SKILL, 'banque.json'), 'utf8')).plans;
  const la = plans.filter(p => existsSync(join(SKILL, 'banque', p.fichier)));
  dire(la.length === plans.length, `banque du mode B : ${la.length} vidéos sur ${plans.length}`, 'node outils/banque.mjs installer   (sans elles, seul le mode dessiné marche)');
  plans = la;
}
console.log(ok ? '\nTout est prêt.' : '\nIl manque des choses : voir les flèches.');

if (process.argv.includes('--essai')) {
  // Un vrai petit short, fabriqué avec les mêmes outils que les vrais, dans un dossier temporaire.
  console.log('\n---------- essai complet ----------');
  const T = join(tmpdir(), 'cours-tiktok-essai'), C = join(T, 'cours'), B = join(C, 'mode-b', '01-essai'), A = join(C, 'shorts', '01-essai');
  rmSync(T, { recursive: true, force: true }); mkdirSync(B, { recursive: true }); mkdirSync(A, { recursive: true });
  const outil = (nom, ...a) => spawnSync(process.execPath, [join(SKILL, nom), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
  let bon = true;
  const etape = (quoi, r, test = () => true) => {
    let res = false, detail = '';
    try { res = r.status === 0 && test(); } catch (e) { detail = e.message; }
    if (!res) { bon = false; detail = detail || `${r.stderr || ''}${r.stdout || ''}`.trim().split('\n').slice(-6).join('\n          '); }
    console.log(`${res ? 'OK    ' : 'ÉCHEC '}  ${quoi}${res ? '' : `\n          ${detail}`}`);
    return res;
  };
  const texte = "Bonjour. Ceci est un essai. Si vous entendez cette voix et lisez ces mots, tout fonctionne.";
  etape('1. transcrire', outil('outils/transcrire.mjs', join(SKILL, 'exemples', 'essai', 'essai.m4a'), C), () => /essai/i.test(readFileSync(join(C, 'transcript.txt'), 'utf8')));
  writeFileSync(join(B, 'coupe.json'), JSON.stringify({ segments: [[0, 30]], hesitations: false }));
  writeFileSync(join(B, 'texte.txt'), texte + '\n');
  let mots = [];
  etape('2. couper et nettoyer la voix, caler les mots', outil('outils/extrait.mjs', C, B), () => { mots = JSON.parse(readFileSync(join(B, 'voice', 'words.json'), 'utf8')).words; return mots.length === texte.split(/\s+/).length && mots.every((m, i) => i === 0 || m.start >= mots[i - 1].start); });
  const deux = ['lever-soleil-mer', 'bougie-noir'].map(n => plans.find(p => p.nom === n)).filter(Boolean);
  writeFileSync(join(B, 'plans.json'), JSON.stringify({ titre: ['Un essai'], ambiance: [{ mot: 0, son: 'mer' }, { mot: 6, son: 'vent' }],
    plans: [{ mot: 0, fichier: deux[0]?.fichier || 'absent-1.mp4', note: 'premier plan' }, { mot: 6, fichier: deux[1]?.fichier || 'absent-2.mp4', note: 'second plan' }] }));
  writeFileSync(join(B, 'fiche.json'), JSON.stringify({ legende: 'Un essai.', coupes: 'Rien.', aVerifier: 'Rien : c\'est un essai.' }));
  etape(`3. l'image en vraies vidéos (mode B${deux.length === 2 ? '' : ', en cartons : la banque manque'})`, outil('engine/render-b.mjs', B), () => existsSync(join(B, 'out', 'video.mp4')));
  etape('4. monter : voix, fond sonore, volume', outil('outils/montage.mjs', B), () => {
    const j = JSON.parse(spawnSync(ffprobe(), ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', join(B, 'out', 'short.mp4')], { encoding: 'utf8' }).stdout).streams;
    return j.some(s => s.codec_name === 'h264' && s.width === 1080 && s.height === 1920) && j.some(s => s.codec_name === 'aac');
  });
  const c = outil('outils/controle.mjs', B);
  etape('5. contrôler par la mesure', c, () => { const m = (c.stdout.match(/mots retrouvés (\d+) %/) || [])[1]; if (!(+m >= 80)) throw new Error(c.stdout.trim()); return true; });
  // le mode dessiné : même voix, une planche suffit à prouver que le dessin et les polices marchent
  try { cpSync(join(B, 'voice'), join(A, 'voice'), { recursive: true }); } catch {}
  writeFileSync(join(A, 'scenes.mjs'), "export default ({ E }) => ({ titre: ['Un essai'], scenes: E.tableaux.plans([[0, 'plage', { pose: 'doua', eyes: 'closed', mouth: 'smile' }], [6, 'ciel', {}]]) });\n");
  etape("6. l'image dessinée (mode A)", outil('engine/render.mjs', A, '--planche', '3'), () => existsSync(join(A, 'out', 'planche.png')));
  etape('7. livrer', outil('outils/livrer.mjs', C, join(T, 'livraison'), '--mode-b'), () => readdirSync(join(T, 'livraison')).some(f => f.endsWith('.mp4')));
  console.log(bon ? `\nEssai réussi. Le short d'essai, à regarder : ${join(T, 'livraison')}` : `\nL'essai a échoué à une étape : lire le message juste au-dessus, corriger, relancer. Dossier de l'essai : ${T}`);
  ok = ok && bon;
}
process.exit(ok ? 0 : 1);
