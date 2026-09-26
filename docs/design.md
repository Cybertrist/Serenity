# Charte graphique

Le code est dans `web/src/design/`. Les écrans sont décrits dans
[`07-interface.md`](07-interface.md). La refonte de septembre 2026 est expliquée dans
[ADR-019](decisions/ADR-019-refonte-interface.md).

## Intention

Calme, net, haut de gamme. On doit sentir que tout est sous contrôle sans être noyé d'informations.
**Une information principale par carte. Beaucoup d'air.**

Trois règles qui priment sur le reste :

1. **Rien de décoratif.** Chaque carte, chaque icône, chaque animation sert à lire, à comprendre
   ou à agir. Une fonctionnalité qui n'a pas d'écran n'existe pas ; un écran qui ne mène à rien
   n'a pas lieu d'être.
2. **Tout s'explique sur place.** Chaque écran a un sous-titre qui dit à quoi il sert, chaque
   zone dit qui peut la lire, chaque action irréversible dit ce qu'elle va faire **avant** de la
   faire.
3. **L'appli est un objet, pas une page.** Elle est posée au centre de l'écran, avec ses bords
   et son ombre ; le même code sert le téléphone, où l'objet devient le plein écran.

## Mise en page

Sous **768 px** de fenêtre, l'appli prend tout l'écran. Au-dessus, c'est un objet posé :
`min(96vw, 1240px)` de large, `min(94dvh, 900px)` de haut, coins arrondis de 26 px et une ombre
longue (`AppFrame`, `web/src/app/shell/`).

Tout, à l'intérieur, se règle sur **la place réellement disponible dans l'objet**, pas sur la
fenêtre : container queries de Tailwind v4 (`@container` sur l'objet, variantes `@[620px]:…`).
Deux formes en sortent :

```
Étroit (téléphone)                 Large (tablette, ordinateur, dès 900 px d'objet)
┌──────────────────────────┐       ┌────────────┬─────────────────────────────────┐
│ SERENITY    guide, cloche│       │ SERENITY   │  Titre de l'écran               │
├──────────────────────────┤       │            │  une phrase qui explique        │
│ Titre de l'écran         │       │ > Coffre   │                                 │
│ une phrase qui explique  │       │   Codes    │  contenu, seul à défiler        │
│ …                     (+)│       │   Fuites   │                                 │
├──────────────────────────┤       │   Agent    │                                 │
│ Coffre Codes Fuites Agent│       │            │                    (+ Ajouter)  │
└──────────────────────────┘       │ Guide ...  │                                 │
                                   └────────────┴─────────────────────────────────┘
```

- **Étroit** : une barre de titre (la marque, le guide, les notifications, les réglages), le
  contenu, et **les quatre onglets en bas**, à portée de pouce.
- **Large** : les onglets deviennent **une barre latérale** de 244 px, avec la marque en haut et
  le guide, les notifications et les réglages en bas. La barre de titre disparaît : l'écran
  récupère toute sa hauteur. Le contenu tient dans une colonne de 880 px au plus, calée sur un
  seul axe à gauche : titre, recherche, cartes et listes partent de la même ligne.

**Quatre onglets, et pas un de plus.** La règle disait trois ; **Codes** l'a fait changer, et
seulement parce qu'il fait un travail que les autres ne font pas : attraper un chiffre en deux
secondes. Le coffre sert à gérer un compte, Codes à lire un code. Même données, deux gestes.
Toute proposition d'un cinquième onglet devra démontrer la même chose.

Le journal n'en fait pas partie : c'est un registre qu'on consulte, pas un endroit où l'on
travaille. Il vit dans les réglages, et l'écran Agent y renvoie.
« Verrouiller maintenant » n'est pas non plus dans la navigation : c'est une action de
réglage, pas une action de tous les jours (le verrouillage automatique s'en charge).

**Rien ne sort de l'objet.** Les dialogues (fiche, éditeur, réglages, guide, notifications,
confirmations) et les messages éphémères se posent **dans** l'objet, jamais par-dessus la
fenêtre : ils atterrissent dans deux emplacements dédiés (`toast-slot`, `dialog-slot`), et le
voile assombri s'arrête au bord de la zone de contenu. Sans objet (les écrans d'entrée), un
dialogue retombe sur la fenêtre.

