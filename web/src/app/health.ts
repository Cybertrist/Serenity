/**
 * The health of the vault, out of 100, from the real open alerts (docs/05-veille.md).
 *
 * Each entry weighs by its worst alert: seen in a leak counts fully, reused a little more than
 * half, weak half, old a third. The score is the share of the vault left untouched, less a few
 * points per breached email address. An empty vault is healthy; unknown alerts give no score.
 */
import { useMemo } from "react";
import type { BreachRecord } from "../features/breaches/scan";
import { useBreaches } from "./hooks/queries";
import { useEntries } from "./hooks/useEntries";

const WEIGHT: Record<string, number> = { pwned_password: 1, reused: 0.6, weak: 0.5, old: 0.3 };
const EMAIL_PENALTY = 5;

export interface Health {
  /** 0 to 100, or null while the alerts are not known. */
  score: number | null;
  /** Entries with at least one open alert. */
  flagged: number;
  leaked: number;
  reused: number;
  weak: number;
  old: number;
  emails: number;
}

export function healthOf(
  total: number,
  breaches: readonly BreachRecord[],
): Omit<Health, "score"> & {
  score: number;
} {
  const worst = new Map<string, number>();
  const kinds = {
    pwned_password: new Set<string>(),
    reused: new Set<string>(),
    weak: new Set<string>(),
    old: new Set<string>(),
  };
  let emails = 0;
  for (const b of breaches) {
    if (b.status !== "open") continue;
    if (b.kind === "email_breach") {
      emails += 1;
      continue;
    }
    if (!b.item_id) continue;
    kinds[b.kind].add(b.item_id);
    worst.set(b.item_id, Math.max(worst.get(b.item_id) ?? 0, WEIGHT[b.kind] ?? 0));
  }
  let penalty = 0;
  for (const w of worst.values()) penalty += w;
  const share = total > 0 ? 1 - Math.min(1, penalty / total) : 1;
  const score = Math.max(0, Math.min(100, Math.round(share * 100) - emails * EMAIL_PENALTY));
  return {
    score,
    flagged: worst.size,
    leaked: kinds.pwned_password.size,
    reused: kinds.reused.size,
    weak: kinds.weak.size,
    old: kinds.old.size,
    emails,
  };
}

/** The same, live, for the sidebar, the status bar and the screens. */
export function useHealth(): Health {
  const { entries } = useEntries();
  const breaches = useBreaches();
  return useMemo(() => {
    const result = healthOf(entries.length, breaches.data ?? []);
    return breaches.data ? result : { ...result, score: null };
  }, [entries.length, breaches.data]);
}
