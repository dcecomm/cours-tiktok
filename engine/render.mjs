#!/usr/bin/env node
// Rendu d'un short.
//
//   node engine/render.mjs <dossier-short>                    vidéo muette 1080x1920 30 i/s -> <short>/out/video.mp4
//   node engine/render.mjs <dossier-short> --jobs 5           même rendu, réparti sur 5 processus (plus rapide)
//   node engine/render.mjs <dossier-short> --draft            brouillon 540x960 15 i/s -> <short>/out/draft.mp4
//   node engine/render.mjs <dossier-short> --planche 4        planche de contrôle, une image toutes les 4 s
//   node engine/render.mjs <dossier-short> --planche 1 --from 0 --to 12
//   node engine/render.mjs <dossier-short> --stills 1.2,3.4   images isolées pleine taille
//
// Le dossier contient scenes.mjs et voice/words.json (produit par outils/extrait.mjs).
// Facultatif : corrections.json (affichage des sous-titres, mot par mot).

import './node-setup.js';
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as E from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = resolve(args[0] || '.');
const opt = (name, def) => { const i = args.indexOf('--' + name); if (i < 0) return def; const v = args[i + 1]; return v && !v.startsWith('--') ? v : true; };
const lire = (f, def) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def;
// ffmpeg : celui du dossier bin/ du skill s'il y est (Windows), sinon celui de l'ordinateur
const FFMPEG = [join(here, '..', 'bin', 'ffmpeg.exe'), join(here, '..', 'bin', 'ffmpeg')].find(f => existsSync(f)) || 'ffmpeg';

const wordsFile = join(dir, 'voice', 'words.json');
if (!existsSync(wordsFile)) { console.error(`Pas de ${wordsFile} : lancer d'abord outils/extrait.mjs`); process.exit(1); }
const voice = JSON.parse(readFileSync(wordsFile, 'utf8'));
const mod = await import(pathToFileURL(join(dir, 'scenes.mjs')).href + '?v=' + Date.now());
const spec = mod.default({ E, words: voice.words });
const tl = E.buildTimeline(spec.scenes, voice.words, { voiceEnd: voice.duration, tail: spec.tail ?? 1.6 });
mkdirSync(join(dir, 'out'), { recursive: true });

// sous-titres : ses mots, avec les corrections d'affichage (glossaire du skill + corrections du short)
const corr = lire(join(dir, 'corrections.json'), {}), parMot = Object.fromEntries(Object.entries(corr).filter(([k]) => !/^\d+$/.test(k)));
const mots = E.corriger(voice.words, { ...lire(join(here, '..', 'glossaire.json'), {}), ...parMot }, corr);
// ajouts.json : ce qu'elle dit et que la transcription n'a pas écrit (une récitation en arabe), posé à la main :
// [{ "start": 41.2, "end": 44.0, "w": "Fa inna ma'al-'usri yusrâ." }]
for (const a of lire(join(dir, 'ajouts.json'), [])) {
  const ws = a.w.split(' '), n = ws.reduce((s, w) => s + w.length, 0); let t = a.start;
  for (const w of ws) { const d = (a.end - a.start) * w.length / n; mots.push({ w, aff: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) }); t += d; }
}
if (existsSync(join(dir, 'ajouts.json'))) mots.sort((x, y) => x.start - y.start);
const cues = E.construireCues(mots, spec.sousTitres || {});
writeFileSync(join(dir, 'out', 'soustitres.txt'), cues.map(c => `${c.t0.toFixed(2).padStart(7)}  ${c.texte}`).join('\n') + '\n');

function image(g, t, w, h) {
  E.renderFrame(g, tl, t, w, h);
  g.save(); g.setTransform(w / 1080, 0, 0, w / 1080, 0, 0);
  const sc = tl.scenes[E.sceneAt(tl, t)];
  // pas de fondu d'ouverture (l'image est pleine dès la première frame), un fondu de fermeture court
  const voile = E.prog(t, tl.duration - 0.9, tl.duration - 0.05);
  E.dessinerTitre(g, spec.titre, t, spec.titreStyle || {});
  if (spec.sousTitres !== false) E.dessinerSousTitres(g, cues, t, { ...(spec.sousTitres || {}), ...(sc.sousTitres || {}) });
  E.dessinerSignature(g, spec.signature, t, tl.duration);
  if (voile > 0) { g.globalAlpha = voile; g.fillStyle = '#1c1630'; g.fillRect(0, 0, 1080, 1920); }
  g.restore();
}

const fmt = t => t.toFixed(2);
const wordAt = t => { const w = voice.words.find(w => t >= w.start - 0.02 && t < w.end + 0.15); return w ? w.w : ''; };

