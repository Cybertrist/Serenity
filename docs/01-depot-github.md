# 01 — Dépôt et GitHub

## Quoi

La phase 1 a posé les fondations : l'arborescence du projet, les règles Git et l'automatisation
GitHub. Cette page dit où vivent les choses et ce que la CI vérifie — elle est tenue à jour au
fil des phases.

## Pourquoi

- Avoir **une place pour chaque chose** dès le départ évite le désordre plus tard.
- La **CI** vérifie chaque pull request : lint, tests et surtout **scan de secrets**.
- **Dependabot** propose chaque semaine les mises à jour de sécurité des dépendances.
- Les **issues et milestones** permettent de suivre l'avancement phase par phase.

## Ce qui a été mis en place

### Arborescence

| Dossier | Contenu |
|---|---|
| `api/` | Backend Python (FastAPI) : comptes, coffre, veille, agent, et le client de référence. |
| `web/` | Frontend React (PWA), sa charte (`src/design/`) et le parcours Chromium (`e2e/`). |
| `rotator/` | L'exécuteur de rotation : le seul conteneur avec un navigateur, et ses recettes de sites. |
| `demo/` | Le site jouet sur lequel l'agent s'entraîne (profil compose `demo`). |
| `shared/` | Ce que Python et TypeScript doivent lire pareil : vecteurs de test crypto et veille. |
| `scripts/` | Outillage : parcours d'interface, démo de rotation, exercice de sauvegarde, icônes. |
| `ops/` | Scripts de sauvegarde et timers systemd. |
| `docs/` | Cette documentation, et `decisions/` pour les ADR. |
| `.github/` | CI, Dependabot, templates d'issue et de PR. |

### Fichiers clés

- **`.gitignore`** : exclut `.env`, `data/`, les bases SQLite, les caches Python et Node,
  et `playwright/.auth` (sessions de navigateur de la V2).
- **`.env.example`** : toutes les variables, commentées, **sans aucune valeur réelle**.
  Le mot de passe maître du coffre n'y figure pas : il ne quitte jamais ton appareil.

### CI (`.github/workflows/ci.yml`)

Huit jobs sur chaque pull request et chaque push sur `main` :

| Job | Vérifie |
|---|---|
| **Backend** | `ruff` (lint + format), `mypy`, `pytest`, et que `docs/api.md` est à jour |
| **Frontend** | `eslint`, `prettier`, `vitest`, `vite build` |
| **Secret scan** | `gitleaks` sur tout l'historique Git |
| **Crypto interop** | Un bloc chiffré par Python se déchiffre en TypeScript, et l'inverse (règle 4) |
| **End-to-end** | Le client TypeScript contre le vrai serveur Python |
| **UI smoke** | Chromium parcourt tous les écrans sur l'image de production, CSP stricte ; captures en artefact |
| **Rotation** | L'agent change vraiment un mot de passe sur le site de démo, vrai navigateur |
| **Sauvegarde** | L'exercice de restauration : un coffre jetable détruit, puis restauré |

### Dependabot

Mises à jour **hebdomadaires** pour : `pip` (api), `npm` (web), les `Dockerfile`,
`docker-compose.yml` et les GitHub Actions.

### GitHub

- **Labels** : `backend`, `frontend`, `infra`, `security`, `docs`, `v1`, `v2`, `v3`.
- **Milestones** : `V1 — Coffre maison`, `V2 — Appli Android`, `V3 — Rotation`, `V4 — Agent LLM`.
- **Issues** : une par phase de la V1, rattachées au milestone V1.
- **Protection de `main`** : activée. Pull request obligatoire, branche à jour avec `main`,
  règles appliquées aussi aux administrateurs, force-push et suppression interdits.
  **Trois jobs bloquent la fusion** (Backend, Frontend, Secret scan) ; les cinq autres tournent
  et se voient, mais n'empêchent pas de fusionner — voir « Protection de `main` » plus bas.
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
gh api repos/Cybertrist/Serenity/milestones -f title="V1 — Coffre maison"

# Issues
gh issue create --title "Phase 1 — Dépôt et GitHub" --milestone "V1 — Coffre maison" --label v1,infra,docs
```

### Protection de `main`

Seuls les trois `contexts` ci-dessous bloquent une fusion. Les cinq autres jobs (crypto interop,
end-to-end, UI smoke, rotation, sauvegarde) tournent sur chaque PR sans l'empêcher : les ajouter
à cette liste les rendrait obligatoires.

```bash
gh api -X PUT repos/Cybertrist/Serenity/branches/main/protection --input - <<'JSON'
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
gh api -X PATCH repos/Cybertrist/Serenity --input - <<'JSON'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
```

## Comment tester

```bash
# Labels, milestones, issues
gh label list
gh api repos/Cybertrist/Serenity/milestones --jq '.[].title'
gh issue list --milestone "V1 — Coffre maison"

# CI de la pull request
gh pr checks

# Aucun .env ni secret suivi par Git
git ls-files | grep -E '(^|/)\.env$' || echo "aucun .env suivi"
```

Dans le navigateur : onglet **Actions** du dépôt, les trois jobs doivent être verts.
