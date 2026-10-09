// Timeline : cale chaque scène sur le mot exact de la voix, gère caméra et transitions.
// Règles appliquées ici (voir SKILL.md) :
//   1. voix d'abord : une scène démarre sur son mot (champ cue), jamais sur un chrono arbitraire ;
//   3. vrai hook : la première scène est pleine dès la frame 1, aucune transition d'entrée ;
//   4. pas de coupes : chaque changement de scène a une transition et la caméra bouge toujours.

import { W, H, clamp, lerp, prog, ease, canvas, applyPaper, circle } from './core.js';

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9']/g, '');

/** Trouve l'index du mot `cue` à partir de `from`. cue = index | 'mot' | { w: 'mot', n: 2 } */
export function findWord(words, cue, from = 0) {
  if (typeof cue === 'number') return cue;
  const target = norm(typeof cue === 'string' ? cue : cue.w);
  let n = typeof cue === 'object' ? (cue.n || 1) : 1;
  for (let i = from; i < words.length; i++) {
    if (norm(words[i].w) === target && --n === 0) return i;
  }
  for (let i = from; i < words.length; i++) if (norm(words[i].w).startsWith(target)) return i;
  throw new Error(`Mot introuvable dans la voix : « ${typeof cue === 'string' ? cue : JSON.stringify(cue)} » (recherche à partir du mot ${from}). Lancer tools/mots.mjs pour voir la liste.`);
}

/**
 * Construit la timeline.
 * scenes : [{ id, cue, at, lead, trans, transDur, transAt, cam, draw, sfx }]
 * words  : [{ w, start, end }]
 */
export function buildTimeline(scenes, words, o = {}) {
  const voiceEnd = o.voiceEnd ?? (words.length ? words[words.length - 1].end : 5);
  const duration = o.duration ?? voiceEnd + (o.tail ?? 0.7);
  let from = 0;
  const out = scenes.map((s, i) => {
    let start, cueIndex = null;
    if (i === 0) start = 0;
    else if (s.at != null) start = s.at;
    else {
      cueIndex = findWord(words, s.cue, from);
      from = cueIndex + 1;
      start = Math.max(0, words[cueIndex].start - (s.lead ?? 0.6));   // le fondu commence une demi-seconde avant le mot
    }
    if (i === 0 && s.cue != null) { cueIndex = findWord(words, s.cue, 0); from = cueIndex + 1; }
    return { ...s, index: i, start, cueIndex };
  });
  for (let i = 0; i < out.length; i++) {
    out[i].end = i + 1 < out.length ? out[i + 1].start : duration;
    out[i].dur = out[i].end - out[i].start;
    if (out[i].dur <= 0) throw new Error(`Scène ${out[i].id || i} de durée nulle : deux scènes calées sur le même mot ?`);
    out[i].wordFrom = out[i].cueIndex ?? 0;
  }
  return { scenes: out, duration, words };
}

/** Contexte passé à draw(ctx, S). */
function sceneState(tl, sc, t) {
  const lt = t - sc.start;
  const S = {
    t, lt, dur: sc.dur, p: clamp(lt / sc.dur), start: sc.start, end: sc.end, scene: sc,
    /** Temps LOCAL (depuis le début de la scène) où la voix dit ce mot. */
    w(cue, lead = 0.04) {
      const i = findWord(tl.words, cue, sc.wordFrom);
      return tl.words[i].start - sc.start - lead;
    },
    /** Progression 0..1 entre deux temps locaux. */
    k(a, b) { return prog(lt, a, b); },
  };
  return S;
}

// ---------- caméra ----------
// cam = { from: [cx, cy, z], to: [cx, cy, z], ease } ou fonction (S) => [cx, cy, z, rot]
function camAt(sc, S) {
  let c;
  if (typeof sc.cam === 'function') c = sc.cam(S);
  else {
    const cam = sc.cam || {};
    const a = cam.from || [540, 960, 1.0], b = cam.to || [a[0], a[1] - 12, a[2] + 0.07];
    const e = (cam.ease || ease.io)(S.p);
    c = [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3] || 0, b[3] || 0, e)];
  }
  return c;
}
function applyCam(ctx, c, extra = null) {
  let [cx, cy, z, rot = 0] = c;
  if (extra) { // zoom supplémentaire vers un point (plongée / zoom arrière)
    const [px, py, ez] = extra;
    cx = lerp(cx, px, 1 - 1 / ez); cy = lerp(cy, py, 1 - 1 / ez); z *= ez;
  }
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  if (rot) ctx.rotate(rot);
  ctx.translate(-cx, -cy);
}

function drawScene(ctx, tl, sc, t, extra) {
  const S = sceneState(tl, sc, t);
  ctx.save();
  applyCam(ctx, camAt(sc, S), extra);
  sc.draw(ctx, S);
  ctx.restore();
}

// ---------- rendu d'une image ----------
let BUF = null;
function buffers(w, h) {
  if (!BUF || BUF.w !== w || BUF.h !== h) BUF = { w, h, a: canvas(w, h), b: canvas(w, h) };
  return BUF;
}
export function sceneAt(tl, t) {
  const s = tl.scenes;
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return i;
  return 0;
}

