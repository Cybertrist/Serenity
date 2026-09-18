# 05 — Veille des fuites

## Quoi

Serenity vérifie tes mots de passe et te prévient.

| Contrôle | Règle | Dans le navigateur | Sur le serveur (agent) |
|---|---|---|---|
| **Mot de passe exposé** | Présent dans Pwned Passwords | Les deux zones | Zone agent, toutes les 6 h |
| **Réutilisé** | Même mot de passe sur plusieurs entrées | Les deux zones | — (voir plus bas) |
| **Faible** | < 12 caractères, < 60 bits, ou < 5 caractères différents | Les deux zones | Zone agent |
| **Ancien** | Pas changé depuis plus d'un an | Les deux zones | Zone agent |
| **Adresse e-mail dans une fuite** | Have I Been Pwned (clé payante) | — | Adresses déclarées, si `HIBP_API_KEY` |

- **Dans le navigateur** (`web/src/features/breaches/`), quand ton coffre est déverrouillé :
  les deux zones sont vérifiées, puis seul le **résultat** part vers le serveur : l'identifiant
  de l'entrée et le type d'alerte. Jamais un mot de passe, ni un nom de site.
- **Sur le serveur** (`api/serenity/agent/watch.py`), sans que tu ouvres l'appli : le
  processus agent ouvre sa clé d'agent avec la clé serveur, déchiffre **uniquement la zone
  agent** en mémoire, vérifie, enregistre les alertes.
- **Alertes** (`Breach`) : une par entrée et par type, jamais en double. Elles se ferment
  toutes seules quand le problème disparaît, et tu peux en mettre une de côté (elle revient si
  l'entrée change et que le problème persiste).
- **Notifications** : chaque nouvelle alerte crée une notification dans l'appli
  (`GET /api/notifications`). Elle ne contient aucun texte : l'appli écrit « Netflix : mot de
  passe exposé » elle-même, avec le nom qu'elle seule peut déchiffrer.

### Routes

| Route | Accès | Rôle |
|---|---|---|
| `POST /api/watch/report` | déverrouillé | Résultat d'un scan du navigateur (identifiants + types) |
| `GET /api/breaches?status=open\|all` | session | Alertes |
| `POST /api/breaches/{id}/dismiss` | déverrouillé | Mettre une alerte de côté |
| `GET/POST/DELETE /api/watch/emails` | session / déverrouillé | Adresses surveillées (20 au plus) |
| `GET /api/notifications?since=N` | session | Notifications (l'appli Android les interrogera en V2) |
| `POST /api/notifications/{id}/read`, `/read-all` | session | Marquer comme lues |

## Pourquoi

- **k-anonymat** : pour savoir si un mot de passe a fuité, on calcule son empreinte SHA-1 et on
  n'envoie à Pwned Passwords **que les 5 premiers caractères**. Le service renvoie les ~800
  empreintes qui commencent pareil, et la comparaison se fait chez nous. L'en-tête
  `Add-Padding` ajoute de fausses réponses pour masquer la taille. Testé côté Python et
  TypeScript : aucune autre partie de l'empreinte ne sort.
- **L'agent ne lit que la zone agent** : il ne sélectionne que ces entrées, et sa clé ne
  pourrait de toute façon pas déchiffrer les autres. Un test vérifie que même le préfixe d'un
  mot de passe personnel ne sort jamais.
- **Réutilisation : seul le navigateur en décide**. L'agent ne voit pas ta zone personnelle ;
  s'il jugeait la réutilisation, il fermerait à tort une alerte trouvée par ton navigateur.
- **Kill switch** : l'agent le vérifie avant chaque compte et chaque adresse. S'il est
  enclenché, la veille ne part pas, et c'est noté au journal. Son bouton arrive en phase 6.
- **Mêmes règles des deux côtés** : `shared/test-vectors/watch.json` est vérifié par Python et
  par TypeScript.
- **Seul l'agent sort sur Internet** (réseau `egress`). La clé HIBP n'est donnée qu'à lui ;
  l'api sait seulement si elle est configurée.
- Voir [ADR-010](decisions/ADR-010-veille.md).

## Comment tester

### Tests automatiques (sur la VM)

```bash
make test        # Python : 112 tests (dont 14 sur la veille)
make web-test    # TypeScript : règles partagées, scan, k-anonymat
make e2e         # 12 parcours, dont scan -> rapport -> alertes -> notifications
```

### En vrai

Il faut une entrée confiée à l'agent avec un mot de passe connu des fuites. Crée-la avec un
mot de passe **de test** (par exemple `password123`, jamais un vrai) :

```bash
make client c=login
make client c=add                     # nom « Test fuite », mot de passe password123
make client c="delegate Test fuite"
make watch-now                        # l'agent vérifie tout de suite (sinon : toutes les 6 h)
make client c=breaches                # « Test fuite : mot de passe exposé », « mot de passe faible »
make client c=notifications
```

Le scan du navigateur, en attendant l'interface (sans Pwned Passwords : le conteneur `api` n'a
pas Internet, l'appli web le fera) :

```bash
make client c=scan
```

Adresses e-mail : ajoute `HIBP_API_KEY=` dans `.env` (clé payante sur haveibeenpwned.com), puis
`make up`. Sans clé, les adresses sont enregistrées mais pas vérifiées.
