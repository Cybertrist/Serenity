import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  HandTapIcon,
  PowerIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  TerminalWindowIcon,
  WarningIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAgentStatus, usePolicies, useRotations } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { useToast } from "../../app/toast";
import {
  Button,
  Card,
  Chip,
  Confirm,
  EmptyState,
  Note,
  Row,
  SectionTitle,
  Skeleton,
  Toggle,
} from "../../design";
import { daysUntil, plural } from "../../lib/format";
import { TRIGGER_LABELS } from "../../lib/labels";
import { errorText } from "../account/screens/wording";
import { approve, refuse, setKillSwitch } from "./api";

export function AgentScreen() {
  const session = useSession();
  const shell = useShell();
  const toast = useToast();
  const queryClient = useQueryClient();
  const status = useAgentStatus();
  const rotations = useRotations();
  const policies = usePolicies();
  const { byId } = useEntries();
  const [busy, setBusy] = useState<number | "switch" | null>(null);
  const [switching, setSwitching] = useState<boolean | null>(null);

  const active = status.data ? !status.data.kill_switch : true;
  const toggle = async (on: boolean) => {
    setBusy("switch");
    try {
      await setKillSwitch(session.api, !on);
      await queryClient.invalidateQueries();
      toast(
        on ? "Agent relancé." : "Agent arrêté. Il ne fera plus rien jusqu'à ton feu vert.",
        on ? "ok" : "warn",
      );
      setSwitching(null);
    } catch (e) {
      toast(errorText(e), "crit");
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
          ? "Approuvée. L'agent la joue à son prochain passage."
          : "Refusée. Prochaine échéance repoussée.",
      );
    } catch (e) {
      toast(errorText(e), "crit");
    } finally {
      setBusy(null);
    }
  };

  const pending = (rotations.data ?? []).filter((r) => r.status === "scheduled");
  // Said yes, not done yet: either the executor has not passed, or it cannot.
  const running = (rotations.data ?? []).filter(
    (r) => r.status === "approved" || r.status === "in_progress",
  );
  const upcoming = (policies.data ?? [])
    .filter((p) => p.frequency_days && byId.get(p.item_id)?.item.zone === "agent")
    .sort((a, b) => (a.next_due_at ?? "").localeCompare(b.next_due_at ?? ""));

  return (
    <>
      <Header title="Agent" subtitle="Ce qu'il surveille et ce qu'il te propose." />
      <div className="flex flex-col gap-5 pb-6">
        {status.isLoading ? (
          <Skeleton lines={2} />
        ) : (
          <Card className="flex items-center gap-3.5">
            <Chip
              icon={active ? PowerIcon : ProhibitIcon}
              tone={active ? "accent" : "neutral"}
              duotone
              size={48}
            />
            <span className="flex flex-1 flex-col">
              <span className="text-body font-semibold">
                {active ? "L'agent est actif." : "L'agent est arrêté."}
              </span>
              <span className="text-caption text-muted">
                {active
                  ? "Il surveille la zone agent et prépare les rotations. Ce bouton le coupe tout de suite."
                  : "Le kill switch est enclenché : il ne surveille ni ne change plus rien."}
              </span>
            </span>
            <Toggle
              checked={active}
              label="Agent actif"
              disabled={busy === "switch" || session.offline}
              onChange={(v) => {
                setSwitching(v);
              }}
            />
          </Card>
        )}

        {pending.length ? (
          <section className="flex flex-col gap-3">
            <SectionTitle
              title="En attente de ton accord"
              subtitle="Rien ne bouge tant que tu n'as pas répondu."
            />
            {pending.map((r) => {
              const name = byId.get(r.item_id)?.entry.name ?? "Entrée";
              return (
                <Card key={r.id} className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-3">
                    <Chip icon={HandTapIcon} tone="accent" duotone />
                    <span className="flex flex-col">
                      <span className="text-body font-semibold">{name}</span>
                      <span className="text-caption text-muted">
                        Rotation proposée {TRIGGER_LABELS[r.trigger] ?? ""}.
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      icon={XCircleIcon}
                      className="flex-1"
                      disabled={busy !== null}
                      onClick={() => void decide(r.id, false)}
                    >
                      Refuser
                    </Button>
                    <Button
                      icon={CheckCircleIcon}
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
          </section>
        ) : null}

        {running.length ? (
          <section className="flex flex-col gap-3">
            <SectionTitle
              title="Approuvées, en attente de l'exécuteur"
              subtitle="L'agent les joue à son prochain passage, une par une."
            />
            {running.map((r) => {
              const name = byId.get(r.item_id)?.entry.name ?? "Entrée";
              return (
                <Card key={r.id} className="flex items-center gap-3">
                  <Chip
                    icon={r.error ? WarningIcon : ArrowsClockwiseIcon}
                    tone={r.error ? "warn" : "neutral"}
                    duotone
                  />
                  <span className="flex flex-col">
                    <span className="text-body font-semibold">{name}</span>
                    <span className="text-caption text-muted">
                      {r.error ??
                        (r.status === "in_progress"
                          ? "En cours sur le site."
                          : "En attente du prochain passage de l'agent.")}
                    </span>
                  </span>
                </Card>
              );
            })}
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <SectionTitle
            title="Prochaines rotations"
            subtitle="Zone agent : l'agent change le mot de passe lui-même. Zone personnelle : il te le rappelle."
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={ArrowsClockwiseIcon}
              title="Aucune rotation prévue."
              text="Confie une entrée à l'agent, ouvre-la, puis règle la fréquence de rotation."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    shell.go("vault");
                  }}
                >
                  Aller au coffre
                </Button>
              }
            />
          ) : (
            <Card padded={false}>
              {upcoming.map((p, i) => {
                const due = daysUntil(p.next_due_at);
                const entry = byId.get(p.item_id);
                return (
                  <Row
                    key={p.item_id}
                    first={i === 0}
                    chip={<Chip icon={ArrowsClockwiseIcon} tone="accent" />}
                    title={entry?.entry.name ?? "Entrée"}
                    caption={`Tous les ${String(p.frequency_days)} jours · ${p.mode === "autonomous" ? "sans te demander" : "avec ta validation"}`}
                    trailing={
                      <span className="whitespace-nowrap text-caption text-muted">
                        {due === null ? "" : due <= 0 ? "due" : `dans ${String(due)} j`}
                      </span>
                    }
                    {...(entry
                      ? {
                          onClick: () => {
                            shell.openEntry(p.item_id);
                          },
                        }
                      : {})}
                  />
                );
              })}
            </Card>
          )}
        </section>

        {status.data ? (
          <section className="flex flex-col gap-3">
            <SectionTitle title="Garde-fous" subtitle="Vérifiés par le code, à chaque action." />
            <Card className="flex items-center gap-3">
              <Chip icon={ShieldCheckIcon} tone="ok" duotone />
              <span className="flex flex-col">
                <span className="text-body font-medium">
                  {plural(status.data.max_rotations_per_day, "rotation", "rotations")} au maximum
                  par jour
                </span>
                <span className="text-caption text-muted">
                  {status.data.allowlist.length === 0
                    ? "Aucun site autorisé : l'agent ne peut changer aucun mot de passe seul."
                    : `${plural(status.data.allowlist.length, "site autorisé", "sites autorisés")} à être changés seuls.`}
                </span>
              </span>
            </Card>
            <Note>
              L'allowlist et la limite vivent dans la configuration du serveur, pas dans cette
              interface : elles ne peuvent pas être desserrées depuis un navigateur.
            </Note>
            <Button
              variant="secondary"
              icon={TerminalWindowIcon}
              onClick={() => {
                shell.openSettings("journal");
              }}
            >
              Voir le journal
            </Button>
          </section>
        ) : null}
      </div>

      <Confirm
        open={switching !== null}
        busy={busy === "switch"}
        icon={switching === false ? ProhibitIcon : PowerIcon}
        tone={switching === false ? "warn" : "accent"}
        title={switching === false ? "Arrêter l'agent ?" : "Relancer l'agent ?"}
        explanation={
          switching === false
            ? "Le kill switch est enclenché tout de suite : plus aucune veille ni rotation, jusqu'à ce que tu le relances. Tes entrées ne changent pas."
            : "L'agent reprend la veille des fuites et les rotations prévues dans la zone agent."
        }
        confirmLabel={switching === false ? "Arrêter" : "Relancer"}
        onCancel={() => {
          setSwitching(null);
        }}
        onConfirm={() => void toggle(switching === true)}
      />
    </>
  );
}
