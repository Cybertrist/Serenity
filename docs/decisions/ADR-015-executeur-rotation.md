# ADR-015 — L'exécuteur de rotation : un conteneur à part, piloté par des recettes

- **Date** : 2026-09-20
- **Statut** : accepté

## Contexte

Depuis la phase 6, l'agent sait décider une rotation : politiques par entrée, échéances,
kill switch, allowlist, plafond quotidien, et une machine d'état transactionnelle complète
(`rotator/base.py`) testée avec des doubles. Il ne savait pas l'**exécuter** : aucun site
implémenté, `RotationRun.execute` appelé par les seuls tests, et « approuvé » voulait dire
« en attente d'un exécuteur » ([ADR-011](ADR-011-agent.md)).

Restait donc à décider : où tourne le navigateur, comment un site est décrit, et sur quoi on
met tout ça au point sans mettre en jeu un vrai compte.

## Décision

1. **Le navigateur vit dans son propre conteneur** (`rotator`), seule image à embarquer
   Playwright et seule à avoir une route vers les sites. L'agent — le processus qui détient la
   clé serveur et déchiffre la zone agent — n'a toujours pas de navigateur.
2. **Deux verbes, sans état** : `/verify` (se connecter) et `/change` (se connecter puis
   changer). La transaction, elle, reste dans l'agent : c'est lui qui enregistre le bloc en
   attente avant l'appel, et qui valide ou jette après.
3. **Un jeton partagé** (`SERENITY_ROTATOR_TOKEN`) sur un réseau interne sans port publié.
   **Jeton vide = aucune exécution** : le comportement d'avant, par défaut.
4. **Des recettes JSON**, une par site, validées au démarrage. Ajouter un site est une recette,
   pas du code ; une recette invalide fait échouer le boot, jamais une rotation en cours.
   Le champ de code à six chiffres n'est rempli **que s'il est présent sur la page** : une
   recette décrit ce qui peut exister, la page dit ce qui existe.
5. **Un site de démo dans le dépôt** (`demo/`, profil compose `demo`, bibliothèque standard
   seulement), cible d'entraînement et fixture de CI. Un job rejoue à chaque commit la réussite,
   le retour arrière quand le site refuse, et le refus d'un site hors allowlist.
6. **Le bloc en attente** vit dans une colonne du coffre (`item.pending_block`), au format d'une
   révision ordinaire (`docs/crypto.md` §7.12). Une entrée en rotation ne peut pas changer de
   zone.
7. **Rien de la page ne remonte** : les messages d'erreur du rotateur sont une phrase fixe ou
   une classe d'exception, jamais le texte de la page ni ce qui a été saisi dedans.

## Alternatives écartées

- **Playwright dans l'image de l'agent** : un conteneur de moins, mais l'image passe de ~200 Mo
  à ~1 Go, et le processus qui ouvre la zone agent devient celui qui exécute du JavaScript venu
  d'Internet. Le gain de simplicité ne vaut pas cet élargissement.
- **Une classe Python par site** : plus souple pour un site tordu, mais chaque changement de
  page devient un correctif à déployer, et le code qui touche les sites grossit sans fin.
- **S'entraîner directement sur un vrai site** : plus convaincant en démonstration, mais
  intestable en CI, fragile (le site change sans prévenir) et il faut exposer un vrai compte
  pendant la mise au point. La recette d'un vrai site viendra ensuite, sur une base éprouvée.
- **Laisser l'exécuteur mener la transaction** : il aurait fallu lui donner la base et la clé
  d'agent. Le conteneur qui touche Internet doit rester celui qui sait le moins.

## Conséquences

- Deux services de plus dans `docker-compose.yml`, dont un seul en production (`rotator`), et un
  réseau interne `rotation` entre l'agent et lui.
- `make rotation-demo` et un job de CI « Rotation (site de démo, vrai navigateur) ».
- Le journal d'audit gagne `agent.rotation.execute`, `vault.item.pending`,
  `vault.item.pending.discarded` et `vault.item.rotated` ; le centre de notifications gagne
  `rotation.done`, `rotation.failed` et `rotation.manual`.
- L'image du rotateur suit les versions de Playwright : elle devra être remontée régulièrement,
  comme n'importe quel navigateur exposé à des pages hostiles.
- Ce qui reste : la recette d'un vrai site, et l'affichage des deux mots de passe quand un retour
  arrière échoue.
