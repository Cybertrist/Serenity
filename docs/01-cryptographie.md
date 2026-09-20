# 01 — Cryptographie

## Quoi

La phase 1 pose les fondations du coffre :

- la **spécification** [`crypto.md`](crypto.md) : quelles clés existent, comment elles sont
  dérivées, le format exact des blocs chiffrés, les flux, le modèle de menace ;
- deux **implémentations** qui la suivent à l'octet près :

| | Python (serveur) | TypeScript (navigateur) |
|---|---|---|
| Dossier | `api/serenity/crypto/` | `web/src/crypto/` |
| Bibliothèque | PyNaCl (libsodium) | libsodium-wrappers-sumo |
| Modules | `kdf`, `contexts`, `blocks`, `sealed`, `recovery`, `items`, `encoding`, `server_key` | les mêmes |

- des **vecteurs de test partagés** dans `shared/test-vectors/` (fichiers JSON).

Aucun code applicatif (comptes, coffre, interface) : ça commence en phase 2.

## Pourquoi

- **Deux implémentations, un seul format** : le navigateur chiffre, le serveur (processus
  agent) déchiffre la zone agent. Si les deux divergeaient d'un seul octet, un coffre deviendrait
  illisible. Les vecteurs partagés l'empêchent.
- **Des vecteurs fixes** (même entrée → même sortie attendue) vérifient chaque brique : Argon2id,
  sous-clés, blocs, contextes, kit de récupération, entrées, boîtes scellées. Ils contiennent
  aussi des **cas qui doivent échouer** (bloc modifié, mauvais contexte, paramètres trop faibles,
  faute de frappe dans le kit…).
- **Une vérification croisée** : Python chiffre des blocs neufs (nonces aléatoires) que
  TypeScript déchiffre, puis l'inverse. Elle tourne en CI à chaque pull request.
- **libsodium partout** : aucune primitive écrite à la main. Seule exception documentée :
  `crypto_kdf` n'existe pas dans PyNaCl, on le reconstruit avec BLAKE2b exactement comme
  libsodium ; les vecteurs prouvent que c'est identique.

## Comment tester

Sur la VM, dans `~/code/serenity` :

```bash
git pull
make test             # tests Python, dont tous les vecteurs partagés
make web-test         # eslint, prettier, tsc, vitest (dans Docker, image Node 22)
make crypto-interop   # Python -> TypeScript -> Python avec des blocs neufs
make lint             # ruff, mypy, docker-compose
```

Attendu : tout au vert. `make crypto-interop` affiche `python produced`, deux fois
`1 passed`, puis `python verified`.

Pour voir un vecteur : `less shared/test-vectors/recovery.json` (clés de test sans valeur).

### Régénérer les vecteurs

Seulement si `docs/crypto.md` change (après accord) :

```bash
make vectors
git diff shared/test-vectors/
```

Les boîtes scellées changent à chaque génération (elles sont aléatoires par nature) ; les
autres fichiers doivent rester identiques tant que la spécification ne bouge pas.
