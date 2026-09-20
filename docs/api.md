# API Serenity

> Page générée par `make api-doc` depuis le schéma OpenAPI : ne pas modifier à la main.

Toutes les routes sont sous `/api`, en JSON. **Accès** : *libre* (sans session), *session*
(session d'appareil de 60 jours), *déverrouillé* (mot de passe maître prouvé depuis moins de
15 min). Aucune réponse ne contient de secret en clair : les entrées et les clés sont des blocs
chiffrés (voir [`crypto.md`](crypto.md)).


## agent

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `POST /api/agent/kill-switch` | session | `KillSwitchIn` |  | Enclencher (session) ou relâcher (déverrouillé) le kill switch |
| `GET /api/agent/policies` | session |  | `PolicyOut` (liste) | Politiques de rotation |
| `GET /api/agent/rotations` | session |  | `RotationOut` (liste) | Rotations en cours ou toutes |
| `POST /api/agent/rotations/{rotation_id}/approve` | déverrouillé |  | `RotationOut` | Approuver une rotation (kill switch, limite/jour) |
| `POST /api/agent/rotations/{rotation_id}/refuse` | déverrouillé |  | `RotationOut` | Refuser : prochaine échéance repoussée d'une période |
| `GET /api/agent/status` | session |  | `AgentStatusOut` | Kill switch, allowlist, limite quotidienne, rotations en cours |
| `PUT /api/vault/items/{item_id}/policy` | déverrouillé | `PolicyIn` | `PolicyOut` | Fréquence et mode de rotation (rappels en zone personnelle) |

## auth

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/auth/keys` | session |  | `KeysOut` | Clés du compte, chiffrées (UK par MEK, AK par UK) |
| `POST /api/auth/lock` | session |  |  | Verrouiller cet appareil |
| `POST /api/auth/login` | libre | `LoginIn` | `LoginOut` | Connexion : clé d'auth + TOTP, session d'appareil de 60 jours |
| `POST /api/auth/logout` | session |  |  | Déconnecter cet appareil |
| `GET /api/auth/me` | session |  | `MeOut` | Compte et session en cours |
| `POST /api/auth/password` | déverrouillé | `PasswordChangeIn` | `SessionOut` | Changer le mot de passe maître (déconnecte les autres appareils) |
| `POST /api/auth/prelogin` | libre | `PreloginIn` | `KdfOut` | Sel et paramètres Argon2id (faux sel stable si compte inconnu) |
| `POST /api/auth/recover/complete` | libre | `RecoverCompleteIn` | `LoginOut` | Récupération : nouveau mot de passe maître et nouveau kit |
| `POST /api/auth/recover/start` | libre | `RecoverStartIn` | `RecoverStartOut` | Récupération : clé de récupération + TOTP |
| `POST /api/auth/recovery-kit` | déverrouillé | `RecoveryKitIn` |  | Régénérer le kit de récupération (mot de passe maître + TOTP) |
| `GET /api/auth/sessions` | session |  | `SessionOut` (liste) | Appareils connectés |
| `DELETE /api/auth/sessions/{session_id}` | déverrouillé |  |  | Déconnecter un appareil à distance |
| `POST /api/auth/signup` | libre | `SignupIn` | `SignupOut` | Création du compte (blocs chiffrés) ; renvoie le TOTP à enrôler |
| `POST /api/auth/signup/confirm` | libre | `ConfirmIn` | `LoginOut` | Activation par le premier code TOTP ; ouvre la session |
| `GET /api/auth/status` | libre |  | `StatusOut` | Les inscriptions sont-elles ouvertes ? |
| `POST /api/auth/unlock` | session | `UnlockIn` | `SessionOut` | Déverrouillage : clé d'auth seule, 15 min glissantes |

## crypto

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/crypto/server-key` | libre |  | `ServerKey` | Clé publique du serveur, pour sceller la clé d'agent |

## events

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/events` | session |  |  | Flux temps réel des notifications (Server-Sent Events) |

## health

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/health` | libre |  |  | Healthcheck (Docker) |

