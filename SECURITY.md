# Sécurité

*This project is written and documented in French. Security reports are welcome in English too.*

Serenity garde des mots de passe. Une faille ici ne casse pas une fonctionnalité, elle ouvre
des comptes. Les signalements sont donc traités avant tout le reste.

## Signaler une faille

**N'ouvre pas d'issue publique.** Passe par l'onglet **Security** du dépôt,
« Report a vulnerability » (signalement privé GitHub). Le rapport n'est visible que par le
mainteneur tant qu'il n'est pas corrigé.

Ce qui aide, dans l'ordre :

1. Le commit concerné (`git rev-parse HEAD`) ou la version.
2. Le scénario, assez précis pour être rejoué, avec des comptes jetables. **Aucune donnée
   réelle**, aucun mot de passe qui sert vraiment.
3. La section de [`docs/crypto.md`](docs/crypto.md) que ça contredit, si c'est de la crypto.
4. Ce que l'attaquant obtient, et ce qu'il devait déjà posséder pour y arriver.

Délais visés, sur un projet tenu par une seule personne :

| Étape | Délai |
|---|---|
| Accusé de réception | 7 jours |
| Première analyse, gravité, plan | 30 jours |
| Divulgation coordonnée | 90 jours, ou avant si le correctif est prêt |

## Versions suivies

Aucune version stable pour l'instant. Seule la branche `main` est suivie. La `v0.1.0` viendra
après la revue de sécurité complète.

> Serenity n'a **pas** été audité. N'y mets pas de comptes réels avant la `v0.1.0` et un audit
> externe.

## Dans le périmètre

- Toute fuite d'un secret là où il ne devrait pas être : journaux, base, réponses d'API,
  notifications, commits, tests.
- Tout ce qui contredit [`docs/crypto.md`](docs/crypto.md) : dérivation, enveloppes de clés,
  données associées d'un bloc, kit de récupération, rotation transactionnelle.
- Le serveur qui arriverait à lire la **zone personnelle**, de près ou de loin.
- Les garde-fous de l'agent contournés : kill switch, allowlist, plafond quotidien, refus de
  toucher à une entrée personnelle.
- L'isolation des conteneurs : l'api qui atteindrait la clé serveur, le rotateur joignable sans
  jeton, un port qui sort de `127.0.0.1`.
- L'interface : CSP contournée, clé écrite dans `localStorage`, `IndexedDB` ou le service
  worker, verrouillage automatique qui ne verrouille pas.

## Hors périmètre, et c'est voulu

Ce sont des choix de conception, documentés. Les signaler ne sert à rien, sauf à montrer qu'ils
sont moins solides que ce que la doc prétend.

- **Le serveur lit la zone agent.** C'est le contrat de cette zone, entrée par entrée, avec
  confirmation. La zone personnelle, elle, reste illisible pour lui.
- **Perdre le mot de passe maître et le kit de récupération perd la zone personnelle.** Il n'y a
  pas de porte de secours, c'est la promesse du produit.
- **Le presse-papiers** est lisible par les autres applications pendant les 30 secondes qui
  suivent une copie.
- **Le hameçonnage** n'est pas détecté sans extension navigateur, ce qui viendra en V3.
- **Un attaquant root sur la VM** lit la clé serveur, donc la zone agent. Le modèle de menace le
  dit ([`docs/crypto.md`](docs/crypto.md), section 8).
- Les rapports de scanners automatiques sans scénario d'exploitation.

## Ce que je fais de mon côté

- `gitleaks` passe sur tout l'historique à chaque pull request.
- Dependabot propose les mises à jour de sécurité chaque semaine.
- Les vecteurs de test crypto sont vérifiés par Python **et** par TypeScript, en CI.
- La rotation, les sauvegardes et le parcours complet de l'interface sont rejoués à chaque
  commit, navigateur compris.
