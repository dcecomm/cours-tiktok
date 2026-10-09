---
name: cours-tiktok
description: >-
  Transforme la rediffusion d'un cours (2 à 3 heures, en visio) ou un simple message vocal en shorts
  verticaux pour TikTok : transcription gratuite sur l'ordinateur, choix des passages les plus forts,
  sa vraie voix nettoyée et rendue fluide, sous-titres calés mot à mot, image faite de vrais plans
  vidéo sans visage (nature, ciel, femme voilée de dos) ou dessinée par du code, fond sonore de mer,
  de pluie ou de vent, MP4 9:16 prêt à publier avec sa fiche. Aucun service payant. Déclenche dès
  qu'elle dit « fais-moi des shorts de ce cours », « découpe ma rediffusion », « sors les meilleurs
  passages », « fais un TikTok de ce passage », ou donne le fichier d'un cours ou un message vocal,
  même sans rien dire d'autre. Déclenche aussi pour corriger un short existant (un mot des
  sous-titres, une coupe, un plan, le titre, le son), pour installer ou vérifier le skill, et pour
  ajouter des vidéos à la banque.
---

# Des shorts à partir d'un cours

Elle donne le fichier d'un cours, ou un message vocal. On lui rend des vidéos de 20 secondes à
2 minutes, chacune sur une seule idée, avec sa voix, dans son univers. Elle relit, elle publie.

Tout est gratuit et tourne sur l'ordinateur : pas de voix de synthèse, pas de générateur d'images.
On ne paie que Claude.

**Avant la première fois, et quand quelque chose ne marche pas :**

```bash
node outils/verifier.mjs
```

S'il manque quelque chose, suivre `INSTALLATION.md`. Autres pages : `references/moteur.md` (le
dessin), `references/banque.md` (chercher et ajouter une vidéo), `references/journal.md` (ce que
chaque série a appris). Exemple complet d'un short dessiné : `exemples/le-front-pose/`.

## Les règles (elles passent avant tout le reste)

C'est un enseignement religieux, donné par une vraie personne, devant de vraies élèves.

1. **Sa voix, ses mots.** On coupe, on nettoie, on ne réécrit rien. Jamais de voix de synthèse,
   jamais de voix clonée. Sa voix n'est ni accélérée ni transformée.
2. **Aucune coupe ne change le sens.** On ne retire jamais une condition, une nuance, un « comme
   si ». Un passage qui ne tient pas sans son contexte ne se prend pas.
3. **Elle seule.** Jamais la voix d'une élève, jamais un prénom. Un passage où une élève parle se
   coupe ou se laisse. En cas de doute sur qui parle, on ne prend pas, et on le lui signale.
4. **Les sous-titres sont un texte relu**, pas une transcription brute (étape 4). Un verset, une
   invocation, un mot arabe : orthographe vérifiée, et signalée dans la fiche pour qu'elle relise.
5. **On ne représente ni Allah, ni les prophètes, ni les anges.** Quand elle en parle, il n'y a
   personne à l'image, pas même une femme de dos : le ciel étoilé, la lune, les nuages, la mer.
   Pas de lumières pour figurer les anges. Pas de flamme sur le mot « enfer ».
6. **Aucun livre ne figure le Coran.** Sur « Sa parole », « les versets », « le Coran » : la
   lumière, le ciel, le sentier. Pas de texte arabe à l'écran, sauf si elle fournit le texte exact.
7. **Rien ne s'affiche qu'elle n'ait dit ou écrit.** Une traduction à l'écran vient de sa diapo.
   Un verset qu'elle récite s'écrit en lettres latines, sans traduction si elle ne la dit pas.
8. **Aucun visage.** Dans les vraies vidéos : dos, silhouettes à contre-jour, passants flous, mains.
9. **Pas de musique.** Le fond sonore est un bruit de nature, très bas sous la voix.
10. **Un téléchargement se demande avant** : nom du fichier, d'où il vient, son poids. Sans son oui,
    on ne télécharge rien.
11. **Elle valide chaque vidéo avant de publier.** La fiche de chaque short lui dit quoi vérifier.

## Où ça vit

