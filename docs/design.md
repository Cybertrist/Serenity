# Charte graphique

Le code est dans `web/src/design/`. Les écrans sont décrits dans
[`07-interface.md`](07-interface.md). Le choix de cette direction, Aurora, est expliqué dans
[ADR-020](decisions/ADR-020-refonte-aurora.md).

## Intention

Un coffre de nuit, calme, avec une lumière derrière. On doit sentir que tout va bien avant
d'avoir lu un mot, et comprendre tout de suite quand ce n'est plus le cas.

Quatre règles priment sur le reste :

1. **Rien de décoratif.** Chaque carte, chaque icône, chaque animation sert à lire, à comprendre
   ou à agir. Même la lumière de fond porte une information : l'état du coffre.
2. **Le coffre commence par une phrase.** « Tout va bien. », ou « Une chose demande ton
   attention. », puis la suite à donner. Le chiffre vient après la phrase, jamais à sa place.
3. **Il ne rassure jamais sans savoir.** Hors ligne, ou tant que le serveur n'a pas répondu, ni
   « Tout va bien », ni « L'agent veille » : l'anneau reste éteint et la phrase dit qu'on attend.
4. **Tout se fait au clavier.** Chaque action a son raccourci, et le raccourci est écrit à côté
   de l'action, en touches.

## Trois formes, un seul code

L'appli occupe toute la fenêtre. Il n'y a plus d'objet posé au centre d'un fond : sur un écran
de 1440 px, c'est 1440 px de coffre. La forme se choisit sur la largeur réelle de l'appli
(`Shell.tsx`, seuil `WIDE_FROM` à 900 px), et les composants affinent avec les container queries
de Tailwind v4 (`@[620px]:…`).

```
Mobile (moins de 900 px)            Web (navigateur, dès 900 px)
┌──────────────────────────┐        ┌───────────┬────────────────────────────────────┐
│ Coffre   (+) loupe cloche│        │ Serenity  │ [ Rechercher...          Ctrl K ]  │
│ [ Chercher...         / ]│        │           │ Coffre           Importer  Nouvelle│
│ (100) Tout va bien.      │        │ > Coffre  │ Tout va bien. Veille à jour.       │
│       Rien à signaler.   │        │   Codes   │ ┌────────────┐ ┌─────────────────┐ │
│ Tout | Toi | Agent       │        │   Fuites  │ │ liste      │ │ fiche ouverte   │ │
│ Protégé par toi          │        │   Agent   │ │            │ │                 │ │
│  B  Banque             > │        │ Zones     │ │ ↑↓ Entrée  │ │                 │ │
│ Confié à l'agent         │        │ (67) Santé│ └────────────┘ └─────────────────┘ │
├──────────────────────────┤        │ ● Agent   ├────────────────────────────────────┤
│ Coffre Codes Fuites Agent│        │ Réglages  │ Agent actif · Santé 67 · 14:56     │
│ Réglages                 │        └───────────┴────────────────────────────────────┘
└──────────────────────────┘
```

- **Mobile** : le titre de l'écran avec ses actions à droite, le contenu, et **cinq onglets en
  bas** sous le pouce : Coffre, Codes, Fuites, Agent, Réglages. L'action décisive d'un écran
  (« Copier le mot de passe » dans une fiche) est collée en bas, là où le pouce l'attend. Une
  fiche s'ouvre en plein écran et glisse.
