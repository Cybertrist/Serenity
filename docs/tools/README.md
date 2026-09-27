# Les outils qui dessinent ce README

Aucune image de ce dépôt ne sort d'un logiciel de dessin. Les figures fixes
(bandeaux, tuiles du sommaire, boutons, pastilles) sont des pages HTML que
Chrome capture sans affichage, deux fois plus denses que leur taille à
l'écran. Les schémas animés sont des SVG écrits par un script. Changer un
texte, c'est changer une ligne.

## Refaire toutes les images

    bash docs/tools/tout.sh

Cela rend les deux langues, puis lance le vérificateur. Les sorties
intermédiaires (`html/`, `png/`, `sec/`, `langues/`, suffixées `-en` pour
l'anglais) ne sont pas versionnées ; `installer.sh` recopie les images
retenues dans `docs/img/` et `docs/img/en/`.

Pour un seul schéma :

    node docs/tools/anime.js zones
    LANGUE=en node docs/tools/anime.js zones

## Les deux langues

`README.md` porte le français, `README.en.md` l'anglais, et chaque page
ouvre sur deux pastilles qui mènent à l'autre. GitHub retirant JavaScript
et CSS des README, rien ne peut basculer la page sur place : ce sont deux
fichiers et un lien.

Les deux versions d'un texte vivent sur la même ligne : `t <français>
<anglais>` dans les scripts shell (`langue.sh`), `t('français', 'english')`
dans les schémas. Impossible d'en corriger une en oubliant l'autre.

## Les schémas animés

Chacun rejoue l'appli dans un appareil, à gauche, pendant que l'explication
se construit à droite. Les écrans sont dessinés en unités de l'appli, 390 x
844 pour un téléphone et 1280 x 800 pour la fenêtre de bureau, d'après les
vraies captures de l'interface Aurora : ce sont les mêmes écrans, pas une
imitation.

- `anime.js` : rend tous les schémas de `schemas/`, ou ceux qu'on lui
  nomme. Un fichier par schéma, qui reçoit les outils communs et écrit son
  SVG dans `docs/img/schemas/` (`docs/img/en/schemas/` pour l'anglais).
- `schemas/outils.js` : ce que partagent les schémas. Le cadre, les
  textes, le temps (un élément n'existe qu'entre deux instants du cycle, et
  deux écrans qui se passent le relais ne sont jamais visibles ensemble),
  le téléphone, la fenêtre, la lumière d'Aurora selon l'humeur, et les
  composants de l'appli : verre, monogramme, anneau de santé, orbe, puces,
  touches, boutons, champs, onglets, barre latérale, barre d'état, barre de
  titre.
- `schemas/_ecrans.js` : des écrans entiers réutilisés par plusieurs
  schémas (le coffre, la fiche, un dialogue). Un fichier qui commence par
  un tiret bas n'est pas un schéma.
- `schemas/icones.json` : les icônes Phosphor de l'appli (MIT), tirées de
  `web/node_modules` par `icones.js`. À relancer seulement si la liste
  change.
- `schemas/images.json` : le logo et les captures que les planches
  embarquent, réduits par `images.js` dans un canvas de Chrome.
- Les polices, Geist, Geist Mono et Syne, sont celles de l'appli
  (`web/public/fonts`, licence OFL), embarquées en `data:` : un SVG affiché
  en `<img>` n'a le droit de rien aller chercher. Syne ne dessine que le
  logotype et l'initiale des monogrammes, jamais un chiffre ni une
  minuscule.
- Les animations sont en SMIL, que GitHub joue dans une balise `<img>`.
  Les planches de captures, elles, sont fixes.

## Vérifier avant de livrer

- `instants.js` fige un schéma à des instants choisis et en fait des PNG
  de 1000 px dans `instants/` (ignoré par git) :
  `node docs/tools/instants.js zones 0.2 0.45 0.5 --en`, ou `--pas 8` pour
  huit instants réguliers. À regarder autour de chaque transition, dans
  les deux langues : chevauchements, textes qui débordent, fondus qui se
  superposent.
- `verifier.js` passe chaque SVG au DOMParser strict de Chrome, et signale
  les identifiants en double, les références sans cible, les tirets longs
  et les textes alternatifs trop courts. Un SVG que Chrome affiche malgré
  une faute peut sortir sur GitHub en « Invalid image source ».

## Les figures fixes

- `figures.sh` : les quinze bandeaux de section, et la bannière (rendue,
  mais posée seulement avec `BANNIERE=1` : celle de `docs/img/` reste telle
  quelle).
- `sommaire.sh` : le bandeau « 00 Sommaire » et les quinze tuiles
  cliquables, dans `docs/img/sommaire/`.
- `telecharger.sh` : les deux boutons de la section « Installer », Windows
  et Linux, avec la version lue dans `desktop/package.json`. Ils mènent à
  la dernière Release, dont l'adresse ne change pas.
- `pastilles.sh` : les deux pastilles du sélecteur de langue.
- `cartes.sh`, `bandeaux.sh` : les gabarits de la bannière et des bandeaux.
- `langue.sh` : la bascule `LANGUE` et la fonction `t`.
- `installer.sh` : repose les images rendues dans `docs/img/`.
- `tout.sh` : enchaîne tout ce qui précède, dans les deux langues.

`grille.sh` et `sequence.sh` servaient à l'ancien README et ne sont plus
appelés par rien.

## Ce dont ils dépendent

Chrome, cherché dans `C:\Program Files\Google\Chrome\Application` ; la
variable `CHROME` prend le dessus. Les figures fixes chargent Syne, Space
Grotesk, JetBrains Mono et Material Symbols depuis Google Fonts au moment du
rendu : il faut une connexion. Les schémas animés n'en ont pas besoin.

Les commentaires de ces scripts sont en anglais, comme le reste du code du
dépôt. Cette page reste en français, comme le reste de la documentation.
