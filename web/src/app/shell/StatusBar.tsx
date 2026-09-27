import type { ReactNode } from "react";
import { healthTone, Kbd } from "../../design";
import { relative } from "../../lib/format";
import { useHealth } from "../health";
import { useSession } from "../session";
import { useShell } from "./context";
import { useAgentState, useLastScan, useLockCountdown } from "./useShellData";

function Cell({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const box = "flex h-full items-center gap-1.5 px-2.5 whitespace-nowrap";
  return onClick ? (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${box} rounded-[6px] transition-colors duration-150 hover:bg-hover hover:text-muted`}
    >
      {children}
    </button>
  ) : (
    <span className={box} title={title}>
      {children}
    </span>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" | "crit" | "violet" | "off" }) {
  const colour = {
    ok: "bg-ok",
    warn: "bg-warn",
    crit: "bg-crit",
    violet: "bg-violet",
    off: "bg-faint",
  }[tone];
  return <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${colour}`} />;
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m)}:${String(s).padStart(2, "0")}`;
}

/**
 * The foot of a wide window: the state of everything in one line, like an instrument panel.
 * The agent, the last watch, the health, the rotations waiting, and the time left before the
 * vault locks itself. Every figure is real; what is unknown is left out, never guessed.
 */
export function StatusBar() {
  const shell = useShell();
  const session = useSession();
  const agent = useAgentState();
  const health = useHealth();
  const lastScan = useLastScan();
  const left = useLockCountdown();

  return (
    <footer
      aria-label="État du coffre"
      className="relative z-10 flex h-7 shrink-0 items-center gap-0.5 border-t border-line bg-[color-mix(in_oklab,var(--color-surface)_80%,transparent)] px-1.5 text-[11.5px] text-faint backdrop-blur-[20px]"
    >
      {session.offline ? (
        <Cell>
          <Dot tone="off" />
          <b className="font-medium text-muted">Hors ligne</b>, lecture seule
        </Cell>
      ) : agent.running === null ? null : (
        <Cell
          title="Voir l'agent"
          onClick={() => {
            shell.go("agent");
          }}
        >
          <Dot tone={agent.running ? (agent.active > 0 ? "violet" : "ok") : "off"} />
          <b className="font-medium text-muted">
            {agent.running
              ? agent.active > 0
                ? "Agent en action"
                : "Agent actif"
              : "Agent arrêté"}
          </b>
        </Cell>
      )}
      {lastScan ? (
        <Cell>
          Veille <b className="font-medium text-muted">{relative(lastScan)}</b>
        </Cell>
      ) : null}
      {health.score !== null ? (
        <Cell
          title="Voir les fuites"
          onClick={() => {
            shell.go("breaches");
          }}
        >
          <Dot tone={healthTone(health.score)} />
          Santé <b className="tabular font-medium text-muted">{health.score}</b>
        </Cell>
      ) : null}
      {agent.waiting > 0 ? (
        <Cell
          onClick={() => {
            shell.go("agent");
          }}
        >
          <b className="tabular font-medium text-violet-text">{agent.waiting}</b>
          {agent.waiting > 1 ? "rotations en attente" : "rotation en attente"}
        </Cell>
      ) : null}
      <span className="flex-1" />
      {left !== null ? (
        <Cell title="Chaque geste repousse le verrouillage">
          Verrouillage dans <b className="tabular font-medium text-muted">{clock(left)}</b>
        </Cell>
      ) : null}
      <Cell
        title="Palette de commandes"
        onClick={() => {
          shell.openPalette();
        }}
      >
        <Kbd keys="mod+k" className="[&>kbd]:h-[17px] [&>kbd]:text-[10.5px]" />
        commandes
      </Cell>
    </footer>
  );
}
