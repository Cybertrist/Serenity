# 02 — Infrastructure Docker

## Quoi

La stack Serenity tourne en **Docker Compose** sur la VM, avec **4 services**, plus le site de
démo derrière son profil :

| Service | Image | Rôle | Réseau | Port sur la VM |
|---|---|---|---|---|
| `web` | nginx | Interface + proxy `/api` | `edge`, `internal` | `127.0.0.1:8080` |
| `api` | Python 3.12 | Comptes, coffre chiffré, journal | `internal` | aucun |
| `agent` | même image que `api` | Seul détenteur de la clé serveur : zone agent, veille, rotations | `egress`, `rotation` | aucun |
| `rotator` | Playwright | Seul conteneur avec un navigateur : exécute les rotations (ADR-015) | `rotation`, `egress` | aucun |
| `demo` | Python 3.12 | Site jouet pour l'agent, profil compose `demo` | `edge`, `rotation` | `127.0.0.1:8090` |

L'accès depuis tes appareils passe uniquement par `tailscale serve` :
`https://<vm>` → `127.0.0.1:8080`. `<vm>` est le nom MagicDNS de la VM
(`serenity.tail18532b.ts.net`), dans `.env` sous `TAILNET_HOST`.

Le site de démo ne démarre qu'avec son profil (`docker compose --profile demo up -d`) : c'est
un jouet pour la rotation, pas un service de la stack ([08 — Rotation](08-rotation.md)).

## Pourquoi

### Deux clés, deux conteneurs

| Fichier sur la VM | Droits | Monté dans | Sert à |
|---|---|---|---|
| `data/keys/server.key` | `root:root 0400` | **`agent` seulement** | Ouvrir les clés d'agent scellées, donc la zone agent |
| `data/keys/totp.key` | `root:root 0400` | **`api` seulement** | Chiffrer les secrets TOTP de connexion en base |

- Les deux fichiers font 32 octets aléatoires. Ils sont **hors de la base** : une copie de
  `serenity.sqlite` ne suffit pas à ouvrir la zone agent.
- L'`api`, exposée au réseau, **ne voit jamais** la clé serveur. L'`agent` n'est joignable par
  personne (aucun port, pas même depuis `web` ou `api`).
- Au démarrage, chaque conteneur part en **root sans aucune capacité** sauf `SETUID`/`SETGID`,
  lit sa clé en mémoire, puis passe définitivement sous l'UID 10001. Ensuite, le service
  **ne peut plus relire** le fichier et n'a plus aucune capacité. Voir
  [ADR-007](decisions/ADR-007-cles-serveur.md).
- L'agent enregistre l'identifiant de sa clé en base. S'il démarre avec une **autre** clé (fichier
  perdu puis recréé, mauvaise restauration), il **refuse de démarrer** plutôt que de rendre la
  zone agent illisible.

### Réseaux

- `internal` (sans Internet) : `web` ↔ `api`.
- `edge` : `web`, publié sur `127.0.0.1`.
- `egress` : la sortie Internet de l'`agent` (Pwned Passwords) et du `rotator` (les sites
  eux-mêmes). L'`api` n'a **pas** d'accès Internet.
- `rotation` (sans Internet) : `agent` ↔ `rotator`, et le site de démo quand son profil tourne.
  Aucun port publié : le rotateur n'est joignable que par l'agent, jeton à l'appui.

### Conteneurs durcis

Système de fichiers en lecture seule, `no-new-privileges`, aucune capacité après le démarrage,
logs limités, images épinglées. Voir [ADR-002](decisions/ADR-002-reseaux-et-durcissement.md).

### nginx retrouve l'api recréée

nginx résout désormais le nom `api` via le DNS de Docker toutes les 10 s. Recréer l'api
(`make up` après une mise à jour) ne provoque plus d'erreur `502` jusqu'au redémarrage de `web`.

## Première installation

Toutes ces commandes s'exécutent **sur la VM**, dans `~/code/serenity`.

```bash
sudo apt install make          # une seule fois
cp .env.example .env
chmod 600 .env
nano .env                      # TAILNET_HOST et SERENITY_SECRET_KEY au minimum
make init                      # crée data/api (demande sudo)
make up                        # crée les clés si besoin, construit et démarre
make ps                        # les 4 services doivent être "healthy"
```

`make up` appelle `make keys`, qui crée `data/keys/server.key` et `data/keys/totp.key`
**uniquement s'ils n'existent pas** : il ne les écrase jamais.

### Commandes du Makefile