**L'ajout d'une entrée flotte** en bas à droite, au-dessus du contenu qui défile : c'est la
seule action qu'on lance depuis n'importe où dans le coffre. Rond avec un « + » sur un
téléphone, il devient un bouton « Ajouter » dès que l'objet a la place de le dire.

| Dans l'objet | Étroit | ≥ 620 px | ≥ 900 px |
|---|---|---|---|
| Titre d'écran | 22 px | 28 px | 28 px |
| Navigation | onglets en bas | onglets en bas | barre latérale |
| Zones du coffre | l'une sous l'autre | l'une sous l'autre, puis côte à côte dès 760 px | côte à côte |
| Bouton d'ajout | icône seule | bouton « Ajouter » | bouton « Ajouter » |
| Réglages | sections en onglets défilants | idem, puis colonne à gauche dès 760 px | colonne à gauche |

## La marque

Le logo est un **cadenas plein**, blanc (`--color-mark`, `#F2F4F8`), anse épaisse **détachée du
corps** (le trait pochoir), **serrure rouge Marianne**. Le logotype « SEREN**I**TY » est
composé en **Black Ops One**, le « I » **en rouge**. Posé sur le pavé **bleu de France** de
l'icône, le tout donne le drapeau en un seul objet, sans rayures : un fond bleu, un cadenas
blanc, une serrure rouge.

Black Ops One ne sert **qu'au logotype**. Les titres d'écran, qui la portaient aussi, sont
passés en Inter : un titre en pochoir sur chaque écran faisait jeu vidéo, pas coffre-fort.

Ce qui reste en fichier, c'est la forme du cadenas (`web/public/`) :

| Fichier | Usage |
|---|---|
| `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` | Icônes de l'appli installée, découpées du logo |
| `icon.svg`, `maskable.svg` | La même forme, redessinée en vectoriel : **la source des PNG** |

Le cadenas de l'appli (`design/Lock.tsx`) reprend **exactement** cette géométrie, mesurée sur
le dessin d'origine.

Les PNG d'icône ne se retouchent pas à la main : ils se **regénèrent** depuis les deux SVG par
`make brand` (Chromium dans Docker), qui produit aussi l'aperçu social
(`docs/img/social-preview.png`, dessiné par `scripts/banniere.html`). Changer la marque, c'est
changer le SVG puis relancer la commande.

La bannière en tête du README est à part : elle suit le gabarit commun aux autres projets,
avec le logo `docs/logo.png`, et se refait par `docs/tools/figures.sh`.

## Bleu, blanc, rouge

Serenity est un coffre français, et cela se voit, **sans déguisement**. Les trois couleurs ont
chacune un métier, et le drapeau entier n'apparaît qu'à trois endroits où il sert à quelque chose.

| Couleur | Jeton | Son métier |
|---|---|---|
| **Bleu de France** | `accent` | Tout ce qui agit : bouton principal, onglet actif, interrupteur, couleur de l'agent |
| **Blanc** | `mark` | La marque : le cadenas et le logotype. Sur papier, il passe à l'encre |
| **Rouge Marianne** | `crit` | Ce qui alerte : erreurs, suppressions, compteurs de fuites, et la serrure du logo |

Le drapeau **en entier** (`tricolore`, trois bandes à arêtes franches) sert trois fois :

1. **Le filet en tête de l'objet**, 3 px sur toute sa largeur, comme un papier à en-tête.
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

- **La carte** flotte (`bg-raised`, ombre longue), sans contour, sur une seule lueur bleue très
  douce derrière elle. Elle porte le titre, une phrase d'explication, les champs et l'action
  principale, avec les mêmes composants que l'intérieur de l'appli (`Field`, `Button`, `Note`).
- **Une procédure se compte** : `Étape 2 sur 3` et une barre en trois segments, en haut de la
  carte, en **bleu, blanc, rouge**, une bande par étape franchie. Le passage d'une étape à l'autre
  fait glisser le contenu de 16 px.
- **Les actions secondaires sont de vrais boutons** sous la carte (« Changer de compte »,
  « Utiliser mon kit de récupération », « Retour à la connexion »), jamais des liens en petit.
