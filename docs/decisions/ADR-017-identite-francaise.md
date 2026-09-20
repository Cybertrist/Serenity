# ADR-017 — Identité française : bleu de France, blanc, rouge Marianne

- **Date** : 2026-09-20
- **Statut** : accepté

## Contexte

Serenity était orange (`#F2711C`), repris du logo d'origine. L'orange ne disait rien du produit :
ni de son pays, ni de son modèle à deux zones. Serenity est un coffre **auto-hébergé, en
français, chez soi** — autant que la charte le dise.

Le piège du « bleu blanc rouge » est connu : des rayures partout, une cocarde en coin, et le
produit ressemble à un stand de foire. La contrainte était donc double : que ce soit français
**au premier coup d'œil**, et que chaque couleur garde un métier.

## Décision

1. **Trois couleurs, trois métiers.** Le **bleu de France** (`#0055A4`, ouvert en `#5B8DEF` sur
   fond noir) devient l'accent : tout ce qui agit. Le **blanc** (`#F2F4F8`) reste la marque. Le
   **rouge Marianne** (`#E1000F`, ouvert en `#F76D72`) est celui des alertes — le jeton `crit`
   existait déjà en rouge, il prend la teinte de l'État au lieu d'un rouge quelconque.
   Aucun jeton n'est ajouté pour « faire drapeau » : les trois couleurs étaient déjà des rôles.
2. **Le drapeau entier ne sort que trois fois**, là où il porte une information ou la marque :
   le filet sous la barre de titre (papier à en-tête), les trois étapes de la création de compte
   (une bande par étape franchie), et les têtes de la cascade de déverrouillage (trois bandes).
   Partout ailleurs, c'est de la décoration, ce que la charte interdit.
3. **La marque devient le drapeau en un objet** : pavé bleu, cadenas blanc, serrure rouge. Pas
   de rayures dans l'icône : à 32 px, trois bandes deviennent de la bouillie, trois formes non.
4. **Les valeurs officielles sont respectées telles quelles quand elles passent le contraste.**
   Le bleu `#0055A4` tient 7,4:1 sur du papier : inutile de le retoucher pour le thème clair.
   Sur fond noir il est trop sombre, on l'ouvre — comme l'orange l'était déjà dans l'autre sens.
5. **Les gris se refroidissent.** Le crème et le papier chaud accompagnaient l'orange ; ils
   tiraient au jaune à côté du bleu. Surfaces, encre et papier passent à des neutres bleutés.

## Conséquences

- Rien dans les composants ne changeait de couleur en dur : l'échange se fait dans
  `web/src/design/theme.css`, plus trois endroits qui dessinent le drapeau. Deux ombres qui
  codaient l'orange en dur deviennent les jetons `glow` / `glow-strong`.
- Les PNG d'icônes sont désormais **dérivés** des SVG par `scripts/brand-icons.sh` : la marque
  a une seule source. Les deux découpes du logotype (`wordmark*.png`) ont été reteintées une
  fois pour toutes (blanc/encre, « I » rouge).
- Le rouge sert à la fois d'alerte et de serrure dans le logo. C'est assumé : la serrure est un
  détail de marque de quelques pixels, jamais un état.
- Le kill switch reste bleu (c'est un interrupteur, pas un danger) ; le rouge y entrerait en
  concurrence avec les vraies alertes.
- Le thème clair a dû **dessiner le blanc** du drapeau (`#C9D3E2`) : sur une feuille blanche,
  une bande blanche est un trou, et le filet paraît cassé.
