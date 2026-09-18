# ADR-011 — Agent : politiques, garde-fous par le code, rotation sans exécuteur

- **Date** : 2026-09-19
- **Statut** : accepté

## Contexte

La phase 6 donne ses règles à l'agent. En V1, aucune rotation n'est exécutée sur un site ;
tout doit pourtant être prêt et sûr pour la V3.

## Décision

- **Politique par entrée** (`rotation_policy`) : fréquence 7/30/90/180 j ou jamais, mode
  autonome ou validation. Zone personnelle : validation seulement, qui ne produit qu'un rappel.
  La date du dernier changement est envoyée par le client (une date, jamais le mot de passe).
- **Échéancier horaire** dans le processus agent (APScheduler) ; une rotation ouverte par
  entrée au plus ; un mot de passe exposé en zone agent déclenche une rotation.
- **Kill switch** en base (`setting.kill_switch`), vérifié avant chaque rotation, rappel,
  veille et approbation. Enclencher : session ; relâcher : déverrouillé.
- **Allowlist** en fichier monté en lecture seule, format YAML strict analysé par le code
  (pas de dépendance YAML), domaines et sous-domaines, toutes les adresses de l'entrée doivent
  passer. Vérifiée dans `RotationRun.execute`, seul point qui touche un site ; pas dans l'api,
  qui ne peut pas lire les adresses de la zone agent (faire confiance au client n'aurait
  aucun sens).
- **Limite** : `SERENITY_MAX_ROTATIONS_PER_DAY` approbations par 24 h glissantes.
- **Machine d'état** (`rotator/base.py`) : étapes et transitions explicites, ports
  `SiteRotator` et `VaultPort`, testée avec des doubles ; aucun site implémenté.
- **Server-Sent Events** (`/api/events`), connexions de 5 min au plus, battement toutes les
  15 s, reprise par `Last-Event-ID` ; bloc nginx dédié (pas de tampon, lecture longue).
- **`docs/api.md` généré** depuis OpenAPI, descriptions en français obligatoires, vérifié en CI.

## Conséquences

- Tant que la V3 n'existe pas, « approuvé » veut dire « en attente de l'exécuteur ».
- Le stockage de la révision « en attente » (champ du coffre) sera ajouté avec l'exécuteur ;
  l'interface `VaultPort` en fixe le contrat.
