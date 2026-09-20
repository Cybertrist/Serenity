# ADR-005 : Authentification mono-utilisateur

- **Date** : 2026-09-18
- **Statut** : remplacé. Le nouveau modèle d'authentification est décrit en phase 3 (clé d'auth dérivée côté client)

## Contexte

Serenity a un seul utilisateur. L'accès est déjà limité au tailnet, mais l'interface
pilote le coffre : elle mérite une vraie authentification à deux facteurs.
La règle 2 interdit tout secret dans SQLite.

## Décision

- **Mot de passe** haché en argon2id (`argon2-cffi`) et **graine TOTP** (`pyotp`) dans
  `/data/auth.json`, droits `600`, créé par `python -m serenity.auth init` (`make auth-init`).
  Ce fichier n'est pas dans SQLite : la base reste purement métadonnées.
- **Sessions côté serveur** : le cookie contient un jeton aléatoire de 256 bits ;
  la table `auth_session` n'en stocke que le HMAC-SHA256 (clé `SERENITY_SECRET_KEY`).
  Déconnexion = suppression de la ligne, effet immédiat.
- **Cookie** `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api`, 12 h, sans renouvellement.
- **Anti-rejeu TOTP** : le dernier pas de temps utilisé est mémorisé, un code ne sert qu'une fois.
- **Limitation globale** (pas par IP : un seul utilisateur, et toutes les requêtes arrivent
  par nginx) : 5 échecs → blocage 15 min, état en base.
- Pas de protection CSRF dédiée : `SameSite=Strict` et un corps JSON suffisent pour une API
  consommée uniquement par sa propre interface.

## Conséquences

- `argon2-cffi` et `pydantic-settings` ajoutés aux dépendances (demandés par la feuille de route).
- `auth.json` doit être sauvegardé avec `data/api` (phase 8). S'il est perdu : `make auth-init force=1`.
- Le blocage global permet à un appareil du tailnet de bloquer la connexion pendant 15 min :
  risque accepté, le tailnet est de confiance.
- Changer `SERENITY_SECRET_KEY` déconnecte toutes les sessions.
