import { SignInIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, ErrorNote, Field } from "../../../design";
import { login } from "../session";
import { AuthLayout, errorText } from "./AuthLayout";
import { Recovery } from "./Recovery";

/** Full login: new device, or every 60 days. Master password + TOTP. */
export function Login() {
  const session = useSession();
  const [username, setUsername] = useState(session.username ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = username.trim().toLowerCase();
      const { keyring, login: out } = await login(session.api, user, password, code);
      setPassword("");
      await session.enter(keyring, out, user);
    } catch (e) {
      setError(errorText(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      icon={SignInIcon}
      title="Connexion"
      subtitle="Sur un nouvel appareil, ou tous les 60 jours : ton mot de passe maître et un code."
      footer={
        <button
          type="button"
          className="min-h-11 text-accent"
          onClick={() => {
            setRecovering(true);
          }}
        >
          Utiliser mon kit de récupération
        </button>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
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
        <Field
          label="Code de ton appli d'authentification"
          inputMode="numeric"
          maxLength={6}
          mono
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
          }}
          autoComplete="one-time-code"
          required
        />
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button type="submit" busy={busy} disabled={code.length !== 6}>
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
}
