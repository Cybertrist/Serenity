/** Master password derivation (Argon2id) and subkeys (crypto_kdf), docs/crypto.md §4 and §5.5. */
import { utf8Encode } from "./encoding";
import { CryptoError } from "./errors";
import { lib } from "./sodium";

export const KEY_BYTES = 32;
export const SALT_BYTES = 16;
export const MIN_PASSWORD_CHARS = 12;
export const MAX_PASSWORD_BYTES = 1024;

export const CTX_AUTH = "srn-auth";
export const CTX_WRAP = "srn-wrap";
export const CTX_RECOVERY_AUTH = "srn-rcva";
export const CTX_RECOVERY_WRAP = "srn-rcvw";
export const CTX_RECOVERY_CHECK = "srn-rcvc";
export const CTX_SEAL = "srn-seal";
export const CTX_EXPORT = "srn-expt";

export interface KdfParams {
  memlimit: number;
  opslimit: number;
}

export const DEFAULT_PARAMS: KdfParams = { memlimit: 64 * 1024 * 1024, opslimit: 3 };
export const FLOOR: KdfParams = DEFAULT_PARAMS;

/** Refuse parameters below the floor, even if the server sends them. */
export function checkParams(params: KdfParams): void {
  if (params.memlimit < FLOOR.memlimit || params.opslimit < FLOOR.opslimit) {
    throw new CryptoError("Argon2id parameters below the floor");
  }
}

export function normalizePassword(password: string): Uint8Array {
  const normalized = password.normalize("NFKC");
  // Count code points, like Python len(): Array.from iterates by code point.
  if (Array.from(normalized).length < MIN_PASSWORD_CHARS) {
    throw new CryptoError(
      `master password must have at least ${String(MIN_PASSWORD_CHARS)} characters`,
    );
  }
  const data = utf8Encode(normalized);
  if (data.length > MAX_PASSWORD_BYTES) {
    throw new CryptoError(`master password must be at most ${String(MAX_PASSWORD_BYTES)} bytes`);
  }
  return data;
}

/** MK = Argon2id(NFKC(password), salt). Never stored, never sent. */
export function deriveMasterKey(
  password: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_PARAMS,
): Uint8Array {
  checkParams(params);
  if (salt.length !== SALT_BYTES) throw new CryptoError("salt must be 16 bytes");
  const s = lib();
  const data = normalizePassword(password);
  try {
    return s.crypto_pwhash(
      KEY_BYTES,
      data,
      salt,
      params.opslimit,
      params.memlimit,
      s.crypto_pwhash_ALG_ARGON2ID13,
    );
  } finally {
    s.memzero(data);
  }
}

export function deriveSubkey(
  key: Uint8Array,
  subkeyId: number | bigint,
  context: string,
): Uint8Array {
  if (context.length !== 8 || !/^[\x20-\x7e]{8}$/.test(context)) {
    throw new CryptoError("KDF context must be exactly 8 ASCII characters");
  }
  if (key.length !== KEY_BYTES) throw new CryptoError("KDF key must be 32 bytes");
  const id = BigInt(subkeyId);
  if (id < 0n || id >= 2n ** 64n) throw new CryptoError("invalid subkey id");
  // libsodium.js requires a bigint above 2^32; a bigint is accepted for every id.
  return lib().crypto_kdf_derive_from_key(KEY_BYTES, id, context, key);
}

/** AuthKey (sent to the server) and MEK (kept) from MK. */
export function deriveLoginKeys(masterKey: Uint8Array): {
  authKey: Uint8Array;
  wrapKey: Uint8Array;
} {
  return {
    authKey: deriveSubkey(masterKey, 1, CTX_AUTH),
    wrapKey: deriveSubkey(masterKey, 1, CTX_WRAP),
  };
}
