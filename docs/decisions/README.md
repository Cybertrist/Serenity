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

- [ADR-001 — Coffre maison à double zone plutôt que Vaultwarden](ADR-001-coffre-maison.md)
- [ADR-002 — Réseaux Docker, durcissement et dossiers de données](ADR-002-reseaux-et-durcissement.md)
- [ADR-003 — Lancer tests et linters dans Docker](ADR-003-outils-dans-docker.md)
- [ADR-004 — Migrations SQLite maison au démarrage](ADR-004-migrations.md)
- [ADR-005 — Notifications maison, sans service tiers](ADR-005-notifications-maison.md)
- [ADR-006 — Choix cryptographiques précisant CLAUDE.md](ADR-006-choix-cryptographiques.md)
- [ADR-007 — Fichiers de clés root et abandon de privilèges au démarrage](ADR-007-cles-serveur.md)
- [ADR-008 — Comptes : inscription unique, verrouillage progressif, client de test](ADR-008-comptes.md)
- [ADR-009 — Coffre : curseur de synchronisation, corbeille, historique, import dans le navigateur](ADR-009-coffre.md)
- [ADR-010 — Veille : double scan, alertes sans secret, notifications sans texte](ADR-010-veille.md)
- [ADR-011 — Agent : politiques, garde-fous par le code, rotation sans exécuteur](ADR-011-agent.md)
- [ADR-012 — Interface responsive, dialogues centrés](ADR-012-interface-responsive.md)
- [ADR-013 — Régénérer le kit de récupération depuis les réglages](ADR-013-regeneration-kit.md)

## Archives

Décisions remplacées lors de la remise à plat (abandon de Vaultwarden) :

- [Ancien ADR-001 — Exposer Vaultwarden sur le tailnet](archive/ADR-001-exposition-vaultwarden.md)
- [Ancien ADR-005 — Authentification mono-utilisateur](archive/ADR-005-authentification.md)
