import { type Icon, RobotIcon, SealWarningIcon, VaultIcon } from "@phosphor-icons/react";
import type { Tab } from "./context";

/**
 * The three screens of the app. The journal is deliberately not here: it is a record you
 * consult, not a place you work in: it lives in the settings, and the agent screen links to it.
 */
export const TABS: { id: Tab; label: string; hint: string; icon: Icon }[] = [
  { id: "vault", label: "Coffre", hint: "Tes comptes, dans leurs deux zones.", icon: VaultIcon },
  {
    id: "breaches",
    label: "Fuites",
    hint: "Ce que la veille a trouvé sur tes comptes.",
    icon: SealWarningIcon,
  },
  {
    id: "agent",
    label: "Agent",
    hint: "Ce qu'il surveille, ce qu'il te propose, comment l'arrêter.",
    icon: RobotIcon,
  },
];
