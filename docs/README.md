# Documentation Serenity

Une page par phase, dans l'ordre de construction.

| Page | Sujet |
|---|---|
| [00 — Vue d'ensemble](00-vue-ensemble.md) | Le projet, le coffre à double zone, l'architecture |
| [01 — Dépôt et GitHub](01-depot-github.md) | Arborescence, CI, labels, protection de `main` |
| [01 — Cryptographie](01-cryptographie.md) | Modules crypto Python et TypeScript, vecteurs partagés, vérification croisée |
| [Spécification crypto](crypto.md) | Hiérarchie des clés, formats, flux, modèle de menace |
| [02 — Infrastructure](02-infrastructure.md) | Docker Compose, Tailscale *(à revoir en phase 2)* |
| 03 — Authentification | Comptes, connexion, TOTP, kit de récupération *(à venir)* |
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

La page [03 — Socle backend](03-backend-socle.md) décrit l'ancien socle (avant la remise à plat) ;
elle sera remplacée par « 03 — Authentification ».
