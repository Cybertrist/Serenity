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
import { useBreaches } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { useScan } from "../../app/hooks/useScan";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { useToast } from "../../app/toast";
import { Button, Card, Chip, EmptyState, IconButton, Pill, Skeleton, stagger } from "../../design";
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
  const { byId } = useEntries();
  const { scan, scanning, lastScan } = useScan();
  const started = useRef(false);

  // A scan runs once when the tab opens with an unlocked vault.
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
        actions={
          <IconButton
            icon={ArrowsClockwiseIcon}
            label="Vérifier maintenant"
            disabled={scanning}
            onClick={() => void scan()}
          />
        }
      />
      <div className="flex flex-col gap-3 px-4 pb-6">
        <Card>
          <p className="m-0 text-caption text-muted">
            {scanning
              ? "Vérification en cours…"
              : lastScan
                ? `Vérifié ${relative(lastScan.toISOString())}`
                : "Veille des fuites"}
          </p>
          <p className="m-0 mt-1 text-title">
            {list.length === 0
              ? "Tout va bien."
              : `${plural(accounts.size, "compte", "comptes")} à surveiller`}
          </p>
        </Card>
        {breaches.isLoading ? <Skeleton /> : null}
        {!breaches.isLoading && list.length === 0 ? (
          <EmptyState icon={SealCheckIcon} text="Aucune fuite, aucun mot de passe faible." />
        ) : null}
        {list.map((b, i) => {
          const label = BREACH_LABELS[b.kind] ?? { title: b.kind, hint: "", tone: "warn" as const };
          const entry = b.item_id ? byId.get(b.item_id) : undefined;
          const subject =
            entry?.entry.name ?? (typeof b.details.email === "string" ? b.details.email : "Entrée");
          const itemId = b.item_id;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={stagger(i)}
            >
              <Card className="flex items-start gap-3">
                <Chip icon={ICONS[b.kind] ?? SealWarningIcon} tone={label.tone} duotone />
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
                        className="min-h-11 px-1 text-caption text-accent"
                        onClick={() => {
                          shell.openEntry(itemId);
                        }}
                      >
                        Ouvrir
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="min-h-11 px-1 text-caption text-muted"
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
        <p className="m-0 py-1 text-center text-caption text-muted">
          Seuls 5 caractères d'empreinte quittent ton appareil.
        </p>
        {list.length > 0 ? null : (
          <Button variant="ghost" onClick={shell.openSettings}>
            Surveiller une adresse e-mail
          </Button>
        )}
      </div>
    </>
  );
}
