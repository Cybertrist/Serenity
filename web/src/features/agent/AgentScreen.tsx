import {
  ArrowsClockwiseIcon,
  CheckIcon,
  HandPalmIcon,
  QuestionIcon,
  ShieldCheckIcon,
  SealWarningIcon,
  TerminalWindowIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  useAgentStatus,
  useLogs,
  usePolicies,
  useRotations,
  type AuditLine,
} from "../../app/hooks/queries";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { useShortcut } from "../../app/shortcuts";
import { useToast } from "../../app/toast";
import {
  Button,
  Card,
  EmptyState,
  HoldSwitch,
  IconButton,
  LIST,
  LIST_ITEM,
  Monogram,
  Note,
  Orb,
  Pill,
  Skeleton,
  StatusCard,
  useMood,
} from "../../design";
import { daysUntil, plural, relative, time } from "../../lib/format";
import { TRIGGER_LABELS } from "../../lib/labels";
import { errorText } from "../account/screens/wording";
import { ActivityStrip } from "./ActivityStrip";
import { approve, refuse, setKillSwitch, type AgentStatus, type RotationRecord } from "./api";

const DAY = 86_400_000;

/** Something the focus is on that Enter already activates: Enter goes to it, not to "approve". */
const ACTIVE = "button, a[href], input, select, textarea, [role='button'], [role='switch']";

