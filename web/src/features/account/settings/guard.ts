import { createContext, useContext, useEffect } from "react";

/**
 * A section can hold the settings open: a new recovery kit on screen is the only copy there
 * will ever be, and a reflex Escape must not throw it away.
 */
export const SettingsGuard = createContext<(held: boolean) => void>(() => undefined);

export function useHoldSettings(held: boolean): void {
  const hold = useContext(SettingsGuard);
  useEffect(() => {
    hold(held);
    return () => {
      hold(false);
    };
  }, [hold, held]);
}
