import { ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useEntries } from "../../../app/hooks/useEntries";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, ErrorNote, Monogram, Note } from "../../../design";
import { daysUntil } from "../../../lib/format";
import { restore } from "../../../vault/operations";
import type { ItemRecord } from "../../../vault/state";
import { errorText } from "../screens/wording";
import { Group, Rows, SettingRow } from "./parts";

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
    <>
      <Group
        title="Entrées supprimées"
        text={`Une entrée supprimée y reste ${String(TRASH_DAYS)} jours, toujours chiffrée, avant d'être effacée pour de bon.`}
      >
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {trash.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-control border border-dashed border-line-strong px-4 py-6 text-center">
            <TrashIcon size={24} weight="duotone" aria-hidden="true" className="text-faint" />
            <p className="m-0 text-[13.5px] font-medium">Corbeille vide.</p>
            <p className="m-0 text-caption text-muted">
              Rien à restaurer, rien qui attend d'être effacé.
            </p>
          </div>
        ) : (
          <Rows>
            {trash.map((e) => (
              <SettingRow
                key={e.item.id}
                lead={<Monogram name={e.entry.name} size={30} />}
                title={e.entry.name}
                caption={left(e.item)}
                control={
                  <Button
                    variant="secondary"
                    size="sm"
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
          </Rows>
        )}
      </Group>
      <Note>
        Une entrée reprise à l'agent puis supprimée reste connue du serveur : change ce mot de passe
        sur le site avant de l'oublier.
      </Note>
    </>
  );
}
