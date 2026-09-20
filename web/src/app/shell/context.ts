import { createContext, useContext } from "react";

export type Tab = "vault" | "breaches" | "agent";
/** Sections of the settings dialog, so other screens can open it where they need to. */
export type SettingsSection =
  "lock" | "journal" | "devices" | "watch" | "transfer" | "trash" | "account";

export interface ShellApi {
  tab: Tab;
  go: (tab: Tab) => void;
  openSettings: (section?: SettingsSection) => void;
  openNotifications: () => void;
  openGuide: () => void;
  /** Entry sheet opened from any tab (e.g. from an alert); null when closed. */
  openedEntry: string | null;
  openEntry: (itemId: string | null) => void;
  /** The "new entry" dialog lives in the shell: the button that opens it floats over the app. */
  addEntry: () => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const value = useContext(ShellContext);
  if (!value) throw new Error("Shell missing");
  return value;
}
