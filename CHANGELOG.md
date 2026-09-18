# Changelog

Toutes les évolutions notables de Serenity sont listées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnage : [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Phase 4 : Bitwarden CLI (`bw-oss-linux` 2026.8.0, empreinte vérifiée) dans l'image api,
  `bw serve` lancé par l'api sur `127.0.0.1:8087`.
- Phase 4 : déverrouillage par secret Docker `secrets/bw_master_password` (`make bw-secret`).
- Phase 4 : `vault.py` (lister, lire, modifier un mot de passe, synchroniser), service de relance.
- Phase 4 : synchronisation périodique des `Entry` (APScheduler), nouveaux comptes critiques par défaut,
  migration v2 (`entry.removed_at`).
- Phase 4 : routes `GET /api/vault/status`, `POST /api/vault/sync`, `GET /api/entries`.
- Phase 4 : doc `04-coffre.md`, ADR-006 et ADR-007.
- Phase 3 : configuration `pydantic-settings`, `SERENITY_SECRET_KEY` obligatoire.
- Phase 3 : modèles SQLModel (`Entry`, `Breach`, `Rotation`, `AuditLog`, `Setting`, `AuthSession`),
  dates toujours en UTC, migrations au démarrage.
- Phase 3 : authentification argon2 + TOTP (anti-rejeu), sessions côté serveur, cookie
  `HttpOnly`/`Secure`/`SameSite=Strict` de 12 h, blocage après 5 échecs.
- Phase 3 : commande `python -m serenity.auth init` (`make auth-init`).
- Phase 3 : journal d'audit avec filtre anti-secret, appliqué aussi à tous les logs ; `GET /api/logs`.
- Phase 3 : calcul de `next_rotation_at`.
- Phase 3 : doc `03-backend-socle.md`, ADR-004 et ADR-005.
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
