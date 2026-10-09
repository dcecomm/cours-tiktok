# cours-tiktok

Un skill pour Claude : il transforme la rediffusion d'un cours (ou un message vocal) en shorts
verticaux pour TikTok, avec sa vraie voix, des sous-titres calés mot à mot, et une image faite de
vrais plans de nature sans visage ou dessinée par du code.

Tout tourne sur l'ordinateur, sans service payant.

- **Installer** : `INSTALLATION.md` (un message à envoyer à Claude, il fait le reste).
- **La méthode** : `SKILL.md`.
- **Vérifier que tout marche** : `node outils/verifier.mjs --essai`.

Ce qui n'est pas dans le dépôt : les cours, les shorts produits, les vidéos de la banque
(`node outils/banque.mjs installer` les télécharge), les programmes et le modèle de transcription
(`node outils/installer.mjs`).
