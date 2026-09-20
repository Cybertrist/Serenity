# Charte graphique

Le code est dans `web/src/design/`. Les écrans sont décrits dans
[`07-interface.md`](07-interface.md).

## Intention

Calme, doux, moderne. On doit sentir que tout est sous contrôle sans être noyé d'informations.
**Une information principale par carte. Beaucoup d'air.**

Trois règles qui priment sur le reste :

1. **Rien de décoratif.** Chaque carte, chaque icône, chaque animation sert à lire, à comprendre
   ou à agir. Une fonctionnalité qui n'a pas d'écran n'existe pas ; un écran qui ne mène à rien
   n'a pas lieu d'être.
2. **Tout s'explique sur place.** Chaque écran a un sous-titre qui dit à quoi il sert, chaque
   zone dit qui peut la lire, chaque action irréversible dit ce qu'elle va faire **avant** de la
   faire.
3. **L'appli est un objet, pas une page.** Elle tient dans un carré posé au centre de l'écran ;
   le même code sert le téléphone, où le carré devient le plein écran.

## Mise en page

L'appli vit dans **un carré centré** : côté = `min(92vw, 92vh, 980px)`. Sous **768 px**, il prend
tout l'écran (`AppFrame`, `web/src/app/shell/`).

```
┌──────────────────────────┐
│ SERENITY          🔔  ⚙  │  barre de titre : la marque, les notifications, les réglages
├──────────────────────────┤
│  Titre de l'écran        │
│  une phrase qui explique │  contenu, seul à défiler
│  …                    (+)│  l'ajout flotte en bas à droite
├──────────────────────────┤
│  Coffre   Fuites   Agent │  trois onglets, pas plus
└──────────────────────────┘
```

