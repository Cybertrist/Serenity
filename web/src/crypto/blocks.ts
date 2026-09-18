/** AEAD blocks, type 0x01: version || type || nonce(24) || ciphertext+tag (docs/crypto.md §5.2). */
import { concat, utf8Encode } from "./encoding";
import { CryptoError } from "./errors";
import { lib } from "./sodium";

export const VERSION = 0x01;
export const TYPE_AEAD = 0x01;
export const TYPE_SEALED = 0x02;
export const NONCE_BYTES = 24;
export const TAG_BYTES = 16;
const HEADER = new Uint8Array([VERSION, TYPE_AEAD]);
export const MIN_BLOCK_BYTES = HEADER.length + NONCE_BYTES + TAG_BYTES;

function associatedData(context: string): Uint8Array {
  return concat(HEADER, utf8Encode(context));
}

function checkKey(key: Uint8Array): void {
  if (key.length !== 32) throw new CryptoError("key must be 32 bytes");
}

/** Encrypt with a fresh random nonce. `testNonce` is reserved for test vectors. */
export function encryptBlock(
  key: Uint8Array,
  plaintext: Uint8Array,
  context: string,
  testNonce?: Uint8Array,
): Uint8Array {
  checkKey(key);
  const s = lib();
  const nonce = testNonce ?? s.randombytes_buf(NONCE_BYTES);
  if (nonce.length !== NONCE_BYTES) throw new CryptoError("nonce must be 24 bytes");
  const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    associatedData(context),
    null,
    nonce,
    key,
  );
  return concat(HEADER, nonce, ciphertext);
}

export function decryptBlock(key: Uint8Array, block: Uint8Array, context: string): Uint8Array {
  checkKey(key);
  if (block.length < MIN_BLOCK_BYTES) throw new CryptoError("block too short");
  if (block[0] !== VERSION || block[1] !== TYPE_AEAD) {
    throw new CryptoError("unsupported block version or type");
  }
  const nonce = block.subarray(2, 2 + NONCE_BYTES);
  try {
    return lib().crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      block.subarray(2 + NONCE_BYTES),
      associatedData(context),
      nonce,
      key,
    );
  } catch {
    throw new CryptoError("decryption failed");
  }
}

export function wrapKey(wrappingKey: Uint8Array, key: Uint8Array, context: string): Uint8Array {
  if (key.length !== 32) throw new CryptoError("wrapped key must be 32 bytes");
  return encryptBlock(wrappingKey, key, context);
}

export function unwrapKey(wrappingKey: Uint8Array, block: Uint8Array, context: string): Uint8Array {
  const key = decryptBlock(wrappingKey, block, context);
  if (key.length !== 32) throw new CryptoError("unwrapped key has an invalid size");
  return key;
}
