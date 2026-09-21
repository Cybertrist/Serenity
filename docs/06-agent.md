# 06 : Agent

## Quoi

L'agent (conteneur `agent`) a maintenant ses règles, ses garde-fous et son échéancier.

| Brique | Fichier | Rôle |
|---|---|---|
| Politiques | `agent/rotations.py` | Par entrée : fréquence (7, 30, 90, 180 jours, jamais) et mode (**autonome** ou **avec validation**) |
| Échéancier | `agent/rotations.py`, `agent/service.py` | Toutes les heures : rotations dues (zone agent), rappels (zone personnelle), rotations après fuite |
| Kill switch | `agent/killswitch.py` | Arrête l'agent ; vérifié avant **chaque** action |
| Allowlist | `api/allowlist.yaml`, `agent/allowlist.py` | Les seuls sites que l'agent peut modifier |
| Limite quotidienne | `SERENITY_MAX_ROTATIONS_PER_DAY` (3) | Nombre de rotations approuvées par 24 h |
| Rotation transactionnelle | `rotator/base.py`, `agent/executor.py` | Interface `SiteRotator`, machine d'état, et l'exécuteur qui la joue pour de vrai ([08 : Rotation](08-rotation.md)) |
| Icônes des sites | `agent/icons.py` | Une fois par jour : la vraie favicon des entrées de la zone agent, rangée **chiffrée avec AK** ([ADR-020](decisions/ADR-020-icones-de-la-zone-agent.md)) |
| Flux temps réel | `routes/events.py` | Notifications poussées à l'appli ouverte (Server-Sent Events) |
| Référence de l'API | [`api.md`](api.md) | Générée depuis le schéma OpenAPI (`make api-doc`) |

### Ce qui se passe à une échéance (V1)

| Entrée | Échéance atteinte | Ce que tu vois |
|---|---|---|
| **Zone agent** | Rotation au statut `scheduled` | Notification : **Approuver**, **Refuser**, Ouvrir Serenity |
| **Zone agent**, mot de passe exposé | Rotation `scheduled` (déclencheur « fuite ») | Idem |
| **Zone personnelle** | Rappel seulement | Notification « pense à changer ce mot de passe » |

- **Approuver** : la rotation passe `approved`, et l'exécuteur la joue au passage suivant de
  l'agent ([08 : Rotation](08-rotation.md)). Sans jeton d'exécuteur configuré, ou sans recette
  pour ce site, elle attend, et l'écran Agent dit laquelle des deux raisons.
- **Refuser** : pas de rotation maintenant, la prochaine échéance est repoussée d'une période.

## Pourquoi

- **L'agent ne touche jamais une entrée personnelle.** Trois verrous, testés :
  l'échéancier ne programme de rotation que pour la zone agent ; la fonction qui crée une
  rotation refuse une entrée personnelle ; une entrée reprise ne peut plus être approuvée.
  Pour la zone personnelle, le mode autonome est refusé : rappels seulement.
- **Kill switch** : l'enclencher est toujours possible (même coffre verrouillé) ; le relâcher
  demande ton mot de passe maître. Tout est journalisé.
- **Allowlist vérifiée par le code, jamais par un LLM** : chaque adresse de l'entrée doit être
  sur un domaine autorisé ou un de ses sous-domaines (`netflix.com` couvre `www.netflix.com`,
  pas `netflix.com.evil.example`). L'api ne peut pas lire les adresses de la zone agent : le
  contrôle se fait là où un site peut être touché, dans la rotation elle-même.
  Format volontairement strict (pas de bibliothèque YAML dans la stack) :
  ```yaml
  domains:
    - netflix.com
    - spotify.com
  ```
  Il ne contient que le site de démo (`demo.serenity.test`) : l'agent ne peut toucher à rien
  d'autre tant que tu n'as pas ajouté un domaine toi-même. Le fichier est monté en lecture
  seule : modifie-le sur la VM puis `make restart`.
- **Rotation transactionnelle** (règle 6), exécutée pour de vrai depuis la phase 8 : nouveau
  mot de passe enregistré « en attente » **avant** de toucher au site, ancien conservé,
  vérification par reconnexion,
  retour arrière si échec ; si même le retour arrière échoue, les **deux** mots de passe sont
  gardés et tu es prévenu. Chaque transition est contrôlée.
- **Temps réel sans service tiers** (ADR-005) : `/api/events` pousse les notifications à
  l'appli ouverte ; l'appli Android (V2) interrogera `/api/notifications`.
- **Les icônes sont un travail d'agent, pas d'api** : l'`api` n'a ni accès Internet (réseau
  `internal`) ni la clé serveur, donc elle ne peut ni joindre un site ni savoir de quel site il
  s'agit. L'agent, lui, connaît déjà ces domaines : c'est le sens même de la zone agent. La zone
  personnelle n'est jamais concernée. L'URL vient du coffre, donc tout est vérifié avant
  d'ouvrir quoi que ce soit : https seulement, adresses publiques seulement, redirections
  recontrôlées une par une, 64 Kio au maximum, type lu dans les octets, SVG refusé
  ([ADR-020](decisions/ADR-020-icones-de-la-zone-agent.md)).
- Voir [ADR-011](decisions/ADR-011-agent.md).

## Comment tester

### Tests automatiques (sur la VM)

```bash
make test        # Python : toute la suite, dont allowlist, rotation, kill switch, zone personnelle
make icons-now   # une passe d'icônes tout de suite (zone agent), au lieu d'attendre le tour quotidien
make e2e         # dont politique -> échéance -> refus -> kill switch -> approbation
make api-doc     # régénère docs/api.md (la CI vérifie qu'il est à jour)
```

### En vrai

```bash
make client c=login
make client c=rotations                   # une rotation « breach » pour « Test fuite »
make client c="approve Test fuite"        # -> approved, puis joué par l'exécuteur s'il y a une recette
make client c="policy Netflix"            # fréquence 30, rappel (zone personnelle)
make client c=stop                        # kill switch
make schedule-now                         # « Kill switch actif : aucune échéance traitée. »
make client c=start                       # relancer (mot de passe maître)
make schedule-now
```
