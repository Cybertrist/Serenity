# ADR-018 : Scan local complet, question au réseau une fois par jour

- **Date** : 2026-09-20
- **Statut** : accepté

## Contexte

L'onglet Fuites lançait un scan complet à chaque montage du composant. Un scan interroge Pwned
Passwords une fois par préfixe d'empreinte distinct, et une réponse pèse environ 100 ko à cause
du bourrage `Add-Padding` qui masque la taille (mesuré : 101 330 octets). Sur cinq entrées cela
ne se voit pas. Sur 500, les préfixes ne se recoupent quasiment jamais : environ 500 requêtes et
50 Mo, à chaque fois qu'on ouvre l'onglet. Le cache de préfixes existait déjà mais une instance
neuve était créée à chaque scan, donc il ne servait jamais deux fois.

Deuxième problème du même écran : c'est le navigateur qui trouve la fuite, et rien ne réveillait
l'agent. Une entrée confiée à l'agent dont le mot de passe venait d'être trouvé dans une fuite
attendait le passage horaire, soit jusqu'à une heure.

La contrainte qui commande tout : **le serveur ne peut pas faire ce scan à la place du
navigateur**. Il ne sait pas déchiffrer la zone personnelle. Il vérifie la zone agent toutes les
6 h, le reste n'existe que dans un navigateur déverrouillé.

## Décision

1. **Séparer ce qui est gratuit de ce qui coûte.** Les contrôles locaux (réutilisé, faible,
   ancien) portent toujours sur tout le coffre : ils sont instantanés, et « réutilisé » ne se
   calcule qu'en comparant toutes les entrées entre elles. Seule la question à Pwned Passwords
   devient incrémentale.
2. **Le serveur tient le calendrier, pas le navigateur.** Une table `item_scan` retient, par
   entrée, la révision vérifiée et la date. `GET /api/watch/plan` répond ce qui reste à
   demander : jamais vérifié, révision changée, ou plus de 24 heures. Le navigateur n'a rien à
   mémoriser, et la cadence vaut pour tous les appareils : ce que le PC a vérifié ce matin, le
   téléphone ne le redemande pas ce soir.
3. **Deux listes dans le rapport.** `scanned` est tout ce que le scan a regardé, `pwned_scanned`
   ce qu'il a vraiment demandé au réseau. Le serveur ne ferme une alerte « mot de passe exposé »
   que pour les entrées de la seconde liste, et refuse d'en ouvrir une pour une entrée qui n'y
   est pas.
4. **Une fuite nouvelle sur une entrée agent programme la rotation tout de suite**, dans la route
   du rapport, avec le kill switch vérifié comme partout ailleurs. Le passage horaire de l'agent
   reste, comme filet.
5. **Le cache de préfixes vit le temps de la session déverrouillée** et meurt avec les clés.

## Conséquences

- Rouvrir l'onglet Fuites dix fois dans la journée n'envoie plus rien sur le réseau. Un compte
  ajouté à l'instant est vérifié à l'ouverture suivante, sans attendre 24 heures.
- Le serveur apprend quand une entrée a été vérifiée et à quelle révision. Il connaissait déjà
  les révisions et les dates de modification : rien de neuf ne lui est confié, et surtout aucun
  mot de passe ni aucune empreinte.
- Une entrée peut porter une alerte « mot de passe exposé » vieille d'un jour. C'est assumé :
  une fuite ne se répare pas toute seule, et le jour où le mot de passe change, la révision bouge
  et la question est reposée immédiatement.
- Le délai est réglable (`SERENITY_WATCH_RECHECK_HOURS`), et le bouton « Vérifier maintenant »
  ignore le plan.

## Écarté

- **Retenir la date dans le navigateur** (`localStorage`) : chaque appareil aurait refait le
  travail des autres, et la mémoire aurait disparu au premier nettoyage du navigateur.
- **Ne scanner que les entrées du plan, localement aussi** : une réutilisation croisée avec une
  entrée hors du plan serait devenue invisible, et l'alerte correspondante fermée à tort.
- **Baisser l'intervalle du planificateur** pour rattraper la fuite plus vite : cela aurait
  donné un retard moyen plus court, pas un retard nul, et fait tourner l'agent pour rien.
