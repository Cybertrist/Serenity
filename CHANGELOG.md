# Changelog

Toutes les évolutions notables de Serenity sont listées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnage : [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- **`make recipe-inspect URL=…`** : le rotateur ouvre une page et liste ses champs (sélecteur,
  type, libellé), ses boutons et ses `iframe`. Écrire la recette d'un site devient mécanique au
  lieu d'être deviné ; rien n'est tapé ni soumis, aucun identifiant n'est nécessaire.
- **Sauvegardes** : instantané nocturne restic de la base chiffrée (par `VACUUM INTO`, jamais
  une copie de fichier vivant) et des deux fichiers de clés, avec rétention 7 jours / 4 semaines
  / 6 mois. `make backup-now`, `make restore-check`, et surtout **`make backup-check`** : un
  exercice qui détruit vraiment le coffre jetable avant de le restaurer, rejoué en CI. La
  restauration n'écrase jamais une stack qui tourne. ADR-016, `docs/09-sauvegardes.md`.
- **L'agent change vraiment les mots de passe.** Un conteneur `rotator` isolé (le seul avec un
  navigateur, le seul à atteindre un site) exécute les rotations que l'agent décide, pilote les
  formulaires d'après une **recette JSON par site**, et vérifie par une reconnexion complète. Le
  coffre est servi avant le site : nouveau mot de passe enregistré « en attente », validé si le
  site a suivi, jeté sinon, le tout avec retour arrière (`docs/crypto.md` §7.12, ADR-015).
- **Site de démo** (`demo/`, profil compose `demo`) : le jouet sur lequel l'agent s'entraîne, et
  que la CI rejoue à chaque commit : réussite, refus du site, site hors allowlist
  (`make rotation-demo`, `docs/08-rotation.md`).
- **Régénérer le kit de récupération** depuis les réglages (compte) : mot de passe maître et code
  TOTP, puis un kit neuf pour le même coffre. Les entrées ne bougent pas, les appareils restent
  connectés, et l'ancien kit cesse de valoir dès l'affichage du nouveau. Un avertissement le dit
  avant. `POST /api/auth/recovery-kit`, `docs/crypto.md` §7.11, ADR-013.
- **Thème clair**, et un réglage **Apparence** (Système / Clair / Sombre) dans les réglages. Par
  défaut l'appli suit le système et change avec lui, sans rechargement. La préférence reste sur
  l'appareil, jamais sur le serveur. Le cadenas et le logotype passent à l'encre, la cascade de
  déverrouillage tombe en encre sur le papier, et `make ui-smoke` capture désormais un troisième
  passage entièrement en clair. ADR-014, `docs/design.md`.
- Phase 7 : la barre d'onglets tombe à **trois entrées** (Coffre, Fuites, Agent) : le journal
  devient un volet des réglages, où l'écran Agent renvoie d'un bouton. « Verrouiller maintenant »
  quitte la barre de titre pour les réglages.
- Phase 7 : l'ajout d'une entrée devient un **bouton flottant** en bas à droite du carré, au lieu
  d'un bouton coincé à côté du titre.
- Phase 7 : **guide en cinq écrans** (le coffre, les deux zones, les fuites, l'agent, et un
  parcours d'essai), ouvert par le point d'interrogation de la barre de titre ou depuis un coffre
  vide.
- Phase 7 : fond **noir pur**, sans aucun décor ; contour blanc franc de 2 px autour du carré et
  bordures à 28 % pour délimiter le reste ; titres
  d'écran en capitales espacées comme le logotype, et un seul orange partout, celui du logo
  (`#F2711C`).
- Phase 7 : l'appli tient dans **un carré centré** (côté = min(92vw, 92vh, 980px)), plein écran
  sous 768 px : barre de titre (marque, notifications, verrouiller, réglages), écran au milieu,
  onglets en bas. La mise en page interne se règle sur le carré (container queries), pas sur la
  fenêtre (ADR-012, `docs/design.md`).
- Phase 7 : les écrans d'entrée (création du compte, connexion, code, déverrouillage,
  récupération) partagent un seul cadre sobre : le logotype, une carte, et les actions
  secondaires en **vrais boutons** dessous. Compteur d'étapes (`Étape 2 sur 3` + barre),
  code à six cases, et les mêmes composants que l'intérieur de l'appli.
