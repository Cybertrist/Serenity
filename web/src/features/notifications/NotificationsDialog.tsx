import {
  ArrowsClockwiseIcon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  HandTapIcon,
  type Icon,
  SealWarningIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useBreaches, useNotifications, type NotificationRecord } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { useShell } from "../../app/shell/context";
import { useToast } from "../../app/toast";
import { errorText } from "../account/screens/wording";
import { Button, EmptyState, LIST, LIST_ITEM, Modal, Note, Skeleton } from "../../design";
import { plural, relative } from "../../lib/format";
import { BREACH_LABELS } from "../../lib/labels";

interface Look {
  icon: Icon;
  well: string;
  what: string;
}

const LOOKS: Record<string, Look> = {
  "rotation.due": {
    icon: ArrowsClockwiseIcon,
    well: "bg-violet-soft text-violet-text",
    what: "Une rotation attend ton accord.",
  },
  "reminder.due": {
    icon: ClockIcon,
    well: "bg-accent-soft text-accent-text",
    what: "Pense à changer ce mot de passe.",
  },
  "rotation.done": {
    icon: CheckCircleIcon,
    well: "bg-ok-soft text-ok",
    what: "Mot de passe changé par l'agent, preuve de connexion validée.",
  },
  "rotation.failed": {
    icon: WarningIcon,
    well: "bg-warn-soft text-warn-text",
    what: "Rotation annulée, rien n'a changé.",
  },
  "rotation.manual": {
    icon: HandTapIcon,
    well: "bg-warn-soft text-warn-text",
    what: "Rotation à terminer toi-même.",
  },
};

/**
 * Notification centre: what the agent and the watch have signalled since last time.
 * The server stores only a kind and an id; the text is written here.
 */
export function NotificationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const shell = useShell();
  const toast = useToast();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const breaches = useBreaches();
  const { byId } = useEntries();
  const list = notifications.data ?? [];
  const unread = list.filter((n) => n.read_at === null);
  const read = list.filter((n) => n.read_at !== null);

  /** A breach notification carries only an id: the matching alert gives it its real words. */
  const describe = (n: NotificationRecord): { title: string; text: string; look: Look } => {
    const name = byId.get(n.item_id ?? "")?.entry.name;
    const breach =
      n.breach_id === null ? undefined : breaches.data?.find((b) => b.id === n.breach_id);
    if (n.breach_id !== null) {
      const label = breach ? BREACH_LABELS[breach.kind] : undefined;
      const email = typeof breach?.details.email === "string" ? breach.details.email : null;
      return {
        title: name ?? email ?? "Nouvelle alerte",
        text: label ? `${label.title}. ${label.hint}` : "La veille a trouvé quelque chose.",
        look: {
          icon: SealWarningIcon,
          well: label?.tone === "crit" ? "bg-crit-soft text-crit" : "bg-warn-soft text-warn-text",
          what: "",
        },
      };
    }
    const look = LOOKS[n.kind] ?? {
      icon: BellIcon,
      well: "bg-neutral-soft text-muted",
      what: "Nouvelle alerte.",
    };
    return { title: name ?? "Un compte", text: look.what, look };
  };

  const readAll = async () => {
    try {
      await session.api.post("/api/notifications/read-all");
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast(errorText(e), "crit");
    }
  };

  const openOne = async (n: NotificationRecord) => {
    // Opening what it points to matters more than marking it read: offline, it still opens.
    try {
      await session.api.post(`/api/notifications/${String(n.id)}/read`);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      // Stays unread; nothing else is lost.
    }
    onClose();
    if (n.kind === "rotation.due") shell.go("agent");
    else if (n.item_id) shell.openEntry(n.item_id);
    else if (n.breach_id !== null) shell.go("breaches");
  };

  const group = (title: string, items: NotificationRecord[], fresh: boolean) =>
    items.length ? (
      <section className="flex flex-col gap-1.5">
        <h3 className="m-0 flex items-center gap-3 px-1">
          <span className="eyebrow">{title}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="tabular text-micro text-faint">{items.length}</span>
        </h3>
        <motion.ul
          variants={LIST}
          initial="initial"
          animate="animate"
          className="glass m-0 list-none overflow-hidden rounded-card p-0"
        >
          {items.map((n, i) => {
            const { title: head, text, look } = describe(n);
            const IconComponent = look.icon;
            return (
              <motion.li key={n.id} variants={LIST_ITEM}>
                <button
                  type="button"
                  onClick={() => void openOne(n)}
                  className={`relative flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-hover ${i ? "border-t border-line" : ""} ${fresh ? "bg-[color-mix(in_oklab,var(--color-accent)_5%,transparent)]" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${look.well} ${fresh ? "" : "opacity-70"}`}
                  >
                    <IconComponent size={16} weight="bold" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`truncate text-body ${fresh ? "font-semibold" : "font-medium text-muted"}`}
                    >
                      {head}
                    </span>
                    <span className="text-caption text-muted">{text}</span>
                    <span className="tabular text-micro text-faint">
                      {fresh ? "Non lue · " : ""}
                      {relative(n.created_at)}
                    </span>
                  </span>
                  {fresh ? (
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_3px_var(--color-accent-soft)]"
                    />
                  ) : null}
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>
    ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Notifications"
      subtitle={unread.length ? plural(unread.length, "non lue", "non lues") : "Tout est lu"}
      icon={BellIcon}
      tone="accent"
      {...(unread.length
        ? {
            footer: (
              <Button
                variant="secondary"
                icon={CheckIcon}
                className="w-full"
                onClick={() => void readAll()}
              >
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
      {group("Non lues", unread, true)}
      {group("Déjà lues", read, false)}
      <Note>
        Le serveur ne garde que le type de l'alerte et l'identifiant de l'entrée : jamais son nom,
        jamais son mot de passe.
      </Note>
    </Modal>
  );
}
