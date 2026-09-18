# ADR-007 — Fichiers de clés root et abandon de privilèges au démarrage

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

`docs/crypto.md` prévoit une clé serveur (zone agent) lue par l'agent seul, et une clé TOTP
lue par l'api seule, hors de la base, en `root:root 0400`. Les services tournent normalement
sous un UID non-root (10001), qui ne peut pas lire un fichier `root:root 0400`.

## Décision

- **Génération** : `make keys` (appelé par `make up`) crée les fichiers manquants avec
  `/dev/urandom`, `umask 377`, dans `data/keys/` (`root:root 0700`). Jamais d'écrasement.
- **Montage** : chaque fichier est monté seul, en lecture seule, dans **un** conteneur
  (`server.key` → `agent`, `totp.key` → `api`), avec `create_host_path: false` pour échouer si
  le fichier manque au lieu de créer un dossier vide.
- **Démarrage** : `python -m serenity.run api|agent` démarre en root avec seulement
  `SETUID`/`SETGID`, lit la clé en mémoire, puis `setgroups([])`, `setgid(10001)`,
  `setuid(10001)`, et vérifie qu'un retour à root est impossible. Linux retire alors toutes les
  capacités restantes.
- **Garde-fou** : l'agent enregistre l'identifiant de sa clé en base et refuse de démarrer si la
  clé montée diffère.
- **Séparation** : `agent` est un conteneur distinct de `api`, sans port, sur le seul réseau
  `egress` ; l'`api` perd son accès Internet.

## Conséquences

- La clé n'existe qu'en mémoire du service ; un service compromis après le démarrage ne peut
  plus relire le fichier (mais la clé en mémoire reste exposée à ce service, par nature).
- Pendant les quelques millisecondes avant l'abandon de privilèges, le processus est root sans
  capacité (pas de `DAC_OVERRIDE` : il ne lit que des fichiers dont root est propriétaire).
- `docker compose exec` ouvre un shell root sans capacité : `make auth-init` force l'UID 10001.
- Les clés se sauvegardent **à part** de `data/api`.
