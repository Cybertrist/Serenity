/** Vault flows against the real Python API (see features/account/e2e.test.ts). */
import { beforeAll, describe, expect, it } from "vitest";
import { Api, type Fetch } from "../lib/api";
import { totpCode } from "../lib/totp";
import { ready } from "../crypto/sodium";
import { login, signup } from "../features/account";
import type { Keyring } from "./keyring";
import { parseBitwardenExport } from "./import/bitwarden";
import {
  addEntries,
  ConflictError,
  delegate,
  history,
  reclaim,
  sync,
  trash,
  updateEntry,
} from "./operations";
import { decryptRecord, VaultState } from "./state";

const URL = process.env.SERENITY_E2E_URL;
const USER = "tristan";
const PASSWORD = "une phrase de passe de test";

function device(): Api {
  let cookie = "";
  const jarFetch: Fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookie) headers.set("cookie", cookie);
    const response = await fetch(input, { ...init, headers });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(";");
      if (pair?.startsWith("serenity_session=")) cookie = pair;
    }
    return response;
  };
  return new Api(URL, jarFetch);
}

let secret = "";
async function code(): Promise<string> {
  const { now } = await new Api(URL).post<{ now: number }>("/__test/tick");
  return totpCode(secret, now);
}

beforeAll(ready);

describe.skipIf(!URL)("vault flows against the Python API", () => {
  const phone = device();
  const laptop = device();
  const phoneState = new VaultState();
  const laptopState = new VaultState();
  let phoneKeys: Keyring;
  let laptopKeys: Keyring;

  it("prepares an account on two devices", async () => {
    await new Api(URL).post("/__test/reset");
    const pending = await signup(phone, USER, PASSWORD);
    secret = pending.totpSecret;
    phoneKeys = (await pending.confirm(await code())).keyring;
    laptopKeys = (await login(laptop, USER, PASSWORD, await code())).keyring;
  });

  it("adds on one device and syncs on the other", async () => {
    const [item] = await addEntries(phone, phoneKeys, phoneState, [
      { v: 1, type: "login", name: "Netflix", password: "faux-mot-de-passe" },
    ]);
    expect(item?.zone).toBe("personal");
    await sync(laptop, laptopState);
    const synced = laptopState.active()[0];
    expect(synced && decryptRecord(laptopKeys, synced).name).toBe("Netflix");
  });

  it("detects a concurrent edit", async () => {
    const item = laptopState.active()[0];
    if (!item) throw new Error("missing item");
    await updateEntry(laptop, laptopKeys, laptopState, item, {
      ...decryptRecord(laptopKeys, item),
      notes: "portable",
    });
    const stale = phoneState.active()[0];
    if (!stale) throw new Error("missing item");
    await expect(
      updateEntry(phone, phoneKeys, phoneState, stale, { v: 1, type: "login", name: "x" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await sync(phone, phoneState);
    const fresh = phoneState.active()[0];
    expect(fresh && decryptRecord(phoneKeys, fresh).notes).toBe("portable");
  });

  it("delegates, reclaims and keeps a readable history", async () => {
    const item = phoneState.active()[0];
    if (!item) throw new Error("missing item");
    const delegated = await delegate(phone, phoneKeys, phoneState, item, true);
    expect(delegated.zone).toBe("agent");
    const back = await reclaim(phone, phoneKeys, phoneState, delegated, true);
    expect(back.zone).toBe("personal");
    const past = await history(phone, phoneKeys, back);
    expect(past.every((h) => h.zone === "personal")).toBe(true);
    expect(past.map((h) => h.entry.name)).toContain("Netflix");
  });

  it("imports a Bitwarden export and trashes an entry", async () => {
    const { entries } = parseBitwardenExport(
      JSON.stringify({
        encrypted: false,
        items: Array.from({ length: 30 }, (_, i) => ({
          type: 1,
          name: `Site ${String(i)}`,
          login: { password: "faux" },
        })),
      }),
    );
    const created = await addEntries(phone, phoneKeys, phoneState, entries);
    expect(created).toHaveLength(30);
    const first = created[0];
    if (!first) throw new Error("missing item");
    const trashed = await trash(phone, phoneState, first);
    expect(trashed.deleted_at).not.toBeNull();
    await sync(laptop, laptopState);
    expect(laptopState.active()).toHaveLength(30);
    expect(laptopState.trash()).toHaveLength(1);
  });
});
