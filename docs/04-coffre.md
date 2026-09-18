# 04 — Coffre et synchronisation

## Quoi

Le coffre existe : tes entrées sont chiffrées **sur ton appareil**, puis envoyées au serveur
sous forme de blocs illisibles pour lui (sauf la zone agent, pour le seul processus agent).

| Fonction | Côté navigateur (`web/src/vault/`) | Côté serveur (`api/serenity/vault/`) |
|---|---|---|
| Ajouter, modifier | Chiffre avec UK (ou AK), contexte `entrée/zone/révision` | Vérifie la forme du bloc, la révision, stocke |
| Conflits | Reçoit `409` + la version du serveur, fusionne | Refuse une modification basée sur une vieille révision |
| Synchronisation | Ne demande que ce qui a changé (`since=<curseur>`) | Numéro de changement par compte |
| Corbeille | Supprimer, restaurer | Effacement définitif après 30 jours |
| Historique | Déchiffre les anciennes versions | Garde les 10 dernières versions chiffrées |
| **Confier à l'agent** | Déchiffre avec UK, rechiffre avec AK, après confirmation | Change la zone, journalise |
| **Reprendre** | Déchiffre avec AK, rechiffre avec UK, après confirmation | Change la zone, **efface l'historique « agent »**, journalise |
| Générateur | Mots de passe et phrases de passe (liste EFF, 7 776 mots) | — |
| Codes TOTP des entrées | Calculés dans le navigateur (Web Crypto) | — |
| Verrouillage automatique | 15 min d'inactivité, fermeture de la page | Le niveau « déverrouillé » expire aussi |
| **Import Bitwarden** | Export JSON **lu et chiffré dans le navigateur** | Reçoit des blocs chiffrés, par lots |
| Export chiffré | Fichier protégé par une phrase de passe, produit dans le navigateur | — |

### Routes

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/vault/items?since=N` | session | Changements depuis le curseur `N` (0 = tout) |
| `POST /api/vault/items` | déverrouillé | Ajout (1 à 1 000 entrées, toujours en zone personnelle) |
| `PUT /api/vault/items/{id}` | déverrouillé | Nouvelle révision (`409` si conflit) |
| `DELETE /api/vault/items/{id}?base_revision=N` | déverrouillé | Mise à la corbeille |
| `POST /api/vault/items/{id}/restore` | déverrouillé | Sortie de la corbeille |
| `GET /api/vault/items/{id}/history` | session | 10 dernières versions chiffrées |
| `POST /api/vault/items/{id}/delegate` | déverrouillé | Confier à l'agent (`confirm: true` obligatoire) |
| `POST /api/vault/items/{id}/reclaim` | déverrouillé | Reprendre (`confirm: true` obligatoire) |

## Pourquoi

- **Toute nouvelle entrée va en zone personnelle.** Confier une entrée à l'agent est un choix
  explicite, entrée par entrée, avec confirmation : le serveur refuse un changement de zone sans
  `confirm: true`.
- **Chaque bloc est lié à sa révision** : un bloc rejoué ou déplacé ne se déchiffre pas.
  L'appareil retient aussi la plus haute révision vue par entrée et signale un retour en arrière.
- **Reprendre une entrée efface son historique « agent »** : le serveur pouvait le lire. L'appli
  conseille ensuite de changer ce mot de passe.
- **L'import Bitwarden ne quitte jamais ton navigateur en clair** : le fichier est lu et chiffré
  sur place, seuls des blocs partent vers le serveur. Les cartes et identités deviennent des notes
  sécurisées avec leurs champs (rien n'est perdu). Les exports Bitwarden **chiffrés** sont refusés :
  exporte au format `.json` simple.
- **Une entrée supprimée reste 30 jours** dans la corbeille ; ensuite le bloc est effacé et seule
  une trace vide reste, pour que tes autres appareils le sachent.
- Voir [ADR-009](decisions/ADR-009-coffre.md) pour les choix d'implémentation.

## Comment tester

### Tests automatiques (sur la VM)

```bash
make test        # Python : 97 tests (dont 13 sur le coffre)
make web-test    # TypeScript : générateur, import Bitwarden, export chiffré, verrouillage auto…
make e2e         # TypeScript contre le vrai serveur : 11 parcours (comptes + coffre)
```

### En vrai, avec le client en ligne de commande

Chaque commande te redemande ton mot de passe maître (le client ne garde aucune clé entre deux
commandes). Sa session vit dans le conteneur `api` : après un redéploiement (`make up`), refais
`make client c=login`.

```bash
make client c=add                       # ajoute une entrée (nom, identifiant, mot de passe)
make client c=list                      # les deux zones : « Protégé par toi », « Confié à l'agent »
make client c="show Netflix"            # le détail (mot de passe masqué)
make client c="edit Netflix"            # nouveau mot de passe : révision + 1
make client c="history Netflix"         # versions précédentes
make client c="delegate Netflix"        # confier à l'agent (confirmation)
make client c="reclaim Netflix"         # reprendre (confirmation)
make client c="delete Netflix"          # corbeille
make client c="restore Netflix"
```

L'import Bitwarden et l'export chiffré se feront depuis l'interface (phase 7) : ils sont faits
pour tourner dans le navigateur, testés ici par `make web-test` et `make e2e`.
