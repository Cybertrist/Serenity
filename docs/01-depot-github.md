# 01 — Dépôt et GitHub

## Quoi

La phase 1 pose les fondations : l'arborescence du projet, les règles Git
et l'automatisation GitHub. Il n'y a pas encore de code applicatif.

## Pourquoi

- Avoir **une place pour chaque chose** dès le départ évite le désordre plus tard.
- La **CI** vérifie chaque pull request : lint, tests et surtout **scan de secrets**.
- **Dependabot** propose chaque semaine les mises à jour de sécurité des dépendances.
- Les **issues et milestones** permettent de suivre l'avancement phase par phase.

## Ce qui a été mis en place

### Arborescence

| Dossier | Contenu |
|---|---|
| `api/` | Backend Python (FastAPI). Modules vides pour l'instant, chacun décrit par une docstring. |
| `web/` | Frontend React (PWA). |
| `ops/` | Scripts de sauvegarde et timers systemd. |
| `docs/` | Cette documentation, et `decisions/` pour les ADR. |
| `.github/` | CI, Dependabot, templates d'issue et de PR. |

### Fichiers clés

- **`.gitignore`** : exclut `.env`, `data/`, les bases SQLite, les caches Python et Node,
  et `playwright/.auth` (sessions de navigateur de la V2).
- **`.env.example`** : toutes les variables, commentées, **sans aucune valeur réelle**.
  Le mot de passe maître du coffre n'y figure pas : il passera par un secret Docker (phase 4).

### CI (`.github/workflows/ci.yml`)

Trois jobs sur chaque pull request et chaque push sur `main` :

| Job | Vérifie |
|---|---|
| **Backend** | `ruff` (lint + format), `mypy`, `pytest` |
| **Frontend** | `eslint`, `prettier`, `vitest`, `vite build` |
| **Secret scan** | `gitleaks` sur tout l'historique Git |

Tant que `api/pyproject.toml` et `web/package.json` sont vides, les jobs backend et frontend
**s'arrêtent proprement** avec une note, pour que la CI reste verte. Ils s'activent seuls
dès la phase 3 (backend) et la phase 7 (frontend).

### Dependabot

Mises à jour **hebdomadaires** pour : `pip` (api), `npm` (web), les `Dockerfile`,
`docker-compose.yml` et les GitHub Actions.

### GitHub

- **Labels** : `backend`, `frontend`, `infra`, `security`, `docs`, `v1`, `v2`, `v3`.
- **Milestones** : `V1 — Veille`, `V2 — Rotation`, `V3 — Agent LLM`.
- **Issues** : une par phase de la V1, rattachées au milestone V1.
- **Protection de `main`** : activée. Pull request obligatoire, les 3 jobs de CI doivent être verts,
  branche à jour avec `main`, règles appliquées aussi aux administrateurs, force-push et suppression interdits.
- **Secret scanning / push protection** : **non disponible** sur ce dépôt privé
  (GitHub répond « Secret scanning is not available for this repository »).

### Limite : pas de secret scanning GitHub

Le secret scanning de GitHub sur un dépôt privé nécessite GitHub Advanced Security.
En attendant, **gitleaks** en CI tient ce rôle : il analyse tout l'historique à chaque PR,
et la protection de `main` empêche de fusionner si gitleaks échoue.

Si le dépôt devient public ou si l'option devient disponible, relance la commande
« Secret scanning + push protection » ci-dessous.

## Commandes utilisées

```bash
# Labels
gh label create backend --color 1d76db --description "API FastAPI"
# ... (un par label)

# Milestones
gh api repos/Cybertrist/serenity/milestones -f title="V1 — Veille"

# Issues
gh issue create --title "Phase 1 — Dépôt et GitHub" --milestone "V1 — Veille" --label v1,infra,docs
```

### Protection de `main`

```bash
gh api -X PUT repos/Cybertrist/serenity/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Backend (ruff, mypy, pytest)",
      "Frontend (eslint, prettier, vitest, build)",
      "Secret scan (gitleaks)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
JSON

# Secret scanning + push protection
gh api -X PATCH repos/Cybertrist/serenity --input - <<'JSON'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
```

## Comment tester

```bash
# Labels, milestones, issues
gh label list
gh api repos/Cybertrist/serenity/milestones --jq '.[].title'
gh issue list --milestone "V1 — Veille"

# CI de la pull request
gh pr checks

# Aucun .env ni secret suivi par Git
git ls-files | grep -E '(^|/)\.env$' || echo "aucun .env suivi"
```

Dans le navigateur : onglet **Actions** du dépôt, les trois jobs doivent être verts.
