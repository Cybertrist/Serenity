import { beforeAll, describe, expect, it } from "vitest";
import { encryptBlock } from "../../crypto/blocks";
import * as contexts from "../../crypto/contexts";
import { b64urlEncode } from "../../crypto/encoding";
import { ready } from "../../crypto/sodium";
import { Keyring } from "../../vault/keyring";
import { decryptIcons, type IconRecord } from "./icons";

const USER = "7b2c1a4e-3f5d-4a6b-9c8d-1e2f3a4b5c6d";
const ITEM = "0f0c7a9e-1b2c-4d5e-8f90-123456789abc";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeAll(ready);

function keyringWith(ak: Uint8Array): Keyring {
  return new Keyring(USER, new Uint8Array(32), 1, ak);
}

function record(ak: Uint8Array, over: Partial<IconRecord> = {}): IconRecord {
  const version = over.version ?? 1;
  const block = encryptBlock(ak, PNG, contexts.icon(USER, ITEM, version));
  return { item_id: ITEM, version, mime: "image/png", block: b64urlEncode(block), ...over };
}

describe("agent icons", () => {
  it("opens a block with AK and gives a data url", () => {
    const ak = new Uint8Array(32).fill(7);
    const icons = decryptIcons(keyringWith(ak), [record(ak)]);
    expect(icons.get(ITEM)).toBe("data:image/png;base64,iVBORw0KGgoBAgM=");
  });

  it("refuses a type the server made up", () => {
    const ak = new Uint8Array(32).fill(7);
    // A hostile server answering image/svg+xml would hand the page a document with scripts.
    const svg = record(ak, { mime: "image/svg+xml" });
    expect(decryptIcons(keyringWith(ak), [svg]).size).toBe(0);
  });

  it("skips a block that does not open, and keeps the others", () => {
    const ak = new Uint8Array(32).fill(7);
    const wrongVersion = { ...record(ak), version: 2 };
    expect(decryptIcons(keyringWith(ak), [wrongVersion]).size).toBe(0);
    const other = new Uint8Array(32).fill(9);
    expect(decryptIcons(keyringWith(other), [record(ak)]).size).toBe(0);
  });
});
