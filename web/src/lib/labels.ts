/** French labels for alerts, rotations and audit actions. */
import type { Tone } from "../design";

export const BREACH_LABELS: Record<string, { title: string; hint: string; tone: Tone }> = {
  pwned_password: {
    title: "Mot de passe exposé",
    hint: "Vu dans une fuite connue. Change-le dès que possible.",
    tone: "crit",
  },
  reused: { title: "Mot de passe réutilisé", hint: "Le même sur plusieurs comptes.", tone: "warn" },
  weak: { title: "Mot de passe faible", hint: "Trop court ou trop simple.", tone: "warn" },
  old: { title: "Mot de passe ancien", hint: "Pas changé depuis plus d'un an.", tone: "warn" },
  email_breach: {
    title: "Adresse dans une fuite",
    hint: "Change le mot de passe de ce site.",
    tone: "crit",
  },
};

export const ROTATION_LABELS: Record<string, string> = {
  scheduled: "à valider",
  approved: "approuvée",
  refused: "refusée",
  in_progress: "en cours",
  succeeded: "réussie",
  failed: "échouée",
  rolled_back: "annulée",
  cancelled: "annulée",
};

export const TRIGGER_LABELS: Record<string, string> = {
  schedule: "échéance",
  breach: "après une fuite",
  manual: "à ta demande",
};

const ACTIONS: Record<string, string> = {
  "app.start": "Serenity a démarré",
  "agent.start": "L'agent a démarré",
  "agent.stop": "L'agent s'est arrêté",
  "agent.server_key.published": "Clé publique du serveur publiée",
  "agent.watch": "Veille de l'agent",
  "agent.schedule": "Échéances de l'agent",
  "agent.reminder": "Rappel de changement",
  "agent.rotation.schedule": "Rotation planifiée",
  "agent.rotation.approve": "Rotation approuvée",
  "agent.rotation.refuse": "Rotation refusée",
  "agent.rotation.execute": "Rotation exécutée",
  "agent.policy.set": "Politique de rotation réglée",
  "agent.kill_switch.engage": "Kill switch enclenché",
  "agent.kill_switch.release": "Agent relancé",
  "auth.signup": "Compte créé",
  "auth.signup.confirm": "Compte activé",
  "auth.login": "Connexion",
  "auth.unlock": "Déverrouillage",
  "auth.lock": "Verrouillage",
  "auth.logout": "Déconnexion",
  "auth.password.change": "Mot de passe maître changé",
  "auth.recover.start": "Récupération commencée",
  "auth.recover.complete": "Récupération terminée",
  "auth.session.revoke": "Appareil déconnecté",
  "admin.totp.reset": "TOTP réinitialisé",
  "vault.item.create": "Entrée ajoutée",
  "vault.item.import": "Import d'entrées",
  "vault.item.update": "Entrée modifiée",
  "vault.item.trash": "Entrée à la corbeille",
  "vault.item.restore": "Entrée restaurée",
  "vault.item.delegate": "Entrée confiée à l'agent",
  "vault.item.reclaim": "Entrée reprise",
  "vault.item.pending": "Nouveau mot de passe en attente",
  "vault.item.pending.discarded": "Mot de passe en attente abandonné",
  "vault.item.rotated": "Mot de passe changé par l'agent",
  "vault.trash.purge": "Corbeille vidée",
  "watch.scan": "Veille des fuites",
  "watch.dismiss": "Alerte mise de côté",
  "watch.email.add": "Adresse surveillée ajoutée",
  "watch.email.remove": "Adresse surveillée retirée",
};

const OUTCOMES: Record<string, string> = {
  failure: "échec",
  locked: "bloqué",
  skipped: "non lancé",
  pending: "en attente",
};

export function actionLabel(action: string, outcome: string): string {
  const base = ACTIONS[action] ?? action;
  const suffix = OUTCOMES[outcome];
  return suffix ? `${base} · ${suffix}` : base;
}

export function notificationText(kind: string, name: string): string {
  if (kind === "rotation.due") return `${name} : rotation à valider`;
  if (kind === "reminder.due") return `${name} : pense à changer ce mot de passe`;
  if (kind === "rotation.done") return `${name} : mot de passe changé par l'agent`;
  if (kind === "rotation.failed") return `${name} : rotation annulée, rien n'a changé`;
  if (kind === "rotation.manual") return `${name} : rotation à vérifier toi-même`;
  return `${name} : nouvelle alerte`;
}
