# Serenity

Gestionnaire de mots de passe **agentique et auto-hébergé**.

Serenity ne remplace pas ton coffre : il pilote une instance **Vaultwarden** existante.
Il surveille les fuites de données, planifie la rotation des mots de passe et te prévient
sur ton téléphone. Il ne te demande rien sans raison, mais tu es toujours informé.

> Capture d'écran à venir (phase 7).

## Ce que fait la V1

- Veille des fuites : Pwned Passwords (k-anonymat), mots de passe réutilisés, faibles ou anciens.
- Planification des rotations, avec des rappels (la rotation automatique arrive en V2).
- Notifications via ntfy, avec boutons Approuver / Refuser.
- Interface web installable (PWA), pensée d'abord pour le mobile.
- Un kill switch arrête l'agent immédiatement.

## Démarrage rapide

> La stack Docker arrive en phase 2. Ces commandes seront valides à partir de là.

```bash
git clone git@github.com:Cybertrist/serenity.git
cd serenity
cp .env.example .env   # puis remplis les valeurs
make up
```

L'accès se fait uniquement via ton tailnet Tailscale (`tailscale serve`).
Aucun port n'est exposé hors de `127.0.0.1`.

## Documentation

Tout est dans [`docs/`](docs/README.md), en français, une page par phase.

## Sécurité

Les règles non négociables sont dans [`CLAUDE.md`](CLAUDE.md).
Résumé : aucun mot de passe en clair, nulle part. La base SQLite ne contient que des métadonnées.
