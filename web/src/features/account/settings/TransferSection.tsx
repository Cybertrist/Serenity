import { ClockCountdownIcon, DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { useEntries } from "../../../app/hooks/useEntries";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Card, ErrorNote, Field, Note } from "../../../design";
import type { Entry } from "../../../crypto/items";
import { plural } from "../../../lib/format";
import { exportVault } from "../../../vault/export";
import { parseAuthenticatorExport, type OneTimeAccount } from "../../../vault/import/authenticator";
import { ImportError, parseBitwardenExport } from "../../../vault/import/bitwarden";
import { parseGoogleExport } from "../../../vault/import/google";
import { addEntries, updateEntry } from "../../../vault/operations";
import { errorText, passwordHint } from "../screens/wording";

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
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const read = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);
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

  return (
    <div className="flex flex-col gap-6">
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body font-medium">Importer mes mots de passe</p>
          <p className="m-0 text-caption text-muted">
            Le fichier .csv du gestionnaire de mots de passe de Google, ou un export .json non
            chiffré de Bitwarden. Le format est reconnu tout seul. Le fichier est lu et chiffré ici
            : son contenu en clair ne part jamais vers le serveur.
          </p>
        </div>
        <input
          ref={file}
          type="file"
          accept="text/csv,.csv,application/json,.json"
          className="hidden"
          onChange={(e) => void read(e.target.files?.[0])}
        />
        {importing ? (
          <Card className="flex flex-col gap-3">
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
          </Card>
        ) : (
          <Button variant="secondary" icon={UploadSimpleIcon} onClick={() => file.current?.click()}>
            Choisir le fichier
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body font-medium">Importer mes codes à deux facteurs</p>
          <p className="m-0 text-caption text-muted">
            Dans Google Authenticator : menu, « Transférer les comptes », « Exporter ». L'appli
            affiche un QR code. Scanne-le avec n'importe quel lecteur, puis colle ici le lien
            <code className="mx-1 font-mono text-[12px]">otpauth-migration://</code>
            qu'il contient. Les secrets sont lus et chiffrés ici.
          </p>
        </div>
        {codes ? (
          <Card className="flex flex-col gap-3">
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
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-caption text-muted">
              Lien de migration
              <textarea
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                }}
                rows={3}
                spellCheck={false}
                placeholder="otpauth-migration://offline?data=…"
                className="resize-none rounded-control border border-line bg-surface px-4 py-3 font-mono text-caption text-text outline-none placeholder:text-muted focus-visible:border-accent"
              />
            </label>
            <Button
              variant="secondary"
              icon={ClockCountdownIcon}
              disabled={!link.trim()}
              onClick={readCodes}
            >
              Lire le lien
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body font-medium">Exporter mon coffre</p>
          <p className="m-0 text-caption text-muted">
            Un fichier chiffré par une phrase de passe que tu choisis ici, produit sur cet appareil.
            Les deux zones y sont, chacune marquée.
          </p>
        </div>
        <form className="flex flex-col gap-3" onSubmit={doExport}>
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
          <Button
            type="submit"
            variant="secondary"
            icon={DownloadSimpleIcon}
            busy={busy === "export"}
          >
            Exporter
          </Button>
        </form>
        <Note tone="warn">
          Sans cette phrase de passe, le fichier est illisible : personne ne peut le récupérer pour
          toi.
        </Note>
      </section>
    </div>
  );
}
