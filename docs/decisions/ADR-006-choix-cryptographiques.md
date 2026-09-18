# ADR-006 — Choix cryptographiques précisant CLAUDE.md

- **Date** : 2026-09-18
- **Statut** : accepté (validé avec `docs/crypto.md`)

## Contexte

`CLAUDE.md` fixe l'architecture (libsodium, Argon2id, MK, UK, AK, clé serveur, XChaCha20-Poly1305,
données associées). Plusieurs détails restaient à trancher pour pouvoir implémenter.

## Décision

1. **Sous-clés de MK** : AuthKey et MEK sont dérivées de MK par `crypto_kdf` (contextes
   distincts) ; UK est chiffrée par MEK, pas directement par MK.
2. **AK pour le serveur par boîte scellée X25519** (`crypto_box_seal`) plutôt qu'une clé serveur
   symétrique : le navigateur scelle AK avec la clé **publique** du serveur, sans jamais l'envoyer
   en clair, et seul le processus agent (qui détient la clé privée) l'ouvre.
3. **Deux fichiers serveur** : la clé serveur (zone agent) n'est montée que dans le processus
   agent ; une clé TOTP séparée, lue par l'api, chiffre les secrets TOTP en base.
4. **Données associées étendues** avec l'identifiant utilisateur, et un en-tête versionné
   authentifié.
5. **Argon2id 64 Mio / 3 passes**, plancher imposé côté client.
6. **Bourrage** des entrées à 256 octets (`sodium_pad`).
7. **Kit de récupération de 160 bits** en base32 Crockford, avec groupe de contrôle.
8. **Sessions à deux niveaux** : session d'appareil de 60 jours (mot de passe maître + TOTP),
   déverrouillage de 15 min glissantes (mot de passe maître seul, prouvé au serveur par AuthKey)
   exigé pour toute action sensible. Le TOTP n'est donc demandé que sur un nouvel appareil et
   tous les 60 jours.
9. **`crypto_kdf` côté Python** reconstruit via `crypto_generichash_blake2b_salt_personal`
   (PyNaCl ne l'expose pas), vérifié identique à libsodium.js.

## Conséquences

- Le processus agent devient un composant distinct de l'api (précisé en phase 2).
- Une clé publique serveur est exposée aux clients (`GET /api/crypto/server-key`).
- Le kit fait 9 groupes de 4 caractères (le prototype en montre 8 : à ajuster en phase 7).
