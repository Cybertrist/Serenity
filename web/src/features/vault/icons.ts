/**
 * Icons the agent fetched for the agent zone (docs/crypto.md §5.8).
 *
 * The server hands over opaque blocks; AK opens them here, in the browser. The request is
 * always "my icons", never "the icon of this site": nothing in it says which entry is being
 * looked at, and the personal zone has no icon at all.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import * as contexts from "../../crypto/contexts";
import { decryptBlock } from "../../crypto/blocks";
import { b64urlDecode } from "../../crypto/encoding";
import { lib } from "../../crypto/sodium";
import type { Keyring } from "../../vault/keyring";
import { useSession } from "../../app/session";

export interface IconRecord {
  item_id: string;
  version: number;
  mime: string;
  block: string;
}

/**
 * Types the browser may be handed. Checked here and not only on the server: a hostile server
 * could answer `image/svg+xml`, and an SVG is a document with scripts in it, not a picture.
 */
const MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/x-icon"]);

export function decryptIcons(keyring: Keyring, records: IconRecord[]): Map<string, string> {
  const s = lib();
  const icons = new Map<string, string>();
  for (const record of records) {
    if (!MIME.has(record.mime)) continue;
    try {
      const context = contexts.icon(keyring.userId, record.item_id, record.version);
      const data = decryptBlock(keyring.agentKey(), b64urlDecode(record.block), context);
      // A data URL, not a blob one: nothing to revoke, and it dies with the page.
      icons.set(
        record.item_id,
        `data:${record.mime};base64,${s.to_base64(data, s.base64_variants.ORIGINAL)}`,
      );
    } catch {
      // A block that does not open is skipped; the entry falls back to its monogram.
    }
  }
  return icons;
}

/** Icon of each agent-zone entry, by entry id. Empty while locked or offline. */
export function useIcons(): Map<string, string> {
  const { api, phase, offline, keyring } = useSession();
  const query = useQuery({
    queryKey: ["icons"],
    queryFn: () => api.get<IconRecord[]>("/api/vault/icons"),
    enabled: phase === "unlocked" && !offline,
    staleTime: 60 * 60 * 1000,
  });
  const records = query.data;
  return useMemo<Map<string, string>>(
    () =>
      keyring && !keyring.isWiped && records
        ? decryptIcons(keyring, records)
        : new Map<never, never>(),
    [keyring, records],
  );
}
