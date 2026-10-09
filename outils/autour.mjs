#!/usr/bin/env node
// Ce qu'il y a autour d'un instant du cours : les silences mesurés et les mots, pour poser une coupe au bon endroit.
//   node outils/autour.mjs <dossier du cours> <seconde> [<seconde> ...] [--marge 1.2]
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const args = process.argv.slice(2), cours = resolve(args[0]);
const mi = args.indexOf('--marge'), marge = mi > 0 ? Number(args[mi + 1]) : 1.2;
const b = readFileSync(join(cours, 'audio16k.wav')), off = b.indexOf('data') + 8;
const db = t => { let s = 1; const i = Math.round(t * 16000); for (let k = 0; k < 160; k++) { const v = b.readInt16LE(off + (i + k) * 2); s += v * v; } return 10 * Math.log10(s / 160); };
const mots = readdirSync(join(cours, 'transcript')).filter(f => /^mots_.*\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(join(cours, 'transcript', f), 'utf8')));
for (const a of args.slice(1)) {
  if (a.startsWith('--') || isNaN(Number(a)) || a === String(marge) && args[args.indexOf(a) - 1] === '--marge') continue;
  const t = Number(a), sil = []; let d = null;
  for (let x = t - marge; x <= t + marge; x += 0.01) { const q = db(x) <= 50; if (q && d == null) d = x; if (!q && d != null) { if (x - d >= 0.05) sil.push(`${d.toFixed(2)}-${x.toFixed(2)}`); d = null; } }
  if (d != null) sil.push(`${d.toFixed(2)}-…`);
  const vus = new Set(), ws = mots.filter(m => m.start > t - marge - 0.3 && m.start < t + marge + 0.3).sort((p, q) => p.start - q.start).filter(m => { const k = m.start.toFixed(2) + m.w; if (vus.has(k)) return false; vus.add(k); return true; });
  console.log(`${t.toFixed(2)}  silences : ${sil.join('  ') || 'aucun'}\n         mots : ${ws.map(m => `${m.w}@${m.start.toFixed(2)}`).join(' ')}`);
}
