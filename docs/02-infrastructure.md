# 02 — Infrastructure Docker

## Quoi

La stack Serenity tourne en **Docker Compose** sur la VM, avec 4 services :

| Service | Image | Rôle | Port sur la VM | Accès tailnet |
|---|---|---|---|---|
| `web` | nginx (construite) | Interface + proxy `/api` | `127.0.0.1:8080` | `https://<vm>` |
| `api` | Python 3.12 (construite) | Le cerveau de Serenity | aucun | via `web` |
| `vaultwarden` | `vaultwarden/server` | Le coffre | `127.0.0.1:8081` | `https://<vm>:10000` |
| `ntfy` | `binwiederhier/ntfy` | Notifications | `127.0.0.1:8090` | `https://<vm>:8443` |

`<vm>` est le nom MagicDNS de la VM, par exemple `serenity.tail18532b.ts.net`.
On le met dans `.env`, variable `TAILNET_HOST`.

En phase 2, `api` ne répond qu'à `/api/health`, et `web` affiche une page d'attente.
Le vrai contenu arrive en phases 3 et 7.

## Pourquoi

- **Tout sur `127.0.0.1`** : rien n'est joignable depuis le réseau local ou Internet.
  Le seul accès passe par **Tailscale**, qui chiffre et authentifie chaque appareil.
- **Trois réseaux Docker** :
  - `internal` : les services se parlent entre eux, **sans accès Internet** ;
  - `edge` : les services publiés sur `127.0.0.1` (`web`, `vaultwarden`, `ntfy`) ;
  - `egress` : la sortie Internet de `api` (Pwned Passwords en phase 5).
  L'`api` n'a **aucun port publié**. Seul `web` peut lui parler.
- **Conteneurs durcis** : utilisateurs non-root, système de fichiers en lecture seule,
  aucune capacité Linux superflue, `no-new-privileges`. Voir [ADR-002](decisions/ADR-002-reseaux-et-durcissement.md).
- **Vaultwarden joignable depuis le tailnet** : il faut bien créer ton compte et utiliser
  les applis Bitwarden. Voir [ADR-001](decisions/ADR-001-exposition-vaultwarden.md).

## Première installation

Toutes ces commandes s'exécutent **sur la VM**, dans `~/code/serenity`.

```bash
sudo apt install make          # une seule fois
cp .env.example .env
chmod 600 .env
nano .env                      # renseigne au minimum TAILNET_HOST
make init                      # crée data/ avec les bons propriétaires (demande sudo)
make up                        # construit et démarre
make ps                        # les 4 services doivent être "healthy"
```

Pour trouver ton `TAILNET_HOST` :

```bash
tailscale status --json | grep -m1 DNSName
```

### Commandes du Makefile

| Commande | Effet |
|---|---|
| `make init` | Crée `data/api`, `data/ntfy`, `data/vaultwarden` avec les bons propriétaires, et un secret `secrets/bw_master_password` vide |
| `make auth-init` | Crée ton mot de passe et ton TOTP de connexion (phase 3) |
| `make bw-secret` | Enregistre le mot de passe maître du compte Serenity (phase 4) |
| `make up` | Construit les images et démarre la stack |
| `make down` | Arrête la stack |
| `make restart` | Redémarre la stack |
| `make logs` | Suit les logs (`make logs s=api` pour un seul service) |
| `make ps` | État des services |
| `make test` | Tests backend (dans une image Docker Python 3.12) |
| `make lint` | ruff, mypy, validation de `docker-compose.yml` |

Les tests tournent dans Docker, car Debian 13 fournit Python 3.13 alors que le projet
cible Python 3.12. Voir [ADR-003](decisions/ADR-003-outils-dans-docker.md).

## Exposer la stack avec `tailscale serve`

### 1. Activer les certificats HTTPS (navigateur, une seule fois)

Dans la **console d'administration Tailscale** (https://login.tailscale.com/admin/dns) :

- **MagicDNS** : déjà activé ;
- **HTTPS Certificates** : clique sur **Enable HTTPS**.

