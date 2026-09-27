import { ArrowLeftIcon, ArrowRightIcon, LifebuoyIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, ErrorNote, Field, Note, useMood } from "../../../design";
import type { Keyring } from "../../../vault/keyring";
import { CodeField } from "../CodeField";
import { recover } from "../credentials";
import { RecoveryKitReveal } from "../RecoveryKitPanel";
import type { LoginPayload } from "../types";
import { errorText, passwordHint } from "./wording";
import { AuthHead, AuthShell } from "./AuthShell";

const STEPS = ["Preuve", "Mot de passe", "Nouveau kit"] as const;

/**
 * Recovery with the kit (docs/crypto.md §7.8): a new master password and a NEW kit. Two short
 * forms rather than one long one: what proves it is you, then what replaces the password.
 */
export function Recovery({
  onCancel,
  username: known = "",
}: {
  onCancel: () => void;
  /** Filled in when the device already knows who it belongs to. */
  username?: string;
}) {
  const session = useSession();
  const [stage, setStage] = useState<"proof" | "password">("proof");
  const [username, setUsername] = useState(known);
  const [kit, setKit] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    keyring: Keyring;
    kit: string;
    login: LoginPayload;
  } | null>(null);
  useMood(result ? "leak" : null);

  const next = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStage("password");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe diffèrent.");
      return;
    }
    setBusy(true);
    try {
      const out = await recover(session.api, username.trim().toLowerCase(), kit, code, password);
      setResult({ keyring: out.keyring, kit: out.recoveryKit, login: out.login });
      setPassword("");
      setConfirm("");
    } catch (e) {
      // What is wrong is on the first form (kit, code, name): back there, with the reason.
      setStage("proof");
      setCode("");
      setError(
        e instanceof Error && e.name === "CryptoError"
          ? "Clé de récupération invalide (faute de frappe ?)."
          : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  };

  if (result)
    return (
      <AuthShell step="kit" wide halo>
        <AuthHead
          title="Ton nouveau kit"
          subtitle="L'ancien ne fonctionne plus. Garde celui-ci à l'abri avant d'ouvrir ton coffre."
          steps={{ names: STEPS, current: 3 }}
        />
        <Note tone="warn">Tes autres appareils ont été déconnectés.</Note>
        <RecoveryKitReveal
          kit={result.kit}
          username={result.login.username}
          confirmLabel="Ouvrir mon coffre"
          onConfirm={() => void session.enter(result.keyring, result.login, result.login.username)}
        />
      </AuthShell>
    );

  return (
    <AuthShell
      step={`recuperation-${stage}`}
      footer={
        <Button
          variant="link"
          icon={ArrowLeftIcon}
          onClick={() => {
            if (stage === "password") setStage("proof");
            else onCancel();
          }}
        >
          {stage === "password" ? "Revenir au kit" : "Retour"}
        </Button>
      }
    >
      {stage === "proof" ? (
        <>
          <AuthHead
            title="Récupération"
            subtitle="Ton kit et un code prouvent que c'est toi. Ensuite, tu choisis un nouveau mot de passe maître."
            steps={{ names: STEPS, current: 1 }}
          />
          <form className="flex flex-col gap-4" onSubmit={next}>
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
              label="Clé de récupération"
              mono
              placeholder="XXXX-XXXX-…"
              value={kit}
              onChange={(e) => {
                setKit(e.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <CodeField
              label="Code à 6 chiffres"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button
              type="submit"
              size="lg"
              icon={ArrowRightIcon}
              disabled={!username.trim() || !kit.trim() || code.length !== 6}
            >
              Continuer
            </Button>
          </form>
        </>
      ) : (
        <>
          <AuthHead
            title="Nouveau mot de passe maître"
            subtitle="Il remplace l'ancien. Tout se passe ici, sur cet appareil."
            steps={{ names: STEPS, current: 2 }}
          />
          <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
            <Field
              label="Nouveau mot de passe maître"
              secret
              hint={passwordHint(password)}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              autoComplete="new-password"
              autoFocus
              required
              minLength={12}
            />
            <Field
              label="Confirme-le"
              secret
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
              }}
              autoComplete="new-password"
              required
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button type="submit" size="lg" icon={LifebuoyIcon} busy={busy}>
              Récupérer mon coffre
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
