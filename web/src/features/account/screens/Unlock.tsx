import { LockSimpleIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { lockMinutes } from "../../../app/prefs";
import { useSession } from "../../../app/session";
import { Button, ErrorNote, Field } from "../../../design";
import { AuthLayout, errorText } from "./AuthLayout";

/** Daily unlock on a known device: the master password only. Works offline (read-only). */
export function Unlock() {
  const session = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await session.unlock(password);
      setPassword("");
    } catch (e) {
      setError(
        e instanceof Error && e.name === "CryptoError"
          ? "Mot de passe maître incorrect."
          : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const name = session.username ?? "";
  return (
    <AuthLayout
      icon={LockSimpleIcon}
      title={name ? `Bon retour, ${name.split("@")[0] ?? name}.` : "Bon retour."}
      subtitle="Ton coffre est verrouillé. Tout reste chiffré sur ton appareil."
      footer={
        <>
          <button type="button" className="min-h-11 text-accent" onClick={session.showLogin}>
            Changer de compte
          </button>
          <span className="text-muted">
            Verrouillage auto après {lockMinutes()} min sans activité.
          </span>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <Field
          label="Mot de passe maître"
          secret
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          autoComplete="current-password"
          autoFocus
          required
        />
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button type="submit" busy={busy}>
          Déverrouiller
        </Button>
      </form>
    </AuthLayout>
  );
}
