// Le personnage : une femme voilée, assise, sereine. On lui dit quoi ressentir, le moteur la dessine.
// soeur(ctx, { x, y, s, pose: 'doua', eyes: 'closed', mouth: 'smile', t })
// Origine = le sol, sous elle. Hauteur ~800 px à s = 1.

import { ell, blob, limb, arc, seg, line, at, wave, clamp, lerp, draw, curvePts } from './core.js';
import { N, shade } from './nature.js';

// [coude, poignet] par côté (L = gauche de l'image)
const POSES = {
  repos: { L: [[-176, -330], [-34, -230]], R: [[176, -330], [34, -230]] },   // mains jointes sur les genoux
  doua:  { L: [[-172, -312], [-66, -404]], R: [[172, -312], [66, -404]] },   // paumes ouvertes vers le ciel
  coeur: { L: [[-176, -330], [-34, -230]], R: [[180, -334], [30, -428]] },   // main droite sur le cœur
  tasse: { L: [[-168, -314], [-40, -368]], R: [[168, -314], [40, -368]] },   // un verre de thé entre les mains
  parle: { L: [[-176, -330], [-34, -230]], R: [[196, -336], [258, -468]] },  // main ouverte, elle explique
  livre: { L: [[-178, -316], [-104, -352]], R: [[178, -316], [104, -352]] },   // un livre ouvert entre les mains
};
const EPAULE = { L: [-124, -478], R: [124, -478] };
const FACE_Y = -652;

/** Manche : un tube qui s'évase de l'épaule (w0) vers le poignet (w1). rond = bout de départ arrondi. */
function manche(g, pts, w0, w1, o, rond = false) {
  const P = curvePts(pts, false, 8), L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const hw = lerp(w0, w1, i / (P.length - 1)) / 2;
    L.push([P[i][0] + nx * hw, P[i][1] + ny * hw]); R.push([P[i][0] - nx * hw, P[i][1] - ny * hw]);
  }
  const cap = [];
  if (rond) {
    const c = P[0], a0 = Math.atan2(R[0][1] - c[1], R[0][0] - c[0]);
    for (let i = 1; i < 8; i++) { const a = a0 + Math.PI * i / 8; cap.push([c[0] + Math.cos(a) * w0 / 2, c[1] + Math.sin(a) * w0 / 2]); }
  }
  draw(g, [...L, ...R.reverse(), ...cap], o);
}

/** Visage. Origine = centre du visage. */
function visage(g, o) {
  const ink = o.ink, eyes = o.eyes || 'open', mouth = o.mouth || 'smile';
  const blink = o.blink ?? (eyes === 'open' && wave(o.t || 0, 0.21) > 0.985 ? 1 : 0);
  g.save(); g.globalAlpha *= 0.4;
  ell(g, -54, 36, 22, 13, { fill: '#dc6e58', stroke: false, tex: false });
  ell(g, 54, 36, 22, 13, { fill: '#dc6e58', stroke: false, tex: false });
  g.restore();
  for (const sx of [-1, 1]) {
    const ex = sx * 35, ey = 0;
    if (eyes === 'closed' || blink) {
      // paupières baissées : une courbe douce et deux cils
      arc(g, ex, ey - 5, 17, 10, Math.PI * 0.08, Math.PI * 0.92, { lw: 4.5, stroke: ink });
      seg(g, ex + sx * 16, ey - 1, ex + sx * 24, ey + 5, { lw: 3.2, stroke: ink });
      seg(g, ex + sx * 9, ey + 4, ex + sx * 14, ey + 12, { lw: 3.2, stroke: ink });
    } else if (eyes === 'happy') {
      arc(g, ex, ey + 8, 17, 14, Math.PI * 1.1, Math.PI * 1.9, { lw: 4.5, stroke: ink });
    } else {
      // œil en amande : un grand iris sombre, un reflet, la paupière et un cil
      const lx = o.look ? o.look[0] : 0, ly = o.look ? o.look[1] : 0;
      g.save(); g.fillStyle = '#33201a';
      g.beginPath(); g.ellipse(ex + lx * 4, ey + 2 + ly * 3, 9.5, 12.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx * 4 + 3.4, ey - 3 + ly * 3, 3, 0, Math.PI * 2); g.fill();
      g.restore();
      arc(g, ex, ey + 5, 18, 17, Math.PI * 1.14, Math.PI * 1.86, { lw: 4.5, stroke: ink });
      seg(g, ex + sx * 16, ey - 4, ex + sx * 24, ey - 10, { lw: 3.2, stroke: ink });
    }
    arc(g, ex + sx * 2, ey - 20, 21, 9, Math.PI * (sx < 0 ? 1.14 : 1.2), Math.PI * (sx < 0 ? 1.8 : 1.86), { lw: 4, stroke: '#4a3024' });
  }
  arc(g, 2, 22, 7, 8, -Math.PI * 0.3, Math.PI * 0.55, { lw: 3.5, stroke: shade(o.skin, -0.34) });
  const my = 54;
  if (mouth === 'smile') arc(g, 0, my - 13, 22, 16, Math.PI * 0.2, Math.PI * 0.8, { lw: 4.2, stroke: ink });
  else if (mouth === 'soft') arc(g, 0, my - 8, 15, 9, Math.PI * 0.2, Math.PI * 0.8, { lw: 4.2, stroke: ink });
  else if (mouth === 'flat') seg(g, -11, my, 11, my, { lw: 4.2, stroke: ink });
  else if (mouth === 'talk') {
    // la bouche s'ouvre avec la parole : o.open 0..1
    const a = clamp(o.open ?? 0.5);
    ell(g, 0, my, 12 + a * 3, 3 + a * 9, { fill: '#7a2f2c', stroke: ink, lw: 3.5, tex: false, seed: 611, amp: 0.4 });
  }
}

