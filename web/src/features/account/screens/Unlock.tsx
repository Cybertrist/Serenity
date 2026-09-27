import { ArrowsLeftRightIcon, LifebuoyIcon, LockOpenIcon } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { lockMinutes } from "../../../app/prefs";
import { useSession } from "../../../app/session";
import { Button, ErrorNote, Field } from "../../../design";
import { errorText } from "./wording";
import { AuthShell } from "./AuthShell";
import { Recovery } from "./Recovery";

/** "tristan.j@exemple.fr" greets "Tristan.j": the name before the at sign, capitalised. */
function firstName(username: string): string {
  const name = username.split("@")[0] ?? username;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Daily unlock on a known device: the master password only. Works offline (read-only). */
export function Unlock({ onOpening }: { onOpening: () => Promise<void> }) {
  const session = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const played = useRef(false);

  if (recovering)
    return (
      <Recovery
        username={session.username ?? ""}
        onCancel={() => {
          setRecovering(false);
        }}
      />
    );

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
          ? "Ce n'est pas le bon mot de passe. Prends ton temps."
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
      halo
      greeting={
        <>
          <p className="m-0 text-center font-display text-[22px] font-bold tracking-[-0.01em]">
            {name ? `Bon retour, ${firstName(name)}.` : "Bon retour."}
          </p>
          <p className="m-0 text-center text-[13.5px] text-muted">
            Ton coffre est verrouillé. Tout reste chiffré ici.
          </p>
        </>
      }
      footer={
        <>
          <div className="flex flex-wrap items-center justify-center gap-x-5">
            <Button
              variant="link"
              icon={LifebuoyIcon}
              disabled={opening}
              onClick={() => {
                setRecovering(true);
              }}
            >
              Oublié ? Utilise ton kit
            </Button>
            <Button
              variant="link"
              icon={ArrowsLeftRightIcon}
              disabled={opening}
              onClick={session.showLogin}
            >
              Changer de compte
            </Button>
          </div>
          <p className="m-0 text-center text-[12px] text-faint">
            Il se referme seul après {lockMinutes()} min sans activité.
          </p>
        </>
      }
    >
      <form className="flex flex-col gap-3.5" onSubmit={(e) => void submit(e)}>
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
        <Button
          type="submit"
          size="lg"
          icon={LockOpenIcon}
          busy={busy}
          disabled={!password || opening}
        >
          Déverrouiller
        </Button>
      </form>
    </AuthShell>
  );
}
