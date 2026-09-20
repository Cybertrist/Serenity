<p>
  <img src="docs/img/banniere.png" alt="Serenity" width="820">
</p>

# Serenity

<!-- Dépôt privé : le badge d'état de la CI renvoie 404 sans authentification, donc GitHub ne
     peut pas l'afficher. Au passage en public, remplacer la ligne ci-dessous par :
     [![CI](https://github.com/Cybertrist/Serenity/actions/workflows/ci.yml/badge.svg)](https://github.com/Cybertrist/Serenity/actions/workflows/ci.yml) -->
[![Intégration continue : 8 jobs](https://img.shields.io/badge/int%C3%A9gration%20continue-8%20jobs-0055A4)](.github/workflows/ci.yml)
[![Licence AGPL v3](https://img.shields.io/badge/licence-AGPL%20v3-0055A4)](LICENSE)
[![Chiffrement libsodium](https://img.shields.io/badge/chiffrement-libsodium-0055A4)](docs/crypto.md)
[![Zéro connaissance](https://img.shields.io/badge/zone%20personnelle-z%C3%A9ro%20connaissance-0055A4)](docs/crypto.md)
[![Auto-hébergé](https://img.shields.io/badge/h%C3%A9bergement-chez%20toi-0055A4)](docs/02-infrastructure.md)
[![Audit : pas encore](https://img.shields.io/badge/audit-pas%20encore-E1000F)](SECURITY.md)

Gestionnaire de mots de passe **complet et auto-hébergé**, avec son propre coffre chiffré.

Sa particularité : un **agent** qui surveille les fuites de données et s'occupe des mots de passe
que tu lui confies. Pas d'humain dans la boucle, mais un humain toujours informé.

<p>
  <img src="docs/img/coffre.png" alt="Le coffre" width="200">
  <img src="docs/img/fiche.png" alt="Fiche d'une entrée" width="200">
  <img src="docs/img/fuites.png" alt="Fuites" width="200">
  <img src="docs/img/agent.png" alt="Agent" width="200">
</p>

## Le projet en chiffres

Au 20 septembre 2026, avant la `v0.1.0` :

| | |
|---|---|
| **Tests** | 163 côté Python, 43 côté TypeScript, 14 parcours bout en bout contre le vrai serveur |
| **Intégration continue** | 8 jobs sur chaque pull request, dont un vrai navigateur qui parcourt tous les écrans, une rotation de mot de passe jouée en entier, et un exercice de restauration qui détruit vraiment un coffre jetable |
| **Code** | environ 9 900 lignes de Python, 9 600 de TypeScript |
| **Crypto** | une seule bibliothèque, libsodium, et des vecteurs de test partagés que Python **et** TypeScript doivent tous les deux valider |
| **Documentation** | 11 pages de phase, 17 décisions d'architecture, une spécification cryptographique de 600 lignes, un changelog |

## Le coffre à double zone

| Zone | Pour quoi | Qui peut lire |
|---|---|---|
| **Protégé par toi** | Comptes critiques (banque, e-mail principal…) | Toi seul, avec ton mot de passe maître. Le serveur ne voit que des blocs chiffrés. |
| **Confié à l'agent** | Comptes que tu délègues, un par un | Toi, et l'agent côté serveur, pour surveiller et faire tourner les mots de passe. |

Par défaut, tout va dans la zone personnelle.

## Ce que fait la V1

- Coffre chiffré dans le navigateur (libsodium : Argon2id, XChaCha20-Poly1305), kit de récupération.
- Appli web installable (PWA), en thème clair ou sombre, pensée d'abord pour le mobile.
- Import depuis un export Bitwarden, chiffré sur place, dans le navigateur.
- Veille des fuites : Pwned Passwords (k-anonymat), mots de passe réutilisés, faibles ou anciens.
- Délégation d'entrées à l'agent, planification des rotations avec rappels.
- **L'agent change vraiment les mots de passe** : un conteneur isolé avec navigateur, une
  recette par site, une transaction qui sert le coffre avant le site et sait revenir en arrière.
- Notifications maison, sans service tiers : centre de notifications en temps réel dans l'appli.
- Un kill switch arrête l'agent immédiatement.
- Sauvegarde restic chaque nuit (base chiffrée + clés), avec un exercice de restauration rejoué
  en CI.

Ensuite : l'appli Android native avec notifications (V2), puis la rotation sur tes vrais sites,
avec une recette par site et une extension navigateur (V3).

## Démarrage rapide

```bash
git clone git@github.com:Cybertrist/Serenity.git
cd Serenity
cp .env.example .env   # puis remplis les valeurs
make init
make up
```

**Rien n'est exposé en dehors de `127.0.0.1`.** Serenity ne se met jamais sur Internet : tu
l'atteins depuis tes appareils par l'accès privé de ton choix, réseau maillé, VPN, tunnel SSH ou
reverse proxy sur ton réseau local. La [page infrastructure](docs/02-infrastructure.md) compare
les quatre.

## Documentation

Tout est dans [`docs/`](docs/README.md), en français, une page par phase.
La spécification cryptographique est dans `docs/crypto.md` (phase 1).

## Sécurité

Les règles non négociables sont dans [`CLAUDE.md`](CLAUDE.md). Pour signaler une faille, passe
par [`SECURITY.md`](SECURITY.md), jamais par une issue publique.

> Serenity n'a pas encore été audité. N'y mets pas de comptes réels avant la version 0.1.0
> et un audit externe.

## Contribuer

Le périmètre est tenu court, donc ouvre une issue avant d'écrire du code.
Tout est expliqué dans [`CONTRIBUTING.md`](CONTRIBUTING.md) : comment lancer le projet, quoi
vérifier avant une pull request, et les règles qui ne se discutent pas.

## Licence

[GNU AGPL v3](LICENSE) ou version ultérieure. Copyright (C) 2026 Tristan.

L'AGPL est le choix habituel pour un serveur auto-hébergé, celui du serveur Bitwarden entre
autres : qui fait tourner une version modifiée de Serenity pour d'autres personnes doit en
publier le code. Serenity est distribué sans aucune garantie.