- **Le code à six chiffres** est en six cases. La case à remplir porte l'anneau bleu, **et
  seulement quand le champ a le focus** : un anneau sur un champ inactif ferait croire qu'il
  écoute. Le vrai champ est transparent par-dessus : collage, clavier numérique et remplissage
  automatique des codes marchent toujours.

## L'ouverture : la pluie chiffrée

Le coffre a répondu oui : **une cascade de données chiffrées tombe du haut de l'écran**
(`design/DataRain.tsx`).

- L'alphabet est celui des blocs du coffre : base64 et hexadécimal. **Les têtes de colonnes
  tombent en trois bandes** : bleu à gauche, blanc au centre, rouge à droite. Le drapeau
  descend avec les données. La traînée est **volontairement pâle** (34 % au plus), c'est une
  chute de données, pas un mur de blanc. Sur papier, la bande blanche passe à l'encre
  (`--color-mark`) : une tête blanche sur fond clair ne serait rien.
- **Le front de la pluie est la ligne de révélation** : au-dessus, l'écran de déverrouillage a
  déjà disparu ; en dessous, il tient encore. Le bord est fondu sur 70 px.
- **La pluie ne s'arrête jamais** : quand plus rien n'est ajouté en tête, les traînées finissent
  de tomber et sortent par le bas. Une pluie qui se fige puis s'efface ressemble à un bug.
- Le canevas est effacé **par composition** (`destination-out`), jamais repeint en noir : le
  coffre reste visible à travers.

**L'ordre compte** : le front couvre l'écran en 900 ms, les traînées finissent de sortir par le
bas vers 1,56 s, et **c'est seulement là** que le coffre est monté, derrière un rideau resté
opaque. Le rideau ne se lève qu'une fois le coffre réellement en place (`lift`), pendant que
l'objet se pose (`scale 0,985 → 1`, 450 ms).

`App` garde **trois emplacements fixes** (décor, écran, pluie) et n'en déplace aucun : sans
cela, React démonte la pluie avec l'écran de déverrouillage et la remonte au-dessus du coffre,
et l'animation se joue deux fois.

## Profondeur : des surfaces, pas des filets

L'ancienne interface délimitait tout par un filet blanc à 28 % : sur fond noir, chaque carte,
chaque champ, chaque zone avait son contour, et l'ensemble ressemblait à une maquette fil de
fer. La profondeur vient maintenant de **quatre niveaux de fond**, chacun un peu plus clair que
le précédent, et d'une ombre douce :

| Niveau | Jeton | Sombre | Clair | Ce qui s'y pose |
|---|---|---|---|---|
| 0 | `bg` | `#05070B` | `#E9ECF2` | La page, derrière l'objet |
| 1 | `surface` | `#0B0E14` | `#F6F7FA` | L'objet, et le fond des champs |
| 2 | `raised` | `#131722` | `#FFFFFF` | Les cartes, l'onglet actif de la barre latérale |
| 3 | `float` | `#191E2B` | `#FFFFFF` | Ce qui flotte : dialogues, messages éphémères |

Une carte (`shadow-card`) a une ombre d'un pixel et, en sombre, **un liseré de lumière sur son
bord haut** (`--color-sheen`), comme un objet éclairé d'en haut. Ce qui flotte a une ombre longue
(`shadow-float`). L'objet entier a la sienne (`shadow-frame`), avec un halo bleu très large.

Les filets restent là où un bord doit se lire :

- `line` (blanc 7 %) : les séparateurs de liste, qui commencent **après** l'icône, comme sur un
  téléphone, et la bordure de la barre latérale.
- `line-strong` (blanc 20 %, encre 34 % en clair) : **le bord des champs**, qui doit atteindre
  3:1 contre son fond. Au focus, il devient un anneau bleu de 2 px autour de toute la boîte,
  boutons compris (`INPUT_BOX`).

## Couleurs

Définies dans `web/src/design/theme.css` (`@theme` de Tailwind v4), redéfinies en clair sous
`[data-theme="light"]`. Rien dans les composants ne code une couleur en dur.

