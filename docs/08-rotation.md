# 08 : Rotation, l'agent change vraiment les mots de passe

## Quoi

Jusqu'ici, « approuvé » voulait dire « en attente d'un exécuteur » : toute la mécanique de
décision existait (politiques, échéances, kill switch, allowlist, transaction), mais rien
n'ouvrait jamais un site. C'est fait.

| Pièce | Rôle |
|---|---|
| **`rotator/`** (conteneur `rotator`) | La **seule** image avec un navigateur, et la seule qui atteint un site. Deux verbes : `/verify` (se connecter) et `/change` (se connecter puis changer). Ne détient aucune clé, aucune base, rien sur disque. |
| **`rotator/recipes/*.json`** | Où sont les champs d'un site et ce qui prouve qu'une étape a marché. **Ajouter un site, c'est une recette, pas du code.** Validée au démarrage : une faute de frappe échoue au boot, jamais au milieu d'une rotation. |
| **`demo/`** (profil compose `demo`) | Un site jouet : connexion, changement de mot de passe, code à six chiffres en option. C'est là que l'agent s'entraîne, et c'est ce que la CI rejoue à chaque commit. |
| **`serenity/agent/executor.py`** | Le chef d'orchestre côté agent : il choisit la recette, ouvre la zone agent, mène la transaction et écrit le résultat. |
| **`serenity/rotator/vault.py`** | Le coffre vu par une rotation : déchiffrer, poser le **bloc en attente**, valider ou jeter. |

### Le déroulé d'une rotation

Conforme à [`crypto.md`](crypto.md) §7.12 et à la règle 6 : **le coffre est servi avant le site**.

1. Kill switch, zone agent, allowlist, plafond quotidien, tous vérifiés **par le code**, avant tout.
2. L'agent déchiffre l'entrée avec la clé d'agent et tire un mot de passe de 24 caractères.
3. Il chiffre la révision `r+1` et l'enregistre **en attente**. L'entrée active ne bouge pas :
   un appareil qui synchronise à cet instant voit encore le mot de passe qui ouvre le site.
4. Le rotateur se connecte, change le mot de passe, puis **se reconnecte de zéro** pour vérifier.
5. Réussite : le bloc en attente devient la révision courante, l'ancien part dans l'historique.
6. Échec : le site est remis à l'ancien mot de passe, le bloc en attente est supprimé, le coffre
   n'a pas bougé. Si le retour arrière échoue lui aussi, le bloc est **gardé** et l'entrée est
   signalée (`rotation.manual`) : les deux mots de passe sont dans le coffre, à toi de trancher.

### Ce qui est isolé de quoi

- Le rotateur est sur un réseau privé (`rotation`) avec l'agent, plus `egress` pour atteindre
  les sites. **Aucun port publié** : personne d'autre ne peut lui parler.
- L'agent, lui, n'a toujours pas de navigateur : le processus qui déchiffre la zone agent et
  celui qui ouvre une page web sont deux conteneurs différents.
- Un jeton partagé (`SERENITY_ROTATOR_TOKEN`) authentifie l'agent auprès du rotateur. **Vide =
  pas d'exécution** : une rotation approuvée attend, exactement comme avant.
- Le rotateur ne journalise jamais un corps de requête, et ses messages d'erreur ne contiennent
  ni mot de passe ni contenu de page.

## Pourquoi

- **Un conteneur à part** plutôt que Playwright dans l'agent : l'image de l'agent reste à
  ~200 Mo, et surtout le périmètre de ce qui touche Internet reste minuscule. Voir
  [ADR-015](decisions/ADR-015-executeur-rotation.md).
- **Des recettes, pas du code par site** : un site qui change sa page devient une ligne à
  corriger, pas un correctif à déployer.
- **Un site de démo dans le dépôt** : la rotation se regarde en vrai, et la CI la rejoue à
  chaque commit (succès, retour arrière, refus hors allowlist). Un exécuteur non testé est un
  exécuteur qui perdra un compte un jour.
- **Le bloc en attente** : sans lui, une coupure entre « le site a changé » et « le coffre a
  enregistré » perd le compte. C'est la règle 6, appliquée.

## Comment tester

### Tout, d'un coup (sur la VM)

```bash
make test             # toute la suite, dont la transaction et le client de l'exécuteur
make rotation-demo    # l'agent change un mot de passe sur le site de démo, vrai navigateur
```

`make rotation-demo` construit le site jouet et le rotateur, les lance sur un réseau jetable,
joue les trois scénarios (réussite, refus du site, site hors allowlist) et nettoie derrière lui.
Rien ne touche ta stack ni ta base.

### À la main, pour le regarder faire

```bash
T=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
sed -i "s/^SERENITY_ROTATOR_TOKEN=.*/SERENITY_ROTATOR_TOKEN=$T/" .env; unset T
```

Autorise le site de démo (`api/allowlist.yaml`) :

```yaml
domains:
  - demo.serenity.test
```

Puis lance la stack avec le site de démo et regarde :

