#!/usr/bin/env node
// Mode B : l'image vient de vrais plans vidéo (une banque de b-rolls), pas du dessin.
// Le titre et les sous-titres restent ceux du mode A, calés sur les mêmes mots.
//
//   node engine/render-b.mjs <dossier-short>            -> <short>/out/video.mp4 (1080x1920, muet)
//   node engine/render-b.mjs <dossier-short> --draft    brouillon 540x960, 15 i/s
//   node engine/render-b.mjs <dossier-short> --planche 4   une image toutes les 4 s (out/planche.png), à lire avant de livrer
//
// Le short contient plans.json :
//   { "titre": ["Pourquoi moi ?"],
//     "ambiance": [{ "mot": 0, "son": "pluie" }, { "mot": 59, "son": "mer" }],
//     "plans": [ { "mot": 0, "fichier": "pluie-vitre.mp4", "note": "pluie sur une vitre, la nuit",
//                  "debut": 1.5, "vitesse": 1, "cadre": 0.5, "zoom": [1.0, 1.08] }, ... ] }
//   mot     : numéro (ou début) du mot où le plan entre, comme en mode A. Le premier plan est à 0.
//   fichier : nom du plan dans la banque (<short>/banque, <cours>/banque ou <skill>/banque).
//             Si le fichier n'est pas encore là, le plan est remplacé par un carton qui dit ce qu'il faut : c'est la maquette.
//   debut   : seconde du plan où l'on commence ; vitesse : 1, ou 0.5 pour un ralenti ; cadre : 0 gauche .. 1 droite
//             (pour recadrer un plan horizontal) ; zoom : avancée lente [départ, arrivée].

import './node-setup.js';
import { createCanvas } from '@napi-rs/canvas';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = resolve(args[0] || '.');
const opt = (name, def) => { const i = args.indexOf('--' + name); if (i < 0) return def; const v = args[i + 1]; return v && !v.startsWith('--') ? v : true; };
const lire = (f, def) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def;
const bin = n => [join(here, '..', 'bin', n + '.exe'), join(here, '..', 'bin', n)].find(f => existsSync(f)) || n;
const FFMPEG = bin('ffmpeg'), FFPROBE = bin('ffprobe');

const voice = lire(join(dir, 'voice', 'words.json'));
const spec = lire(join(dir, 'plans.json'));
if (!voice || !spec) { console.error(`Il faut ${join(dir, 'voice', 'words.json')} et ${join(dir, 'plans.json')}.`); process.exit(1); }
mkdirSync(join(dir, 'out'), { recursive: true });

// ---------- quand chaque plan entre ----------
const X = spec.fondu ?? 0.8, LEAD = spec.avance ?? 0.5, D = voice.duration + (spec.queue ?? 1.6);
let depuis = 0;
const mot = cue => { const i = E.findWord(voice.words, cue, typeof cue === 'number' ? 0 : depuis); depuis = i + 1; return i; };
const plans = spec.plans.map((p, k) => { const i = mot(p.mot ?? 0); return { ...p, k, start: k === 0 ? 0 : Math.max(0, voice.words[i].start - LEAD) }; });
plans.forEach((p, k) => { p.fin = k + 1 < plans.length ? plans[k + 1].start : D; p.len = p.fin - p.start + (k + 1 < plans.length ? X : 0); if (p.fin - p.start < 1.2) throw new Error(`Plan ${k + 1} trop court (${(p.fin - p.start).toFixed(1)} s) : deux plans presque sur le même mot ?`); });
depuis = 0;
const ambiance = (Array.isArray(spec.ambiance) ? spec.ambiance : [{ mot: 0, son: spec.ambiance || 'mer' }]).map((a, j) => ({ son: a.son, t: j === 0 ? 0 : Math.max(0, voice.words[mot(a.mot)].start - 1) }));

