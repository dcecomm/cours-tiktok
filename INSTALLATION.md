# Installation

## Pour elle : une seule chose à faire

Ouvrir Claude (l'application de bureau, onglet « Code ») et lui envoyer ce message :

> Installe le skill cours-tiktok depuis https://github.com/dcecomm/cours-tiktok en suivant son
> fichier INSTALLATION.md. Dis-moi ce que tu vas télécharger avant de le faire, lance l'essai
> complet à la fin, et montre-moi la vidéo d'essai.

Claude fait le reste et pose une question avant de télécharger. Compter 20 à 40 minutes, surtout
du téléchargement (2 Go). À la fin, il montre une petite vidéo d'essai de 10 secondes : si elle se
lit, avec une voix, une image et des sous-titres, tout marche.

Ensuite, pour faire des shorts : donner à Claude le fichier d'un cours ou un message vocal, et dire
« fais-moi des shorts de ce cours ».

## Pour Claude : les étapes

État au 2026-10-09 : tout est testé sur Mac, y compris l'essai complet. **Sur Windows,
l'installateur n'a encore jamais tourné sur un vrai PC.** Dérouler les étapes une par une, lire ce
que chaque commande répond, et corriger cette page et `outils/installer.mjs` si quelque chose coince.

### 1. Git et Node

Vérifier d'abord : `git --version` et `node --version` (il faut Node 20 ou plus récent).

S'ils manquent, sur Windows (PowerShell) :

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

Puis **ouvrir un nouveau terminal** : l'ancien ne voit pas encore les nouveaux programmes. Si
`node` reste introuvable, l'appeler par son chemin : `& "C:\Program Files\nodejs\node.exe"`.

Sur Mac : `brew install git node`.

### 2. Mettre le skill à sa place

Windows (PowerShell) :

```powershell
git clone https://github.com/dcecomm/cours-tiktok "$env:USERPROFILE\.claude\skills\cours-tiktok"
cd "$env:USERPROFILE\.claude\skills\cours-tiktok"
```

Mac :

```bash
git clone https://github.com/dcecomm/cours-tiktok ~/.claude/skills/cours-tiktok
cd ~/.claude/skills/cours-tiktok
```

Sans Git : télécharger https://github.com/dcecomm/cours-tiktok/archive/refs/heads/main.zip, le
décompresser, renommer le dossier `cours-tiktok-main` en `cours-tiktok` et le poser dans le dossier
`skills` ci-dessus. (La mise à jour se fera alors en retéléchargeant l'archive, sans toucher aux
dossiers `bin`, `modeles`, `banque` et `node_modules`.)

### 3. Dire ce qui va être téléchargé, puis installer

```bash
node outils/installer.mjs
```

Cette commande n'installe rien. Elle liste ce qui manque, d'où ça vient et ce que ça pèse :

| Quoi | D'où | Poids |
|---|---|---|
| le moteur de dessin | npm | 40 Mo |
| ffmpeg (le son et la vidéo), Windows seulement | gyan.dev | 109 Mo |
| la transcription whisper.cpp v1.9.2, Windows seulement | github.com/ggml-org | 8 Mo (640 Mo avec `--nvidia`) |
| le modèle de transcription | huggingface.co | 1 549 Mo |
| les 31 vidéos du mode B | videos.pexels.com | 371 Mo |

**Lui lire cette liste et attendre son oui.** Puis :

```bash
node outils/installer.mjs --oui
```

- Si le PC a une carte graphique NVIDIA, la commande le dit : ajouter `--nvidia` rend la
  transcription beaucoup plus rapide (20 à 40 minutes pour 3 heures de cours, au lieu de plusieurs heures).
- Tout est posé dans le dossier du skill (`bin/`, `modeles/`, `banque/`, `node_modules/`). Rien
  n'est installé ailleurs.
- Un téléchargement interrompu reprend où il en était : relancer la même commande.
- Sur Mac, ffmpeg et la transcription s'installent à part : `brew install ffmpeg whisper-cpp`.

### 4. L'essai complet

```bash
node outils/verifier.mjs --essai
```

Il fabrique un vrai petit short avec les mêmes outils que les vrais : transcription, coupe,
sous-titres, image en vraies vidéos, montage, contrôle, image dessinée, livraison. Sept lignes
« OK », puis le chemin de la vidéo d'essai. **La lui montrer** : elle doit entendre la voix d'essai
sur un bruit de mer, voir un lever de soleil puis une bougie, et lire les sous-titres qui s'allument
mot à mot. (La voix d'essai est une voix de synthèse. Elle ne sert qu'à ce test.)

### Si une étape échoue

| Ce qu'on voit | Ce qu'on fait |
|---|---|
| `node` ou `git` introuvable après installation | ouvrir un nouveau terminal |
| `winget` introuvable | installer « App Installer » depuis le Microsoft Store, ou télécharger Node sur nodejs.org et Git sur git-scm.com |
| Windows bloque `whisper-cli.exe` ou `ffmpeg.exe` (écran bleu « Windows a protégé votre ordinateur ») | « Informations complémentaires », puis « Exécuter quand même ». Ces programmes viennent des adresses du tableau ci-dessus. |
| L'antivirus met un fichier de `bin/` en quarantaine | le restaurer et ajouter le dossier du skill aux exclusions |
| L'essai échoue à l'étape 1 (transcrire) et le nom d'utilisateur Windows contient un accent | la transcription lit mal les chemins avec accents. Lancer avec un dossier temporaire sans accent : `mkdir C:\essai; $env:TEMP="C:\essai"; $env:TMP="C:\essai"` puis relancer l'essai. Mettre aussi les cours dans un dossier sans accent (`C:\cours\`). |
| L'essai échoue à l'étape 1 avec une erreur de `.dll` manquante | installer « Microsoft Visual C++ Redistributable » (x64), ou relancer l'installation sans `--nvidia` |
| L'étape 3 dit « en cartons : la banque manque » | `node outils/banque.mjs installer --oui` |
| Une vidéo de la banque ne se télécharge plus | l'adresse a changé : chercher un plan de rechange (`references/banque.md`) |
| La transcription d'un cours dure des heures | normal sur un PC sans carte graphique. La lancer le soir : elle reprend où elle s'est arrêtée si on relance la commande. |

### Mettre à jour plus tard

```bash
git pull
node outils/installer.mjs
```

## Ce que le skill n'utilise pas

Aucun compte, aucune clé, aucun abonnement autre que Claude. Les cours, sa voix et les vidéos
restent sur l'ordinateur : rien n'est envoyé nulle part.
