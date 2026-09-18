/** Recovery kit: 160-bit key shown as Crockford base32 with a check group (docs/crypto.md §5.6). */
import { CryptoError } from "./errors";
import { CTX_RECOVERY_AUTH, CTX_RECOVERY_CHECK, CTX_RECOVERY_WRAP, deriveSubkey } from "./kdf";
import { lib } from "./sodium";

export const RK_BYTES = 20;
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DATA_CHARS = 32;
const CHECK_CHARS = 4;
const VALID = /^[0-9A-HJKMNP-TV-Z]+$/;

function toBigInt(data: Uint8Array): bigint {
  return data.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
}

function encodeBits(data: Uint8Array, nbits: number): string {
  const value = toBigInt(data) >> BigInt(data.length * 8 - nbits);
  let out = "";
  for (let shift = nbits - 5; shift >= 0; shift -= 5) {
    out += ALPHABET.charAt(Number((value >> BigInt(shift)) & 31n));
  }
  return out;
}

function stretch(rk: Uint8Array): Uint8Array {
  if (rk.length !== RK_BYTES) throw new CryptoError("recovery key must be 20 bytes");
  return lib().crypto_generichash(32, rk, null);
}

function checkGroup(rk: Uint8Array): string {
  return encodeBits(deriveSubkey(stretch(rk), 1, CTX_RECOVERY_CHECK).subarray(0, 3), 20);
}

/** RAK (sent to the server) and RWK (kept) from the recovery key. */
export function deriveRecoveryKeys(rk: Uint8Array): { authKey: Uint8Array; wrapKey: Uint8Array } {
  const rks = stretch(rk);
  return {
    authKey: deriveSubkey(rks, 1, CTX_RECOVERY_AUTH),
    wrapKey: deriveSubkey(rks, 1, CTX_RECOVERY_WRAP),
  };
}

export function encodeRecoveryKey(rk: Uint8Array): string {
  const text = encodeBits(rk, RK_BYTES * 8) + checkGroup(rk);
  return (text.match(/.{4}/g) ?? []).join("-");
}

/** Parse a typed key. Case, dashes and spaces are ignored; I/L read 1, O reads 0. */
export function decodeRecoveryKey(text: string): Uint8Array {
  const cleaned = text.replace(/[\s-]/g, "").toUpperCase().replace(/[IL]/g, "1").replace(/O/g, "0");
  if (cleaned.length !== DATA_CHARS + CHECK_CHARS || !VALID.test(cleaned)) {
    throw new CryptoError("recovery key must be 36 base32 characters");
  }
  let value = 0n;
  for (const char of cleaned.slice(0, DATA_CHARS)) {
    value = (value << 5n) | BigInt(ALPHABET.indexOf(char));
  }
  const rk = new Uint8Array(RK_BYTES);
  for (let i = RK_BYTES - 1; i >= 0; i--) {
    rk[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  if (cleaned.slice(DATA_CHARS) !== checkGroup(rk)) {
    throw new CryptoError("recovery key check group does not match (typo?)");
  }
  return rk;
}
