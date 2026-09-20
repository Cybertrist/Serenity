import { ArrowLeftIcon, LifebuoyIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, Card, ErrorNote, Field, Note } from "../../../design";
import type { Keyring } from "../../../vault/keyring";
import { recover } from "../credentials";
import type { LoginPayload } from "../types";
import { errorText, passwordHint } from "./wording";
import { AuthHead, AuthShell } from "./AuthShell";

/** Recovery with the kit (docs/crypto.md §7.8): a new master password and a NEW kit. */
export function Recovery({ onCancel }: { onCancel: () => void }) {
  const session = useSession();
  const [username, setUsername] = useState("");
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
      setError(
        e instanceof Error && e.name === "CryptoError"
          ? "Clé de récupération invalide (faute de frappe ?)."
          : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      step={result ? "kit" : "recuperation"}
      footer={
        result ? undefined : (
          <Button variant="secondary" icon={ArrowLeftIcon} onClick={onCancel}>
            Retour à la connexion
          </Button>
        )
      }
    >
      {result ? (
        <>
          <AuthHead
            title="Ton nouveau kit"
            subtitle="L'ancien ne fonctionne plus. Note celui-ci, il ne sera plus affiché."
          />
          <Card>
            <p className="m-0 select-all break-all font-mono text-body tracking-wider">
              {result.kit}
            </p>
          </Card>
          <Note tone="warn">Tes autres appareils ont été déconnectés.</Note>
          <Button
            onClick={() => void session.enter(result.keyring, result.login, result.login.username)}
          >
            C'est noté, ouvrir mon coffre
          </Button>
        </>
      ) : (
        <>
          <AuthHead
            title="Récupération"
            subtitle="Ton kit et un code, puis un nouveau mot de passe maître."
          />
          <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
            <Field
              label="Identifiant"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
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
              required
            />
            <Field
              label="Code TOTP"
              inputMode="numeric"
              maxLength={6}
              mono
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
              required
            />
            <Field
              label="Nouveau mot de passe maître"
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
              label="Confirme-le"
              secret
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
              }}
              required
            />
            {error ? <ErrorNote>{error}</ErrorNote> : null}
            <Button type="submit" icon={LifebuoyIcon} busy={busy}>
              Récupérer mon coffre
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
