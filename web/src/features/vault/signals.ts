/** What the vault knows about each entry beyond its content: alerts, rotations, policy. */
import { useMemo } from "react";
import { useBreaches, usePolicies, useRotations } from "../../app/hooks/queries";
import type { Policy, RotationRecord } from "../agent/api";
import type { AlertKind } from "../breaches/scan";

export interface Signals {
  /** Open alert kinds on the entry (a leak, a reuse, a weak or an old password). */
  alerts: Set<AlertKind>;
  /** The rotation still open on it, if any: waiting for you, or running. */
  rotation: RotationRecord | null;
  policy: Policy | null;
}

const NONE: Signals = { alerts: new Set(), rotation: null, policy: null };
const OPEN: RotationRecord["status"][] = ["scheduled", "approved", "in_progress"];

export function useSignals(): { of: (itemId: string) => Signals; ready: boolean } {
  const breaches = useBreaches();
  const rotations = useRotations();
  const policies = usePolicies();
  return useMemo(() => {
    const map = new Map<string, Signals>();
    const get = (id: string): Signals => {
      let s = map.get(id);
      if (!s) {
        s = { alerts: new Set(), rotation: null, policy: null };
        map.set(id, s);
      }
      return s;
    };
    for (const b of breaches.data ?? []) {
      if (b.status !== "open" || !b.item_id || b.kind === "email_breach") continue;
      get(b.item_id).alerts.add(b.kind);
    }
    for (const r of rotations.data ?? []) {
      if (!OPEN.includes(r.status)) continue;
      const s = get(r.item_id);
      // A running rotation says more than one waiting for an answer.
      if (!s.rotation || r.status !== "scheduled") s.rotation = r;
    }
    for (const p of policies.data ?? []) get(p.item_id).policy = p;
    return { of: (id: string) => map.get(id) ?? NONE, ready: breaches.data !== undefined };
  }, [breaches.data, rotations.data, policies.data]);
}