- Phase 7 : le déverrouillage joue **une cascade de données chiffrées qui tombe du haut de
  l'écran** ; son front découvre le coffre au fur et à mesure, puis les traînées sortent par le
  bas (1,65 s). Décor animé derrière (deux lumières lentes, grille en perspective sur l'écran
  d'entrée). SVG, canevas et Motion, sans dépendance ajoutée ; `prefers-reduced-motion` réduit le
  tout à un fondu.
  La connexion se fait donc en deux temps à l'écran, pour un seul appel à l'API, inchangé.
- Phase 7 : `session.unlock` accepte un temps d'animation (`beforeEnter`) entre « le mot de passe
  est prouvé » et « les clés entrent en mémoire », pour que la mise en scène ne soit pas coupée.
- Phase 7 : toutes les animations passent par un seul système (`web/src/design/motion.ts`) :
  courbes, ressorts, perspective commune et variantes nommées (carré, écran, dialogue, listes),
  plus les micro-interactions de survol et d'appui.
- Phase 7 : la marque Serenity (cadenas crème à serrure orange, logotype pochoir) entre dans
  l'appli : logotype dans la barre de titre et sur l'écran d'entrée, icônes de l'appli installée
  et favicon redécoupés du logo, jeton de couleur `mark`.
- Phase 7 : centre de notifications derrière la cloche (`/api/notifications`, non lues, tout
  marquer comme lu) et **corbeille** dans les réglages (restaurer une entrée supprimée) : deux
  capacités du serveur qui n'avaient pas d'écran.
- Phase 7 : réglages en volets (Verrouillage, Appareils, Surveillance, Import et export,
  Corbeille, Compte) au lieu d'un seul long défilement.
- Phase 7 : confirmations explicites (`<Confirm>`) avant supprimer, confier, reprendre,
  déconnecter un appareil, arrêter ou relancer l'agent.
- Phase 7 : `make ui-smoke` fait un second passage en 1440 px (connexion, coffre, fiche, agent,
  notifications, réglages) ; captures de bureau dans `web/e2e/shots/`.
- Phase 7 : appli web PWA (React 18, Tailwind v4, Motion, Phosphor, TanStack Query) : création de
  compte avec kit de récupération, connexion, déverrouillage, récupération ; onglets Coffre, Fuites,
  Journal, Agent ; fiche d'entrée (copie avec effacement du presse-papiers après
  30 s, code TOTP en direct, rotation, historique, confier / reprendre) ; réglages (verrouillage,
  appareils, adresses surveillées, import Bitwarden, export chiffré, mot de passe maître).
- Phase 7 : hors ligne (cache chiffré dans IndexedDB, déverrouillage local en lecture seule),
  notifications en temps réel, polices servies localement.
- Phase 7 : générateur avec robustesse en clair (« Faible » à « Très solide ») en plus des bits.
- Phase 7 : nginx avec CSP stricte (`wasm-unsafe-eval` seulement pour libsodium) et en-têtes de
  sécurité ; image `web` construite depuis les sources.
