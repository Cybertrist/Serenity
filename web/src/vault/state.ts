/**
 * Local copy of the vault: encrypted items as received, the sync cursor, and rollback detection.
 * Nothing here is decrypted; decryption happens on demand with the Keyring.
 */
import * as contexts from "../crypto/contexts";
import { b64urlDecode } from "../crypto/encoding";
import { decryptItem, type Entry } from "../crypto/items";
import type { Keyring } from "./keyring";

export type Zone = contexts.Zone;

export interface ItemRecord {
  id: string;
  zone: Zone;
  revision: number;
  block: string | null;
  seq: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  purged: boolean;
}

export interface SyncPayload {
  seq: number;
  items: ItemRecord[];
}

export class VaultState {
  seq = 0;
  readonly items = new Map<string, ItemRecord>();
  /** Highest revision ever seen per item: a lower one means the server rolled back. */
  private readonly highest = new Map<string, number>();
  readonly rollbacks: string[] = [];

  apply(payload: SyncPayload): void {
    for (const item of payload.items) this.put(item);
    this.seq = Math.max(this.seq, payload.seq);
  }

  put(item: ItemRecord): void {
    const seen = this.highest.get(item.id) ?? 0;
    if (item.revision < seen) {
      this.rollbacks.push(item.id);
      return;
    }
    this.highest.set(item.id, item.revision);
    if (item.purged) this.items.delete(item.id);
    else this.items.set(item.id, item);
  }

  /** Items not in the trash, optionally for one zone. */
  active(zone?: Zone): ItemRecord[] {
    return [...this.items.values()].filter(
      (i) => i.deleted_at === null && (zone === undefined || i.zone === zone),
    );
  }

  trash(): ItemRecord[] {
    return [...this.items.values()].filter((i) => i.deleted_at !== null);
  }
}

export function keyFor(keyring: Keyring, zone: Zone): Uint8Array {
  return zone === "personal" ? keyring.userKey() : keyring.agentKey();
}

export function decryptRecord(keyring: Keyring, item: ItemRecord): Entry {
  if (item.block === null) throw new Error("item was purged");
  const context = contexts.item(keyring.userId, item.id, item.zone, item.revision);
  return decryptItem(keyFor(keyring, item.zone), b64urlDecode(item.block), context);
}
