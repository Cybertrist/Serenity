import {
  ArrowsClockwiseIcon,
  AtIcon,
  DevicesIcon,
  GearSixIcon,
  type Icon,
  KeyIcon,
  LockKeyIcon,
  LockKeyOpenIcon,
  PowerIcon,
  SealWarningIcon,
  SignInIcon,
  SparkleIcon,
  TerminalWindowIcon,
  TrashIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { useLogs, type AuditLine } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { EmptyState, LIST, LIST_ITEM, Note, Segmented, Skeleton } from "../../design";
import { dayLabel, time } from "../../lib/format";
import { actionLabel } from "../../lib/labels";

type Filter = "all" | "agent" | "user" | "system" | "failure";

const ACTOR: Record<AuditLine["actor"], { label: string; dot: string }> = {
  agent: { label: "Agent", dot: "bg-violet" },
  user: { label: "Toi", dot: "bg-accent" },
  system: { label: "Système", dot: "bg-faint" },
};

/** The icon of a journal line, from the family of its action. */
function iconOf(action: string): Icon {
  if (action.startsWith("agent.kill_switch") || action === "agent.start" || action === "agent.stop")
    return PowerIcon;
  if (action.startsWith("agent.rotation") || action === "vault.item.rotated")
    return ArrowsClockwiseIcon;
  if (action === "vault.item.delegate" || action.startsWith("agent.")) return SparkleIcon;
  if (action === "watch.email.add" || action === "watch.email.remove") return AtIcon;
  if (action.startsWith("watch.")) return SealWarningIcon;
  if (action === "auth.unlock") return LockKeyOpenIcon;
  if (action === "auth.lock") return LockKeyIcon;
  if (action === "auth.session.revoke") return DevicesIcon;
  if (action.startsWith("auth.password") || action.startsWith("auth.recover")) return KeyIcon;
  if (action.startsWith("auth.")) return SignInIcon;
  if (action.includes("trash")) return TrashIcon;
  if (action.startsWith("vault.")) return VaultIcon;
  return GearSixIcon;
}

function failed(line: AuditLine): boolean {
  return line.outcome === "failure" || line.outcome === "locked";
}

/**
 * The journal: consulted, not worked in, so it lives in the settings, not in the tab bar. The
 * settings give it its title; this is the body.
 */
export function JournalSection() {
  const logs = useLogs();
  const { byId } = useEntries();
  const [filter, setFilter] = useState<Filter>("all");
  const all = logs.data ?? [];
  const lines = all.filter((l) =>
    filter === "all" ? true : filter === "failure" ? failed(l) : l.actor === filter,
  );
  const count = (f: Filter) =>
    all.filter((l) => (f === "all" ? true : f === "failure" ? failed(l) : l.actor === f)).length;
  const options: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Tout", count: count("all") },
    { value: "agent", label: "Agent", count: count("agent") },
    { value: "user", label: "Toi", count: count("user") },
    { value: "system", label: "Système", count: count("system") },
    { value: "failure", label: "Échecs", count: count("failure") },
  ];
  const days: [string, AuditLine[]][] = [];
  for (const line of lines) {
    const day = dayLabel(line.created_at);
    const last = days[days.length - 1];
    if (last?.[0] === day) last[1].push(line);
    else days.push([day, [line]]);
  }
  return (
    <div className="flex flex-col gap-4">
      <Segmented options={options} value={filter} onChange={setFilter} label="Filtrer le journal" />
      {logs.isLoading ? <Skeleton lines={4} /> : null}
      {!logs.isLoading && lines.length === 0 ? (
        <EmptyState
          icon={TerminalWindowIcon}
          title="Rien à signaler."
          text={
            filter === "all"
              ? "Le journal se remplit dès qu'il se passe quelque chose."
              : filter === "failure"
                ? "Aucun échec : tout ce qui a été tenté a marché."
                : "Aucune ligne pour ce filtre."
          }
        />
      ) : null}
      <motion.div
        variants={LIST}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        {days.map(([day, items]) => (
          <motion.section key={day} variants={LIST_ITEM} className="flex flex-col gap-1.5">
            <h3 className="m-0 flex items-center gap-3 px-1">
              <span className="eyebrow first-letter:uppercase">{day}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
              <span className="tabular text-micro text-faint">{items.length}</span>
            </h3>
            <ol className="glass m-0 list-none overflow-hidden rounded-card p-0">
              {items.map((line, i) => {
                const IconComponent = iconOf(line.action);
                const bad = failed(line);
                const name =
                  line.target_type === "item" && line.target_id
                    ? byId.get(line.target_id)?.entry.name
                    : undefined;
                return (
                  <li
                    key={line.id}
                    className={`flex min-h-[50px] items-center gap-3 px-3.5 py-2 ${i ? "border-t border-line" : ""}`}
                  >
                    <span className="tabular w-10 shrink-0 font-mono text-[11.5px] text-faint">
                      {time(line.created_at)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] ${
                        bad
                          ? "bg-crit-soft text-crit"
                          : line.actor === "agent"
                            ? "bg-violet-soft text-violet-text"
                            : line.actor === "user"
                              ? "bg-accent-soft text-accent-text"
                              : "bg-neutral-soft text-muted"
                      }`}
                    >
                      <IconComponent size={15} weight="bold" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-body ${bad ? "text-crit" : ""}`}>
                        {actionLabel(line.action, line.outcome)}
                      </span>
                      {name ? (
                        <span className="truncate text-caption text-muted">{name}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-faint">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${ACTOR[line.actor].dot}`}
                      />
                      {ACTOR[line.actor].label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </motion.section>
        ))}
      </motion.div>
      {lines.length > 0 ? <Note>90 jours d'historique sont gardés.</Note> : null}
    </div>
  );
}
