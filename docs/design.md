# Charte graphique

Référence : le [prototype](https://claude.ai/artifact/U4jRKzEuP16QDASXi4aZFz) et les écrans de
[`07-interface.md`](07-interface.md). Le code est dans `web/src/design/`.

## Intention

Calme, doux, moderne. On doit sentir que tout est sous contrôle sans être noyé d'informations.
**Une information principale par carte. Beaucoup d'air.**

## Mise en page

Mobile d'abord (380 à 390 px) ; sur ordinateur, une colonne centrale de 480 px au plus.
Pas de tableau de bord chargé.

## Couleurs (thème sombre)

Définies dans `web/src/design/theme.css` (`@theme` de Tailwind v4) :

| Jeton | Valeur | Usage |
|---|---|---|
| `bg` | `#141517` | Fond de page |
| `surface` | `#1C1D21` | Cartes |
| `raised` | `#232429` | Panneaux glissants |
| `line` | `rgba(255,255,255,0.06)` | Bordures fines |
| `text` / `muted` | `#ECEDEF` / `#9A9CA3` | Texte principal / secondaire |
| `accent` / `accent-soft` | `#F2762E` / 12 % | **Avec parcimonie** : bouton principal, onglet actif, kill switch |
| `ok` / `warn` / `crit` | `#6BD49A` / `#F5C26B` / `#F27A7A` | États, chacun avec son fond doux à 12 % |

Un thème clair est prêt (`[data-theme="light"]`) mais pas activé en V1.

## Typographie

Geist (interface) et JetBrains Mono (codes, clés, heures du journal), servies localement
(`web/public/fonts/`, licence OFL). **Trois tailles seulement** : `text-title` 20 px semi-gras,
`text-body` 15 px, `text-caption` 13 px.

## Formes

Rayons : cartes 20 px (`rounded-card`), boutons et champs 14 px (`rounded-control`), pastilles
12 px (`rounded-chip`), pills en arrondi total, panneaux 28 px. Pas d'ombre lourde : la
séparation vient de la surface et d'une bordure fine. Grille de 4 px, cartes en 16 px de marge.

## Icônes

Phosphor Icons (`@phosphor-icons/react`, noms en `…Icon`) : **duotone** pour la navigation,
les états et les écrans vides ; **regular** dans les listes et les boutons. 24 px en navigation,
20 px en liste, 48 px pour les écrans vides. Une icône de liste est posée dans une **pastille**
de 36 px (`<Chip>`), teintée du fond doux de son état. **Aucun emoji.**

## Mouvement

Motion (`motion/react`) : transitions de 150 à 250 ms, ressort léger pour les interrupteurs et
les panneaux, listes en fondu décalé très court, squelettes plutôt que roues de chargement.
`prefers-reduced-motion` est respecté (`MotionConfig reducedMotion="user"` et règle CSS).

## Ton

Phrases courtes, tutoiement, rassurant : « Tout va bien. », « 2 comptes à surveiller »,
« Rotation dans 12 jours ». Un seul message éphémère à la fois, en haut de l'écran.

## Écrans vides

Une grande icône duotone, une phrase, éventuellement un bouton (`<EmptyState>`). Rien d'autre.

## Accessibilité

Contraste AA, zones tactiles de 44 px au moins, navigation au clavier (focus visible orange),
`aria-label` sur chaque bouton-icône, panneaux en `role="dialog"` fermés par Échap.