- Le skill : ce dossier. Moteur `engine/`, outils `outils/`, fonds sonores `assets/ambiance/`.
- La banque : `banque.json` (le catalogue : ce qu'on voit dans chaque vidéo, pour quelle idée, ses
  réglages) et `banque/` (les vidéos).
- Un cours : un dossier par cours, où elle veut (`Mes cours/2026-10-01/`). Les outils y créent
  `audio16k.wav`, `transcript.txt`, puis un dossier par short : `mode-b/NN-titre/` (vraies vidéos)
  ou `shorts/NN-titre/` (dessin).
- La livraison : un dossier de vidéos et de fiches, là où elle le demande (Bureau par défaut).

Dans la suite : `$SK` = ce dossier, `$C` = le dossier du cours, `$S` = le dossier d'un short.
Les commandes sont les mêmes sur Windows et sur Mac. Éviter les accents dans le chemin des dossiers
de cours sur Windows (la transcription peut ne pas les lire).

## Quel mode ?

| | Mode B : vraies vidéos | Mode A : dessin |
|---|---|---|
| L'image | des plans réels de la banque, sans visage | une femme voilée dessinée, nature à la tombée de la nuit |
| Quand | **par défaut** : c'est ce qu'elle attend | si elle le demande, ou si la banque manque |
| Fichier du short | `plans.json` | `scenes.mjs` |
| Rendu | `engine/render-b.mjs` | `engine/render.mjs` |

La voix, le titre et les sous-titres sont les mêmes dans les deux modes : les étapes 1 à 4 ne
changent pas. Un short peut exister dans les deux (`mode-b/` et `shorts/`), en copiant `coupe.json`,
`texte.txt`, `fiche.json` et le dossier `voice/`.

## Étape 1 : transcrire le cours

```bash
node $SK/outils/transcrire.mjs "<vidéo ou audio du cours>" $C
```

Whisper tourne sur l'ordinateur, par morceaux de 10 minutes. Si ça s'arrête, relancer la même
commande : elle reprend où elle en était. Compter 20 à 40 minutes pour 3 heures de cours sur un
ordinateur récent, plusieurs heures sur un PC sans carte graphique (le lancer le soir).
Sortie : `$C/transcript.txt`.

## Étape 2 : lire tout le cours et choisir