export function AgentScreen() {
  const session = useSession();
  const shell = useShell();
  const toast = useToast();
  const queryClient = useQueryClient();
  const status = useAgentStatus();
  const rotations = useRotations();
  const history = useRotations(true);
  const policies = usePolicies();
  const logs = useLogs();
  const { entries, byId } = useEntries();
  const [busy, setBusy] = useState<number | "switch" | null>(null);
  const phone = shell.form === "mobile";

  // Unknown is not "on": offline or unanswered, the screen says it does not know.
  const known = status.data !== undefined && !session.offline;
  const active = status.data ? !status.data.kill_switch : false;
  useMood(known ? (active ? "agent" : "off") : null);

  /** The hold is the confirmation: no dialog after it. */
  const toggle = async (on: boolean) => {
    setBusy("switch");
    try {
      await setKillSwitch(session.api, !on);
      await queryClient.invalidateQueries();
      toast(
        on ? "Agent relancé." : "Agent arrêté. Il ne fera plus rien jusqu'à ton feu vert.",
        on ? "ok" : "warn",
      );
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
  const first = pending[0];
  const canDecide = busy === null && !session.offline;

  useShortcut(
    "enter",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest(ACTIVE) : null;
      if (target instanceof HTMLElement) {
        target.click();
        return;
      }
      if (first && active && canDecide) void decide(first.id, true);
    },
    { enabled: first !== undefined },
  );

  // What the agent did lately, from the real journal.
  const lines = logs.data ?? [];
  const lastWatch = lines.find(
    (l) => l.actor === "agent" && (l.action === "watch.scan" || l.action === "agent.watch"),
  );
  const agentEntries = entries.filter((e) => e.item.zone === "agent").length;
  const since = Date.now() - 30 * DAY;
  const recent = (history.data ?? []).filter(
    (r) => r.finished_at !== null && new Date(r.finished_at).getTime() >= since,
  );
  const done = recent.filter((r) => r.status === "succeeded").length;
  const failed = recent.filter((r) => r.status === "failed" || r.status === "rolled_back").length;

  const proposals = (
    <AnimatePresence initial={false}>
      {pending.length ? (
        <motion.section
          key="pending"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex flex-col gap-3"
        >
          <Eyebrow
            dot="bg-warn"
            title="En attente de ton accord"
            trailing="Rien ne bouge tant que tu n'as pas répondu"
          />
          {pending.map((r, i) => (
            <Proposal
              key={r.id}
              rotation={r}
              entry={byId.get(r.item_id)}
              allowlist={status.data?.allowlist ?? []}
              first={i === 0}
              phone={phone}
              active={active}
              busy={busy === r.id}
              disabled={!canDecide}
              onDecide={(yes) => void decide(r.id, yes)}
            />
          ))}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <Header
        title="Agent"
        subtitle="Ce qu'il surveille, ce qu'il te propose, et ce qu'il a fait."
        actions={
          phone ? (
            <IconButton
              icon={TerminalWindowIcon}
              label="Voir le journal"
              className="!h-10 !w-10 !rounded-[12px] bg-hover text-text"
              onClick={() => {
                shell.openSettings("journal");
              }}
            />
          ) : (
            <Button
              variant="secondary"
              icon={TerminalWindowIcon}
              onClick={() => {
                shell.openSettings("journal");
              }}
            >
              Voir le journal
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-5 pb-6">
        {/* On a phone, what waits for an answer comes first, right under the thumb. */}
        {phone ? proposals : null}
        <div className="grid gap-4 @[1100px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] @[1100px]:gap-5">
          {status.isLoading && !session.offline ? (
            <Skeleton lines={2} />
          ) : !known ? (
            <StatusCard
              icon={QuestionIcon}
              tone="neutral"
              title="État de l'agent inconnu"
              text={
                session.offline
                  ? "Hors ligne : impossible de savoir s'il tourne, ni de l'arrêter d'ici."
                  : "Le serveur n'a pas répondu. Réessaie dans un instant."
              }
            />
          ) : (
            <StateCard
              active={active}
              busy={busy === "switch"}
              status={status.data}
              lastWatch={lastWatch}
              watched={agentEntries}
              onToggle={(on) => void toggle(on)}
            />
          )}

          <Card className="flex min-w-0 flex-col gap-4">
            <ActivityStrip lines={lines} loading={logs.isLoading} />
            <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line @[620px]:grid-cols-4">
              <Stat label="Surveillées" value={agentEntries} unit="entrées" />
              <Stat label="Rotations 30 j" value={done} unit={done ? "prouvées" : ""} />
              <Stat
                label="En attente"
                value={pending.length}
                tone={pending.length ? "warn" : undefined}
              />
              <Stat label="Échecs 30 j" value={failed} tone={failed ? "crit" : undefined} />
            </dl>
          </Card>
        </div>

        {phone ? null : proposals}

        {running.length ? (
          <section className="flex flex-col gap-3">
            <Eyebrow
              dot="bg-violet"
              title="Rotations en cours"
              trailing="Une par une, au passage de l'agent"
            />
            {running.map((r) => (
              <Running key={r.id} rotation={r} entry={byId.get(r.item_id)} />
            ))}
          </section>
        ) : null}

        <div className="grid items-start gap-5 @[1100px]:grid-cols-2">
          <section className="flex flex-col gap-3">
            <Eyebrow title="Prochaines rotations" trailing="Zone agent, à la date prévue" />
            {policies.isLoading && !session.offline ? (
              <Skeleton lines={2} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={ArrowsClockwiseIcon}
                title="Aucune rotation prévue."
                text="Confie une entrée à l'agent, ouvre-la, puis règle la fréquence de rotation."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      shell.setVaultZone("agent");
                      shell.go("vault");
                    }}
                  >
                    Voir la zone agent
                  </Button>
                }
              />
            ) : (
              <Card padded={false}>
                <motion.ul
                  variants={LIST}
                  initial="initial"
                  animate="animate"
                  className="m-0 list-none p-0"
                >
                  {upcoming.map((p, i) => {
                    const due = daysUntil(p.next_due_at);
                    const entry = byId.get(p.item_id);
                    const name = entry?.entry.name ?? "Entrée";
                    return (
                      <motion.li key={p.item_id} variants={LIST_ITEM}>
                        <button
                          type="button"
                          disabled={!entry}
                          onClick={() => {
                            shell.openEntry(p.item_id);
                          }}
                          className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover disabled:hover:bg-transparent ${i ? "border-t border-line" : ""}`}
                        >
                          <Monogram name={name} size={34} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-body font-medium">{name}</span>
                            <span className="truncate text-caption text-muted">
                              {entry?.domain ? `${entry.domain} · ` : ""}
                              {p.mode === "autonomous" ? "sans te demander" : "avec ton accord"}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end">
                            <span className="tabular text-caption font-medium">
                              {p.next_due_at
                                ? new Date(p.next_due_at).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "long",
                                  })
                                : ""}
                            </span>
                            <span className="tabular text-micro text-faint">
                              {due === null
                                ? `tous les ${String(p.frequency_days)} j`
                                : due <= 0
                                  ? "à faire"
                                  : `dans ${String(due)} j`}
                            </span>
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              </Card>
            )}
          </section>

          {status.data ? <Guards status={status.data} /> : null}
        </div>
      </div>
    </>
  );
}

function Eyebrow({ title, trailing, dot }: { title: string; trailing?: string; dot?: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      {dot ? (
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      ) : null}
      <h2 className="eyebrow m-0 shrink-0">{title}</h2>
      <span aria-hidden="true" className="hidden h-px flex-1 bg-line @[620px]:block" />
      {trailing ? (
        <span className="ml-auto hidden text-micro text-faint @[620px]:block">{trailing}</span>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number;
  unit?: string;
  tone?: "warn" | "crit" | undefined;
}) {
  return (
    <div className="flex flex-col gap-1 bg-[color-mix(in_oklab,var(--color-panel)_70%,transparent)] px-3.5 py-3">
      <dt className="eyebrow !text-[10px]">{label}</dt>
      <dd className="m-0 flex items-baseline gap-1.5">
        <span
          className={`tabular font-sans text-[24px] font-semibold tracking-[-0.02em] leading-none ${tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn-text" : ""}`}
        >
          {value}
        </span>
        {unit ? <span className="text-micro text-faint">{unit}</span> : null}
      </dd>
    </div>
  );
}

function StateCard({
  active,
  busy,
  status,
  lastWatch,
  watched,
  onToggle,
}: {
  active: boolean;
  busy: boolean;
  status: AgentStatus;
  lastWatch: AuditLine | undefined;
  watched: number;
  onToggle: (on: boolean) => void;
}) {
  const next = lastWatch
    ? new Date(new Date(lastWatch.created_at).getTime() + 6 * 3_600_000)
    : null;
  const line = active
    ? lastWatch
      ? `Dernière veille à ${time(lastWatch.created_at)}, ${plural(watched, "entrée confiée", "entrées confiées")}.${next && next.getTime() > Date.now() ? ` Prochaine vers ${time(next.toISOString())}.` : ""}`
      : `Il surveille ${plural(watched, "entrée confiée", "entrées confiées")} et prépare les rotations.`
    : status.kill_switch_changed_at
      ? `Kill switch enclenché ${relative(status.kill_switch_changed_at)}. Plus aucune veille ni rotation.`
      : "Kill switch enclenché. Plus aucune veille ni rotation.";
  return (
    <Card halo className="flex flex-col gap-4 @[620px]:!p-5">
      <div className="flex items-center gap-4">
        <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full bg-hover shadow-[inset_0_0_0_1px_var(--color-line)]">
          <Orb size={40} off={!active} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="eyebrow">Kill switch</span>
            <span
              className={`eyebrow !tracking-[0.08em] ${active ? "!text-ok" : "!text-warn-text"}`}
            >
              {active ? "En marche" : "Arrêté"}
            </span>
          </span>
          <p className="m-0 font-display text-[21px] font-bold leading-tight tracking-[-0.01em]">
            {active ? "L'agent veille" : "L'agent est arrêté"}
          </p>
          <p className="m-0 text-caption text-muted">{line}</p>
        </div>
      </div>
      <HoldSwitch
        checked={active}
        disabled={busy}
        label="Kill switch de l'agent"
        onChange={onToggle}
        className="[&>button]:max-w-none"
      />
      <p className="m-0 text-caption text-faint">
        Ce switch est relu avant chaque action : coupé, l'agent s'arrête net. Tes entrées ne
        changent pas.
      </p>
    </Card>
  );
}

/** The four steps of a rotation, in the words of what the agent will really do. */
function steps(entry: VaultEntry | undefined, allowlist: readonly string[]) {
  const domain = entry?.domain ?? null;
  const allowed =
    domain !== null && allowlist.some((d) => domain === d || domain.endsWith(`.${d}`));
  return [
    {
      title: "Générer",
      text: "Un mot de passe neuf de 24 caractères, gardé en révision en attente.",
    },
    {
      title: "Changer",
      text: allowed
        ? `Connexion à ${domain} et remplacement du mot de passe.`
        : "Ce site n'est pas dans l'allowlist : tu feras le changement toi-même, guidé.",
    },
    { title: "Prouver", text: "Reconnexion avec le nouveau : l'ancien doit être refusé." },
    { title: "Valider", text: "La révision devient la bonne. Sinon, retour à l'ancien." },
  ];
}

function Proposal({
  rotation,
  entry,
  allowlist,
  first,
  phone,
  active,
  busy,
  disabled,
  onDecide,
}: {
  rotation: RotationRecord;
  entry: VaultEntry | undefined;
  allowlist: readonly string[];
  first: boolean;
  phone: boolean;
  active: boolean;
  busy: boolean;
  disabled: boolean;
  onDecide: (yes: boolean) => void;
}) {
  const name = entry?.entry.name ?? "Entrée";
  return (
    <Card halo padded={false} className="flex flex-col">
      <div className="flex items-start gap-3.5 p-4 @[620px]:px-5 @[620px]:pt-5">
        <Monogram name={name} size={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="m-0 text-heading">Changer le mot de passe de {name}</p>
          <p className="m-0 text-caption text-muted">
            Proposée {relative(rotation.requested_at)}, {TRIGGER_LABELS[rotation.trigger]}.
          </p>
        </div>
        <span className="hidden @[620px]:block">
          <Pill tone="violet">En attente de ton accord</Pill>
        </span>
      </div>
      <div className="flex flex-col gap-4 px-4 pb-4 @[620px]:px-5">
        {rotation.trigger === "breach" ? (
          <Note tone="warn" icon={SealWarningIcon}>
            Le mot de passe actuel est apparu dans une fuite connue. Plus vite il change, mieux
            c'est.
          </Note>
        ) : null}
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Ce que l'agent fera</span>
          <ol className="m-0 grid list-none gap-1.5 p-0 @[620px]:grid-cols-2 @[620px]:gap-2 @[900px]:grid-cols-4">
            {steps(entry, allowlist).map((s, i) => (
              <li
                key={s.title}
                className="grid grid-cols-[auto_1fr] gap-x-3 rounded-[12px] border border-line bg-hover px-3 py-2.5 @[620px]:flex @[620px]:flex-col @[620px]:gap-1 @[620px]:p-3"
              >
                <span className="tabular row-span-2 pt-0.5 font-mono text-[11px] font-semibold text-violet-text">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-body font-semibold">{s.title}</span>
                <span className="text-caption text-muted">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line p-3 @[620px]:px-5">
        <span className="mr-auto hidden items-center gap-2 text-caption text-faint @[620px]:flex">
          <HandPalmIcon size={15} aria-hidden="true" />
          {active
            ? "Rien ne bouge tant que tu n'as pas répondu."
            : "Relance l'agent pour approuver."}
        </span>
        <Button
          variant={phone ? "secondary" : "ghost"}
          size={phone ? "lg" : "md"}
          icon={XIcon}
          disabled={disabled}
          className={phone ? "flex-1" : ""}
          onClick={() => {
            onDecide(false);
          }}
        >
          Refuser
        </Button>
        <Button
          size={phone ? "lg" : "md"}
          icon={CheckIcon}
          busy={busy}
          disabled={disabled || !active}
          className={phone ? "flex-[1.6]" : ""}
          {...(first ? { kbd: "enter" } : {})}
          onClick={() => {
            onDecide(true);
          }}
        >
          Approuver
        </Button>
      </div>
    </Card>
  );
}

function Running({ rotation, entry }: { rotation: RotationRecord; entry: VaultEntry | undefined }) {
  const name = entry?.entry.name ?? "Entrée";
  const going = rotation.status === "in_progress";
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Monogram name={name} size={36} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold">
            {name} : {going ? "rotation en cours" : "approuvée"}
          </span>
          <span className={`text-caption ${rotation.error ? "text-warn-text" : "text-muted"}`}>
            {rotation.error ??
              (going
                ? "Changement sur le site, puis reconnexion pour preuve."
                : "Étape 1 sur 4 : elle part au prochain passage de l'agent.")}
          </span>
        </div>
        {rotation.error ? (
          <WarningIcon size={18} className="shrink-0 text-warn-text" aria-hidden="true" />
        ) : going ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-violet border-r-transparent"
          />
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={`Rotation de ${name}`}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={going ? 2 : 1}
        className="relative h-1.5 overflow-hidden rounded-full bg-track/40"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-accent to-violet ${going ? "w-[62%] animate-pulse" : "w-[18%]"}`}
        />
      </div>
    </Card>
  );
}

function Guards({ status }: { status: AgentStatus }) {
  const items = [
    {
      title: `${plural(status.max_rotations_per_day, "rotation", "rotations")} au maximum par jour`,
      text: "Au-delà, l'agent attend le lendemain.",
    },
    {
      title:
        status.allowlist.length === 0
          ? "Aucun site autorisé à être changé seul"
          : plural(
              status.allowlist.length,
              "site autorisé à être changé seul",
              "sites autorisés à être changés seuls",
            ),
      text:
        status.allowlist.length === 0
          ? "L'agent prépare, mais c'est toi qui changes."
          : status.allowlist.join(", "),
    },
    {
      title: "L'ancien mot de passe est gardé",
      text: "Jusqu'à ce que la reconnexion prouve le nouveau.",
    },
    {
      title: "Jamais la zone personnelle",
      text: "Il ne peut pas la lire : il te prévient, c'est tout.",
    },
  ];
  return (
    <section className="flex flex-col gap-3">
      <Eyebrow title="Garde-fous" trailing="Vérifiés par le code, à chaque action" />
      <Card className="flex flex-col gap-3.5">
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((g) => (
            <li key={g.title} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-ok-soft text-ok">
                <ShieldCheckIcon size={14} weight="bold" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-body font-medium">{g.title}</span>
                <span className="break-words text-caption text-muted">{g.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 border-t border-line pt-3 text-caption text-faint">
          Ces limites vivent dans la configuration du serveur : aucun navigateur ne peut les
          desserrer.
        </p>
      </Card>
    </section>
  );
}
