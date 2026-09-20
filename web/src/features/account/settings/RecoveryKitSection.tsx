import { CheckCircleIcon, KeyIcon, WarningIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Confirm, ErrorNote, Field, Note } from "../../../design";
import { regenerateRecoveryKit } from "../credentials";
import { RecoveryKitPanel } from "../RecoveryKitPanel";
import { errorText } from "../screens/wording";

type Stage = "idle" | "form" | "kit";

/**
 * A new recovery kit, for a lost sheet or one that was seen (docs/crypto.md §7.11).
 * The old kit dies the moment the new one appears, so the warning comes first.
 */
export function RecoveryKitSection() {
  const session = useSession();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("idle");
  const [warning, setWarning] = useState(false);
  const [form, setForm] = useState({ password: "", code: "" });
  const [kit, setKit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void (async () => {
      if (!session.keyring || !session.username) return;
      setBusy(true);
      setError(null);
      try {
        setKit(
          await regenerateRecoveryKit(
            session.api,
            session.keyring,
            session.username,
            form.password,
            form.code,
          ),
        );
        setForm({ password: "", code: "" });
        setStage("kit");
      } catch (e) {
        setError(errorText(e));
      } finally {
        setBusy(false);
      }
    })();
  };

  const done = () => {
    setKit("");
    setStage("idle");
    toast("Nouveau kit de récupération en place. L'ancien ne vaut plus rien.");
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Kit de récupération</p>
        <p className="m-0 text-caption text-muted">
          Affiché une seule fois : le serveur n'en garde aucune copie lisible. Si tu as perdu ta
          feuille, ou si quelqu'un a pu la voir, fabrique-en un neuf. Tes entrées ne bougent pas et
          tes appareils restent connectés.
        </p>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {stage === "idle" ? (
        <Button
          variant="secondary"
          icon={KeyIcon}
          onClick={() => {
            setError(null);
            setWarning(true);
          }}
        >
          Régénérer mon kit
        </Button>
      ) : null}

      {stage === "form" ? (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field
            label="Mot de passe maître"
            secret
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
            }}
            autoComplete="current-password"
            required
          />
          <Field
            label="Code TOTP"
            hint="Les deux ensemble : une session ouverte ne suffit pas à refaire ton filet de secours."
            inputMode="numeric"
            maxLength={6}
            mono
            value={form.code}
            onChange={(e) => {
              setForm({ ...form, code: e.target.value.replace(/\D/g, "") });
            }}
            required
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setForm({ password: "", code: "" });
                setStage("idle");
              }}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1" busy={busy}>
              Afficher le nouveau kit
            </Button>
          </div>
        </form>
      ) : null}

      {stage === "kit" ? (
        <>
          <RecoveryKitPanel kit={kit} username={session.username ?? ""} />
          <Note tone="warn">
            Ton ancien kit ne vaut plus rien. Celui-ci ne sera plus jamais affiché : note-le sur
            papier ou garde le fichier hors ligne.
          </Note>
          <Button icon={CheckCircleIcon} onClick={done}>
            Je l'ai noté
          </Button>
        </>
      ) : null}

      <Confirm
        open={warning}
        icon={WarningIcon}
        title="Régénérer le kit ?"
        explanation="Dès que le nouveau kit s'affiche, l'ancien ne permet plus rien. Si tu fermes l'onglet sans le noter, ton mot de passe maître marchera toujours, mais tu n'auras plus de voie de secours. Aie de quoi écrire."
        confirmLabel="J'ai de quoi le noter"
        onCancel={() => {
          setWarning(false);
        }}
        onConfirm={() => {
          setWarning(false);
          setStage("form");
        }}
      />
    </section>
  );
}
