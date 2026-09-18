/**
 * Offline copy of the vault in IndexedDB. ENCRYPTED DATA ONLY (CLAUDE.md rule 3): blocks,
 * wrapped keys, salt and Argon2id parameters. Never UK, AK, MK or a password.
 */
import type { AgentKeyPayload, KdfPayload } from "../features/account/types";
import type { ItemRecord } from "../vault/state";

export interface CachedVault {
  username: string;
  userId: string;
  kdf: KdfPayload;
  ukByMk: string;
  agentKey: AgentKeyPayload;
  seq: number;
  items: ItemRecord[];
  savedAt: string;
}

const DB = "serenity";
const STORE = "vault";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("indexedDB"));
    };
  });
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = action(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => {
          resolve(request.result as T);
          db.close();
        };
        request.onerror = () => {
          reject(request.error ?? new Error("indexedDB"));
          db.close();
        };
      }),
  );
}

export async function loadCache(): Promise<CachedVault | null> {
  try {
    return (await run<CachedVault | undefined>("readonly", (s) => s.get(KEY))) ?? null;
  } catch {
    return null;
  }
}

export async function saveCache(value: CachedVault): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(value, KEY));
  } catch {
    // Private browsing or storage disabled: the app works online only.
  }
}

export async function clearCache(): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    // Nothing to clear.
  }
}
