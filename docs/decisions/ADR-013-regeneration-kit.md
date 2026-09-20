# ADR-013 : Régénérer le kit de récupération depuis les réglages

- **Date** : 2026-09-20
- **Statut** : accepté

## Contexte

Le kit de récupération est affiché **une seule fois**, à la création du compte. Jusqu'ici, le
seul moyen d'en obtenir un neuf était de faire une vraie récupération depuis l'écran de
connexion : elle termine par un nouveau kit (`docs/crypto.md` §7.8), mais elle impose de changer
de mot de passe maître et déconnecte tous les appareils. Pour les deux cas réels (la feuille a
été perdue, ou quelqu'un a pu la voir), c'est une procédure disproportionnée, et les réglages se
contentaient d'un encart qui renvoyait à cette gymnastique.

Ce qu'il fallait décider : la preuve demandée, ce que l'opération a le droit de toucher, et ce
qui se passe si l'utilisateur ferme l'onglet entre la révocation de l'ancien kit et la lecture du
nouveau.

## Décision

1. **Une opération à part, dans les réglages** (`POST /api/auth/recovery-kit`, §7.11). Elle ne
   remplace que le hachage de RAK et `UK_par_RWK`. UK ne change pas : **aucune entrée n'est
   rechiffrée**, la zone agent n'est pas touchée.
2. **Preuve : mot de passe maître + code TOTP**, comme un changement de mot de passe. Une session
   ouverte et déverrouillée ne suffit pas : un onglet laissé ouvert ne doit pas permettre de se
   fabriquer un accès durable au coffre, qui survivrait à un changement de mot de passe.
3. **Les sessions restent ouvertes.** Ni AuthKey ni UK ne changent, aucun autre appareil n'est
   concerné : les déconnecter n'apporterait rien et ferait croire à un incident.
4. **L'ancien kit meurt à l'écriture serveur, et l'avertissement vient avant.** Entre l'écriture
   et la lecture du nouveau kit, fermer l'onglet laisse le compte sans voie de secours (le mot de
   passe maître, lui, fonctionne toujours). C'est assumé : un dialogue dit exactement cela avant
   la saisie, et le kit affiché se télécharge ou se copie d'un bouton.
5. **La ligne d'audit `auth.recovery.rotate`** est écrite en cas de succès comme en cas d'échec,
   avec la même limitation de tentatives que le changement de mot de passe.

## Alternatives écartées

- **Un « kit en attente » côté serveur**, l'ancien restant valable jusqu'à confirmation : deux
  enveloppes de UK valides en même temps, donc deux clés d'entrée au coffre, un état transitoire
  à faire expirer et une migration de schéma : beaucoup de surface pour une fenêtre de quelques
  secondes.
- **Faire retaper deux groupes du nouveau kit avant de basculer** : impossible de perdre les deux
  kits, mais le client garde RK' en mémoire pendant la saisie, et c'est une étape de plus pour
  une opération déjà rare.
- **Réafficher le kit existant** : impossible, et c'est la propriété qu'on veut. Le serveur n'en
  détient que le hachage Argon2id de RAK.

## Conséquences

- `docs/crypto.md` gagne le §7.11 ; la hiérarchie des clés, les primitives et les vecteurs de
  test partagés sont inchangés.
- Le client de test (`serenity.devclient`) et les tests bout-en-bout TypeScript ↔ Python
  couvrent le flux : l'ancien kit ne fonctionne plus, le nouveau ouvre le même coffre, la session
  survit.
- L'écran de réglages remplace l'encart explicatif par le parcours complet ; l'affichage du kit
  est désormais un composant partagé avec la création de compte.
- Le kit de secours du compte de test pourra être régénéré depuis l'interface lors de la rotation
  des secrets de développement (phase 8, issue #27).
