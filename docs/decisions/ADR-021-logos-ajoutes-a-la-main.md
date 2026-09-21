# ADR-021 : Des logos ajoutés à la main, pour les marques que simple-icons ignore

- **Date** : 2026-09-21
- **Statut** : accepté

## Contexte

Le pack embarqué ([ADR-019](ADR-019-logos-des-entrees.md)) vient entièrement de
simple-icons : 3455 marques, surtout anglophones et technologiques. Les marques françaises
du quotidien n'y sont pas. La Poste et Cinéville n'avaient donc aucun logo.

Les deux filets de sécurité ne rattrapent pas grand-chose. En zone personnelle, rien ne
sort du navigateur : l'entrée retombe sur son monogramme, un L et un C. En zone agent,
l'agent va chercher l'icône déclarée par le site ([ADR-020](ADR-020-icones-de-la-zone-agent.md)),
mais `cineville.fr` ne déclare rien et son `favicon.ico` plafonne à 32 pixels, donc flou
dans une pastille de 36.

Surtout, la zone d'une entrée n'est pas figée : la même entrée peut être personnelle ce
mois-ci et confiée à l'agent le mois prochain. Un logo qui n'existe que dans un des deux
chemins disparaît au premier changement d'avis.

Deux contraintes fermaient la porte à la solution évidente, déposer un fichier dans
`public/logos/`. Ce dossier est effacé et régénéré à chaque build par
`web/scripts/build-logos.mjs`, et il est dans `.gitignore` : un fichier déposé là est
détruit au build suivant, et n'est jamais commité.

## Décision

Un dossier source commité, `web/assets/logos/`, recopié dans le pack après la
régénération. Le motif est celui de `rotator/recipes/` : ajouter une marque est une
donnée, pas du code, et un fichier mal formé arrête le build au lieu de livrer un trou.

Le pack reste la source numéro un dans `EntryMark.tsx`, donc ces logos servent dans les
deux zones, quelle que soit la zone du jour.

Le format ne bouge pas : un seul `path`, un `viewBox 0 0 24 24`, aucune couleur dans le
fichier. Le rendu est un masque CSS, donc une forme et une teinte, jamais un dégradé ni
une image. La couleur de marque vit à côté, dans `colours.json`. Le script vérifie les
deux à chaque build, et un slug local l'emporte sur simple-icons en cas de collision.

Les deux formes sont mesurées, pas dessinées :

- **La Poste** : son fichier officiel dessine un fond jaune, l'oiseau et le mot
  « LA POSTE » en onze tracés. Seuls les trois tracés de l'oiseau sont gardés, puis
  normalisés dans la boîte de 24. La couleur `003DA5` est celle du fichier.
- **Cinéville** : le logotype servi par `cineville.fr` est un PNG posé dans une enveloppe
  SVG qui ne contient aucun vecteur. La pastille ronde occupe ses 132 premiers pixels, sur
  fond transparent : la silhouette vient du canal alpha, et la couleur `0098E0` est la
  teinte dominante de l'anneau, relevée sur 5974 pixels.

Un test lit le disque et vérifie que chaque couleur de la table a son fichier et chaque
fichier sa couleur. Ce contrôle manquait : un slug sans fichier ne cassait rien, il
affichait simplement un logo vide, longtemps après la faute.

## Conséquences

Ajouter une marque tient en trois gestes : un SVG dans `web/assets/logos/`, une ligne dans
`colours.json`, une ligne dans le tableau du README qui dit d'où vient le fichier.

Le pack passe de 3455 à 3457 marques, pour 935 octets. Rien ne change pour le navigateur :
même route, même masque, même absence de requête vers l'extérieur.

Ces deux marques sont déposées et ne sont pas sous la licence de simple-icons. Le projet
embarque déjà 3455 marques déposées, donc la nature de ce qui est servi ne change pas,
mais la provenance et la date de récupération de chaque fichier ajouté à la main sont
écrites dans `web/assets/logos/README.md` plutôt que laissées implicites.

Le travail de mesure reste dehors : les scripts qui ont découpé l'oiseau et suivi le
contour du C n'entrent pas dans le dépôt. Ajouter une marque n'a pas besoin d'eux, et les
garder ferait croire à un outil maintenu.
