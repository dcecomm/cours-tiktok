// Fonctions partagées par les outils : trouver ffmpeg, whisper et son modèle, lancer une commande.
// Tout est en Node pour tourner pareil sur Windows et sur Mac.

import { spawnSync } from 'node:child_process';
import { existsSync, statSync, createWriteStream, renameSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';

export function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...o });
  if (r.error) throw new Error(`${cmd} introuvable ou en échec : ${r.error.message}`);
  if (r.status !== 0 && !o.tolerant) throw new Error(`${cmd} a échoué (code ${r.status})\n${(r.stderr || '').slice(-1200)}`);
  return r;
}

function premier(...chemins) { return chemins.find(p => p && existsSync(p)); }
function dansPath(nom) {
  const r = spawnSync(WIN ? 'where' : 'which', [nom], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

export function ffmpeg() { return premier(join(SKILL, 'bin', WIN ? 'ffmpeg.exe' : 'ffmpeg')) || dansPath('ffmpeg') || 'ffmpeg'; }
export function ffprobe() { return premier(join(SKILL, 'bin', WIN ? 'ffprobe.exe' : 'ffprobe')) || dansPath('ffprobe') || 'ffprobe'; }

/** Le programme de transcription (whisper.cpp), gratuit et local. */
export function whisper() {
  const w = process.env.COURS_WHISPER || premier(join(SKILL, 'bin', WIN ? 'whisper-cli.exe' : 'whisper-cli')) || dansPath('whisper-cli');
  if (!w) throw new Error('whisper-cli introuvable. Voir INSTALLATION.md (étape « transcription »).');
  return w;
}
export function modele() {
  const nom = 'ggml-large-v3-turbo.bin';
  const m = process.env.COURS_WHISPER_MODELE || premier(
    join(SKILL, 'modeles', nom),
    join(homedir(), '.cache', 'whisper', nom),
    join(homedir(), 'Library', 'Application Support', 'fr.my-monkey.opensuperwhisper', 'whisper-models', nom),
  );
  if (!m) throw new Error(`Modèle ${nom} introuvable. Le poser dans ${join(SKILL, 'modeles')} (voir INSTALLATION.md).`);
  return m;
}

export function duree(fichier) {
  const r = run(ffprobe(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichier]);
  return parseFloat(r.stdout);
}
/** Silences du fichier : [[début, fin], ...] en secondes. */
export function silences(fichier, seuil = -35, mini = 0.35) {
  const r = run(ffmpeg(), ['-hide_banner', '-i', fichier, '-af', `silencedetect=noise=${seuil}dB:d=${mini}`, '-f', 'null', '-'], { tolerant: true });
  const out = []; let debut = null;
  for (const l of r.stderr.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/);
    if (a) debut = parseFloat(a[1]);
    if (b && debut != null) { out.push([debut, parseFloat(b[1])]); debut = null; }
  }
  return out;
}
export const hms = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':'); };
export const sec = t => typeof t === 'number' ? t : String(t).split(':').reduce((a, v) => a * 60 + parseFloat(v), 0);
export const opt = (args, nom, def) => { const i = args.indexOf('--' + nom); if (i < 0) return def; const v = args[i + 1]; return v && !v.startsWith('--') ? v : true; };

/** Jetons de whisper (-ojf, -dtw) -> mots { w, start, end }. `decal` s'ajoute à tous les temps. */
export function motsDepuisJetons(json, decal = 0) {
  const mots = [];
  for (const seg of json.transcription) {
    const fin = seg.offsets.to / 1000;
    for (const tk of seg.tokens || []) {
      if (/^\[_.*\]$/.test(tk.text) || tk.text === '') continue;
      const t = (tk.t_dtw != null && tk.t_dtw >= 0 ? tk.t_dtw / 100 : tk.offsets.from / 1000);
      const neuf = /^\s/.test(tk.text) && !/^\s*[.,;:!?…»)]+$/.test(tk.text);
      if (neuf || !mots.length) mots.push({ w: tk.text.trim(), start: t, end: tk.offsets.to / 1000, segFin: fin });
      else { const m = mots[mots.length - 1]; m.w += tk.text.trim().length && /^\s/.test(tk.text) ? ' ' + tk.text.trim() : tk.text; m.end = tk.offsets.to / 1000; m.segFin = fin; }
    }
  }
  // fin d'un mot = début du suivant, sans dépasser une durée plausible (les silences restent des silences)
  for (let i = 0; i < mots.length; i++) {
    const m = mots[i], suiv = mots[i + 1], maxi = m.start + 0.22 + 0.075 * m.w.length;
    m.end = Math.min(suiv ? suiv.start : Math.max(m.end, m.start + 0.3), maxi);
    if (m.end <= m.start) m.end = m.start + 0.12;
    delete m.segFin;
    m.start = +(m.start + decal).toFixed(3); m.end = +(m.end + decal).toFixed(3);
  }
  return mots.filter(m => m.w.replace(/[.,;:!?…«»"()\-\s]/g, '').length);
}

// ---------- téléchargements (installation, banque du mode B) ----------
const UA = { 'User-Agent': 'Mozilla/5.0 (cours-tiktok)' };
const mo = o => (o / 1048576).toFixed(1).replace('.', ',') + ' Mo';
/** Télécharge une adresse dans un fichier (d'abord en .part, renommé à la fin). */
export async function telecharger(url, vers, { reprise = false, dire = () => {} } = {}) {
  const part = vers + '.part', deja = reprise && existsSync(part) ? statSync(part).size : 0;
  const r = await fetch(url, { headers: { ...UA, ...(deja ? { Range: `bytes=${deja}-` } : {}) }, redirect: 'follow' });
  if (!r.ok && r.status !== 206) throw new Error(`téléchargement refusé (${r.status}) : ${url}`);
  const suite = r.status === 206, total = (+r.headers.get('content-length') || 0) + (suite ? deja : 0);
  let recu = suite ? deja : 0, dernier = 0;
  const flux = Readable.fromWeb(r.body);
  flux.on('data', b => { recu += b.length; if (total && recu - dernier > total / 20) { dernier = recu; dire(`${Math.round(100 * recu / total)} %`); } });
  await pipeline(flux, createWriteStream(part, { flags: suite ? 'a' : 'w' }));
  if (total && statSync(part).size < total) throw new Error(`téléchargement incomplet (${mo(statSync(part).size)} sur ${mo(total)}) : relancer la commande`);
  renameSync(part, vers);
  return statSync(vers).size;
}
export async function poids(url) {
  try { const r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow' }); return r.ok ? +r.headers.get('content-length') || 0 : 0; } catch { return 0; }
}
