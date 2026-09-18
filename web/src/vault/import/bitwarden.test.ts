import { describe, expect, it } from "vitest";
import { ImportError, parseBitwardenExport } from "./bitwarden";

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
});
