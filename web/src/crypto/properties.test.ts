/** Behaviour not covered by fixed vectors: randomness, key wrapping, full flows. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as blocks from "./blocks";
import * as contexts from "./contexts";
import { CryptoError } from "./errors";
import * as items from "./items";
import * as kdf from "./kdf";
import * as recovery from "./recovery";
import * as sealed from "./sealed";
import { lib, ready } from "./sodium";

const USER = crypto.randomUUID();
const ITEM = crypto.randomUUID();

beforeAll(ready);

describe("crypto properties", () => {
  it("uses a fresh nonce for every block", () => {
    const key = lib().randombytes_buf(32);
    const a = blocks.encryptBlock(key, new Uint8Array([1]), contexts.totp(USER));
    const b = blocks.encryptBlock(key, new Uint8Array([1]), contexts.totp(USER));
    expect(a.subarray(2, 26)).not.toEqual(b.subarray(2, 26));
  });

  it("refuses a block moved to another item, zone, revision or user", () => {
    const key = lib().randombytes_buf(32);
    const entry: items.Entry = { v: 1, type: "login", name: "Exemple" };
    const block = items.encryptItem(key, entry, contexts.item(USER, ITEM, "personal", 1));
    for (const ctx of [
      contexts.item(USER, crypto.randomUUID(), "personal", 1),
      contexts.item(USER, ITEM, "agent", 1),
      contexts.item(USER, ITEM, "personal", 2),
      contexts.item(crypto.randomUUID(), ITEM, "personal", 1),
    ]) {
      expect(() => items.decryptItem(key, block, ctx)).toThrow(CryptoError);
    }
  });

  it("hides the password length with padding", () => {
    const key = lib().randombytes_buf(32);
    const ctx = contexts.item(USER, ITEM, "personal", 1);
    const short = items.encryptItem(key, { v: 1, type: "login", name: "A", password: "x" }, ctx);
    const long = items.encryptItem(
      key,
      { v: 1, type: "login", name: "A", password: "x".repeat(100) },
      ctx,
    );
    expect(short.length).toBe(long.length);
  });

  it("runs the signup, login and recovery flows", () => {
    const s = lib();
    const salt = s.randombytes_buf(kdf.SALT_BYTES);
    const { authKey, wrapKey } = kdf.deriveLoginKeys(
      kdf.deriveMasterKey("une phrase de passe solide", salt),
    );
    const uk = s.randombytes_buf(32);
    const ak = s.randombytes_buf(32);
    const rk = s.randombytes_buf(20);
    const ukByMek = blocks.wrapKey(wrapKey, uk, contexts.ukByMk(USER));
    const rec = recovery.deriveRecoveryKeys(rk);
    const ukByRwk = blocks.wrapKey(rec.wrapKey, uk, contexts.ukByRk(USER));
    const server = sealed.serverKeypair(s.randombytes_buf(32));
    const akSealed = sealed.sealForServer(server.publicKey, ak, contexts.akBySk(USER, 1));
    expect(authKey).not.toEqual(wrapKey);

    const again = kdf.deriveLoginKeys(kdf.deriveMasterKey("une phrase de passe solide", salt));
    expect(again.authKey).toEqual(authKey);
    expect(blocks.unwrapKey(again.wrapKey, ukByMek, contexts.ukByMk(USER))).toEqual(uk);

    const typed = recovery.encodeRecoveryKey(rk).toLowerCase().replaceAll("-", " ");
    const rec2 = recovery.deriveRecoveryKeys(recovery.decodeRecoveryKey(typed));
    expect(blocks.unwrapKey(rec2.wrapKey, ukByRwk, contexts.ukByRk(USER))).toEqual(uk);
    expect(
      sealed.openSealed(server.publicKey, server.privateKey, akSealed, contexts.akBySk(USER, 1)),
    ).toEqual(ak);
  });

  it("refuses weak Argon2id parameters sent by a server", () => {
    const salt = new Uint8Array(16);
    expect(() =>
      kdf.deriveMasterKey("une phrase de passe solide", salt, { memlimit: 1 << 20, opslimit: 1 }),
    ).toThrow(CryptoError);
  });

  it("refuses to run before libsodium is ready", async () => {
    vi.resetModules();
    const fresh = await import("./sodium");
    expect(() => fresh.lib()).toThrow("not initialised");
  });
});