Lire `transcript.txt` **en entier** (les longues récitations en arabe et l'intendance se survolent).
Un bon passage :

- tient seul : on le comprend sans avoir suivi le cours ;
- porte une seule idée ;
- ouvre fort : une question que les gens se posent, une image, une phrase qui console ;
- se termine sur une phrase nette ;
- est dit d'un trait, sans trop d'hésitations (c'est ce qui fait une voix fluide) ;
- fait du bien : apaisement, espoir, se sentir comprise.

Ce qui marche : une question (« pourquoi moi ? »), une image (« les lunettes du Coran »), une
subtilité expliquée simplement (« une difficulté, deux facilités »), une phrase qui reconnaît la
douleur (« ta peine est reconnue »), un geste concret (« après le salâm, reste un instant »).

Ce qu'on laisse : l'organisation du cours, les corrections de récitation, les échanges avec les
élèves, ce qui renvoie à « la semaine dernière ».

Compter 15 à 25 passages possibles par cours de 3 heures, 8 à 11 vraiment forts. Lui donner la
liste (titre, minutes, pourquoi) avant de produire, sauf si elle a dit de tout faire d'un coup.

## Étape 3 : couper la voix

```bash
node $SK/outils/extrait.mjs $C --mots 9238 9586      # les phrases du passage, avec l'heure et les pauses
```

Écrire `$S/coupe.json` (temps en secondes du cours) :

```json
{ "segments": [[9394.28, 9427.15]], "retirer": [[9415.95, 9416.92]] }
```

- `segments` : ce qu'on garde. Plusieurs segments = on saute ce qu'il y a entre eux.
- `retirer` : petites coupes à l'intérieur (une reprise de phrase, un prénom, un aparté).
- Commencer sur le premier mot d'une phrase forte, finir juste après le dernier mot.

```bash
node $SK/outils/extrait.mjs $C $S
```

L'outil pose chaque coupe dans un creux entre deux mots, enchaîne en fondu de 30 ms, retire les
« euh » isolés, ramène à 0,5 s les silences de plus de 0,75 s, puis nettoie le son d'une visio
(sourd, inégal) et le met à -16 LUFS. Il signale trois choses, qui se lisent **une par une** :

- **parole non écrite** : un son entre deux mots que la transcription n'a pas rendu (hésitation,
  mot arabe, récitation). On coupe (`retirer`) ou on l'écrit dans le texte de référence ;
- **écrit / entendu** : un mot du texte de référence que la transcription entend autrement. Souvent
  ce n'est rien (« Rabb » entendu « robe »). Près d'une coupe, c'est le signe qu'un bout de mot est
  resté : on déplace la coupe et on relance ;
- **entendu en plus du texte** : un bout de mot resté après une coupe, ou un mot oublié dans le texte.

Puis, **toujours**, l'audit des raccords :

```bash
node $SK/outils/audit.mjs $C $S              # chaque bord de coupe tombe-t-il dans un silence ?
node $SK/outils/autour.mjs $C 9504.62        # silences mesurés et mots autour d'un instant du cours
```

Un short se livre quand l'audit dit « tous dans un silence ». Les règles :

- **L'heure d'un mot est juste à 0,1 ou 0,3 s près.** Une coupe posée à l'heure du mot mange son
  attaque. On coupe dans le silence voisin, 100 ms avant le mot qui reprend.
- **Un silence de moins de 0,1 s peut être le creux d'une consonne** (le « t » de « forte »). On ne
  reprend pas dedans : on prend le vrai silence d'avant. Une coupe au centième près se marque
  `"exact"` : `[9210.355, 9211.93, "exact"]`.
- **Une reprise de phrase se retire en entier.** Pour savoir ce qui est dit dans une hésitation,
  transcrire le petit bout seul.
- **On ne laisse pas un demi-groupe de mots**, et pas deux coupes à moins d'une seconde l'une de l'autre.
- **Toute reprise de la voix change l'heure des mots** : il faut rendre l'image à nouveau.

## Étape 4 : le texte de référence

Écrire `$S/texte.txt` : exactement ce qu'elle dit dans le short, bien orthographié, bien ponctué.
C'est ce texte qui s'affiche. La transcription ne sert plus qu'à donner l'heure de chaque mot.

Pourquoi : la transcription change d'une écoute à l'autre et se trompe (« de facilité » est devenu
« de des difficultés » sur un essai). Sur un enseignement religieux, un mot faux est une faute
grave. On croise deux écoutes (`transcript.txt` et la sortie de `--mots`), on tranche, et un doute
se note dans la fiche (`aVerifier`).

- Un verset récité en arabe s'écrit en lettres latines, à sa place. Si la transcription ne l'entend
  pas, on le pose à la main entre accolades, avec ses secondes dans le short :
  `{39.35-41.20: Fa inna ma'al-'usri yusrâ.}`. Même chose pour une formule dite très vite
  (« salla Llahu 'alayhi wa sallam ») dont les mots s'allument d'un coup.
- Un lapsus se garde tel qu'elle le dit, ou le passage se coupe, ou elle redit la phrase (plus bas).
  On ne corrige pas à l'écran ce qu'on entend autrement.

```bash
node $SK/outils/extrait.mjs $C $S --texte    # recale le texte sur la voix, sans refaire le son
node $SK/outils/texte.mjs $S                 # relire les sous-titres tels qu'ils seront à l'écran
node $SK/outils/texte.mjs $S --cherche sagesse moment     # le numéro d'un mot
```

## Étape 5, mode B : de vrais plans vidéo

**1. Découper le discours en idées de 4 à 10 secondes** et écrire `$S/plans.json` :

```json
{ "titre": ["Tu n'es pas", "toute seule"],
  "ambiance": [{ "mot": 0, "son": "mer" }, { "mot": 20, "son": "pluie" }, { "mot": 44, "son": "mer" }],
  "plans": [
    { "mot": 0,  "fichier": "seule-face-mer.mp4", "note": "seule sur une plage : seule face au monde" },
    { "mot": 20, "fichier": "brume-chemin.mp4", "note": "un chemin dans la brume : le doute", "debut": 0.5 },
    { "mot": 44, "fichier": "rayons-nuages.mp4", "note": "les rayons percent le nuage : Allah répond" },
    { "mot": 66, "fichier": "dos-coucher-soleil.mp4", "note": "de dos face au soleil : t'es pas toute seule", "vitesse": 0.85 } ] }
```

- `mot` : le numéro du mot où le plan entre. `note` : ce que le plan montre, et pourquoi là.
- `fichier` : une vidéo de la banque. **Choisir dans le catalogue** :
  `node $SK/outils/banque.mjs cherche doute brume` ou lire `banque.json`. Chaque vidéo y est décrite
  (ce qu'on voit, pour quelle idée) avec ses réglages sûrs : les respecter.
- `debut` (seconde de la vidéo où l'on commence), `vitesse` (0.85 ralentit, 1.8 accélère), `zoom`
  ([départ, arrivée]), `legende` (trois lignes : une traduction de sa diapo, la source en dernier).
- Une vidéo plus courte que le plan est ralentie toute seule.
- `ambiance` : la mer pour la mer, la pluie pour la pluie et la brume, le vent pour le ciel, la
  montagne, la forêt. Le son suit l'image : pas de pluie sur une plage sans pluie.
- `titre` : 2 à 5 mots pris dans ce qu'elle dit, sur une ou deux lignes.

**2. Ce qui fait un bon découpage**

- **La première image est la plus forte**, et elle dit le sujet : une silhouette seule, la pluie le soir.
- **Un arc** : l'épreuve (pluie, brume, orage, noir et blanc), puis la réponse (la lumière qui
  perce), puis l'apaisement (le soleil, la femme de dos face à l'horizon). La couleur et la
  lumière arrivent avec la phrase qui console.
- **L'idée dite au premier degré** donne les meilleurs plans : « l'eau fraîche » = une eau claire
  qui court ; « je prends de la hauteur » = au-dessus des nuages ; « la destination » = un chemin
  vers le soleil.
- **La femme voilée de dos** arrive quand la phrase parle de nous (« mon Rabb à moi aussi », « j'ai
  besoin de mon Créateur », une dou'a). Jamais quand la phrase parle du Prophète ou des anges.
- **Jamais deux fois la même vidéo dans un short.** D'un short à l'autre, oui, à un autre `debut`.
- **Pas deux plans de 3 secondes sur la chute** : le dernier plan tient jusqu'au bout.
- **Un plan presque noir** tient 4 secondes, pas 10.

**3. La planche, puis le rendu**

```bash
node $SK/engine/render-b.mjs $S --planche 3     # une image toutes les 3 s : la LIRE
node $SK/engine/render-b.mjs $S                 # le rendu
```

Sur la planche : un sous-titre lisible partout, le plan change quand l'idée change, rien de coupé au
bord du cadre, aucune image presque noire trop longtemps. Un plan qui manque dans la banque est
remplacé par un carton : c'est la maquette, pour juger le rythme avant de chercher une vidéo.

**4. S'il manque une image** : `references/banque.md` (chercher sur Pexels, demander son accord,
télécharger, regarder la vidéo seconde par seconde, l'inscrire au catalogue).

## Étape 5, mode A : le dessin

Écrire `$S/scenes.mjs`. Un short = un titre et une liste de plans. Un plan = le mot où il entre, un
tableau, ses options. Tout est décrit dans `references/moteur.md`.

```js
export default ({ E }) => {
  const T = E.tableaux, io = E.ease.io;
  return {
    titre: ['Pourquoi moi ?'],
    scenes: T.plans([
      [0, 'orage', { k: 0.04 }],
      [41, 'flamme', {}],
      [59, 'passage', S => ({ k: io(S.k(S.w(82) - 0.6, S.w(92) + 1.0)) })],   // le passage s'ouvre au mot 82
      [96, 'plage', { pose: 'doua', eyes: 'closed', mouth: 'smile' }],
    ]),
  };
};
```

- **Rythme** : un plan toutes les 6 à 15 secondes, au changement d'idée. Fondus lents. La caméra
  avance toujours, très doucement. C'est l'inverse d'une publicité.
- **L'image dit l'idée** : l'épreuve = le ciel couvert qui se dégage (`orage`), l'issue = le passage
  qui s'ouvre (`passage`), le poids qu'on dépose (`sujud` avec `fardeau`), avancer = le sentier de
  lumières (`sentier`), être accompagnée = `ensemble`, le jour qui monte = `aube`.
- **Le tiers haut de l'image reste calme** : c'est la place du titre et des sous-titres.
- Quand elle parle du Prophète ou des anges : `ciel`, `flamme`, `mains`, ou un paysage seul
  (`orage` et `aube` avec `elle: false`).

```bash
node $SK/engine/render.mjs $S --planche 5      # une image toutes les 5 s : la LIRE avant de rendre
node $SK/engine/render.mjs $S --jobs 5         # le rendu
```

## Étape 6 : monter, contrôler, livrer

```bash
node $SK/outils/montage.mjs $S                 # + sa voix + le fond sonore, -14 LUFS -> $S/out/short.mp4
node $SK/outils/controle.mjs $S                # mesure : volume, crête, silences, mots retrouvés à la réécoute
node $SK/outils/audit.mjs $C $S                # les raccords, une dernière fois
node $SK/outils/livrer.mjs $C "<dossier de livraison>" --mode-b     # sans --mode-b : les shorts dessinés
```

Le contrôle liste les mots du texte que la réécoute n'a pas rendus. Des mots arabes, un nom : c'est
normal. Un mot français près d'une coupe : la coupe l'a entamé, retour à l'étape 3.

Avant de livrer, écrire `$S/fiche.json` : `legende` (une ou deux phrases pour TikTok, avec ses
mots), `hashtags`, `coupes` (ce qu'on a retiré, en clair), `aVerifier` (ce qu'elle doit réécouter
ou valider : un mot incertain, un verset, une parole rapportée et sa source, une traduction, une
phrase qui se lit mal à l'écrit). La livraison donne par short une vidéo et une fiche du même nom
(avec, en mode B, la liste des plans et leur page d'origine), plus un `LISEZ-MOI.txt`.

**Ce qu'on lui dit en livrant** : combien de shorts, leurs titres, leur durée, et pour chacun ce qui
est à vérifier. On ne dit pas qu'une voix « sonne bien » : Claude n'entend pas. On dit ce qui a été
mesuré (volume, silences, coupes dans un silence, mots retrouvés) et on lui demande d'écouter.

## Un message vocal à la place d'un cours

Elle envoie un message vocal de 20 à 40 secondes, enregistré au téléphone, parfois sans rien dire
d'autre : c'est un short à faire, en mode B.

1. **Un dossier par message**, traité comme un tout petit cours :
   `node $SK/outils/transcrire.mjs <message.m4a> <dossier>/note-AAAA-MM-JJ`, puis le short dans
   `note-AAAA-MM-JJ/mode-b/01-<nom>/`.
2. **Chercher une récitation que la transcription n'a pas écrite.** Mesurer où elle parle, puis
   transcrire à part chaque morceau sans mots. Sur le premier message, deux secondes d'arabe
   étaient passées sous silence et la dernière phrase était calée quatre secondes trop tôt. Le
   verset et la phrase mal calée se posent à la main entre accolades.
3. **Pas le nettoyage du cours.** Un téléphone est déjà plus clair qu'une visio. Dans `coupe.json` :

```json
{ "segments": [[1.40, 21.76, "exact"]], "resserrer": 1.0, "pause": 1.0, "hesitations": false,
  "son": ["highpass=f=80", "afftdn=nr=6:nf=-55:tn=1", "agate=threshold=0.022:ratio=2:range=0.35:attack=10:release=250:knee=4",
          "deesser=i=0.25", "acompressor=threshold=-21dB:ratio=2.2:attack=12:release=180:makeup=2dB:knee=6dB",
          "alimiter=limit=-1.5dB:level=disabled", "loudnorm=I=-16:TP=-1.5:LRA=7", "aresample=48000"] }
```

4. **Garder ses pauses** (une seconde au plus) : elle parle lentement, exprès. Les respirations
   sont baissées par la porte (`agate`), pas coupées. On retire seulement le silence du début et
   les petits bruits isolés. Laisser 0,15 s avant le premier mot.
5. Le contrôle signale alors « silence de 1,0 s » : c'est voulu, le dire dans le bilan.

## Quand un mot est dit pour un autre : elle redit la phrase

La coupe ne répare pas un lapsus. On lui donne la phrase exacte à redire, elle l'enregistre au
téléphone (au calme, à 20 cm), et on la pose à la place :

```json
{ "segments": [[772.36, 813.05]],
  "reprises": [{ "fichier": "reprises/front.m4a", "de": 0.4, "a": 3.9, "remplace": [796.2, 801.9] }] }
```

`remplace` : le passage du cours qui saute. `de` / `a` : la partie utile de son enregistrement. Le
texte de référence prend la phrase corrigée. La reprise ne sonnera jamais exactement comme le
cours : la poser sur une phrase entière, entre deux respirations. (Essayé avec un faux
enregistrement, pas encore avec un vrai téléphone.)

## Corriger un short

| Elle dit | On fait |
|---|---|
| « ce mot est mal écrit » | corriger `texte.txt`, `extrait.mjs --texte`, rendre, monter |
| « coupe cette phrase » | ajouter à `retirer` dans `coupe.json`, corriger `texte.txt`, `extrait.mjs`, rendre, monter |
| « on entend une élève » | retirer le passage, ou abandonner le short |
| « change le titre » | `plans.json` (ou `scenes.mjs`), rendre, monter |
| « je n'aime pas cette image » | changer le `fichier` du plan (`banque.mjs cherche ...`), planche, rendre, monter |
| « on voit un visage », « ce plan me gêne » | regarder la vidéo seconde par seconde (`banque.mjs planche <nom>`), changer `debut` ou de vidéo, et noter le réglage dans `banque.json` |
| « le bruit de fond est trop fort » | `montage.mjs $S --niveau -22` (dB sous la voix, -17 par défaut) |
| « le son a un défaut », « c'est haché » | voir ci-dessous |

### Quand elle dit que le son a un défaut

Claude n'entend pas. Il cherche donc, dans l'ordre :

1. **Une coupe qui hache un mot.** `audit.mjs` liste les bords en pleine parole, `autour.mjs` montre
   les silences et les mots autour de chacun. Si un bord tombe en pleine parole, élargir la coupe
   jusqu'au silence voisin, quitte à retirer un bout de phrase de plus.
2. **Deux coupes à moins d'une seconde l'une de l'autre** : garder un seul raccord.
3. **Un trou de la visio** (`node $SK/outils/defauts.mjs $C $S`). L'enregistrement décroche parfois
   0,1 à 0,4 s, et ce qui suit est abîmé. On coupe autour.
4. **Réécouter par la transcription** la voix refaite (`controle.mjs`) : la phrase doit revenir entière.

Puis lui dire ce qui a été trouvé, ce qui a été changé, ce qui vient de l'enregistrement et ne se
répare pas, et lui demander ce qu'elle entend encore, à quelle seconde.

## Les pièges qui ont coûté le plus cher

Le détail de chacun est dans `references/journal.md`.

- **La transcription saute les récitations en arabe et invente au silence.** Toujours chercher les
  « paroles non écrites », et ne jamais afficher la transcription brute.
- **L'heure d'un mot n'est pas une heure de coupe.** On coupe dans un vrai silence, et on relit le
  contrôle : un mot français absent à la réécoute, c'est une coupe à reprendre.
- **Un plan avec des personnes se regarde seconde par seconde**, pas sur trois images : un profil
  peut apparaître deux secondes.
- **Un objet lumineux au bord du cadre** (la lune) sort de l'image avec le zoom.
- **Regarder la fin de chaque vidéo** : un véhicule, une voiture, un passant de face.
- **Une légende a besoin de 8 à 10 secondes à l'écran.**
- **Le numéro du mot change quand le texte change** : revérifier les `mot` de `plans.json` après
  toute correction du texte.
- **Si les captures d'écran du navigateur restent figées**, l'onglet est en arrière-plan : ne pas
  insister, passer par la lecture du code de la page (`references/banque.md`).

Après chaque série, ajouter au journal ce qui a coincé, et ici si c'est une règle qui vaut pour toujours.