| Jeton | Sombre | Clair | Usage |
|---|---|---|---|
| `text` / `muted` | `#EEF1F6` / `#9AA3B3` | `#0E1525` / `#566074` | Texte principal / secondaire |
| `accent` / `accent-strong` | `#6B9CF7` / `#4F86F0` | `#0055A4` / `#004A90` | Ce qui agit ; la version forte au survol |
| `accent-soft` | accent à 12 % | accent à 9 % | Fond de l'onglet actif, des notes de l'agent |
| `ok` / `warn` / `crit` | `#6FD9A0` / `#F0CB57` / `#FF7B80` | `#136640` / `#6E5300` / `#B3141A` | États, chacun avec son fond doux à 11 % |
| `track` | blanc 22 % | encre 30 % | Le rail d'un interrupteur éteint, les étapes non franchies |
| `mark` | `#F2F4F8` | `#0E1525` | **Le cadenas passe à l'encre** en clair |
| `bleu` / `blanc` / `rouge` | `#3B7DD8` / `#F2F4F8` / `#E8434B` | `#0055A4` / `#C9D3E2` / `#E1000F` | Le drapeau, **et seulement là où il sert** |

Les couleurs d'état du thème clair ont été assombries pour tenir 4,5:1 même posées sur leur
propre fond doux, à l'intérieur d'un dialogue. Le bleu est **le même partout** : bouton
principal, onglet actif, choix sélectionné, robot de la zone agent.

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

**Inter** porte toute l'interface, en variable (un seul fichier, toutes les graisses), avec ses
variantes de lecture : chiffres ouverts, « l » à empattement (`cv05`, `cv11`, `ss03`). Un mot de
passe ou un identifiant se lit sans hésiter entre « l », « I » et « 1 ». **JetBrains Mono** sert
aux secrets, aux clés et aux codes. **Black Ops One** ne sert plus qu'au logotype. Les trois sont
servies localement (`web/public/fonts/`, licence OFL).

Les titres sont **calés à gauche, en casse normale**, en 650 avec un interlettrage resserré : le
ton d'un outil sérieux, pas d'une affiche. Les chiffres qui bougent (codes, compteurs, échéances)
sont tabulaires (`tabular`) : ils ne dansent pas quand ils changent.

| Jeton | Taille | Graisse | Usage |
|---|---|---|---|
| `text-display` | 28 px | 650 | Titre d'écran, dès 620 px d'objet |
| `text-title` | 22 px | 650 | Titre d'écran sur téléphone, nom d'une entrée ouverte |
| `text-heading` | 17 px | 600 | Titre de section, de carte d'état, de dialogue |
| `text-body` | 15 px | 400 à 600 | Le texte courant |
| `text-caption` | 13 px | 400 à 500 | Le texte secondaire |
| `text-micro` | 11 px | 600 | Onglets du bas, pastilles, compteurs |

## Formes

Rayons : cartes 18 px (`rounded-card`), dialogues et carte d'entrée 24 px (`rounded-sheet`),
boutons et champs 12 px (`rounded-control`), pastilles 10 px (`rounded-chip`), pills en arrondi
total. Grille de 4 px, cartes en 16 px de marge (20 px dès 620 px).

**Les choix exclusifs** (`Segmented`) sont un rail unique où un curseur surélevé glisse d'un choix
à l'autre, comme sur iOS. **Les interrupteurs** (`Toggle`) font 50 × 30 dans une zone tactile de
44 px, le bouton glisse par transformation.

## Les entrées : un monogramme, et la zone dans le titre

Chaque entrée a **son monogramme** (`features/vault/EntryMark.tsx`) : la première lettre de son
nom, sur une tuile discrète. Pas de favicon : aller le chercher dirait à un tiers quels comptes
sont dans le coffre.

La zone est le modèle du produit, donc elle garde sa marque (`features/vault/zone.ts`) :

| Zone | Marque | Pourquoi |
|---|---|---|
| **Protégé par toi** | bouclier **vert** | C'est la zone la plus sûre : seuls tes appareils déverrouillés la lisent |
| **Confié à l'agent** | robot **bleu** | Le bleu est la couleur de l'agent partout dans l'appli ; ici, il te dit que le serveur peut lire |