```bash
docker compose --profile demo up -d --build
```

Le site jouet est sur `http://127.0.0.1:8090` (hors de la VM : passe par ton accès privé). Dans
Serenity, crée une entrée avec l'identifiant `tristan@exemple.fr`, le mot de passe
`mot-de-passe-de-depart` et l'adresse `http://demo.serenity.test:8000/connexion`, **confie-la à
l'agent**, puis demande une rotation depuis l'écran Agent. Quand elle passe :

```bash
docker compose logs agent --tail 20
curl -s http://127.0.0.1:8090/sante
```

L'agent n'exécute que toutes les heures ; pour ne pas attendre :

```bash
make rotate-now
```

Le compteur `changes` du site a bougé, l'entrée porte un nouveau mot de passe, et le journal
montre la suite `vault.item.pending` → `agent.rotation.execute`.

## Écrire la recette d'un vrai site

L'agent n'est pas intelligent : il remplit les champs qu'une recette lui désigne. Écrire une
recette, c'est donc regarder la page, pas deviner.

```bash
make recipe-inspect URL=https://exemple.fr/connexion
```

Le rotateur ouvre la page, liste ses champs visibles avec leur sélecteur, leur type et leur
libellé, ses boutons, et signale les `iframe` (un formulaire dedans a besoin d'un autre
traitement). Il ne tape rien et ne soumet rien : aucun identifiant n'est nécessaire.

La page « changer mon mot de passe » est derrière la connexion : lance l'inspection sur son URL
avec une session ouverte dans ton navigateur ne suffit pas (le rotateur part d'un profil vierge).
Pour celle-là, copie les sélecteurs depuis les outils de développement de ton navigateur
(clic droit sur le champ → Inspecter), ou fais l'essai sur un compte jetable.

Ensuite, un fichier dans `rotator/recipes/` :

```json
{
  "name": "exemple",
  "domains": ["exemple.fr"],
  "login_path": "/connexion",
  "account_path": "/mon-compte/securite",
  "selectors": {
    "username": "#email", "password": "#password", "submit": "button[type=submit]",
    "current": "#current-password", "new": "#new-password", "confirm": "#confirm-password",
    "change_submit": "#save"
  },
  "signed_in": "[data-testid=account-menu]",
  "changed": "text=Votre mot de passe a été modifié"
}
```

`signed_in` et `changed` sont les deux preuves : un élément qui n'apparaît **que** connecté, et
un qui n'apparaît **que** après un changement réussi. Sans eux, l'agent croirait avoir réussi
parce que la page n'a pas planté. Ajoute enfin le domaine à `api/allowlist.yaml`, sinon le code
refusera d'y toucher.

## Ce que l'agent ne fera pas

Décidé le 2026-09-20, et ce n'est pas une limite temporaire :

- **Pas de code reçu par mail.** Il faudrait donner à Serenity l'accès à une boîte mail, donc
  au serveur, donc à qui prend la VM. Une boîte mail est la clé de tous les autres comptes :
  c'est exactement pourquoi ton adresse principale vit en zone personnelle, que le serveur ne
  sait pas lire. Le sujet pourra être rouvert avec une adresse dédiée aux comptes confiés à
  l'agent, mais ça demandera son propre ADR.
- **Pas de code par SMS** : il faudrait une carte SIM ou un service tiers, et les sites
  refusent souvent les numéros virtuels.
- **Pas de réinitialisation par « mot de passe oublié »**, même si on pouvait lire le mail.
  Lien de réinitialisation + accès à la boîte = prise de contrôle d'un compte : c'est le mode
  opératoire d'un attaquant, pas une fonctionnalité. L'agent change un mot de passe **en étant
  connecté**, ou il ne fait rien.
- **Pas de CAPTCHA, pas de contournement d'anti-robot.** Un site qui ne veut pas d'automatisation
  a le droit, et le contourner nous mettrait du mauvais côté.

Pour ces comptes-là, l'agent fait ce qu'il fait en zone personnelle : il surveille et il te
prévient. Le périmètre réaliste, c'est **mot de passe seul ou TOTP** : le code TOTP se calcule
hors ligne à partir du secret déjà présent dans l'entrée.

## Limites connues

- **Un seul site a une recette** : le site de démo. Une rotation approuvée sur un site sans
  recette **le dit** : l'écran Agent l'affiche sous « Approuvées, en attente de l'exécuteur ».
- La reprise d'une entrée en zone personnelle est **refusée** pendant une rotation (§7.12).
- Le plafond `SERENITY_MAX_ROTATIONS_PER_DAY` porte sur les approbations, pas sur les
  exécutions : une rotation approuvée hier peut s'exécuter aujourd'hui.
- Les sauvegardes restic sont en place ([09 : Sauvegardes](09-sauvegardes.md)) et la revue de
  sécurité est écrite ([10 : Sécurité](10-securite.md)) ; il reste le renouvellement des clés
  de développement et la `v0.1.0` (issue #27).
