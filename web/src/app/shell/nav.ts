import {
  ClockCountdownIcon,
  type Icon,
  RobotIcon,
  SealWarningIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import type { Tab } from "./context";

/**
 * The four screens of the app. The journal is deliberately not here: it is a record you
 * consult, not a place you work in: it lives in the settings, and the agent screen links to it.
 *
 * Codes sits next to the vault because it is the same data seen for another job: the vault is
 * where you manage an account, Codes is where you grab a number in two seconds.
 */
export const TABS: { id: Tab; label: string; hint: string; icon: Icon }[] = [
  { id: "vault", label: "Coffre", hint: "Tes comptes, dans leurs deux zones.", icon: VaultIcon },
  {
    id: "codes",
    label: "Codes",
    hint: "Tes codes à deux facteurs, calculés sur cet appareil.",
    icon: ClockCountdownIcon,
  },
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
