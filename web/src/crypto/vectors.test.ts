/** The TypeScript implementation must reproduce every shared vector (docs/crypto.md §10). */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as blocks from "./blocks";
import * as contexts from "./contexts";
import { b64urlDecode as d, b64urlEncode as e, utf8Encode } from "./encoding";
import { CryptoError } from "./errors";
import * as items from "./items";
import * as kdf from "./kdf";
import * as recovery from "./recovery";
import * as sealed from "./sealed";
import { ready } from "./sodium";

const VECTORS =
  process.env.SERENITY_TEST_VECTORS ?? resolve(import.meta.dirname, "../../../shared/test-vectors");

function load(name: string): unknown {
  return JSON.parse(readFileSync(resolve(VECTORS, name), "utf-8"));
}

type ContextKind =
  "uk_by_mk" | "uk_by_rk" | "ak_by_uk" | "ak_by_sk" | "item" | "icon" | "totp" | "export";

function buildContext(kind: ContextKind, args: (string | number)[]): string {
  const [a, b, c, n] = args;
  switch (kind) {
    case "uk_by_mk":
      return contexts.ukByMk(a as string);
    case "uk_by_rk":
      return contexts.ukByRk(a as string);
    case "ak_by_uk":
      return contexts.akByUk(a as string, b as number);
    case "ak_by_sk":
      return contexts.akBySk(a as string, b as number);
    case "item":
      return contexts.item(a as string, b as string, c as contexts.Zone, n as number);
    case "icon":
      return contexts.icon(a as string, b as string, c as number);
    case "totp":
      return contexts.totp(a as string);
    case "export":
      return contexts.exportFile(a as string, b as string);
  }
}

beforeAll(ready);

describe("shared vectors", () => {
  it("argon2id", () => {
    interface Case {
      password: string;
      normalized: string;
      salt: string;
      memlimit: number;
      opslimit: number;
      master_key?: string;
      auth_key?: string;
      wrap_key?: string;
    }
    const data = load("argon2id.json") as { cases: Case[]; rejected: Case[] };
    for (const c of data.cases) {
      expect(new TextDecoder().decode(kdf.normalizePassword(c.password))).toBe(c.normalized);
      const mk = kdf.deriveMasterKey(c.password, d(c.salt), c);
      expect(e(mk)).toBe(c.master_key);
      const { authKey, wrapKey } = kdf.deriveLoginKeys(mk);
      expect([e(authKey), e(wrapKey)]).toEqual([c.auth_key, c.wrap_key]);
    }
    for (const c of data.rejected) {
      expect(() => kdf.deriveMasterKey(c.password, d(c.salt), c)).toThrow(CryptoError);
    }
  });

  it("kdf", () => {
    const data = load("kdf.json") as {
      cases: { key: string; id: number; context: string; subkey: string }[];
    };
    for (const c of data.cases) {
      expect(e(kdf.deriveSubkey(d(c.key), c.id, c.context))).toBe(c.subkey);
    }
  });

  it("contexts", () => {
    interface Case {
      kind: ContextKind;
      args: (string | number)[];
      context?: string;
    }
    const data = load("contexts.json") as { cases: Case[]; rejected: Case[] };
    for (const c of data.cases) expect(buildContext(c.kind, c.args)).toBe(c.context);
    for (const c of data.rejected) expect(() => buildContext(c.kind, c.args)).toThrow(CryptoError);
  });

  it("aead", () => {
    interface Case {
      key?: string;
      nonce: string;
      context: string;
      plaintext: string;
      block: string;
    }
    const data = load("aead.json") as { key: string; cases: Case[]; rejected: Case[] };
    for (const c of data.cases) {
      const key = d(c.key ?? data.key);
      expect(e(blocks.encryptBlock(key, d(c.plaintext), c.context, d(c.nonce)))).toBe(c.block);
      expect(e(blocks.decryptBlock(key, d(c.block), c.context))).toBe(c.plaintext);
    }
    for (const c of data.rejected) {
      const key = d(c.key ?? data.key);
      expect(() => blocks.decryptBlock(key, d(c.block), c.context)).toThrow(CryptoError);
    }
  });

  it("items", () => {
    interface Case {
      key: string;
      nonce: string;
      context: string;
      json: string;
      entry: items.Entry;
      block: string;
    }
    const data = load("item.json") as { key: string; cases: Case[]; rejected: Case[] };
    for (const c of data.cases) {
      const key = d(c.key);
      expect(JSON.stringify(c.entry)).toBe(c.json);
      expect(e(items.encryptItem(key, c.entry, c.context, d(c.nonce)))).toBe(c.block);
      expect(
        e(blocks.encryptBlock(key, items.pad(utf8Encode(c.json)), c.context, d(c.nonce))),
      ).toBe(c.block);
      expect(items.decryptItem(key, d(c.block), c.context)).toEqual(c.entry);
    }
    for (const c of data.rejected) {
      expect(() => items.decryptItem(d(data.key), d(c.block), c.context)).toThrow(CryptoError);
    }
  });

  it("recovery", () => {
    const data = load("recovery.json") as {
      cases: { rk: string; text: string; recovery_auth_key: string; recovery_wrap_key: string }[];
      accepted: { input: string; rk: string }[];
      rejected: { input: string }[];
    };
    for (const c of data.cases) {
      const rk = d(c.rk);
      expect(recovery.encodeRecoveryKey(rk)).toBe(c.text);
      expect(e(recovery.decodeRecoveryKey(c.text))).toBe(c.rk);
      const { authKey, wrapKey } = recovery.deriveRecoveryKeys(rk);
      expect([e(authKey), e(wrapKey)]).toEqual([c.recovery_auth_key, c.recovery_wrap_key]);
    }
    for (const c of data.accepted) expect(e(recovery.decodeRecoveryKey(c.input))).toBe(c.rk);
    for (const c of data.rejected) {
      expect(() => recovery.decodeRecoveryKey(c.input)).toThrow(CryptoError);
    }
  });

  it("sealed", () => {
    interface Case {
      context: string;
      key?: string;
      block: string;
    }
    const data = load("sealed.json") as {
      server_seed: string;
      public_key: string;
      key_id: string;
      cases: Case[];
      rejected: Case[];
    };
    const { publicKey, privateKey } = sealed.serverKeypair(d(data.server_seed));
    expect(e(publicKey)).toBe(data.public_key);
    expect(e(sealed.keyId(publicKey))).toBe(data.key_id);
    for (const c of data.cases) {
      expect(e(sealed.openSealed(publicKey, privateKey, d(c.block), c.context))).toBe(c.key);
    }
    for (const c of data.rejected) {
      expect(() => sealed.openSealed(publicKey, privateKey, d(c.block), c.context)).toThrow(
        CryptoError,
      );
    }
  });
});
