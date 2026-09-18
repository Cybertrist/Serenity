# 07 — Interface

## Quoi

L'appli web installable (PWA), en React, qui fait **toute la cryptographie de la zone
personnelle dans ton navigateur**.

| Écran | Contenu |
|---|---|
| **Bienvenue** | Création du compte en 3 étapes : identifiant et mot de passe maître, code TOTP, **kit de récupération** (téléchargeable, avec confirmation « je l'ai noté ») |
| **Connexion** | Nouvel appareil, ou tous les 60 jours : mot de passe maître + code |
| **Déverrouillage** | Au quotidien : mot de passe maître seul (fonctionne hors ligne) |
| **Récupération** | Kit + code, nouveau mot de passe maître, **nouveau kit** |
| **Coffre** | « Protégé par toi » et « Confié à l'agent », recherche, ajout avec générateur |
| **Fiche** (panneau glissant) | Copier l'identifiant, afficher / copier le mot de passe (effacé du presse-papiers après 30 s), code TOTP en direct, rotation ou rappel, historique, **Confier à l'agent / Reprendre**, modifier, supprimer |
| **Fuites** | Veille lancée à l'ouverture de l'onglet, une alerte par carte, « Ouvrir » et « Mettre de côté » |
| **Journal** | Filtres Tout / Agent / Toi / Système, regroupé par jour |
| **Agent** | Kill switch, rotations à approuver ou refuser, prochaines rotations, règles |
| **Réglages** | Délai de verrouillage, appareils connectés, adresses surveillées, import Bitwarden, export chiffré, mot de passe maître, déconnexion |

<p>
  <img src="img/coffre.png" alt="Coffre" width="220">
  <img src="img/fiche.png" alt="Fiche d'une entrée" width="220">
  <img src="img/fuites.png" alt="Fuites" width="220">
  <img src="img/agent.png" alt="Agent" width="220">
</p>

## Pourquoi

- **Les clés ne vivent qu'en mémoire** (règle 3) : jamais dans localStorage, IndexedDB ou le
  service worker. Le verrouillage (15 min d'inactivité par défaut, réglable 5 / 15 / 30,
  fermeture de la page, bouton) les efface.
- **Hors ligne** : IndexedDB garde une copie **chiffrée** du coffre (blocs, clés enveloppées, sel).
  Sans réseau, le service worker sert l'appli, et ton mot de passe maître déverrouille ce cache
  localement : lecture seule, jusqu'au retour du réseau.
- **CSP stricte** (`web/security-headers.conf`) : aucun script en ligne, `wasm-unsafe-eval`
  seulement pour libsodium, sorties réseau limitées à Serenity et à Pwned Passwords, polices
  servies localement, pas d'intégration dans une autre page. En-têtes : HSTS, COOP, CORP,
  `no-referrer`, `nosniff`, `Permissions-Policy`.
- **Temps réel** : tant que l'appli est ouverte, les nouvelles alertes et rotations arrivent par
  `/api/events` et mettent l'écran à jour.
- **Charte** respectée : voir [`design.md`](design.md).

## Comment tester

### Tests automatiques (sur la VM)

```bash
make web-test     # lint, types, build de production, tests unitaires
make e2e          # parcours TypeScript contre le vrai serveur
make ui-smoke     # Chromium parcourt tous les écrans (image de production, CSP stricte),
                  # y compris le mode hors ligne ; captures dans web/e2e/shots/
```

`make ui-smoke` échoue à la moindre erreur JavaScript ou violation de CSP. Il tourne aussi en
CI (captures disponibles dans l'artefact `ui-screenshots`).

### En vrai (navigateur, depuis un appareil du tailnet)

1. Sur la VM : `make up`.
2. Ouvre **https://serenity.tail18532b.ts.net** : écran « Connexion ».
3. Connecte-toi avec ton compte (`tristan`, mot de passe maître, code TOTP) : tu retrouves les
   entrées créées avec `make client`.
4. **Installer l'appli** : sur Android (Chrome), menu ⋮ → « Installer l'application » ; sur
   ordinateur, l'icône d'installation dans la barre d'adresse.
5. Essaie : ajouter une entrée avec le générateur, l'ouvrir, copier le mot de passe, la confier
   à l'agent, l'onglet Fuites, le kill switch dans Agent, « Verrouiller maintenant » dans les
   réglages.
6. Hors ligne : verrouille, coupe le réseau (mode avion), rouvre l'appli installée,
   déverrouille : le coffre s'affiche en lecture seule.
