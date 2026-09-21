# ADR-019 : Le logo du site sur chaque entrée, sans dire à personne ce qu'il y a dans le coffre

- **Date** : 2026-09-21
- **Statut** : accepté

## Contexte

Chaque ligne du coffre portait la marque de sa zone : bouclier vert pour la zone personnelle,
robot bleu pour la zone agent. C'est le modèle en un glyphe, mais ça ne sert à rien pour
retrouver un compte dans une liste de trente. Toutes les lignes se ressemblent.

Afficher la favicon du site règle la lecture, et pose un problème que la plupart des
gestionnaires de mots de passe règlent mal. Une favicon vient du site. Aller la chercher, c'est
dire à quelqu'un quels comptes on possède. Or le serveur de Serenity n'a le droit de rien savoir
de la zone personnelle, et les trois chemins possibles ont chacun leur prix :

- **Le serveur va la chercher.** Il faut lui envoyer le domaine. Pour la zone personnelle, c'est
  la fin du zero-knowledge, et ça s'inscrit durablement, en base et dans les sauvegardes.
  L'`api` n'a d'ailleurs aucun accès Internet (réseau `internal`) et ne voit jamais la clé
  serveur : elle est incapable d'ouvrir une entrée pour en lire le domaine.
- **Le navigateur va la chercher.** Chaque site apprend l'adresse IP et l'heure. Surtout, il faut
  ouvrir `img-src` dans la CSP, qui est aujourd'hui `'self' data: blob:`.
- **Un service tiers** (Google, DuckDuckGo) : un seul acteur reçoit la liste des sites de tous
  les comptes. Écarté sans discussion.

## Décision

1. **Un pack de logos embarqué, source par défaut.** 3455 marques de
   [simple-icons](https://simpleicons.org) (CC0), dessinées à la construction de l'image web dans
   `public/logos/<slug>.svg` par `web/scripts/build-logos.mjs`. Le navigateur n'a qu'un fichier à
   demander à Serenity. Personne d'autre n'apprend rien.
2. **La marque se déduit du domaine, dans le navigateur.** `logoOf()` lit les étiquettes du
   domaine de droite à gauche en sautant le suffixe public : `open.spotify.com` donne `spotify`,
   `bbc.co.uk` donnerait `bbc` et non `co`. Aucun domaine n'est envoyé nulle part : la réponse
   est un nom de fichier.
3. **Le logo est peint par un masque CSS**, pas par la couleur du fichier. La couleur de marque
   est corrigée quand elle disparaît sur son fond : le noir d'Apple en thème sombre, le jaune de
   Snapchat en thème clair, retombent sur la couleur du texte.
4. **`access_log off` sur `/logos/`.** Le nom du fichier est le nom d'un site du coffre : il n'a
   rien à faire dans un journal de serveur (règle 1 de CLAUDE.md).
5. **Repli : le monogramme.** Première lettre de l'entrée, sur une teinte calculée depuis le
   domaine, stable dans le temps. C'est ce que voient les sites français que le pack ne connaît
   pas : Crédit Agricole, Ameli, Doctolib, Leboncoin, et aussi Amazon et LinkedIn, retirés du
   pack pour des raisons de marque.
6. **La favicon distante existe, coupée par défaut.** `SERENITY_FAVICONS_DISTANTES=true` dans
   `.env`, puis `make up`. L'argument de construction fait deux choses d'un coup : l'application
   tente le chargement, et la CSP passe à `img-src 'self' data: blob: https:`. Les deux ne
   peuvent pas diverger, puisque c'est le même argument.
7. **La marque de zone quitte les lignes.** Le bouclier et le robot restent aux en-têtes de zone
   et dans la fiche d'une entrée, où une pastille dit déjà « Protégé par toi » ou « Confié à
   l'agent ». Sur une ligne, la place va au logo.

## Le prix de la favicon distante, écrit noir sur blanc

Une fois `img-src https:` en place, un script injecté dans la page peut faire sortir des données
en les collant dans l'URL d'une image, et aucune discipline dans notre code ne rattrape ça :
c'est la directive elle-même qui protégeait. Dans une application qui déchiffre des mots de passe
dans l'onglet, c'est une barrière qu'on retire. Elle reste donc coupée par défaut, et le réglage
vit dans `.env`, pas dans l'interface : la CSP est décidée par nginx au chargement de la page,
une case à cocher dans l'application ne peut ni la durcir ni la relâcher. Un interrupteur qui ne
commande rien serait un mensonge d'interface.

## Ce que la favicon distante ne couvre pas

Le navigateur ne peut tenter qu'une adresse, `https://<domaine>/favicon.ico`, parce qu'il n'a pas
le droit de lire le HTML d'un autre site. Les sites qui rangent leur icône ailleurs et la
déclarent dans leur page d'accueil ne donnent donc rien : La Poste, Grindr et impots.gouv.fr en
sont trois exemples mesurés. L'agent, lui, lit la page d'accueil et suit la déclaration, donc
confier l'entrée à l'agent reste le chemin qui couvre le plus de sites
([ADR-020](ADR-020-icones-de-la-zone-agent.md)).

## Alternatives écartées

- **Un seul fichier contenant tout le pack**, pour que le serveur ne voie même pas quel logo est
  demandé : 4,5 Mo, 1,9 Mo compressés. Trop lourd à imposer à chaque appareil pour ce que ça
  apporte. Une requête vers un fichier statique de la même origine n'apprend rien à nginx qu'il
  ne puisse déjà obtenir : c'est lui qui livre l'application elle-même.
- **Les logos dans le service worker** : 3455 entrées à l'installation, ou bien ne garder que
  ceux qu'on utilise, ce qui écrirait la liste des sites du coffre sur le disque. Hors ligne, les
  logos retombent donc sur le monogramme.
- **Une icône déposée à la main par entrée, chiffrée dans le bloc** : couverture parfaite et
  aucune fuite, mais du travail manuel pour chaque compte. Reste possible plus tard.

## Conséquences

- Le pack est généré, jamais commité. `npm run logos` tourne avant le lint, le build et les
  tests ; `web/public/logos/` et `logos.generated.ts` sont dans `.gitignore`.
- La table couleur par marque pèse 84 ko, environ 27 ko compressés, dans le paquet principal.
- Une deuxième phase donnera à la zone agent la vraie favicon sans rien ouvrir : l'agent, qui
  ouvre déjà ces entrées et a la sortie réseau, ira la chercher et la rangera chiffrée avec AK.
  Elle demande un nouveau contexte de données associées, donc une modification de
  `docs/crypto.md` : elle a son propre ADR.
