<div align="center">

<img src="docs/img/banniere.png" alt="Serenity, ton coffre de mots de passe chez toi. Un agent surveille les fuites et change ceux que tu lui confies." width="100%">

[![CI](https://github.com/Cybertrist/Serenity/actions/workflows/ci.yml/badge.svg)](https://github.com/Cybertrist/Serenity/actions/workflows/ci.yml)

</div>

Gestionnaire de mots de passe **complet et auto-hébergé**, avec son propre coffre chiffré. Ni Bitwarden ni Vaultwarden dessous : le coffre, l'API et les clients sont écrits ici.

Sa particularité : un **agent** qui surveille les fuites de données et s'occupe des mots de passe que tu lui confies. Le principe tient en une phrase, pas d'humain dans la boucle, mais un humain toujours informé.

<img src="docs/img/bureau-coffre.png" alt="Le coffre sur ordinateur : les entrées protégées par le mot de passe maître d'un côté, celles confiées à l'agent de l'autre, et un bandeau qui signale les comptes à surveiller." width="100%">

<img src="docs/img/sections/s01.png" alt="01 Le coffre" width="100%">

Le coffre a deux zones, et c'est le choix de conception qui commande tout le reste.

<img src="docs/img/schemas/coffre.png" alt="Zone personnelle, en zéro connaissance : elle contient les comptes critiques comme la banque ou la messagerie principale. Toi seul les lis, depuis un client déverrouillé par le mot de passe maître. L'agent n'y lit rien, il prévient seulement. Le serveur ne stocke que des blocs chiffrés, et sans mot de passe maître ni kit de récupération cette zone est perdue, ce qui est voulu. Zone agent, sur délégation explicite : elle contient les comptes que tu confies un par un avec confirmation. Toi et l'agent côté serveur les lisez, par une clé distincte rangée hors de la base. L'agent y surveille les fuites et fait tourner les mots de passe. Par défaut toute entrée va dans la zone personnelle." width="100%">

<div align="center">

<img src="docs/img/coffre.png" alt="Le coffre sur mobile" width="24%">
<img src="docs/img/codes.png" alt="Les codes à deux facteurs" width="24%">
<img src="docs/img/fuites.png" alt="L'écran des fuites détectées" width="24%">
<img src="docs/img/agent.png" alt="L'écran de l'agent" width="24%">

</div>

Sous le capot, une seule bibliothèque de cryptographie, libsodium, et aucune primitive écrite à la main. Le mot de passe maître passe par Argon2id pour donner la clé maître, qui ne quitte jamais l'appareil. Les entrées sont chiffrées en XChaCha20-Poly1305, avec l'identifiant de l'entrée, sa zone et sa révision en données associées : deux blocs chiffrés ne peuvent ni être échangés ni être rejoués. La spécification complète tient dans [`docs/crypto.md`](docs/crypto.md).

<img src="docs/img/sections/s02.png" alt="02 L'agent" width="100%">

<img src="docs/img/schemas/agent.png" alt="Une fuite sort : Pwned Passwords signale le mot de passe en k-anonymat, il ne quitte jamais l'appareil. L'agent propose : il prépare la rotation sans rien déclencher, et le kill switch est vérifié avant chaque action. Tu approuves : rien ne bouge sans ce geste. Le site change : nouvelle révision en attente, ancienne conservée, reconnexion pour preuve, retour arrière si elle échoue." width="100%">

La preuve est demandée au site lui-même : l'ancien mot de passe est refusé, le nouveau ouvre la porte. Rien n'est rejoué ni mis en scène, c'est `make film` qui l'enregistre contre le site de démonstration.

<div align="center">

<img src="docs/img/agent-demo.gif" alt="L'agent change un mot de passe sur le site de démonstration, de bout en bout" width="90%">

</div>

<img src="docs/img/sections/s03.png" alt="03 Ce que fait la V1" width="100%">

<img src="docs/img/schemas/v1.png" alt="Coffre chiffré dans le navigateur, avec Argon2id pour la dérivation, XChaCha20-Poly1305 pour les entrées et un kit de récupération montré une seule fois. Application installable en PWA, thème clair ou sombre, pensée d'abord pour le mobile. Import depuis l'existant : mots de passe Google en CSV, codes d'Authenticator ou export Bitwarden, chiffrés sur place. Veille des fuites par Pwned Passwords en k-anonymat, plus la détection des mots de passe réutilisés, faibles ou anciens. Codes à deux facteurs calculés dans le navigateur, hors ligne compris. Rotation réelle dans un conteneur isolé, une recette par site, une transaction qui sert le coffre avant le site. Notifications maison, sans service tiers. Sauvegarde restic chaque nuit, avec un exercice de restauration rejoué en intégration continue." width="100%">

Un kill switch arrête l'agent immédiatement, et il est vérifié avant chaque action, pas seulement au lancement.

Ensuite viendra l'application Android native avec notifications en V2, puis la rotation sur de vrais sites en V3, avec une recette par site et une extension de navigateur.

<div align="center">

<img src="docs/img/clair-coffre.png" alt="Le même coffre en thème clair" width="49%">
<img src="docs/img/connexion.png" alt="L'écran de connexion" width="49%">

</div>

<img src="docs/img/sections/s04.png" alt="04 En chiffres" width="100%">

Au 20 septembre 2026, avant la `v0.1.0`.

<img src="docs/img/schemas/chiffres.png" alt="Tests : 163 côté Python, 43 côté TypeScript, 14 parcours bout en bout joués contre le vrai serveur. Intégration continue : 8 jobs par pull request, dont un navigateur qui parcourt tous les écrans et un coffre jetable réellement détruit puis restauré. Code : environ 9 900 lignes de Python et 9 600 de TypeScript. Cryptographie : une seule bibliothèque, libsodium, et des vecteurs de test que Python et TypeScript doivent tous deux valider. Documentation : 11 pages de phase, 17 décisions d'architecture, une spécification cryptographique de 600 lignes, un changelog. État : version 0.1.0 en approche, aucun audit externe à ce jour." width="100%">

<img src="docs/img/sections/s05.png" alt="05 Installation" width="100%">

```bash
git clone git@github.com:Cybertrist/Serenity.git
cd Serenity
cp .env.example .env   # puis remplis les valeurs
make init
make up
```

**Rien n'est exposé en dehors de `127.0.0.1`.** Serenity ne se met jamais sur Internet : tu l'atteins depuis tes appareils par l'accès privé de ton choix, réseau maillé, VPN, tunnel SSH ou reverse proxy sur ton réseau local. La [page infrastructure](docs/02-infrastructure.md) compare les quatre.

Toute la documentation est dans [`docs/`](docs/README.md), en français, une page par phase.

<img src="docs/img/sections/s06.png" alt="06 Sécurité et licence" width="100%">

> Serenity n'a pas encore été audité. N'y mets pas de comptes réels avant la version 0.1.0 et un audit externe.

Les règles non négociables sont dans [`CLAUDE.md`](CLAUDE.md). Pour signaler une faille, passe par [`SECURITY.md`](SECURITY.md), jamais par une issue publique.

Le périmètre est tenu court, donc ouvre une issue avant d'écrire du code. [`CONTRIBUTING.md`](CONTRIBUTING.md) explique comment lancer le projet, quoi vérifier avant une pull request, et les règles qui ne se discutent pas.

Licence [GNU AGPL v3](LICENSE) ou version ultérieure, copyright (C) 2026 Tristan. C'est le choix habituel pour un serveur auto-hébergé, celui du serveur Bitwarden entre autres : qui fait tourner une version modifiée de Serenity pour d'autres personnes doit en publier le code. Serenity est distribué sans aucune garantie.
