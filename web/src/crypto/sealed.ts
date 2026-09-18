/** Sealed blocks, type 0x02: AK sealed for the server's X25519 key (docs/crypto.md §5.3). */
import { TYPE_SEALED, VERSION } from "./blocks";
import { concat, equalBytes, utf8Encode } from "./encoding";
import { CryptoError } from "./errors";
import { CTX_SEAL, deriveSubkey } from "./kdf";
import { lib } from "./sodium";

const HEADER = new Uint8Array([VERSION, TYPE_SEALED]);
export const KEY_ID_BYTES = 4;
const SEAL_OVERHEAD = 48;
const KEY_BYTES = 32;

export function keyId(publicKey: Uint8Array): Uint8Array {
  return lib().crypto_generichash(32, publicKey, null).subarray(0, KEY_ID_BYTES);
}

/** Seal a 32-byte key for the server. Only the agent process can open it. */
export function sealForServer(publicKey: Uint8Array, key: Uint8Array, context: string): Uint8Array {
  if (key.length !== KEY_BYTES) throw new CryptoError("sealed key must be 32 bytes");
  if (publicKey.length !== 32) throw new CryptoError("server public key must be 32 bytes");
  const sealed = lib().crypto_box_seal(concat(key, utf8Encode(context)), publicKey);
  return concat(HEADER, keyId(publicKey), sealed);
}

/** Server side only; present for tests and cross-checks. */
export function serverKeypair(seed: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array } {
  if (seed.length !== 32) throw new CryptoError("server key must be 32 bytes");
  const { publicKey, privateKey } = lib().crypto_box_seed_keypair(deriveSubkey(seed, 1, CTX_SEAL));
  return { publicKey, privateKey };
}

export function openSealed(
  publicKey: Uint8Array,
  privateKey: Uint8Array,
  block: Uint8Array,
  context: string,
): Uint8Array {
  const prefix = HEADER.length + KEY_ID_BYTES;
  if (block.length < prefix + SEAL_OVERHEAD + KEY_BYTES)
    throw new CryptoError("sealed block too short");
  if (block[0] !== VERSION || block[1] !== TYPE_SEALED) {
    throw new CryptoError("unsupported block version or type");
  }
  if (!equalBytes(block.subarray(2, prefix), keyId(publicKey))) {
    throw new CryptoError("sealed for another server key");
  }
  let message: Uint8Array;
  try {
    message = lib().crypto_box_seal_open(block.subarray(prefix), publicKey, privateKey);
  } catch {
    throw new CryptoError("decryption failed");
  }
  if (!equalBytes(message.subarray(KEY_BYTES), utf8Encode(context))) {
    throw new CryptoError("context mismatch");
  }
  return message.slice(0, KEY_BYTES);
}