/**
 * Dessine l'image au temps t sur ctx (taille ow x oh, le moteur travaille en 1080 x 1920).
 * Transitions : iris | dive | zoomOut | slide | fade | none.
 */
export function renderFrame(ctx, tl, t, ow = W, oh = H, o = {}) {
  const k = ow / W;
  const i = sceneAt(tl, t);
  const sc = tl.scenes[i], prev = tl.scenes[i - 1];
  const lt = t - sc.start;
  const type = i === 0 ? 'none' : (sc.trans || 'fade');
  const td = sc.transDur ?? (type === 'dive' ? 0.5 : type === 'iris' ? 0.45 : type === 'fade' ? 1.2 : 0.35);   // fondus lents : le format est calme
  const p = clamp(lt / td);
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = '#221f47';
  ctx.fillRect(0, 0, W, H);

  if (!prev || type === 'none' || p >= 1) {
    drawScene(ctx, tl, sc, t);
  } else {
    const B = buffers(ow, oh);
    const bg = B.a.getContext('2d'), cg = B.b.getContext('2d');
    const layer = (g, fn) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ow, oh); g.setTransform(k, 0, 0, k, 0, 0); fn(g); g.restore(); };
    const blit = (img, alpha = 1) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(img, 0, 0); ctx.restore(); };
    const at = sc.transAt || [540, 960];
    if (type === 'iris') {
      drawScene(ctx, tl, prev, t);
      layer(cg, g => drawScene(g, tl, sc, t));
      const r = ease.inCubic(p) * Math.hypot(W, H) * 0.62 + 2;
      ctx.save();
      ctx.beginPath(); ctx.arc(at[0], at[1], r, 0, Math.PI * 2); ctx.clip();
      blit(B.b);
      ctx.restore();
      circle(ctx, at[0], at[1], r, { lw: 10, amp: 2 });
    } else if (type === 'dive') {
      // l'ancienne scène plonge dans un objet (transAt = point de l'ancienne scène), la nouvelle en sort
      const from = sc.diveFrom || at;
      layer(bg, g => drawScene(g, tl, prev, t, [from[0], from[1], lerp(1, 7, ease.inCubic(p))]));
      layer(cg, g => drawScene(g, tl, sc, t, [540, 960, lerp(1.35, 1, ease.outCubic(p))]));
      blit(B.a);
      blit(B.b, prog(p, 0.4, 0.9));
    } else if (type === 'zoomOut') {
      layer(bg, g => drawScene(g, tl, prev, t));
      layer(cg, g => drawScene(g, tl, sc, t, [at[0], at[1], lerp(2.6, 1, ease.outCubic(p))]));
      blit(B.a);
      blit(B.b, prog(p, 0, 0.35));
    } else if (type === 'slide') {
      // chaque scène découpée à son cadre : sinon le fond de la nouvelle (dessiné bien au-delà de
      // l'image) recouvre l'ancienne dès la première frame et le glissement montre un fond vide (2026-09-30)
      const dir = sc.dir || 1, off = ease.io(p) * W * dir;
      ctx.save(); ctx.beginPath(); ctx.rect(-off, 0, W, H); ctx.clip(); ctx.translate(-off, 0); drawScene(ctx, tl, prev, t); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(W * dir - off, 0, W, H); ctx.clip(); ctx.translate(W * dir - off, 0); drawScene(ctx, tl, sc, t); ctx.restore();
    } else { // fade : l'ancien plan s'éteint dans la nuit pendant que le nouveau s'allume (pas de personnage en double)
      layer(bg, g => drawScene(g, tl, prev, t));
      layer(cg, g => drawScene(g, tl, sc, t));
      ctx.fillStyle = '#1c1630'; ctx.fillRect(0, 0, W, H);
      blit(B.a, 1 - ease.io(clamp(p / 0.72)));
      blit(B.b, ease.io(clamp((p - 0.28) / 0.72)));
    }
  }
  ctx.restore();
  if (o.paper !== false) applyPaper(ctx, ow, oh, 0.55);
}

/** Événements sonores : un whoosh par transition, plus les sfx déclarés par les scènes. */
export function sfxEvents(tl) {
  const ev = [];
  tl.scenes.forEach((sc, i) => {
    if (i > 0 && sc.trans && !['none', 'fade'].includes(sc.trans) && sc.whoosh !== false) ev.push({ t: Math.max(0, sc.start - 0.08), name: sc.trans === 'dive' ? 'whoosh' : sc.trans === 'iris' ? 'swish' : 'whoosh', vol: 0.5 });
    for (const [name, when, vol] of sc.sfx || []) {
      let t = sc.start;
      if (typeof when === 'number') t = sc.start + when;
      else if (when != null) t = tl.words[findWord(tl.words, when, sc.wordFrom)].start - 0.03;
      ev.push({ t, name, vol: vol ?? 0.6 });
    }
  });
  return ev.sort((a, b) => a.t - b.t);
}
