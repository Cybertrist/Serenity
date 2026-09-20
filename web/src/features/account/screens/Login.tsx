import { ArrowRightIcon, LifebuoyIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, ErrorNote, Field, Note } from "../../../design";
import { CodeField } from "../CodeField";
import { login } from "../session";
import { errorText } from "./wording";
import { AuthHead, AuthShell } from "./AuthShell";
import { Recovery } from "./Recovery";

/** Full login: new device, or every 60 days. Master password, then the six-digit code. */
export function Login({ onOpening }: { onOpening: () => Promise<void> }) {
  const session = useSession();
  const [step, setStep] = useState<"mdp" | "code">("mdp");
  const [username, setUsername] = useState(session.username ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  if (recovering)
    return (
      <Recovery
        onCancel={() => {
          setRecovering(false);
        }}
      />
    );

  const toCode = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStep("code");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = username.trim().toLowerCase();
      const { keyring, login: out } = await login(session.api, user, password, code);
      setPassword("");
      setCode("");
      // The vault said yes: the data starts falling, and we only hand over once it has
      // covered the screen.
      setOpening(true);
      await onOpening();
      await session.enter(keyring, out, user);
    } catch (e) {
      // The server never says which of the two was wrong, so neither do we.
      setOpening(false);
      setError(errorText(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      step={step}
      footer={
        step === "mdp" ? (
          <Button
            variant="secondary"
            icon={LifebuoyIcon}
            disabled={opening}
            onClick={() => {
              setRecovering(true);
            }}
          >
            Utiliser mon kit de récupération
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={opening}
            onClick={() => {
              setStep("mdp");
              setCode("");
            }}
          >
            Revenir au mot de passe
          </Button>
        )
      }
    >
      {step === "mdp" ? (
        <>
          <AuthHead
            title="Connexion"
            subtitle="Sur un nouvel appareil, ou tous les 60 jours."
            step={[1, 2]}
          />
          <form className="flex flex-col gap-4" onSubmit={toCode}>
            <Field
              label="Identifiant"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
              autoComplete="username"
              required
            />
            <Field
              label="Mot de passe maître"
              secret
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              autoComplete="current-password"
              required
            />
            <Button type="submit" icon={ArrowRightIcon} disabled={!username.trim() || !password}>
              Continuer
            </Button>
          </form>
          <Note>Ton mot de passe maître est dérivé ici et ne quitte pas cet appareil.</Note>
        </>
      ) : (
        <>
          <AuthHead
            title="La double vérification"
            subtitle="Le code à 6 chiffres de ton appli d'authentification."
            step={[2, 2]}
          />
          <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
            <CodeField
              label="Code à 6 chiffres"
              value={code}
              autoFocus
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button type="submit" busy={busy} disabled={code.length !== 6}>
              Déverrouiller
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
