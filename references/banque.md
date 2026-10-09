# La banque de vrais plans (mode B)

Le catalogue est `banque.json`, à la racine du skill. Les vidéos sont dans `banque/`. Elles viennent
de Pexels, une banque de vidéos gratuites.

```bash
node outils/banque.mjs                      # ce qu'il y a, ce qui manque
node outils/banque.mjs cherche doute brume  # les vidéos dont la description parle de ça
node outils/banque.mjs planche <nom>        # une image par seconde, pour revoir une vidéo
node outils/banque.mjs installer            # dit ce qui manque et combien ça pèse
node outils/banque.mjs installer --oui      # télécharge ce qui manque (après son accord)
```

Pour chaque vidéo, le catalogue dit : `voit` (ce qu'on y voit, vérifié image par image), `pour`
(les idées qu'elle sert), `reglages` (ce qu'il faut respecter : un `debut` obligatoire, une fin à
éviter, une durée maximale), sa durée, et sa page d'origine.

## Avant de chercher une nouvelle vidéo

La banque couvre déjà : la mer (calme, agitée, vagues), le ciel (étoiles, lune, nuages, rayons,
au-dessus des nuages), la pluie (vitre, feuilles), la brume, la forêt, un chemin vers le soleil,
l'eau claire, un lac de montagne, une bougie, des livres et des bougies, le thé, une rose qui
s'ouvre, des oiseaux, un banc vide, des passants flous, et quatre plans de femmes voilées de dos.
Une vidéo peut resservir d'un short à l'autre, à un autre `debut`. On n'en cherche une nouvelle que
si aucune ne dit l'idée.

## Chercher sur Pexels

1. **Lister d'abord toutes les idées d'image qui manquent** pour la série, et regrouper celles qui
   se ressemblent : une vidéo par idée, pas une par short.
2. **La page de recherche**, en vertical :
   `https://www.pexels.com/search/videos/?q=<mots en anglais>&orientation=portrait`.
   Le bandeau de cookies revient souvent : cliquer « Tout refuser ».
3. **Le titre de chaque page décrit la vidéo** (« crescent-moon-surrounded-by-dark-clouds »). Pour
   les plans de nature, il suffit à choisir. Pour lire beaucoup de résultats d'un coup, depuis une
   page de pexels.com, passer par le code de la page :
   `fetch('/search/videos/?q=...&orientation=portrait')`, puis relever dans le texte reçu les
   adresses `/video/<titre>-<numéro>/`.
4. **Voir une vignette** : ouvrir l'image seule,
   `https://images.pexels.com/videos/<numéro>/<nom>.jpeg?auto=compress&w=400` (le nom se lit dans la page).
   Si les captures d'écran restent figées sur une vieille image, l'onglet est en arrière-plan : ne
   pas insister, choisir sur les titres et vérifier après téléchargement.
5. **L'adresse du fichier** : lire la page de la vidéo et y relever
   `https://videos.pexels.com/video-files/<numéro>/..._1080_1920_...mp4`. Il existe aussi une
   version `_720_1280_`, deux à trois fois plus légère, suffisante pour la pluie, les étoiles, l'eau.
6. **Le poids, puis son accord.** `node outils/banque.mjs ajouter <nom> <adresse>` sans `--oui` dit
   le poids sans rien télécharger. Lui donner la liste : nom, source, poids, total. Attendre son oui.
7. **Télécharger et inscrire** :

```bash
node outils/banque.mjs ajouter lune-pleine "https://videos.pexels.com/video-files/.../..._1080_1920_30fps.mp4" \
  --page "https://www.pexels.com/video/...-12345/" --voit "..." --pour "..." --oui
```

8. **Regarder la planche** que la commande vient de faire (une image par seconde), en entier.
   Corriger alors `voit`, `pour` et `reglages` dans `banque.json` d'après ce qu'on voit vraiment.

Si le navigateur n'est pas disponible : elle ouvre elle-même la page Pexels, clique sur le
téléchargement gratuit, pose le fichier dans `banque/<nom>.mp4`, puis
`node outils/banque.mjs inscrire <nom> --page "<la page>" --voit "..." --pour "..."`.

## Ce qu'on refuse

- Un visage net, même une seconde. Une femme non voilée. Un homme quand la phrase parle d'elle.
- Un geste d'adoration mal fait, ou d'une autre religion (les mots du titre le disent : amen,
  buddhism, rosary, church).
- Du texte arabe, un Coran ouvert, une bougie posée sur un livre qui figurerait le Coran.
- Du vernis à ongles sur des mains en prière, une marque, un texte en anglais bien lisible.
- Les fêtes de lanternes, les couples, les mains qui se tiennent (souvent un couple ou un hôpital).

## Recherches qui donnent mal

« lantern night », « holding hands », « hands raised sky », « light end of tunnel », « woman
window », « muslim praying hands » (presque toujours des visages). Ne pas insister, changer d'idée.

## Recherches qui donnent bien

« hijab woman back view », « muslim woman back view nature », « foggy forest path », « crowd
walking blur », « sun rays clouds sky », « calm sea sunrise », « starry night sky », « moon clouds
night », « rain window night », « raindrops leaves », « candle flame dark », « above clouds
mountain sunrise », « clear water stream », « calm mountain lake », « birds flying sunset »,
« pouring tea », « road horizon sunset », « waves shore dusk », « sun rays forest ».
