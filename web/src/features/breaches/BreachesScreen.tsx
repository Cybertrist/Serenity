import {
  ArrowsClockwiseIcon,
  AtIcon,
  ClockIcon,
  CopyIcon,
  type Icon,
  SealCheckIcon,
  SealWarningIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useBreaches, useScanPlan } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { useScan } from "../../app/hooks/useScan";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { useToast } from "../../app/toast";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  LIST,
  LIST_ITEM,
  Note,
  Pill,
  Skeleton,
} from "../../design";
import { plural, relative } from "../../lib/format";
import { BREACH_LABELS } from "../../lib/labels";

const ICONS: Record<string, Icon> = {
  pwned_password: SealWarningIcon,
  reused: CopyIcon,
  weak: ShieldWarningIcon,
  old: ClockIcon,
  email_breach: AtIcon,
};

export function BreachesScreen() {
  const session = useSession();
  const shell = useShell();
  const toast = useToast();
  const queryClient = useQueryClient();
  const breaches = useBreaches();
  const plan = useScanPlan();
  const { byId } = useEntries();
  const { scan, scanning, lastScan } = useScan();
  const started = useRef(false);

  // A scan runs once when the tab opens with an unlocked vault. The local checks cover
  // everything; the network ones only cover what the server says is due, so re-opening the
  // tab the same day costs nothing (docs/05-veille.md).
  useEffect(() => {
    if (started.current || session.offline) return;
    started.current = true;
    void scan();
  }, [scan, session.offline]);

  const dismiss = async (id: number) => {
    await session.api.post(`/api/breaches/${String(id)}/dismiss`);
    await queryClient.invalidateQueries({ queryKey: ["breaches"] });
    toast("Alerte mise de côté.");
  };

  const list = breaches.data ?? [];
  const accounts = new Set(list.map((b) => b.item_id ?? b.details.email));
  return (
    <>
      <Header
        title="Fuites"
        subtitle="Ce que la veille a trouvé sur tes comptes."
        actions={
          <IconButton
            icon={ArrowsClockwiseIcon}
            label="Vérifier maintenant"
            disabled={scanning || session.offline}
            onClick={() => void scan({ full: true })}
            className={scanning ? "animate-spin" : ""}
          />
        }
      />
      <div className="flex flex-col gap-4 pb-6">
        <Card className="flex items-center gap-3.5">
          <Chip
            icon={list.length === 0 ? SealCheckIcon : SealWarningIcon}
            tone={list.length === 0 ? "ok" : "warn"}
            duotone
            size={44}
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-semibold">
              {list.length === 0
                ? "Tout va bien."
                : `${plural(accounts.size, "compte", "comptes")} à surveiller`}
            </span>
            <span className="text-caption text-muted">
              {scanning
                ? "Vérification en cours…"
                : lastScan
                  ? `Vérifié ${relative(lastScan.toISOString())}`
                  : plan.data?.last_scan_at
                    ? `Vérifié ${relative(plan.data.last_scan_at)}`
                    : "Pas encore vérifié"}
            </span>
          </span>
        </Card>

        {breaches.isLoading ? <Skeleton /> : null}
        {!breaches.isLoading && list.length === 0 ? (
          <EmptyState
            icon={SealCheckIcon}
            title="Aucune alerte."
            text="Aucun mot de passe connu d'une fuite, réutilisé, faible ou trop ancien. La veille tourne côté serveur toutes les 6 h pour la zone agent."
            action={
              <Button
                variant="secondary"
                icon={AtIcon}
                onClick={() => {
                  shell.openSettings("watch");
                }}
              >
                Surveiller une adresse e-mail
              </Button>
            }
          />
        ) : null}

        <motion.div
          variants={LIST}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-4"
        >
          {list.map((b) => {
            const label = BREACH_LABELS[b.kind] ?? {
              title: b.kind,
              hint: "",
              tone: "warn" as const,
            };
            const entry = b.item_id ? byId.get(b.item_id) : undefined;
            const subject =
              entry?.entry.name ??
              (typeof b.details.email === "string" ? b.details.email : "Entrée");
            const itemId = b.item_id;
            return (
              <motion.div key={b.id} variants={LIST_ITEM}>
                <Card className="flex items-start gap-3.5">
                  <Chip
                    icon={ICONS[b.kind] ?? SealWarningIcon}
                    tone={label.tone}
                    duotone
                    size={44}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-body font-semibold">
                      {subject} : {label.title.toLowerCase()}
                    </span>
                    <span className="text-caption text-muted">
                      {b.kind === "email_breach" && typeof b.details.breach === "string"
                        ? `Fuite « ${b.details.breach} ». `
                        : ""}
                      {label.hint}
                    </span>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {b.source === "agent" ? <Pill tone="accent">Vu par l'agent</Pill> : null}
                      {itemId ? (
                        <button
                          type="button"
                          className="min-h-11 rounded-control px-2 text-caption font-medium text-accent transition-colors duration-150 hover:bg-accent-soft"
                          onClick={() => {
                            shell.openEntry(itemId);
                          }}
                        >
                          Ouvrir l'entrée
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="min-h-11 rounded-control px-2 text-caption text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
                        onClick={() => void dismiss(b.id)}
                      >
                        Mettre de côté
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <Note>
          La vérification se fait en k-anonymat : seuls les 5 premiers caractères de l'empreinte
          d'un mot de passe quittent ton appareil, jamais le mot de passe lui-même.
        </Note>
      </div>
    </>
  );
}
