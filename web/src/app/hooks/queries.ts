/** Server data used by the screens (TanStack Query). Only metadata and encrypted blocks. */
import { useQuery } from "@tanstack/react-query";
import { agentStatus, policies, rotations } from "../../features/agent/api";
import type { BreachRecord } from "../../features/breaches/scan";
import { scanPlan } from "../../features/breaches/scan";
import { useSession } from "../session";

export function useBreaches() {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["breaches"],
    queryFn: () => api.get<BreachRecord[]>("/api/breaches"),
    enabled: phase === "unlocked" && !offline,
  });
}

/** When the server last saw an entry checked against Pwned Passwords, on any device. */
export function useScanPlan() {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["scan-plan"],
    queryFn: () => scanPlan(api),
    enabled: phase === "unlocked" && !offline,
  });
}

export function useRotations(all = false) {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["rotations", all],
    queryFn: () => rotations(api, all),
    enabled: phase === "unlocked" && !offline,
  });
}

export function usePolicies() {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["policies"],
    queryFn: () => policies(api),
    enabled: phase === "unlocked" && !offline,
  });
}

export function useAgentStatus() {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["agent-status"],
    queryFn: () => agentStatus(api),
    enabled: phase === "unlocked" && !offline,
  });
}

export interface AuditLine {
  id: number;
  created_at: string;
  actor: "user" | "agent" | "system";
  action: string;
  outcome: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
}

export function useLogs() {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["logs"],
    queryFn: () => api.get<AuditLine[]>("/api/logs?limit=200"),
    enabled: phase === "unlocked" && !offline,
  });
}

export interface NotificationRecord {
  id: number;
  kind: string;
  breach_id: number | null;
  item_id: string | null;
  created_at: string;
  read_at: string | null;
}

export function useNotifications() {
  const { api, phase, offline } = useSession();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationRecord[]>("/api/notifications?limit=50"),
    enabled: phase === "unlocked" && !offline,
  });
}
