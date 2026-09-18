# 02 — Infrastructure Docker

## Quoi

La stack Serenity tourne en **Docker Compose** sur la VM, avec 2 services :

| Service | Image | Rôle | Port sur la VM | Accès tailnet |
|---|---|---|---|---|
| `web` | nginx (construite) | Interface + proxy `/api` | `127.0.0.1:8080` | `https://<vm>` |
| `api` | Python 3.12 (construite) | Le cerveau de Serenity | aucun | via `web` |

`<vm>` est le nom MagicDNS de la VM, par exemple `serenity.tail18532b.ts.net`.
On le met dans `.env`, variable `TAILNET_HOST`.

En phase 2, `api` ne répond qu'à `/api/health`, et `web` affiche une page d'attente.
Le vrai contenu arrive en phases 3 et 7.

## Pourquoi

- **Tout sur `127.0.0.1`** : rien n'est joignable depuis le réseau local ou Internet.
  Le seul accès passe par **Tailscale**, qui chiffre et authentifie chaque appareil.
- **Trois réseaux Docker** :
  - `internal` : les services se parlent entre eux, **sans accès Internet** ;
  - `edge` : les services publiés sur `127.0.0.1` (`web`) ;
  - `egress` : la sortie Internet de `api` (Pwned Passwords en phase 5).
  L'`api` n'a **aucun port publié**. Seul `web` peut lui parler.
- **Conteneurs durcis** : utilisateurs non-root, système de fichiers en lecture seule,
  aucune capacité Linux superflue, `no-new-privileges`. Voir [ADR-002](decisions/ADR-002-reseaux-et-durcissement.md).

## Première installation

Toutes ces commandes s'exécutent **sur la VM**, dans `~/code/serenity`.

```bash
sudo apt install make          # une seule fois
cp .env.example .env
chmod 600 .env
nano .env                      # renseigne au minimum TAILNET_HOST
make init                      # crée data/ avec les bons propriétaires (demande sudo)
make up                        # construit et démarre
make ps                        # les 2 services doivent être "healthy"
```

Pour trouver ton `TAILNET_HOST` :

```bash
tailscale status --json | grep -m1 DNSName
```

### Commandes du Makefile

| Commande | Effet |
|---|---|
| `make init` | Crée `data/api` avec le bon propriétaire |
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

### 2. Publier Serenity (sur la VM)

```bash
sudo tailscale serve --bg --https=443   http://127.0.0.1:8080   # Serenity (web)
sudo tailscale serve status
```

`--bg` rend la configuration **persistante** : elle survit aux redémarrages.

Pour tout retirer : `sudo tailscale serve reset`.

> **Ne pas utiliser `tailscale funnel`** : il exposerait les services sur Internet.

## Comment vérifier que tout tourne

Sur la VM :

```bash
make ps                                   # 2 services "healthy"
curl -s http://127.0.0.1:8080/healthz     # ok
curl -s http://127.0.0.1:8080/api/health  # {"status":"ok"}
sudo ss -tlnp | grep docker-proxy         # uniquement 127.0.0.1:8080
```

Depuis un appareil du tailnet (navigateur), après `tailscale serve` :

- `https://<vm>` → page « Serenity »

## Données

Tout est dans `./data/` (ignoré par Git), sauvegardé en phase 8 :

| Dossier | Contenu | Propriétaire |
|---|---|---|
| `data/api/` | SQLite Serenity (métadonnées) | UID 10001 |

La mission demandait des « volumes nommés ». J'ai choisi des **dossiers montés**, plus simples
à sauvegarder avec restic et à inspecter. Voir [ADR-002](decisions/ADR-002-reseaux-et-durcissement.md).
