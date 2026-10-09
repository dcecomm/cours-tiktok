#!/usr/bin/env node
// Installe ce qui manque pour que le skill marche sur cet ordinateur (Windows ou Mac).
//
//   node outils/installer.mjs            dit ce qui manque et ce que ça pèse (n'installe rien)
//   node outils/installer.mjs --oui      installe ce qui manque, puis vérifie
//       --nvidia        Windows : prendre la transcription pour carte graphique NVIDIA (640 Mo, beaucoup plus rapide)
//       --sans-banque   ne pas télécharger les vidéos du mode B (371 Mo)
//
// Ce qui est installé reste dans le dossier du skill (bin/, modeles/, banque/, node_modules/) :
// rien n'est ajouté ailleurs sur l'ordinateur, et supprimer le dossier supprime tout.
// Il faut seulement Node 20 ou plus récent (c'est lui qui lance ce fichier).

import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SKILL, ffmpeg, ffprobe, telecharger } from './commun.mjs';

const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';
const args = process.argv.slice(2), oui = args.includes('--oui');
const BIN = join(SKILL, 'bin'), MODELES = join(SKILL, 'modeles');
const marche = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: 'utf8' }); return !r.error && r.status === 0; };
const trouve = (nom) => { const r = spawnSync(WIN ? 'where' : 'which', [nom], { encoding: 'utf8' }); return r.status === 0; };

// Les adresses. whisper.cpp est pris en v1.9.2 : c'est la version avec laquelle le skill a été mis au point.
const FFMPEG_WIN = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
const WHISPER_WIN = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip';
const WHISPER_WIN_NVIDIA = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-cublas-12.4.0-bin-x64.zip';
const MODELE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin';

function dezipper(zip, vers) {
  mkdirSync(vers, { recursive: true });
  // Windows 10 et 11 ont tar, qui sait lire les .zip ; sinon PowerShell.
  if (marche('tar', ['-xf', zip, '-C', vers])) return;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${vers}'`], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`impossible d'ouvrir ${zip} : ${(r.stderr || '').slice(-300)}`);
}
function chercher(dossier, nom) {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory()) { const f = chercher(p, nom); if (f) return f; } else if (e.name.toLowerCase() === nom.toLowerCase()) return p;
  }
  return null;
}
const pct = quoi => t => process.stdout.write(`\r  ${quoi} : ${t}   `);

// ---------- ce qui manque ----------
const aFaire = [];
const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
if (!nodeOk) { console.log(`Node ${process.versions.node} est trop ancien : installer Node 20 ou plus récent (nodejs.org), puis relancer.`); process.exit(1); }

if (!existsSync(join(SKILL, 'node_modules', '@napi-rs', 'canvas')))
  aFaire.push({ quoi: 'le moteur de dessin (npm install)', poids: 40, faire: () => { const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: SKILL, stdio: 'inherit', shell: true }); if (r.status !== 0) throw new Error('npm install a échoué'); } });

if (!(marche(ffmpeg(), ['-version']) && marche(ffprobe(), ['-version']))) {
  if (WIN) aFaire.push({ quoi: 'ffmpeg (le son et la vidéo), depuis gyan.dev', poids: 109, faire: async () => {
    mkdirSync(BIN, { recursive: true });
    const zip = join(BIN, '_ffmpeg.zip'), tmp = join(BIN, '_ffmpeg');
    await telecharger(FFMPEG_WIN, zip, { reprise: true, dire: pct('ffmpeg') }); console.log();
    dezipper(zip, tmp);
    for (const exe of ['ffmpeg.exe', 'ffprobe.exe']) { const f = chercher(tmp, exe); if (!f) throw new Error(`${exe} introuvable dans l'archive`); copyFileSync(f, join(BIN, exe)); }
    rmSync(zip, { force: true }); rmSync(tmp, { recursive: true, force: true });
  } });
  else aFaire.push({ quoi: `ffmpeg : ${MAC ? 'brew install ffmpeg' : 'sudo apt install ffmpeg'}`, poids: 0, manuel: true });
}

