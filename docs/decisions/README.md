# Décisions techniques (ADR)

Un ADR (*Architecture Decision Record*) explique en quelques lignes un choix technique
non trivial : le contexte, la décision, et ses conséquences.

Nommage : `ADR-NNN-titre-court.md`.

## Modèle

```markdown
# ADR-NNN — Titre

- **Date** : AAAA-MM-JJ
- **Statut** : proposé | accepté | remplacé par ADR-XXX

## Contexte
## Décision
## Conséquences
```

## Liste

- [ADR-001 — Exposer Vaultwarden sur le tailnet](ADR-001-exposition-vaultwarden.md)
- [ADR-002 — Réseaux Docker, durcissement et dossiers de données](ADR-002-reseaux-et-durcissement.md)
- [ADR-003 — Lancer tests et linters dans Docker](ADR-003-outils-dans-docker.md)
- [ADR-004 — Migrations SQLite maison au démarrage](ADR-004-migrations.md)
- [ADR-005 — Authentification mono-utilisateur](ADR-005-authentification.md)
- [ADR-006 — Compte Vaultwarden dédié, via une organisation](ADR-006-compte-dedie.md)
- [ADR-007 — `bw serve` dans le conteneur api, déverrouillé par secret Docker](ADR-007-bw-serve.md)
