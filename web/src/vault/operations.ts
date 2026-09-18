/** Vault operations against the API (docs/crypto.md §7.4 to §7.6). */
import * as contexts from "../crypto/contexts";
import { b64urlDecode, b64urlEncode } from "../crypto/encoding";
import { decryptItem, encryptItem, type Entry } from "../crypto/items";
import { ApiError, type Api } from "../lib/api";
import type { Keyring } from "./keyring";
import {
  decryptRecord,
  keyFor,
  type ItemRecord,
  type SyncPayload,
  type VaultState,
  type Zone,
} from "./state";

export const IMPORT_CHUNK = 500;

/** The item changed on another device: `current` is the server version, to merge and retry. */
export class ConflictError extends Error {
  override name = "ConflictError";

  constructor(readonly current: ItemRecord) {
    super("item changed elsewhere");
  }
}

export async function sync(api: Api, state: VaultState): Promise<void> {
  state.apply(await api.get<SyncPayload>(`/api/vault/items?since=${String(state.seq)}`));
}

function encrypt(keyring: Keyring, id: string, zone: Zone, revision: number, entry: Entry): string {
  const context = contexts.item(keyring.userId, id, zone, revision);
  return b64urlEncode(encryptItem(keyFor(keyring, zone), entry, context));
}

async function withConflict<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.body !== undefined) {
      const body = e.body as { current?: ItemRecord };
      if (body.current) throw new ConflictError(body.current);
    }
    throw e;
  }
}

/** New entries always start in the personal zone (CLAUDE.md: delegation is explicit). */
export async function addEntries(
  api: Api,
  keyring: Keyring,
  state: VaultState,
  entries: Entry[],
): Promise<ItemRecord[]> {
  const created: ItemRecord[] = [];
  for (let i = 0; i < entries.length; i += IMPORT_CHUNK) {
    const chunk = entries.slice(i, i + IMPORT_CHUNK).map((entry) => {
      const id = crypto.randomUUID();
      return { id, block: encrypt(keyring, id, "personal", 1, entry) };
    });
    created.push(...(await api.post<ItemRecord[]>("/api/vault/items", { items: chunk })));
  }
  for (const item of created) state.put(item);
  return created;
}

export async function updateEntry(
  api: Api,
  keyring: Keyring,
  state: VaultState,
  item: ItemRecord,
  entry: Entry,
): Promise<ItemRecord> {
  const block = encrypt(keyring, item.id, item.zone, item.revision + 1, entry);
  const updated = await withConflict(
    api.request<ItemRecord>("PUT", `/api/vault/items/${item.id}`, {
      base_revision: item.revision,
      block,
    }),
  );
  state.put(updated);
  return updated;
}

/** Personal -> agent. `confirmed` must come from an explicit user confirmation. */
export async function delegate(
  api: Api,
  keyring: Keyring,
  state: VaultState,
  item: ItemRecord,
  confirmed: true,
): Promise<ItemRecord> {
  return moveTo(api, keyring, state, item, "agent", confirmed);
}

/** Agent -> personal. Afterwards, changing the password is recommended: the server knew it. */
export async function reclaim(
  api: Api,
  keyring: Keyring,
  state: VaultState,
  item: ItemRecord,
  confirmed: true,
): Promise<ItemRecord> {
  return moveTo(api, keyring, state, item, "personal", confirmed);
}

async function moveTo(
  api: Api,
  keyring: Keyring,
  state: VaultState,
  item: ItemRecord,
  zone: Zone,
  confirmed: true,
): Promise<ItemRecord> {
  if (item.zone === zone) throw new Error("already in this zone");
  const entry = decryptRecord(keyring, item);
  const block = encrypt(keyring, item.id, zone, item.revision + 1, entry);
  const action = zone === "agent" ? "delegate" : "reclaim";
  const moved = await withConflict(
    api.post<ItemRecord>(`/api/vault/items/${item.id}/${action}`, {
      base_revision: item.revision,
      block,
      confirm: confirmed,
    }),
  );
  state.put(moved);
  return moved;
}

export async function trash(api: Api, state: VaultState, item: ItemRecord): Promise<ItemRecord> {
  const trashed = await withConflict(
    api.delete<ItemRecord>(`/api/vault/items/${item.id}?base_revision=${String(item.revision)}`),
  );
  state.put(trashed);
  return trashed;
}

export async function restore(api: Api, state: VaultState, item: ItemRecord): Promise<ItemRecord> {
  const restored = await api.post<ItemRecord>(`/api/vault/items/${item.id}/restore`);
  state.put(restored);
  return restored;
}

export interface HistoryEntry {
  revision: number;
  zone: Zone;
  created_at: string;
  entry: Entry;
}

export async function history(
  api: Api,
  keyring: Keyring,
  item: ItemRecord,
): Promise<HistoryEntry[]> {
  const revisions = await api.get<
    { revision: number; zone: Zone; block: string; created_at: string }[]
  >(`/api/vault/items/${item.id}/history`);
  return revisions.map((r) => ({
    revision: r.revision,
    zone: r.zone,
    created_at: r.created_at,
    entry: decryptItem(
      keyFor(keyring, r.zone),
      b64urlDecode(r.block),
      contexts.item(keyring.userId, item.id, r.zone, r.revision),
    ),
  }));
}
