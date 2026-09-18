import {
  ArrowsClockwiseIcon,
  HandTapIcon,
  PowerIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAgentStatus, usePolicies, useRotations } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useToast } from "../../app/toast";
import { Button, Card, Chip, EmptyState, Row, SectionTitle, Skeleton, Toggle } from "../../design";
import { daysUntil, plural } from "../../lib/format";
import { TRIGGER_LABELS } from "../../lib/labels";
import { errorText } from "../account/screens/AuthLayout";
import { approve, refuse, setKillSwitch } from "./api";

export function AgentScreen() {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const status = useAgentStatus();
  const rotations = useRotations();
  const policies = usePolicies();
  const { byId } = useEntries();
  const [busy, setBusy] = useState<number | "switch" | null>(null);

  const active = status.data ? !status.data.kill_switch : true;
  const toggle = async (on: boolean) => {
    setBusy("switch");
    try {
      await setKillSwitch(session.api, !on);
      await queryClient.invalidateQueries();
      toast(on ? "Agent relancé." : "Agent arrêté. Il ne fera plus rien jusqu'à ton feu vert.");
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(null);
    }
  };
  const decide = async (id: number, yes: boolean) => {
    setBusy(id);
    try {
      await (yes ? approve : refuse)(session.api, id);
      await queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast(
        yes
          ? "Approuvée. Le changement se fera quand l'exécuteur sera prêt (V3)."
          : "Refusée. Prochaine échéance repoussée.",
      );
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const pending = (rotations.data ?? []).filter((r) => r.status === "scheduled");
  const upcoming = (policies.data ?? [])
    .filter((p) => p.frequency_days && byId.get(p.item_id)?.item.zone === "agent")
    .sort((a, b) => (a.next_due_at ?? "").localeCompare(b.next_due_at ?? ""));

  return (
    <>
      <Header title="Agent" />
      <div className="flex flex-col gap-3 px-4 pb-6">
        {status.isLoading ? (
          <Skeleton lines={2} />
        ) : (
          <Card className="flex items-center gap-3.5">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${active ? "bg-accent-soft text-accent" : "bg-neutral-soft text-muted"}`}
            >
              <PowerIcon size={24} weight="duotone" aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-body font-semibold">
                {active ? "L'agent est actif." : "L'agent est arrêté."}
              </span>
              <span className="text-caption text-muted">
                {active
                  ? "Coupe-le d'un geste, à tout moment."
                  : "Relance-le avec ton mot de passe maître."}
              </span>
            </span>
            <Toggle
              checked={active}
              label="Agent actif"
              disabled={busy === "switch" || session.offline}
              onChange={(v) => void toggle(v)}
            />
          </Card>
        )}

        {pending.map((r) => {
          const name = byId.get(r.item_id)?.entry.name ?? "Entrée";
          return (
            <Card key={r.id} className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <Chip icon={HandTapIcon} tone="accent" duotone />
                <span className="flex flex-col">
                  <span className="text-body font-semibold">{name} attend ton accord</span>
                  <span className="text-caption text-muted">
                    Rotation proposée {TRIGGER_LABELS[r.trigger] ?? ""}.
                  </span>
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={busy !== null}
                  onClick={() => void decide(r.id, false)}
                >
                  Refuser
                </Button>
                <Button
                  className="flex-1"
                  busy={busy === r.id}
                  disabled={busy !== null || !active}
                  onClick={() => void decide(r.id, true)}
                >
                  Approuver
                </Button>
              </div>
            </Card>
          );
        })}

        <SectionTitle
          title="Prochaines rotations"
          subtitle="Des rappels en V1 : rien ne change sans toi."
        />
        {upcoming.length === 0 ? (
          <EmptyState
            icon={ArrowsClockwiseIcon}
            text="Aucune rotation prévue. Ouvre une entrée confiée pour en régler une."
          />
        ) : (
          <Card padded={false}>
            {upcoming.map((p, i) => {
              const due = daysUntil(p.next_due_at);
              return (
                <Row
                  key={p.item_id}
                  first={i === 0}
                  chip={<Chip icon={ArrowsClockwiseIcon} />}
                  title={byId.get(p.item_id)?.entry.name ?? "Entrée"}
                  caption={`Tous les ${String(p.frequency_days)} jours · ${p.mode === "autonomous" ? "autonome" : "validation"}`}
                  trailing={
                    <span className="whitespace-nowrap text-caption text-muted">
                      {due === null ? "" : due <= 0 ? "due" : `${String(due)} j`}
                    </span>
                  }
                />
              );
            })}
          </Card>
        )}
        {status.data ? (
          <Card className="flex items-center gap-3">
            <Chip icon={ShieldCheckIcon} tone="ok" />
            <span className="flex flex-col">
              <span className="text-body font-medium">
                {plural(status.data.max_rotations_per_day, "rotation", "rotations")} max par jour
              </span>
              <span className="text-caption text-muted">
                {status.data.allowlist.length === 0
                  ? "Aucun site autorisé à changer seul pour l'instant."
                  : plural(status.data.allowlist.length, "site autorisé", "sites autorisés")}
              </span>
            </span>
          </Card>
        ) : null}
      </div>
    </>
  );
}
