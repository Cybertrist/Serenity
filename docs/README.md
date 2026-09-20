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
| [04 — Coffre](04-coffre.md) | Entrées chiffrées, synchronisation, délégation, import Bitwarden |
| [05 — Veille](05-veille.md) | Fuites (k-anonymat), réutilisés, faibles, anciens, e-mails, notifications |
| [06 — Agent](06-agent.md) | Politiques, kill switch, allowlist, échéances, rotation transactionnelle |
| [07 — Interface](07-interface.md) | PWA React, écrans, hors ligne, CSP stricte |
| [08 — Rotation](08-rotation.md) | L'exécuteur : navigateur isolé, recettes de sites, site de démo |
| 09 — Sécurité | Sauvegardes, modèle de menace final, risques restants *(à venir)* |

Références :

- [`crypto.md`](crypto.md) : la spécification cryptographique *(phase 1)*
- [`api.md`](api.md) : l'API REST, générée depuis OpenAPI
- [`design.md`](design.md) : la charte graphique
- [`decisions/`](decisions/README.md) : les décisions techniques (ADR)

