# ADR-009 : Coffre, curseur de synchronisation, corbeille, historique, import dans le navigateur

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

La phase 4 stocke les entrées chiffrées et les synchronise entre appareils, selon
`docs/crypto.md` §7.4 à §7.6 et §7.10.

## Décision

- **Synchronisation par curseur** : chaque compte a un compteur `vault_seq`, incrémenté à chaque
  changement (création, modification, corbeille, restauration, purge, changement de zone) ;
  chaque entrée garde le numéro de son dernier changement. Un appareil demande `since=<curseur>`.
  Plus simple et plus sûr que des dates (pas de problème d'horloge).
- **Concurrence optimiste** : toute modification indique `base_revision` ; `409` avec la version
  du serveur si elle a changé.
- **Corbeille** : suppression douce 30 jours ; puis le bloc et l'historique sont effacés, la ligne
  reste en « pierre tombale » (`purged`) pour informer les autres appareils. La purge s'exécute à
  chaque synchronisation (pas besoin de tâche planifiée).
- **Historique** : les 10 dernières versions chiffrées (zone comprise). À la reprise
  (agent → personnelle), les versions « agent » sont effacées.
- **Changement de zone** : routes dédiées `delegate` / `reclaim`, avec `confirm: true` obligatoire,
  journalisées. La création directe en zone agent n'existe pas.
- **Contrôle de forme** côté serveur : en-tête AEAD, taille multiple de 256 (bourrage),
  256 Kio maximum par entrée.
- **Import Bitwarden** dans le navigateur uniquement, envoyé par lots de 500 ; **export chiffré**
  produit dans le navigateur (phrase de passe, Argon2id, contexte `export`).
- **Phrases de passe** : liste EFF de 7 776 mots (CC BY 3.0), aléa `randombytes_uniform`.
- **Codes TOTP** des entrées via Web Crypto (HMAC-SHA1/256/512), vérifiés par les vecteurs de la
  RFC 6238.
- **Tests de bout en bout** : le serveur de test offre `/__test/reset`, chaque fichier de test
  repart d'une base vide ; les fichiers tournent l'un après l'autre.

## Conséquences

- Un appareil hors ligne longtemps rattrape tout d'un coup, pierres tombales comprises.
- La liste de mots est en anglais ; une liste française pourra être ajoutée (licence à vérifier).
- Tant que l'interface n'existe pas, l'import et l'export ne sont testés que par les tests
  automatiques.
