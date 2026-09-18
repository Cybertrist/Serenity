# ADR-003 — Lancer tests et linters dans Docker

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

Le projet cible Python 3.12. Debian 13 fournit Python 3.13, et installer une seconde
version de Python sur la VM ajoute de la maintenance.

## Décision

L'image `api` a une cible `dev` (dépendances de développement incluses).
`make test` et `make lint` construisent cette image et l'exécutent sur les sources
locales, montées dans le conteneur, avec l'UID de l'utilisateur courant.
La CI GitHub utilise directement Python 3.12 (`actions/setup-python`).

## Conséquences

- Aucune installation Python sur la VM ; mêmes versions qu'en production.
- Le premier `make test` est plus lent (construction de l'image), les suivants utilisent le cache.
