import { TerminalWindowIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useLogs, type AuditLine } from "../../app/hooks/queries";
import { Header } from "../../app/shell/Header";
import { Card, EmptyState, Pill, Skeleton, type Tone } from "../../design";
import { dayLabel, time } from "../../lib/format";
import { actionLabel } from "../../lib/labels";

type Filter = "all" | "agent" | "user" | "system";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "agent", label: "Agent" },
  { id: "user", label: "Toi" },
  { id: "system", label: "Système" },
];

const ACTOR: Record<AuditLine["actor"], { label: string; tone: Tone }> = {
  agent: { label: "Agent", tone: "accent" },
  user: { label: "Toi", tone: "neutral" },
  system: { label: "Système", tone: "neutral" },
};

export function JournalScreen() {
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
    <>
      <Header title="Journal" />
      <div role="group" aria-label="Filtrer" className="flex gap-2 overflow-x-auto px-4 pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
            }}
            className={`h-9 shrink-0 rounded-full px-3.5 text-caption font-medium ${filter === f.id ? "bg-text text-bg" : "border border-line bg-surface text-muted"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-6">
        {logs.isLoading ? <Skeleton lines={5} /> : null}
        {!logs.isLoading && lines.length === 0 ? (
          <EmptyState icon={TerminalWindowIcon} text="Rien à signaler." />
        ) : null}
        {days.map(([day, items]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="m-0 px-1 text-caption font-normal text-muted first-letter:uppercase">
              {day}
            </h2>
            <Card padded={false}>
              {items.map((line, i) => (
                <div
                  key={line.id}
                  className={`flex min-h-[52px] items-center gap-3 py-2 ${i ? "border-t border-line" : ""}`}
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
          </section>
        ))}
      </div>
    </>
  );
}
