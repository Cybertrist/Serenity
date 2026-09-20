# Polices

Servies localement (aucune requête vers Google Fonts à l'utilisation, CSP `font-src 'self'`).

| Fichier                        | Police                               | Sous-ensemble        | Licence                          |
| ------------------------------ | ------------------------------------ | -------------------- | -------------------------------- |
| `chakra-petch-400-latin.woff2` | Chakra Petch 400                     | latin (U+0000-00FF…) | [OFL 1.1](OFL-ChakraPetch.txt)   |
| `chakra-petch-500-latin.woff2` | Chakra Petch 500                     | latin                | [OFL 1.1](OFL-ChakraPetch.txt)   |
| `chakra-petch-600-latin.woff2` | Chakra Petch 600                     | latin                | [OFL 1.1](OFL-ChakraPetch.txt)   |
| `jetbrains-mono-latin.woff2`   | JetBrains Mono (variable, 400 à 500) | latin                | [OFL 1.1](OFL-JetBrainsMono.txt) |
| `black-ops-one-latin.woff2`    | Black Ops One (400)                  | latin                | [OFL 1.1](OFL-BlackOpsOne.txt)   |

**Chakra Petch** porte toute l'interface. Elle n'est pas variable : une graisse, un fichier,
et l'appli n'en utilise que trois. Les trois pèsent moins de 30 Ko à elles toutes.

**Black Ops One** ne sert qu'aux **titres d'écran**, en capitales : c'est le pochoir du
logotype, en vraie police. Nulle part ailleurs.

Source : Google Fonts (jetbrainsmono v24, récupérée le 2026-09-18 ; blackopsone v21 et
chakrapetch v13, récupérées le 2026-09-20).
