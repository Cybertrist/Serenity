/**
 * The last 24 hours of the agent, on one line: every rotation, leak, proposal and watch pass
 * the journal recorded, placed at its time. Real audit lines only (GET /api/logs), never a
 * made-up rhythm.
 */
import { useMemo } from "react";
import type { AuditLine } from "../../app/hooks/queries";
import { useEntries } from "../../app/hooks/useEntries";
import { actionLabel } from "../../lib/labels";
import { time } from "../../lib/format";

const HOUR = 3_600_000;
const SPAN = 24 * HOUR;

type Kind = "rotation" | "leak" | "proposal" | "watch" | "stop";

const LEGEND: { kind: Exclude<Kind, "stop">; label: string }[] = [
  { kind: "rotation", label: "Rotation" },
  { kind: "leak", label: "Fuite" },
  { kind: "proposal", label: "Proposition" },
  { kind: "watch", label: "Veille" },
];

const DOT: Record<Kind, string> = {
  rotation: "bg-ok border-ok",
  leak: "bg-crit border-crit",
  proposal: "bg-warn border-warn rotate-45 !rounded-[2px]",
  watch: "bg-panel border-faint",
  stop: "bg-panel border-warn",
};

const WATCH = new Set(["watch.scan", "watch.email.scan", "agent.watch", "agent.schedule"]);

/** What a journal line is on the strip, or null when it does not belong there (a login). */
export function kindOf(line: AuditLine): Kind | null {
  const a = line.action;
  if (a === "agent.rotation.execute" || a === "vault.item.rotated") {
    return line.outcome === "failure" ? "leak" : "rotation";
  }
  if (a === "agent.rotation.schedule") return "proposal";
  if (a.startsWith("agent.kill_switch")) return "stop";
  if (WATCH.has(a)) {
    const fresh = Number(line.details.new ?? 0);
    return fresh > 0 ? "leak" : "watch";
  }
  return null;
}

interface Point {
  id: number;
  at: number;
  kind: Kind;
  text: string;
  label: string | null;
}

export function ActivityStrip({
  lines,
  loading,
  now = Date.now(),
}: {
  lines: readonly AuditLine[];
  loading: boolean;
  now?: number;
}) {
  const { byId } = useEntries();
  const start = now - SPAN;
  const points = useMemo(() => {
    const out: Point[] = [];
    for (const line of lines) {
      const at = new Date(line.created_at).getTime();
      if (at < start || at > now) continue;
      const kind = kindOf(line);
      if (!kind) continue;
      const name = line.target_id ? byId.get(line.target_id)?.entry.name : undefined;
      out.push({
        id: line.id,
        at,
        kind,
        text: `${time(line.created_at)} · ${actionLabel(line.action, line.outcome)}${name ? ` · ${name}` : ""}`,
        label: kind === "watch" ? null : (name ?? (kind === "stop" ? "Kill switch" : null)),
      });
    }
    return out.sort((a, b) => a.at - b.at);
  }, [lines, byId, start, now]);

  // Clock marks every six hours inside the window, for the eye to find its way.
  const hours: { at: number; hour: number }[] = [];
  const first = new Date(start);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + HOUR; t < now; t += HOUR) {
    hours.push({ at: t, hour: new Date(t).getHours() });
  }
  const marks = hours
    // The last stretch is where "now" sits: no clock mark under it.
    .filter((h) => h.hour % 6 === 0 && now - h.at > 2.5 * HOUR)
    .map((h) => ({ at: h.at, label: `${String(h.hour).padStart(2, "0")}h` }));
  const frac = (at: number) => (at - start) / SPAN;
  /** A tag near an end hangs inwards, so it is never cut by the card. */
  const anchor = (at: number) =>
    frac(at) < 0.12 ? "" : frac(at) > 0.88 ? "-translate-x-full" : "-translate-x-1/2";
  const x = (at: number) => `${(((at - start) / SPAN) * 100).toFixed(2)}%`;
  // Only the last few notable events carry a name tag: more would overlap.
  const tagged = new Set<number>();
  let lastTag = Infinity;
  for (let i = points.length - 1; i >= 0 && tagged.size < 3; i -= 1) {
    const p = points[i];
    if (!p?.label) continue;
    // Newest first; a tag too close to the one on its right would sit on top of it.
    if (lastTag - frac(p.at) < 0.16) continue;
    tagged.add(p.id);
    lastTag = frac(p.at);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="eyebrow">Activité · 24 h</span>
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0" aria-hidden="true">
          {LEGEND.map((l) => (
            <li key={l.kind} className="flex items-center gap-1.5 text-micro text-faint">
              <span className={`h-2 w-2 rounded-full border-[1.5px] ${DOT[l.kind]}`} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-1 h-[74px]" aria-hidden="true">
        {/* The track, with an hour tick every hour. */}
        <span className="absolute inset-x-0 top-[44px] h-px bg-line-strong" />
        {hours.map((h) => (
          <span
            key={h.at}
            className={`absolute w-px bg-line-strong ${h.hour % 6 === 0 ? "top-[40px] h-[9px]" : "top-[42px] h-[5px] opacity-60"}`}
            style={{ left: x(h.at) }}
          />
        ))}
        {marks.map((m) => (
          <span
            key={m.at}
            className="tabular absolute top-[56px] -translate-x-1/2 font-mono text-[10.5px] text-faint"
            style={{ left: x(m.at) }}
          >
            {m.label}
          </span>
        ))}
        {/* Now, at the right end. */}
        <span className="absolute right-0 top-[34px] h-[20px] w-[2px] translate-x-1/2 rounded-full bg-accent" />
        <span className="tabular absolute right-0 top-[56px] font-mono text-[10.5px] font-semibold text-accent-text">
          {time(new Date(now).toISOString())}
        </span>
        {points.map((p) => (
          <span key={p.id}>
            <span
              title={p.text}
              className={`absolute top-[39px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border-2 ${DOT[p.kind]}`}
              style={{ left: x(p.at) }}
            />
            {tagged.has(p.id) ? (
              <span
                className={`absolute top-[8px] max-w-[110px] ${anchor(p.at)} truncate rounded-[6px] border border-line bg-hover px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted`}
                style={{ left: x(p.at) }}
              >
                {p.label}
              </span>
            ) : null}
          </span>
        ))}
        {!loading && points.length === 0 ? (
          <span className="absolute inset-x-0 top-[14px] text-center text-caption text-faint">
            Rien en 24 h : l'agent n'a encore rien eu à faire.
          </span>
        ) : null}
      </div>

      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.id}>{p.text}</li>
        ))}
      </ul>
    </div>
  );
}
