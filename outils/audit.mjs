#!/usr/bin/env node
// Audit des raccords d'un short : chaque bord de coupe tombe-t-il dans un silence ? Deux raccords sont-ils trop proches ?
//   node outils/audit.mjs <dossier du cours> <dossier du short> [...]
// Un bord « en pleine parole » hache un mot. Deux raccords à moins d'une seconde font un hoquet.
// Niveaux en dB du son du cours (16 kHz) : le fond d'une visio est vers 45, la parole entre 60 et 80.
import { readFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const [cours, ...shorts] = process.argv.slice(2).map(p => resolve(p));
const b = readFileSync(join(cours, 'audio16k.wav')), off = b.indexOf('data') + 8;
const niveau = (t0, t1) => { let m = 0; for (let t = t0; t < t1; t += 0.01) { let s = 1; const i = Math.round(t * 16000); for (let k = 0; k < 160; k++) { const v = b.readInt16LE(off + (i + k) * 2); s += v * v; } m = Math.max(m, 10 * Math.log10(s / 160)); } return Math.round(m); };
for (const short of shorts) {
  const S = JSON.parse(readFileSync(join(short, 'voice', 'words.json'), 'utf8')).segments.filter(Array.isArray);   // une reprise n'est pas un morceau du cours
  const out = []; let acc = 0, prevT = -9, prevParole = false;
  const debut = niveau(S[0][0], S[0][0] + 0.02), fin = niveau(S[S.length - 1][1] - 0.02, S[S.length - 1][1]);
  if (debut > 52) out.push(`  début du short en pleine parole (${debut} dB) à ${S[0][0].toFixed(2)}`);
  if (fin > 52) out.push(`  fin du short en pleine parole (${fin} dB) à ${S[S.length - 1][1].toFixed(2)}`);
  for (let i = 0; i + 1 < S.length; i++) {
    acc += S[i][1] - S[i][0];
    const g = niveau(S[i][1] - 0.02, S[i][1]), d = niveau(S[i + 1][0], S[i + 1][0] + 0.02), retire = S[i + 1][0] - S[i][1];
    const soucis = [];
    if (g > 52) soucis.push(`bord gauche en pleine parole (${g} dB)`);
    if (d > 52) soucis.push(`bord droit en pleine parole (${d} dB)`);
    // deux raccords proches ne gênent que si l'un des deux touche la parole (deux coupes dans le même silence ne s'entendent pas)
    if (acc - prevT < 1.0 && (soucis.length || prevParole)) soucis.push(`à ${(acc - prevT).toFixed(2)} s du raccord précédent`);
    prevParole = g > 52 || d > 52;
    if (soucis.length) out.push(`  raccord à ${acc.toFixed(1)} s du short (cours ${S[i][1].toFixed(2)} -> ${S[i + 1][0].toFixed(2)}, ${retire.toFixed(1)} s retirées) : ${soucis.join(', ')}`);
    prevT = acc;
  }
  console.log(`${basename(short)} : ${S.length - 1} raccords, ${out.length ? out.length + ' à revoir' : 'tous dans un silence'}`);
  out.forEach(l => console.log(l));
}