## logs

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/logs` | session |  | `AuditLogOut` (liste) | Journal d'audit (le compte et le système) |

## notifications

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/notifications` | session |  | `NotificationOut` (liste) | Notifications depuis un identifiant (interrogées par l'appli Android) |
| `POST /api/notifications/read-all` | session |  |  | Tout marquer comme lu |
| `POST /api/notifications/{notification_id}/read` | session |  | `NotificationOut` | Marquer une notification comme lue |

## vault

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/vault/items` | session |  | `SyncOut` | Synchronisation : changements depuis un curseur |
| `POST /api/vault/items` | déverrouillé | `CreateIn` | `ItemOut` (liste) | Ajout d'entrées chiffrées (zone personnelle), par lots |
| `PUT /api/vault/items/{item_id}` | déverrouillé | `UpdateIn` | `ItemOut` | Nouvelle révision (409 si modifiée ailleurs) |
| `DELETE /api/vault/items/{item_id}` | déverrouillé |  | `ItemOut` | Mettre à la corbeille (30 jours) |
| `POST /api/vault/items/{item_id}/delegate` | déverrouillé | `ZoneChangeIn` | `ItemOut` | Confier à l'agent (rechiffrée avec AK, confirmation) |
| `GET /api/vault/items/{item_id}/history` | session |  | `RevisionOut` (liste) | 10 dernières versions chiffrées |
| `POST /api/vault/items/{item_id}/reclaim` | déverrouillé | `ZoneChangeIn` | `ItemOut` | Reprendre (rechiffrée avec UK, confirmation) |
| `POST /api/vault/items/{item_id}/restore` | déverrouillé |  | `ItemOut` | Sortir de la corbeille |

## watch

| Route | Accès | Corps | Réponse | Rôle |
|---|---|---|---|---|
| `GET /api/breaches` | session |  | `BreachOut` (liste) | Alertes de la veille |
| `POST /api/breaches/{breach_id}/dismiss` | déverrouillé |  | `BreachOut` | Mettre une alerte de côté |
| `GET /api/watch/emails` | session |  | `EmailsOut` | Adresses surveillées (HIBP) |
| `POST /api/watch/emails` | déverrouillé | `EmailIn` | `EmailsOut` | Ajouter une adresse surveillée |
| `DELETE /api/watch/emails/{email_id}` | déverrouillé |  | `EmailsOut` | Retirer une adresse surveillée |
| `POST /api/watch/report` | déverrouillé | `ReportIn` | `SummaryOut` | Résultat d'un scan du navigateur (identifiants + types) |

## Schémas

- **AgentKeyOut** : `version`, `ak_by_uk`
- **AgentStatusOut** : `kill_switch`, `kill_switch_changed_at`, `allowlist`, `max_rotations_per_day`, `open_rotations`
- **AlertIn** : `item_id`, `kind`
- **AuditLogOut** : `id`, `created_at`, `actor`, `action`, `outcome`, `target_type`, `target_id`, `details`
- **BreachOut** : `id`, `kind`, `item_id`, `source`, `status`, `details`, `first_seen_at`, `last_seen_at`, `resolved_at`
- **ConfirmIn** : `user_id`, `totp`
- **CreateIn** : `items`
- **EmailIn** : `email`
- **EmailOut** : `id`, `email`, `added_at`, `last_checked_at`
- **EmailsOut** : `enabled`, `emails`
- **ItemOut** : `id`, `zone`, `revision`, `block`, `seq`, `created_at`, `updated_at`, `deleted_at`, `purged`
- **KdfIn** : `salt`, `memlimit`, `opslimit`
- **KdfOut** : `salt`, `memlimit`, `opslimit`
- **KeysOut** : `user_id`, `uk_by_mk`, `agent_key`
- **KillSwitchIn** : `engaged`
- **LoginIn** : `username`, `auth_key`, `totp`
- **LoginOut** : `user_id`, `username`, `uk_by_mk`, `agent_key`, `session`
- **MeOut** : `user_id`, `username`, `session`
- **NewItemIn** : `id`, `block`
- **NewPasswordIn** : `kdf`, `auth_key`, `uk_by_mk`
- **NotificationOut** : `id`, `kind`, `breach_id`, `item_id`, `created_at`, `read_at`
- **PasswordChangeIn** : `current_auth_key`, `totp`, `new`
- **PolicyIn** : `frequency_days`, `mode`, `changed_at`
- **PolicyOut** : `item_id`, `frequency_days`, `mode`, `changed_at`, `next_due_at`
- **PreloginIn** : `username`
- **RecoverCompleteIn** : `ticket`, `new`, `recovery_auth_key`, `uk_by_rk`
- **RecoverStartIn** : `username`, `recovery_auth_key`, `totp`
- **RecoverStartOut** : `user_id`, `ticket`, `uk_by_rk`, `agent_key`
- **RecoveryKitIn** : `current_auth_key`, `totp`, `recovery_auth_key`, `uk_by_rk`
- **ReportIn** : `scanned`, `checked`, `alerts`
- **RevisionOut** : `revision`, `zone`, `block`, `created_at`
- **RotationOut** : `id`, `item_id`, `status`, `trigger`, `mode`, `requested_at`, `decided_at`, `finished_at`, `error`
- **ServerKey** : `public_key`, `key_id`
- **SessionOut** : `id`, `device`, `created_at`, `expires_at`, `last_seen_at`, `unlocked_until`, `current`
- **SignupIn** : `user_id`, `username`, `kdf`, `auth_key`, `recovery_auth_key`, `uk_by_mk`, `uk_by_rk`, `ak_by_uk`, `ak_sealed`
- **SignupOut** : `user_id`, `totp_secret`, `totp_uri`
- **StatusOut** : `registration_open`
- **SummaryOut** : `new`, `open`, `resolved`
- **SyncOut** : `seq`, `items`
- **UnlockIn** : `auth_key`
- **UpdateIn** : `base_revision`, `block`
- **ZoneChangeIn** : `base_revision`, `block`, `confirm`