### 2. Publier les 3 services (sur la VM)

```bash
sudo tailscale serve --bg --https=443   http://127.0.0.1:8080   # Serenity (web)
sudo tailscale serve --bg --https=8443  http://127.0.0.1:8090   # ntfy
sudo tailscale serve --bg --https=10000 http://127.0.0.1:8081   # Vaultwarden
sudo tailscale serve status
```

`--bg` rend la configuration **persistante** : elle survit aux redémarrages.
`tailscale serve` n'accepte que les ports HTTPS 443, 8443 et 10000, d'où ce découpage.

Pour tout retirer : `sudo tailscale serve reset`.

> **Ne pas utiliser `tailscale funnel`** : il exposerait les services sur Internet.

## Vaultwarden

### Créer ton compte

1. Dans `.env`, mets `VW_SIGNUPS_ALLOWED=true`, puis `docker compose up -d vaultwarden`.
2. Depuis un appareil du tailnet, ouvre une **fenêtre de navigation privée** sur
   `https://<vm>:10000/#/signup` et crée ton compte.
   Choisis un mot de passe maître long, et note-le hors ligne.
3. Déconnecte-toi et crée le compte **dédié Serenity** (utilisé en phase 4) avec une autre
   adresse e-mail (par exemple `ton.adresse+serenity@...` : aucun e-mail n'est envoyé).
   Enregistre son mot de passe maître dans ton compte perso.
4. **Referme les inscriptions** : remets `VW_SIGNUPS_ALLOWED=false`, puis `docker compose up -d vaultwarden`.
5. Vérifie : la page d'inscription doit refuser les nouveaux comptes.
6. Active la **connexion en deux étapes** (application d'authentification) sur ton compte perso,
   et garde le code de récupération sur papier. Pas de 2FA sur le compte Serenity :
   il se connectera avec une clé d'API.

> **Pas de lien « Créer un compte » ?** L'interface web garde en mémoire la config du serveur
> dans le stockage du navigateur. Si tu as ouvert la page quand les inscriptions étaient
> fermées, elle croit qu'elles le sont toujours et redirige vers `#/login` (`Ctrl + F5` ne suffit pas).
> Utilise une fenêtre privée, ou efface les données du site (cadenas → Paramètres du site).

Applis Bitwarden (téléphone, navigateur) : au moment de te connecter, choisis
« auto-hébergé » et saisis `https://<vm>:10000`.

### Page d'administration

Elle est **désactivée par défaut** (`/admin` affiche « disabled »).
Pour l'activer **ponctuellement** :

```bash
# 1. Générer un hash argon2 du token d'admin (le mot de passe est demandé)
docker compose exec vaultwarden /vaultwarden hash

# 2. Copier le hash dans .env, ENTRE APOSTROPHES (il contient des $) :
#    VW_ADMIN_TOKEN='$argon2id$v=19$m=...'

# 3. Démarrer Vaultwarden avec l'override admin
docker compose -f docker-compose.yml -f ops/vaultwarden/admin.override.yml up -d vaultwarden

# 4. Ouvrir https://<vm>:10000/admin et se connecter avec le mot de passe (pas le hash)

# 5. Quand tu as fini : désactiver à nouveau
docker compose up -d vaultwarden
```

Tu peux ensuite vider `VW_ADMIN_TOKEN` dans `.env`.

### Réglages appliqués

| Réglage | Valeur | Pourquoi |
|---|---|---|
| `SIGNUPS_ALLOWED` | `false` par défaut | Personne ne peut créer de compte |
| `INVITATIONS_ALLOWED` | `false` | Pas d'invitation par e-mail |
| `PASSWORD_HINTS_ALLOWED` | `false` | Un indice de mot de passe est une fuite en puissance |
| `DISABLE_ICON_DOWNLOAD` | `true` | Sinon, Vaultwarden contacte chaque site du coffre et révèle la liste des domaines |
| `ADMIN_TOKEN` | absent | Page d'admin désactivée |

## ntfy

Configuration : `ops/ntfy/server.yml`.

- **Authentification obligatoire** : `auth-default-access: deny-all`.
  Sans compte, on ne peut ni lire ni publier (HTTP 403).
- **Pas d'inscription** depuis l'interface web.
- **Pas de pièces jointes**.

### Créer les utilisateurs (sur la VM)

```bash
# Toi : lecture seule sur le topic serenity (le mot de passe est demandé)
docker compose exec ntfy ntfy user add tristan
docker compose exec ntfy ntfy access tristan serenity read-only

# Serenity : écriture seule. Mot de passe aléatoire jamais affiché (on n'utilise que le token)
PW=$(openssl rand -base64 32)
docker compose exec -e NTFY_PASSWORD="$PW" ntfy ntfy user add serenity
unset PW
docker compose exec ntfy ntfy access serenity serenity write-only

# Token écrit directement dans .env, sans l'afficher
T=$(docker compose exec -T ntfy ntfy token add serenity | grep -oE 'tk_[a-z0-9]+')
sed -i "s/^NTFY_TOKEN=.*/NTFY_TOKEN=$T/" .env; unset T
grep -c '^NTFY_TOKEN=tk_' .env   # doit afficher 1
```

> Colle ces commandes **une ligne à la fois** : un retour à la ligne au milieu d'une commande
> la casse (par exemple `ntfy user add` sans nom d'utilisateur).

Vérifier : `docker compose exec ntfy ntfy access` liste les droits.

### Installer l'appli sur le téléphone (Android)

1. Connecte le téléphone à **Tailscale**.
2. Installe **ntfy** depuis le Play Store ou F-Droid.
3. Dans les réglages de l'appli, ajoute un **utilisateur** pour le serveur `https://<vm>:8443`
   (identifiant `tristan` et son mot de passe).
4. Abonne-toi au topic `serenity` en choisissant le serveur `https://<vm>:8443`
   (option « utiliser un autre serveur »).
5. Active la **livraison instantanée** sur cet abonnement. Sans elle, Android peut retarder
   les notifications : un serveur auto-hébergé ne passe pas par Firebase.

Test depuis la VM (doit afficher `200` et faire vibrer le téléphone) :

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(grep '^NTFY_TOKEN=' .env | cut -d= -f2)" -H "Title: Serenity" -d "Tout va bien." http://127.0.0.1:8090/serenity
```

## Comment vérifier que tout tourne

Sur la VM :

```bash
make ps                                   # 4 services "healthy"
curl -s http://127.0.0.1:8080/healthz     # ok
curl -s http://127.0.0.1:8080/api/health  # {"status":"ok"}
curl -s http://127.0.0.1:8090/v1/health   # {"healthy":true}
curl -s http://127.0.0.1:8081/alive       # date courante
curl -s -o /dev/null -w "%{http_code}\n" -d x http://127.0.0.1:8090/serenity   # 403 (ntfy refuse les anonymes)
sudo ss -tlnp | grep docker-proxy         # uniquement 127.0.0.1:8080, 8081, 8090
```

Depuis un appareil du tailnet (navigateur), après `tailscale serve` :

- `https://<vm>` → page « Serenity »
- `https://<vm>:8443` → ntfy (connexion demandée)
- `https://<vm>:10000` → Vaultwarden

## Données

Tout est dans `./data/` (ignoré par Git), sauvegardé en phase 8 :

| Dossier | Contenu | Propriétaire |
|---|---|---|
| `data/vaultwarden/` | Coffre chiffré, clés RSA | UID 10003 |
| `data/ntfy/` | Utilisateurs, cache des messages | UID 10002 |
| `data/api/` | SQLite Serenity (métadonnées) | UID 10001 |

La mission demandait des « volumes nommés ». J'ai choisi des **dossiers montés**, plus simples
à sauvegarder avec restic et à inspecter. Voir [ADR-002](decisions/ADR-002-reseaux-et-durcissement.md).
