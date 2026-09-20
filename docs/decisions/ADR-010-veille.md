# ADR-010 : Veille, double scan, alertes sans secret, notifications sans texte

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

La veille doit tourner dans le navigateur (toutes les zones, coffre déverrouillé) et sur le
serveur (zone agent, sans intervention), sans jamais faire sortir de secret.

## Décision

- **Règles identiques** en Python et TypeScript, vérifiées par `shared/test-vectors/watch.json` :
  faible = moins de 12 caractères, ou moins de 60 bits (longueur × log2 des classes utilisées),
  ou moins de 5 caractères différents ; ancien = plus de 365 jours (date du dernier changement,
  sinon date de création).
- **Pwned Passwords** en k-anonymat (5 caractères hexadécimaux), `Add-Padding`, cache par
  préfixe le temps d'un scan. SHA-1 vient de Web Crypto / `hashlib` : imposé par l'API, il ne
  protège rien, ce n'est pas une primitive de Serenity.
- **Rapport = instantané complet** : le client envoie les entrées vérifiées et les alertes
  trouvées ; le serveur ouvre les nouvelles, ferme celles qui ont disparu.
- **Autorité par type** : le navigateur décide des quatre types ; l'agent seulement de
  « exposé », « faible », « ancien » (pas de « réutilisé », il ne voit qu'une zone).
- **Alerte unique** par (compte, sujet, type) ; « mise de côté » jusqu'à une nouvelle révision
  de l'entrée.
- **Notifications sans texte** : type + identifiants ; le client compose le message.
- **HIBP** (e-mails) : clé donnée à l'agent seul ; l'api reçoit `SERENITY_HIBP_ENABLED`.
- **Kill switch minimal** (`setting.kill_switch`) lu par l'agent avant chaque action ; l'API
  pour l'actionner arrive en phase 6.
- **Ancien modèle** (`entry`, `breach`, `rotation` de l'époque Vaultwarden) supprimé
  (migration v4).

## Conséquences

- Le serveur apprend quelles entrées ont un problème et de quel type (métadonnée), jamais
  lesquelles partagent un mot de passe entre elles au-delà du drapeau « réutilisé ».
- La réutilisation n'est détectée que quand un appareil déverrouille le coffre.
- En phase 7, la CSP de l'appli devra autoriser `connect-src https://api.pwnedpasswords.com`.
