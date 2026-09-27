# ADR-019 : Refonte de l'interface, des surfaces plutôt que des filets

- **Date** : 2026-09-26
- **Statut** : remplacé par ADR-020 (refonte Aurora)

## Contexte

L'interface marchait, mais elle ne tenait pas son rang. Un audit complet (design, accessibilité,
bugs) a relevé, captures à l'appui :

- **Tout était cerné d'un filet blanc à 28 %** : cartes, champs, zones, le carré lui-même en
  2 px. Les surfaces ne se distinguaient presque pas entre elles (1,1:1). L'ensemble ressemblait
  à une maquette fil de fer.
- **Une typo de jeu vidéo** : Chakra Petch partout, et chaque titre d'écran en Black Ops One,
  capitales espacées, centré. Pour un coffre-fort, le ton sonnait faux.
- **Des animations gadget** : écrans qui pivotent en 3D, dialogues qui basculent, lignes qui
  glissent au survol, deux pulsations en boucle, un interrupteur animé sur `left`.
- **Sur ordinateur, un carré de téléphone agrandi** : 826 px de côté au milieu d'un écran de
  1440, trois largeurs de contenu différentes empilées au-dessus d'un grand vide.
- **Des défauts d'accessibilité mesurés** : focus invisible dans le champ du mot de passe
  maître, contrastes sous 4,5:1 sur les fonds d'état en clair, cibles de 32 px, Échap qui
  fermait deux dialogues empilés d'un coup, codes TOTP relus toutes les 30 s par un lecteur
  d'écran.

## Décision

1. **La profondeur vient des surfaces.** Quatre niveaux de fond (`bg`, `surface`, `raised`,
   `float`), une ombre douce et un liseré de lumière sur le bord haut des cartes. Les filets ne
   restent que pour les séparateurs de liste et le bord des champs, qui atteint 3:1.
2. **Inter pour le texte, en variable**, avec les variantes qui lèvent les ambiguïtés
   (« l », « I », « 1 »). Titres calés à gauche, en casse normale. Black Ops One ne sert plus
   qu'au logotype. Une police de plus (48 Ko, OFL) remplace trois fichiers Chakra Petch.
3. **L'objet s'élargit sur grand écran.** Il reste un objet posé au centre, avec ses bords et
   son ombre, mais il prend jusqu'à 1240 × 900 px, et dès 900 px de large les onglets deviennent
   une barre latérale. Sur un téléphone, rien ne change : plein écran, onglets en bas.
4. **Un mouvement sobre** : fondu et quelques pixels de translation, rien en 3D, aucune boucle.
5. **Des composants au lieu de copies** : `SearchField`, `StatusCard`, `TextArea`, `Checkbox`,
   `Count`, `EntryMark`, et un `Button` en variante `link`. Les recherches, cartes d'état et
   liens refaits à la main dans les écrans sont passés dessus.
6. **Un monogramme par entrée**, et la marque de zone une seule fois, dans le titre de la zone.
7. **La carte d'état ne rassure jamais sans savoir** : hors ligne ou sans réponse du serveur, ni
   « Tout va bien » ni « L'agent est actif ».

Ce qui ne change pas : la marque (cadenas, logotype, bleu blanc rouge et ses trois usages), la
règle des quatre onglets, rien ne sort de l'objet, tout en français, et la stack (aucune
dépendance npm ajoutée).

## Conséquences

- L'ancienne règle « l'appli tient dans un carré » (ADR-012) devient « l'appli est un objet » :
  sa forme suit la place disponible. Les container queries restent la seule façon de régler la
  mise en page.
- Les captures du README et de `docs/img/` ont été refaites.
- La charte (`docs/design.md`) décrit le nouvel état ; l'ancien reste dans l'historique git.
