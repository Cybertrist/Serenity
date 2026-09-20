import { useCallback, useRef, useState } from "react";
import { Welcome } from "./features/account/screens/Welcome";
import { Login } from "./features/account/screens/Login";
import { Unlock } from "./features/account/screens/Unlock";
import { useSession } from "./app/session";
import { Shell } from "./app/shell/Shell";
import { DataRain } from "./design/DataRain";
import { Skeleton } from "./design";

export function App() {
  const { phase } = useSession();
  const [raining, setRaining] = useState(false);
  const covered = useRef<(() => void) | null>(null);

  /**
   * Starts the fall of data and resolves once the screen is covered — the lock screens await
   * this before handing over, so the vault is mounted behind the rain, not in front of it.
   */
  const open = useCallback(
    () =>
      new Promise<void>((resolve) => {
        covered.current = resolve;
        setRaining(true);
      }),
    [],
  );

  const screen = () => {
    switch (phase) {
      case "booting":
        return (
          <main className="mx-auto max-w-[420px] p-6">
            <Skeleton lines={4} />
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
   * Three fixed slots. The rain has to keep the same position in the tree across the change of
   * phase, otherwise React unmounts it with the lock screen and remounts it over the vault —
   * and the animation plays twice.
   */
  return (
    <>
      {screen()}
      {raining ? (
        <DataRain
          lift={phase === "unlocked"}
          onCovered={() => {
            covered.current?.();
            covered.current = null;
          }}
          onDone={() => {
            setRaining(false);
          }}
        />
      ) : null}
    </>
  );
}
