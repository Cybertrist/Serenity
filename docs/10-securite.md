# 10 : Sécurité

## Quoi

La revue passée avant la `v0.1.0` : ce qui a été vérifié, ce qui tient, ce qui reste ouvert.
Le modèle de menace détaillé vit dans [`crypto.md`](crypto.md) section 8 ; cette page est le
compte rendu de la revue et la liste honnête des risques qu'on garde.

> Serenity n'a **pas** été relu par un expert extérieur. Cette page ne remplace pas un audit,
> elle dit où en est le projet et ce qu'un auditeur devrait regarder en premier.

## Ce qui a été vérifié, et comment le rejouer

| Quoi | Résultat | Commande |
|---|---|---|
| **Surface réseau** | Deux ports publiés, tous les deux sur `127.0.0.1` : l'interface (8080) et le site de démo (8090), ce dernier seulement avec son profil | `grep -n "ports:" -A3 docker-compose.yml` |
| **Privilèges des conteneurs** | `no-new-privileges`, système de fichiers en lecture seule et `cap_drop: [ALL]` partout. Seuls `api` et `agent` gardent `SETUID`/`SETGID`, le temps de lire leur clé puis de descendre sous l'UID 10001 | `grep -nE "read_only\|cap_drop\|no-new-priv" docker-compose.yml` |
| **Secrets dans l'historique Git** | Aucun, sur les 78 commits du dépôt | `docker run --rm -v "$PWD:/repo:ro" zricethezav/gitleaks:latest detect --source=/repo --redact` |
| **Dépendances Python** | Aucune vulnérabilité connue (`pip-audit` sur l'arbre complet) | voir la commande dans la section suivante |
| **Dépendances npm** | Aucune vulnérabilité connue, avec et sans les outils de développement | `npm audit` dans `web/` |
| **En-têtes HTTP** | CSP stricte sans `unsafe-inline` ni `unsafe-eval`, `frame-ancestors 'none'`, `base-uri 'none'`, HSTS, COOP, CORP, `no-referrer`, `nosniff`, `Permissions-Policy` | `cat web/security-headers.conf` |
| **Contrôles d'accès de l'API** | 44 routes : 9 publiques et justifiées une par une, 19 derrière une session, 16 derrière un coffre déverrouillé | `make test` (`tests/test_route_guards.py`) |
| **Secrets dans les journaux** | Les clés, mots de passe et jetons sont caviardés, y compris au milieu d'une phrase | `make test` (`tests/test_audit.py`) |
| **Crypto identique des deux côtés** | Un bloc chiffré par Python se déchiffre en TypeScript, et l'inverse, avec des nonces neufs | `make crypto-interop` |
| **Rotation, sauvegardes, interface** | Rejouées en entier à chaque commit, navigateur compris | `make rotation-demo`, `make backup-check`, `make ui-smoke` |

Pour les dépendances Python, l'audit tourne dans un conteneur jetable :

```bash
docker run --rm -v "$PWD/api:/app:ro" -w /tmp python:3.12-slim sh -c \
  "pip install -q pip-audit; cp /app/pyproject.toml .; mkdir -p serenity; \
   touch serenity/__init__.py; pip-audit --progress-spinner off ."
```

## Les contrôles qui vivent dans le code, pas dans une intention

Une règle de sécurité qui n'est pas testée est une promesse. Celles-ci échouent en CI si
quelqu'un les casse :

- **Aucune route publique par accident** (`tests/test_route_guards.py`). Les neuf routes
  ouvertes sont écrites une par une avec leur raison. Toute nouvelle route sans garde, ou toute
  écriture qui n'exige pas le mot de passe maître, fait échouer le test.
- **L'agent ne touche jamais la zone personnelle** : l'échéancier ne programme rien pour elle,
  la création de rotation la refuse, une entrée reprise ne peut plus être approuvée.
- **Le kill switch est vérifié avant chaque action**, et l'enclencher marche sur un coffre
  verrouillé. Le relâcher demande le mot de passe maître.
- **L'allowlist est vérifiée par le code**, au moment où un site peut être touché, avec les
  sous-domaines mais pas les suffixes trompeurs (`netflix.com.evil.example` est refusé).
- **La rotation est transactionnelle** : bloc en attente avant de toucher au site, vérification
  par reconnexion complète, retour arrière, et conservation des deux mots de passe si même le
  retour arrière échoue.
- **Les erreurs de clé ne contiennent jamais la clé**, et l'abandon de privilèges est irréversible
  (`tests/test_infra.py`).
- **L'agent refuse de démarrer** avec une clé serveur qui n'est pas celle pour laquelle la base
  a été scellée.

## Le modèle de menace, en résumé

Le détail est dans [`crypto.md`](crypto.md) section 8. Ce que gagne un attaquant, selon ce
qu'il obtient :

| Il obtient | Il lit | Il ne lit pas |
|---|---|---|
| Une sauvegarde restic **sans** son mot de passe | rien | rien |
| La base seule (`serenity.sqlite`) | les métadonnées : dates, zones, révisions, politiques | aucun mot de passe, aucune des deux zones |
| La base **et** la clé serveur | la zone agent | la zone personnelle |
| Root sur la VM | la zone agent, et il peut modifier le code servi | la zone personnelle, tant qu'aucun client ne se déverrouille après sa prise de contrôle |
| Ton mot de passe maître | tout | rien de plus, il a déjà tout |
| Le réseau entre ton téléphone et la VM | rien, c'est du HTTPS sur un chemin privé | tout |

Le point dur, et il est assumé : **qui prend la VM prend la zone agent**. C'est le prix de
l'agent. La zone personnelle, elle, ne s'ouvre que dans un navigateur déverrouillé par toi.

## Risques restants

Aucun de ces points n'est un oubli. Ils sont connus, et certains ne seront jamais corrigés.

1. **Pas d'audit externe.** Le point le plus important de cette liste.
2. **Le dépôt de sauvegarde est local** à la VM : il meurt avec elle. Il faut le déporter.
3. **Rien ne surveille la tâche nocturne** : un échec se voit dans `journalctl`, pas dans
   l'appli.
4. **Le serveur lit la zone agent.** Par conception, entrée par entrée, avec confirmation.
5. **Le presse-papiers** est lisible par les autres applications pendant 30 secondes.
6. **Pas de défense contre le hameçonnage** tant qu'il n'y a pas d'extension navigateur : rien
   ne vérifie que le site où tu colles un mot de passe est le bon.
7. **Une extension malveillante dans ton navigateur** voit ce que tu vois. La zone personnelle
   est déchiffrée là.
8. **Mono-utilisateur** : l'inscription se ferme dès qu'un compte existe. Le modèle de données
   sait faire plusieurs comptes, rien d'autre ne le sait.
9. **Le plafond de rotations** porte sur les approbations, pas sur les exécutions.

Les clés de développement exposées pendant la mise en place ont été renouvelées le 2026-09-20 :
coffre de test détruit, `server.key` et `totp.key` regénérées, dépôt de sauvegarde effacé avec
elles, compte et kit de récupération refaits. Plus rien de ce qui a traîné ne sert à quoi que ce
soit.

## Avant d'y mettre de vrais comptes

- [x] Renouveler `server.key` et `totp.key`, et remplacer le kit de récupération du compte de
      test (issue #27). Fait le 2026-09-20.
- [ ] Déporter le dépôt restic hors de la VM, et vérifier que la restauration marche depuis
      l'extérieur.
- [ ] Faire relire la conception par quelqu'un d'extérieur, `crypto.md` en premier.
- [ ] Taguer la `v0.1.0`, pour qu'un signalement puisse dire « sur quelle version ».

## Signaler une faille

Voir [`SECURITY.md`](../SECURITY.md). Jamais par une issue publique.
