# CLAUDE.md — Serenity

Relis ce fichier au début de chaque session. Ses règles priment sur tout le reste.

## Le projet

Serenity est un **gestionnaire de mots de passe complet et auto-hébergé**, avec son propre
coffre chiffré, son API et ses clients. Il n'utilise ni Bitwarden ni Vaultwarden.

Sa particularité : un **agent** qui surveille les fuites de données et change
automatiquement les mots de passe qu'on lui confie.

Principe directeur : **pas d'humain dans la boucle, mais un humain informé.**

## Le modèle à double coffre

Le coffre de chaque utilisateur a deux zones :

| Zone | Contenu | Qui peut lire | Rôle de l'agent |
|---|---|---|---|
| **Personnelle** (zero-knowledge) | Comptes critiques : banque, email principal, etc. | Uniquement les clients déverrouillés par le mot de passe maître | Ne peut rien lire. Il prévient seulement. |
| **Agent** | Comptes confiés à l'agent (sensibles, standards) | Les clients **et** le serveur, via la clé d'agent | Lit, surveille et change ces mots de passe. |

Par défaut, **toute entrée va dans la zone personnelle**. La délégation à l'agent est
un choix explicite de l'utilisateur, entrée par entrée, avec confirmation.

## Architecture cryptographique — non négociable

Toute la spécification détaillée vit dans `docs/crypto.md`. Résumé :

- **Bibliothèque unique : libsodium**, via `libsodium-wrappers-sumo` (navigateur)
  et `PyNaCl` / `pysodium` (serveur). **Aucune primitive cryptographique écrite à la main.**
- **Dérivation** : mot de passe maître + sel → Argon2id → **clé maître (MK)**.
  MK ne quitte **jamais** l'appareil et n'est jamais stockée.
- **Authentification** : une **clé d'authentification** est dérivée de MK par KDF
  (sous-clé distincte). Seule elle est envoyée au serveur, qui la stocke hachée en Argon2id.
  Le serveur ne peut pas remonter à MK.
- **Clé utilisateur (UK)** : 32 octets aléatoires, générés côté client, chiffrés par MK.
  Chiffre la zone personnelle.
- **Clé d'agent (AK)** : 32 octets aléatoires, stockée **deux fois** :
  chiffrée par UK (pour les clients) et chiffrée par une **clé serveur** (pour l'agent).
  La clé serveur vit hors de la base (fichier `root:root 0400` ou `systemd-creds`), jamais dans git.
- **Chiffrement des entrées** : XChaCha20-Poly1305 (AEAD), nonce aléatoire de 24 octets,
  **données associées = identifiant de l'entrée + zone + révision**
  (empêche d'échanger ou de rejouer des blocs chiffrés).
- **Kit de récupération** : une clé de récupération aléatoire, affichée une seule fois
  à la création du compte, chiffre aussi UK. Sans mot de passe maître ni kit, la zone
  personnelle est perdue : c'est voulu.

## Ce que le serveur voit et ne voit pas

- Il stocke : blocs chiffrés, révisions, dates, zone de chaque entrée, politiques de rotation.
- Il ne voit **jamais** : le mot de passe maître, MK, UK, ni le contenu de la zone personnelle.
- Il peut déchiffrer la zone agent, **uniquement dans le processus de l'agent**,
  et ne garde jamais un mot de passe déchiffré en mémoire plus longtemps que nécessaire.

## Stack

| Couche | Choix |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLModel + SQLite (mode WAL), APScheduler, httpx, PyNaCl |
| Frontend | React 18, TypeScript strict, Vite, Tailwind CSS v4, vite-plugin-pwa, libsodium-wrappers-sumo |
| Icônes / animations / données | Phosphor Icons, Motion, TanStack Query |
| Notifications | Maison, sans service tiers : centre de notifications dans l'API, flux temps réel vers la PWA puis l'appli Android |
| Appli Android (V2) | Kotlin, Jetpack Compose, libsodium (binding Lazysodium) |
| Rotation (V3) | Playwright, pyotp |
| Infra | Docker Compose sur VM Debian 13, `tailscale serve` pour le HTTPS, restic |
| Qualité | ruff, mypy, pytest ; eslint, prettier, vitest ; gitleaks |

Pas de dépendance hors de cette liste sans me demander.

## Règles de sécurité

1. Aucun secret en clair dans : logs, base, réponses d'API, notifications, commits, tests.
2. Toute la crypto de la zone personnelle se fait **dans le navigateur**.
3. Dans le navigateur : les clés vivent **en mémoire uniquement**, jamais dans
   localStorage, IndexedDB ou le service worker. Verrouillage automatique après 15 min
   d'inactivité et à la fermeture de l'onglet.
4. Vecteurs de test partagés entre Python et TypeScript : un bloc chiffré par l'un
   doit se déchiffrer par l'autre, testé en CI.
5. Les contrôles d'accès (zone, allowlist, kill switch) sont faits **par le code**,
   jamais par un LLM.
6. Rotation **transactionnelle** : nouvelle révision « en attente », ancienne conservée,
   vérification par reconnexion, retour arrière si échec.
7. Kill switch vérifié avant **chaque** action de l'agent.
8. Rien n'écoute hors `127.0.0.1` ; l'accès externe passe par `tailscale serve`.
9. Chaque action de l'agent et chaque connexion écrivent une ligne dans le journal d'audit.
10. Toute modification de `docs/crypto.md` ou du code crypto : **arrête-toi et demande-moi.**

## Conventions

- Code et commentaires en **anglais** ; documentation et interface en **français**.
- Type hints partout, `strict: true` en TypeScript, un module = une responsabilité.
- Conventional Commits, une branche par phase, PR vers `main`, jamais de push direct.
- `git diff --staged` vérifié avant chaque commit.

## Documentation

À chaque phase : page dédiée dans `docs/` (quoi, pourquoi, comment tester),
un ADR court dans `docs/decisions/` par choix non trivial, et `CHANGELOG.md`.

## Façon de travailler

- **Phase par phase.** En fin de phase : résumé, commandes de test,
  puis **arrête-toi et attends ma validation**.
- Question plutôt que supposition dès qu'une consigne est ambiguë ou risquée.
- Précise quand une commande s'exécute hors de la VM (hôte Proxmox, navigateur, téléphone).
- Réponses courtes.
