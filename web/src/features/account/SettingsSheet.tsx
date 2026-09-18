import {
  DeviceMobileIcon,
  DownloadSimpleIcon,
  LockSimpleIcon,
  SignOutIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { useEntries } from "../../app/hooks/useEntries";
import { LOCK_CHOICES, lockMinutes, setLockMinutes } from "../../app/prefs";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Button, Card, ErrorNote, Field, IconButton, Row, SectionTitle, Sheet } from "../../design";
import { plural, relative } from "../../lib/format";
import { exportVault } from "../../vault/export";
import { ImportError, parseBitwardenExport } from "../../vault/import/bitwarden";
import { addEntries } from "../../vault/operations";
import type { Entry } from "../../crypto/items";
import { changePassword } from "./credentials";
import { errorText, passwordHint } from "./screens/AuthLayout";
import type { SessionPayload } from "./types";

interface Emails {
  enabled: boolean;
  emails: { id: number; email: string; last_checked_at: string | null }[];
}

function Chips<T extends number>({
  values,
  value,
  onChange,
  label,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          onClick={() => {
            onChange(v);
          }}
          className={`h-9 rounded-full px-3.5 text-caption font-medium ${v === value ? "bg-text text-bg" : "border border-line text-muted"}`}
        >
          {label(v)}
        </button>
      ))}
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { entries } = useEntries();
  const online = open && !session.offline;
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => session.api.get<SessionPayload[]>("/api/auth/sessions"),
    enabled: online,
  });
  const emails = useQuery({
    queryKey: ["emails"],
    queryFn: () => session.api.get<Emails>("/api/watch/emails"),
    enabled: online,
  });
  const [lock, setLock] = useState(lockMinutes());
  const [email, setEmail] = useState("");
  const [importing, setImporting] = useState<{ entries: Entry[]; skipped: number } | null>(null);
  const [exportPass, setExportPass] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "", code: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const run = async (key: string, action: () => Promise<void> | void) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const addEmail = (event: FormEvent) => {
    event.preventDefault();
    void run("email", async () => {
      await session.api.post("/api/watch/emails", { email });
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["emails"] });
    });
  };

  const readImport = async (selected: File | undefined) => {
    if (!selected) return;
    try {
      setImporting(parseBitwardenExport(await selected.text()));
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Fichier illisible.");
    }
  };

  const doImport = () =>
    run("import", async () => {
      if (!session.keyring || !importing) return;
      await addEntries(session.api, session.keyring, session.vault, importing.entries);
      await session.refresh();
      toast(
        `${plural(importing.entries.length, "entrée importée", "entrées importées")} dans « Protégé par toi ».`,
      );
      setImporting(null);
    });

  const doExport = (event: FormEvent) => {
    event.preventDefault();
    void run("export", () => {
      if (!session.keyring) return;
      const text = exportVault(
        session.keyring.userId,
        entries.map((e) => ({ zone: e.item.zone, entry: e.entry })),
        exportPass,
      );
      download(`serenity-export-${new Date().toISOString().slice(0, 10)}.json`, text);
      setExportPass("");
      toast("Export chiffré téléchargé.");
    });
  };

  const doChangePassword = (event: FormEvent) => {
    event.preventDefault();
    if (pw.next !== pw.confirm) {
      setError("Les deux nouveaux mots de passe diffèrent.");
      return;
    }
    void run("password", async () => {
      if (!session.keyring || !session.username) return;
      await changePassword(
        session.api,
        session.keyring,
        session.username,
        pw.current,
        pw.next,
        pw.code,
      );
      setPw({ current: "", next: "", confirm: "", code: "" });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast("Mot de passe maître changé. Tes autres appareils sont déconnectés.");
    });
  };

  return (
    <Sheet open={open} onClose={onClose} label="Réglages">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-title">Réglages</h2>
        <IconButton icon={XIcon} label="Fermer" onClick={onClose} />
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <SectionTitle
        title="Verrouillage"
        subtitle="Après ce délai sans activité, ton coffre se verrouille."
      />
      <Chips
        values={LOCK_CHOICES}
        value={lock as (typeof LOCK_CHOICES)[number]}
        label={(v) => `${String(v)} min`}
        onChange={(v) => {
          setLock(v);
          setLockMinutes(v);
          toast("Pris en compte au prochain déverrouillage.");
        }}
      />
      <Button
        variant="secondary"
        icon={LockSimpleIcon}
        onClick={() => {
          onClose();
          void session.lock();
        }}
      >
        Verrouiller maintenant
      </Button>

      {!session.offline ? (
        <>
          <SectionTitle
            title="Appareils connectés"
            subtitle="Le code TOTP est redemandé tous les 60 jours."
          />
          <Card padded={false}>
            {(sessions.data ?? []).map((s, i) => (
              <Row
                key={s.id}
                first={i === 0}
                title={s.current ? "Cet appareil" : s.device.slice(0, 40) || "Appareil"}
                caption={`Vu ${relative(s.last_seen_at)} · expire ${relative(s.expires_at)}`}
                trailing={
                  s.current ? null : (
                    <IconButton
                      icon={TrashIcon}
                      label="Déconnecter cet appareil"
                      onClick={() =>
                        void run("sessions", async () => {
                          await session.api.delete(`/api/auth/sessions/${String(s.id)}`);
                          await queryClient.invalidateQueries({ queryKey: ["sessions"] });
                        })
                      }
                    />
                  )
                }
                chip={<DeviceMobileIcon size={20} className="text-muted" aria-hidden="true" />}
              />
            ))}
          </Card>

          <SectionTitle
            title="Adresses surveillées"
            subtitle={
              emails.data?.enabled === false
                ? "Vérification désactivée : ajoute une clé HIBP sur le serveur."
                : "Vérifiées toutes les 6 h par l'agent."
            }
          />
          {(emails.data?.emails ?? []).length ? (
            <Card padded={false}>
              {(emails.data?.emails ?? []).map((e, i) => (
                <Row
                  key={e.id}
                  first={i === 0}
                  title={e.email}
                  caption={
                    e.last_checked_at
                      ? `Vérifiée ${relative(e.last_checked_at)}`
                      : "Pas encore vérifiée"
                  }
                  trailing={
                    <IconButton
                      icon={TrashIcon}
                      label={`Retirer ${e.email}`}
                      onClick={() =>
                        void run("email", async () => {
                          await session.api.delete(`/api/watch/emails/${String(e.id)}`);
                          await queryClient.invalidateQueries({ queryKey: ["emails"] });
                        })
                      }
                    />
                  }
                />
              ))}
            </Card>
          ) : null}
          <form className="flex flex-col gap-3" onSubmit={addEmail}>
            <Field
              label="Nouvelle adresse"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
            <Button type="submit" variant="secondary" busy={busy === "email"} disabled={!email}>
              Surveiller
            </Button>
          </form>

          <SectionTitle
            title="Importer depuis Bitwarden"
            subtitle="Export .json non chiffré : lu et chiffré ici, il ne part jamais en clair."
          />
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void readImport(e.target.files?.[0])}
          />
          {importing ? (
            <Card className="flex flex-col gap-3">
              <p className="m-0 text-body">
                {plural(importing.entries.length, "entrée prête", "entrées prêtes")} à importer
                {importing.skipped ? `, ${String(importing.skipped)} ignorée(s)` : ""}. Tout
                arrivera dans « Protégé par toi ».
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
                Pense à supprimer le fichier d'export ensuite.
              </p>
            </Card>
          ) : (
            <Button
              variant="secondary"
              icon={UploadSimpleIcon}
              onClick={() => file.current?.click()}
            >
              Choisir le fichier
            </Button>
          )}
        </>
      ) : null}

      <SectionTitle
        title="Exporter"
        subtitle="Un fichier chiffré par une phrase de passe, produit sur cet appareil."
      />
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
          Exporter mon coffre
        </Button>
      </form>

      {!session.offline ? (
        <>
          <SectionTitle
            title="Mot de passe maître"
            subtitle="Tes entrées ne changent pas ; tes autres appareils seront déconnectés."
          />
          <form className="flex flex-col gap-3" onSubmit={doChangePassword}>
            <Field
              label="Actuel"
              secret
              value={pw.current}
              onChange={(e) => {
                setPw({ ...pw, current: e.target.value });
              }}
              autoComplete="current-password"
              required
            />
            <Field
              label="Nouveau"
              secret
              hint={passwordHint(pw.next)}
              value={pw.next}
              onChange={(e) => {
                setPw({ ...pw, next: e.target.value });
              }}
              autoComplete="new-password"
              minLength={12}
              required
            />
            <Field
              label="Confirme le nouveau"
              secret
              value={pw.confirm}
              onChange={(e) => {
                setPw({ ...pw, confirm: e.target.value });
              }}
              required
            />
            <Field
              label="Code TOTP"
              inputMode="numeric"
              maxLength={6}
              mono
              value={pw.code}
              onChange={(e) => {
                setPw({ ...pw, code: e.target.value.replace(/\D/g, "") });
              }}
              required
            />
            <Button type="submit" variant="secondary" busy={busy === "password"}>
              Changer
            </Button>
          </form>
          <SectionTitle
            title="Kit de récupération"
            subtitle="Affiché une seule fois à la création. Chaque récupération t'en donne un nouveau et rend l'ancien inutilisable."
          />
        </>
      ) : null}

      <Button
        variant="danger"
        icon={SignOutIcon}
        onClick={() => {
          onClose();
          void session.logout();
        }}
      >
        Se déconnecter de cet appareil
      </Button>
    </Sheet>
  );
}
