# ADR-008 : Comptes, inscription unique, verrouillage progressif, client de test

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

La phase 3 met en œuvre `docs/crypto.md` §7 côté serveur et client. Plusieurs choix
d'implémentation ne relèvent pas de la cryptographie.

## Décision

- **Inscription** : ouverte tant qu'aucun compte n'est actif (V1 mono-utilisateur). Un compte
  reste « en attente » 15 min, jusqu'au premier code TOTP.
- **Verrouillage progressif** par clé (`login:<identifiant>`, `unlock:<compte>`,
  `password:<compte>`, `recover:<identifiant>`, `signup:<compte>`) : 5 échecs → 1, 2, 4… min,
  plafond 24 h, oubli après 24 h sans échec. Les identifiants inconnus sont limités aussi.
- **Clés d'auth hachées** avec `crypto_pwhash_str` (Argon2id, 64 Mio, 3 passes), et un hachage
  factice pour les comptes inconnus (temps de réponse constant).
- **TOTP** : secret chiffré avec la clé TOTP du serveur, dernier pas utilisé mémorisé.
- **`GET /api/auth/keys`** renvoie à un appareil connecté ses clés chiffrées (UK par MEK, AK par
  UK) : il peut se déverrouiller après un rechargement de page sans stocker ces blocs.
- **Client de référence en Python** (`serenity.devclient`) : sert aux tests de l'API et, via
  `make client`, aux essais manuels avant l'interface.
- **Test de bout en bout** (`make e2e`, CI) : le client TypeScript contre le vrai serveur,
  lancé par `tests/e2e_server.py` avec une horloge TOTP de test. Ce serveur n'est pas dans
  l'image de production.

## Conséquences

- Un deuxième compte demandera d'ouvrir explicitement les inscriptions (hors V1).
- Un attaquant peut verrouiller temporairement la connexion d'un identifiant connu en échouant
  exprès ; le tailnet limite qui peut essayer.
- Le client Python et le client TypeScript doivent rester alignés : le test de bout en bout et
  la vérification croisée crypto le garantissent.
