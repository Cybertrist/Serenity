# ADR-001 — Exposer Vaultwarden sur le tailnet

- **Date** : 2026-09-18
- **Statut** : accepté

## Contexte

La mission prévoyait que seuls `web` et `ntfy` soient joignables depuis l'hôte.
Mais Vaultwarden doit être joignable pour créer les comptes, utiliser le coffre
web et connecter les applis Bitwarden (téléphone, extension de navigateur).

## Décision

Vaultwarden est publié sur `127.0.0.1:8081` et exposé **uniquement sur le tailnet**
par `tailscale serve --https=10000`.

`tailscale serve` n'autorise que 3 ports HTTPS (443, 8443, 10000) :
443 pour Serenity, 8443 pour ntfy, 10000 pour Vaultwarden.

## Conséquences

- Les trois ports HTTPS disponibles sont utilisés. Un 4ᵉ service web demanderait
  un autre découpage (sous-chemins derrière nginx, ou une seconde machine Tailscale).
- Vaultwarden reste inaccessible hors du tailnet ; `tailscale funnel` ne doit pas être utilisé.
- La page d'admin reste désactivée hors intervention ponctuelle.
