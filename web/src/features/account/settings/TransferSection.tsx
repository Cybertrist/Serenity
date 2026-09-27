import {
  ClockCountdownIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  type Icon,
  QrCodeIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { useEntries } from "../../../app/hooks/useEntries";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Chip, ErrorNote, Field, Note, TextArea } from "../../../design";
import type { Entry } from "../../../crypto/items";
import { plural } from "../../../lib/format";
import { exportVault } from "../../../vault/export";
import { parseAuthenticatorExport, type OneTimeAccount } from "../../../vault/import/authenticator";
import {
  ImportError,
  MAX_IMPORT_BYTES,
  parseBitwardenExport,
} from "../../../vault/import/bitwarden";
import { parseGoogleExport } from "../../../vault/import/google";
import { addEntries, updateEntry } from "../../../vault/operations";
import { errorText, passwordHint } from "../screens/wording";
import { Group } from "./parts";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import (Google, Bitwarden, Authenticator) and encrypted export: all of it happens in this
 * browser only. A file's clear text never reaches the server.
 */
export function TransferSection() {
  const session = useSession();
  const toast = useToast();
  const { entries } = useEntries();
  const [importing, setImporting] = useState<{ entries: Entry[]; skipped: number } | null>(null);
  const [exportPass, setExportPass] = useState("");
  const [busy, setBusy] = useState<"import" | "codes" | "export" | null>(null);
  const [link, setLink] = useState("");
  const [codes, setCodes] = useState<OneTimeAccount[] | null>(null);
  /** The Authenticator card is open: its three steps and the field for the link. */
  const [codesOpen, setCodesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const read = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);
    if (selected.size > MAX_IMPORT_BYTES) {
      setError("Ce fichier est trop gros : 5 Mo au maximum.");
      return;
    }
    try {
      // The format is read from the file, not from its name: a JSON is a Bitwarden export,
      // anything else is the CSV that Google writes.
      const text = (await selected.text()).trim();
      setImporting(text.startsWith("{") ? parseBitwardenExport(text) : parseGoogleExport(text));
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Fichier illisible.");
    }
  };

  const readCodes = () => {
    setError(null);
    try {
      setCodes(parseAuthenticatorExport(link));
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Lien illisible.");
    }
  };

  /**
   * A code joins the entry of the same name when that entry has none yet; otherwise it becomes
   * its own entry. Nothing is ever overwritten.
   */
  const importCodes = async () => {
    if (!session.keyring || !codes) return;
    setBusy("codes");
    setError(null);
    try {
      const byName = new Map(entries.map((e) => [e.entry.name.trim().toLowerCase(), e]));
      const fresh: Entry[] = [];
      let joined = 0;
      for (const code of codes) {
        const service = (code.issuer || code.name).trim();
        const target = byName.get(service.toLowerCase());
        if (target && !(target.entry.totp ?? "").trim() && target.item.zone === "personal") {
          await updateEntry(session.api, session.keyring, session.vault, target.item, {
            ...target.entry,
            totp: code.uri,
          });
          joined += 1;
          continue;
        }
        fresh.push({
          v: 1,
          type: "login",
          name: service || "Code",
          username: code.name.includes(":") ? code.name.split(":").slice(1).join(":") : code.name,
          password: "",
          urls: [],
          notes: "",
          totp: code.uri,
          fields: [],
        });
      }
      if (fresh.length) await addEntries(session.api, session.keyring, session.vault, fresh);
      await session.refresh();
      const count = plural(joined + fresh.length, "code importé", "codes importés");
      const how = joined ? `, dont ${String(joined)} rattaché(s) à une entrée existante.` : ".";
      toast(count + how);
      setCodes(null);
      setLink("");
      setCodesOpen(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    if (!session.keyring || !importing) return;
    setBusy("import");
    setError(null);
    try {
      await addEntries(session.api, session.keyring, session.vault, importing.entries);
      await session.refresh();
      toast(
        `${plural(importing.entries.length, "entrée importée", "entrées importées")} dans « Protégé par toi ».`,
      );
      setImporting(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const doExport = (event: FormEvent) => {
    event.preventDefault();
    if (!session.keyring) return;
    setBusy("export");
    setError(null);
    try {
      const text = exportVault(
        session.keyring.userId,
        entries.map((e) => ({ zone: e.item.zone, entry: e.entry })),
        exportPass,
      );
      download(`serenity-export-${new Date().toISOString().slice(0, 10)}.json`, text);
      setExportPass("");
      toast("Export chiffré téléchargé.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const importCard = (
    icon: Icon,
    title: string,
    caption: string,
    onClick: () => void,
    active = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`group flex min-w-0 items-center gap-3 rounded-[12px] border p-3 text-left transition-[border-color,background,transform] duration-200 hover:-translate-y-px @[760px]:flex-col @[760px]:items-start @[760px]:gap-2.5 @[760px]:p-3.5 ${
        active
          ? "border-accent bg-accent-soft"
          : "border-line-strong bg-glass-2 hover:border-[color-mix(in_oklab,var(--color-accent)_50%,transparent)]"
      }`}
    >
      <Chip icon={icon} tone="accent" size={30} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13.5px] font-medium leading-tight">{title}</span>
        <span className="text-[12px] leading-snug text-faint">{caption}</span>
      </span>
    </button>
  );

  return (
    <>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <Group
        title="Importer"
        text="Le fichier est lu et chiffré sur cet appareil : son contenu en clair ne part jamais vers le serveur. Tout arrive dans « Protégé par toi »."
      >
        <input
          ref={file}
          type="file"
          accept="text/csv,.csv,application/json,.json"
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            // Emptied, so choosing the same file again (after a cancel) still reads it.
            e.target.value = "";
            void read(chosen);
          }}
        />
        <div className="grid grid-cols-1 gap-2 @[760px]:grid-cols-3 @[760px]:gap-2.5">
          {importCard(FileCsvIcon, "Mots de passe Google", "Fichier .csv exporté de Chrome", () => {
            setCodesOpen(false);
            file.current?.click();
          })}
          {importCard(
            QrCodeIcon,
            "Google Authenticator",
            "Le lien du QR code de transfert",
            () => {
              setCodesOpen(!codesOpen);
            },
            codesOpen || codes !== null,
          )}
          {importCard(VaultIcon, "Bitwarden", "Export .json non chiffré", () => {
            setCodesOpen(false);
            file.current?.click();
          })}
        </div>

        {importing ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-hover p-3.5">
            <p className="m-0 text-body">
              {plural(importing.entries.length, "entrée prête", "entrées prêtes")} à importer
              {importing.skipped ? `, ${String(importing.skipped)} ignorée(s)` : ""}. Tout arrivera
              dans « Protégé par toi ».
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setImporting(null);
                }}
              >
                Annuler
              </Button>
              <Button className="flex-1" busy={busy === "import"} onClick={() => void doImport()}>
                Importer
              </Button>
            </div>
            <p className="m-0 text-caption text-muted">
              Pense à supprimer le fichier d'export de ton disque ensuite.
            </p>
          </div>
        ) : null}

        {codes ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-hover p-3.5">
            <p className="m-0 text-body">
              {plural(codes.length, "code trouvé", "codes trouvés")} :{" "}
              {codes
                .slice(0, 4)
                .map((c) => c.issuer || c.name)
                .join(", ")}
              {codes.length > 4 ? "…" : ""}
            </p>
            <p className="m-0 text-caption text-muted">
              Un code rejoint l'entrée du même nom si elle n'en a pas encore ; sinon il devient sa
              propre entrée, dans « Protégé par toi ». Rien n'est écrasé.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setCodes(null);
                }}
              >
                Annuler
              </Button>
              <Button className="flex-1" busy={busy === "codes"} onClick={() => void importCodes()}>
                Importer
              </Button>
            </div>
          </div>
        ) : codesOpen ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-hover p-3.5">
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-caption text-muted">
              {[
                "Dans Google Authenticator : menu, « Transférer les comptes », « Exporter ».",
                "L'appli affiche un QR code : scanne-le avec n'importe quel lecteur.",
                "Colle ici le lien otpauth-migration:// qu'il contient. Les secrets sont lus et chiffrés ici.",
              ].map((text, i) => (
                <li key={text} className="flex gap-2.5">
                  <span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-text">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <TextArea
              label="Lien de migration"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
              }}
              rows={3}
              spellCheck={false}
              placeholder="otpauth-migration://offline?data=…"
              className="font-mono !text-caption"
            />
            <Button
              variant="secondary"
              icon={ClockCountdownIcon}
              disabled={!link.trim()}
              onClick={readCodes}
            >
              Lire le lien
            </Button>
          </div>
        ) : null}
      </Group>

      <Group
        title="Exporter"
        text="Un fichier chiffré par une phrase de passe que tu choisis ici, produit sur cet appareil. Les deux zones y sont, chacune marquée."
      >
        <form
          className="flex flex-col gap-2.5 @[760px]:flex-row @[760px]:items-start"
          onSubmit={doExport}
        >
          <div className="min-w-0 flex-1">
            <Field
              label="Phrase de passe de l'export"
              secret
              hint={passwordHint(exportPass)}
              value={exportPass}
              onChange={(e) => {
                setExportPass(e.target.value);
              }}
              minLength={12}
              required
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            icon={DownloadSimpleIcon}
            className="@[760px]:mt-[23px] @[760px]:!h-11"
            busy={busy === "export"}
          >
            Exporter
          </Button>
        </form>
        <Note tone="warn">
          Sans cette phrase de passe, le fichier est illisible : personne ne peut le récupérer pour
          toi.
        </Note>
      </Group>
    </>
  );
}
