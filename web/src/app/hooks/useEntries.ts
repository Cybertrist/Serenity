/** Decrypted view of the vault for the screens. Recomputed when the vault state changes. */
import { useMemo } from "react";
import type { Entry } from "../../crypto/items";
import { domainOf } from "../../lib/format";
import { decryptRecord, type ItemRecord } from "../../vault/state";
import { useSession } from "../session";

export interface VaultEntry {
  item: ItemRecord;
  entry: Entry;
  domain: string | null;
}

export function useEntries(): {
  entries: VaultEntry[];
  trash: VaultEntry[];
  byId: Map<string, VaultEntry>;
} {
  const { keyring, vault, version } = useSession();
  return useMemo(() => {
    const all: VaultEntry[] = [];
    if (keyring && !keyring.isWiped) {
      for (const item of vault.items.values()) {
        if (item.block === null) continue;
        try {
          const entry = decryptRecord(keyring, item);
          all.push({ item, entry, domain: domainOf(entry.urls) });
        } catch {
          // A block that does not decrypt is skipped (tampered or foreign); the rest still shows.
        }
      }
    }
    all.sort((a, b) => a.entry.name.localeCompare(b.entry.name, "fr"));
    return {
      entries: all.filter((e) => e.item.deleted_at === null),
      trash: all.filter((e) => e.item.deleted_at !== null),
      byId: new Map(all.map((e) => [e.item.id, e])),
    };
    // `version` changes whenever the vault state is updated in place.
  }, [keyring, vault, version]);
}
