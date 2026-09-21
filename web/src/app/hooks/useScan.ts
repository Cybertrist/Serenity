/** Breach scan in the browser (both zones), then report: ids and alert kinds only. */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { sharedPwned } from "../../features/breaches/pwned";
import { report, scanPlan, scanVault } from "../../features/breaches/scan";
import { useSession } from "../session";

export interface ScanOptions {
  /** Ask Pwned Passwords about every entry, instead of only those the server says are due. */
  full?: boolean;
}

export function useScan(): {
  scan: (options?: ScanOptions) => Promise<void>;
  scanning: boolean;
  lastScan: Date | null;
} {
  const { api, keyring, vault, offline } = useSession();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const scan = useCallback(
    async (options: ScanOptions = {}) => {
      if (!keyring || offline) return;
      setScanning(true);
      try {
        // The local checks always cover the whole vault; only the network one follows the plan.
        let scope: Set<string> | null = null;
        if (!options.full) {
          try {
            scope = new Set((await scanPlan(api)).items);
          } catch {
            // No plan (old server, or the call failed): fall back to asking about everything.
            scope = null;
          }
        }
        let result;
        try {
          result = await scanVault(vault, keyring, sharedPwned(), new Date(), scope);
        } catch {
          // Pwned Passwords unreachable: the other checks still run, and the scan says so.
          result = await scanVault(vault, keyring, null);
        }
        await report(api, result);
        setLastScan(new Date());
        await queryClient.invalidateQueries({ queryKey: ["breaches"] });
        await queryClient.invalidateQueries({ queryKey: ["scan-plan"] });
        // A leak on an agent entry is scheduled by the server right away: show it.
        await queryClient.invalidateQueries({ queryKey: ["rotations"] });
      } finally {
        setScanning(false);
      }
    },
    [api, keyring, vault, offline, queryClient],
  );
  return { scan, scanning, lastScan };
}
