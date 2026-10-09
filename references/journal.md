# Journal : ce que chaque série a appris

L'histoire datée du skill. Chaque piège ci-dessous a coûté une reprise. L'essentiel est repris dans
`SKILL.md` ; ici, le détail et le contexte. « D.C. » est son frère, qui a mis le skill au point avec elle.
À compléter après chaque série : ce qui a coincé, pourquoi, ce qu'on fait désormais.

## Premier cours, 2026-10-04 (sourate Ash-Sharh, mode dessiné)

- **Boucle de transcription** : sur une longue récitation en arabe, Whisper s'est mis à répéter la
  même phrase chaque seconde et aurait gâché la suite. `transcrire.mjs` coupe donc le contexte entre
  deux fenêtres (`-mc 0`) et travaille par morceaux.
- **La transcription invente au silence** (« Sous-titrage Société Radio-Canada ») et **saute les
  hésitations** : d'où l'alerte « parole non écrite » et le texte de référence.
- **Cale mot à mot** : l'heure des mots vient de `-dtw` avec `-nfa` (sans `-nfa`, pas d'heure).
- **L'heure d'un mot est juste à 0,1 ou 0,3 s près.** Une coupe posée à l'heure du mot a laissé un
  bout de mot : « de facilité » s'entendait « de difficultés » à la réécoute, et « des fois »
  devenait « fois ». `extrait.mjs` pose donc chaque coupe dans le vrai silence voisin (80 ms avant
  le mot qui reprend) et liste les écarts écrit / entendu. Après toute coupe à l'intérieur d'une
  phrase, relire ces écarts.
- **Un silence mesuré est un silence**, même si un mot semble y tomber : un silence de 1,9 s était
  resté parce que l'heure d'un mot tombait dedans.
- **Short 12, repris le 2026-10-04 sur remarque de D.C.** : deux coupes à 0,5 s d'écart laissaient
  « les » et « bonnes » à moitié mangés, une autre tombait en pleine phrase, et la visio avait décroché
  0,4 s juste là. Refait avec un seul raccord par endroit, dans les silences. D'où la marche à suivre
  « quand elle dit que le son a un défaut ».
- **Audit des 11 autres shorts (2026-10-04, D.C. : « améliore toutes les autres »)** : une vingtaine
  de bords mal placés. Quatre shorts commençaient dans l'attaque du premier mot, trois finissaient
  sur le début de la phrase suivante, et le 06 gardait une reprise de phrase. Tous venaient de
  l'heure des mots prise pour une heure exacte. D'où `audit.mjs`, obligatoire avant de rendre.
- **La voix avant l'image** : toute reprise de la voix (coupe, silence) change l'heure des mots.
  Il faut rendre l'image à nouveau, sinon les sous-titres se décalent.
- **Reconnaître la voix par sa hauteur ne marche pas** : enseignante et élèves ont la même. On se
  fie au contexte, et elle écoute.
- **Fondu entre deux plans** : en fondu enchaîné, le personnage de face et le personnage de dos se
  superposaient. Le fondu passe maintenant par la nuit.
- **Hachures claires sur décor sombre** : elles faisaient « pluie ». Texture allégée.
- **Lune dans la zone de texte** : elle se place sous y 600.
- **Calcul du calage** en double précision : en simple précision, le texte se décalait de 100 mots.

## Deuxième cours, 2026-10-07 (sourate Ad-Duha, mode dessiné)

- **Quand elle parle du Prophète ou des anges, personne à l'image, pas même elle.** Premier jet :
  elle apparaissait de dos sur « Allah n'a cessé de veiller sur Son messager », et des lucioles
  ajoutées autour d'elle sur « Il met autour de moi des anges ». Repris : paysage seul (`orage` avec
  `elle: false`, `ciel`, `aube` avec `elle: false`). Elle entre dans l'image quand la phrase revient
  à nous (« mon Rabb à moi aussi, à chacune »).
- **Pas de flamme sur le mot « enfer »** ni sur une menace : la bougie devient un feu. Prendre le
  ciel ou l'aube.
- **Une formule de salutation avalée par la transcription** (« salla Llahu 'alayhi wa sallam » dite
  vite) : les cinq mots s'allumaient d'un coup, et le mot suivant partait 0,6 s trop tôt. La poser
  à la main entre accolades, avec `outils/autour.mjs` pour lire les heures dans le cours.
