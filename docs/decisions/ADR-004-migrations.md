# ADR-004 : Migrations SQLite maison au démarrage

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

Le schéma SQLite va évoluer à chaque phase. Alembic est l'outil habituel,
mais il n'est pas dans la stack imposée et apporte beaucoup pour une base mono-utilisateur
de quelques tables.

## Décision

- Au démarrage, `init_db` appelle `SQLModel.metadata.create_all` (crée les tables manquantes).
- Puis il applique les fonctions de la liste `MIGRATIONS` (dans `serenity/db.py`)
  dont le numéro dépasse la version enregistrée dans `setting.schema_version`.
- Chaque migration et la mise à jour de la version sont validées dans la même transaction.
- La liste ne fait que grandir : on ne modifie jamais une migration déjà livrée.
- Si la base est plus récente que le code, l'api refuse de démarrer.

## Conséquences

- Aucune dépendance supplémentaire, logique testée (`tests/test_db.py`).
- Ajouter une colonne demande d'écrire la migration à la main (`ALTER TABLE ...`).
- Pas de retour arrière automatique : on restaure la sauvegarde (phase 8).