- Phase 7 : `make ui-smoke` (Chromium sur l'image de production, tous les écrans, hors ligne),
  job CI avec captures, docs `07-interface.md` et `design.md`.

- Phase 6 : politiques de rotation par entrée (fréquence, mode autonome / validation ; rappels
  seulement en zone personnelle), échéancier horaire de l'agent, rotation après fuite, kill switch
  (API, enclencher / relâcher), allowlist lue par le code, limite de rotations par jour,
  approuver / refuser, notifications `rotation.due` et `reminder.due`.
- Phase 6 : `rotator/base.py` : interface `SiteRotator` et rotation transactionnelle (en attente,
  vérification, retour arrière), sans site.
- Phase 6 : flux temps réel `/api/events` (Server-Sent Events), `docs/api.md` généré depuis OpenAPI
  (`make api-doc`, vérifié en CI), client TypeScript de l'agent, `make schedule-now`, commandes
  `make client` (policy, rotations, approve, refuse, stop, start), doc `06-agent.md`, ADR-011.

### Ajouté

- **Les titres d'écran passent au pochoir du logotype.** « COFFRE », « FUITES » et « AGENT »
  sont maintenant dessinés dans les mêmes lettres que « SERENITY », avec Black Ops One servie
  localement comme les deux autres polices. Elle ne sert qu'aux titres : trois mots par écran,
  jamais une phrase.
- **La revue de sécurité** (`docs/10-securite.md`) : ce qui a été vérifié avec la commande pour
  le rejouer (surface réseau, privilèges des conteneurs, secrets dans l'historique, dépendances
  Python et npm, en-têtes HTTP), le modèle de menace résumé en un tableau de ce que gagne un
  attaquant selon ce qu'il obtient, et dix risques restants assumés.
- **La matrice des contrôles d'accès est figée par un test** (`tests/test_route_guards.py`) :
  les 9 routes publiques sont écrites une par une avec leur raison, les 16 routes qui écrivent
  exigent le mot de passe maître, et les 6 exceptions sont nommées. Une route ajoutée sans garde
  fait échouer la CI.
- **Une section « À propos » dans les réglages** : le lien vers le code source, la licence et le
  rappel que rien n'est audité. C'est ce que l'AGPL section 13 demande à une application web,
  et ça marche hors ligne.
- **Le nécessaire pour ouvrir le code** : `LICENSE` (GNU AGPL v3, le choix habituel d'un serveur
  auto-hébergé), `SECURITY.md` (signalement privé par GitHub, délais visés, ce qui est dans le
  périmètre et ce qui n'y est pas) et `CONTRIBUTING.md` (règles qui ne se discutent pas, commandes
  de vérification, forme d'une pull request). Le dépôt reste privé : ces fichiers préparent le
  passage en public, ils ne le déclenchent pas.
- **Un dépôt présentable** : `CODE_OF_CONDUCT.md`, un sélecteur d'issue qui renvoie les failles
  vers le signalement privé, une description et des sujets sur GitHub, des badges et une section
  « Le projet en chiffres » dans le README, et une **bannière** 1280 × 640 dessinée par
  `scripts/banniere.html`. `make brand-icons` devient `make brand` et produit les deux.

### Modifié

- **Tailscale n'est plus présenté comme un prérequis.** La règle qui compte est que Serenity ne
  s'expose jamais sur Internet et n'écoute rien en dehors de `127.0.0.1` ; la façon de l'atteindre
  depuis un téléphone est un choix d'hébergement. La page infrastructure compare quatre chemins
  (réseau maillé, VPN, tunnel SSH, reverse proxy local) et garde la recette Tailscale comme
  exemple. L'interface ne dit plus « reconnecte-toi au tailnet » mais « au serveur », et plus
  aucune adresse personnelle ne traîne dans la documentation.
- **Revue de toute la documentation** : captures d'écran refaites aux nouvelles couleurs
  (README et `07-interface.md`), architecture à jour (4 services + le rotateur + les
  sauvegardes), CI décrite avec ses huit jobs et les trois qui bloquent vraiment une fusion,
  milestones corrigés, et toutes les phrases du type « ça arrive en phase 7 » remplacées par ce
  qui existe. Les comptes de tests figés dans les pages (« 139 tests ») laissent la place à une
  description : un nombre qui vieillit mal n'apprend rien.
- **L'interface passe au bleu blanc rouge.** L'orange du logo cède la place au **bleu de France**
  (`#0055A4`, ouvert sur fond sombre) pour tout ce qui agit, au **rouge Marianne** pour tout ce
  qui alerte, et au blanc pour la marque. Le drapeau entier ne sort que trois fois, là où il dit
  quelque chose : le filet sous la barre de titre, les trois étapes de la création de compte, et
  les têtes de la cascade de déverrouillage. La marque devient le drapeau en un objet (pavé
  bleu, cadenas blanc, serrure rouge), et les icônes de l'appli se regénèrent depuis les SVG
  (`make brand`). Les deux thèmes, les jetons et la charte suivent
  (ADR-017, `docs/design.md`).
- Phase 7 : les panneaux glissants venus du bas (fiche, éditeur, réglages) deviennent des
  **dialogues centrés** avec focus piégé, fermeture par Échap et page bloquée derrière.
- Phase 7 : les messages éphémères passent en bas de l'écran, un à la fois, avec une icône d'état
  et une fermeture au clic.

### Corrigé

- Agent : une rotation approuvée dont le site n'a **aucune recette** restait silencieuse pour
  toujours. Elle porte maintenant sa raison (« aucune recette pour ce site »), visible dans
  l'écran Agent sous « Approuvées, en attente de l'exécuteur », et le journal ne répète plus
  l'information à chaque passage.
- Rotation : une entrée **modifiée pendant que sa rotation était en vol** devenait illisible
  (le bloc en attente était écrit sous une révision qui n'était pas la sienne). La validation
  finale re-chiffre désormais sur l'entrée à jour : ta modification est gardée, le mot de passe
  vient de la rotation. Deux autres verrous : un second bloc en attente est refusé, et si le
  coffre échoue **après** que le site a changé, le bloc en attente est conservé : c'est la seule
  copie du nouveau mot de passe.
- Phase 7 : le coffre apparaissait **avant la fin** de la cascade, sous une pluie encore en
  cours : le rideau se levait au bout de 950 ms au lieu d'attendre que les traînées soient
  sorties et que le coffre soit monté. Le coffre arrive maintenant de loin, rideau levé sur lui.
- Phase 7 : le rideau de la cascade ne masquait en réalité rien, un ancien `clip-path` le
  réduisait à une hauteur nulle, et l'écran de déverrouillage restait visible sous la pluie.
- Phase 7 : le champ de recherche était noir sur fond noir ; il prend la surface surélevée,
  comme les cases du code à six chiffres.
- Phase 7 : les marques des deux zones disaient le contraire du modèle : la zone personnelle
  portait un bouclier gris et la zone agent un bouclier vert. C'est désormais un **bouclier vert**
  pour « seuls tes appareils peuvent lire » et un **robot orange** pour « confié à l'agent », sur
  l'entrée comme sur le titre de sa zone.
- Phase 7 : une **barre de défilement horizontale** apparaissait et disparaissait en bas du
  contenu à chaque changement d'onglet (l'écran entrant glisse, et `overflow-y: auto` force
  `overflow-x: auto`).
- Phase 7 : régler un rappel ou une rotation n'affichait **aucune erreur** quand le serveur
  refusait ; le message est maintenant montré dans le panneau.
- Phase 7 : ouvrir les réglages depuis la roue dentée affichait un volet vide, car l'événement de
  clic arrivait à la place du nom de section.
- Phase 7 : l'animation de déverrouillage se jouait **deux fois** : React démontait la pluie avec
  l'écran de déverrouillage puis la remontait au-dessus du coffre ; `App` garde maintenant trois
  emplacements fixes.
- Phase 7 : un bouton principal désactivé s'affichait en orange délavé ; il prend désormais une
  surface neutre.
- Phase 7 : la grille du décor défilait derrière la vitre translucide du formulaire, ce qui
  donnait une animation parasite en boucle juste derrière les champs de saisie.
- Phase 7 : un sous-arbre laissé à `rotateY(180deg)` ne recevait plus les clics de souris
  (le clavier, si) : le cadenas change désormais de face de profil, sans jamais rester retourné.
- Phase 7 : `make ui-smoke` dit maintenant ce que la page affichait quand une étape échoue, au
  lieu d'un simple dépassement de délai.
- Phase 7 : un message éphémère pouvait masquer le titre de l'écran.
- Phase 7 : « Supprimer » effaçait une entrée au premier clic, sans confirmation.
- Phase 7 : l'écran Agent annonçait qu'il fallait le mot de passe maître pour relancer l'agent,
  ce qui n'était pas le cas.

- Phase 6 : la migration v4 pouvait supprimer la nouvelle table `rotation` sur une base neuve.

- Phase 5 : veille des fuites. Dans le navigateur (deux zones) : Pwned Passwords en k-anonymat,
  réutilisés, faibles, anciens ; rapport sans secret (`POST /api/watch/report`). Sur le serveur
  (agent, zone agent, toutes les 6 h) : mêmes contrôles sauf réutilisation ; adresses e-mail via
  HIBP si `HIBP_API_KEY`. Alertes sans doublon (`Breach`), notifications dans l'appli
  (`Notification`), kill switch lu avant chaque action de l'agent.
- Phase 5 : règles partagées `shared/test-vectors/watch.json`, `make watch-now`,
  `make client c=scan|breaches|notifications`, doc `05-veille.md`, ADR-010, migration v4.

### Retiré

- Phase 5 : anciens modèles `Entry`, `Breach`, `Rotation` de l'époque Vaultwarden.

- Phase 4 : coffre chiffré (`Item`, `ItemRevision`, migration v3) : ajout (par lots), modification
  avec contrôle de révision (`409`), corbeille 30 jours, historique des 10 dernières versions,
  synchronisation par curseur, confier à l'agent / reprendre avec confirmation et journal.
- Phase 4 : côté navigateur, état du coffre et détection de retour en arrière, verrouillage
  automatique, générateur de mots de passe et de phrases de passe (liste EFF), codes TOTP des
  entrées, import Bitwarden dans le navigateur, export chiffré.
- Phase 4 : commandes du coffre dans `make client`, tests de bout en bout du coffre, doc
  `04-coffre.md`, ADR-009.

- Phase 3 : comptes (`User`, `AgentKey`, `DeviceSession`, `Throttle`), inscription en deux temps
  (blocs chiffrés puis premier code TOTP), prélogin sans énumération, connexion clé d'auth + TOTP,
  session d'appareil de 60 jours, déverrouillage de 15 min pour les actions sensibles,
  sessions listables et révocables, changement de mot de passe maître, récupération par le kit
  (nouveau kit à chaque fois), verrouillage progressif, `make reset-totp`.
- Phase 3 : parcours côté navigateur en TypeScript (`web/src/features/account/`), `Keyring` en
  mémoire, codes TOTP via Web Crypto, client API.
- Phase 3 : client de référence Python (`make client`), test de bout en bout TypeScript ↔ Python
  (`make e2e`, job CI), doc `03-authentification.md`, ADR-008, migration v2.

### Retiré

- Phase 3 : ancienne authentification mono-utilisateur (`auth.json`, `make auth-init`, argon2-cffi).

- Phase 2 : conteneur `agent` séparé (même image), seul détenteur de la clé serveur, sans port,
  réseau `egress` uniquement ; publication de la clé publique serveur (`GET /api/crypto/server-key`),
  garde-fou si la clé change.
- Phase 2 : clés `data/keys/server.key` et `data/keys/totp.key` (`root:root 0400`, `make keys`,
  créées au premier `make up`), lues en root puis abandon de privilèges vers l'UID 10001 (ADR-007).
- Phase 2 : nginx résout l'api dynamiquement (plus de `502` après recréation), SQLite `busy_timeout`
  pour l'accès partagé api / agent.
- Phase 2 : doc `02-infrastructure.md` réécrite (sauvegarde séparée des clés).

- Phase 1 : spécification cryptographique `docs/crypto.md` (validée) et ADR-006.
- Phase 1 : modules crypto Python (`api/serenity/crypto/`, PyNaCl) et TypeScript
  (`web/src/crypto/`, libsodium-wrappers-sumo) : Argon2id, sous-clés, blocs AEAD, boîtes scellées,
  kit de récupération, entrées bourrées.
- Phase 1 : vecteurs de test partagés `shared/test-vectors/` (`make vectors`), vérification croisée
  Python ↔ TypeScript en CI (`make crypto-interop`), projet web initialisé (TypeScript strict, eslint,
  prettier, vitest ; `make web-test`).

### Changé

- Phase 0 : **remise à plat**. Serenity devient un gestionnaire de mots de passe complet, avec son
  propre coffre chiffré à double zone (personnelle / agent). Nouveau `CLAUDE.md`, ADR-001
  « Coffre maison à double zone plutôt que Vaultwarden », issues et milestones alignés sur le plan en 8 phases.
- Phase 0 : notifications **maison** (ADR-005) : centre de notifications dans l'api, appli Android native
  en V2 par vérification périodique (sans icône permanente ni service tiers). Plan des versions : V2 Android, V3 rotation, V4 agent LLM.
- Phase 0 : arborescence alignée sur la cible (`crypto/`, `vault/`, `agent/`, `watcher/`,
  `shared/test-vectors/`, `web/src/crypto`, `web/src/vault`).

### Retiré

- Phase 0 : service `vaultwarden`, override d'admin, variables `VW_*` et `BW_*`, client `vault.py`,
  Bitwarden CLI (`bw serve`, PR #18 fermée). Anciens ADR-001 et ADR-005 archivés.
- Phase 0 : service `ntfy`, sa configuration et les variables `NTFY_*`.

### Ajouté

- Phase 3 : configuration `pydantic-settings`, `SERENITY_SECRET_KEY` obligatoire.
- Phase 3 : modèles SQLModel (`Entry`, `Breach`, `Rotation`, `AuditLog`, `Setting`, `AuthSession`),
  dates toujours en UTC, migrations au démarrage.
- Phase 3 : authentification argon2 + TOTP (anti-rejeu), sessions côté serveur, cookie
  `HttpOnly`/`Secure`/`SameSite=Strict` de 12 h, blocage après 5 échecs.
- Phase 3 : commande `python -m serenity.auth init` (`make auth-init`).
- Phase 3 : journal d'audit avec filtre anti-secret, appliqué aussi à tous les logs ; `GET /api/logs`.
- Phase 3 : calcul de `next_rotation_at`.
- Phase 3 : doc `03-backend-socle.md`, ADR-004 et ADR-005.
- Phase 2 : `docker-compose.yml` (vaultwarden, ntfy, api, web), ports sur `127.0.0.1` uniquement,
  réseaux `internal` / `edge` / `egress`, conteneurs non-root en lecture seule, healthchecks.
- Phase 2 : Vaultwarden (inscriptions fermées, admin désactivée, override d'admin ponctuel).
- Phase 2 : ntfy (authentification obligatoire, `deny-all`, sans inscription ni pièces jointes).
- Phase 2 : `api` minimale (`GET /api/health`) et `web` provisoire (nginx + proxy `/api`).
- Phase 2 : `Makefile` (`init`, `up`, `down`, `restart`, `logs`, `ps`, `test`, `lint`).
- Phase 2 : doc `02-infrastructure.md`, ADR-001 à ADR-003.
- Phase 1 : arborescence du dépôt, README, `.gitignore`, `.env.example` commenté.
- Phase 1 : templates d'issue et de pull request, Dependabot (pip, npm, docker, docker-compose, actions).
- Phase 1 : CI GitHub Actions (backend, frontend, scan de secrets gitleaks).
- Phase 1 : documentation (`docs/README.md`, vue d'ensemble, page de la phase 1).
- Phase 1 : protection de `main` (PR + CI verte obligatoires). Secret scanning GitHub indisponible, remplacé par gitleaks.
