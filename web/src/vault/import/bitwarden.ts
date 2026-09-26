/**
 * Bitwarden JSON export (unencrypted), read in the browser only: the file never reaches the
 * server in clear. Everything lands in the personal zone.
 *
 * The file comes from outside: every value is checked for its type before use, and a field of
 * the wrong shape is dropped instead of breaking the whole import.
 */
import type { Entry } from "../../crypto/items";

type Json = Record<string, unknown>;

export class ImportError extends Error {
  override name = "ImportError";
}

export interface ImportResult {
  entries: Entry[];
  /** Items of an unknown type, not imported. */
  skipped: number;
}

/** Largest file an import accepts: a real export of thousands of entries is far below. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/** Most entries one import may add. */
export const MAX_IMPORT_ENTRIES = 5000;

/** Throws a clear error when the text of an import file is too large. */
export function checkImportSize(text: string): void {
  // A string never has more characters than its UTF-8 bytes: the cheap test comes first.
  if (text.length > MAX_IMPORT_BYTES || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new ImportError("Ce fichier est trop gros : 5 Mo au maximum.");
}

/** Throws a clear error when an import holds too many entries. */
export function checkImportCount(count: number): void {
  if (count > MAX_IMPORT_ENTRIES)
    throw new ImportError(
      `Ce fichier contient trop d'entrées : ${String(MAX_IMPORT_ENTRIES)} au maximum par import.`,
    );
}

const LOGIN = 1;
const NOTE = 2;
const CARD = 3;
const IDENTITY = 4;
const HIDDEN_FIELD = 1;
const MAX_NAME = 200;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Plain objects of a list; anything else (a lone object, a string, null) gives nothing. */
function objects(value: unknown): Json[] {
  if (isObject(value)) return [value];
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** An ISO 8601 date the rules can read later, or nothing. */
function isoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed)) return undefined;
  return Number.isNaN(Date.parse(trimmed)) ? undefined : trimmed;
}

function fields(item: Json): NonNullable<Entry["fields"]> {
  return objects(item.fields).map((f) => ({
    name: text(f.name) || "Champ",
    value: text(f.value),
    hidden: f.type === HIDDEN_FIELD,
  }));
}

/** Cards and identities become secure notes with named fields (nothing is lost). */
function asFields(record: unknown): NonNullable<Entry["fields"]> {
  if (!isObject(record)) return [];
  const sensitive = new Set(["number", "code", "ssn", "passportNumber", "licenseNumber"]);
  return Object.entries(record)
    .filter((pair): pair is [string, string] => typeof pair[1] === "string" && pair[1].length > 0)
    .map(([name, value]) => ({ name, value, hidden: sensitive.has(name) }));
}

function name(item: Json): string {
  const value = text(item.name).trim() || "Sans nom";
  return value.slice(0, MAX_NAME);
}

function convert(item: Json): Entry | null {
  const base = {
    v: 1,
    name: name(item),
    notes: text(item.notes),
    favorite: item.favorite === true,
  };
  switch (item.type) {
    case LOGIN: {
      const login = isObject(item.login) ? item.login : {};
      const entry: Entry = {
        ...base,
        type: "login",
        username: text(login.username),
        password: text(login.password),
        urls: objects(login.uris)
          .map((u) => text(u.uri))
          .filter((u) => u.length > 0),
        totp: text(login.totp),
        fields: fields(item),
      };
      const changed = isoDate(login.passwordRevisionDate) ?? isoDate(item.revisionDate);
      if (changed) entry.passwordChangedAt = changed;
      return entry;
    }
    case NOTE:
      return { ...base, type: "note", fields: fields(item) };
    case CARD:
      return { ...base, type: "note", fields: [...asFields(item.card), ...fields(item)] };
    case IDENTITY:
      return { ...base, type: "note", fields: [...asFields(item.identity), ...fields(item)] };
    default:
      return null;
  }
}

export function parseBitwardenExport(json: string): ImportResult {
  checkImportSize(json);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError("Ce fichier n'est pas un export JSON.");
  }
  if (!isObject(data)) throw new ImportError("Export Bitwarden invalide.");
  if (data.encrypted === true) {
    throw new ImportError(
      "Export chiffré : dans Bitwarden, choisis le format « .json » (non chiffré), puis réessaie.",
    );
  }
  if (!Array.isArray(data.items))
    throw new ImportError("Export Bitwarden invalide : aucune entrée.");
  const items: unknown[] = data.items;
  checkImportCount(items.length);
  const entries: Entry[] = [];
  let skipped = 0;
  for (const raw of items) {
    const entry = isObject(raw) ? convert(raw) : null;
    if (entry) entries.push(entry);
    else skipped += 1;
  }
  return { entries, skipped };
}