| Commande | Effet |
|---|---|
| `make init` | Crée `data/api` avec le bon propriétaire |
| `make keys` | Crée les clés manquantes (`root:root 0400`) et affiche leurs droits |
| `make up` | Clés si besoin, construction et démarrage |
| `make down` / `make restart` | Arrête / redémarre |
| `make logs` | Suit les logs (`make logs s=agent` pour un seul service) |
| `make ps` | État des services |
| `make test`, `make lint` | Tests et qualité backend (Docker, Python 3.12) |
| `make web-test` | Tests et qualité frontend (Docker, Node 22) |
| `make crypto-interop` | Vérification croisée crypto Python ↔ TypeScript |
| `make e2e`, `make ui-smoke` | Parcours bout en bout, puis tous les écrans dans Chromium |
| `make rotation-demo`, `make recipe-inspect URL=…` | Rotation sur le site de démo ; inspecter une page pour écrire sa recette |
| `make backup-now`, `make backup-check`, `make restore-check` | Sauvegardes et exercice de restauration ([09](09-sauvegardes.md)) |
| `make brand-icons`, `make api-doc` | Regénère les icônes depuis les SVG ; regénère `docs/api.md` |

`make help` liste tout, à jour.

## Sauvegarder les clés (séparément)

La sauvegarde automatique restic couvre la base **et** les deux clés : sans la clé serveur, la
zone agent d'un coffre restauré ne se rouvrirait jamais ([09 — Sauvegardes](09-sauvegardes.md)).
Le dépôt restic est donc aussi sensible que la VM elle-même, et son mot de passe vit **hors**
de Serenity.

Garde malgré tout une copie **hors ligne** des deux clés : une sauvegarde qu'on ne peut pas
ouvrir sans la machine qu'on vient de perdre n'en est pas une. Une fois, après le premier
`make up` :

```bash
sudo base64 -w0 data/keys/server.key; echo    # 44 caractères
sudo base64 -w0 data/keys/totp.key; echo
```

Recopie ces deux lignes sur papier ou sur une clé USB rangée à part. **Ne les colle nulle part
ailleurs** (pas dans une conversation, pas dans un ticket).

Restauration (VM neuve, avant `make up`) :

```bash
sudo install -d -m 700 -o root -g root data/keys
echo 'LIGNE_SERVER' | sudo sh -c 'umask 377; base64 -d > data/keys/server.key'
echo 'LIGNE_TOTP'   | sudo sh -c 'umask 377; base64 -d > data/keys/totp.key'
make keys                                      # doit afficher "kept" pour les deux
```

Perdre la clé serveur n'efface pas la zone agent : tes appareils la lisent toujours (voir
`crypto.md` §8.6). Perdre la clé TOTP oblige à reconfigurer le TOTP de connexion.

## Exposer Serenity avec `tailscale serve`

### 1. Activer les certificats HTTPS (navigateur, une seule fois)

Console d'administration Tailscale (https://login.tailscale.com/admin/dns) : **MagicDNS**
activé, **HTTPS Certificates** → **Enable HTTPS**.

### 2. Publier Serenity (sur la VM)

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:8080
sudo tailscale serve status
```

`--bg` rend la configuration persistante. Pour tout retirer : `sudo tailscale serve reset`.

> **Ne pas utiliser `tailscale funnel`** : il exposerait Serenity sur Internet.

## Comment vérifier que tout tourne

Sur la VM :

```bash
make ps                                            # api, agent, rotator, web "healthy"
curl -s http://127.0.0.1:8080/api/health           # {"status":"ok"}
curl -s http://127.0.0.1:8080/api/crypto/server-key   # {"public_key":"…","key_id":"…"}
sudo ss -tlnp | grep docker-proxy                  # uniquement 127.0.0.1:8080
sudo tailscale serve status                        # seulement https://<vm> -> 127.0.0.1:8080
```

Les clés et les privilèges :

```bash
sudo sh -c 'stat -c "%U:%G %a %s %n" data/keys/*.key'   # root:root 400 32
cat data/keys/server.key                                # Permission non accordée
docker compose exec -T agent grep -E '^(Uid|CapEff)' /proc/1/status   # 10001, 0000000000000000
docker compose exec -T api ls /run/serenity/            # totp.key seulement
docker compose exec -T agent ls /run/serenity/          # server.key seulement
```

nginx après recréation de l'api (doit répondre `200` en quelques secondes, sans toucher à `web`) :

```bash
docker compose up -d --force-recreate --no-deps api
sleep 5; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/health
```

Depuis un appareil du tailnet (navigateur) : `https://<vm>` → page « Serenity ».

## Données

| Dossier | Contenu | Propriétaire | Sauvegarde |
|---|---|---|---|
| `data/api/` | SQLite : blocs chiffrés, métadonnées, journal | UID 10001, `0700` | restic, chaque nuit |
| `data/keys/` | `server.key`, `totp.key` | `root:root`, `0700` / `0400` | restic, **et** une copie hors ligne |
