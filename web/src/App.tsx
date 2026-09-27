import { motion, useReducedMotion } from "motion/react";
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
  const reduce = useReducedMotion();
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
        // The first paint, while the session is looked up: the mark breathing on the night
        // blue of the lock screen, so the entry screen that follows does not jump.
        return (
          <main
            aria-busy="true"
            className="grid min-h-dvh place-items-center bg-[radial-gradient(70%_55%_at_50%_38%,color-mix(in_oklab,var(--g1)_22%,var(--color-bg)),var(--color-bg)_70%)] [[data-theme=light]_&]:bg-[radial-gradient(70%_55%_at_50%_30%,color-mix(in_oklab,var(--g2)_14%,var(--color-bg)),var(--color-bg)_70%)]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col items-center gap-5"
            >
              <span className="relative h-[72px] w-[72px]">
                <span aria-hidden="true" className="mark-halo" />
                <Logo size={72} className="relative" label="Serenity" />
              </span>
              <span className="h-1 w-16 overflow-hidden rounded-full bg-track">
                <motion.span
                  className="block h-full w-1/2 rounded-full bg-accent"
                  animate={reduce ? {} : { x: ["-100%", "200%"] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                />
              </span>
            </motion.div>
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
