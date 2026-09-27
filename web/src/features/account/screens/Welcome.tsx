import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { copySecret } from "../../../app/clipboard";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, ErrorNote, Field, Note, useMood } from "../../../design";
import { CodeField } from "../CodeField";
import { RecoveryKitReveal } from "../RecoveryKitPanel";
import { signup, type PendingSignup } from "../signup";
import { TotpQr } from "../TotpQr";
import { errorText, passwordHint } from "./wording";
import { AuthHead, AuthShell, useNarrow } from "./AuthShell";

const STEPS = ["Compte", "Vérification", "Récupération"] as const;

/** Account creation: identity and master password, TOTP enrolment, recovery kit. */
export function Welcome() {
  const session = useSession();
  const toast = useToast();
  const narrow = useNarrow();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<(() => Promise<void>) | null>(null);
  // The kit is the serious moment of the creation: the light turns amber while it is on screen.
  useMood(step === 3 ? "leak" : null);

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
  /** The account is created under this name: the kit has to carry the same one. */
  const account = username.trim().toLowerCase();
  /** Only an authenticator link is ever offered as a link, whatever the server sent. */
  const totpLink = pending?.totpUri.startsWith("otpauth://") ? pending.totpUri : null;
  // On a phone the app is on the same device: a link opens it, a QR code is for another one.
  const qr = totpLink !== null && (!narrow || showQr);

  return (
    <AuthShell step={`creation-${String(step)}`} wide={step > 1} halo={step === 3}>
      {step === 1 ? (
        <>
          <AuthHead
            title="Bienvenue."
            subtitle="Crée ton coffre. Ton mot de passe maître ne quitte jamais cet appareil."
            steps={{ names: STEPS, current: 1 }}
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
            <Button type="submit" size="lg" icon={ArrowRightIcon} busy={busy}>
              Continuer
            </Button>
          </form>
        </>
      ) : null}

      {step === 2 && pending ? (
        <>
          <AuthHead
            title="La double vérification"
            subtitle="Ajoute Serenity à ton appli d'authentification, puis tape le code qu'elle affiche."
            steps={{ names: STEPS, current: 2 }}
          />
          <div className="flex items-center gap-4 rounded-card bg-hover p-3.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
            {qr && totpLink ? <TotpQr uri={totpLink} size={narrow ? 120 : 132} /> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="m-0 text-caption text-muted">
                {narrow
                  ? "Clé à saisir dans ton appli d'authentification"
                  : "Scanne ce code avec ton téléphone, ou saisis la clé à la main"}
              </p>
              <p
                data-totp-secret
                className="m-0 select-all break-all font-mono text-[14.5px] font-medium leading-relaxed tracking-[0.08em]"
              >
                {(pending.totpSecret.match(/.{1,4}/g) ?? []).join(" ")}
              </p>
              <div className="flex flex-wrap gap-x-3">
                <Button
                  variant="link"
                  icon={CopyIcon}
                  onClick={() => {
                    copySecret(pending.totpSecret).then(
                      () => {
                        toast("Clé copiée. Effacée du presse-papiers dans 30 s.");
                      },
                      (e: unknown) => {
                        toast(errorText(e), "crit");
                      },
                    );
                  }}
                >
                  Copier la clé
                </Button>
                {narrow && totpLink ? (
                  <Button
                    variant="link"
                    icon={QrCodeIcon}
                    onClick={() => {
                      setShowQr(!showQr);
                    }}
                  >
                    {showQr ? "Masquer le QR code" : "QR code"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {narrow && totpLink ? (
            <a
              href={totpLink}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] border border-line-strong bg-glass-2 px-4 text-[14px] font-medium text-text transition-colors duration-150 hover:bg-glass-hi"
            >
              <ArrowSquareOutIcon size={17} weight="bold" aria-hidden="true" />
              Ouvrir dans l'appli d'authentification
            </a>
          ) : null}
          <form className="flex flex-col gap-4" onSubmit={(e) => void activate(e)}>
            <CodeField
              label="Code à 6 chiffres"
              value={code}
              autoFocus={!narrow}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button
              type="submit"
              size="lg"
              icon={ShieldCheckIcon}
              busy={busy}
              disabled={code.length !== 6}
            >
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
            subtitle="Ta seule issue si tu oublies ton mot de passe maître. Prends une minute pour le mettre à l'abri."
            steps={{ names: STEPS, current: 3 }}
          />
          <RecoveryKitReveal
            kit={kit}
            username={account}
            confirmLabel="Ouvrir mon coffre"
            ready={done !== null}
            error={error}
            onConfirm={() => {
              done?.().catch((e: unknown) => {
                setError(errorText(e));
              });
            }}
          />
        </>
      ) : null}
    </AuthShell>
  );
}
