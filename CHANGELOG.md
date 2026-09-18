# Changelog

Toutes les évolutions notables de Serenity sont listées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnage : [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Phase 2 : `docker-compose.yml` (vaultwarden, ntfy, api, web), ports sur `127.0.0.1` uniquement,
  réseaux `internal` / `edge` / `egress`, conteneurs non-root en lecture seule, healthchecks.
- Phase 2 : Vaultwarden (inscriptions fermées, admin désactivée, override d'admin ponctuel).
- Phase 2 : ntfy (authentification obligatoire, `deny-all`, sans inscription ni pièces jointes).
- Phase 2 : `api` minimale (`GET /api/health`) et `web` provisoire (nginx + proxy `/api`).
- Phase 2 : `Makefile` (`init`, `up`, `down`, `restart`, `logs`, `ps`, `test`, `lint`).
- Phase 2 : doc `02-infrastructure.md`, ADR-001 à ADR-003.
- Phase 1 : arborescence du dépôt, README, `.gitignore`, `.env.example` commenté.
- Phase 1 : templates d'issue et de pull request, Dependabot (pip, npm, docker, docker-compose, actions).
- Phase 1 : CI GitHub Actions (backend, frontend, scan de secrets gitleaks).
- Phase 1 : documentation (`docs/README.md`, vue d'ensemble, page de la phase 1).
- Phase 1 : protection de `main` (PR + CI verte obligatoires). Secret scanning GitHub indisponible, remplacé par gitleaks.
