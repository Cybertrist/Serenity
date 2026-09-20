# ADR-014 — Thème clair, réglé par appareil, « Système » par défaut

- **Date** : 2026-09-20
- **Statut** : accepté

## Contexte

Serenity n'existait qu'en sombre : fond noir pur, carré blanc cerclé, cadenas crème. C'est
l'identité voulue, mais elle s'impose — sur un bureau clair en plein jour, l'appli est un trou
noir au milieu de l'écran, et des utilisateurs l'ont dit sans détour. Une palette claire était
déjà écrite dans `theme.css`, marquée « préparée, pas activée en V1 » ; elle n'avait jamais été
branchée ni vérifiée.

## Décision

1. **Deux thèmes, une seule grille de jetons.** Le clair redéfinit les mêmes variables sous
   `[data-theme="light"]`. Aucun composant ne code une couleur en dur : les quelques endroits qui
   le faisaient (contour du carré, curseur de générateur, anneau TOTP, bouton bascule, voile des
   dialogues, cascade) passent par des jetons, dont quatre nouveaux : `frame`, `scrim`, `knob`,
   `shade`.
2. **Par défaut : Système**, avec bascule *Clair* / *Sombre* dans **Réglages → Apparence**. La
   préférence est propre à l'appareil, gardée dans `localStorage` — un goût, pas un secret — et
   jamais envoyée au serveur. En mode Système, l'appli suit le basculement du soir en direct.
3. **Appliqué avant le premier rendu** (`web/src/design/theme.ts` dans `main.tsx`), et une
   requête média dans la feuille de style habille la toute première peinture : pas d'éclair
   sombre sur un écran clair, sans script en ligne — la CSP stricte reste intacte.
4. **La marque suit.** `--color-mark` passe à l'encre en clair, et le logotype a sa découpe
   sombre (`wordmark-clair.png`, déjà fournie) choisie par un composant `<Wordmark>`.
5. **La cascade de déverrouillage aussi** : traînées en encre sur le papier, tête orange
   inchangée, opacité relevée pour rester lisible. Le canevas lit les jetons plutôt que de porter
   ses couleurs.
6. **Trois passages dans `make ui-smoke`** : téléphone et bureau en sombre (thème épinglé, car
   le système de Playwright est clair par défaut), puis un passage complet en clair, cascade
   comprise. Un thème qui n'est pas capturé se casse sans qu'on le voie.

## Alternatives écartées

- **Garder l'écran d'entrée toujours sombre** pour protéger la mise en scène : cohérent sur le
  papier, mais passer du noir au blanc en déverrouillant fait un flash en plein visage, et la
  cascade tient très bien en encre.
- **Un thème clair sans choix, piloté seulement par le système** : ne laisse aucune issue à qui
  veut Serenity sombre sur un bureau clair, ou l'inverse.
- **Retenir le choix côté serveur** : il faudrait une préférence de compte, synchronisée, pour un
  réglage qui dépend de l'écran devant lequel on est assis.

## Conséquences

- L'écran de démarrage de l'appli installée (manifeste PWA) reste sombre : le manifeste n'accepte
  qu'une couleur, et c'est le visage de la marque.
- L'orange du logo est foncé à `#C85A17` en clair pour rester lisible (4,5:1) : c'est le seul
  endroit où la marque plie, et seulement sur fond clair.
- Toute nouvelle vue doit être regardée dans les deux thèmes ; `docs/design.md` porte la règle et
  la table des jetons.
- L'appli Android de la V2 reprendra la même grille et le même réglage.
