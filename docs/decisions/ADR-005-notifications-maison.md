# ADR-005 — Notifications maison, sans service tiers

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

Serenity doit prévenir (fuite détectée, rotation à valider, échec de sauvegarde) et proposer
des actions (Approuver / Refuser). Les solutions courantes passent par un intermédiaire :
ntfy (un serveur de plus à maintenir), Firebase Cloud Messaging ou Web Push (les messages
transitent par les serveurs de Google, Mozilla ou Apple). On veut un système **développé par
Serenity**, sans dépendre d'un service externe.

## Décision

- **Côté serveur** : un modèle `Notification` en base (type, gravité, lien vers l'entrée,
  actions possibles, lu / traité), écrit par l'agent et la veille. Aucun secret dedans.
- **Récupération** : `GET /api/notifications?since=<curseur>` renvoie les notifications
  nouvelles depuis le dernier passage (authentifié, à travers `tailscale serve`).
  Pendant que l'appli est ouverte, un flux temps réel (Server-Sent Events sur `/api/events`)
  met l'écran à jour en direct.
- **V1 (PWA)** : centre de notifications dans l'appli (badge, liste, actions).
- **V2 (appli Android native, Kotlin)** : **vérification périodique** avec WorkManager.
  Android réveille l'appli de temps en temps (au mieux toutes les 15 min, parfois plus en
  veille profonde) ; elle interroge le serveur par le tailnet et n'affiche une notification
  système, avec Approuver / Refuser, **que s'il y a du nouveau**.
- **Pas d'icône permanente** : pas de service de premier plan, pas de connexion maintenue.
- ntfy, Firebase Cloud Messaging, UnifiedPush et Web Push sont exclus.

## Conséquences

- Aucun tiers ne voit passer une notification, même vide.
- Délai d'arrivée de 15 min à environ 1 h selon l'état du téléphone : acceptable, car
  l'agent n'agit jamais sur une entrée en mode « validation » sans accord explicite.
- Une notification urgente peut donc arriver en retard ; l'appli affiche tout en direct
  dès qu'elle est ouverte.
- En V1, rien quand la PWA est fermée : on consulte le centre en l'ouvrant.
- Le téléphone doit être connecté au tailnet pour recevoir quoi que ce soit.
- Option possible plus tard, désactivée par défaut : réveil instantané par un « ping » vide
  via Google (FCM), à décider dans un ADR séparé.
