# 09 : Sauvegardes, restic et un exercice de restauration

## Quoi

Une sauvegarde chaque nuit de **ce qui ne se reconstruit pas** : la base chiffrée et les deux
fichiers de clés. Le reste (images, code, configuration) est dans git ou se rebâtit.

| Pièce | Rôle |
|---|---|
| `ops/backup.sh` | Snapshot cohérent de SQLite (`VACUUM INTO`), les clés, puis un instantané restic et la rétention. |
| `ops/restore.sh` | Restauration : `--check` dans un dossier temporaire (ne touche à rien), `--into <dossier>` pour une vraie reprise. Vérifie toujours ce qui revient. |
| `ops/systemd/serenity-backup.{service,timer}` | Tous les jours à 03:12, rattrapage au démarrage si la VM dormait. |
| `scripts/backup-drill.sh` | L'exercice complet : coffre jetable → sauvegarde → **destruction** → restauration → vérification. Joué en CI. |

### Ce qui est sauvegardé

- `serenity.sqlite`, pris par **`VACUUM INTO`** : c'est SQLite qui produit la copie, WAL compris.
  Copier le fichier pendant que l'api écrit donnerait une base déchirée.
- `data/keys/server.key` et `data/keys/totp.key`. **Sans la clé serveur, la zone agent d'un
  coffre restauré ne se rouvre jamais** : les clés d'agent sont scellées pour elle.

### Ce que ça implique

Le dépôt restic contient donc la base **et** les clés serveur. Il est aussi sensible que la VM
elle-même :

- son **mot de passe** vit dans un fichier `root:root 0400`, jamais dans le dépôt, jamais dans
  git, et **pas dans Serenity** : un gestionnaire de mots de passe qui aurait besoin de
  lui-même pour être restauré ne sert à rien. Sur papier, avec ton kit de récupération ;
- ta **zone personnelle reste chiffrée** par ta clé maître dans toutes les sauvegardes : même
  avec le dépôt et son mot de passe, elle ne s'ouvre pas sans ton mot de passe maître
  ([`crypto.md`](crypto.md) §8.1) ;
- un dépôt **local** meurt avec la machine. C'est mieux que rien, ce n'est pas une sauvegarde.
  Vise un autre hôte (`sftp:`), un disque externe, ou un stockage objet.

## Pourquoi

- **restic** : déduplication, instantanés chiffrés côté client, `forget --prune` pour la
  rétention, et `restore` qui sait revenir à n'importe quelle date. Déjà prévu dans la pile.
- **Dans Docker** comme le reste de l'outillage (ADR-003) : rien à installer sur la VM, version
  épinglée.
- **Un exercice qui détruit vraiment** : `make backup-check` efface la base et les clés avant de
  restaurer. Une sauvegarde que personne n'a restaurée est une rumeur.
- **La restauration n'écrase jamais une stack qui tourne** : elle dépose les fichiers dans un
  dossier, et c'est toi qui les remets en place. Une restauration qui écrase un coffre vivant
  par accident est pire que pas de restauration du tout.

## Comment tester

```bash
make backup-check      # l'exercice complet sur un coffre jetable (aucune donnée réelle)
make backup-now        # une vraie sauvegarde, maintenant
make restore-check     # restaure la dernière sauvegarde réelle dans un dossier temporaire
```

`make backup-check` ne touche ni à ta base, ni à tes clés, ni à ton dépôt : tout se passe dans
un dossier temporaire supprimé à la fin.

### Installer la tâche nocturne (sur la VM, une seule fois)

```bash
sudo cp ops/systemd/serenity-backup.service /etc/systemd/system/
sudo cp ops/systemd/serenity-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now serenity-backup.timer
systemctl list-timers serenity-backup.timer
```

Le service suppose le dépôt dans `/opt/serenity` ; adapte `WorkingDirectory` et `ExecStart` si
ton chemin diffère.

### Créer le mot de passe du dépôt (une seule fois)

```bash
sudo install -d -m 700 -o root -g root /root/.config/serenity
sudo sh -c "umask 377; head -c 24 /dev/urandom | base64 > /root/.config/serenity/restic-password"
```

Puis **lis-le une fois et note-le sur papier**, avec ton kit de récupération :

```bash
sudo cat /root/.config/serenity/restic-password
```

Ne le colle nulle part ailleurs. Sans lui, les instantanés sont des octets illisibles.

## Restaurer pour de vrai

```bash
sudo systemctl stop serenity-backup.timer
docker compose down
ops/restore.sh --into /var/tmp/serenity-restore
```

Puis remettre en place, à la main et en connaissance de cause :

```bash
sudo cp /var/tmp/serenity-restore/backup/serenity.sqlite data/api/serenity.sqlite
sudo chown 10001:10001 data/api/serenity.sqlite
sudo cp /var/tmp/serenity-restore/backup/keys/server.key data/keys/server.key
sudo cp /var/tmp/serenity-restore/backup/keys/totp.key data/keys/totp.key
sudo chown root:root data/keys/*.key
sudo chmod 400 data/keys/*.key
docker compose up -d
```

L'agent refuse de démarrer si la clé serveur restaurée n'est pas celle pour laquelle la base a
été scellée : c'est voulu, et c'est le signe qu'on a mélangé deux sauvegardes.

## Limites connues

- Le dépôt par défaut est **local** (`/var/backups/serenity`) : à déporter.
- La rétention est fixe (7 jours, 4 semaines, 6 mois) ; elle se règle dans `.env`.
- `restic check --read-data` (relecture intégrale du dépôt) n'est pas automatisé : à lancer à la
  main de temps en temps, c'est long.
- Rien ne surveille que la tâche nocturne a bien tourné : un échec se voit dans
  `systemctl status serenity-backup.service` et dans `journalctl -u serenity-backup`.
