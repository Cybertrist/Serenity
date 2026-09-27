import {
  ClockCountdownIcon,
  type Icon,
  SlidersHorizontalIcon,
  SparkleIcon,
  TargetIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import type { Tab } from "./context";

/**
 * The four screens of the app, with their "go to" key (G then the letter). The journal is not
 * here: it is a record you consult, it lives in the settings and the agent screen links to it.
 *
 * Codes sits next to the vault because it is the same data seen for another job: the vault is
 * where you manage an account, Codes is where you grab a number in two seconds.
 */
export const TABS: {
  id: Tab;
  label: string;
  long: string;
  hint: string;
  icon: Icon;
  keys: string;
}[] = [
  {
    id: "vault",
    label: "Coffre",
    long: "Coffre",
    hint: "Tes comptes, dans leurs deux zones.",
    icon: VaultIcon,
    keys: "g v",
  },
  {
    id: "codes",
    label: "Codes",
    long: "Codes 2FA",
    hint: "Tes codes à deux facteurs, calculés sur cet appareil.",
    icon: ClockCountdownIcon,
    keys: "g c",
  },
  {
    id: "breaches",
    label: "Fuites",
    long: "Fuites",
    hint: "Ce que la veille a trouvé sur tes comptes.",
    icon: TargetIcon,
    keys: "g f",
  },
  {
    id: "agent",
    label: "Agent",
    long: "Agent",
    hint: "Ce qu'il surveille, ce qu'il te propose, comment l'arrêter.",
    icon: SparkleIcon,
    keys: "g a",
  },
];

/**
 * The settings, a screen of their own: the last tab on a phone, at the foot of the sidebar
 * when wide. Ctrl+, goes there.
 */
export const SETTINGS_TAB = {
  id: "settings",
  label: "Réglages",
  long: "Réglages",
  hint: "Ce coffre, ses appareils et la façon dont il se protège.",
  icon: SlidersHorizontalIcon,
  keys: "mod+,",
} as const satisfies {
  id: Tab;
  label: string;
  long: string;
  hint: string;
  icon: Icon;
  keys: string;
};
