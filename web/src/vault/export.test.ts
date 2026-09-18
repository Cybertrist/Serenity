import { beforeAll, describe, expect, it } from "vitest";
import { CryptoError } from "../crypto/errors";
import { ready } from "../crypto/sodium";
import { decryptExport, exportVault, type ExportedEntry } from "./export";

beforeAll(ready);

const ENTRIES: ExportedEntry[] = [
  { zone: "personal", entry: { v: 1, type: "login", name: "Banque", password: "faux" } },
  { zone: "agent", entry: { v: 1, type: "login", name: "Netflix", password: "faux-aussi" } },
];

describe("encrypted export", () => {
  it("round-trips with the passphrase", () => {
    const file = exportVault(crypto.randomUUID(), ENTRIES, "phrase d'export solide");
    expect(file).not.toContain("Banque");
    expect(file).not.toContain("faux");
    expect(decryptExport(file, "phrase d'export solide")).toEqual(ENTRIES);
  });

  it("refuses a wrong passphrase or a modified file", () => {
    const file = exportVault(crypto.randomUUID(), ENTRIES, "phrase d'export solide");
    expect(() => decryptExport(file, "mauvaise phrase d'export")).toThrow(CryptoError);
    const parsed = JSON.parse(file) as { export_id: string };
    const moved = file.replace(parsed.export_id, crypto.randomUUID());
    expect(() => decryptExport(moved, "phrase d'export solide")).toThrow(CryptoError);
  });
});
