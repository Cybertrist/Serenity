/** Associated-data contexts (docs/crypto.md §5.4). */
import { CryptoError } from "./errors";

export const PREFIX = "serenity/v1";
export type Zone = "personal" | "agent";
const ZONES: readonly string[] = ["personal", "agent"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function uuid(value: string): string {
  if (!UUID.test(value)) throw new CryptoError("identifiers must be canonical lowercase UUID v4");
  return value;
}

function positive(value: number): string {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new CryptoError("versions and revisions must be integers >= 1");
  }
  return String(value);
}

export function ukByMk(userId: string): string {
  return `${PREFIX}/uk-by-mk/${uuid(userId)}`;
}

export function ukByRk(userId: string): string {
  return `${PREFIX}/uk-by-rk/${uuid(userId)}`;
}

export function akByUk(userId: string, akVersion: number): string {
  return `${PREFIX}/ak-by-uk/${uuid(userId)}/${positive(akVersion)}`;
}

export function akBySk(userId: string, akVersion: number): string {
  return `${PREFIX}/ak-by-sk/${uuid(userId)}/${positive(akVersion)}`;
}

export function item(userId: string, itemId: string, zone: Zone, revision: number): string {
  // Runtime check too: zones also come from untrusted JSON.
  if (!ZONES.includes(zone)) {
    throw new CryptoError("zone must be 'personal' or 'agent'");
  }
  return `${PREFIX}/item/${uuid(userId)}/${uuid(itemId)}/${zone}/${positive(revision)}`;
}

export function totp(userId: string): string {
  return `${PREFIX}/totp/${uuid(userId)}`;
}

export function exportFile(userId: string, exportId: string): string {
  return `${PREFIX}/export/${uuid(userId)}/${uuid(exportId)}`;
}
