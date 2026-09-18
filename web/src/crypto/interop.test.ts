/**
 * Cross-language check (docs/crypto.md §10.3), driven by the CI:
 * INTEROP_VERIFY=file checks blocks produced by Python, INTEROP_PRODUCE=file writes fresh ones.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import * as blocks from "./blocks";
import * as contexts from "./contexts";
import { b64urlDecode as d, b64urlEncode as e } from "./encoding";
import * as items from "./items";
import * as kdf from "./kdf";
import * as recovery from "./recovery";
import * as sealed from "./sealed";
import { lib, ready } from "./sodium";

interface Payload {
  producer: string;
  user_id: string;
  password: string;
  salt: string;
  memlimit: number;
  opslimit: number;
  auth_key: string;
  uk: string;
  ak: string;
  rk_text: string;
  recovery_auth_key: string;
  server_seed: string;
  uk_by_mk: string;
  uk_by_rk: string;
  ak_by_uk: string;
  ak_sealed: string;
  items: { context: string; zone: contexts.Zone; entry: items.Entry; block: string }[];
}

const verifyPath = process.env.INTEROP_VERIFY;
const producePath = process.env.INTEROP_PRODUCE;

beforeAll(ready);

describe.skipIf(!verifyPath)("interop: verify blocks produced by Python", () => {
  it("opens every key and entry", () => {
    const p = JSON.parse(readFileSync(verifyPath ?? "", "utf-8")) as Payload;
    const user = p.user_id;
    const mk = kdf.deriveMasterKey(p.password, d(p.salt), p);
    const { authKey, wrapKey } = kdf.deriveLoginKeys(mk);
    expect(e(authKey)).toBe(p.auth_key);
    const uk = blocks.unwrapKey(wrapKey, d(p.uk_by_mk), contexts.ukByMk(user));
    expect(e(uk)).toBe(p.uk);
    const rec = recovery.deriveRecoveryKeys(recovery.decodeRecoveryKey(p.rk_text));
    expect(e(rec.authKey)).toBe(p.recovery_auth_key);
    expect(blocks.unwrapKey(rec.wrapKey, d(p.uk_by_rk), contexts.ukByRk(user))).toEqual(uk);
    const ak = blocks.unwrapKey(uk, d(p.ak_by_uk), contexts.akByUk(user, 1));
    expect(e(ak)).toBe(p.ak);
    const server = sealed.serverKeypair(d(p.server_seed));
    expect(
      sealed.openSealed(
        server.publicKey,
        server.privateKey,
        d(p.ak_sealed),
        contexts.akBySk(user, 1),
      ),
    ).toEqual(ak);
    for (const c of p.items) {
      const key = c.zone === "personal" ? uk : ak;
      expect(items.decryptItem(key, d(c.block), c.context)).toEqual(c.entry);
    }
  });
});

describe.skipIf(!producePath)("interop: produce blocks for Python", () => {
  it("writes a fresh payload", () => {
    const s = lib();
    const user = crypto.randomUUID();
    const password = `phrase interop ${s.to_hex(s.randombytes_buf(6))} été ﬁn`;
    const salt = s.randombytes_buf(16);
    const { authKey, wrapKey } = kdf.deriveLoginKeys(kdf.deriveMasterKey(password, salt));
    const [uk, ak, rk, seed] = [32, 32, 20, 32].map((n) => s.randombytes_buf(n)) as [
      Uint8Array,
      Uint8Array,
      Uint8Array,
      Uint8Array,
    ];
    const rec = recovery.deriveRecoveryKeys(rk);
    const server = sealed.serverKeypair(seed);
    const zones: contexts.Zone[] = ["personal", "agent", "personal"];
    const payload: Payload = {
      producer: "typescript",
      user_id: user,
      password,
      salt: e(salt),
      memlimit: kdf.DEFAULT_PARAMS.memlimit,
      opslimit: kdf.DEFAULT_PARAMS.opslimit,
      auth_key: e(authKey),
      uk: e(uk),
      ak: e(ak),
      rk_text: recovery.encodeRecoveryKey(rk),
      recovery_auth_key: e(rec.authKey),
      server_seed: e(seed),
      uk_by_mk: e(blocks.wrapKey(wrapKey, uk, contexts.ukByMk(user))),
      uk_by_rk: e(blocks.wrapKey(rec.wrapKey, uk, contexts.ukByRk(user))),
      ak_by_uk: e(blocks.wrapKey(uk, ak, contexts.akByUk(user, 1))),
      ak_sealed: e(sealed.sealForServer(server.publicKey, ak, contexts.akBySk(user, 1))),
      items: zones.map((zone, i) => {
        const entry: items.Entry = {
          v: 1,
          type: "login",
          name: `Site ${String(i)} ✓`,
          password: s.to_hex(s.randombytes_buf(9)),
          urls: [`https://exemple-${String(i)}.fr`],
          notes: "ligne\nsuivante",
        };
        const context = contexts.item(user, crypto.randomUUID(), zone, i + 1);
        const block = items.encryptItem(zone === "personal" ? uk : ak, entry, context);
        return { context, zone, entry, block: e(block) };
      }),
    };
    writeFileSync(producePath ?? "", JSON.stringify(payload, null, 2));
  });
});
