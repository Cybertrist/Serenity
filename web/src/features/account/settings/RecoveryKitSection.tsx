import { KeyIcon, WarningIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Confirm, ErrorNote, Field, Modal, useMood } from "../../../design";
import { CodeField } from "../CodeField";
import { regenerateRecoveryKit } from "../credentials";
import { RecoveryKitReveal } from "../RecoveryKitPanel";
import { errorText } from "../screens/wording";
import { useHoldSettings } from "./guard";
import { Group, Rows, SettingRow } from "./parts";

type Stage = "idle" | "form" | "kit";

/**
 * A new recovery kit, for a lost sheet or one that was seen (docs/crypto.md §7.11).
 * The old kit dies the moment the new one appears, so the warning comes first, and the new
 * one is shown over everything, in a dialog that will not close before it is kept.
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
  useHoldSettings(stage === "kit");
  useMood(stage === "kit" ? "leak" : null);

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
    <>
      <Group
        title="Ton kit actuel"
        halo
        text="Montré une seule fois, à la création du compte. Sans lui ni ton mot de passe maître, ta zone personnelle est perdue : c'est voulu."
      >
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {stage === "form" ? (
          <form className="flex flex-col gap-3.5" onSubmit={submit}>
            <Field
              label="Mot de passe maître"
              secret
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
              }}
              autoComplete="current-password"
              autoFocus
              required
            />
            <CodeField
              label="Code à 6 chiffres"
              hint="Les deux ensemble : une session ouverte ne suffit pas à refaire ton filet de secours."
              value={form.code}
              onChange={(e) => {
                setForm({ ...form, code: e.target.value.replace(/\D/g, "") });
              }}
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
              <Button
                type="submit"
                className="flex-1"
                busy={busy}
                disabled={!form.password || form.code.length !== 6}
              >
                Afficher le nouveau kit
              </Button>
            </div>
          </form>
        ) : (
          <Rows>
            <SettingRow
              stack
              title="Tu l'as perdu, ou quelqu'un a pu le voir ?"
              caption="Un nouveau kit rend l'ancien inutilisable à l'instant où il apparaît. Tes entrées ne bougent pas, tes appareils restent connectés."
              control={
                <Button
                  variant="secondary"
                  icon={KeyIcon}
                  onClick={() => {
                    setError(null);
                    setWarning(true);
                  }}
                >
                  Générer un nouveau kit
                </Button>
              }
            />
          </Rows>
        )}
      </Group>

      <Modal
        open={stage === "kit"}
        onClose={() => {
          toast("Garde d'abord ton nouveau kit, puis confirme-le.", "warn");
        }}
        title="Ton nouveau kit"
        subtitle="L'ancien ne vaut plus rien. Celui-ci ne sera plus jamais affiché."
        icon={KeyIcon}
        tone="warn"
        fullscreenOnMobile
      >
        <RecoveryKitReveal
          kit={kit}
          username={session.username ?? ""}
          confirmLabel="Je l'ai noté, c'est bon"
          onConfirm={done}
        />
      </Modal>

      <Confirm
        open={warning}
        icon={WarningIcon}
        title="Générer un nouveau kit ?"
        explanation="Dès que le nouveau kit s'affiche, l'ancien ne permet plus rien. Si tu fermes l'onglet sans le noter, ton mot de passe maître marchera toujours, mais tu n'auras plus de voie de secours. Aie de quoi écrire."
        tone="warn"
        confirmLabel="J'ai de quoi le noter"
        onCancel={() => {
          setWarning(false);
        }}
        onConfirm={() => {
          setWarning(false);
          setStage("form");
        }}
      />
    </>
  );
}
