import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { lockMinutes } from "../../../app/prefs";
import { useSession } from "../../../app/session";
import { Button, ErrorNote, Field } from "../../../design";
import { errorText } from "./wording";
import { AuthHead, AuthShell } from "./AuthShell";

/** Daily unlock on a known device: the master password only. Works offline (read-only). */
export function Unlock({ onOpening }: { onOpening: () => Promise<void> }) {
  const session = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const played = useRef(false);

  /** Runs once the password is proven, before the vault takes the screen. */
  const play = async () => {
    if (played.current) return;
    played.current = true;
    setOpening(true);
    await onOpening();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await session.unlock(password, play);
      setPassword("");
    } catch (e) {
      played.current = false;
      setOpening(false);
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
    <AuthShell
      step="unlock"
      footer={
        <>
          <Button
            variant="secondary"
            icon={ArrowsLeftRightIcon}
            disabled={opening}
            onClick={session.showLogin}
          >
            Changer de compte
          </Button>
          <p className="m-0 text-center text-caption text-muted">
            Verrouillage automatique après {lockMinutes()} min sans activité.
          </p>
        </>
      }
    >
      <AuthHead
        title={name ? `Bon retour, ${name.split("@")[0] ?? name}.` : "Bon retour."}
        subtitle="Ton coffre est verrouillé. Tout reste chiffré sur cet appareil."
      />
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
        <Button type="submit" busy={busy} disabled={!password || opening}>
          Déverrouiller
        </Button>
      </form>
    </AuthShell>
  );
}
