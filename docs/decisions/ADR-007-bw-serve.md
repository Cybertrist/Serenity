# ADR-007 — `bw serve` dans le conteneur api, déverrouillé par secret Docker

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

L'API REST officielle de Bitwarden pour le contenu du coffre passe par le Bitwarden CLI
(`bw serve`), qui chiffre et déchiffre localement. Il faut le lancer, le déverrouiller
sans exposer le mot de passe maître, et le rendre inaccessible aux autres services.

## Décision

- **Binaire autonome** `bw-oss-linux` (build open source, suffisant pour Vaultwarden),
  version et empreinte SHA-256 figées dans `api/Dockerfile` (`ADD --checksum`).
- Lancé **par l'api elle-même** (`serenity/vault_service.py`), comme processus enfant,
  sur `127.0.0.1:8087` : rien d'autre que l'api ne peut l'atteindre. `init: true` (tini)
  récupère les processus terminés.
- État de `bw` en **tmpfs** (`/tmp/bw`) : rien de persistant, reconnexion à chaque démarrage.
- **Mot de passe maître** : fichier `secrets/bw_master_password` (propriétaire UID 10001,
  droits 400, dossier `secrets/` ignoré par Git), monté en secret Docker. Lu uniquement par
  `bw unlock --passwordfile`. La clé de session n'existe que dans l'environnement de `bw serve`.
- Chaque commande `bw` reçoit un **environnement minimal** : `BW_CLIENTSECRET` n'est donné qu'à
  `bw login`.
- Si `bw serve` s'arrête, il est relancé à la synchronisation suivante.

## Conséquences

- Image api plus lourde (~140 Mo pour `bw`).
- « Lisible par root seulement » : sur la VM, root et l'UID 10001 (qui n'est aucun humain).
  Attention : le groupe `docker` équivaut à root ; `tristan` en fait partie.
- Tant que l'api tourne, le coffre partagé est déverrouillé en mémoire du processus `bw serve`.
  C'est le prix d'un agent autonome ; le kill switch (phase 6) pourra le verrouiller.
- Mise à jour de `bw` : changer `BW_VERSION` et l'empreinte (Dependabot ne le suit pas).
