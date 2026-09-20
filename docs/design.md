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
pas un endroit où l'on travaille — il vit dans les réglages, et l'écran Agent y renvoie.
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

Le logo est un **cadenas plein**, crème (`--color-mark`, `#ECE8E1`), anse épaisse **détachée du
corps** (le trait pochoir), serrure orange. Le logotype « SEREN**I**TY » est en pochoir, le « I »
en orange.

Les fichiers d'origine sont découpés en trois usages (`web/public/`) :

| Fichier | Usage |
|---|---|
| `brand/wordmark.png` | Le logotype seul, en haut des écrans d'entrée et dans la barre de titre |
| `brand/wordmark-clair.png` | La même chose pour le thème clair, prêt mais pas encore utilisé |
| `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` | Icônes de l'appli installée, découpées du logo |
| `icon.svg`, `maskable.svg` | La même forme, redessinée en vectoriel |

La marque dans la barre de titre (`design/Lock.tsx`) reprend **exactement** cette géométrie,
mesurée sur le fichier d'origine.

## Les écrans d'entrée

Création du compte, connexion, code, déverrouillage, récupération : un seul cadre
(`features/account/screens/AuthShell.tsx`) — le logotype, **une carte**, et les actions
secondaires dessous. Rien d'autre : c'est la première chose qu'un inconnu voit du coffre.

- **La carte** porte le titre, une phrase d'explication, les champs et l'action principale, avec
  les mêmes composants que l'intérieur de l'appli (`Field`, `Button`, `Note`) — pas de langage
  visuel séparé pour l'entrée.
- **Une procédure se compte** : `Étape 2 sur 3` et une barre en trois segments, en haut de la
  carte. Le passage d'une étape à l'autre fait glisser la carte de 24 px.
- **Les actions secondaires sont de vrais boutons** sous la carte — « Changer de compte »,
  « Utiliser mon kit de récupération », « Retour à la connexion » — jamais des liens en petit.
- **Le code à six chiffres** est en six cases, la case active cerclée d'orange. Le vrai champ
  est transparent par-dessus : collage, clavier numérique et remplissage automatique des codes
  marchent toujours.

## L'ouverture : la pluie chiffrée

Le coffre a répondu oui : **une cascade de données chiffrées tombe du haut de l'écran**
(`design/DataRain.tsx`).

- L'alphabet est celui des blocs du coffre : base64 et hexadécimal. La tête de chaque colonne
  est orange avec un halo, la traînée est **volontairement pâle** (34 % au plus) — c'est une
  chute de données, pas un mur de blanc.
- **Le front de la pluie est la ligne de révélation** : au-dessus, l'écran de déverrouillage a
  déjà disparu ; en dessous, il tient encore. Le bord est fondu sur 70 px, pour que la pluie
  ait l'air de manger l'écran plutôt que d'y poser un rectangle.
- **La pluie ne s'arrête jamais** : quand plus rien n'est ajouté en tête, les traînées finissent
  de tomber et sortent par le bas. Une pluie qui se fige puis s'efface ressemble à un bug.
- Le canevas est effacé **par composition** (`destination-out`), jamais repeint en noir : le
  coffre reste visible à travers.

**L'ordre compte** : le front couvre l'écran en 900 ms, les traînées finissent de sortir par le
bas vers 1,56 s, et **c'est seulement là** que le coffre est monté — derrière un rideau resté
opaque. Le rideau ne se lève qu'une fois le coffre réellement en place (`lift`), pendant que
celui-ci **arrive de loin** (`scale 0,78 → 1`, 620 ms). Sans cette attente, on voyait le coffre
apparaître sous une pluie encore en cours.

`App` garde **trois emplacements fixes** — décor, écran, pluie — et n'en déplace aucun : sans
cela, React démonte la pluie avec l'écran de déverrouillage et la remonte au-dessus du coffre,
et l'animation se joue deux fois.

## Le fond

**Noir pur, et rien d'autre.** Pas de lumière qui dérive, pas de grille, pas de données en
arrière-plan : le carré se détache seul, par son contour. Ce qui bouge dans Serenity bouge
*dans* l'interface, jamais derrière elle.

## Couleurs (thème sombre)

Définies dans `web/src/design/theme.css` (`@theme` de Tailwind v4) :

| Jeton | Valeur | Usage |
|---|---|---|
| `bg` | `#000000` | **Noir pur**, derrière tout : le carré doit se détacher comme un objet |
| `surface` | `#16171A` | Cartes, fond du carré |
| `raised` | `#1F2126` | Dialogues, messages éphémères |
| `line` | `rgba(255,255,255,0.28)` | Bordures franches : sur un fond noir, c'est ce qui délimite |
| `hover` | `rgba(255,255,255,0.04)` | Survol d'une ligne ou d'un bouton discret |
| `text` / `muted` | `#ECEDEF` / `#9A9CA3` | Texte principal / secondaire |
| `mark` | `#ECE8E1` | Le crème du logo : le cadenas et le logotype, rien d'autre |
| `accent` / `accent-soft` | `#F2711C` / 14 % | **Avec parcimonie** : bouton principal, onglet actif, kill switch |
| `ok` / `warn` / `crit` | `#6BD49A` / `#F5C26B` / `#F27A7A` | États, chacun avec son fond doux à 12 % |

Un thème clair est prêt (`[data-theme="light"]`) mais pas activé en V1.

L'orange est celui du logo, `#F2711C`, **le même partout** : bouton principal, onglet actif,
choix sélectionné, tête de la cascade.

## Typographie

**Les titres d'écran portent la manière du logotype** : capitales, interlettrage large, centrées
sous la marque. Geist (interface) et JetBrains Mono (codes, clés, heures du journal), servies localement
(`web/public/fonts/`, licence OFL). **Quatre tailles** : `text-display` 26 px (titre d'écran sur
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
| **Confié à l'agent** | robot **orange** | L'orange est la couleur de l'agent partout dans l'appli ; ici, il te dit que le serveur peut lire |

Le vert n'est donc jamais « le statut est bon » sur une entrée : il dit « personne d'autre que
toi ». Et l'orange ne dit pas « attention » : il dit « l'agent s'en occupe ».

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

Contraste AA, zones tactiles de 44 px au moins, navigation au clavier (focus visible orange),
`aria-label` sur chaque bouton-icône, dialogues en `role="dialog"` avec focus piégé et fermés par
Échap, `aria-live` sur les messages éphémères.
