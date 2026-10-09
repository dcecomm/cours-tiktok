# Le moteur : tableaux, personnage, texte

Tout se dessine sur une image **1080 x 1920** (y vers le bas), par du code. `scenes.mjs` reçoit `E`
(le moteur entier). Le tiers haut (y 200 à 600) reste calme : c'est la place du titre et des sous-titres.

```js
export default ({ E }) => ({
  titre: ['Deux lignes', 'au plus'],      // en haut, toute la vidéo
  tail: 1.6,                              // secondes gardées après son dernier mot
  scenes: E.tableaux.plans([ [mot, 'tableau', options, réglages], ... ]),
});
```

## Un plan

`[mot d'entrée, tableau, options, réglages]`

- **mot d'entrée** : numéro du mot dans `texte.txt` (`node outils/texte.mjs <short> --cherche racine`),
  ou le début du mot (`'épreuv'`). Le premier plan est toujours `0`. Le fondu commence 0,6 s avant le mot.
- **options** : un objet, ou une fonction `S => objet` pour animer.
- **réglages** : `{ cam, lead, transDur, plus: (g, S) => dessin par-dessus }`.

`S` : `S.t` temps de la vidéo, `S.lt` temps depuis le début du plan, `S.p` avancée du plan (0..1),
`S.dur` durée du plan, `S.w(mot)` seconde (dans le plan) où elle dit ce mot, `S.k(a, b)` avancée
0..1 entre deux secondes du plan. Adoucir : `E.ease.io(...)`.

Caméra : par défaut un mouvement lent qui alterne d'un plan à l'autre. Sinon
`cam: { from: [cx, cy, zoom], to: [cx, cy, zoom] }` ou `cam: S => [cx, cy, zoom]`.

## Les tableaux

| Tableau | Ce qu'on voit | Options propres |
|---|---|---|
| `plage` | elle, assise sur la plage au crépuscule, lanterne, thé | `the: false` |
| `plageDos` | elle de dos, face à la mer | |
| `veranda` | intérieur chaud, arche sur la mer, bougies, plante | `the: false` |
| `jardin` | jardin tropical de nuit, lanternes, lucioles | |
| `lac` | lac de montagne à l'heure bleue | `the: false` |
| `ensemble` | deux femmes dans la véranda, l'une parle, l'autre écoute | `amie: { ... }` |
| `sujud` | en prosternation face à la mer | `fardeau: 0..1` (les pierres posées sur son dos s'envolent) |
| `mains` | gros plan, deux mains ouvertes vers le ciel | |
| `flamme` | gros plan, une bougie dans le noir chaud | |
| `ciel` | le ciel seul, la lune, deux palmes | `filante: [début, fin]` (secondes du plan) |
| `orage` | la plage sous les nuages et la pluie, qui se dégage | `k: 0..1` (couvert .. dégagé), `elle: false` |
| `passage` | deux falaises et, entre elles, une voie qui s'ouvre sur la lumière | `k: 0..1` |
| `barque` | une barque et sa lanterne sur la mer de nuit | `x`, `y`, `s` |
| `sentier` | un sentier de lanternes qui monte vers les montagnes | `k: 0..1` (elles s'allument une à une) |
| `pierre` | un rocher sur la plage, et des lanternes à côté | `l1`, `l2` : 0..1 |
| `terrier` | une butte et son petit trou, dans le jardin | `orbes: [k, k]`, `eclat: 0..1` |
| `aube` | la plage au lever du jour, ciel clair, sans étoiles | `elle: false` (paysage seul, pour une légende), `the: false` |

Quand elle rapporte une parole d'Allah, parle d'un prophète ou des anges : `ciel`, `flamme`, `mains`, ou un
paysage seul (`orage` et `aube` avec `elle: false`). Jamais un personnage, pas même elle. Pas de flamme sur le mot « enfer ».

## Elle (options du personnage, dans tous les tableaux où elle est)

| Option | Valeurs |
|---|---|
| `pose` | `repos` (mains sur les genoux) · `doua` (paumes ouvertes) · `coeur` (main sur le cœur) · `tasse` · `livre` · `parle` (main ouverte), ou `E.entre('repos', 'doua', k)` pour passer de l'une à l'autre |
| `eyes` | `open` · `closed` · `happy` |
| `mouth` | `smile` · `soft` · `flat` |
| `coeur` | 0..1 : une lueur douce sur la poitrine (le cœur qui s'apaise, qui s'ouvre) |
| `hold` | ce qu'elle tient : `h => E.the(h, 0, 30, 0.8, { t: S.t })` (pose `tasse`), `h => E.livre(h, 0, 46, 1, { lueur: 1 })` (pose `livre`) |
| `robe`, `voile`, `skin` | couleurs |

Elle ne parle pas à l'image : sa voix raconte, l'image accompagne. Pas de bouche qui bouge.

## Le texte à l'écran

- **Titre** : `titre` du short. Georgia italique, doré.
- **Sous-titres** : les mots de `texte.txt`, une ou deux lignes, coupés là où elle respire. Le mot
  dit s'éclaire, les mots à venir sont en retrait.
- **Légende** (une traduction qui est sur sa diapo, une référence de sourate), dans `plus` :
  `E.legende(g, ['« ligne 1', 'ligne 2 »', 'Sourate 94, versets 5 et 6'], alpha, 650)`.
  La dernière ligne est la source. Posée sur l'écran, la caméra ne la déplace pas.
  Elle reste 8 à 10 secondes. Pour la poser de 0,6 s jusqu'à une seconde donnée du plan :
  `const verset = (lignes, fin, y = 650) => (g, S) => { const f = fin ?? S.dur - 0.6; E.legende(g, lignes, Math.min(E.ease.io(S.k(0.6, 1.6)), 1 - E.ease.io(S.k(f - 1, f))), y); };`
  puis, dans le plan : `{ plus: verset(['« ligne 1', 'ligne 2 »', 'Sourate 93, verset 3'], 10.5) }`.

## Dessiner une image qui n'existe pas encore

Avec les primitives (`E.blob`, `E.ell`, `E.rect`, `E.limb`, `E.line`, `E.at`) et les éléments de
`engine/nature.js` (`ciel`, `mer`, `rivage`, `cocotier`, `lanterne`, `bougie`, `the`, `livre`,
`rocher`, `orbe`, `lueur`, `voileNuit`, `lucioles`, `fardeau`...). Une image qui sert à plusieurs
shorts devient un tableau dans `engine/tableaux.js` (et entre dans la liste `TOUS`).

Règles de dessin : jamais `Math.random` (utiliser `E.rng(seed)`, le rendu doit être rejouable) ;
une lumière se pose avec `lueur` après ce qu'elle éclaire ; `voileNuit` en dernier.

## Commandes

```bash
node engine/render.mjs <short> --planche 5          # planche de contrôle
node engine/render.mjs <short> --stills 12.5,40     # images pleine taille
node engine/render.mjs <short> --draft              # brouillon rapide
node engine/render.mjs <short> --jobs 5             # rendu final, réparti sur 5 processus
```
