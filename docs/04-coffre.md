# 04 — Connexion au coffre

## Quoi

L'`api` lit désormais le coffre Vaultwarden, avec un **compte dédié** « Serenity » :

```
api (conteneur)
 ├─ uvicorn (FastAPI)  ──HTTP 127.0.0.1:8087──►  bw serve  ──►  vaultwarden:8080
 └─ planificateur : synchronisation toutes les 30 min
```

| Brique | Fichier | Rôle |
|---|---|---|
| Processus `bw` | `serenity/bwcli.py` | Configure le serveur, se connecte (clé d'API), déverrouille, lance `bw serve` |
| Service | `serenity/vault_service.py` | Garde `bw serve` vivant et déverrouillé, le relance s'il s'arrête |
| Client | `serenity/vault.py` | Lister, lire, modifier un mot de passe, synchroniser (`/sync`) |
| Miroir | `serenity/vault_sync.py` | Copie les **métadonnées** des identifiants dans la table `entry` |
| Planificateur | `serenity/scheduler.py` | Lance la synchronisation toutes les `SERENITY_VAULT_SYNC_INTERVAL_MINUTES` |

Nouvelles routes (session obligatoire) :

| Route | Rôle |
|---|---|
| `GET /api/vault/status` | État (`not_configured`, `ready`, `error`…), dernière synchro, nombre d'entrées |
| `POST /api/vault/sync` | Lance une synchronisation tout de suite |
| `GET /api/entries` | Les comptes surveillés : nom, domaine, criticité, dates. **Jamais** de mot de passe |

## Pourquoi

### Un compte dédié, qui ne voit que ce qu'on lui partage

Serenity ne se connecte **pas** avec ton compte personnel. Il a son propre compte Vaultwarden,
membre d'une **organisation** : il ne voit que la collection que tu lui partages.
Tu choisis donc exactement quels comptes Serenity surveille. Voir [ADR-006](decisions/ADR-006-compte-dedie.md).

### Le mot de passe maître ne passe jamais par Python

- Il est dans `secrets/bw_master_password`, propriété de l'UID 10001 (l'utilisateur du conteneur),
  droits `400`. Sur la VM, **seul root** peut le lire (aucun compte humain n'a l'UID 10001).
- Docker le monte dans le conteneur en `/run/secrets/bw_master_password`.
- `bw unlock --passwordfile` le lit lui-même. Python ne voit que le **chemin** du fichier.
- La clé de session obtenue n'existe que dans l'environnement du processus `bw serve`.

Voir [ADR-007](decisions/ADR-007-bw-serve.md).

### `bw serve` n'écoute que dans le conteneur

`bw serve --hostname 127.0.0.1` : seul le processus de l'`api` peut lui parler.
Ni `web`, ni les autres conteneurs, ni la VM n'y ont accès.

### Des métadonnées, pas des secrets

La synchronisation copie : nom, domaine, date du dernier changement de mot de passe,
prochaine rotation. **Pas** le mot de passe, ni son empreinte.
Les nouveaux comptes sont classés **critiques** par défaut : l'agent ne touchera jamais seul
à un compte que tu n'as pas explicitement déclassé en « secondaire ».
Un identifiant retiré du coffre est marqué `removed_at` (son historique est conservé).

## Mise en place

### 1. Préparer le compte Serenity dans Vaultwarden (navigateur)

Le compte Serenity a été créé en phase 2. Depuis un appareil du tailnet, sur `https://<vm>:10000` :

1. **Avec ton compte personnel** : crée une **organisation** (menu « Nouvelle organisation »),
   par exemple `Serenity`. Une collection est créée avec elle ; renomme-la `Surveillés` si tu veux.
2. Dans l'organisation → **Membres** → **Inviter un membre** : l'adresse du compte Serenity,
   rôle **Utilisateur**, accès à la collection avec le droit **Peut modifier**
   (surtout pas « Masquer les mots de passe » : la veille en aura besoin en phase 5).
3. Sans serveur e-mail, Vaultwarden accepte l'invitation automatiquement pour un compte existant.
   Reviens dans **Membres** : le compte Serenity doit apparaître « Accepté ». Clique sur
   **Confirmer**. (S'il reste « Invité », connecte-toi une fois avec le compte Serenity dans
   une fenêtre privée, puis confirme.)
4. **Déplace** vers l'organisation les identifiants à surveiller : ouvre l'élément → menu `⋮` →
   **Déplacer vers l'organisation** → choisis la collection. Commence par un ou deux comptes de test.
5. **Avec le compte Serenity** (fenêtre privée) : **Paramètres → Sécurité → Clés →
   Afficher la clé d'API**. Garde la fenêtre ouverte pour l'étape 2.

### 2. Clé d'API dans `.env` (sur la VM)

```bash
nano .env
```

Renseigne `BW_CLIENTID` (commence par `user.`) et `BW_CLIENTSECRET`, puis enregistre.
Vérifie sans afficher les valeurs :

```bash
grep -c '^BW_CLIENTID=user\.' .env         # 1
grep -c '^BW_CLIENTSECRET=.\{20,\}' .env   # 1
```

### 3. Mot de passe maître en secret Docker (sur la VM)

```bash
make bw-secret
```

La commande demande le mot de passe maître **du compte Serenity** (rien ne s'affiche), puis
affiche `UNKNOWN:UNKNOWN 400 secrets/bw_master_password` : propriétaire UID 10001, lecture seule.
`cat secrets/bw_master_password` doit répondre « Permission non accordée ».

### 4. Redémarrer

```bash
make up
make logs s=api
```

Au bout de quelques secondes, les logs doivent montrer `vault unlocked, starting bw serve`,
puis une ligne par synchronisation. `Ctrl + C` pour quitter les logs.

## Comment tester

### Tests automatiques

```bash
make test    # 65 tests, dont un faux `bw` (tests/fake_bw.py)
make lint
```

### En vrai (sur la VM)

Connecte-toi comme en phase 3 (fichier de cookies `/tmp/serenity.cookies`), puis :

```bash
curl -s -b /tmp/serenity.cookies https://<vm>/api/vault/status
curl -s -b /tmp/serenity.cookies -X POST https://<vm>/api/vault/sync
curl -s -b /tmp/serenity.cookies https://<vm>/api/entries
```

Attendu :

- `status` → `"state":"ready"` et `entries` = le nombre d'identifiants partagés ;
- `sync` → `{"added":…,"updated":…,"removed":…,"total":…}` ;
- `entries` → noms et domaines, **aucun** mot de passe.

Vérifier l'isolement :

```bash
curl -s -m 3 http://127.0.0.1:8087/status; echo " -> doit échouer"   # bw serve invisible depuis la VM
docker compose logs api | grep -ci 'password=' ; echo " -> 0 attendu"
```

## En cas de problème

| Symptôme | Cause probable |
|---|---|
| `state: not_configured` | `BW_CLIENTID` / `BW_CLIENTSECRET` vides dans `.env`, ou `make up` non relancé |
| `bw login failed` | Clé d'API erronée ou régénérée depuis |
| `bw unlock failed` | Mauvais mot de passe maître : refais `make bw-secret` puis `make restart` |
| `password file … not found` | `make bw-secret` jamais lancé |
| `entries: 0` | Rien n'est partagé avec le compte Serenity, ou membre pas encore **confirmé** |