**Trois onglets seulement.** Le journal n'en fait pas partie : c'est un registre qu'on consulte,
pas un endroit où l'on travaille. Il vit dans les réglages, et l'écran Agent y renvoie.
« Verrouiller maintenant » n'est pas non plus dans la barre de titre : c'est une action de
réglage, pas une action de tous les jours (le verrouillage automatique s'en charge).

**L'ajout d'une entrée flotte** en bas à droite du carré, au-dessus du contenu qui défile et à
l'écart des messages éphémères : c'est la seule action qu'on lance depuis n'importe où dans le
coffre, elle ne dispute donc pas sa place au titre.

À l'intérieur, **rien ne se règle sur la fenêtre** : on utilise les container queries de
Tailwind v4 (`@container` sur le carré, variantes `@[620px]:…`), pour que les composants
réagissent à la place réellement disponible.

| Dans le carré | < 620 px de côté | ≥ 620 px |
|---|---|---|
| Titre d'écran | 20 px | 26 px |
| Onglets | icône au-dessus du mot | icône à côté du mot |
| Zones du coffre | l'une sous l'autre | côte à côte |
| Bouton d'ajout | icône seule | bouton « Ajouter » |

## La marque

Le logo est un **cadenas plein**, blanc (`--color-mark`, `#F2F4F8`), anse épaisse **détachée du
corps** (le trait pochoir), **serrure rouge Marianne**. Le logotype « SEREN**I**TY » est en
pochoir, le « I » **en rouge**. Posé sur le pavé **bleu de France** de l'icône, le tout donne le
drapeau en un seul objet, sans rayures : un fond bleu, un cadenas blanc, une serrure rouge.

Les fichiers d'origine sont découpés en trois usages (`web/public/`) :

| Fichier | Usage |
|---|---|
| `brand/wordmark.png` | Le logotype seul, en haut des écrans d'entrée et dans la barre de titre |
| `brand/wordmark-clair.png` | La même chose pour le thème clair ; `<Wordmark>` choisit la découpe |
| `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` | Icônes de l'appli installée, découpées du logo |
| `icon.svg`, `maskable.svg` | La même forme, redessinée en vectoriel : **la source des PNG** |

La marque dans la barre de titre (`design/Lock.tsx`) reprend **exactement** cette géométrie,
mesurée sur le fichier d'origine.

Les PNG d'icône ne se retouchent pas à la main : ils se **regénèrent** depuis les deux SVG par
`make brand` (Chromium dans Docker), qui produit aussi la bannière du dépôt
(`docs/img/banniere.png`, dessinée par `scripts/banniere.html`). Changer la marque, c'est
changer le SVG puis relancer la commande.

## Bleu, blanc, rouge

Serenity est un coffre français, et cela se voit, **sans déguisement**. Les trois couleurs ont
chacune un métier, et le drapeau entier n'apparaît qu'à trois endroits où il sert à quelque chose.

| Couleur | Jeton | Son métier |
|---|---|---|
| **Bleu de France** | `accent` | Tout ce qui agit : bouton principal, onglet actif, interrupteur, choix sélectionné, couleur de l'agent |
| **Blanc** | `mark` | La marque : le cadenas et le logotype. Sur papier, il passe à l'encre |
| **Rouge Marianne** | `crit` | Ce qui alerte : erreurs, suppressions, compteurs de fuites, et la serrure du logo |

Le drapeau **en entier** (`tricolore`, trois bandes à arêtes franches) sert trois fois :

1. **Le filet sous la barre de titre**, l'en-tête de l'objet, comme un papier à en-tête.
2. **Les trois étapes de la création de compte** : une bande par étape franchie, le drapeau est
   complet quand le coffre l'est. Une procédure à un autre nombre d'étapes retombe sur le bleu :
   le drapeau ne veut dire quelque chose que s'il est entier.
3. **La cascade de déverrouillage** : les colonnes tombent en trois bandes.

Nulle part ailleurs. Une bande tricolore posée sur une carte serait de la décoration, et la
première règle de cette charte l'interdit.

Le bleu et le rouge sont ceux de l'État (`#0055A4`, `#E1000F`), éclaircis pour le thème sombre
comme le reste de la palette. Voir [ADR-017](decisions/ADR-017-identite-francaise.md).

## Les écrans d'entrée

Création du compte, connexion, code, déverrouillage, récupération : un seul cadre
(`features/account/screens/AuthShell.tsx`) : le logotype, **une carte**, et les actions
secondaires dessous. Rien d'autre : c'est la première chose qu'un inconnu voit du coffre.

- **La carte** porte le titre, une phrase d'explication, les champs et l'action principale, avec
  les mêmes composants que l'intérieur de l'appli (`Field`, `Button`, `Note`). Pas de langage
  visuel séparé pour l'entrée.
- **Une procédure se compte** : `Étape 2 sur 3` et une barre en trois segments, en haut de la
  carte, en **bleu, blanc, rouge**, une bande par étape franchie. Le passage d'une étape à l'autre
  fait glisser la carte de 24 px.
- **Les actions secondaires sont de vrais boutons** sous la carte (« Changer de compte »,
  « Utiliser mon kit de récupération », « Retour à la connexion »), jamais des liens en petit.
- **Le code à six chiffres** est en six cases, la case active cerclée de bleu. Le vrai champ
  est transparent par-dessus : collage, clavier numérique et remplissage automatique des codes
  marchent toujours.

## L'ouverture : la pluie chiffrée

Le coffre a répondu oui : **une cascade de données chiffrées tombe du haut de l'écran**
(`design/DataRain.tsx`).

- L'alphabet est celui des blocs du coffre : base64 et hexadécimal. **Les têtes de colonnes
  tombent en trois bandes** : bleu à gauche, blanc au centre, rouge à droite. Le drapeau
  descend avec les données. La traînée est **volontairement pâle** (34 % au plus), c'est une
  chute de données, pas un mur de blanc. Sur papier, la bande blanche passe à l'encre
  (`--color-mark`) : une tête blanche sur fond clair ne serait rien.
- **Le front de la pluie est la ligne de révélation** : au-dessus, l'écran de déverrouillage a
  déjà disparu ; en dessous, il tient encore. Le bord est fondu sur 70 px, pour que la pluie
  ait l'air de manger l'écran plutôt que d'y poser un rectangle.
- **La pluie ne s'arrête jamais** : quand plus rien n'est ajouté en tête, les traînées finissent
  de tomber et sortent par le bas. Une pluie qui se fige puis s'efface ressemble à un bug.
- Le canevas est effacé **par composition** (`destination-out`), jamais repeint en noir : le
  coffre reste visible à travers.

**L'ordre compte** : le front couvre l'écran en 900 ms, les traînées finissent de sortir par le
bas vers 1,56 s, et **c'est seulement là** que le coffre est monté, derrière un rideau resté
opaque. Le rideau ne se lève qu'une fois le coffre réellement en place (`lift`), pendant que
celui-ci **arrive de loin** (`scale 0,78 → 1`, 620 ms). Sans cette attente, on voyait le coffre
apparaître sous une pluie encore en cours.

`App` garde **trois emplacements fixes** (décor, écran, pluie) et n'en déplace aucun : sans
cela, React démonte la pluie avec l'écran de déverrouillage et la remonte au-dessus du coffre,
et l'animation se joue deux fois.

## Le fond

**Noir pur, et rien d'autre.** Pas de lumière qui dérive, pas de grille, pas de données en
arrière-plan : le carré se détache seul, par son contour. Ce qui bouge dans Serenity bouge
*dans* l'interface, jamais derrière elle.

## Couleurs du thème sombre (par défaut sur un système sombre)

Définies dans `web/src/design/theme.css` (`@theme` de Tailwind v4) :

| Jeton | Valeur | Usage |
|---|---|---|
| `bg` | `#000000` | **Noir pur**, derrière tout : le carré doit se détacher comme un objet |
| `surface` | `#13161D` | Cartes, fond du carré |
| `raised` | `#1B1F2A` | Dialogues, messages éphémères |
| `line` | `rgba(255,255,255,0.28)` | Bordures franches : sur un fond noir, c'est ce qui délimite |
| `hover` | `rgba(255,255,255,0.04)` | Survol d'une ligne ou d'un bouton discret |
| `text` / `muted` | `#ECEEF2` / `#99A0AD` | Texte principal / secondaire |
| `mark` | `#F2F4F8` | Le blanc du logo : le cadenas et le logotype, rien d'autre |
| `accent` / `accent-soft` | `#5B8DEF` / 16 % | **Avec parcimonie** : bouton principal, onglet actif, kill switch |
| `ok` / `warn` / `crit` | `#6BD49A` / `#EDC64B` / `#F76D72` | États, chacun avec son fond doux à 12 % |
| `bleu` / `blanc` / `rouge` | `#3B7DD8` / `#F2F4F8` / `#E8434B` | Le drapeau, **et seulement là où il sert** (`tricolore`) |
| `glow` / `glow-strong` | accent à 18 % / 50 % | Le halo sous le carré, l'ombre sous le bouton d'ajout |

Le bleu est **le même partout** : bouton principal, onglet actif, choix sélectionné, robot de la
zone agent. Le rouge du logo est celui des alertes : c'est la même couleur, pas un quatrième
jeton.

## Couleurs du thème clair

Même grille de jetons, redéfinie sous `[data-theme="light"]`. Rien dans les composants ne code
une couleur en dur : un écran qui écrit `#5B8DEF` ou `white/45` casse le thème clair.

| Jeton | Sombre | Clair | Pourquoi |
|---|---|---|---|
| `bg` | `#000000` | `#EBEEF3` | Un papier légèrement bleuté plutôt qu'un blanc d'écran : le carré blanc s'y pose |
| `surface` / `raised` | `#13161D` / `#1B1F2A` | `#FFFFFF` / `#F2F4F8` | Le carré est la feuille, les dialogues sont légèrement en retrait |
| `line` | blanc 28 % | encre 14 % | Sur du clair, une bordure franche devient une balafre |
| `accent` | `#5B8DEF` | `#0055A4` | **Le bleu du drapeau tient 7:1 sur papier** : inutile d'y toucher. Sur noir, il est ouvert |
| `crit` | `#F76D72` | `#C9191E` | Le rouge Marianne, dans la coupe qui tient sur chaque fond |
| `mark` | `#F2F4F8` | `#0F1626` | **Le cadenas passe à l'encre** : un cadenas blanc sur du papier blanc n'est plus un cadenas |
| `blanc` | `#F2F4F8` | `#C9D3E2` | Sur papier, la bande blanche du drapeau doit être dessinée, sinon le filet paraît cassé |
| `frame` | blanc 45 % | encre 18 % | Le contour du carré |
| `rain-trail` | blanc | encre | La cascade tombe en encre sur le papier, têtes bleue et rouge inchangées |

Le logotype a ses deux découpes dans `web/public/brand/` : `wordmark.png` (blanc) et
`wordmark-clair.png` (encre), le « I » en rouge dans les deux. Le composant `<Wordmark>` choisit, personne d'autre.

## Choisir son thème

Trois choix, dans **Réglages → Apparence** : *Système*, *Clair*, *Sombre*. Par défaut **Système**,
et il suit en direct : le basculement automatique du soir change l'appli sans la recharger.

- La préférence vit dans `localStorage` (`serenity.theme`), propre à cet appareil, jamais envoyée
  au serveur, car c'est un goût, pas un secret.
- `web/src/design/theme.ts` pose `data-theme` sur `<html>` **avant le premier rendu** et met à
  jour la couleur de la barre du navigateur. Une requête média dans `theme.css` habille la toute
  première peinture, avant que le script tourne : pas d'éclair sombre sur un bureau clair.
- L'écran de démarrage de l'appli installée (manifeste PWA) reste sombre : une seule couleur y
  est possible, et c'est le visage de la marque.
- `make ui-smoke` fait trois passages : téléphone et bureau en sombre, puis un passage complet en
  clair (`web/e2e/shots/2*-clair-*.png`), cascade de déverrouillage comprise.

## Typographie

**Les titres d'écran sont dans le pochoir du logotype** : capitales, interlettrage large,
centrées sous la marque, et dessinées dans la même famille de lettres que « SEREN**I**TY ».
C'est Black Ops One, la seule police à fentes de l'appli, et elle ne sert **qu'à ça** : trois
mots par écran, jamais une phrase. Le reste est en **Chakra Petch** (toute l'interface) et
JetBrains Mono (codes, clés, heures du journal). Les trois sont servies localement
(`web/public/fonts/`, licence OFL).

Chakra Petch a été choisie contre Geist, qui tenait ce rôle avant : ses lettres droites et ses
angles coupés prolongent le pochoir du titre sans crier, là où Geist était neutre. Elle n'est
pas variable, donc l'appli n'embarque que les trois graisses dont elle se sert (400, 500, 600). **Quatre tailles** : `text-display` 26 px (titre d'écran sur
ordinateur seulement), `text-title` 20 px semi-gras, `text-body` 15 px, `text-caption` 13 px.

## Formes

Rayons : cartes et dialogues 20 px (`rounded-card`), boutons et champs 14 px (`rounded-control`),
pastilles 12 px (`rounded-chip`), pills en arrondi total. Pas d'ombre lourde sauf sous un
dialogue ou un message éphémère, qui flottent vraiment. Grille de 4 px, cartes en 16 px de marge.

## Les deux zones, en un glyphe

C'est le modèle du produit, donc il a sa marque, portée par l'entrée **et** par le titre de sa
zone (`features/vault/zone.ts`) :

| Zone | Marque | Pourquoi |
|---|---|---|
| **Protégé par toi** | bouclier **vert** | C'est la zone la plus sûre : seuls tes appareils déverrouillés la lisent |
| **Confié à l'agent** | robot **bleu** | Le bleu est la couleur de l'agent partout dans l'appli ; ici, il te dit que le serveur peut lire |

Le vert n'est donc jamais « le statut est bon » sur une entrée : il dit « personne d'autre que
toi ». Et le bleu ne dit pas « attention » : il dit « l'agent s'en occupe ».

## Icônes

Phosphor Icons (`@phosphor-icons/react`, noms en `…Icon`) : **duotone** pour la navigation, les
états et les écrans vides, **fill** pour l'onglet actif, **regular** dans les listes et les
boutons. 24 px en navigation, 20 px en liste, 40 px pour les écrans vides. Une icône de liste est
posée dans une **pastille** (`<Chip>`), teintée du fond doux de son état. **Aucun emoji.**

## Mouvement

Motion (`motion/react`). **Tout vient de `web/src/design/motion.ts`** : aucun écran n'invente sa
propre durée. Transformations et opacité uniquement (accélérées par le GPU), jamais `width`,
`top` ni `left`.

| Jeton | Ce que c'est | Où |
|---|---|---|
| `EASE_OUT` | `cubic-bezier(.22,1,.36,1)` | Tout ce qui apparaît |
| `EASE_IN_OUT` | `cubic-bezier(.65,0,.35,1)` | Un mouvement qu'on suit du début à la fin |
| `SPRING` | 420 / 34 | Ce que le doigt a poussé : boutons, onglets, interrupteurs |
| `SOFT_SPRING` | 260 / 30 | Les grandes surfaces : le carré qui arrive |
| `PART_SPRING` | 240 / 15 | L'anse du cadenas de la marque, quand elle s'ouvre |
| `MODAL_SPRING` | 380 / 32 | Les dialogues |
| `PERSPECTIVE` | 1600 px | **Une seule caméra** pour toute l'appli |

Les variantes nommées portent l'orchestration : `FRAME` (le carré sort de la serrure : il arrive
trop près, `scale 1,16 → 1`, puis ses parties en cascade), `SCREEN` (changement d'onglet), `DIALOG` (un dialogue se pose,
`rotateX 8° → 0`), `LIST` + `LIST_ITEM` (35 ms entre deux lignes). Les gestes partagés sont
`PRESS` (0,975) et `LIFT` (−1 px).

Micro-interactions : les boutons se soulèvent au survol et s'enfoncent au clic, les lignes de
liste glissent de 3 px, l'icône de l'onglet choisi fait un bond, les listes se chargent en
squelettes plutôt qu'en roues.

`prefers-reduced-motion` est respecté partout (`MotionConfig reducedMotion="user"`, règle CSS,
et les composants 3D retombent sur un simple fondu).

## Ton

Phrases courtes, tutoiement, rassurant : « Tout va bien. », « 2 comptes à surveiller »,
« Rotation dans 12 jours ». **Un seul message éphémère à la fois**, en **bas du carré** : il ne
doit jamais masquer un titre. Il porte une icône de son état et se ferme d'un clic.

## Écrans vides

Un cadre en pointillés, une icône duotone, **un titre**, une phrase qui dit quoi faire, et le
bouton qui le fait (`<EmptyState>`). Jamais une icône seule au milieu du vide.

## Accessibilité

Contraste AA, zones tactiles de 44 px au moins, navigation au clavier (focus visible bleu),
`aria-label` sur chaque bouton-icône, dialogues en `role="dialog"` avec focus piégé et fermés par
Échap, `aria-live` sur les messages éphémères.
