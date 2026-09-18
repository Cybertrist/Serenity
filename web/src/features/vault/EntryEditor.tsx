import { SparkleIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Button, ErrorNote, Field, IconButton, Sheet } from "../../design";
import type { Entry } from "../../crypto/items";
import { addEntries, ConflictError, updateEntry } from "../../vault/operations";
import type { ItemRecord } from "../../vault/state";
import { errorText } from "../account/screens/AuthLayout";
import { Generator } from "./Generator";

/** Add or edit an entry. A new entry always goes to the personal zone. */
export function EntryEditor({
  open,
  onClose,
  item,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  item?: ItemRecord;
  initial?: Entry;
}) {
  const session = useSession();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [url, setUrl] = useState(initial?.urls?.[0] ?? "");
  const [totp, setTotp] = useState(initial?.totp ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <Sheet open={open} onClose={onClose} label={item ? "Modifier l'entrée" : "Nouvelle entrée"}>
      <h2 className="m-0 text-title">{item ? "Modifier" : "Nouvelle entrée"}</h2>
      <form className="flex flex-col gap-4" onSubmit={(e) => void save(e)}>
        <Field
          label="Nom"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          required
          maxLength={200}
        />
        <Field
          label="Identifiant sur le site"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
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
              icon={SparkleIcon}
              label="Générer"
              onClick={() => {
                setGenerating(!generating);
              }}
            />
          }
        />
        {generating ? (
          <Generator
            onUse={(value) => {
              setPassword(value);
              setGenerating(false);
            }}
          />
        ) : null}
        <Field
          label="Adresse du site"
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
          }}
        />
        <Field
          label="Clé TOTP (facultatif)"
          mono
          placeholder="otpauth://… ou clé base32"
          value={totp}
          onChange={(e) => {
            setTotp(e.target.value);
          }}
        />
        <label className="flex flex-col gap-2 text-caption text-muted">
          Notes
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            rows={3}
            className="rounded-control border border-line bg-surface px-4 py-3 text-body text-text outline-none"
          />
        </label>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button type="submit" busy={busy} disabled={!name.trim() || session.offline}>
          Enregistrer
        </Button>
      </form>
    </Sheet>
  );
}
