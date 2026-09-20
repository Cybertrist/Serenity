# 04 : Coffre et synchronisation

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
| Générateur | Mots de passe et phrases de passe (liste EFF, 7 776 mots) | rien |
| Codes TOTP des entrées | Calculés dans le navigateur (Web Crypto) | rien |
| Verrouillage automatique | 15 min d'inactivité, fermeture de la page | Le niveau « déverrouillé » expire aussi |
| **Import** | Fichier **lu et chiffré dans le navigateur** : CSV Google, JSON Bitwarden, lien de migration Authenticator | Reçoit des blocs chiffrés, par lots |
| Export chiffré | Fichier protégé par une phrase de passe, produit dans le navigateur | rien |

### Routes

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/vault/items?since=N` | session | Changements depuis le curseur `N` (0 = tout) |
| `POST /api/vault/items` | déverrouillé | Ajout (1 à 1 000 entrées, toujours en zone personnelle) |
| `PUT /api/vault/items/{id}` | déverrouillé | Nouvelle révision (`409` si conflit) |
| `DELETE /api/vault/items/{id}?base_revision=N` | déverrouillé | Mise à la corbeille |
| `POST /api/vault/items/{id}/restore` | déverrouillé | Sortie de la corbeille |
| `POST /api/vault/items/{id}/resolve` | déverrouillé | Trancher entre les deux mots de passe d'une rotation non annulable |
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
- **L'import ne quitte jamais ton navigateur en clair** : le fichier est lu et chiffré
  sur place, seuls des blocs partent vers le serveur. Les cartes et identités deviennent des notes
  sécurisées avec leurs champs (rien n'est perdu). Les exports Bitwarden **chiffrés** sont refusés :
  exporte au format `.json` simple.
- **Trois sources, un seul bouton.** Le format est reconnu au contenu du fichier, pas à son nom :
  un JSON est un export Bitwarden, le reste est le CSV que Google écrit (colonnes `name`, `url`,
  `username`, `password`, `note`, lues d'après l'en-tête et non d'après leur position).
- **Les codes à deux facteurs de Google Authenticator** arrivent par le lien
  `otpauth-migration://` que son QR code contient : c'est un protobuf, lu à la main dans le
  navigateur pour ne pas ajouter de bibliothèque à un coffre. Chaque compte redevient un
  `otpauth://` normal. Un code **rejoint l'entrée du même nom** si elle n'en a pas encore, sinon
  il devient sa propre entrée. Rien n'est jamais écrasé.
- **Deux mots de passe, un seul œil pour trancher.** Quand une rotation échoue **et** que le
  retour arrière échoue aussi, le bloc en attente est conservé : le site a peut-être pris le
  nouveau mot de passe, peut-être gardé l'ancien, et lui seul le sait. La fiche affiche alors les
  deux, en clair, avec un bouton par mot de passe. Garder celui de l'agent le promeut en révision
  courante ; garder celui du coffre jette l'autre. L'agent, lui, ne devine jamais
  ([`crypto.md`](crypto.md) §7.12, point 7).
- **Une entrée supprimée reste 30 jours** dans la corbeille ; ensuite le bloc est effacé et seule
  une trace vide reste, pour que tes autres appareils le sachent.
- Voir [ADR-009](decisions/ADR-009-coffre.md) pour les choix d'implémentation.

## Comment tester

### Tests automatiques (sur la VM)

```bash
make test        # Python : toute la suite, dont le coffre et ses révisions
make web-test    # TypeScript : générateur, imports Google et Bitwarden, export chiffré, verrouillage auto…
make e2e         # TypeScript contre le vrai serveur : comptes + coffre
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

Les imports et l'export chiffré se font depuis l'appli (**Réglages → Import et export**) :
ils tournent dans le navigateur, là où sont les clés. `make web-test` et `make e2e` les couvrent.
