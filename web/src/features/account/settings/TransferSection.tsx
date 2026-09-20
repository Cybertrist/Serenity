import { DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState, type FormEvent } from "react";
import { useEntries } from "../../../app/hooks/useEntries";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Card, ErrorNote, Field, Note } from "../../../design";
import type { Entry } from "../../../crypto/items";
import { plural } from "../../../lib/format";
import { exportVault } from "../../../vault/export";
import { ImportError, parseBitwardenExport } from "../../../vault/import/bitwarden";
import { addEntries } from "../../../vault/operations";
import { errorText, passwordHint } from "../screens/wording";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import from Bitwarden and encrypted export: both happen in this browser only. */
export function TransferSection() {
  const session = useSession();
  const toast = useToast();
  const { entries } = useEntries();
  const [importing, setImporting] = useState<{ entries: Entry[]; skipped: number } | null>(null);
  const [exportPass, setExportPass] = useState("");
  const [busy, setBusy] = useState<"import" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const read = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);
    try {
      setImporting(parseBitwardenExport(await selected.text()));
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Fichier illisible.");
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
          <p className="m-0 text-body font-medium">Importer depuis Bitwarden</p>
          <p className="m-0 text-caption text-muted">
            Un export .json non chiffré. Il est lu et chiffré ici : son contenu en clair ne part
            jamais vers le serveur.
          </p>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
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
