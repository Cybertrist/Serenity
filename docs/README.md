# Documentation Serenity

Une page par phase, dans l'ordre de construction.

| Page | Sujet |
|---|---|
| [00 — Vue d'ensemble](00-vue-ensemble.md) | Le projet, le coffre à double zone, l'architecture |
| [01 — Dépôt et GitHub](01-depot-github.md) | Arborescence, CI, labels, protection de `main` |
| [01 — Cryptographie](01-cryptographie.md) | Modules crypto Python et TypeScript, vecteurs partagés, vérification croisée |
| [Spécification crypto](crypto.md) | Hiérarchie des clés, formats, flux, modèle de menace |
| [02 — Infrastructure](02-infrastructure.md) | Docker Compose, clés serveur, agent séparé, Tailscale |
| [03 — Authentification](03-authentification.md) | Comptes, connexion, TOTP, déverrouillage, kit de récupération |
| 04 — Coffre | Entrées chiffrées, révisions, délégation, import Bitwarden *(à venir)* |
| 05 — Veille | Fuites, k-anonymat, mots de passe faibles *(à venir)* |
| 06 — Agent | Politiques, kill switch, planification, notifications *(à venir)* |
| 07 — Interface | PWA React *(à venir)* |
| 09 — Sécurité | Sauvegardes, modèle de menace final, risques restants *(à venir)* |

Références :

- [`crypto.md`](crypto.md) : la spécification cryptographique *(phase 1)*
- `api.md` : l'API REST *(phase 6)*
- `design.md` : la charte graphique *(phase 7)*
- [`decisions/`](decisions/README.md) : les décisions techniques (ADR)

