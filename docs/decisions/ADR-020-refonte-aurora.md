# ADR-020 : Refonte Aurora, une lumière d'état et le S ruban

- **Date** : 2026-09-27
- **Statut** : accepté, remplace ADR-017 et ADR-019

## Contexte

L'interface d'ADR-019 était propre, mais elle restait un objet posé au milieu d'un fond noir,
et son identité (bleu de France, rouge Marianne, cadenas pochoir, Black Ops One, pluie de
données tricolore) disait « français » avant de dire « coffre ». Elle ne disait rien de l'état
du coffre au premier regard, rien ne se faisait au clavier, et il fallait maintenant une appli
de bureau qui ne soit pas une page dans un cadre.

Quatre directions ont été maquettées en entier (aurora, monolith, instrument, serein), sur les
vrais écrans, dans les deux thèmes.

## Décision

1. **Aurora comme base** : fond bleu nuit, verre flouté, et une lumière derrière l'appli dont
   la couleur dit l'état du coffre (`data-mood` : bleu, ambre, violet, gris), calculée à partir
   des vraies données.
2. **Des greffes des trois autres.** D'instrument : l'anneau de santé gradué, le kill switch à
   maintenir 1 s, la barre d'état en pied de fenêtre et la frise d'activité sur 24 heures. De
   monolith : le clavier (Ctrl K, G puis une lettre, raccourcis écrits en touches, liste et fiche
   côte à côte). De serein : le ton, le coffre qui s'ouvre sur « Tout va bien. ».
3. **L'identité française part en entier** : couleurs du drapeau, filet tricolore, cadenas,
   Black Ops One, pluie de données. Le logo S ruban (`docs/logo.png`) devient la marque de
   l'appli, avec le logotype « Seren**ity** » en Syne. Geist et Geist Mono remplacent Inter et
   JetBrains Mono. Les trois polices restent servies en local.
4. **Plein écran partout.** Plus d'objet posé : l'appli occupe la fenêtre, et prend trois formes
   (téléphone, navigateur, bureau) avec le même code.
5. **Les réglages deviennent un écran**, cinquième onglet sur téléphone. La règle des quatre
   onglets tenait parce que les réglages étaient un dialogue ; ils sont maintenant un endroit où
   l'on travaille (import, corbeille, journal, appareils).

Ce qui ne change pas : la logique métier, la crypto, les clés en mémoire, la CSP stricte, et la
stack (aucune dépendance npm ajoutée pour l'interface).

## Conséquences

- ADR-017 et ADR-019 sont remplacés. La partie « l'appli est un objet posé » d'ADR-012 aussi ;
  ses dialogues centrés et ses confirmations restent, sauf pour le kill switch.
- Une confirmation de moins : le kill switch se maintient au lieu de se confirmer. Il reste
  utilisable au clavier (Espace ou Entrée tenus).
- La lumière d'état ajoute une animation continue, lente. Elle s'arrête avec
  `prefers-reduced-motion`.
- Les icônes de l'appli se refont depuis le logo par `make brand`. Les captures de `docs/img/`
  ont été refaites ; les schémas du README et la bannière, dessinés par `docs/tools/`, ne l'ont
  pas encore été.
