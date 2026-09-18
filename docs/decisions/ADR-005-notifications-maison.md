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
- **Flux temps réel** : l'api diffuse les nouvelles notifications aux clients connectés
  (Server-Sent Events sur `/api/events`, authentifié par la session), à travers `tailscale serve`.
- **V1 (PWA)** : centre de notifications dans l'appli (badge, liste, actions), mis à jour
  en direct tant que l'appli est ouverte.
- **V2 (appli Android native, Kotlin)** : un service Android maintient la connexion au serveur
  par le tailnet et affiche des notifications système, avec les boutons Approuver / Refuser.
- ntfy est retiré du projet ; Web Push et FCM sont exclus.

## Conséquences

- Aucun tiers ne voit passer une notification, même vide.
- En V1, pas de notification quand l'appli est fermée : on consulte le centre en l'ouvrant.
- En V2, l'appli Android doit garder une connexion ouverte : service de premier plan
  (notification permanente discrète) et exclusion de l'optimisation de batterie. Coût
  batterie à mesurer ; reconnexion automatique et rattrapage des notifications manquées
  à prévoir.
- Le téléphone doit être connecté au tailnet pour recevoir quoi que ce soit.