// ---------- planche de contrôle ----------
if (opt('planche')) {
  const step = Number(opt('planche') === true ? 4 : opt('planche'));
  const from = Number(opt('from', 0)), to = Number(opt('to', tl.duration));
  const times = [];
  for (let t = from + 0.15; t < to; t += step) times.push(t);
  const cw = 270, ch = 480, cols = Math.min(6, times.length), rows = Math.ceil(times.length / cols);
  const sheet = createCanvas(cols * cw, rows * (ch + 44)), sg = sheet.getContext('2d');
  sg.fillStyle = '#1d1f24'; sg.fillRect(0, 0, sheet.width, sheet.height);
  const cell = createCanvas(cw, ch), cg = cell.getContext('2d');
  times.forEach((t, i) => {
    image(cg, t, cw, ch);
    const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + 44);
    sg.drawImage(cell, x, y);
    const sc = tl.scenes[E.sceneAt(tl, t)];
    sg.fillStyle = '#e8e8e8'; sg.font = '17px "Crayon Round"'; sg.textAlign = 'left';
    sg.fillText(`${fmt(t)}s  ${sc.id || '#' + sc.index}`, x + 8, y + ch + 19);
    sg.fillStyle = '#f2c14e'; sg.fillText(`« ${wordAt(t)} »`, x + 8, y + ch + 38);
  });
  const name = from > 0 || to < tl.duration ? `planche_${fmt(from)}-${fmt(to)}.png` : 'planche.png';
  writeFileSync(join(dir, 'out', name), sheet.toBuffer('image/png'));
  console.log(join(dir, 'out', name));
  process.exit(0);
}

// ---------- images isolées ----------
if (opt('stills')) {
  const cv = createCanvas(1080, 1920), g = cv.getContext('2d');
  for (const t of String(opt('stills')).split(',').map(Number)) {
    image(g, t, 1080, 1920);
    const f = join(dir, 'out', `still_${fmt(t)}.png`);
    writeFileSync(f, cv.toBuffer('image/png'));
    console.log(f);
  }
  process.exit(0);
}

// ---------- vidéo ----------
const draft = !!opt('draft');
const fps = Number(opt('fps', draft ? 15 : 30));
const ow = draft ? 540 : 1080, oh = draft ? 960 : 1920;
const from = Number(opt('from', 0)), to = Number(opt('to', tl.duration));
const out = resolve(opt('out', join(dir, 'out', draft ? 'draft.mp4' : 'video.mp4')));
const jobs = Number(opt('jobs', 1));

if (jobs > 1) {
  // rendu réparti : chaque processus rend une tranche, puis on recolle sans réencoder
  const total = Math.round((to - from) * fps), par = Math.ceil(total / jobs), t0 = Date.now();
  const parts = [];
  await Promise.all(Array.from({ length: jobs }, (_, j) => new Promise((ok, ko) => {
    const a = from + j * par / fps, b = Math.min(to, from + (j + 1) * par / fps);
    if (a >= b) return ok();
    const f = join(dir, 'out', `part_${j}.mp4`); parts[j] = f;
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), dir, '--from', String(a), '--to', String(b), '--out', f, '--fps', String(fps), ...(draft ? ['--draft'] : []), '--part'], { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', c => c === 0 ? ok() : ko(new Error(`tranche ${j} en échec`)));
  })));
  const liste = join(dir, 'out', 'parts.txt');
  writeFileSync(liste, parts.filter(Boolean).map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  await new Promise(r => spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', r));
  parts.filter(Boolean).forEach(f => rmSync(f)); rmSync(liste);
  console.log(`${out}  (${total} images en ${((Date.now() - t0) / 1000).toFixed(0)} s, ${jobs} processus)`);
} else {
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ow}x${oh}`, '-r', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '26' : '20', '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cv = createCanvas(ow, oh), g = cv.getContext('2d');
  const n = Math.round((to - from) * fps), t0 = Date.now();
  for (let f = 0; f < n; f++) {
    image(g, from + f / fps, ow, oh);
    // cv.data() : pixels bruts. getImageData fuit de la mémoire native à chaque image.
    if (!ff.stdin.write(cv.data())) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  if (!opt('part')) console.log(`${out}  (${n} images en ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
if (!opt('part')) writeFileSync(join(dir, 'out', 'timeline.json'), JSON.stringify({
  duration: tl.duration, fps, titre: spec.titre, ambiance: spec.ambiance || 'mer',
  scenes: tl.scenes.map(s => ({ id: s.id, start: +s.start.toFixed(3), end: +s.end.toFixed(3), cue: s.cueIndex != null ? voice.words[s.cueIndex].w : null })),
}, null, 2));
