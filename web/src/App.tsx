import { useCallback, useEffect, useRef, useState } from "react";
import { Welcome } from "./features/account/screens/Welcome";
import { Login } from "./features/account/screens/Login";
import { Unlock } from "./features/account/screens/Unlock";
import { desktop } from "./app/desktop";
import { useSession } from "./app/session";
import { Shell } from "./app/shell/Shell";
import { Logo, Opening, resetMood } from "./design";

export function App() {
  const session = useSession();
  const { phase } = session;
  const [opening, setOpening] = useState(false);
  const covered = useRef<(() => void) | null>(null);

  /**
   * Starts the unlock moment and resolves once the lock screen is covered. The lock screens
   * await this before handing over, so the vault is mounted behind the veil, not in front of it.
   */
  const open = useCallback(
    () =>
      new Promise<void>((resolve) => {
        covered.current = resolve;
        setOpening(true);
      }),
    [],
  );

  // A closed vault has no mood: back to the calm blue of the lock screen.
  useEffect(() => {
    if (phase !== "unlocked") resetMood();
  }, [phase]);

  // The desktop app locks the vault with the machine (screen locked, sleep, session switched).
  const lock = useRef(session.lock);
  lock.current = session.lock;
  const unlocked = useRef(false);
  unlocked.current = phase === "unlocked";
  useEffect(() => {
    const bridge = desktop();
    if (!bridge) return;
    document.documentElement.dataset.desktop = bridge.platform;
    return bridge.onLock(() => {
      if (unlocked.current) void lock.current();
    });
  }, []);

  const screen = () => {
    switch (phase) {
      case "booting":
        return (
          <main className="grid min-h-dvh place-items-center">
            <Logo size={56} className="animate-pulse opacity-70" label="Serenity" />
          </main>
        );
      case "welcome":
        return <Welcome />;
      case "login":
        return <Login onOpening={open} />;
      case "locked":
        return <Unlock onOpening={open} />;
      case "unlocked":
        return <Shell />;
    }
  };

  /*
   * Three fixed slots. The veil has to keep the same position in the tree across the change of
   * phase, otherwise React unmounts it with the lock screen and remounts it over the vault,
   * and the moment plays twice.
   */
  return (
    <>
      {screen()}
      {opening ? (
        <Opening
          lift={phase === "unlocked"}
          onCovered={() => {
            covered.current?.();
            covered.current = null;
          }}
          onDone={() => {
            setOpening(false);
          }}
        />
      ) : null}
    </>
  );
}
