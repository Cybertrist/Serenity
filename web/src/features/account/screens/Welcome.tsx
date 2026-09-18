import {
  CheckCircleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, Card, ErrorNote, Field } from "../../../design";
import { signup, type PendingSignup } from "../signup";
import { AuthLayout, errorText, passwordHint } from "./AuthLayout";

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

  if (step === 1) {
    return (
      <AuthLayout
        icon={UserCircleIcon}
        title="Bienvenue."
        subtitle="Crée ton coffre. Ton mot de passe maître ne quitte jamais cet appareil."
        step={{ current: 1, total: 3, label: "Création du compte" }}
      >
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
          <Button type="submit" busy={busy}>
            Continuer
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (step === 2 && pending) {
    const groups = pending.totpSecret.match(/.{1,4}/g) ?? [];
    return (
      <AuthLayout
        icon={ShieldCheckIcon}
        title="La double vérification"
        subtitle="Ajoute Serenity dans ton appli d'authentification. Le code sera demandé sur un nouvel appareil, puis tous les 60 jours."
        step={{ current: 2, total: 3, label: "Création du compte" }}
      >
        <Card>
          <p className="m-0 mb-3 text-caption text-muted">
            Clé à saisir dans l'appli (type : basé sur le temps)
          </p>
          <p className="m-0 break-all font-mono text-body tracking-wider">{groups.join(" ")}</p>
        </Card>
        <a
          href={pending.totpUri}
          className="flex min-h-11 items-center justify-center text-body text-accent"
        >
          Ouvrir dans l'appli d'authentification
        </a>
        <form className="flex flex-col gap-4" onSubmit={(e) => void activate(e)}>
          <Field
            label="Code à 6 chiffres"
            inputMode="numeric"
            pattern="[0-9]{6}"
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
            Vérifier
          </Button>
        </form>
      </AuthLayout>
    );
  }

  const kit = pending?.recoveryKit ?? "";
  const download = () => {
    const text = `Serenity : kit de récupération\n\nIdentifiant : ${username}\nClé : ${kit}\n\nGarde ce fichier hors ligne (papier, clé USB). Il permet, avec ton code TOTP, de retrouver ton coffre si tu oublies ton mot de passe maître.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "serenity-kit-de-recuperation.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <AuthLayout
      icon={KeyIcon}
      title="Ton kit de récupération"
      subtitle="Si tu oublies ton mot de passe maître, c'est la seule façon de rouvrir ton coffre. Personne d'autre ne peut le faire, pas même le serveur."
      step={{ current: 3, total: 3, label: "Création du compte" }}
    >
      <Card>
        <div className="grid grid-cols-3 gap-2 font-mono text-body tracking-wider">
          {kit.split("-").map((group, i) => (
            <span
              key={i}
              className={`rounded-chip bg-raised py-2.5 text-center ${i === 8 ? "text-muted" : ""}`}
            >
              {group}
            </span>
          ))}
        </div>
      </Card>
      <div className="flex gap-2">
        <Button variant="secondary" icon={DownloadSimpleIcon} className="flex-1" onClick={download}>
          Télécharger
        </Button>
        <Button
          variant="secondary"
          icon={CopyIcon}
          className="flex-1"
          onClick={() => void navigator.clipboard.writeText(kit)}
        >
          Copier
        </Button>
      </div>
      <p className="m-0 rounded-control bg-warn-soft px-3.5 py-3 text-caption text-warn">
        Il ne sera plus jamais affiché. Note-le sur papier ou garde le fichier hors ligne.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
        <input
          type="checkbox"
          checked={noted}
          onChange={(e) => {
            setNoted(e.target.checked);
          }}
          className="h-[22px] w-[22px] accent-[#f2762e]"
        />
        Je l'ai noté dans un endroit sûr.
      </label>
      <Button icon={CheckCircleIcon} disabled={!noted || !done} onClick={() => void done?.()}>
        Ouvrir mon coffre
      </Button>
    </AuthLayout>
  );
}
