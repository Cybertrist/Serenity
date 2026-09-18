# 00 — Vue d'ensemble

## En une phrase

Serenity est un **agent** qui veille sur tes mots de passe stockés dans Vaultwarden :
il détecte les fuites, planifie les rotations et te prévient.

## Principe directeur

**Pas d'humain dans la boucle, mais un humain informé.**

- Sur les comptes **secondaires**, l'agent peut agir seul.
- Sur les comptes **critiques**, il demande toujours ta validation.
- Chaque action est notifiée, avec possibilité d'annuler.
- Un **kill switch** arrête tout, vérifié avant chaque action.

## Architecture

```
Téléphone / PC (tailnet)
        │  HTTPS via tailscale serve
        ▼
┌──────────────── VM serenity (Docker Compose) ────────────────┐
│  web (nginx : SPA + proxy /api)  ──►  api (FastAPI)           │
│                                        │   ├─ SQLite (métadonnées)
│                                        │   ├─ bw serve ──► vaultwarden
│                                        │   └─ ntfy
│  vaultwarden        ntfy                                      │
└───────────────────────────────────────────────────────────────┘
```

| Brique | Rôle |
|---|---|
| **Vaultwarden** | Le coffre. Seul endroit où vivent les mots de passe. |
| **bw serve** | Le Bitwarden CLI en mode API locale, utilisé par l'API pour lire et écrire dans le coffre. |
| **api** | Le cerveau : FastAPI, planificateur, veille, journal d'audit. |
| **SQLite** | Uniquement des **métadonnées** (nom, domaine, échéances, alertes). Jamais de secret. |
| **ntfy** | Les notifications sur ton téléphone. |
| **web** | L'interface (PWA) servie par nginx. |
| **Tailscale** | Le seul accès depuis l'extérieur, en HTTPS, réservé à ton tailnet. |

## Les trois versions

| Version | Contenu |
|---|---|
| **V1 — Veille** | Surveillance des fuites, rappels de rotation, notifications, interface. |
| **V2 — Rotation** | Changement automatique des mots de passe sur les sites (Playwright). |
| **V3 — Agent LLM** | Un agent plus autonome, toujours encadré par des règles vérifiées par le code. |

## Règles de sécurité

Elles sont listées dans [`CLAUDE.md`](../CLAUDE.md) et s'appliquent à chaque ligne de code.
Les plus importantes :

1. Aucun mot de passe en clair, nulle part (logs, base, API, interface, notifications, tests).
2. Pour vérifier une fuite, seuls les **5 premiers caractères** du hash SHA-1 quittent la machine.
3. Aucun port n'écoute hors de `127.0.0.1`.
4. Chaque action de l'agent est inscrite dans le journal d'audit.
