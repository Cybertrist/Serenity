# ADR-002 — Réseaux Docker, durcissement et dossiers de données

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

Serenity héberge un coffre de mots de passe chiffré. Il faut limiter ce qu'un
conteneur compromis pourrait atteindre ou modifier.

## Décision

**Réseaux**

- `internal` (`internal: true`) : trafic entre services, sans Internet.
- `edge` : services publiés sur `127.0.0.1` (`web`).
- `egress` : sortie Internet de l'`api` seule (Pwned Passwords).
- L'`api` n'a aucun port publié.

**Durcissement de chaque conteneur**

- UID fixes non-root : api 10001.
  nginx garde son maître root (avec seulement `CHOWN`, `SETUID`, `SETGID`) et ses workers non-root.
- `read_only: true` + `tmpfs` pour les dossiers temporaires.
- `cap_drop: ALL`, `no-new-privileges`.
- Logs Docker limités (3 × 10 Mo par service).
- Images épinglées sur une version précise, mises à jour par Dependabot.

**Données** : dossiers montés `./data/<service>/` plutôt que volumes nommés Docker.

## Conséquences

- `make init` doit fixer les propriétaires de `data/*` (demande `sudo` une fois).
- La sauvegarde (phase 8) lit simplement `./data/` avec restic, sans passer par Docker.
- Un service qui aurait besoin d'Internet doit être rattaché explicitement à un réseau non interne.
