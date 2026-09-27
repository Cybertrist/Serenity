import { MagicWandIcon, ShieldCheckIcon, SparkleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type FormEvent } from "react";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import {
  Button,
  ErrorNote,
  Field,
  IconButton,
  Modal,
  Monogram,
  Pill,
  TextArea,
} from "../../design";
import type { Entry } from "../../crypto/items";
import { addEntries, ConflictError, updateEntry } from "../../vault/operations";
import type { ItemRecord } from "../../vault/state";
import { errorText } from "../account/screens/wording";
import { Generator } from "./Generator";
import { StrengthBars, strengthOf } from "./secret";

/**
 * Add or edit an entry. A new entry always goes to the personal zone: handing it to the agent
 * is a separate choice, made later from its fiche, with a confirmation.
 */
export function EntryEditor({
  open,
  onClose,
  item,
  initial,
  generate = false,
}: {
  open: boolean;
  onClose: () => void;
  item?: ItemRecord;
  initial?: Entry;
  /** Open with the generator already showing (a leaked password to replace). */
  generate?: boolean;
}) {
  const session = useSession();
  const toast = useToast();
  const formId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [url, setUrl] = useState(initial?.urls?.[0] ?? "");
  const [totp, setTotp] = useState(initial?.totp ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [generating, setGenerating] = useState(generate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentZone = item?.zone === "agent";
  const strength = password ? strengthOf(password) : null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const keyring = session.keyring;
    if (!keyring) return;
    setBusy(true);
    setError(null);
    const changed = initial?.password !== password;
    const entry: Entry = {
      ...(initial ?? { v: 1 }),
      v: 1,
      type: "login",
      name: name.trim(),
      username: username.trim(),
      password,
      urls: url.trim() ? [url.trim(), ...(initial?.urls?.slice(1) ?? [])] : [],
      totp: totp.trim(),
      notes,
      // A new entry, or a new password: remember when it changed (used by the "old" alert).
      ...(changed ? { passwordChangedAt: new Date().toISOString() } : {}),
    };
    try {
      if (item) await updateEntry(session.api, keyring, session.vault, item, entry);
      else await addEntries(session.api, keyring, session.vault, [entry]);
      await session.refresh();
      toast(item ? "Entrée enregistrée." : "Ajoutée dans « Protégé par toi ».");
      onClose();
    } catch (e) {
      setError(
        e instanceof ConflictError
          ? "Modifiée sur un autre appareil entre-temps : rouvre-la."
          : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Modifier l'entrée" : "Nouvelle entrée"}
      fullscreenOnMobile
      header={
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          {name.trim() ? (
            <Monogram name={name.trim()} size={44} />
          ) : (
            <span
              aria-hidden="true"
              className="h-11 w-11 shrink-0 rounded-[13px] border border-dashed border-line-strong bg-hover"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="m-0 truncate font-display text-[19px] font-bold leading-tight tracking-[-0.01em]">
              {item ? "Modifier l'entrée" : "Nouvelle entrée"}
            </h2>
            <span className="truncate text-caption text-faint">
              {name.trim() || (item ? initial?.name : "Donne-lui un nom pour commencer")}
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            form={formId}
            className="flex-1"
            busy={busy}
            disabled={!name.trim() || session.offline}
          >
            Enregistrer
          </Button>
        </div>
      }
    >
      {/* Where it lands, said before anything is typed. */}
      <div
        className={`flex items-start gap-3 rounded-[12px] px-3.5 py-3 ${agentZone ? "bg-violet-soft" : "bg-accent-soft"}`}
      >
        <span className={`mt-px ${agentZone ? "text-violet-text" : "text-accent-text"}`}>
          {agentZone ? (
            <SparkleIcon size={18} weight="bold" aria-hidden="true" />
          ) : (
            <ShieldCheckIcon size={18} weight="bold" aria-hidden="true" />
          )}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Pill tone={agentZone ? "violet" : "accent"}>
            {agentZone ? "Confié à l'agent" : "Protégé par toi"}
          </Pill>
          <p className="m-0 text-caption text-muted">
            {item
              ? agentZone
                ? "L'agent peut lire cette entrée. Ce que tu changes ici, il le verra aussi."
                : "Toi seul peux lire cette entrée. Rien de ce que tu tapes ne quitte cet appareil en clair."
              : "Tout arrive d'abord dans ta zone personnelle. Tu pourras la confier à l'agent ensuite, si tu le veux."}
          </p>
        </div>
      </div>
      <form id={formId} className="flex flex-col gap-4" onSubmit={(e) => void save(e)}>
        <Field
          label="Nom"
          value={name}
          autoFocus={!generate}
          placeholder="Banque, Gmail, Netflix…"
          onChange={(e) => {
            setName(e.target.value);
          }}
          required
          maxLength={200}
        />
        <Field
          label="Identifiant sur le site"
          value={username}
          autoComplete="off"
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <div className="flex flex-col gap-2">
          <Field
            label="Mot de passe"
            secret
            mono
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            trailing={
              <IconButton
                icon={MagicWandIcon}
                label={generating ? "Fermer le générateur" : "Générer un mot de passe"}
                aria-expanded={generating}
                className={generating ? "bg-accent-soft !text-accent-text" : ""}
                onClick={() => {
                  setGenerating(!generating);
                }}
              />
            }
          />
          {strength ? (
            <StrengthBars
              strength={strength}
              caption={`${strength.label}, ${String(Array.from(password).length)} caractères`}
              className="px-0.5"
            />
          ) : null}
        </div>
        <AnimatePresence initial={false}>
          {generating ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              <Generator
                onUse={(value) => {
                  setPassword(value);
                  setGenerating(false);
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <Field
          label="Adresse du site"
          hint="Sert à reconnaître le site dans les alertes de fuite."
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
          }}
        />
        <Field
          label="Clé TOTP (facultatif)"
          hint="Colle le lien otpauth:// ou la clé base32 : le code à 6 chiffres sera calculé ici."
          mono
          placeholder="otpauth://… ou clé base32"
          value={totp}
          onChange={(e) => {
            setTotp(e.target.value);
          }}
        />
        <TextArea
          label="Notes"
          value={notes}
          rows={3}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
        />
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </form>
    </Modal>
  );
}
