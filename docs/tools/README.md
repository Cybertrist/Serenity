# Les outils qui dessinent ce README

Aucune image de ce dépôt n'est un export d'un logiciel de dessin. Chacune
est une page HTML que Chrome capture en mode headless, à deux ou trois fois
la taille d'affichage pour rester nette sur un écran dense. Un texte de
figure se corrige donc en modifiant une ligne de script.

## Refaire toutes les images

    bash docs/tools/tout.sh

Cela rend les deux langues. Les scripts écrivent dans `docs/tools/sec/`,
`grid/`, `flow/`, `sere/` et `langues/`, suffixés `-en` pour l'anglais, qui
ne sont pas versionnés. `installer.sh` recopie ensuite les fichiers retenus
dans `docs/img/` et `docs/img/en/`.

## Les deux langues

`README.md` porte le français, `README.en.md` l'anglais, et chaque page
ouvre sur deux pastilles qui mènent à l'autre. GitHub retirant JavaScript
et CSS des README, rien ne peut basculer la page sur place : ce sont deux
fichiers et un lien.

`langue.sh` porte la bascule. Dans `figures.sh`, `t <français> <anglais>`
choisit la chaîne : les deux versions d'un texte vivent sur la même ligne,
ce qui rend impossible d'en corriger une en oubliant l'autre.

## Ce que fait chaque script

- `figures.sh` : tout le contenu de ce README, les six bandeaux de section,
  les deux grilles, le parcours de l'agent et le schéma des deux zones du
  coffre. C'est le seul fichier à ouvrir pour changer un texte.
- `bandeaux.sh` : le gabarit des bandeaux de section numérotés.
- `grille.sh` : le gabarit des grilles à deux ou trois colonnes.
- `sequence.sh` : le gabarit des parcours en étapes numérotées.
- `pastilles.sh` : les deux pastilles du sélecteur de langue.
- `langue.sh` : la bascule `LANGUE` et la fonction `t`.
- `installer.sh` : repose les images rendues dans `docs/` ou `docs/en/`.
- `tout.sh` : enchaîne tout ce qui précède, dans les deux langues.

## Ce dont ils dépendent

Chrome est cherché dans `C:\Program Files\Google\Chrome\Application`. La
variable d'environnement `CHROME` prend le dessus s'il est ailleurs.

Les polices, Syne, Space Grotesk et JetBrains Mono, sont chargées depuis
Google Fonts au moment du rendu : il faut une connexion.

La bannière et les captures de `docs/img/` ne passent pas par ces scripts :
la première est un visuel du projet, les secondes sont de vraies captures
de l'application, en français. La page anglaise les garde telles quelles,
avec ses propres légendes.

Les commentaires de ces scripts sont en anglais, comme le reste du code du
dépôt. Cette page reste en français, comme le reste de la documentation.
