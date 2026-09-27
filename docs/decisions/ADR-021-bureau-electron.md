# ADR-021 : Appli de bureau avec Electron plutôt que Tauri

- **Date** : 2026-09-27
- **Statut** : accepté

## Contexte

Sur un ordinateur, Serenity vivait dans un onglet ou en PWA installée. Un onglet ne peut pas
dessiner sa barre de titre, répondre à un raccourci global, ni savoir que la session Windows
vient d'être verrouillée ou que la machine s'endort. Il fallait une vraie fenêtre, pour Windows
et Linux.

Deux candidats : Tauri (Rust, le moteur web du système) et Electron (Node, Chromium embarqué).

## Décision

**Electron**, dans `desktop/`.

- **Pas de chaîne Rust à installer** pour construire, ni sur le poste ni en CI : Node suffit,
  et il est déjà là pour `web/`.
- **Linux se construit en CI** comme Windows (`.github/workflows/desktop.yml`), sans dépendre du
  WebKitGTK de chaque distribution. Le rendu est le même Chromium partout, celui que
  `make ui-smoke` teste déjà.
- **Le client de bureau de Bitwarden fait le même choix**, pour un produit du même genre.

**L'appli ne contient pas le code du coffre.** Elle ouvre le client web servi par ton serveur.
La CSP, le contrôle d'origine et les clés en mémoire restent donc exactement ceux du navigateur ;
l'appli ne peut pas diverger du web, et elle n'a rien à mettre à jour quand le client change.

La fenêtre est fermée à double tour : `sandbox`, `contextIsolation`, pas de `nodeIntegration`,
pas de `webview`, pas d'outils de développement une fois empaquetée, aucune permission accordée
à part l'écriture dans le presse-papiers, navigation bloquée hors de l'origine du serveur (le
reste s'ouvre dans le vrai navigateur, seulement en `https`). Le pont (`preload.js`) est minimal :
les boutons de la fenêtre, l'adresse du serveur, et deux évènements (fenêtre agrandie,
verrouiller). Aucune clé, aucun secret n'y passe.

## Conséquences

- Des installateurs plus lourds qu'avec Tauri (Chromium embarqué, une centaine de Mo). C'est le
  prix d'un rendu identique partout et d'une construction simple.
- Electron doit suivre ses versions de sécurité. Dependabot ne surveille pas encore `desktop/` :
  il faudra l'ajouter à `.github/dependabot.yml`.
- Pas de macOS pour l'instant : ni signature ni notarisation.
- L'adresse du serveur est gardée dans le dossier de données de l'appli (`server.json`). Seul
  `https` est accepté, ou `http` sur `127.0.0.1` pour le développement.
