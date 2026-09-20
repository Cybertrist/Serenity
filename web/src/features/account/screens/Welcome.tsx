import { ArrowRightIcon, CheckCircleIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, Card, ErrorNote, Field, Note } from "../../../design";
import { CodeField } from "../CodeField";
import { RecoveryKitPanel } from "../RecoveryKitPanel";
import { signup, type PendingSignup } from "../signup";
import { errorText, passwordHint } from "./wording";
import { AuthHead, AuthShell } from "./AuthShell";

/** Account creation: identity and master password, TOTP enrolment, recovery kit. */
export function Welcome() {
  const session = useSession();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [noted, setNoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<(() => Promise<void>) | null>(null);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe diffèrent.");
      return;
    }
    setBusy(true);
    try {
      setPending(await signup(session.api, username.trim().toLowerCase(), password));
      setPassword("");
      setConfirm("");
      setStep(2);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const activate = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    setError(null);
    setBusy(true);
    try {
      const { keyring, login } = await pending.confirm(code);
      setDone(() => () => session.enter(keyring, login, login.username));
      setStep(3);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const kit = pending?.recoveryKit ?? "";

  return (
    <AuthShell step={`creation-${String(step)}`}>
      {step === 1 ? (
        <>
          <AuthHead
            title="Bienvenue."
            subtitle="Crée ton coffre. Ton mot de passe maître ne quitte jamais cet appareil."
            step={[1, 3]}
          />
          <form className="flex flex-col gap-4" onSubmit={(e) => void create(e)}>
            <Field
              label="Identifiant"
              hint="Un nom simple ou ton adresse e-mail."
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
              hint={passwordHint(password)}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              autoComplete="new-password"
              required
              minLength={12}
            />
            <Field
              label="Confirme le mot de passe maître"
              secret
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
              }}
              autoComplete="new-password"
              required
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button type="submit" icon={ArrowRightIcon} busy={busy}>
              Continuer
            </Button>
          </form>
        </>
      ) : null}

      {step === 2 && pending ? (
        <>
          <AuthHead
            title="La double vérification"
            subtitle="Ajoute Serenity dans ton appli d'authentification."
            step={[2, 3]}
          />
          <Card className="flex flex-col gap-2">
            <p className="m-0 text-caption text-muted">
              Clé à saisir dans l'appli (type : basé sur le temps)
            </p>
            <p
              data-totp-secret
              className="m-0 select-all break-all font-mono text-body tracking-wider"
            >
              {(pending.totpSecret.match(/.{1,4}/g) ?? []).join(" ")}
            </p>
            <a href={pending.totpUri} className="min-h-11 text-body text-accent">
              Ouvrir dans l'appli d'authentification
            </a>
          </Card>
          <form className="flex flex-col gap-4" onSubmit={(e) => void activate(e)}>
            <CodeField
              label="Code à 6 chiffres"
              value={code}
              autoFocus
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button type="submit" icon={ShieldCheckIcon} busy={busy} disabled={code.length !== 6}>
              Vérifier
            </Button>
          </form>
          <Note>Le code sera redemandé sur un nouvel appareil, puis tous les 60 jours.</Note>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <AuthHead
            title="Ton kit de récupération"
            subtitle="La seule façon de rouvrir ton coffre si tu oublies ton mot de passe maître."
            step={[3, 3]}
          />
          <RecoveryKitPanel kit={kit} username={username} />
          <Note tone="warn">
            Il ne sera plus jamais affiché. Note-le sur papier ou garde le fichier hors ligne.
          </Note>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
            <input
              type="checkbox"
              checked={noted}
              onChange={(e) => {
                setNoted(e.target.checked);
              }}
              className="h-[22px] w-[22px] accent-accent"
            />
            Je l'ai noté dans un endroit sûr.
          </label>
          <Button icon={CheckCircleIcon} disabled={!noted || !done} onClick={() => void done?.()}>
            Ouvrir mon coffre
          </Button>
        </>
      ) : null}
    </AuthShell>
  );
}
