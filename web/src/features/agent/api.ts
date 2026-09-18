/** Agent API: kill switch, rotation policies, rotations to approve or refuse. */
import type { Api } from "../../lib/api";

export type PolicyMode = "autonomous" | "approval";
export type Frequency = 7 | 30 | 90 | 180 | null;

export interface AgentStatus {
  kill_switch: boolean;
  kill_switch_changed_at: string | null;
  allowlist: string[];
  max_rotations_per_day: number;
  open_rotations: number;
}

export interface Policy {
  item_id: string;
  frequency_days: number | null;
  mode: PolicyMode;
  changed_at: string | null;
  next_due_at: string | null;
}

export interface RotationRecord {
  id: number;
  item_id: string;
  status:
    | "scheduled"
    | "approved"
    | "refused"
    | "in_progress"
    | "succeeded"
    | "failed"
    | "rolled_back"
    | "cancelled";
  trigger: "schedule" | "breach" | "manual";
  mode: PolicyMode;
  requested_at: string;
  decided_at: string | null;
  finished_at: string | null;
  error: string | null;
}

export function agentStatus(api: Api): Promise<AgentStatus> {
  return api.get<AgentStatus>("/api/agent/status");
}

/** Stopping the agent only needs a session; restarting it needs an unlocked vault. */
export function setKillSwitch(api: Api, engaged: boolean): Promise<{ engaged: boolean }> {
  return api.post("/api/agent/kill-switch", { engaged });
}

/** Personal entries accept reminders only (mode "approval"); the server refuses "autonomous". */
export function setPolicy(
  api: Api,
  itemId: string,
  frequency: Frequency,
  mode: PolicyMode,
  changedAt?: string,
): Promise<Policy> {
  return api.request<Policy>("PUT", `/api/vault/items/${itemId}/policy`, {
    frequency_days: frequency,
    mode,
    changed_at: changedAt ?? null,
  });
}

export function policies(api: Api): Promise<Policy[]> {
  return api.get<Policy[]>("/api/agent/policies");
}

export function rotations(api: Api, all = false): Promise<RotationRecord[]> {
  return api.get<RotationRecord[]>(`/api/agent/rotations${all ? "?status=all" : ""}`);
}

export function approve(api: Api, rotationId: number): Promise<RotationRecord> {
  return api.post<RotationRecord>(`/api/agent/rotations/${String(rotationId)}/approve`);
}

export function refuse(api: Api, rotationId: number): Promise<RotationRecord> {
  return api.post<RotationRecord>(`/api/agent/rotations/${String(rotationId)}/refuse`);
}