// ---------- où sont les plans ----------
const BANQUES = [join(dir, 'banque'), join(dir, '..', '..', 'banque'), join(here, '..', 'banque')];
for (const p of plans) {
  p.chemin = p.fichier ? BANQUES.map(b => join(b, p.fichier)).find(f => existsSync(f)) : null;
  if (p.chemin) {
    const dur = parseFloat(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p.chemin], { encoding: 'utf8' }).stdout) || 0;
    const fr = (spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', p.chemin], { encoding: 'utf8' }).stdout || '30/1').trim().split('/');
    p.ips = (+fr[0] || 30) / (+fr[1] || 1);
    const dispo = dur - (p.debut || 0);
    p.v = p.vitesse || 1;
    if (dispo < p.len * p.v) { p.v = Math.max(0.4, dispo / p.len); p.avis = `plan de ${dispo.toFixed(1)} s pour ${p.len.toFixed(1)} s à l'écran : ralenti à ${Math.round(p.v * 100)} %`; }
  }
}
const manquants = plans.filter(p => !p.chemin);

// ---------- le texte, posé par-dessus ----------
const corr = lire(join(dir, 'corrections.json'), {});
const mots = E.corriger(voice.words, lire(join(here, '..', 'glossaire.json'), {}), corr);
const cues = E.construireCues(mots, spec.sousTitres || {});
const planAt = t => { let k = 0; for (const p of plans) if (t >= p.start) k = p.k; return plans[k]; };

function calque(g, t, w) {
  const k = w / 1080;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, w * 16 / 9); g.setTransform(k, 0, 0, k, 0, 0);
  const p = planAt(t);
  if (!p.chemin) {                                    // la maquette : un carton qui dit quel plan viendra ici
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#f6cf8a'; g.font = '46px "Cours Serif"'; g.fillText(`PLAN ${p.k + 1}`, 540, 1040);
    g.fillStyle = '#fff6e6'; g.font = '50px "Cours Serif Italic"';
    const lignes = []; let l = '';
    for (const m of String(p.note || p.fichier || 'plan à choisir').split(' ')) { if ((l + ' ' + m).length > 30) { lignes.push(l); l = m; } else l = l ? l + ' ' + m : m; }
    lignes.push(l); lignes.forEach((x, i) => g.fillText(x, 540, 1130 + i * 66));
    g.restore();
  }
  // le haut de l'image est assombri : c'est la place du titre et des sous-titres
  const gr = g.createLinearGradient(0, 0, 0, 760);
  gr.addColorStop(0, 'rgba(18,12,34,0.62)'); gr.addColorStop(0.7, 'rgba(18,12,34,0.34)'); gr.addColorStop(1, 'rgba(18,12,34,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 1080, 760);
  E.dessinerTitre(g, spec.titre, t, spec.titreStyle || {});
  if (spec.sousTitres !== false) E.dessinerSousTitres(g, cues, t, spec.sousTitres || {});
  if (p.legende) E.legende(g, p.legende, Math.min(E.prog(t, p.start + 0.4, p.start + 1.2), 1 - E.prog(t, p.fin - 0.6, p.fin)), p.legendeY ?? 650);
  const noir = E.prog(t, D - 0.9, D - 0.05);
  if (noir > 0) { g.globalAlpha = noir; g.fillStyle = '#1c1630'; g.fillRect(0, 0, 1080, 1920); g.globalAlpha = 1; }
}

