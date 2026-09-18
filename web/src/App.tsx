import { Welcome } from "./features/account/screens/Welcome";
import { Login } from "./features/account/screens/Login";
import { Unlock } from "./features/account/screens/Unlock";
import { useSession } from "./app/session";
import { Shell } from "./app/shell/Shell";
import { Skeleton } from "./design";

export function App() {
  const { phase } = useSession();
  switch (phase) {
    case "booting":
      return (
        <main className="mx-auto max-w-[480px] p-6">
          <Skeleton lines={4} />
        </main>
      );
    case "welcome":
      return <Welcome />;
    case "login":
      return <Login />;
    case "locked":
      return <Unlock />;
    case "unlocked":
      return <Shell />;
  }
}