const whisperLa = existsSync(join(BIN, WIN ? 'whisper-cli.exe' : 'whisper-cli')) || trouve('whisper-cli') || !!process.env.COURS_WHISPER;
const nvidia = WIN && marche('nvidia-smi', []);
if (!whisperLa) {
  const gpu = args.includes('--nvidia');
  if (WIN) aFaire.push({ quoi: `la transcription (whisper.cpp v1.9.2${gpu ? ', pour carte NVIDIA' : ''}), depuis github.com/ggml-org`, poids: gpu ? 640 : 8, faire: async () => {
    mkdirSync(BIN, { recursive: true });
    const zip = join(BIN, '_whisper.zip'), tmp = join(BIN, '_whisper');
    await telecharger(gpu ? WHISPER_WIN_NVIDIA : WHISPER_WIN, zip, { reprise: true, dire: pct('whisper') }); console.log();
    dezipper(zip, tmp);
    const exe = chercher(tmp, 'whisper-cli.exe'); if (!exe) throw new Error("whisper-cli.exe introuvable dans l'archive");
    const d = join(exe, '..');
    for (const f of readdirSync(d)) if (statSync(join(d, f)).isFile()) copyFileSync(join(d, f), join(BIN, f));     // l'exe et toutes ses .dll
    rmSync(zip, { force: true }); rmSync(tmp, { recursive: true, force: true });
  } });
  else aFaire.push({ quoi: `la transcription : ${MAC ? 'brew install whisper-cpp' : 'compiler whisper.cpp et poser whisper-cli dans bin/'}`, poids: 0, manuel: true });
}

let modeleLa = true; try { (await import('./commun.mjs')).modele(); } catch { modeleLa = false; }
if (!modeleLa) aFaire.push({ quoi: 'le modèle de transcription ggml-large-v3-turbo.bin, depuis huggingface.co', poids: 1549, faire: async () => {
  mkdirSync(MODELES, { recursive: true });
  await telecharger(MODELE, join(MODELES, 'ggml-large-v3-turbo.bin'), { reprise: true, dire: pct('modèle') }); console.log();
} });

let banqueManque = 0, banquePoids = 0;
if (!args.includes('--sans-banque') && existsSync(join(SKILL, 'banque.json'))) {
  const { plans } = JSON.parse((await import('node:fs')).readFileSync(join(SKILL, 'banque.json'), 'utf8'));
  const m = plans.filter(p => !existsSync(join(SKILL, 'banque', p.fichier)));
  banqueManque = m.length; banquePoids = Math.round(m.reduce((s, p) => s + p.poids_mo, 0));
  if (banqueManque) aFaire.push({ quoi: `${banqueManque} vidéos du mode B, depuis videos.pexels.com`, poids: banquePoids, faire: () => { const r = spawnSync(process.execPath, [join(SKILL, 'outils', 'banque.mjs'), 'installer', '--oui'], { stdio: 'inherit' }); if (r.status !== 0) throw new Error('des vidéos manquent encore : relancer node outils/banque.mjs installer --oui'); } });
}

// ---------- dire, puis faire ----------
if (!aFaire.length) { console.log('Rien à installer : tout est là.'); }
else {
  console.log(`À installer dans ${SKILL} :`);
  for (const a of aFaire) console.log(`  - ${a.quoi}${a.poids ? `  (${a.poids} Mo)` : ''}${a.manuel ? '   <- à lancer soi-même dans le terminal' : ''}`);
  console.log(`  Total à télécharger : environ ${aFaire.reduce((s, a) => s + a.poids, 0)} Mo.`);
  if (nvidia && !whisperLa && !args.includes('--nvidia')) console.log(`  Ce PC a une carte NVIDIA : ajouter --nvidia rend la transcription beaucoup plus rapide (640 Mo au lieu de 8).`);
  if (!oui) { console.log(`\nRien n'est installé. Après son accord : node outils/installer.mjs --oui`); process.exit(2); }
  for (const a of aFaire) {
    if (a.manuel) { console.log(`\n>> À faire à la main : ${a.quoi}`); continue; }
    console.log(`\n>> ${a.quoi}`);
    try { await a.faire(); console.log('   fait.'); } catch (e) { console.log(`   ÉCHEC : ${e.message}`); }
  }
}

console.log('\n---------- vérification ----------');
const v = spawnSync(process.execPath, [join(SKILL, 'outils', 'verifier.mjs')], { stdio: 'inherit' });
if (v.status === 0) console.log(`\nDernière étape, l'essai complet (2 minutes) : node outils/verifier.mjs --essai`);
process.exit(v.status ?? 1);
