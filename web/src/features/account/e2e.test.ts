/**
 * End to end against the real Python API (api/tests/e2e_server.py), driven by the CI:
 * SERENITY_E2E_URL=http://127.0.0.1:8765. Every crypto step runs here, in TypeScript.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { Api, ApiError, type Fetch } from "../../lib/api";
import { totpCode } from "../../lib/totp";
import { ready } from "../../crypto/sodium";
import { changePassword, lock, login, recover, signup, unlock } from ".";

const URL = process.env.SERENITY_E2E_URL;
const USER = "tristan";
const PASSWORD = "une phrase de passe de test";

/** A device: its own cookie jar, like a browser profile. */
function device(): Api {
  let cookie = "";
  const jarFetch: Fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookie) headers.set("cookie", cookie);
    const response = await fetch(input, { ...init, headers });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(";");
      if (pair?.startsWith("serenity_session=")) cookie = pair.endsWith("=") ? "" : pair;
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

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 200;
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
}

beforeAll(ready);

describe.skipIf(!URL)("account flows against the Python API", () => {
  const phone = device();
  const laptop = device();
  let kit = "";

  it("signs up, shows the kit once, and closes registration", async () => {
    await new Api(URL).post("/__test/reset");
    expect(await new Api(URL).get("/api/auth/status")).toEqual({ registration_open: true });
    const pending = await signup(phone, USER, PASSWORD);
    secret = pending.totpSecret;
    kit = pending.recoveryKit;
    expect(kit).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){8}[0-9A-HJKMNP-TV-Z]{4}$/);
    const { keyring } = await pending.confirm(await code());
    expect(keyring.userId).toBe(pending.userId);
    expect(await new Api(URL).get("/api/auth/status")).toEqual({ registration_open: false });
  });

  it("logs in on another device and unwraps the same keys", async () => {
    const a = await unlock(phone, USER, PASSWORD);
    const b = await login(laptop, USER, PASSWORD, await code());
    expect(b.keyring.userKey()).toEqual(a.keyring.userKey());
    expect(b.keyring.agentKey()).toEqual(a.keyring.agentKey());
    expect(b.login.session.expires_at > b.login.session.created_at).toBe(true);
  });

  it("refuses a wrong password with the same answer as a wrong code", async () => {
    const other = device();
    expect(await status(login(other, USER, "une mauvaise phrase de passe", await code()))).toBe(
      401,
    );
    expect(await status(login(other, USER, PASSWORD, "000000"))).toBe(401);
  });

  it("locks: sensitive actions need the master password again", async () => {
    const sessions = await phone.get<{ id: number; current: boolean }[]>("/api/auth/sessions");
    const target = sessions.find((s) => !s.current);
    expect(target).toBeDefined();
    await lock(phone, null);
    expect(await status(phone.delete(`/api/auth/sessions/${String(target?.id)}`))).toBe(403);
    await unlock(phone, USER, PASSWORD);
    expect(await status(phone.get("/api/auth/me"))).toBe(200);
  });

  it("changes the master password and logs out the other devices", async () => {
    const { keyring } = await unlock(phone, USER, PASSWORD);
    const uk = keyring.userKey().slice();
    await changePassword(phone, keyring, USER, PASSWORD, "nouvelle phrase de passe", await code());
    expect(await status(laptop.get("/api/auth/me"))).toBe(401);
    const again = await login(device(), USER, "nouvelle phrase de passe", await code());
    expect(again.keyring.userKey()).toEqual(uk);
  });

  it("recovers with the kit, which is then replaced", async () => {
    const before = await login(device(), USER, "nouvelle phrase de passe", await code());
    const result = await recover(
      device(),
      USER,
      kit.toLowerCase(),
      await code(),
      "phrase après récupération",
    );
    expect(result.recoveryKit).not.toBe(kit);
    expect(result.keyring.userKey()).toEqual(before.keyring.userKey());
    expect(await status(recover(device(), USER, kit, await code(), "encore une phrase"))).toBe(401);
    const after = await login(device(), USER, "phrase après récupération", await code());
    expect(after.keyring.agentKey()).toEqual(before.keyring.agentKey());
  });
});
