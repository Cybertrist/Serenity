/**
 * Scan in the browser, both zones, while the vault is unlocked. What leaves: entry ids and
 * alert kinds (and 5-character SHA-1 prefixes for Pwned Passwords). Never a password.
 */
import type { Api } from "../../lib/api";
import type { Keyring } from "../../vault/keyring";
import { decryptRecord, type VaultState } from "../../vault/state";
import type { PwnedPasswords } from "./pwned";
import { isOld, isWeak, parseDate } from "./rules";

export type AlertKind = "pwned_password" | "reused" | "weak" | "old";

export interface ScanAlert {
  item_id: string;
  kind: AlertKind;
}

export interface ScanResult {
  scanned: string[];
  /** Kinds really verified: without Pwned Passwords, "pwned_password" is left out. */
  checked: AlertKind[];
  alerts: ScanAlert[];
  /** Entries really asked about on the network. The rest keep the alert they already have. */
  pwned_scanned: string[];
}

/** Requests in flight against Pwned Passwords. A first scan of a large vault is a lot of them. */
const PWNED_BATCH = 6;

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(run));
  }
}

/**
 * The local checks (reused, weak, old) always cover the whole vault: they cost nothing and
 * reuse can only be seen by comparing every entry. Only the network check follows `pwnedScope`,
 * the entries the server says are due (GET /api/watch/plan). `null` means all of them.
 */
export async function scanVault(
  state: VaultState,
  keyring: Keyring,
  pwned: PwnedPasswords | null,
  now = new Date(),
  pwnedScope: Set<string> | null = null,
): Promise<ScanResult> {
  const scanned: string[] = [];
  const alerts: ScanAlert[] = [];
  const byPassword = new Map<string, string[]>();
  const toAsk: { id: string; password: string }[] = [];
  for (const item of state.active()) {
    scanned.push(item.id);
    const entry = decryptRecord(keyring, item);
    const password = typeof entry.password === "string" ? entry.password : "";
    if (!password) continue;
    byPassword.set(password, [...(byPassword.get(password) ?? []), item.id]);
    if (isWeak(password)) alerts.push({ item_id: item.id, kind: "weak" });
    const changed = parseDate(entry.passwordChangedAt) ?? parseDate(item.created_at);
    if (isOld(changed, now)) alerts.push({ item_id: item.id, kind: "old" });
    if (pwned && (pwnedScope === null || pwnedScope.has(item.id))) {
      toAsk.push({ id: item.id, password });
    }
  }
  await inBatches(toAsk, PWNED_BATCH, async ({ id, password }) => {
    if (pwned && (await pwned.occurrences(password)) > 0) {
      alerts.push({ item_id: id, kind: "pwned_password" });
    }
  });
  for (const ids of byPassword.values()) {
    if (ids.length > 1) for (const id of ids) alerts.push({ item_id: id, kind: "reused" });
  }
  const checked: AlertKind[] = pwned
    ? ["pwned_password", "reused", "weak", "old"]
    : ["reused", "weak", "old"];
  return { scanned, checked, alerts, pwned_scanned: toAsk.map((e) => e.id) };
}

export interface ScanPlan {
  items: string[];
  last_scan_at: string | null;
  recheck_hours: number;
}

export function scanPlan(api: Api): Promise<ScanPlan> {
  return api.get<ScanPlan>("/api/watch/plan");
}

export interface ScanSummary {
  new: number;
  open: number;
  resolved: number;
}

export function report(api: Api, result: ScanResult): Promise<ScanSummary> {
  return api.post<ScanSummary>("/api/watch/report", result);
}

export interface BreachRecord {
  id: number;
  kind: AlertKind | "email_breach";
  item_id: string | null;
  source: "client" | "agent" | "hibp";
  status: "open" | "resolved" | "dismissed";
  details: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
}

export function openBreaches(api: Api): Promise<BreachRecord[]> {
  return api.get<BreachRecord[]>("/api/breaches");
}