/** Main. kind : 'rond' (posée, fermée), 'paume' (ouverte vers le ciel). sx = -1 pour la main gauche. */
function main(g, x, y, skin, ink, kind = 'rond', sx = 1) {
  if (kind === 'paume') {
    at(g, x, y, 1, h => {
      h.scale(sx, 1);
      // paume en coupe, pouce vers l'extérieur
      blob(h, [[-36, 2], [-30, -16], [-4, -22], [26, -18], [44, -24], [50, -12], [36, 6], [24, 18], [-6, 20], [-28, 16]], { fill: skin, stroke: ink, lw: 4, seed: 621 });
      line(h, [[-20, -4], [2, 3], [22, -3]], { lw: 2.5, stroke: shade(skin, -0.3) });
    }, sx * 0.16);
  } else ell(g, x, y, 28, 23, { fill: skin, stroke: ink, lw: 4, seed: 622 });
}

/**
 * La femme voilée, assise en tailleur.
 * o = { x, y, s, pose: repos|doua|coeur|tasse|parle, eyes: open|closed|happy, mouth: smile|soft|flat|talk,
 *       open (0..1), look: [x, y], skin, voile, robe, ink, t, bob, tilt, hold: h => dessin tenu (pose 'tasse') }
 */
export function soeur(ctx, o = {}) {
  at(ctx, o.x ?? 540, o.y ?? 1500, o.s ?? 1, g => {
    const t = o.t || 0;
    const souffle = (o.bob ?? 1) * wave(t, 0.2) * 3.5;   // respiration lente
    const skin = o.skin || '#c48a5f', voile = o.voile || '#f2e2cf', robe = o.robe || '#7f9a8c', ink = o.ink || N.ink;
    const pli = shade(robe, -0.22), pliV = shade(voile, -0.17);
    const pose = typeof o.pose === 'object' ? o.pose : (POSES[o.pose || 'repos'] || POSES.repos);
    const paume = o.paumes ?? (o.pose === 'doua' || o.pose === 'parle');
    const R = { fill: robe, stroke: ink, lw: 4.5 };

    // ombre au sol, puis jambes en tailleur sous la robe
    ell(g, 0, 8, 318, 30, { fill: 'rgba(30,20,50,0.3)', stroke: false, tex: false, amp: 0 });
    blob(g, [[-292, -46], [-270, -118], [-176, -168], [0, -184], [176, -168], [270, -118], [292, -46], [246, -2], [0, 8], [-246, -2]], { ...R, seed: 631 });
    line(g, [[-232, -62], [-126, -118], [-24, -104]], { lw: 3.5, stroke: pli });
    line(g, [[232, -62], [126, -118], [24, -104]], { lw: 3.5, stroke: pli });
    line(g, [[-56, -36], [0, -54], [56, -36]], { lw: 3.5, stroke: pli });

    g.translate(0, souffle);
    // buste
    blob(g, [[-128, -500], [-60, -530], [60, -530], [128, -500], [146, -380], [154, -214], [0, -180], [-154, -214], [-146, -380]], { ...R, seed: 632 });
    for (const sd of ['L', 'R']) manche(g, [EPAULE[sd], pose[sd][0], pose[sd][1]], 58, 74, { ...R, seed: sd === 'L' ? 641 : 642 });

    // voile : il épouse la tête, se resserre au cou, puis retombe sur les épaules et la poitrine
    const drape = [[58, -784], [100, -744], [118, -680], [118, -612], [114, -560], [140, -520], [188, -470], [204, -416], [160, -376], [80, -352]];
    blob(g, [[0, -794], ...drape, [0, -342], ...drape.map(([x, y]) => [-x, y]).reverse()], { fill: voile, stroke: ink, lw: 4.5, seed: 651 });
    line(g, [[84, -586], [52, -516], [-40, -446], [-150, -418]], { lw: 3.5, stroke: pliV });
    line(g, [[-80, -578], [-52, -496], [2, -424]], { lw: 3.5, stroke: pliV });
    line(g, [[150, -470], [112, -424], [66, -396]], { lw: 3, stroke: pliV });

    // avant-bras et mains, par-dessus le voile
    if (o.hold) at(g, 0, (pose.L[1][1] + pose.R[1][1]) / 2, 1, o.hold);
    for (const sd of ['L', 'R']) {
      const [c, m] = pose[sd], sx = sd === 'L' ? -1 : 1;
      // l'avant-bras ne se redessine que s'il passe devant le voile (mains à hauteur de poitrine)
      if (Math.abs(m[0]) < 190 && m[1] < -345) manche(g, [c, [(c[0] + m[0]) / 2, (c[1] + m[1]) / 2 + 5], m], 64, 74, { ...R, seed: sd === 'L' ? 643 : 644 }, true);
      const d = Math.hypot(m[0] - c[0], m[1] - c[1]) || 1, ux = (m[0] - c[0]) / d, uy = (m[1] - c[1]) / d;
      main(g, m[0] + ux * 20, m[1] + uy * 20 - (paume ? 10 : 0), skin, ink, paume && !(o.pose === 'parle' && sd === 'L') ? 'paume' : 'rond', sx);
    }

    // la lumière du cœur (o.coeur = 0..1) : une lueur douce sur la poitrine, quand le cœur s'apaise ou s'ouvre
    if (o.coeur) {
      const cg = g.createRadialGradient(0, -420, 4, 0, -420, 230);
      cg.addColorStop(0, `rgba(255,224,150,${0.75 * o.coeur})`); cg.addColorStop(0.4, `rgba(255,200,120,${0.3 * o.coeur})`); cg.addColorStop(1, 'rgba(255,200,120,0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = cg; g.fillRect(-240, -660, 480, 480); g.restore();
    }
    // visage dans l'ouverture du voile, avec le bandeau sous le voile
    at(g, 0, FACE_Y, 1, h => {
      ell(h, 0, 0, 88, 100, { fill: skin, stroke: ink, lw: 4.5, seed: 661 });
      blob(h, [[-85, -34], [-71, -72], [-35, -95], [0, -101], [35, -95], [71, -72], [85, -34], [56, -60], [0, -74], [-56, -60]], { fill: shade(voile, -0.15), stroke: ink, lw: 3.5, seed: 662 });
      visage(h, { ...o, ink, skin, t });
    }, o.tilt || 0);
  });
}



/** La même femme, vue de dos, assise face au paysage. Origine = le sol, sous elle. */
export function soeurDos(ctx, o = {}) {
  at(ctx, o.x ?? 540, o.y ?? 1500, o.s ?? 1, g => {
    const t = o.t || 0, souffle = (o.bob ?? 1) * wave(t, 0.2) * 3.5;
    const voile = o.voile || '#f2e2cf', robe = o.robe || '#7f9a8c', ink = o.ink || N.ink;
    const R = { fill: robe, stroke: ink, lw: 4.5 }, pliV = shade(voile, -0.17);
    ell(g, 0, 8, 318, 30, { fill: 'rgba(30,20,50,0.3)', stroke: false, tex: false, amp: 0 });
    blob(g, [[-292, -46], [-270, -118], [-176, -168], [0, -184], [176, -168], [270, -118], [292, -46], [246, -2], [0, 8], [-246, -2]], { ...R, seed: 631 });
    g.translate(0, souffle);
    blob(g, [[-128, -500], [-60, -530], [60, -530], [128, -500], [146, -380], [154, -214], [0, -180], [-154, -214], [-146, -380]], { ...R, seed: 632 });
    for (const sx of [-1, 1]) manche(g, [[sx * 124, -478], [sx * 172, -330], [sx * 118, -214]], 58, 70, { ...R, seed: 645 + sx });
    // le voile, vu de dos : il épouse la tête, se resserre à la nuque, couvre les épaules
    const d = [[58, -784], [100, -744], [116, -680], [112, -612], [104, -566], [140, -520], [190, -470], [206, -410], [170, -366], [90, -340]];
    blob(g, [[0, -794], ...d, [0, -330], ...d.map(([x, y]) => [-x, y]).reverse()], { fill: voile, stroke: ink, lw: 4.5, seed: 652 });
    line(g, [[-92, -566], [-40, -548], [0, -544], [40, -548], [92, -566]], { lw: 3.5, stroke: pliV });
    line(g, [[-44, -530], [-58, -440], [-40, -350]], { lw: 3.5, stroke: pliV });
    line(g, [[50, -530], [66, -440], [46, -350]], { lw: 3.5, stroke: pliV });
    line(g, [[-70, -700], [-30, -750], [30, -756]], { lw: 3, stroke: pliV });
  });
}

/** Gros plan : deux mains ouvertes vers le ciel, doigts vers le haut. Origine = entre les deux poignets. */
export function mainsDoua(ctx, x, y, s = 1, o = {}) {
  at(ctx, x, y, s, g => {
    const skin = o.skin || '#c48a5f', robe = o.robe || '#7f9a8c', ink = o.ink || N.ink, lw = 4.5 / s;
    const P = { fill: skin, stroke: ink, lw }, pli = shade(skin, -0.28);
    g.translate(0, wave(o.t || 0, 0.2) * 3);
    for (const sx of [-1, 1]) {
      g.save(); g.scale(sx, 1);
      manche(g, [[330, 470], [215, 270], [128, 132]], 190, 124, { fill: robe, stroke: ink, lw, seed: 671 });
      at(g, 112, 40, 1, h => {
        // quatre doigts, puis le pouce vers l'extérieur, puis la paume par-dessus leurs racines
        [[-44, -30, -0.12, 92], [-15, -40, -0.03, 106], [15, -38, 0.07, 100], [43, -24, 0.18, 82]].forEach(([fx, fy, a, L], i) =>
          limb(h, [[fx, fy], [fx + Math.sin(a) * L, fy - Math.cos(a) * L]], 28, { ...P, seed: 673 + i }));
        limb(h, [[50, 22], [84, -6], [98, -40]], 29, { ...P, seed: 678 });
        blob(h, [[-62, -24], [-22, -40], [30, -36], [62, -16], [66, 34], [42, 70], [-18, 76], [-58, 46]], { ...P, seed: 679 });
        line(h, [[-42, 6], [0, 18], [46, 0]], { lw: lw * 0.6, stroke: pli });
        line(h, [[-32, 36], [6, 46], [38, 32]], { lw: lw * 0.6, stroke: pli });
      }, 0.14);
      g.restore();
    }
  });
}

/** Pose intermédiaire entre deux poses (k = 0..1), pour passer de l'une à l'autre en douceur.
 *  soeur(g, { pose: entre('repos', 'doua', k), paumes: k > 0.5 }) */
export function entre(a, b, k) {
  const A = POSES[a] || a, B = POSES[b] || b, m = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  return { L: [m(A.L[0], B.L[0]), m(A.L[1], B.L[1])], R: [m(A.R[0], B.R[0]), m(A.R[1], B.R[1])] };
}

/** En prosternation, vue de profil, le front au sol (tournée vers la gauche ; flip pour l'inverse).
 *  Origine = le sol, sous ses genoux. */
export function soeurSujud(ctx, o = {}) {
  at(ctx, o.x ?? 540, o.y ?? 1500, o.s ?? 1, g => {
    if (o.flip) g.scale(-1, 1);
    const t = o.t || 0, b = wave(t, 0.2) * 3;
    const skin = o.skin || '#c48a5f', voile = o.voile || '#f2e2cf', robe = o.robe || '#7f9a8c', ink = o.ink || N.ink;
    const R = { fill: robe, stroke: ink, lw: 4.5 }, pli = shade(robe, -0.22), pliV = shade(voile, -0.17);
    ell(g, -50, 8, 340, 26, { fill: 'rgba(30,20,50,0.3)', stroke: false, tex: false, amp: 0 });
    // le corps replié : des pieds (à droite) au dos, jusqu'aux épaules
    blob(g, [[214, -4], [236, -66], [198, -152], [122, -228 + b], [22, -252 + b], [-78, -224 + b], [-160, -172], [-214, -120], [-226, -60], [-150, -8], [-40, 0], [90, 2]], { ...R, seed: 681 });
    line(g, [[120, -160], [70, -92], [86, -20]], { lw: 3.5, stroke: pli });
    line(g, [[-20, -170], [-60, -100], [-30, -24]], { lw: 3.5, stroke: pli });
    // l'avant-bras et la main posés au sol
    manche(g, [[-176, -104], [-250, -56], [-312, -26]], 60, 54, { ...R, seed: 682 });
    ell(g, -346, -18, 34, 15, { fill: skin, stroke: ink, lw: 4, seed: 683 });
    // le voile : la tête repose au sol
    blob(g, [[-116, -200 + b * 0.5], [-190, -194], [-262, -166], [-318, -118], [-338, -60], [-318, -12], [-258, -2], [-214, -30], [-176, -84], [-128, -134]], { fill: voile, stroke: ink, lw: 4.5, seed: 684 });
    line(g, [[-150, -176], [-226, -128], [-268, -40]], { lw: 3.5, stroke: pliV });
    line(g, [[-204, -178], [-282, -112], [-306, -34]], { lw: 3, stroke: pliV });
  });
}
