import { describe, expect, it } from "vitest";
import {
  ImportError,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ENTRIES,
  parseBitwardenExport,
} from "./bitwarden";

// Shape of a Bitwarden "json" (unencrypted) export, with fake values.
const EXPORT = JSON.stringify({
  encrypted: false,
  folders: [],
  items: [
    {
      type: 1,
      name: "Netflix",
      notes: null,
      favorite: true,
      revisionDate: "2026-01-01T10:00:00.000Z",
      fields: [{ name: "PIN", value: "0000", type: 1 }],
      login: {
        username: "tristan@exemple.fr",
        password: "faux-mot-de-passe",
        totp: "JBSWY3DPEHPK3PXP",
        passwordRevisionDate: "2026-05-01T10:00:00.000Z",
        uris: [{ match: null, uri: "https://www.netflix.com" }, { uri: null }],
      },
    },
    { type: 2, name: "Wi-Fi", notes: "code du salon", secureNote: { type: 0 } },
    {
      type: 3,
      name: "Carte",
      card: { cardholderName: "T J", number: "4111111111111111", code: "123" },
    },
    { type: 4, name: "Identité", identity: { firstName: "Tristan", ssn: "000" } },
    { type: 5, name: "Clé SSH" },
  ],
});

describe("Bitwarden import", () => {
  it("converts logins, notes, cards and identities", () => {
    const { entries, skipped } = parseBitwardenExport(EXPORT);
    expect(skipped).toBe(1);
    expect(entries).toHaveLength(4);
    const [login, note, card, identity] = entries;
    expect(login).toMatchObject({
      type: "login",
      name: "Netflix",
      username: "tristan@exemple.fr",
      password: "faux-mot-de-passe",
      urls: ["https://www.netflix.com"],
      totp: "JBSWY3DPEHPK3PXP",
      favorite: true,
      passwordChangedAt: "2026-05-01T10:00:00.000Z",
      fields: [{ name: "PIN", value: "0000", hidden: true }],
    });
    expect(note).toMatchObject({ type: "note", notes: "code du salon" });
    expect(card?.fields).toContainEqual({
      name: "number",
      value: "4111111111111111",
      hidden: true,
    });
    expect(identity?.fields).toContainEqual({ name: "firstName", value: "Tristan", hidden: false });
  });

  it("refuses encrypted exports and garbage", () => {
    expect(() => parseBitwardenExport(JSON.stringify({ encrypted: true, items: [] }))).toThrow(
      ImportError,
    );
    expect(() => parseBitwardenExport("pas du json")).toThrow(ImportError);
    expect(() => parseBitwardenExport("{}")).toThrow(ImportError);
  });

  it("survives fields of the wrong shape", () => {
    const { entries, skipped } = parseBitwardenExport(
      JSON.stringify({
        items: [
          null,
          "texte",
          {
            type: 1,
            name: "Bizarre",
            fields: { name: "seul", value: "v" },
            login: {
              uris: { uri: "https://exemple.fr" },
              passwordRevisionDate: "hier",
              username: 42,
            },
            revisionDate: { date: "2026-01-01" },
          },
          { type: 2, name: "Note", fields: ["x", null, { name: "ok", value: "1" }] },
          { type: 3, name: "Carte", card: "4111" },
          { type: 1, name: "Sans login", login: "x", fields: 3 },
        ],
      }),
    );
    expect(skipped).toBe(2);
    const [odd, note, card, bare] = entries;
    expect(odd).toMatchObject({
      username: "",
      urls: ["https://exemple.fr"],
      fields: [{ name: "seul", value: "v", hidden: false }],
    });
    expect(odd?.passwordChangedAt).toBeUndefined();
    expect(note?.fields).toEqual([{ name: "ok", value: "1", hidden: false }]);
    expect(card?.fields).toEqual([]);
    expect(bare).toMatchObject({ urls: [], fields: [] });
  });

  it("only keeps an ISO date as passwordChangedAt", () => {
    const parse = (date: unknown) =>
      parseBitwardenExport(
        JSON.stringify({ items: [{ type: 1, name: "A", login: { passwordRevisionDate: date } }] }),
      ).entries[0]?.passwordChangedAt;
    expect(parse("2026-05-01T10:00:00.000Z")).toBe("2026-05-01T10:00:00.000Z");
    expect(parse("2026-13-45T99:00:00Z")).toBeUndefined();
    expect(parse("01/05/2026")).toBeUndefined();
    expect(parse(1714557600000)).toBeUndefined();
  });

  it("refuses files that are too large or hold too many entries", () => {
    expect(() => parseBitwardenExport(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow(/5 Mo/);
    const many = JSON.stringify({
      items: Array.from({ length: MAX_IMPORT_ENTRIES + 1 }, () => ({ type: 2, name: "n" })),
    });
    expect(() => parseBitwardenExport(many)).toThrow(ImportError);
  });
});
