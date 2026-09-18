# 00 — Vue d'ensemble

## En une phrase

Serenity est un **gestionnaire de mots de passe auto-hébergé**, avec son propre coffre chiffré,
et un **agent** qui surveille les fuites et s'occupe des mots de passe que tu lui confies.

## Principe directeur

**Pas d'humain dans la boucle, mais un humain informé.**

- Tu choisis, entrée par entrée, ce que tu confies à l'agent.
- Chaque action de l'agent est notifiée et inscrite dans le journal.
- Un **kill switch** arrête tout, vérifié avant chaque action.

## Le coffre à double zone

| Zone | Contenu | Qui peut lire | Rôle de l'agent |
|---|---|---|---|
| **Personnelle** | Comptes critiques | Seulement ton appareil, déverrouillé par ton mot de passe maître | Aucun accès. Il prévient seulement. |
| **Agent** | Comptes confiés | Ton appareil **et** le serveur (clé d'agent) | Lit, surveille, fait tourner les mots de passe. |

Par défaut, **tout va dans la zone personnelle**.

## Architecture

```
Téléphone / PC (tailnet)
  └─ appli web PWA : toute la crypto de la zone personnelle ici
        │  HTTPS via tailscale serve (seuls des blocs chiffrés transitent)
        ▼
┌──────────── VM serenity (Docker Compose) ────────────┐
│  web (nginx : SPA + proxy /api)                        │
│  api (FastAPI) ── SQLite (blocs chiffrés + métadonnées)│
│     ├─ agent : clé serveur → clé d'agent → zone agent  │
│     └─ notifications : flux temps réel vers les clients│
└────────────────────────────────────────────────────────┘
```

| Brique | Rôle |
|---|---|
| **Appli web** | Dérive les clés, chiffre et déchiffre la zone personnelle. Les clés restent en mémoire. |
| **api** | Stocke les blocs chiffrés, authentifie, fait tourner l'agent et la veille. |
| **SQLite** | Blocs chiffrés et métadonnées. Aucun secret en clair. |
| **Clé serveur** | Fichier hors de la base. Déchiffre la clé d'agent, donc la zone agent uniquement. |
| **Notifications** | Maison : stockées par l'api, poussées en temps réel à l'appli. Aucun service tiers. |
| **Tailscale** | Le seul accès depuis l'extérieur, en HTTPS, réservé à ton tailnet. |

## Les trois versions

| Version | Contenu |
|---|---|
| **V1 — Coffre maison** | Coffre chiffré, API, PWA, import Bitwarden, veille, délégation, rappels, notifications dans l'appli. |
| **V2 — Appli Android** | Appli native Kotlin, notifications Android avec Approuver / Refuser, sans service tiers. |
| **V3 — Rotation** | Changement automatique des mots de passe sur les sites (Playwright), extension navigateur. |
| **V4 — Agent LLM** | Un agent plus autonome, toujours encadré par des règles vérifiées par le code. |

## Règles de sécurité

Elles sont dans [`CLAUDE.md`](../CLAUDE.md). La décision de construire notre propre coffre
est expliquée dans [ADR-001](decisions/ADR-001-coffre-maison.md).
