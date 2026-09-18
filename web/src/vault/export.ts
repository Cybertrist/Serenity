/**
 * Encrypted export (docs/crypto.md §7.10): built in the browser, never sent to the server.
 * Passphrase -> Argon2id (same parameters as the master password) -> KDF "srn-expt" -> AEAD.
 */
import * as contexts from "../crypto/contexts";
import { b64urlDecode, b64urlEncode, utf8Decode, utf8Encode } from "../crypto/encoding";
import { CryptoError } from "../crypto/errors";
import { decryptBlock, encryptBlock } from "../crypto/blocks";
import { pad, unpad, validateEntry, type Entry } from "../crypto/items";
import * as kdf from "../crypto/kdf";
import { lib } from "../crypto/sodium";
import type { Zone } from "./state";

export const FORMAT = "serenity-export";
export const VERSION = 1;

export interface ExportedEntry {
  zone: Zone;
  entry: Entry;
}

interface ExportFile {
  format: string;
  version: number;
  user_id: string;
  export_id: string;
  created_at: string;
  kdf: { salt: string; memlimit: number; opslimit: number };
  block: string;
}

function exportKey(passphrase: string, salt: Uint8Array, params: kdf.KdfParams): Uint8Array {
  const master = kdf.deriveMasterKey(passphrase, salt, params);
  try {
    return kdf.deriveSubkey(master, 1, kdf.CTX_EXPORT);
  } finally {
    lib().memzero(master);
  }
}

export function exportVault(userId: string, entries: ExportedEntry[], passphrase: string): string {
  const salt = lib().randombytes_buf(kdf.SALT_BYTES);
  const exportId = crypto.randomUUID();
  const key = exportKey(passphrase, salt, kdf.DEFAULT_PARAMS);
  const plaintext = pad(utf8Encode(JSON.stringify({ entries })));
  const block = encryptBlock(key, plaintext, contexts.exportFile(userId, exportId));
  lib().memzero(key);
  const file: ExportFile = {
    format: FORMAT,
    version: VERSION,
    user_id: userId,
    export_id: exportId,
    created_at: new Date().toISOString(),
    kdf: { salt: b64urlEncode(salt), ...kdf.DEFAULT_PARAMS },
    block: b64urlEncode(block),
  };
  return JSON.stringify(file, null, 2);
}

export function decryptExport(text: string, passphrase: string): ExportedEntry[] {
  const file = JSON.parse(text) as ExportFile;
  if (file.format !== FORMAT || file.version !== VERSION) {
    throw new CryptoError("not a Serenity export, or an unsupported version");
  }
  const key = exportKey(passphrase, b64urlDecode(file.kdf.salt), file.kdf);
  try {
    const context = contexts.exportFile(file.user_id, file.export_id);
    const data = JSON.parse(
      utf8Decode(unpad(decryptBlock(key, b64urlDecode(file.block), context))),
    ) as {
      entries: ExportedEntry[];
    };
    return data.entries.map((e) => ({ zone: e.zone, entry: validateEntry(e.entry) }));
  } finally {
    lib().memzero(key);
  }
}
