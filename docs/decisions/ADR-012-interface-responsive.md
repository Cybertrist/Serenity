# ADR-012 — Interface en carré, dialogues centrés, cadenas d'entrée

- **Date** : 2026-09-19
- **Statut** : accepté

## Contexte

La première version de l'interface (phase 7) était pensée pour un téléphone : une colonne de
480 px au plus, et tout ce qui s'ouvrait par-dessus un écran — fiche d'entrée, éditeur, réglages
— arrivait en panneau glissant depuis le bas. Sur un écran d'ordinateur, où Serenity est utilisé
autant que sur téléphone, le résultat était un ruban étroit au milieu du vide, avec des
interactions empruntées au mobile. Plusieurs écrans n'expliquaient pas ce qu'ils faisaient, des
actions irréversibles partaient au premier clic (supprimer une entrée), et des capacités déjà
codées n'avaient aucune interface (centre de notifications, corbeille).

Une première refonte a introduit une barre latérale et une mise en page large. Essayée, elle
donnait une appli qui s'étale sans fin sur un grand écran. La forme retenue est différente : une
appli **posée dans un carré**, comme un objet, plutôt qu'une page web qui remplit la fenêtre.

## Décision

1. **L'appli tient dans un carré centré** : côté = `min(92vw, 92vh, 980px)`, barre de titre en
   haut (marque, notifications, verrouiller, réglages), écran au milieu, onglets en bas. Sous
   768 px, le carré cède la place au plein écran — un carré de 390 px serait inutilisable.
2. **La mise en page interne se règle sur le carré, pas sur la fenêtre** : container queries
   Tailwind (`@container`, `@[620px]:…`), donc les mêmes composants s'adaptent au téléphone
   comme au carré de bureau sans point de rupture global.
3. **Les écrans d'entrée sont sobres et partagent le langage de l'appli** : le logotype, une
   carte, des actions secondaires en vrais boutons. Le déverrouillage joue **une cascade de
   données chiffrées** dont le front découvre le coffre. Deux essais ont été écartés en chemin :
   un cadenas volumétrique animé (joli mais sans rôle une fois le coffre ouvert) et une façade
   en terminal (jugée peu professionnelle pour un gestionnaire de mots de passe).
4. **Une seule source pour les animations** (`web/src/design/motion.ts`) : courbes, ressorts,
   perspective commune, variantes nommées. Un écran n'écrit pas sa propre durée.
5. **Les panneaux glissants sont remplacés par des dialogues centrés** (`<Modal>`), avec focus
   piégé, fermeture par Échap et défilement de la page bloqué.
6. **Toute action irréversible passe par `<Confirm>`**, qui dit ce qui va se passer avant de le
   faire.
7. **Les messages éphémères vivent dans le carré**, en bas, un à la fois : en haut, ils
   masquaient le titre de l'écran.
8. **Ce qui est codé côté serveur doit avoir un écran** : centre de notifications
   (`/api/notifications`), corbeille et restauration dans les réglages.

## Conséquences

- La charte ([`design.md`](../design.md)) change : la règle « colonne de 480 px » disparaît, une
  quatrième taille de texte apparaît pour les titres d'écran dans un carré large.
- La connexion complète se fait **en deux temps** (mot de passe, puis code). C'est une
  séquence d'interface seulement : le mot de passe maître reste en mémoire le temps de saisir le
  code, et un seul appel `POST /api/auth/login` part, comme avant. Rien ne change dans
  `docs/crypto.md`. Le serveur ne disant jamais lequel des deux est faux, l'erreur s'affiche sur
  la face du code, avec un retour possible vers le mot de passe.
- Le carré limite la largeur : les deux zones du coffre ne passent côte à côte qu'au-delà de
  620 px de carré, sinon elles s'empilent.
- `make ui-smoke` fait deux passages, téléphone puis bureau, et garde les captures des deux.
- L'appli Android de la V2 (Compose) reprendra la mise en page « plein écran » sans changement.
- Aucun impact sur la cryptographie ni sur l'API : la refonte est entièrement dans `web/src/`.
