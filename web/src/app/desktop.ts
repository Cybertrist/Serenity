/**
 * The desktop app (desktop/, Electron) opens this same web client and adds one bridge,
 * `window.serenityDesktop` (desktop/src/preload.js): window controls and two events, never a
 * key or a secret. Its presence is how the client knows it runs in its own window, and must
 * draw its own title bar.
 */
import { useEffect, useState } from "react";

export interface SerenityDesktop {
  /** Node's `process.platform`: "win32", "linux", "darwin". */
  platform: string;
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximized: (callback: (maximized: boolean) => void) => () => void;
  /** Screen locked, machine asleep, session switched: the vault must lock. */
  onLock: (callback: () => void) => () => void;
  server: () => Promise<string | null>;
  setServer: (url: string) => Promise<{ ok: boolean; error?: string }>;
  changeServer: () => void;
}

declare global {
  interface Window {
    serenityDesktop?: SerenityDesktop;
  }
}

export function desktop(): SerenityDesktop | null {
  return typeof window !== "undefined" ? (window.serenityDesktop ?? null) : null;
}

/** Whether the window is maximised, kept in sync with the window manager. */
export function useMaximized(): boolean {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const bridge = desktop();
    if (!bridge) return;
    let alive = true;
    void bridge.isMaximized().then((value) => {
      if (alive) setMaximized(value);
    });
    const off = bridge.onMaximized((value) => {
      setMaximized(value);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  return maximized;
}
