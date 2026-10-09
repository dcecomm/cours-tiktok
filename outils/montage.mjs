#!/usr/bin/env node
// Assemble le short : l'image (out/video.mp4), sa voix (voice/voice.wav) et le fond sonore de nature.
//   node outils/montage.mjs <dossier du short> [--ambiance mer] [--niveau -17]
// -> <short>/out/short.mp4 : 1080x1920, H.264, AAC 192k, volume final -14 LUFS (mesuré, deux passes).
// Pas de musique. Le fond sonore reste bien sous la voix (niveau = dB sous la voix).

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run, ffmpeg, duree, opt, SKILL } from './commun.mjs';

const args = process.argv.slice(2);
const dir = resolve(args[0] || '.');
const video = join(dir, 'out', 'video.mp4'), voix = join(dir, 'voice', 'voice.wav');
const tl = existsSync(join(dir, 'out', 'timeline.json')) ? JSON.parse(readFileSync(join(dir, 'out', 'timeline.json'), 'utf8')) : {};
const niveau = Number(opt(args, 'niveau', -17));
const D = duree(video);
// le fond sonore : un seul son, ou plusieurs qui se relaient selon le thème ([{ t: 0, son: 'pluie' }, { t: 14.9, son: 'mer' }])
const forcee = opt(args, 'ambiance');
const sons = forcee ? [{ t: 0, son: forcee }] : (Array.isArray(tl.ambiance) ? tl.ambiance : [{ t: 0, son: tl.ambiance || 'mer' }]);
const fichierSon = n => ['m4a', 'mp3', 'wav'].map(e => join(SKILL, 'assets', 'ambiance', `${n}.${e}`)).find(f => existsSync(f));
for (const a of sons) { a.f = fichierSon(a.son); if (!a.f) throw new Error(`Fond sonore « ${a.son} » introuvable dans assets/ambiance (présents : voir ce dossier).`); }
const F = 2.0;                                           // fondu d'un son vers le suivant
const mix = norm => `[1:a]aresample=48000,apad[v];`
  + sons.map((a, j) => { const t0 = a.t, t1 = j + 1 < sons.length ? sons[j + 1].t : D;
      return `[${j + 2}:a]aresample=48000,loudnorm=I=-24:TP=-3:LRA=9,volume=${niveau + 8}dB,afade=t=in:st=${Math.max(0, t0 - F / 2).toFixed(2)}:d=${j ? F : 0.6},afade=t=out:st=${(j + 1 < sons.length ? t1 - F / 2 : D - 1.2).toFixed(2)}:d=${j + 1 < sons.length ? F : 1.2}[a${j}]`; }).join(';')
  + `;[v]${sons.map((_, j) => `[a${j}]`).join('')}amix=inputs=${sons.length + 1}:normalize=0:duration=longest,atrim=0:${D.toFixed(3)},${norm},aresample=48000[o]`;
const entrees = ['-i', video, '-i', voix, ...sons.flatMap(a => ['-stream_loop', '-1', '-i', a.f])];
// passe 1 : mesure
const r = run(ffmpeg(), ['-hide_banner', '-y', ...entrees, '-filter_complex', mix('loudnorm=I=-14:TP=-1:LRA=11:print_format=json'), '-map', '[o]', '-t', D.toFixed(3), '-f', 'null', '-'], { tolerant: true });
const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
// passe 2 : application
const norm = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const out = join(dir, 'out', 'short.mp4');
run(ffmpeg(), ['-v', 'error', '-y', ...entrees, '-filter_complex', mix(norm), '-map', '0:v', '-map', '[o]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', D.toFixed(3), '-movflags', '+faststart', out]);
console.log(`${out}  (${D.toFixed(1)} s)`);
