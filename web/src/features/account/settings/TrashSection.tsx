import { ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useEntries } from "../../../app/hooks/useEntries";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Card, Chip, EmptyState, ErrorNote, Note, Row } from "../../../design";
import { daysUntil } from "../../../lib/format";
import { restore } from "../../../vault/operations";
import type { ItemRecord } from "../../../vault/state";
import { errorText } from "../screens/wording";

const TRASH_DAYS = 30;

/** Deleted entries, until the server purges them. Restoring puts them back in their zone. */
export function TrashSection() {
  const session = useSession();
  const toast = useToast();
  const { trash } = useEntries();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const put = async (item: ItemRecord) => {
    setBusy(item.id);
    setError(null);
    try {
      await restore(session.api, session.vault, item);
      await session.refresh();
      toast("Entrée restaurée dans sa zone.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const left = (item: ItemRecord) => {
    if (!item.deleted_at) return "";
    const days = daysUntil(
      new Date(new Date(item.deleted_at).getTime() + TRASH_DAYS * 86_400_000).toISOString(),
    );
    return days === null || days <= 0
      ? "effacée d'un instant à l'autre"
      : `effacée dans ${String(days)} j`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Corbeille</p>
        <p className="m-0 text-caption text-muted">
          Une entrée supprimée y reste {TRASH_DAYS} jours, toujours chiffrée, avant d'être effacée
          pour de bon.
        </p>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {trash.length === 0 ? (
        <EmptyState icon={TrashIcon} title="Corbeille vide." />
      ) : (
        <Card padded={false}>
          {trash.map((e, i) => (
            <Row
              key={e.item.id}
              first={i === 0}
              chip={<Chip icon={TrashIcon} tone="neutral" />}
              title={e.entry.name}
              caption={left(e.item)}
              trailing={
                <Button
                  variant="secondary"
                  icon={ArrowCounterClockwiseIcon}
                  busy={busy === e.item.id}
                  disabled={session.offline}
                  onClick={() => void put(e.item)}
                >
                  Restaurer
                </Button>
              }
            />
          ))}
        </Card>
      )}
      <Note>
        Une entrée reprise à l'agent puis supprimée reste connue du serveur : change ce mot de passe
        sur le site avant de l'oublier.
      </Note>
    </div>
  );
}
