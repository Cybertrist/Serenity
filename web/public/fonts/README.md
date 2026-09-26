# Polices

Servies localement (aucune requête vers un service de polices à l'utilisation, CSP
`font-src 'self'`).

| Fichier                      | Police                               | Sous-ensemble        | Licence                          |
| ---------------------------- | ------------------------------------ | -------------------- | -------------------------------- |
| `inter-latin.woff2`          | Inter (variable, 100 à 900)          | latin (U+0000-00FF…) | [OFL 1.1](OFL-Inter.txt)         |
| `jetbrains-mono-latin.woff2` | JetBrains Mono (variable, 400 à 500) | latin                | [OFL 1.1](OFL-JetBrainsMono.txt) |
| `black-ops-one-latin.woff2`  | Black Ops One (400)                  | latin                | [OFL 1.1](OFL-BlackOpsOne.txt)   |

**Inter** porte toute l'interface. Elle est variable : un seul fichier de 48 Ko pour toutes les
graisses.

**JetBrains Mono** sert aux secrets : mots de passe, clés, codes à deux facteurs.

**Black Ops One** ne sert qu'au **logotype** « SEREN**I**TY ». Nulle part ailleurs.

Chakra Petch, qui portait l'interface avant la refonte (ADR-019), n'est plus servie.

Source : Google Fonts pour JetBrains Mono (v24, récupérée le 2026-09-18) et Black Ops One (v21,
récupérée le 2026-09-20) ; Fontsource pour Inter (sous-ensemble latin, récupérée le 2026-09-26).