- **Dans un bloc entre accolades**, les signes `:` `?` `!` `«` `»` restent collés à leur mot
  (`extrait.mjs` s'en charge). Avant, un « : » seul comptait pour un mot.
- **L'alerte « parole non écrite » se calcule avant les blocs posés à la main** : elle reste
  affichée même quand le bloc couvre le passage. Vérifier dans `words.json` que les mots y sont.
- **Une légende sur ciel clair** (tableau `aube`) : la ligne de source, dorée, se perdait dans le
  ciel. `legende` pose maintenant une ombre douce derrière le texte.
- **Une légende a besoin de 8 à 10 secondes à l'écran.** Si le premier plan est plus court, le
  prolonger plutôt que d'enchaîner un autre plan.
- **Un repère de plan cherche le début du mot tel qu'il est écrit** : « obscurité » ne trouve pas
  « d'obscurité ». Écrire `"d'obscur"`, ou donner le numéro du mot.

## Mode B : premier short fini (Ad-Duha, « Tu n'es pas toute seule », 2026-10-07)

D.C. : « c'est à toi d'aller trouver les b-rolls parfaits », puis « fais celle qui a le meilleur
hook en mode B pour tester ». Il a dit oui au téléchargement de 6 plans (64 Mo), demandé avec la
liste : nom, source, poids. Dossier : `cours/ad-duha-1/mode-b/02-pas-toute-seule/`, plans dans
`cours/ad-duha-1/banque/`.

Comment chercher sur Pexels sans perdre de temps :

- Page de recherche en vertical : `https://www.pexels.com/search/videos/?q=<mots en anglais>&orientation=portrait`.
- Le bandeau de cookies revient à chaque page : cliquer « Tout refuser ». Tant qu'il est là, une
  grille de vignettes posée par-dessus la page ne s'affiche pas.
- Voir une vignette à coup sûr : ouvrir l'image seule,
  `https://images.pexels.com/videos/<id>/<nom>.jpeg?auto=compress&w=400` (le nom se lit dans la page).
- L'adresse du fichier : lire la page de la vidéo et y chercher `videos.pexels.com/video-files/<id>/..._1080_1920_...mp4`.
- Le poids avant d'en parler : `curl -sI <adresse>` (ligne content-length). Rien n'est téléchargé.

Ce qui a marché pour l'image :

- **Un arc en cinq plans** : seule sur la plage en noir et blanc, le chemin dans la brume, les
  passants flous, les rayons qui percent le nuage, puis une femme voilée de dos face au soleil. La
  couleur arrive avec « Allah, Il répond ».
- **Pour « sans visage »** : silhouettes à contre-jour, dos, passants flous. Les recherches
  « mains en dou'a » donnent surtout des visages, des hommes, ou des gestes d'autres religions
  (les mots du nom de fichier le disent : amen, buddhism). Vernis à ongles visible : écarté.
- **Regarder la fin de chaque plan** : un véhicule entrait dans le chemin de brume, une voiture
  dans les passants. Réglage `debut` pour rester sur le début.
- **Pas deux plans de 3 secondes sur la chute** : le dernier plan tient jusqu'au bout, avec un
  léger ralenti (`vitesse: 0.85`) si la vidéo est trop courte. Le plan en trop reste dans la
  banque (`reserve` dans `plans.json`).
- **Le fond sonore suit l'image autant que le thème** : pas de pluie sur une plage sans pluie.
  Ici : mer, pluie légère sur la brume et la ville, mer.
- Dans une fiche, écrire « vidéos gratuites de la banque Pexels », et donner la page de chaque plan.

## Mode B : toute une série (Ad-Duha, les 10 autres shorts, 2026-10-07)

D.C. : « fais les autres en mode B ». Oui donné pour 25 vidéos (306 Mo) « et les remplaçants si
besoin ». Aucun remplaçant n'a servi : les 25 étaient bonnes une fois vues.

**Une banque pour le cours, pas des plans par short.** 31 vidéos servent 11 shorts (60 plans) :
chaque vidéo revient deux ou trois fois dans la série, jamais deux fois dans le même short, et à
un autre endroit (`debut`). Lister d'abord les idées d'image de tous les shorts, regrouper celles
qui se ressemblent, puis chercher une vidéo par idée. Fichiers : `banque/manifeste.tsv`
(nom, numéro Pexels, fichier, titre de la page) et `banque/pages.json` (nom -> page). Depuis le
2026-10-09 la banque est à la racine du skill (`banque/`, 31 vidéos) : tous les cours s'en servent.

**Chercher sans voir les vignettes.** Si l'onglet du navigateur est en arrière-plan
(`document.visibilityState` vaut `hidden`), les captures d'écran restent figées sur une vieille
image : inutile d'insister. Ce qui marche quand même :

1. Depuis une page de pexels.com, lire les pages de recherche par le code de la page
   (`fetch('/search/videos/?q=...&orientation=portrait')`) et en sortir, pour chaque résultat, le
   numéro et le titre de la page. Le titre décrit bien les plans de nature.
2. Lire de la même façon la page de chaque vidéo retenue pour avoir ses fichiers
   (`videos.pexels.com/video-files/<numéro>/..._1080_1920_...mp4`, et une version 720 plus légère).
3. Lire le poids avec `curl -sI`, donner la liste à D.C. (nom, source, poids, total), attendre son oui.
4. Après téléchargement, tirer trois images de chaque vidéo et les regarder toutes. C'est là que
   le plan se juge.

**Recherches qui donnent mal** : « lantern night » (fêtes de lanternes d'autres cultures),
« holding hands » (couples, hôpital), « hands raised sky » (couples, poses), « light end of
tunnel » (souterrains), « woman window » (femmes non voilées, de face). Ne pas insister, changer d'idée.

**Règles d'image apprises ici**

- **Pas de livre pour figurer le Coran**, encore moins une bougie posée dessus. Quand elle dit
  « Sa parole », « les versets », « le Coran » : la lumière, le ciel, le sentier. Un livre
  quelconque ne sert que pour une idée neutre (« il est dit dans le tafsir », « la garder »).
- **Prophète, anges, parole rapportée** : ciel étoilé, lune, nuages, mer de nuages. Jamais une
  personne, même de dos.
- **La femme voilée de dos** arrive quand la phrase parle de nous (« mon Rabb à moi aussi »,
  « j'ai besoin de mon Créateur », la dou'a).
- **Un plan presque noir** (la lune cachée par les nuages) tient 4 secondes sur « je ne vois que
  du noir », pas 10. Choisir avec `debut` le moment où la lune se voit.
- **Une idée dite au premier degré** fait les meilleurs plans : « l'eau fraîche » = une eau claire
  qui court ; « je prends de la hauteur » = au-dessus des nuages ; « la destination » = un chemin
  vers le soleil.

**Réglages ajoutés à l'outil**

- Vidéo plus courte que le plan : elle est ralentie toute seule (jusqu'à 40 %). Sous 26 images par
  seconde, les images sont fondues entre elles pour ne pas saccader.
- `vitesse` au-dessus de 1 accélère (une rose qui s'ouvre : `1.8`).
- Fond sonore `vent` (vent léger, fabriqué par `outils/ambiance.mjs`) pour le ciel, la montagne,
  la forêt. Règle : la mer pour la mer, la pluie pour la pluie et la brume, le vent pour le reste.
- `node outils/livrer.mjs <cours> <dossier> --mode-b` : livre `<cours>/mode-b`, et la fiche liste
  chaque plan avec le moment où il entre et sa page Pexels.
- Étalonnage un peu moins sombre (les plans de nuit se bouchaient sur un téléphone).
- **Un plan avec des personnes se regarde seconde par seconde**, pas sur trois images. Dans le plan
  des trois femmes de dos, l'une tourne la tête pendant deux secondes et son profil se voit : les
  trois images tirées tombaient à côté, c'est l'image d'aperçu qui l'a montré. `debut: 4` pour
  rester sur la partie où elles sont toutes de dos.
  `ffmpeg -i plan.mp4 -vf "fps=1,scale=270:-2,tile=5x2" -frames:v 1 planche.png`
- **Un objet lumineux au bord du cadre** (la lune) sort de l'image avec le zoom : le prendre au
  moment où il est vers le centre, ou changer de plan.

## Un message vocal à la place d'un cours (2026-10-09)

D.C. envoie parfois un simple message vocal de sa sœur (20 à 40 secondes, enregistré au téléphone),
sans rien dire d'autre : c'est un short à faire, en mode B. Premier cas : `cours/note-2026-10-09/`
(« Ton cœur est serré ce soir »), livré dans `~/Desktop/SHORTS - messages vocaux/`.

1. **Un dossier par message**, traité comme un tout petit cours :
   `node outils/transcrire.mjs <message.m4a> cours/note-AAAA-MM-JJ`, puis le short dans
   `cours/note-AAAA-MM-JJ/mode-b/01-<nom>/`.
2. **Chercher une récitation que la transcription n'a pas écrite.** Ici, deux secondes d'arabe
   (« A lam nashrah laka sadrak ») étaient passées sous silence, et l'heure de « N'oublie pas »
   était fausse de quatre secondes. Mesurer où elle parle (`silencedetect` à -30 dB, 0,1 s), puis
   transcrire à part chaque morceau qui n'a pas de mots. Le verset et la phrase mal calée se posent
   à la main entre accolades.
3. **Pas le nettoyage du cours.** Un téléphone est déjà plus clair que la visio (mesuré : présence
   à -11 dB sous le grave, contre -15 dB pour la voix du cours une fois nettoyée). Mettre dans
   `coupe.json` un `"son"` sans égalisation : passe-haut, souffle léger, porte douce
   (`agate`, pour baisser les respirations de 9 dB sans les couper), dé-esseur, compresseur, volume.
4. **Garder ses pauses.** Elle parle lentement, exprès. `"resserrer": 1.0, "pause": 1.0` (une seconde
   au plus), `"hesitations": false`. Retirer seulement le silence du début et les petits bruits isolés.
5. **Début de la voix** : laisser 0,15 s avant le premier mot (`"exact"`), pas 0,03 s.
6. Le contrôle signale alors « silence de 1,0 s » : c'est voulu. Le dire dans le bilan.
7. Aucune traduction à l'écran si elle ne la dit pas : la translittération seule, et la question
   posée dans la fiche.
