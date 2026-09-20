/** Breach scan in the browser (both zones), then report: ids and alert kinds only. */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { PwnedPasswords } from "../../features/breaches/pwned";
import { report, scanVault } from "../../features/breaches/scan";
import { useSession } from "../session";

export function useScan(): { scan: () => Promise<void>; scanning: boolean; lastScan: Date | null } {
  const { api, keyring, vault, offline } = useSession();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const scan = useCallback(async () => {
    if (!keyring || offline) return;
    setScanning(true);
    try {
      let result;
      try {
        result = await scanVault(vault, keyring, new PwnedPasswords());
      } catch {
        // Pwned Passwords unreachable: the other checks still run, and the scan says so.
        result = await scanVault(vault, keyring, null);
      }
      await report(api, result);
      setLastScan(new Date());
      await queryClient.invalidateQueries({ queryKey: ["breaches"] });
    } finally {
      setScanning(false);
    }
  }, [api, keyring, vault, offline, queryClient]);
  return { scan, scanning, lastScan };
}
