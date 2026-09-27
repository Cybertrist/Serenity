/** What the chrome shows about the vault: counts, badges, the agent, the mood. Real data only. */
import { useEffect, useRef, useState } from "react";
import type { Mood } from "../../design";
import { useAgentStatus, useNotifications, useRotations, useScanPlan } from "../hooks/queries";
import { useEntries } from "../hooks/useEntries";
import { useHealth } from "../health";
import { useSession } from "../session";

export function useUnread(): number {
  const news = useNotifications();
  return (news.data ?? []).filter((n) => n.read_at === null).length;
}

export interface AgentState {
  /** null while unknown (offline, or the server has not answered). */
  running: boolean | null;
  /** Rotations waiting for the user's answer. */
  waiting: number;
  /** Rotations the agent is doing right now. */
  active: number;
}

export function useAgentState(): AgentState {
  const status = useAgentStatus();
  const rotations = useRotations();
  const list = rotations.data ?? [];
  return {
    running: status.data ? !status.data.kill_switch : null,
    waiting: list.filter((r) => r.status === "scheduled").length,
    active: list.filter((r) => r.status === "approved" || r.status === "in_progress").length,
  };
}

export function useCounts(): { all: number; personal: number; agent: number; codes: number } {
  const { entries } = useEntries();
  let personal = 0;
  let codes = 0;
  for (const e of entries) {
    if (e.item.zone === "personal") personal += 1;
    if (e.entry.totp) codes += 1;
  }
  return { all: entries.length, personal, agent: entries.length - personal, codes };
}

/**
 * The light of the app when no screen asks for another: grey when the agent is stopped,
 * violet while it works or waits for you, amber when something leaked, blue otherwise.
 */
export function useBaseMood(): Mood {
  const agent = useAgentState();
  const health = useHealth();
  if (agent.running === false) return "off";
  if (agent.active > 0) return "agent";
  if (health.leaked > 0 || health.emails > 0) return "leak";
  if (agent.waiting > 0) return "agent";
  return "calm";
}

/**
 * The light a tab asks for by default, before the screen says anything: the agent screen
 * glows violet (grey once stopped), the breaches amber while something is open.
 */
export function useTabMood(tab: "vault" | "codes" | "breaches" | "agent"): Mood | null {
  const agent = useAgentState();
  const health = useHealth();
  if (tab === "agent") return agent.running === false ? "off" : "agent";
  if (tab === "breaches") return health.flagged + health.emails > 0 ? "leak" : "calm";
  return null;
}

export function useLastScan(): string | null {
  const plan = useScanPlan();
  return plan.data?.last_scan_at ?? null;
}

/** Seconds before the automatic lock, ticking once a second. */
export function useLockCountdown(): number | null {
  const session = useSession();
  const lockIn = useRef(session.lockIn);
  lockIn.current = session.lockIn;
  const read = () => {
    const ms = lockIn.current();
    return ms === null ? null : Math.ceil(ms / 1000);
  };
  const [left, setLeft] = useState(read);
  useEffect(() => {
    const id = setInterval(() => {
      const ms = lockIn.current();
      setLeft(ms === null ? null : Math.ceil(ms / 1000));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return left;
}
