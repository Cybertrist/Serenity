## Quoi

<!-- Ce que fait cette PR, en quelques lignes. -->

Closes #

## Comment tester

```bash
# commandes
```

## Checklist sécurité (CLAUDE.md)

- [ ] Aucun mot de passe en clair (logs, SQLite, API, frontend, notifications, commits, tests)
- [ ] Aucun `.env` ni secret dans le diff (`git diff --staged` vérifié)
- [ ] Aucun port exposé hors `127.0.0.1`
- [ ] Kill switch vérifié avant chaque action de l'agent (si concerné)
- [ ] Chaque action de l'agent écrit dans le journal d'audit (si concerné)
- [ ] Nouvelle dépendance ? Justifiée et validée

## Documentation

- [ ] Page de phase dans `docs/`
- [ ] ADR dans `docs/decisions/` (si choix technique non trivial)
- [ ] `CHANGELOG.md`
