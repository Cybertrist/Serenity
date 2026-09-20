import { AtIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { Button, Card, EmptyState, ErrorNote, Field, IconButton, Note, Row } from "../../../design";
import { relative } from "../../../lib/format";
import { errorText } from "../screens/wording";

interface Emails {
  enabled: boolean;
  emails: { id: number; email: string; last_checked_at: string | null }[];
}

/** Watched e-mail addresses: checked against HIBP by the agent, never by the browser. */
export function WatchSection() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emails = useQuery({
    queryKey: ["emails"],
    queryFn: () => session.api.get<Emails>("/api/watch/emails"),
  });

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Adresses surveillées</p>
        <p className="m-0 text-caption text-muted">
          L'agent demande toutes les 6 h si ces adresses apparaissent dans une fuite connue. Les
          alertes atterrissent dans l'onglet Fuites.
        </p>
      </div>
      {emails.data?.enabled === false ? (
        <Note tone="warn">
          Vérification désactivée : il manque une clé HIBP sur le serveur. Les adresses ajoutées
          seront gardées mais pas vérifiées.
        </Note>
      ) : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {list.length ? (
        <Card padded={false}>
          {list.map((e, i) => (
            <Row
              key={e.id}
              first={i === 0}
              chip={<AtIcon size={20} className="text-muted" aria-hidden="true" />}
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
                    void run(async () => {
                      await session.api.delete(`/api/watch/emails/${String(e.id)}`);
                    })
                  }
                />
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={AtIcon}
          title="Aucune adresse surveillée."
          text="Ajoute ton adresse principale : c'est elle qui apparaît le plus souvent dans les fuites."
        />
      )}
      <form className="flex flex-col gap-3" onSubmit={add}>
        <Field
          label="Nouvelle adresse"
          type="email"
          placeholder="prenom@exemple.fr"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <Button type="submit" variant="secondary" busy={busy} disabled={!email}>
          Surveiller cette adresse
        </Button>
      </form>
    </div>
  );
}
