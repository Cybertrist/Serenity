/**
 * Bitwarden JSON export (unencrypted), read in the browser only: the file never reaches the
 * server in clear. Everything lands in the personal zone.
 */
import type { Entry } from "../../crypto/items";

interface BwField {
  name?: string | null;
  value?: string | null;
  type?: number;
}

interface BwItem {
  type?: number;
  name?: string | null;
  notes?: string | null;
  favorite?: boolean;
  revisionDate?: string | null;
  fields?: BwField[] | null;
  login?: {
    username?: string | null;
    password?: string | null;
    totp?: string | null;
    passwordRevisionDate?: string | null;
    uris?: { uri?: string | null }[] | null;
  } | null;
  card?: Record<string, string | null> | null;
  identity?: Record<string, string | null> | null;
}

export class ImportError extends Error {
  override name = "ImportError";
}

export interface ImportResult {
  entries: Entry[];
  /** Items of an unknown type, not imported. */
  skipped: number;
}

const LOGIN = 1;
const NOTE = 2;
const CARD = 3;
const IDENTITY = 4;
const HIDDEN_FIELD = 1;
const MAX_NAME = 200;

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

function fields(item: BwItem): NonNullable<Entry["fields"]> {
  return (item.fields ?? []).map((f) => ({
    name: text(f.name) || "Champ",
    value: text(f.value),
    hidden: f.type === HIDDEN_FIELD,
  }));
}

/** Cards and identities become secure notes with named fields (nothing is lost). */
function asFields(
  record: Record<string, string | null> | null | undefined,
): NonNullable<Entry["fields"]> {
  const sensitive = new Set(["number", "code", "ssn", "passportNumber", "licenseNumber"]);
  return Object.entries(record ?? {})
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([name, value]) => ({ name, value: value ?? "", hidden: sensitive.has(name) }));
}

function name(item: BwItem): string {
  const value = text(item.name).trim() || "Sans nom";
  return value.slice(0, MAX_NAME);
}

function convert(item: BwItem): Entry | null {
  const base = {
    v: 1,
    name: name(item),
    notes: text(item.notes),
    favorite: item.favorite === true,
  };
  switch (item.type) {
    case LOGIN: {
      const login = item.login ?? {};
      const entry: Entry = {
        ...base,
        type: "login",
        username: text(login.username),
        password: text(login.password),
        urls: (login.uris ?? []).map((u) => text(u.uri)).filter((u) => u.length > 0),
        totp: text(login.totp),
        fields: fields(item),
      };
      const changed = login.passwordRevisionDate ?? item.revisionDate;
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
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError("Ce fichier n'est pas un export JSON.");
  }
  if (typeof data !== "object" || data === null)
    throw new ImportError("Export Bitwarden invalide.");
  const root = data as { encrypted?: boolean; items?: unknown };
  if (root.encrypted === true) {
    throw new ImportError(
      "Export chiffré : dans Bitwarden, choisis le format « .json » (non chiffré), puis réessaie.",
    );
  }
  if (!Array.isArray(root.items))
    throw new ImportError("Export Bitwarden invalide : aucune entrée.");
  const entries: Entry[] = [];
  let skipped = 0;
  for (const raw of root.items as BwItem[]) {
    const entry = convert(raw);
    if (entry) entries.push(entry);
    else skipped += 1;
  }
  return { entries, skipped };
}
