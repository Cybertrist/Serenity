# ADR-001 : Coffre maison à double zone plutôt que Vaultwarden

- **Date** : 2026-09-18
- **Statut** : accepté
- **Remplace** : [l'ancien ADR-001](archive/ADR-001-exposition-vaultwarden.md) et l'intégration Vaultwarden

## Contexte

La première version de Serenity pilotait un Vaultwarden existant, via le Bitwarden CLI
(`bw serve`) et un compte dédié. En pratique :

- le serveur Serenity devait détenir le **mot de passe maître** de ce compte, donc pouvoir
  déchiffrer tout ce qui lui était partagé, en permanence ;
- le CLI récent exige HTTPS même sur le réseau interne Docker, ce qui ajoutait une couche TLS
  interne ou un contournement ;
- la séparation « ce que l'agent peut lire » / « ce qu'il ne peut pas lire » reposait sur des
  organisations et collections Vaultwarden, pas sur la cryptographie ;
- deux coffres et deux interfaces à maintenir (Vaultwarden + Serenity).

## Décision

Serenity devient un **gestionnaire de mots de passe complet**, avec son propre coffre et
**deux zones** séparées cryptographiquement :

- **zone personnelle**, zero-knowledge : chiffrée par une clé utilisateur (UK) qui ne
  quitte jamais les clients déverrouillés ; le serveur ne voit que des blocs chiffrés ;
- **zone agent** : chiffrée par une clé d'agent (AK), que le serveur peut ouvrir grâce à une
  clé serveur stockée hors de la base.

Toute entrée va par défaut en zone personnelle ; la délégation est explicite, entrée par entrée.
Cryptographie uniquement via **libsodium** (navigateur et serveur), spécifiée dans
`docs/crypto.md` avant toute implémentation. Vaultwarden, le Bitwarden CLI et `bw serve`
sont retirés. L'import depuis un export Bitwarden reste prévu.

## Risques assumés

- **Crypto maison au sens de l'assemblage** : pas de primitive écrite à la main, mais la
  combinaison (dérivation, enveloppes, données associées) est la nôtre. Parade : spécification
  écrite et relue avant le code, vecteurs de test partagés Python / TypeScript, audit externe
  recommandé avant d'y mettre des comptes réels.
- **Pas d'écosystème** : pas d'applis ni d'extension Bitwarden. En V1, seule l'appli web (PWA).
- **Code servi par le serveur** : un serveur compromis peut modifier l'appli web et voler le mot
  de passe maître à la prochaine saisie. Limite commune à tous les coffres web ; atténuée par
  l'accès limité au tailnet et une CSP stricte.
- **Zone agent lisible par le serveur** : c'est le prix de l'autonomie. Une VM compromise
  expose la zone agent (pas la zone personnelle).
- **Perte définitive** : sans mot de passe maître ni kit de récupération, la zone personnelle
  est irrécupérable, par conception.
- **Charge de maintenance** : sauvegardes, montées de version et sécurité reposent sur nous.
