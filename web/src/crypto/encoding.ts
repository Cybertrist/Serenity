/** Binary encodings: base64url without padding (docs/crypto.md §5.1). */
import { CryptoError } from "./errors";
import { lib } from "./sodium";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function b64urlEncode(data: Uint8Array): string {
  const s = lib();
  return s.to_base64(data, s.base64_variants.URLSAFE_NO_PADDING);
}

export function b64urlDecode(text: string): Uint8Array {
  if (text.includes("=")) throw new CryptoError("padding is not allowed");
  const s = lib();
  try {
    return s.from_base64(text, s.base64_variants.URLSAFE_NO_PADDING);
  } catch {
    throw new CryptoError("invalid base64url");
  }
}

export function utf8Encode(text: string): Uint8Array {
  return encoder.encode(text);
}

export function utf8Decode(data: Uint8Array): string {
  try {
    return decoder.decode(data);
  } catch {
    throw new CryptoError("invalid UTF-8");
  }
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && lib().memcmp(a, b);
}
