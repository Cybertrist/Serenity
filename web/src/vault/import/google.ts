/**
 * Google Password Manager export (CSV), read in the browser only: the file never reaches the
 * server in clear. Everything lands in the personal zone.
 *
 * The export has one header line and five columns, in this order in practice, but the header is
 * what decides: name, url, username, password, note.
 */
import type { Entry } from "../../crypto/items";
import { ImportError, type ImportResult } from "./bitwarden";

const MAX_NAME = 200;

/**
 * RFC 4180, the part that matters: quoted fields may hold commas, newlines and doubled quotes.
 * Returns rows of raw strings; empty trailing line ignored.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let started = false;
  for (let i = 0; i < clean.length; i += 1) {
    const c = clean.charAt(i);
    if (quoted) {
      if (c === '"') {
        if (clean.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"' && field === "") {
      quoted = true;
      started = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      started = true;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean.charAt(i + 1) === "\n") i += 1;
      if (started || field !== "" || row.length) {
        row.push(field);
        rows.push(row);
      }
      row = [];
      field = "";
      started = false;
    } else {
      field += c;
      started = true;
    }
  }
  if (started || field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** A Google row carries no type: everything is a login, even when the password is empty. */
function convert(columns: Map<string, number>, row: string[]): Entry | null {
  const at = (key: string): string => {
    const index = columns.get(key);
    return index === undefined ? "" : (row[index] ?? "").trim();
  };
  const url = at("url");
  const name = (at("name") || url || "Sans nom").slice(0, MAX_NAME);
  const username = at("username");
  const password = at("password");
  const note = at("note");
  if (!username && !password && !note && !url) return null;
  return {
    v: 1,
    type: "login",
    name,
    username,
    password,
    urls: url ? [url] : [],
    notes: note,
    totp: "",
    fields: [],
  };
}

export function parseGoogleExport(csv: string): ImportResult {
  const rows = parseCsv(csv);
  const header = rows.shift();
  if (!header) throw new ImportError("Ce fichier est vide.");
  const columns = new Map<string, number>();
  header.forEach((cell, index) => {
    columns.set(
      cell
        .trim()
        .toLowerCase()
        .replace(/^\uFEFF/, ""),
      index,
    );
  });
  if (!columns.has("password") || !columns.has("username")) {
    throw new ImportError(
      "Ce CSV ne ressemble pas à un export Google : il lui manque les colonnes " +
        "« username » et « password ».",
    );
  }
  const entries: Entry[] = [];
  let skipped = 0;
  for (const row of rows) {
    const entry = convert(columns, row);
    if (entry) entries.push(entry);
    else skipped += 1;
  }
  if (!entries.length) throw new ImportError("Aucune entrée lisible dans ce fichier.");
  return { entries, skipped };
}
