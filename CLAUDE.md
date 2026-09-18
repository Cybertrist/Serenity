# CLAUDE.md — Serenity

Ce fichier définit les règles permanentes du projet. Relis-le au début de chaque session.

## Le projet

Serenity est un gestionnaire de mots de passe **agentique et auto-hébergé**.
Il surveille les fuites de données, fait tourner les mots de passe automatiquement
et prévient l'utilisateur. Il **ne remplace pas** le coffre : il pilote une instance
Vaultwarden existante.

Principe directeur : **pas d'humain dans la boucle, mais un humain informé.**
L'agent agit seul sur les comptes secondaires, demande validation sur les comptes critiques,
et chaque action est notifiée avec possibilité d'annuler. Un kill switch arrête tout.

## Environnement

- VM Debian 13 sur Proxmox, accessible uniquement via Tailscale
- Tout tourne en Docker Compose
- Utilisateur : `tristan`, dépôt dans `~/code/serenity`

## Stack imposée

| Couche | Choix |
|---|---|
| Coffre | Vaultwarden (image officielle) |
| Accès au coffre | Bitwarden CLI en mode `bw serve` (écoute sur localhost du conteneur uniquement) |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLModel + SQLite, APScheduler, httpx |
| Rotation (V2) | Playwright (Chromium), pyotp |
| Frontend | React 18, TypeScript strict, Vite, Tailwind CSS v4, vite-plugin-pwa |
| Icônes | Phosphor Icons (`@phosphor-icons/react`) — voir charte |
| Animations | Motion (`motion/react`) |
| Données côté client | TanStack Query |
| Notifications | ntfy (auto-hébergé, dans le même Compose) |
| HTTPS | `tailscale serve` (pas de reverse proxy public) |
| Sauvegardes | restic |
| Qualité | ruff, mypy, pytest (backend) ; eslint, prettier, vitest (frontend) |

N'ajoute pas de dépendance hors de cette liste sans me le demander et justifier.

## Règles de sécurité — non négociables

1. **Aucun mot de passe en clair** dans : les logs, la base SQLite, les réponses d'API,
   le frontend, les messages ntfy, les messages de commit, les tests.
2. La base SQLite ne contient **que des métadonnées**. Les secrets vivent dans Vaultwarden.
3. Les secrets de configuration sont dans `.env` (jamais commité). Maintiens `.env.example` à jour.
4. L'allowlist des domaines de rotation est vérifiée **par le code**, jamais par un LLM.
5. Toute rotation est **transactionnelle** : nouveau mot de passe enregistré « en attente »
   dans le coffre avant de toucher au site, ancien conservé, validation par reconnexion,
   retour arrière en cas d'échec.
6. Le kill switch est vérifié avant **chaque** action de l'agent, pas seulement au démarrage.
7. Aucun port exposé sur l'hôte hors `127.0.0.1`. L'accès externe passe par `tailscale serve`.
8. Pour les fuites de mots de passe, utilise uniquement l'API Pwned Passwords en **k-anonymat**
   (seuls les 5 premiers caractères du hash SHA-1 sortent).
9. Toute action de l'agent écrit une ligne dans le journal d'audit.

## Conventions de code

- Code, noms de variables et commentaires en **anglais**.
- Documentation (`docs/`, README) et textes de l'interface en **français**.
- Type hints partout en Python, `strict: true` en TypeScript.
- Fonctions courtes, un module = une responsabilité.
- Tests pour toute logique métier (calcul de prochaine rotation, allowlist, kill switch,
  k-anonymat, transaction de rotation).

## Git

- Commits au format **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Une branche par phase : `phase/01-repo`, `phase/02-infra`, etc. Pull request vers `main`.
- Vérifie `git diff --staged` avant chaque commit : aucun secret, aucun `.env`.
- Ne pousse jamais directement sur `main`.

## Documentation

À chaque phase terminée, mets à jour :
- `docs/` : la page de la phase (quoi, pourquoi, comment tester), en français, simple et pédagogique ;
- `docs/decisions/` : un ADR court pour chaque choix technique non trivial ;
- `CHANGELOG.md`.

## Façon de travailler

- Travaille **phase par phase**. À la fin de chaque phase : résume ce qui a été fait,
  liste les commandes pour tester, puis **arrête-toi et attends ma validation**.
- Si une instruction est ambiguë ou risquée, pose la question plutôt que de deviner.
- Quand une commande doit être lancée hors de la VM (hôte Proxmox, navigateur, téléphone),
  dis-le explicitement.
- Réponses courtes. Pas de longs préambules.
