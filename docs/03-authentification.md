# 03 : Comptes et authentification

## Quoi

Serenity a maintenant de vrais comptes, conformes à [`crypto.md`](crypto.md) §7 :

| Parcours | Ce que fait l'appareil | Ce que reçoit le serveur |
|---|---|---|
| **Inscription** | Génère UK, AK, le kit ; dérive la clé d'auth de ton mot de passe maître | Clé d'auth, clé d'auth de récupération, blocs chiffrés |
| **Connexion** (nouvel appareil, puis tous les 60 jours) | Mot de passe maître + code TOTP | Clé d'auth + code |
| **Déverrouillage** (au quotidien) | Mot de passe maître seul | Clé d'auth |
| **Changement du mot de passe maître** | Rechiffre UK avec la nouvelle clé | Ancienne et nouvelle clé d'auth, code, nouveau bloc |
| **Récupération** | Kit + code TOTP, nouveau mot de passe, **nouveau kit** | Clé d'auth de récupération, code, nouveaux blocs |
| **Régénération du kit** (réglages) | Mot de passe maître + code TOTP, tire un kit neuf pour la même UK | Clé d'auth, code, nouvelle clé d'auth de récupération et nouveau bloc |

Côté serveur (`api/serenity/auth/`) :

| Module | Rôle |
|---|---|
| `accounts.py` | Inscription, prélogin, connexion, déverrouillage |
| `credentials.py` | Changement de mot de passe maître, récupération, régénération du kit |
| `sessions.py` | Sessions d'appareil (cookie → HMAC en base) |
| `throttle.py`, `guards.py` | Limitation des tentatives et verrouillage progressif |
| `totp.py` | Code TOTP de connexion, chiffré en base avec la clé TOTP |
| `hashing.py` | Argon2id des clés d'auth |
| `validation.py` | Format des blocs reçus (le serveur ne peut pas les lire, il vérifie leur forme) |

Côté navigateur (`web/src/features/account/`) : les mêmes parcours en TypeScript, avec leurs
écrans ([07 : Interface](07-interface.md)). Les clés déverrouillées vivent dans un `Keyring` en
mémoire, effacé au verrouillage (`web/src/vault/keyring.ts`).

### Routes

| Route | Accès | Rôle |
|---|---|---|
| `GET /api/auth/status` | libre | Inscriptions ouvertes ? |
| `POST /api/auth/signup`, `/signup/confirm` | libre | Création du compte, puis activation par le premier code TOTP |
| `POST /api/auth/prelogin` | libre | Sel et paramètres Argon2id (faux sel stable pour un compte inconnu) |
| `POST /api/auth/login` | libre | Connexion complète : session d'appareil de 60 jours |
| `POST /api/auth/unlock`, `/lock` | session | Niveau « déverrouillé » (15 min glissantes) |
| `GET /api/auth/me`, `/keys`, `/sessions` | session | Compte, clés **chiffrées**, appareils connectés |
| `DELETE /api/auth/sessions/{id}` | déverrouillé | Déconnecter un appareil à distance |
| `POST /api/auth/password` | déverrouillé | Changer le mot de passe maître |
| `POST /api/auth/recovery-kit` | déverrouillé | Régénérer le kit de récupération (§7.11) |
| `POST /api/auth/recover/start`, `/complete` | libre | Récupération par le kit |
| `POST /api/auth/logout` | session | Déconnexion de cet appareil |

## Pourquoi

- **Le serveur ne voit jamais ton mot de passe maître**, ni UK, ni AK en clair. Il stocke la clé
  d'auth hachée en Argon2id : une base volée ne permet pas de se connecter.
- **Deux niveaux** : la session d'appareil (60 jours) permet de lire des blocs chiffrés ; tout ce
  qui modifie quelque chose demande un déverrouillage récent. Un cookie volé ne suffit pas.
- **TOTP anti-rejeu** : un code ne sert qu'une fois, même pendant ses 30 secondes de validité.
- **Verrouillage progressif** : après 5 échecs, 1 min, puis 2, 4, 8… jusqu'à 24 h. Les compteurs
  sont en base, ils survivent à un redémarrage.
- **Pas d'énumération** : un compte inconnu reçoit un faux sel stable, et le serveur calcule
  quand même un Argon2id, pour que le temps de réponse ne trahisse rien.
- **Un kit se refait, il ne se réaffiche pas.** Le serveur n'en garde que le hachage de la clé
  d'auth de récupération : réafficher est impossible, régénérer demande le mot de passe maître
  **et** un code TOTP, car une session ouverte ne suffit pas. L'ancien kit meurt à l'instant où le
  nouveau s'affiche, avertissement à l'appui. Voir [ADR-013](decisions/ADR-013-regeneration-kit.md).
- **Mono-utilisateur en V1** : les inscriptions se ferment dès qu'un compte est actif. Le modèle
  de données, lui, est multi-utilisateur. Voir [ADR-008](decisions/ADR-008-comptes.md).
- L'ancien système (mot de passe côté serveur, fichier `auth.json`, `make auth-init`) est retiré.

## Comment tester

### Tests automatiques (sur la VM)

```bash
make test         # Python : toute la suite, dont chaque parcours via le client de référence
make web-test     # TypeScript : lint, types, tests unitaires
make e2e          # Le client TypeScript contre le vrai serveur Python
```

`make e2e` lance un serveur de test jetable (base temporaire, clés aléatoires, horloge TOTP
de test) : il ne touche pas à ta stack.

### En vrai, avec le client en ligne de commande

Tout cela se fait dans l'appli ([07 : Interface](07-interface.md)). `make client` reste le même
parcours depuis le conteneur `api` : pratique pour l'administration de la VM, et c'est lui que
les tests rejouent. Crée ton compte :

```bash
make up
make client c=signup
```

Il demande un identifiant (un nom simple ou ton adresse e-mail) et un mot de passe maître, affiche une **clé TOTP** à ajouter dans
ton appli d'authentification, puis le **kit de récupération**. Note-les hors ligne et
**ne les colle nulle part**.

Ensuite :

```bash
make client c=me          # ton compte et ta session
make client c=lock        # verrouille
make client c=sessions    # marche encore (lecture seule)
make client c=unlock      # mot de passe maître seul
make client c=logout
make client c=login       # mot de passe maître + code TOTP
```

Et si besoin : `make client c=password` (changer le mot de passe maître), `make client c=recover`
(récupération par le kit), `make reset-totp u=<identifiant>` (nouveau TOTP de connexion,
administrateur de la VM).

Le journal d'audit (`/api/logs`) enregistre chaque connexion ; il se lit dans l'appli,
**Réglages → Journal**.
