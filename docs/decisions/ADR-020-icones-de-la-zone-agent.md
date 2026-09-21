# ADR-020 : L'agent va chercher les vraies favicons, pour la zone agent seulement

- **Date** : 2026-09-21
- **Statut** : accepté

## Contexte

[ADR-019](ADR-019-logos-des-entrees.md) a posé les logos dans le coffre : un pack embarqué de
3455 marques, un monogramme pour le reste, et une option coupée par défaut qui laisse le
navigateur chercher la favicon lui-même au prix d'une CSP élargie.

Il reste une façon d'avoir la vraie favicon d'un site sans rien ouvrir du tout, mais elle ne
vaut que pour la zone agent : là, le serveur connaît déjà le domaine, puisqu'il déchiffre ces
entrées pour les surveiller et changer leur mot de passe. Aller chercher leur icône ne lui
apprend rien de neuf. Pour la zone personnelle, ce serait la fin du zero-knowledge, et c'est
non.

Deux contraintes d'architecture décident du reste. Le conteneur `api` est sur un réseau
`internal: true` : **aucun accès Internet**. Et il ne monte jamais `server.key` : il est
**incapable** d'ouvrir une entrée de la zone agent pour en lire le domaine. Le seul processus
qui peut faire les deux est l'agent.

## Décision

1. **C'est l'agent qui va chercher, une fois par jour.** Un job de plus dans son scheduler, à
   côté de la veille et des rotations. Il ouvre AK, déchiffre les entrées de la zone agent, en
   tire le domaine, demande l'icône au site, et range. Une entrée déjà tentée n'est pas
   retentée avant 30 jours (`SERENITY_ICONS_REFRESH_DAYS`).
2. **Rangée chiffrée avec AK** (`docs/crypto.md` §5.8), contexte
   `serenity/v1/icon/<user_id>/<item_id>/<icon_version>`. Une base volée ne dit donc toujours
   pas quelles marques vivent dans le coffre. L'api sert un bloc opaque ; c'est le navigateur
   qui ouvre.
3. **Sa propre version, pas la révision de l'entrée.** Une rotation de mot de passe ne doit pas
   invalider une icône, et une icône ne doit pas pouvoir être présentée à la place d'une entrée.
4. **Le client demande « mes icônes », jamais « l'icône de ce site ».** Une seule route,
   `GET /api/vault/icons`, qui renvoie tout d'un coup. Rien dans la requête ne dit quelle entrée
   est regardée. Le contrôle est fait par le code : propriétaire, zone agent, entrée vivante.
5. **Le type MIME est vérifié deux fois**, au rangement et à l'affichage. Le SVG est refusé des
   deux côtés : c'est un document avec des scripts dedans, pas une image. Le navigateur ne fait
   pas confiance au type annoncé par l'api (§8.5 : le serveur peut être hostile).

## Les garde-fous, et pourquoi ils existent

L'agent ouvre une URL qui vient du coffre, depuis un conteneur qui partage un réseau privé avec
l'exécuteur de rotation. Une entrée dont l'adresse serait `http://rotator:8000` ne doit pas le
transformer en sonde de son propre réseau. D'où, dans `agent/icons.py` :

- **https uniquement**, et le nom doit résoudre **exclusivement** vers des adresses publiques.
  `127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254` et compagnie sont refusés avant
  la moindre requête.
- **Les redirections sont suivies à la main**, trois au maximum, chaque saut repassant le même
  contrôle : une redirection vers le réseau interne ne sert à rien.
- **Le corps est lu par morceaux** et jeté dès qu'il dépasse 64 Kio : un site ne doit pas
  pouvoir remplir la mémoire de l'agent en répondant un gigaoctet.
- **Le type vient des octets**, jamais de l'en-tête `Content-Type`.
- **Kill switch vérifié avant chaque récupération**, pas seulement au début de la passe
  (règle 7), et **le journal ne compte que des nombres** : un domaine n'a rien à y faire
  (règle 1).

## Alternatives écartées

- **Un proxy dans l'api** : impossible sans lui donner Internet et la clé serveur, c'est-à-dire
  sans détruire la séparation qui fait tout le modèle.
- **Une route par entrée** (`/items/{id}/icon`) : chaque affichage dirait au serveur quelle
  entrée est regardée. Le lot dit seulement « le coffre est ouvert ».
- **Stocker l'icône en clair** : plus simple, mais une sauvegarde volée montrerait le logo
  Netflix à côté d'une entrée. Le chiffrement coûte une trentaine de lignes.
- **Se faire passer pour un navigateur** dans l'en-tête `User-Agent` pour contourner les
  filtres anti-robot : l'agent se nomme. Un site qui l'éconduit garde son icône, et l'entrée
  garde son monogramme.

## Conséquences

- La zone personnelle n'est pas concernée, ici et nulle part : ses entrées ne sont pas même
  sélectionnées, et AK ne pourrait pas les ouvrir.
- Confier une entrée à l'agent lui donne donc une icône au prochain passage. La reprendre laisse
  l'icône en base jusqu'à la suppression de l'entrée ; elle n'est plus servie, puisque la route
  filtre sur la zone.
- `make icons-now` déclenche une passe tout de suite, sans attendre.
- Une entrée dont le site ne donne rien garde une ligne sans bloc : c'est la trace de la
  tentative, et c'est elle qui évite de redemander à chaque passage.
