# ADR-016 : Sauvegardes : restic, snapshot SQLite, clés incluses, exercice obligatoire

- **Date** : 2026-09-20
- **Statut** : accepté

## Contexte

Jusqu'ici, rien n'était sauvegardé. Le coffre vivait dans un seul fichier SQLite sur une seule
VM, et les clés serveur et TOTP dans deux fichiers à côté. La phase 8 prévoyait restic ; entre
temps l'agent a gagné le droit d'**écrire** dans le coffre (rotations), ce qui ajoute une façon
de perdre des données qui n'existait pas.

Trois questions : comment prendre une copie cohérente d'une base en cours d'écriture, quoi
mettre dans la sauvegarde, et comment savoir qu'elle vaut quelque chose.

## Décision

1. **`VACUUM INTO`, jamais une copie de fichier.** C'est SQLite qui produit l'instantané, WAL
   compris. Copier `serenity.sqlite` pendant que l'api écrit donnerait une base déchirée, qui
   se restaure sans erreur et se corrompt plus tard.
2. **Les clés sont dans la sauvegarde.** Sans `server.key`, la zone agent d'un coffre restauré
   est définitivement close : les clés d'agent sont scellées pour elle. Conséquence assumée : le
   dépôt est aussi sensible que la VM, son mot de passe vit hors du dépôt et **hors de
   Serenity** : sur papier, avec le kit de récupération.
3. **restic dans Docker**, version épinglée, comme le reste de l'outillage (ADR-003). Rétention
   par défaut 7 jours / 4 semaines / 6 mois, réglable dans `.env`.
4. **Un exercice qui détruit** (`make backup-check`) : coffre jetable, sauvegarde, effacement de
   la base **et** des clés, restauration, puis vérification du contenu (intégrité SQLite, tables
   attendues, comptes et entrées présents, clés revenues). Il tourne en CI à chaque commit.
5. **La restauration n'écrase rien.** Elle dépose les fichiers dans un dossier et s'arrête là :
   remettre en place est un geste manuel, documenté. Un `restore` qui écrase un coffre vivant
   par accident ferait plus de dégâts que la panne qu'il répare.
6. **Tâche systemd nocturne** avec `Persistent=true` : une VM éteinte à 3 h rattrape au
   démarrage au lieu de sauter un jour.

## Alternatives écartées

- **`sqlite3 .backup` via un conteneur** : équivalent, mais `VACUUM INTO` produit en plus une
  base compacte et ne dépend pas du binaire `sqlite3` dans l'image.
- **Sauvegarder le dossier `data/` tel quel** : simple, et faux, car fichier WAL et fichier
  principal pris à deux instants différents.
- **Exclure les clés** pour que le dépôt soit moins sensible : la restauration ne rendrait alors
  qu'un demi-coffre, et personne ne s'en apercevrait avant le jour où ça compte.
- **Un dépôt distant imposé** (sftp/S3) : le bon réflexe, mais il demande un hôte et des
  identifiants que le projet n'a pas à choisir. Défaut local, et la documentation dit sans
  détour qu'un dépôt local meurt avec la machine.

## Conséquences

- `.env` gagne le dépôt, le fichier de mot de passe et la rétention ; `.env.example` explique
  comment créer les deux sans jamais afficher de secret.
- `make backup-now`, `make backup-check`, `make restore-check`, et un job de CI
  « Sauvegarde (exercice de restauration) ».
- Le mot de passe du dépôt devient un secret de plus à garder hors ligne, au même endroit que le
  kit de récupération. C'est le prix d'une sauvegarde qui contient les clés.
- Reste à faire : déporter le dépôt hors de la VM, et surveiller l'échec de la tâche nocturne
  (aujourd'hui visible seulement dans `journalctl`).
