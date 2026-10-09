#!/usr/bin/env node
// Fabrique le fond sonore « mer » : un ressac lent, synthétisé (aucun fichier téléchargé, aucun droit à payer).
//   node outils/ambiance.mjs        -> assets/ambiance/mer.m4a (3 min 30, stéréo)
// À lancer une seule fois : le fichier est livré avec le skill.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { run, ffmpeg, SKILL } from './commun.mjs';

const D = 210, dir = join(SKILL, 'assets', 'ambiance');
mkdirSync(dir, { recursive: true });
// une vague toutes les 9 s environ, de période irrégulière ; l'écume (aigus) arrive un peu après le creux
const houle = (dec, ph) => `pow(0.5+0.5*sin(2*PI*(t-${dec})/9.3+0.5*sin(2*PI*t/31+${ph})),`;
const voie = (seed, ph) =>
  `anoisesrc=d=${D}:c=brown:r=48000:a=1:seed=${seed},highpass=f=110,lowpass=f=1300,volume='0.16+0.84*${houle(0, ph)}2.4)':eval=frame[g${seed}];`
  + `anoisesrc=d=${D}:c=pink:r=48000:a=1:seed=${seed + 1},highpass=f=1600,lowpass=f=6200,volume='0.03+0.42*${houle(1.3, ph)}4)':eval=frame[e${seed}];`
  + `anoisesrc=d=${D}:c=brown:r=48000:a=1:seed=${seed + 2},lowpass=f=260,volume=0.45[f${seed}];`
  + `[g${seed}][e${seed}][f${seed}]amix=inputs=3:normalize=0[c${seed}]`;
const filtre = `${voie(11, 0)};${voie(21, 0.6)};[c11][c21]join=inputs=2:channel_layout=stereo,afade=t=in:d=2,afade=t=out:st=${D - 3}:d=3,loudnorm=I=-24:TP=-3:LRA=9,aresample=48000[o]`;
const out = join(dir, 'mer.m4a');
run(ffmpeg(), ['-v', 'error', '-y', '-filter_complex', filtre, '-map', '[o]', '-c:a', 'aac', '-b:a', '128k', out]);
console.log(out);

// « pluie » : en attendant un vrai enregistrement, une pluie régulière synthétisée (bruit filtré, léger roulis).
// Un vrai son posé dans assets/ambiance/pluie.mp3 (ou .wav) passe devant celui-ci si on supprime pluie.m4a.
const goutte = seed => `anoisesrc=d=${D}:c=white:r=48000:a=1:seed=${seed},highpass=f=900,lowpass=f=7800,volume='0.5+0.12*sin(2*PI*t/5.3)+0.08*sin(2*PI*t/1.7)':eval=frame[h${seed}];`
  + `anoisesrc=d=${D}:c=pink:r=48000:a=1:seed=${seed + 1},highpass=f=180,lowpass=f=1100,volume=0.55[b${seed}];[h${seed}][b${seed}]amix=inputs=2:normalize=0[p${seed}]`;
const pluie = join(dir, 'pluie.m4a');
run(ffmpeg(), ['-v', 'error', '-y', '-filter_complex', `${goutte(31)};${goutte(41)};[p31][p41]join=inputs=2:channel_layout=stereo,afade=t=in:d=2,afade=t=out:st=${D - 3}:d=3,loudnorm=I=-24:TP=-3:LRA=9,aresample=48000[o]`, '-map', '[o]', '-c:a', 'aac', '-b:a', '128k', pluie]);
console.log(pluie);

// « vent » : un vent léger pour le ciel, la montagne, la forêt (quand l'image ne montre ni mer ni pluie).
// Un souffle grave qui enfle et retombe, de période irrégulière, et un peu d'air dans les aigus.
const rafale = (per, ph) => `(0.5+0.5*sin(2*PI*t/${per}+${ph}+0.8*sin(2*PI*t/47+${ph})))`;
const souffle = (seed, ph) =>
  `anoisesrc=d=${D}:c=brown:r=48000:a=1:seed=${seed},highpass=f=90,lowpass=f=520,volume='0.30+0.70*pow(${rafale(13.7, ph)},1.6)':eval=frame[w${seed}];`
  + `anoisesrc=d=${D}:c=pink:r=48000:a=1:seed=${seed + 1},highpass=f=700,lowpass=f=2600,volume='0.04+0.16*pow(${rafale(8.9, ph + 1)},3)':eval=frame[a${seed}];`
  + `[w${seed}][a${seed}]amix=inputs=2:normalize=0[v${seed}]`;
const vent = join(dir, 'vent.m4a');
run(ffmpeg(), ['-v', 'error', '-y', '-filter_complex', `${souffle(51, 0)};${souffle(61, 1.9)};[v51][v61]join=inputs=2:channel_layout=stereo,afade=t=in:d=2,afade=t=out:st=${D - 3}:d=3,loudnorm=I=-24:TP=-3:LRA=9,aresample=48000[o]`, '-map', '[o]', '-c:a', 'aac', '-b:a', '128k', vent]);
console.log(vent);

