import { createContext, useContext } from "react";

export type Tab = "vault" | "breaches" | "logs" | "agent";

export interface ShellApi {
  tab: Tab;
  go: (tab: Tab) => void;
  openSettings: () => void;
  /** Entry sheet opened from any tab (e.g. from an alert); null when closed. */
  openedEntry: string | null;
  openEntry: (itemId: string | null) => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const value = useContext(ShellContext);
  if (!value) throw new Error("Shell missing");
  return value;
}