- **Web** : une barre latérale de 248 px (les quatre écrans, les deux zones, puis en bas
  l'anneau de santé, l'orbe de l'agent, les réglages et qui est connecté), une barre du haut
  avec la recherche qui ouvre la palette, le contenu, et la **barre d'état** en pied de page. Le
  coffre y montre la liste et la fiche côte à côte.
- **Bureau** (Windows et Linux, [`11-bureau.md`](11-bureau.md)) : la même appli, qui sait
  qu'elle tourne dans sa propre fenêtre grâce à `window.serenityDesktop`. Elle dessine alors sa
  barre de titre (logo, recherche au centre, cloche, thème, puis réduire, agrandir et fermer), et
  la barre du haut disparaît.

```
Bureau
┌─ S Serenity ───── [ Rechercher une entrée ou une action  Ctrl K ] ─ cloche ☼  ─  □  × ┐
│ barre latérale │ contenu                                                              │
│                ├──────────────────────────────────────────────────────────────────────┤
│                │ barre d'état                                                         │
└────────────────┴──────────────────────────────────────────────────────────────────────┘
```

La barre de titre sert à déplacer la fenêtre (`app-drag`, `-webkit-app-region: drag`) ; ce qui
se clique dedans est marqué `app-no-drag`. Le bouton fermer vire au rouge Windows (`#E81123`,
jeton `close`) au survol : c'est le seul rouge de la charpente.

**Les réglages sont un écran**, plus un dialogue. Sur un téléphone, c'est le cinquième onglet :
une liste de sections, puis la section en plein écran. Dès 900 px, les sections forment une
colonne à gauche et la section choisie s'affiche à droite. Le journal y vit : c'est un registre
qu'on consulte, pas un endroit où l'on travaille, et l'écran Agent y renvoie.

**Les dialogues et les messages éphémères** atterrissent dans deux emplacements (`toast-slot`,
`dialog-slot`) posés sur le contenu, sous la barre de titre de l'appli de bureau : la fenêtre
reste déplaçable et fermable même avec une fiche ouverte.

## La marque

Le logo est **le S ruban** (`docs/logo.png`) : un ruban de lumière bleue, avec un reflet rouge,
posé sur une tuile bleu nuit. Il remplace le cadenas pochoir partout, de l'écran d'entrée à
l'icône de l'appli installée. Dans l'interface, `<Logo>` (`design/Wordmark.tsx`) sert
`/logo.png`, arrondi à 24 %.

Le logotype est écrit, pas dessiné : « Serenity » en **Syne 800**, « Seren » dans la couleur du
texte et « ity » en bleu (`--color-brand`, `#3B82F6`, `#2563EB` sur fond clair). Il reste net à
toutes les tailles et suit le thème tout seul (`<Wordmark>`).

Les icônes ne se retouchent pas à la main. `make brand` (Chromium dans Docker, `scripts/brand.mjs`)
découpe le logo en icônes PWA (`icon-192`, `icon-512`, `maskable-512` sur le bleu nuit
`#00071A`, `apple-touch-icon`, `favicon`), en `web/public/logo.png`, et en icônes de l'appli de
bureau (`desktop/build/icon.png`, `desktop/src/logo.png`). Changer la marque, c'est changer
`docs/logo.png` et relancer la commande.

## Couleurs et jetons

Tout est dans `web/src/design/theme.css`, dans le bloc `@theme` de Tailwind v4, et redéfini en
clair sous `[data-theme="light"]`. Aucun composant ne code une couleur en dur.

Le fond est un **bleu nuit** (`bg` `#070A12`), jamais un noir pur. Par-dessus, les niveaux :

```
bg       #070A12   la page
surface  #0A0E18   la barre latérale, la barre d'état
panel    #0E1322   le fond plein de ce qui flotte
raised   verre à 72 %    une carte posée
float    verre à 90 %    un dialogue, la palette
glass, glass-2, glass-hi   le verre des cartes, des champs, de ce qui est choisi
```

Les couleurs ont chacune un métier :

- **Bleu** (`accent` `#3B82F6`, texte `#82B1FF`) : tout ce qui agit. Bouton principal, onglet
  actif, focus, lien. En clair, `#2563EB`.
- **Violet** (`violet` `#8B7CF8`) : l'agent. Son orbe, ses badges, la zone qui lui est confiée,
  les rotations qui attendent ton accord.
- **Vert** (`ok` `#3DD68C`) : ce qui va bien. Un anneau de santé plein, un mot de passe robuste.
- **Ambre** (`warn` `#F2A93B`) : ce qui demande ton attention. Une fuite, un mot de passe faible,
  un code qui expire.
- **Rouge doux** (`crit` `#F07A7A`) : ce qui est grave ou irréversible. Supprimer, une erreur.

Chaque état a son fond doux (`*-soft`, 12 à 15 %) et, quand la couleur pleine ne tient pas le
contraste sur ce fond, sa version texte (`accent-text`, `violet-text`, `warn-text`). Le texte a
trois niveaux : `text`, `muted`, `faint`. Les filets aussi : `line-soft` (6 %), `line` (10 %)
pour les séparateurs, `line-strong` (22 %) pour le bord d'un champ.

En clair, les mêmes jetons passent sur un papier bleuté (`#F2F4F9`), l'encre devient `#0B1222`
et les couleurs d'état sont assombries pour tenir 4,5:1 sur leur fond doux.

## La lumière d'état (`data-mood`)

Derrière le contenu, une lumière floue dérive lentement (`<Aurora>`, trois halos et un ruban en
SVG). **Sa couleur dit où en est le coffre.** Elle se pilote par un seul attribut sur `<html>`,
`data-mood`, que pose `design/mood.ts` :

```
calm    bleu         rien à faire (par défaut)
leak    ambre        une fuite ou un point à voir
agent   violet-bleu  l'agent travaille, ou attend ton accord
off     gris         l'agent est arrêté (kill switch)
```

La coquille choisit l'humeur de base à partir des vraies données (`useBaseMood`) : gris si
l'agent est arrêté, violet s'il agit, ambre s'il y a une fuite, violet s'il attend, bleu sinon.
Un écran qui sait mieux la demande tant qu'il est monté (`useMood`) : Agent est violet, Fuites
est ambre tant qu'une alerte est ouverte. Les trois couleurs (`--g1`, `--g2`, `--g3`) et le
halo sont des propriétés enregistrées (`@property`) : un changement d'humeur se fond en 1,2 s au
lieu de sauter. Au verrouillage, tout revient au bleu (`resetMood`).

La même couleur sert au **halo** : la carte qui porte l'état d'un écran (la santé dans Fuites,
le kill switch dans Agent) a un liseré dégradé sur son coin haut gauche et une lueur dessous
(utilitaire `halo`), et l'onglet actif de la barre latérale porte un trait de cette couleur.

Aucun écran ne peint son propre fond : il demande une humeur.

## Le verre

Trois utilitaires dans `theme.css` :

- `glass` : une carte, la liste, la fiche. Verre à 56 %, flou de 22 px, un filet `line` et une
  ombre longue avec un liseré de lumière sur le bord haut.
- `glass-float` : ce qui flotte au-dessus de l'appli (dialogues, palette, messages). Flou de
  30 px et une ombre plus lourde.
- `glass-bar` : les barres de la charpente (barre de titre, onglets), où la lumière passe
  floutée.

Rayons : cartes 16 px, dialogues 20 px, boutons et champs 10 px, pastilles 9 px.

## Typographie

- **Geist** porte toute l'interface, en variable, avec `ss01` et `cv11` pour que « l », « I » et
  « 1 » ne se confondent pas.
- **Geist Mono** sert aux secrets, aux codes à deux facteurs, au kit de récupération et aux
  touches affichées.
- **Syne** ne sert qu'à la marque et aux grands titres d'écran (« Coffre », « Fuites »).

Les trois sont servies depuis `web/public/fonts/` (woff2, licence OFL à côté), jamais depuis un
service de polices : la CSP l'interdit (`font-src 'self'`) et l'appli doit marcher hors ligne.

Les tailles : titre d'écran 30 px sur grand écran (`text-display`), 24 px sur téléphone
(`text-title`), titre de section 15 px, texte 14 px, texte secondaire 12,5 px, étiquettes 11 px
(`eyebrow` pour les capitales espacées au-dessus d'un groupe). Les chiffres qui bougent sont
tabulaires (`tabular`) : un code ou un compte à rebours ne danse pas.

## Mouvement

Motion (`motion/react`). Toutes les durées et courbes viennent de `web/src/design/motion.ts` :
`EASE_OUT` pour ce qui apparaît, `SPRING` pour ce que le doigt a poussé, `SOFT_SPRING` pour les
grandes surfaces, `MODAL_SPRING` pour les dialogues. Un changement d'écran est un fondu avec
8 px de montée (`SCREEN`), une liste arrive ligne par ligne à 30 ms d'écart (`LIST`).

Transformations et opacité seulement, rien en 3D. Trois choses bougent en continu, lentement,
et seulement parce qu'elles disent quelque chose : la lumière de fond (26 s par cycle), l'orbe
de l'agent tant qu'il veille, et le halo du logo sur l'écran d'entrée.

`prefers-reduced-motion` coupe tout : règle CSS globale, `MotionConfig reducedMotion="user"`, et
l'ouverture se réduit à un fondu.

## L'ouverture

Les écrans d'entrée (création du compte, connexion, déverrouillage, récupération) partagent un
cadre (`AuthShell.tsx`) : le **ruban du logo tracé à travers la nuit** (`<Ribbons>`), le logo
avec son halo qui respire, le logotype, **une carte de verre**, les actions secondaires dessous,
et une ligne en pied : « Déchiffré sur cet appareil. Le serveur ne voit que des blocs chiffrés. »
Une procédure en plusieurs étapes se compte par une barre segmentée en haut de la carte.

Quand le mot de passe maître est bon (`<Opening>`) :

```
cover   le voile bleu nuit monte, le ruban gonfle et s'élève,
        un faisceau de lumière balaie l'écran de gauche à droite (1,25 s)
hold    l'écran de verrouillage a disparu ; le coffre se monte derrière le voile
lift    le ruban s'envole et s'efface, le voile s'ouvre,
        la lumière de fond s'embrase puis se calme, le coffre monte en place
```

Le voile ne se lève qu'une fois le coffre vraiment monté, et jamais avant que le faisceau ait
traversé (1,35 s au moins). Si le coffre ne vient pas, il se lève quand même au bout de 6 s.

## Composants clés

- **L'anneau de santé** (`HealthRing`) : un anneau gradué, allumé jusqu'au score. Vert dès 85,
  ambre dès 60, rouge en dessous, éteint tant que la veille n'a pas répondu. Le score vient des
  vraies alertes (`app/health.ts`) : chaque entrée pèse selon sa pire alerte (fuite 1,
  réutilisé 0,6, faible 0,5, ancien 0,3), moins 5 points par adresse e-mail touchée. On le voit
  en tête du coffre sur téléphone, en bas de la barre latérale, et en grand dans Fuites.
- **Le kill switch à maintenir** (`HoldSwitch`) : on ne confirme plus dans un dialogue, on
  **maintient 1 s** (souris, doigt, Espace ou Entrée). Le remplissage avance tant qu'on tient ;
  relâché avant la fin, il revient. Le geste est la confirmation. Même geste pour relancer.
- **La barre d'état** (`StatusBar`), en pied des grandes fenêtres : l'agent (actif, en action,
  arrêté), la dernière veille, la santé, les rotations en attente, et le verrouillage
  automatique en `mm:ss`. Chaque chiffre est réel ; ce qui n'est pas connu n'est pas affiché.
- **La frise d'activité** (`ActivityStrip`, écran Agent) : les 24 dernières heures sur une
  ligne, un point par rotation, fuite, proposition ou passage de veille, tirés du journal.
- **L'orbe** (`Orb`) : l'agent. Violet qui pulse quand il veille, gris et immobile quand il est
  arrêté.
- **Le monogramme** (`Monogram`) : la première lettre de l'entrée sur une tuile dont la teinte
  vient de son nom. Pas de favicon : aller le chercher dirait à un tiers quels comptes sont dans
  le coffre.
- **Les zones** : « Protégé par toi » avec un bouclier bleu, « Confié à l'agent » avec
  l'étincelle violette de l'agent. La marque est dans le titre de la zone, une fois, et dans une
  pastille là où les deux zones se mélangent (Codes, la fiche).
- **Les touches** (`Kbd`) : un raccourci s'écrit comme sur le clavier, « Ctrl K », « Maj »,
  « Entrée », en Geist Mono, à côté du bouton qui fait la même chose.

## Clavier

Un seul registre pour toute l'appli (`web/src/app/shortcuts.ts`) :

```
Ctrl K          la palette : chaque entrée, chaque écran, chaque action
/               chercher (le champ du coffre, sinon la palette)
G puis V        aller au coffre       (C : codes, F : fuites, A : agent)
Ctrl N          nouvelle entrée
Ctrl L          verrouiller
Ctrl ,          réglages
↑ ↓ Entrée      parcourir la liste du coffre et ouvrir une fiche
Ctrl C          copier le mot de passe de l'entrée choisie
Échap           fermer ce qui est ouvert, un dialogue à la fois
```

Sur un Mac, Ctrl devient ⌘. Une touche seule ne répond pas pendant qu'on tape dans un champ ;
une combinaison avec Ctrl, si. Pendant qu'un dialogue est ouvert, seuls les raccourcis prévus
pour (Ctrl K, Ctrl L) répondent. Dans la palette, Ctrl Entrée copie le mot de passe de l'entrée
choisie. L'appli de bureau ajoute **Ctrl Maj Espace**, global, qui montre ou cache la fenêtre.

## Thème

Trois choix dans **Réglages, Apparence** : *Sombre*, *Clair*, *Comme le système* (par défaut, et
il suit le changement du soir en direct). La barre de titre et la barre du haut ont aussi un
bouton soleil ou lune. La préférence reste dans `localStorage` (`serenity.theme`), sur cet
appareil : c'est un goût, pas un secret. `theme.ts` pose `data-theme` avant le premier rendu, et
une requête média habille la toute première peinture.

Le clair est aussi soigné que le sombre : même verre, lumière plus pâle (30 % au lieu de 50 %),
monogrammes en pastel, faisceau d'ouverture blanc.

## Ton

Tutoiement, phrases courtes, et d'abord ce qui compte : « Tout va bien. », « Une chose demande
ton attention. », « Netflix est apparu dans une fuite : l'agent attend ton accord pour le
changer. » Un seul message éphémère à la fois, avec l'icône de son état. Aucun emoji.

## Accessibilité

- Contraste AA à partir des jetons, fonds d'état et verre compris, dans les deux thèmes.
- Focus toujours visible : contour de 2 px en `accent-text`.
- Zones tactiles de 44 px au moins sur téléphone.
- `aria-label` sur chaque bouton-icône ; la cloche dit combien de notifications attendent ; le
  logotype se lit « Serenity ».
- Dialogues en `role="dialog"`, focus piégé, Échap ne ferme que celui du dessus.
- Le kill switch à maintenir marche au clavier (Espace ou Entrée tenus) et dit comment s'en
  servir sous le bouton.
- `prefers-reduced-motion` respecté partout.