Dans le coffre, cette marque est **dans le titre de la zone, une fois**, et pas répétée sur chaque
ligne : l'ancien écran alignait le même bouclier vert sur toutes les entrées. Là où les deux
zones se mélangent (Codes, la fiche d'une entrée), le monogramme porte **un petit badge** de sa
zone dans le coin.

## La carte d'état

Coffre, Fuites et Agent s'ouvrent sur la même carte (`<StatusCard>`) : une icône dans un carré
teinté, un titre qui dit où on en est, une phrase, et au plus une action. Un lavis de la couleur
d'état part de l'icône et s'efface vers la droite : le ton se sent avant de se lire.

**Elle ne rassure jamais sans savoir.** Hors ligne, ou quand le serveur n'a pas répondu, elle ne
dit ni « Tout va bien » ni « L'agent est actif » : elle dit « Alertes indisponibles » ou « État
de l'agent inconnu », en gris.

## Icônes

Phosphor Icons (`@phosphor-icons/react`, noms en `…Icon`) : **regular** dans la navigation et les
listes, **fill** pour l'onglet actif, **duotone** dans les pastilles d'état, **bold** dans les
boutons. 22 px en navigation, 20 px en liste, 19 px dans un bouton. **Aucun emoji.**

## Mouvement

Motion (`motion/react`). **Tout vient de `web/src/design/motion.ts`** : aucun écran n'invente sa
propre durée. Transformations et opacité uniquement, jamais `width`, `top` ni `left`.
**Rien ne tourne en 3D et rien ne boucle** : un coffre qui gigote n'a pas l'air calme.

| Jeton | Ce que c'est | Où |
|---|---|---|
| `EASE_OUT` | `cubic-bezier(.22,1,.36,1)` | Tout ce qui apparaît |
| `EASE_IN_OUT` | `cubic-bezier(.65,0,.35,1)` | Un mouvement qu'on suit du début à la fin |
| `SPRING` | 520 / 38 | Ce que le doigt a poussé : onglets, interrupteurs, choix |
| `SOFT_SPRING` | 300 / 32 | Les grandes surfaces |
| `PART_SPRING` | 240 / 15 | L'anse du cadenas de la marque, quand elle s'ouvre |
| `MODAL_SPRING` | 460 / 36 | Les dialogues |

Les variantes nommées : `FRAME` (l'objet se pose), `SCREEN` (changement d'onglet : fondu et
8 px de montée), `DIALOG` (un dialogue monte de 10 px et se pose), `LIST` + `LIST_ITEM` (30 ms
entre deux lignes, 6 px de montée). Un seul geste partagé : `PRESS` (0,98) quand on appuie.

`prefers-reduced-motion` est respecté partout (`MotionConfig reducedMotion="user"`, règle CSS,
et les composants animés retombent sur un simple fondu).

## Ton

Phrases courtes, tutoiement, rassurant : « Tout va bien », « 2 comptes à surveiller »,
« Rotation dans 12 jours ». **Un seul message éphémère à la fois** : au-dessus du bouton d'ajout
sur un téléphone, en bas au centre sur un grand écran. Il ne masque jamais un titre ni le bouton
d'ajout, porte une icône de son état et se ferme d'un clic.

## Écrans vides

Un fond doux, une icône dans un cercle, **un titre**, une phrase qui dit quoi faire, et le
bouton qui le fait (`<EmptyState>`). Compact : une zone vide ne pousse jamais le reste de
l'écran hors de vue.

## Accessibilité

- Contraste AA partout, vérifié à partir des jetons, états doux et dialogues compris.
- Zones tactiles de 44 px au moins : boutons, onglets, choix exclusifs, interrupteurs, curseurs.
- Focus toujours visible : anneau bleu de 2 px, autour de la boîte entière pour un champ.
- `aria-label` sur chaque bouton-icône ; la cloche dit combien de notifications attendent.
- Dialogues en `role="dialog"`, titre et sous-titre reliés (`aria-labelledby`,
  `aria-describedby`), focus piégé, fermés par Échap. **Les dialogues s'empilent** : Échap ne
  ferme que celui du dessus, jamais les réglages sous une confirmation.
- `aria-live` sur les messages éphémères, et plus sur les codes à deux facteurs : un lecteur
  d'écran relisait tous les codes toutes les 30 s.
