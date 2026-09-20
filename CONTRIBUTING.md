# Contribuer à Serenity

*This project is written and documented in French. Code and code comments are in English.*

Serenity est un coffre auto-hébergé, tenu par une personne. Les contributions sont les
bienvenues, mais le périmètre reste serré : mieux vaut ouvrir une issue avant d'écrire du code,
pour savoir si l'idée entre dans le projet.

Pour signaler une faille, ne passe pas par une issue : lis [`SECURITY.md`](SECURITY.md).

## Les règles qui ne se discutent pas

Elles vivent dans [`CLAUDE.md`](CLAUDE.md), qui prime sur cette page. Les plus importantes :

1. **Aucun secret en clair** dans les journaux, la base, les réponses d'API, les notifications,
   les commits ou les tests.
2. **Toute la crypto de la zone personnelle se fait dans le navigateur.** Les clés y vivent en
   mémoire seulement, jamais dans `localStorage`, `IndexedDB` ou le service worker.
3. **[`docs/crypto.md`](docs/crypto.md) ne change pas sans accord préalable.** Une pull request
   qui touche la spécification ou le code crypto sans en avoir parlé avant sera fermée.
4. **Les contrôles d'accès sont faits par le code**, jamais par un modèle de langage : zone,
   allowlist, kill switch, plafond quotidien.
5. **Aucune dépendance en dehors de la pile déjà listée** dans `CLAUDE.md` sans en discuter.
6. **Une seule bibliothèque de crypto, libsodium.** Aucune primitive écrite à la main.

## Écrire

- **Code et commentaires en anglais, documentation et interface en français.**
- Type hints partout en Python, `strict: true` en TypeScript, un module pour une responsabilité.
- **Pas de tiret long ni de tiret moyen**, nulle part. La section « Écriture » de `CLAUDE.md`
  dit pourquoi et par quoi les remplacer.
- Des phrases courtes, qui se disent à voix haute.

## Lancer le projet

Tout tourne dans Docker, il n'y a rien à installer à part `make` et Docker.

```bash
cp .env.example .env    # puis remplis TAILNET_HOST et SERENITY_SECRET_KEY
make init               # crée data/api
make up                 # clés si besoin, construction, démarrage
make help               # toutes les commandes
```

## Vérifier avant d'ouvrir une pull request

```bash
make lint            # ruff, mypy, docker compose config
make test            # la suite Python
make web-test        # eslint, prettier, tsc, vitest, build de production
make crypto-interop  # un bloc chiffré par Python se déchiffre en TypeScript, et l'inverse
make e2e             # le client TypeScript contre le vrai serveur
make ui-smoke        # Chromium parcourt tous les écrans, thème clair compris
```

Selon ce que tu touches, ajoute `make rotation-demo` (l'agent change un mot de passe sur le site
de démo, vrai navigateur) et `make backup-check` (l'exercice de restauration).

## La forme d'une contribution

- Une branche par sujet, jamais de push direct sur `main`.
- [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`.
- `git diff --staged` relu avant chaque commit. Surtout : aucun secret, aucune capture avec des
  données réelles.
- Une pull request vers `main`, avec ce que tu as vérifié et comment le rejouer.
- La CI doit être verte.

## La documentation fait partie du travail

Une fonctionnalité sans documentation n'est pas finie :

- la page de phase concernée dans [`docs/`](docs/README.md) : quoi, pourquoi, comment tester ;
- un ADR court dans [`docs/decisions/`](docs/decisions/README.md) pour tout choix non trivial ;
- une ligne dans [`CHANGELOG.md`](CHANGELOG.md).

Si tu touches à l'interface, refais les captures avec `make ui-smoke` plutôt qu'à la main.

## Se tenir correctement

Sois direct sur le code, correct avec les personnes. Pas de harcèlement, pas d'attaque
personnelle, pas de mépris pour une question de débutant. Le mainteneur peut fermer une
discussion ou bloquer un compte si ça dérape.
