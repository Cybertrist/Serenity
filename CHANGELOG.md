# Changelog

Toutes les évolutions notables de Serenity sont listées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnage : [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Phase 1 : spécification cryptographique `docs/crypto.md` (validée) et ADR-006.
- Phase 1 : modules crypto Python (`api/serenity/crypto/`, PyNaCl) et TypeScript
  (`web/src/crypto/`, libsodium-wrappers-sumo) : Argon2id, sous-clés, blocs AEAD, boîtes scellées,
  kit de récupération, entrées bourrées.
- Phase 1 : vecteurs de test partagés `shared/test-vectors/` (`make vectors`), vérification croisée
  Python ↔ TypeScript en CI (`make crypto-interop`), projet web initialisé (TypeScript strict, eslint,
  prettier, vitest ; `make web-test`).

### Changé

- Phase 0 : **remise à plat**. Serenity devient un gestionnaire de mots de passe complet, avec son
  propre coffre chiffré à double zone (personnelle / agent). Nouveau `CLAUDE.md`, ADR-001
  « Coffre maison à double zone plutôt que Vaultwarden », issues et milestones alignés sur le plan en 8 phases.
- Phase 0 : notifications **maison** (ADR-005) : centre de notifications dans l'api, appli Android native
  en V2 par vérification périodique (sans icône permanente ni service tiers). Plan des versions : V2 Android, V3 rotation, V4 agent LLM.
- Phase 0 : arborescence alignée sur la cible (`crypto/`, `vault/`, `agent/`, `watcher/`,
  `shared/test-vectors/`, `web/src/crypto`, `web/src/vault`).

### Retiré

- Phase 0 : service `vaultwarden`, override d'admin, variables `VW_*` et `BW_*`, client `vault.py`,
  Bitwarden CLI (`bw serve`, PR #18 fermée). Anciens ADR-001 et ADR-005 archivés.
- Phase 0 : service `ntfy`, sa configuration et les variables `NTFY_*`.

### Ajouté

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
