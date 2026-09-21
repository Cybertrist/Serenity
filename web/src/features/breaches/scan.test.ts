import { beforeAll, describe, expect, it } from "vitest";
import * as contexts from "../../crypto/contexts";
import { b64urlEncode } from "../../crypto/encoding";
import { encryptItem, type Entry } from "../../crypto/items";
import { lib, ready } from "../../crypto/sodium";
import { Keyring } from "../../vault/keyring";
import { VaultState, type ItemRecord, type Zone } from "../../vault/state";
import { PwnedPasswords, sha1Hex } from "./pwned";
import { scanVault } from "./scan";

const LEAKED = "password123";

beforeAll(ready);

function fakePwned(urls: string[]): PwnedPasswords {
  return new PwnedPasswords(async (input, init) => {
    urls.push(input);
    expect(new Headers(init?.headers).get("Add-Padding")).toBe("true");
    const digest = await sha1Hex(LEAKED);
    let body = "0000000000000000000000000000000000A:0\r\n";
    if (input.endsWith(digest.slice(0, 5))) body += `${digest.slice(5)}:42\r\n`;
    return new Response(body);
  });
}

function vault(entries: [Zone, Entry][]): { state: VaultState; keyring: Keyring } {
  const s = lib();
  const keyring = new Keyring(crypto.randomUUID(), s.randombytes_buf(32), 1, s.randombytes_buf(32));
  const state = new VaultState();
  const items: ItemRecord[] = entries.map(([zone, entry]) => {
    const id = crypto.randomUUID();
    const key = zone === "personal" ? keyring.userKey() : keyring.agentKey();
    const block = encryptItem(key, entry, contexts.item(keyring.userId, id, zone, 1));
    return {
      id,
      zone,
      revision: 1,
      block: b64urlEncode(block),
      seq: 1,
      created_at: new Date().toISOString(),
      updated_at: "",
      deleted_at: null,
      purged: false,
    };
  });
  state.apply({ seq: 1, items });
  return { state, keyring };
}

describe("scan in the browser", () => {
  it("finds every kind, across both zones", async () => {
    const strong = "x7Kq-m2Pz-9Lw4-rT8v";
    const { state, keyring } = vault([
      ["personal", { v: 1, type: "login", name: "A", password: LEAKED }],
      ["personal", { v: 1, type: "login", name: "B", password: strong }],
      ["agent", { v: 1, type: "login", name: "C", password: strong }],
      [
        "agent",
        {
          v: 1,
          type: "login",
          name: "D",
          password: "k9#Lm2$pQ7!xZ4&w",
          passwordChangedAt: "2020-01-01T00:00:00Z",
        },
      ],
    ]);
    const ids = state.active().map((i) => i.id);
    const result = await scanVault(state, keyring, fakePwned([]));
    expect(result.scanned).toEqual(ids);
    const found = new Set(result.alerts.map((a) => `${String(ids.indexOf(a.item_id))}:${a.kind}`));
    expect(found).toEqual(new Set(["0:weak", "0:pwned_password", "1:reused", "2:reused", "3:old"]));
  });

  it("asks the network only about the entries in the plan, but checks everything locally", async () => {
    const urls: string[] = [];
    const shared = "x7Kq-m2Pz-9Lw4-rT8v";
    const { state, keyring } = vault([
      ["personal", { v: 1, type: "login", name: "A", password: LEAKED }],
      ["personal", { v: 1, type: "login", name: "B", password: shared }],
      ["agent", { v: 1, type: "login", name: "C", password: shared }],
    ]);
    const ids = state.active().map((i) => i.id);
    const only = ids.slice(1, 2);
    const result = await scanVault(state, keyring, fakePwned(urls), new Date(), new Set(only));
    // Every entry was looked at locally, one single request went out.
    expect(result.scanned).toEqual(ids);
    expect(result.pwned_scanned).toEqual(only);
    expect(urls).toHaveLength(1);
    const found = new Set(result.alerts.map((a) => `${String(ids.indexOf(a.item_id))}:${a.kind}`));
    // A and B share nothing, B and C do: reuse is still seen, and A is not asked about.
    expect(found).toEqual(new Set(["0:weak", "1:reused", "2:reused"]));
  });

  it("asks about nothing when the plan is empty", async () => {
    const urls: string[] = [];
    const { state, keyring } = vault([
      ["personal", { v: 1, type: "login", name: "A", password: LEAKED }],
    ]);
    const result = await scanVault(state, keyring, fakePwned(urls), new Date(), new Set());
    expect(urls).toEqual([]);
    expect(result.pwned_scanned).toEqual([]);
    expect(result.alerts.map((a) => a.kind)).toEqual(["weak"]);
  });

  it("reuses the prefix cache across scans", async () => {
    const urls: string[] = [];
    const pwned = fakePwned(urls);
    const { state, keyring } = vault([
      ["personal", { v: 1, type: "login", name: "A", password: LEAKED }],
    ]);
    await scanVault(state, keyring, pwned);
    await scanVault(state, keyring, pwned);
    expect(urls).toHaveLength(1);
  });

  it("sends only 5-character prefixes to Pwned Passwords", async () => {
    const urls: string[] = [];
    const secret = "mot-de-passe-de-test-tres-long-42";
    const { state, keyring } = vault([
      ["personal", { v: 1, type: "login", name: "A", password: secret }],
    ]);
    await scanVault(state, keyring, fakePwned(urls));
    const digest = await sha1Hex(secret);
    expect(urls).toEqual([`https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`]);
    expect(urls[0]).not.toContain(digest.slice(5));
    expect(urls[0]).not.toContain(secret);
  });
});
