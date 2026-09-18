/** Vault entries: JSON, padded to 256 bytes, then AEAD (docs/crypto.md §5.7). */
import { decryptBlock, encryptBlock } from "./blocks";
import { utf8Decode, utf8Encode } from "./encoding";
import { CryptoError } from "./errors";
import { lib } from "./sodium";

export const PAD_BLOCK = 256;
export const ITEM_VERSION = 1;
const MAX_NAME_CHARS = 200;

export interface Entry {
  v: number;
  type: "login" | "note";
  name: string;
  username?: string;
  password?: string;
  urls?: string[];
  notes?: string;
  totp?: string;
  fields?: { name: string; value: string; hidden: boolean }[];
  passwordChangedAt?: string;
  favorite?: boolean;
  /** Unknown fields from newer clients are kept untouched. */
  [field: string]: unknown;
}

export function validateEntry(value: unknown): Entry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CryptoError("entry must be a JSON object");
  }
  const entry = value as Record<string, unknown>;
  const version = entry.v;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new CryptoError("entry version missing");
  }
  if (version > ITEM_VERSION) throw new CryptoError("entry version not supported by this client");
  if (entry.type !== "login" && entry.type !== "note") throw new CryptoError("unknown entry type");
  const name = entry.name;
  if (typeof name !== "string" || name.length < 1 || name.length > MAX_NAME_CHARS) {
    throw new CryptoError("entry name must have 1 to 200 characters");
  }
  return entry as Entry;
}

export function pad(data: Uint8Array): Uint8Array {
  return lib().pad(data, PAD_BLOCK);
}

export function unpad(data: Uint8Array): Uint8Array {
  try {
    return lib().unpad(data, PAD_BLOCK);
  } catch {
    throw new CryptoError("invalid padding");
  }
}

export function encryptItem(
  key: Uint8Array,
  entry: Entry,
  context: string,
  testNonce?: Uint8Array,
): Uint8Array {
  const json = JSON.stringify(validateEntry(entry));
  return encryptBlock(key, pad(utf8Encode(json)), context, testNonce);
}

export function decryptItem(key: Uint8Array, block: Uint8Array, context: string): Entry {
  const text = utf8Decode(unpad(decryptBlock(key, block, context)));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CryptoError("entry is not valid JSON");
  }
  return validateEntry(parsed);
}