// ---------- la chaîne ffmpeg : chaque plan recadré, ralenti, étalonné, puis fondu vers le suivant ----------
const draft = !!opt('draft'), fps = draft ? 15 : 30, ow = draft ? 540 : 1080, oh = draft ? 960 : 1920;
// même lumière sur tous les plans : chaud, un peu moins saturé, bords assombris
const ETALON = spec.etalonnage === false ? 'null' : (spec.etalonnage || 'eq=contrast=1.05:saturation=0.9:brightness=-0.01,colorbalance=rs=0.05:bs=-0.06:rm=0.03:bm=-0.03,vignette=angle=PI/4.5');
function chaine(sortie, fin = D) {
  const entrees = [], f = [];
  plans.forEach((p, i) => {
    const L = p.len.toFixed(3), [z0, z1] = p.zoom || (i % 2 ? [1.07, 1.0] : [1.0, 1.07]);
    if (p.chemin) entrees.push('-ss', String(p.debut || 0), '-t', (p.len * p.v + 0.5).toFixed(3), '-i', p.chemin);
    else entrees.push('-f', 'lavfi', '-t', L, '-i', `color=c=${i % 2 ? '0x2a2440' : '0x332a4a'}:s=${ow}x${oh}:r=${fps}`);
    const z = `(${z0}+(${z1 - z0})*t/${L})`;
    const lisse = p.chemin && p.ips * p.v < 26 ? `minterpolate=fps=${fps}:mi_mode=blend` : `fps=${fps}`;     // ralenti sous 26 images/s : on fond les images, sinon ça saccade
    f.push(`[${i}:v]setpts=(PTS-STARTPTS)/${p.chemin ? p.v : 1},${lisse},scale=${ow}:${oh}:force_original_aspect_ratio=increase,crop=${ow}:${oh}:(iw-${ow})*${p.cadre ?? 0.5}:(ih-${oh})/2,`
      + `scale=w='2*trunc(${ow / 2}*${z})':h='2*trunc(${oh / 2}*${z})':eval=frame,crop=${ow}:${oh},setsar=1,${p.chemin ? ETALON : 'null'},tpad=stop_mode=clone:stop_duration=2,trim=duration=${L},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);
  });
  let cur = 'v0';
  for (let i = 1; i < plans.length; i++) { f.push(`[${cur}][v${i}]xfade=transition=fade:duration=${X}:offset=${plans[i].start.toFixed(3)}[x${i}]`); cur = `x${i}`; }
  f.push(`[${cur}][${plans.length}:v]overlay=format=auto:shortest=1[o]`);
  return ['-v', 'error', '-y', ...entrees, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ow}x${oh}`, '-r', String(fps), '-i', 'pipe:0',
    '-filter_complex', f.join(';'), '-map', '[o]', ...sortie];
}

if (opt('planche')) {
  // la planche : on rend un brouillon court puis on en tire une image toutes les N secondes
  const step = Number(opt('planche') === true ? 4 : opt('planche'));
  const tmp = join(dir, 'out', 'planche_tmp.mp4');
  await rendre(['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-t', D.toFixed(3), tmp]);
  const n = Math.ceil((D - 0.2) / step), cols = Math.min(6, n);
  spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', tmp, '-vf', `fps=1/${step}:start_time=0.2,scale=270:480,tile=${cols}x${Math.ceil(n / cols)}`, '-frames:v', '1', join(dir, 'out', 'planche.png')]);
  console.log(join(dir, 'out', 'planche.png'));
} else {
  const out = resolve(opt('out', join(dir, 'out', draft ? 'draft.mp4' : 'video.mp4')));
  const t0 = Date.now();
  await rendre(['-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '26' : '20', '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-t', D.toFixed(3), '-movflags', '+faststart', out]);
  console.log(`${out}  (${D.toFixed(1)} s, ${plans.length} plans, ${((Date.now() - t0) / 1000).toFixed(0)} s de calcul)`);
}
writeFileSync(join(dir, 'out', 'timeline.json'), JSON.stringify({ duration: D, fps, titre: spec.titre, mode: 'B', ambiance,
  scenes: plans.map(p => ({ id: `${p.k + 1}-${p.fichier || 'à choisir'}`, start: +p.start.toFixed(3), end: +p.fin.toFixed(3), note: p.note || '', present: !!p.chemin })) }, null, 2));
writeFileSync(join(dir, 'out', 'soustitres.txt'), cues.map(c => `${c.t0.toFixed(2).padStart(7)}  ${c.texte}`).join('\n') + '\n');
for (const p of plans) if (p.avis) console.log(`  plan ${p.k + 1} : ${p.avis}`);
if (manquants.length) console.log(`  MAQUETTE : ${manquants.length} plan(s) pas encore dans la banque : ${manquants.map(p => p.k + 1).join(', ')}`);

async function rendre(sortie) {
  const ff = spawn(FFMPEG, chaine(sortie), { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.stdin.on('error', () => {});
  const cv = createCanvas(ow, oh), g = cv.getContext('2d'), n = Math.round(D * fps);
  for (let i = 0; i < n; i++) {
    calque(g, i / fps, ow);
    if (!ff.stdin.write(cv.data())) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
