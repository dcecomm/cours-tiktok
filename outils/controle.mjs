#!/usr/bin/env node
// Contrôle un short fini, par la mesure (Claude n'entend pas : il mesure, et elle écoute).
//   node outils/controle.mjs <dossier du short> [...]
// Mesure : durée, volume final (cible -14 LUFS), crête, plus long silence de la voix, et réécoute
// de la vidéo finale par la transcription : part des mots du texte de référence qu'on y retrouve
// (si la mer couvrait la voix ou si une coupe mangeait un mot, cette part baisserait).

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { run, ffmpeg, whisper, modele, duree, silences } from './commun.mjs';

const cle = w => w.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
for (const arg of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const dir = resolve(arg), mp4 = join(dir, 'out', 'short.mp4');
  if (!existsSync(mp4)) { console.log(`${basename(dir)} : pas de out/short.mp4`); continue; }
  const r = run(ffmpeg(), ['-hide_banner', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { tolerant: true }).stderr;
  const I = parseFloat((r.match(/I:\s+(-?[\d.]+) LUFS(?![\s\S]*I:\s)/) || [])[1]), pk = parseFloat((r.match(/Peak:\s+(-?[\d.]+) dBFS(?![\s\S]*Peak:)/) || [])[1]);
  const sil = silences(join(dir, 'voice', 'voice.wav'), -38, 0.3).filter(([a]) => a > 0.2), d = duree(mp4);
  const long = sil.filter(([a, b]) => b < d - 2).reduce((m, [a, b]) => Math.max(m, b - a), 0);
  const tmp = join(dir, 'out', 'controle.wav');
  run(ffmpeg(), ['-v', 'error', '-y', '-i', mp4, '-vn', '-ac', '1', '-ar', '16000', tmp]);
  run(whisper(), ['-m', modele(), '-l', 'fr', '-t', '8', '-f', tmp, '-otxt', '-of', tmp.replace(/\.wav$/, ''), '-np', '-mc', '0']);
  const hyp = readFileSync(tmp.replace(/\.wav$/, '.txt'), 'utf8').split(/\s+/).map(cle).filter(Boolean);
  rmSync(tmp); rmSync(tmp.replace(/\.wav$/, '.txt'));
  let part = null; const absents = [];
  if (existsSync(join(dir, 'texte.txt'))) {
    // les heures des blocs posés à la main ({12.3-14.0: ...}) ne sont pas des mots
    const brut = readFileSync(join(dir, 'texte.txt'), 'utf8').replace(/\{\s*[\d.]+\s*-\s*[\d.]+\s*:/g, ' ').replace(/\}/g, ' ').split(/\s+/).filter(w => cle(w));
    const ref = brut.map(cle);
    const L = Array.from({ length: ref.length + 1 }, () => new Uint16Array(hyp.length + 1));     // plus longue suite commune
    for (let i = 1; i <= ref.length; i++) for (let j = 1; j <= hyp.length; j++) L[i][j] = ref[i - 1] === hyp[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    part = L[ref.length][hyp.length] / ref.length;
    for (let i = ref.length, j = hyp.length; i > 0;) {                                          // les mots du texte que la réécoute n'a pas rendus
      if (j > 0 && ref[i - 1] === hyp[j - 1]) { i--; j--; } else if (j > 0 && L[i][j - 1] >= L[i - 1][j]) j--; else { absents.unshift(brut[i - 1]); i--; }
    }
  }
  const soucis = [];
  if (Math.abs(I + 14) > 1) soucis.push('volume hors cible');
  if (pk > -0.5) soucis.push('crête trop haute');
  if (long > 0.95) soucis.push(`silence de ${long.toFixed(1)} s`);
  if (part != null && part < 0.88) soucis.push('texte mal retrouvé à la réécoute');
  console.log(`${basename(dir).padEnd(24)} ${d.toFixed(1).padStart(5)} s  ${I.toFixed(1)} LUFS  crête ${pk.toFixed(1)} dB  plus long silence ${long.toFixed(2)} s  mots retrouvés ${part == null ? '-' : Math.round(part * 100) + ' %'}  ${soucis.length ? '⚠ ' + soucis.join(', ') : 'OK'}`);
  if (absents.length && (part < 0.97 || process.argv.includes('--detail'))) console.log(`${''.padEnd(24)} non retrouvés à la réécoute (souvent un mot arabe ou un nom, écrit autrement) : ${absents.join(' ')}`);
}
