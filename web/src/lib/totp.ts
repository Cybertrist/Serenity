/**
 * TOTP codes (RFC 6238: HMAC-SHA1/256/512, 6 to 8 digits) with the Web Crypto API.
 * Used to display the codes stored in entries, and by the end-to-end tests.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(text: string): Uint8Array<ArrayBuffer> {
  const clean = text.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface TotpParams {
  secret: string;
  period: number;
  digits: number;
  algorithm: TotpAlgorithm;
}

/** Accepts an `otpauth://totp/...` URI or a bare base32 secret (as stored in entries). */
export function parseTotp(value: string): TotpParams {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith("otpauth://")) {
    base32Decode(trimmed);
    return { secret: trimmed, period: 30, digits: 6, algorithm: "SHA-1" };
  }
  const url = new URL(trimmed);
  if (url.host.toLowerCase() !== "totp") throw new Error("only TOTP is supported");
  const secret = url.searchParams.get("secret") ?? "";
  base32Decode(secret);
  const algo = (url.searchParams.get("algorithm") ?? "SHA1").toUpperCase().replace("SHA", "SHA-");
  if (algo !== "SHA-1" && algo !== "SHA-256" && algo !== "SHA-512") {
    throw new Error("unsupported TOTP algorithm");
  }
  const digits = Number(url.searchParams.get("digits") ?? "6");
  const period = Number(url.searchParams.get("period") ?? "30");
  if (![6, 7, 8].includes(digits) || !Number.isInteger(period) || period < 1) {
    throw new Error("unsupported TOTP parameters");
  }
  return { secret, period, digits, algorithm: algo };
}

/** Current code of an entry and seconds left before it changes. */
export async function currentCode(
  value: string,
  nowSeconds = Date.now() / 1000,
): Promise<{ code: string; remaining: number; period: number }> {
  const p = parseTotp(value);
  const code = await totpCode(p.secret, nowSeconds, p.period, p.digits, p.algorithm);
  return { code, remaining: p.period - Math.floor(nowSeconds % p.period), period: p.period };
}

export async function totpCode(
  secret: string,
  atSeconds = Date.now() / 1000,
  period = 30,
  digits = 6,
  algorithm: TotpAlgorithm = "SHA-1",
): Promise<string> {
  const counter = Math.floor(atSeconds / period);
  const message = new Uint8Array(8);
  new DataView(message.buffer).setBigUint64(0, BigInt(counter));
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = (mac[mac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((mac[offset] ?? 0) & 0x7f) << 24) |
    ((mac[offset + 1] ?? 0) << 16) |
    ((mac[offset + 2] ?? 0) << 8) |
    (mac[offset + 3] ?? 0);
  return String(binary % 10 ** digits).padStart(digits, "0");
}
