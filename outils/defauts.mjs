#!/usr/bin/env node
// Cherche les défauts de l'enregistrement dans les passages gardés d'un short : les trous numériques
// (la visio qui décroche quelques dixièmes de seconde) et les clics. Ce sont des défauts du fichier
// du cours : on ne peut pas les réparer, seulement couper autour (coupe "exact" dans coupe.json).
//   node outils/defauts.mjs <dossier du cours> <dossier du short> [...]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { ffmpeg } from './commun.mjs';

const [cours, ...shorts] = process.argv.slice(2).map(p => resolve(p));
const source = JSON.parse(readFileSync(join(cours, 'source.json'), 'utf8')).source, SR = 48000;
for (const short of shorts) {
  const segs = JSON.parse(readFileSync(join(short, 'voice', 'words.json'), 'utf8')).segments.filter(Array.isArray), trous = [], clics = [];
  for (const [a, b] of segs) {
    const r = spawnSync(ffmpeg(), ['-v', 'error', '-ss', String(a), '-t', String(b - a), '-i', source, '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
    const x = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
    let z = 0;                                                         // trous : au moins 4 ms de zéros
    for (let i = 0; i < x.length; i++) { if (Math.abs(x[i]) <= 1) z++; else { if (z >= SR * 0.004) trous.push(`${(a + (i - z) / SR).toFixed(2)} (${Math.round(z / SR * 1000)} ms)`); z = 0; } }
    const N = 48, E = [];                                              // clics : pic isolé de la dérivée, 12 fois au-dessus du voisinage
    for (let i = N; i + N < x.length; i += N) { let e = 1; for (let k = 0; k < N; k++) { const v = x[i + k] - x[i + k - 1]; e += v * v; } E.push(e); }
    for (let i = 25; i < E.length - 25; i++) {
      const v = [...E.slice(i - 25, i - 3), ...E.slice(i + 4, i + 26)].sort((p, q) => p - q), haut = v[Math.floor(v.length * 0.9)];
      if (E[i] > 12 * haut && E[i] > 4e5 && E[i] >= E[i - 1] && E[i] >= E[i + 1]) { clics.push((a + i * N / SR).toFixed(2)); i += 4; }
    }
  }
  console.log(`${basename(short).padEnd(24)} trous : ${trous.join(' ') || 'aucun'}   clics : ${clics.join(' ') || 'aucun'}`);
}
