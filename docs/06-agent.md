# 06 — Agent

## Quoi

L'agent (conteneur `agent`) a maintenant ses règles, ses garde-fous et son échéancier.

| Brique | Fichier | Rôle |
|---|---|---|
| Politiques | `agent/rotations.py` | Par entrée : fréquence (7, 30, 90, 180 jours, jamais) et mode (**autonome** ou **avec validation**) |
| Échéancier | `agent/rotations.py`, `agent/service.py` | Toutes les heures : rotations dues (zone agent), rappels (zone personnelle), rotations après fuite |
| Kill switch | `agent/killswitch.py` | Arrête l'agent ; vérifié avant **chaque** action |
| Allowlist | `api/allowlist.yaml`, `agent/allowlist.py` | Les seuls sites que l'agent pourra modifier (V3) |
| Limite quotidienne | `SERENITY_MAX_ROTATIONS_PER_DAY` (3) | Nombre de rotations approuvées par 24 h |
| Rotation transactionnelle | `rotator/base.py` | Interface `SiteRotator` et machine d'état, **sans aucun site** |
| Flux temps réel | `routes/events.py` | Notifications poussées à l'appli ouverte (Server-Sent Events) |
| Référence de l'API | [`api.md`](api.md) | Générée depuis le schéma OpenAPI (`make api-doc`) |

### Ce qui se passe à une échéance (V1)

| Entrée | Échéance atteinte | Ce que tu vois |
|---|---|---|
| **Zone agent** | Rotation au statut `scheduled` | Notification : **Approuver**, **Refuser**, Ouvrir Serenity |
| **Zone agent**, mot de passe exposé | Rotation `scheduled` (déclencheur « fuite ») | Idem |
| **Zone personnelle** | Rappel seulement | Notification « pense à changer ce mot de passe » |

- **Approuver** : la rotation passe `approved`. En V1, rien ne change sur le site ; l'exécuteur
  arrive en V3.
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
  Vide en V1. Le fichier est monté en lecture seule : modifie-le sur la VM puis `make restart`.
- **Rotation transactionnelle** (règle 6), prête pour la V3 : nouveau mot de passe enregistré
  « en attente » **avant** de toucher au site, ancien conservé, vérification par reconnexion,
  retour arrière si échec ; si même le retour arrière échoue, les **deux** mots de passe sont
  gardés et tu es prévenu. Chaque transition est contrôlée.
- **Temps réel sans service tiers** (ADR-005) : `/api/events` pousse les notifications à
  l'appli ouverte ; l'appli Android (V2) interrogera `/api/notifications`.
- Voir [ADR-011](decisions/ADR-011-agent.md).

## Comment tester

### Tests automatiques (sur la VM)

```bash
make test        # Python : 139 tests, dont allowlist, rotation, kill switch, zone personnelle
make e2e         # 13 parcours, dont politique -> échéance -> refus -> kill switch -> approbation
make api-doc     # régénère docs/api.md (la CI vérifie qu'il est à jour)
```

### En vrai

```bash
make client c=login
make client c=rotations                   # une rotation « breach » pour « Test fuite »
make client c="approve Test fuite"        # -> approved (rien n'est exécuté en V1)
make client c="policy Netflix"            # fréquence 30, rappel (zone personnelle)
make client c=stop                        # kill switch
make schedule-now                         # « Kill switch actif : aucune échéance traitée. »
make client c=start                       # relancer (mot de passe maître)
make schedule-now
```
