# Logos ajoutés à la main

simple-icons couvre 3455 marques, surtout anglophones et technologiques. Les marques
françaises du quotidien n'y sont pas. Les fichiers de ce dossier comblent les trous : ils
sont commités, et `web/scripts/build-logos.mjs` les recopie dans le pack après l'avoir
régénéré.

Même format que le pack, et le script le vérifie au build : une seule balise `path`, un
`viewBox 0 0 24 24`, aucune couleur dans le fichier. La couleur de marque vit dans
`colours.json`, en six chiffres hexadécimaux majuscules, sans `#`. Le rendu est un masque
CSS : une forme, une couleur, pas de dégradé (voir `src/features/vault/EntryMark.tsx`).

Le nom du fichier est le slug, c'est-à-dire l'étiquette du domaine sans les tirets :
`laposte.svg` répond à `laposte.fr`, `cineville.svg` à `cineville.fr`.

| Fichier         | Marque    | Couleur  | Source                                                       |
| --------------- | --------- | -------- | ------------------------------------------------------------ |
| `laposte.svg`   | La Poste  | `003DA5` | `La_Poste_2022.svg` sur fr.wikipedia, récupéré le 2026-09-21 |
| `cineville.svg` | Cinéville | `0098E0` | Logotype de `cineville.fr`, récupéré le 2026-09-21           |

**La Poste** : le fichier d'origine dessine un fond jaune, l'oiseau et le mot « LA POSTE »
en onze tracés. Seuls les trois tracés de l'oiseau sont gardés, puis normalisés dans la
boîte de 24. La couleur est celle du fichier.

**Cinéville** : leur logotype est un PNG posé dans une enveloppe SVG qui ne contient aucun
vecteur. La pastille ronde occupe ses 132 premiers pixels, sur fond transparent : la
silhouette vient donc du canal alpha, et la couleur est la teinte dominante de l'anneau,
mesurée sur 5974 pixels.

Ces deux marques sont déposées. Elles ne sont pas sous la licence de simple-icons et ne
sont utilisées que pour reconnaître un site dans le coffre, à la taille d'une pastille.
Voir [ADR-021](../../../docs/decisions/ADR-021-logos-ajoutes-a-la-main.md).
