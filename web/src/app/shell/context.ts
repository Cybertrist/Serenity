import { createContext, useContext } from "react";

export type Tab = "vault" | "codes" | "breaches" | "agent";
/** Sections of the settings dialog, so other screens can open it where they need to. */
export type SettingsSection =
  | "lock"
  | "appearance"
  | "journal"
  | "devices"
  | "watch"
  | "transfer"
  | "trash"
  | "account"
  | "about";

/** Zone filter of the vault list: the sidebar zones drive it, the vault screen reads it. */
export type VaultZone = "all" | "personal" | "agent";

/** The three forms of the app (docs/07-interface.md). */
export type Form = "mobile" | "web" | "desktop";

export interface ShellApi {
  tab: Tab;
  go: (tab: Tab) => void;
  openSettings: (section?: SettingsSection) => void;
  openNotifications: () => void;
  openGuide: () => void;
  /** Entry sheet opened from any tab (e.g. from an alert); null when closed. */
  openedEntry: string | null;
  openEntry: (itemId: string | null) => void;
  /** The "new entry" dialog lives in the shell: Ctrl+N and the palette open it from anywhere. */
  addEntry: () => void;
  /** The command palette (Ctrl+K), optionally with a query already typed. */
  openPalette: (query?: string) => void;
  /** The password generator on its own, outside an entry. */
  openGenerator: () => void;
  vaultZone: VaultZone;
  setVaultZone: (zone: VaultZone) => void;
  /** Locks the vault now (Ctrl+L). */
  lock: () => void;
  /** mobile: tabs at the bottom; web: sidebar in a browser; desktop: sidebar and title bar. */
  form: Form;
  /** Width of the app in pixels, for a screen that lays out its own panes (list + fiche). */
  width: number;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const value = useContext(ShellContext);
  if (!value) throw new Error("Shell missing");
  return value;
}

/** Below this width the app is a phone: tabs at the bottom, fiches in full screen. */
export const WIDE_FROM = 900;
