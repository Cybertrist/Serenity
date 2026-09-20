import { TerminalWindowIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { useLogs, type AuditLine } from "../../app/hooks/queries";
import {
  Card,
  EmptyState,
  LIST,
  LIST_ITEM,
  Note,
  Pill,
  Segmented,
  Skeleton,
  type Tone,
} from "../../design";
import { dayLabel, time } from "../../lib/format";
import { actionLabel } from "../../lib/labels";

type Filter = "all" | "agent" | "user" | "system";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "agent", label: "Agent" },
  { value: "user", label: "Toi" },
  { value: "system", label: "Système" },
];

const ACTOR: Record<AuditLine["actor"], { label: string; tone: Tone }> = {
  agent: { label: "Agent", tone: "accent" },
  user: { label: "Toi", tone: "neutral" },
  system: { label: "Système", tone: "neutral" },
};

/** The journal: consulted, not worked in, so it lives in the settings, not in the tab bar. */
export function JournalSection() {
  const logs = useLogs();
  const [filter, setFilter] = useState<Filter>("all");
  const lines = (logs.data ?? []).filter((l) => filter === "all" || l.actor === filter);
  const days: [string, AuditLine[]][] = [];
  for (const line of lines) {
    const day = dayLabel(line.created_at);
    const last = days[days.length - 1];
    if (last?.[0] === day) last[1].push(line);
    else days.push([day, [line]]);
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Journal</p>
        <p className="m-0 text-caption text-muted">
          Chaque action de l'agent et chaque connexion laissent une ligne ici. Aucun secret n'y
          figure jamais.
        </p>
      </div>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} label="Filtrer par acteur" />
      {logs.isLoading ? <Skeleton lines={4} /> : null}
      {!logs.isLoading && lines.length === 0 ? (
        <EmptyState
          icon={TerminalWindowIcon}
          title="Rien à signaler."
          text={
            filter === "all"
              ? "Le journal se remplit dès qu'il se passe quelque chose."
              : "Aucune ligne pour ce filtre."
          }
        />
      ) : null}
      <motion.div
        variants={LIST}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3"
      >
        {days.map(([day, items]) => (
          <motion.section key={day} variants={LIST_ITEM} className="flex flex-col gap-2">
            <h3 className="m-0 px-1 text-caption font-normal text-muted first-letter:uppercase">
              {day}
            </h3>
            <Card padded={false}>
              {items.map((line, i) => (
                <div
                  key={line.id}
                  className={`flex min-h-[52px] items-center gap-3 px-4 py-2 ${i ? "border-t border-line" : ""}`}
                >
                  <span className="w-11 shrink-0 font-mono text-caption text-muted">
                    {time(line.created_at)}
                  </span>
                  <span className="min-w-0 flex-1 text-body">
                    {actionLabel(line.action, line.outcome)}
                  </span>
                  <Pill tone={ACTOR[line.actor].tone}>{ACTOR[line.actor].label}</Pill>
                </div>
              ))}
            </Card>
          </motion.section>
        ))}
      </motion.div>
      {lines.length > 0 ? <Note>90 jours d'historique sont gardés.</Note> : null}
    </div>
  );
}
