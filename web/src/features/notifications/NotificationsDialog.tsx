import { BellIcon, CheckIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useBreaches, useNotifications, type NotificationRecord } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { useShell } from "../../app/shell/context";
import { Button, Card, Chip, EmptyState, Modal, Note, Row, Skeleton } from "../../design";
import { relative } from "../../lib/format";
import { BREACH_LABELS, notificationText } from "../../lib/labels";

/**
 * Notification centre: what the agent and the watch have signalled since last time.
 * The server stores only a kind and an id; the text is written here.
 */
export function NotificationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const shell = useShell();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const breaches = useBreaches();
  const { byId } = useEntries();
  const list = notifications.data ?? [];
  const unread = list.filter((n) => n.read_at === null);

  /** A breach notification carries only an id: the matching alert gives it its real words. */
  const text = (n: NotificationRecord) => {
    const name = byId.get(n.item_id ?? "")?.entry.name ?? "Un compte";
    const breach = breaches.data?.find((b) => b.id === n.breach_id);
    const label = breach ? BREACH_LABELS[breach.kind] : undefined;
    return label ? `${name} : ${label.title.toLowerCase()}` : notificationText(n.kind, name);
  };

  const readAll = async () => {
    await session.api.post("/api/notifications/read-all");
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const openOne = async (n: NotificationRecord) => {
    await session.api.post(`/api/notifications/${String(n.id)}/read`);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    onClose();
    if (n.item_id) shell.openEntry(n.item_id);
    else if (n.breach_id !== null) shell.go("breaches");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notifications"
      subtitle={unread.length ? `${String(unread.length)} non lue(s)` : "Tout est lu"}
      icon={BellIcon}
      tone="accent"
      {...(unread.length
        ? {
            footer: (
              <Button variant="secondary" icon={CheckIcon} onClick={() => void readAll()}>
                Tout marquer comme lu
              </Button>
            ),
          }
        : {})}
    >
      {notifications.isLoading ? <Skeleton lines={3} /> : null}
      {!notifications.isLoading && list.length === 0 ? (
        <EmptyState
          icon={BellIcon}
          title="Aucune notification."
          text="Tu seras prévenu ici dès qu'une fuite est trouvée ou qu'une rotation attend ton accord."
        />
      ) : null}
      {list.length ? (
        <Card padded={false}>
          {list.map((n, i) => (
            <Row
              key={n.id}
              first={i === 0}
              chip={<Chip icon={BellIcon} tone={n.read_at === null ? "accent" : "neutral"} />}
              title={text(n)}
              caption={relative(n.created_at)}
              trailing={
                n.read_at === null ? (
                  <span aria-label="Non lue" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                ) : null
              }
              onClick={() => void openOne(n)}
            />
          ))}
        </Card>
      ) : null}
      <Note>
        Le serveur ne garde que le type de l'alerte et l'identifiant de l'entrée : jamais son nom,
        jamais son mot de passe.
      </Note>
    </Modal>
  );
}
