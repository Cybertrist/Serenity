# 03 — Socle backend

## Quoi

L'`api` devient une vraie application FastAPI, avec :

| Brique | Fichier | Rôle |
|---|---|---|
| Configuration | `serenity/config.py` | Lit les variables `SERENITY_*` (pydantic-settings), refuse de démarrer si une valeur est invalide |
| Modèles | `serenity/models.py` | Tables SQLite : `Entry`, `Breach`, `Rotation`, `AuditLog`, `Setting`, `AuthSession` |
| Base | `serenity/db.py` | Moteur SQLite (WAL, clés étrangères) et migrations au démarrage |
| Authentification | `serenity/auth/` | Mot de passe argon2 + TOTP, sessions, limitation des tentatives, commande `init` |
| Journal d'audit | `serenity/audit.py` | Une ligne par action, avec un **filtre anti-secret** (base et logs) |
| Règles | `serenity/policy.py` | Calcul de la prochaine rotation (`next_rotation_at`) |

Routes disponibles :

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/health` | libre | Healthcheck Docker |
| `POST /api/auth/login` | libre | Connexion : `{"password": "...", "totp": "123456"}` |
| `POST /api/auth/logout` | session | Déconnexion (la session est supprimée côté serveur) |
| `GET /api/auth/me` | session | Session en cours et date d'expiration |
| `GET /api/logs` | session | Journal d'audit, du plus récent au plus ancien (`?limit=`, `?before_id=`) |

## Pourquoi

### Rien de secret dans SQLite

La base ne contient que des **métadonnées** : noms, domaines, dates, statuts.
Le mot de passe de connexion (haché en argon2) et la graine TOTP sont dans un fichier à part,
`/data/auth.json`, lisible uniquement par l'utilisateur du conteneur (droits `600`).
La session n'est stockée que sous forme d'empreinte HMAC : voler la base ne permet pas
de se connecter. Voir [ADR-005](decisions/ADR-005-authentification.md).

### Une connexion solide, pour un seul utilisateur

- **Deux facteurs** obligatoires : mot de passe (12 caractères minimum) et code TOTP.
- Un code TOTP **ne sert qu'une fois** (anti-rejeu). Une dérive d'horloge de 30 s est tolérée.
- **Limitation des tentatives** : après 5 échecs, connexion bloquée 15 minutes (réglable dans `.env`).
  Le compteur est en base : il survit à un redémarrage.
- **Cookie de session** `HttpOnly` (invisible pour JavaScript), `Secure` (HTTPS uniquement),
  `SameSite=Strict` (jamais envoyé depuis un autre site), valable **12 h**.

### Un journal d'audit qui ne peut pas fuiter

Toute action passe par `audit.record()`. Avant d'écrire, le filtre remplace par `[REDACTED]` :

- les valeurs des clés sensibles (`password`, `token`, `secret`, `totp`, `api_key`…) ;
- les motifs `password=...`, `token: ...`, `Authorization: Bearer ...` dans le texte ;
- les formats connus (jetons ntfy `tk_...`, hachés argon2, liens `otpauth://`).

Le même filtre est branché sur **tous les logs** de l'application, y compris ceux d'uvicorn.

### Des migrations simples

Pas d'Alembic (hors de la stack). Au démarrage, `init_db` crée les tables manquantes puis
applique, dans l'ordre, les migrations pas encore passées. La version du schéma est
dans la table `setting`. Voir [ADR-004](decisions/ADR-004-migrations.md).

### Prochaine rotation

`next_rotation_at(dernier changement, intervalle en jours)` :

- pas d'intervalle → jamais de rotation automatique ;
- date du dernier changement inconnue → rotation due **maintenant** (on ne peut pas se fier à l'âge) ;
- sinon → dernier changement + intervalle.

## Comment tester

Toutes les commandes s'exécutent **sur la VM**, dans `~/code/serenity`.

### 1. La clé secrète

`SERENITY_SECRET_KEY` est désormais **obligatoire** (sans elle, `docker compose` refuse de démarrer).
Pour la générer sans l'afficher :

```bash
K=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
sed -i "s/^SERENITY_SECRET_KEY=.*/SERENITY_SECRET_KEY=$K/" .env; unset K
grep -c '^SERENITY_SECRET_KEY=.\{32,\}' .env   # doit afficher 1
```

### 2. Tests et qualité

```bash
make test    # 38 tests
make lint    # ruff, mypy, docker-compose
```

### 3. Démarrer et créer tes identifiants

```bash
make up
make ps                 # api "healthy"
make auth-init          # mot de passe + TOTP (interactif)
```

La commande affiche une **clé TOTP** : ajoute-la dans ton application d'authentification
(saisie manuelle, « basé sur le temps »), puis tape le code à 6 chiffres pour valider.
Pour remplacer des identifiants existants : `make auth-init force=1`.

### 4. Se connecter

Le cookie est `Secure` : il faut passer par HTTPS, donc par `tailscale serve`.
Depuis la VM (remplace `<vm>` par ton `TAILNET_HOST`) :

```bash
read -rs -p "Mot de passe : " P; echo; read -r -p "Code TOTP : " C
curl -s -c /tmp/serenity.cookies -o /dev/null -w '%{http_code}\n' \
  -H 'content-type: application/json' \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"password": sys.argv[1], "totp": sys.argv[2]}))' "$P" "$C")" \
  https://<vm>/api/auth/login          # 204
unset P C
curl -s -b /tmp/serenity.cookies https://<vm>/api/auth/me     # {"authenticated":true,...}
curl -s -b /tmp/serenity.cookies https://<vm>/api/logs        # journal : app.start, auth.init, auth.login
curl -s -b /tmp/serenity.cookies -X POST -o /dev/null -w '%{http_code}\n' https://<vm>/api/auth/logout  # 204
rm /tmp/serenity.cookies
```

### 5. Vérifier qu'aucun secret n'est en base ni dans les logs

```bash
docker compose exec api ls -l /data                  # auth.json en -rw-------
docker compose logs api | grep -ci password          # 0
```
