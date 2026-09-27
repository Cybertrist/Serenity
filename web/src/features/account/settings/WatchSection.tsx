import { AtIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, Chip, ErrorNote, Field, IconButton, Note, Skeleton } from "../../../design";
import { relative } from "../../../lib/format";
import { errorText } from "../screens/wording";
import { Group, Rows, SettingRow } from "./parts";

interface Emails {
  enabled: boolean;
  emails: { id: number; email: string; last_checked_at: string | null }[];
}

/** The watched addresses, shared with the settings list (it shows how many there are). */
export function useWatchedEmails() {
  const session = useSession();
  return useQuery({
    queryKey: ["emails"],
    queryFn: () => session.api.get<Emails>("/api/watch/emails"),
    enabled: !session.offline,
  });
}

/** Watched e-mail addresses: checked against HIBP by the agent, never by the browser. */
export function WatchSection() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emails = useWatchedEmails();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["emails"] });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await session.api.post("/api/watch/emails", { email });
      setEmail("");
    });
  };

  const list = emails.data?.emails ?? [];
  return (
    <>
      <Group
        title="Adresses surveillées"
        text="Toutes les 6 h, l'agent demande si ces adresses apparaissent dans une fuite connue. Ce qu'il trouve arrive dans l'onglet Fuites."
      >
        {emails.data?.enabled === false ? (
          <Note tone="warn">
            Vérification désactivée : il manque une clé HIBP sur le serveur. Les adresses ajoutées
            seront gardées mais pas vérifiées.
          </Note>
        ) : null}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {emails.isLoading ? <Skeleton lines={2} /> : null}
        {list.length ? (
          <Rows>
            {list.map((e) => (
              <SettingRow
                key={e.id}
                lead={<Chip icon={AtIcon} tone="accent" size={30} />}
                title={e.email}
                caption={
                  e.last_checked_at
                    ? `Vérifiée ${relative(e.last_checked_at)}`
                    : "Pas encore vérifiée"
                }
                control={
                  <IconButton
                    icon={TrashIcon}
                    label={`Retirer ${e.email}`}
                    onClick={() =>
                      void run(async () => {
                        await session.api.delete(`/api/watch/emails/${String(e.id)}`);
                      })
                    }
                  />
                }
              />
            ))}
          </Rows>
        ) : !emails.isLoading ? (
          <p className="m-0 rounded-control border border-dashed border-line-strong px-4 py-3.5 text-caption text-muted">
            Aucune adresse pour l'instant. Commence par ta principale : c'est elle qui apparaît le
            plus souvent dans les fuites.
          </p>
        ) : null}
        <form className="flex flex-col gap-2.5 @[760px]:flex-row @[760px]:items-end" onSubmit={add}>
          <div className="min-w-0 flex-1">
            <Field
              label="Nouvelle adresse"
              type="email"
              placeholder="prenom@exemple.fr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            icon={PlusIcon}
            className="@[760px]:!h-11"
            busy={busy}
            disabled={!email}
          >
            Surveiller
          </Button>
        </form>
      </Group>
      <Note>
        Tes mots de passe, eux, sont vérifiés depuis l'onglet Fuites, en k-anonymat : seuls 5
        caractères de leur empreinte quittent cet appareil.
      </Note>
    </>
  );
}
