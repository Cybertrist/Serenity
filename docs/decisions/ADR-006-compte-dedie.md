# ADR-006 — Compte Vaultwarden dédié, via une organisation

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

Serenity doit lire (et, en V2, modifier) des mots de passe. Utiliser le compte personnel
obligerait à stocker son mot de passe maître sur le serveur et donnerait à Serenity
l'accès à **tout** le coffre.

## Décision

- Un compte Vaultwarden **dédié** « Serenity », sans 2FA, connecté par **clé d'API**.
- Le compte personnel crée une **organisation** ; le compte Serenity en est membre (rôle
  Utilisateur) avec le droit « Peut modifier » sur une seule collection.
- Seuls les identifiants déplacés dans cette collection sont visibles par Serenity.
- Les nouveaux comptes découverts sont **critiques** par défaut.

## Conséquences

- Périmètre choisi élément par élément ; retirer un élément de la collection suffit à le soustraire.
- Une fuite du secret Serenity n'expose que la collection partagée, pas tout le coffre.
- Les éléments partagés appartiennent à l'organisation (et non plus au coffre personnel) :
  les applis Bitwarden les affichent toujours, dans l'organisation.
- La clé d'API est dans `.env` : elle permet de se connecter mais pas de **déchiffrer**,
  il faut aussi le mot de passe maître (ADR-007).
