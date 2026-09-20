/**
 * Google Authenticator export, read in the browser only.
 *
 * The app exports nothing to a file: it shows a QR code that holds an
 * `otpauth-migration://offline?data=…` link, whose payload is a protobuf message. We read that
 * link, and turn each account back into a normal `otpauth://` URI, which is what an entry of
 * the vault already knows how to hold.
 *
 * The protobuf is read by hand: two field types (varint and length-delimited) are enough, and
 * it saves pulling a library into a vault.
 */
import { ImportError } from "./bitwarden";

export interface OneTimeAccount {
  /** What the account is called in Authenticator, usually an address or a login. */
  name: string;
  /** The service, when Authenticator knows it. */
  issuer: string;
  /** Ready for an entry: `otpauth://totp/…`, algorithm and digits included. */
  uri: string;
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ALGORITHMS = ["SHA1", "SHA1", "SHA256", "SHA512", "MD5"];
const DIGITS = [6, 6, 8];
const TOTP = 2;

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32.charAt((value << (5 - bits)) & 31);
  return out;
}

interface Reader {
  bytes: Uint8Array;
  at: number;
}

function varint(r: Reader): number {
  let result = 0;
  let shift = 0;
  for (;;) {
    const byte = r.bytes[r.at];
    if (byte === undefined) throw new ImportError("Lien de migration incomplet.");
    r.at += 1;
    result += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return result;
    shift += 7;
    if (shift > 56) throw new ImportError("Lien de migration illisible.");
  }
}

/** Walks one message, handing each field to the caller. Unknown fields are skipped. */
function fields(
  r: Reader,
  end: number,
  visit: (tag: number, bytes: Uint8Array | null, value: number) => void,
) {
  while (r.at < end) {
    const key = varint(r);
    const tag = key >>> 3;
    const wire = key & 7;
    if (wire === 2) {
      const length = varint(r);
      const stop = r.at + length;
      if (stop > end) throw new ImportError("Lien de migration illisible.");
      visit(tag, r.bytes.slice(r.at, stop), 0);
      r.at = stop;
    } else if (wire === 0) {
      visit(tag, null, varint(r));
    } else if (wire === 5) {
      r.at += 4;
    } else if (wire === 1) {
      r.at += 8;
    } else {
      throw new ImportError("Lien de migration illisible.");
    }
  }
}

function account(bytes: Uint8Array): OneTimeAccount | null {
  // An object rather than local variables: what a callback assigns, the compiler does not track.
  const found = {
    secret: null as Uint8Array | null,
    name: "",
    issuer: "",
    algorithm: 1,
    digits: 1,
    type: TOTP,
  };
  const text = new TextDecoder();
  fields({ bytes, at: 0 }, bytes.length, (tag, chunk, value) => {
    if (tag === 1 && chunk) found.secret = chunk;
    else if (tag === 2 && chunk) found.name = text.decode(chunk);
    else if (tag === 3 && chunk) found.issuer = text.decode(chunk);
    else if (tag === 4) found.algorithm = value;
    else if (tag === 5) found.digits = value;
    else if (tag === 6) found.type = value;
  });
  const { secret, name, issuer } = found;
  if (secret === null || found.type !== TOTP) return null;
  const label = issuer ? `${issuer}:${name}` : name || "Sans nom";
  const params = new URLSearchParams({
    secret: base32(secret),
    algorithm: ALGORITHMS[found.algorithm] ?? "SHA1",
    digits: String(DIGITS[found.digits] ?? 6),
    period: "30",
  });
  if (issuer) params.set("issuer", issuer);
  return {
    name: name || label,
    issuer,
    uri: `otpauth://totp/${encodeURIComponent(label)}?${String(params)}`,
  };
}

/** Reads one `otpauth-migration://` link. Several links (one per QR code) can be pasted. */
export function parseAuthenticatorExport(input: string): OneTimeAccount[] {
  const links = input.match(/otpauth-migration:\/\/\S+/g);
  if (!links?.length) {
    throw new ImportError(
      "Colle le lien otpauth-migration:// donné par Google Authenticator (Transférer les comptes).",
    );
  }
  const out: OneTimeAccount[] = [];
  for (const link of links) {
    const data = new URL(link.replace("otpauth-migration://", "https://x/")).searchParams.get(
      "data",
    );
    if (!data) throw new ImportError("Lien de migration sans données.");
    const raw = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    fields({ bytes, at: 0 }, bytes.length, (tag, chunk) => {
      if (tag !== 1 || !chunk) return;
      const one = account(chunk);
      if (one) out.push(one);
    });
  }
  if (!out.length) throw new ImportError("Aucun code à usage unique dans ce lien.");
  return out;
}
