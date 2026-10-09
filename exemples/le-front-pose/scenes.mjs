// « Le front posé sur le sol » : la prosternation qui décharge le dos de son poids.
export default ({ E }) => {
  const T = E.tableaux, io = E.ease.io;
  return {
    titre: ['Le front posé', 'sur le sol'],
    scenes: T.plans([
      // elle est prosternée, le poids est sur son dos, puis il s'envole au mot « décharger »
      [0, 'sujud', S => ({ fardeau: S.k(S.w('décharg'), S.w('lourd') + 1.4) }), { cam: { from: [540, 1010, 1.0], to: [560, 1090, 1.16] } }],
      ['Donc', 'plage', S => ({ pose: E.entre('repos', 'coeur', io(S.k(S.w('bienfait') - 0.4, S.w('bienfait') + 0.6))), eyes: 'closed', mouth: 'smile' })],
      ['poser', 'sujud', {}, { plus: (g, S) => E.lucioles(g, [300, 800, 600, 420], 12, S.t, 23) }],
      ['légère', 'ciel', { filante: [1.0, 2.6] }, { lead: 0.9 }],
      ['sens-là', 'mains', {}],
    ]),
  };
};
