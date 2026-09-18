/** Browser scan reported to the real Python API (see features/account/e2e.test.ts). */
import { beforeAll, describe, expect, it } from "vitest";
import { Api, type Fetch } from "../../lib/api";
import { totpCode } from "../../lib/totp";
import { ready } from "../../crypto/sodium";
import { addEntries, delegate, sync } from "../../vault/operations";
import { VaultState } from "../../vault/state";
import { signup } from "../account";
import { PwnedPasswords, sha1Hex } from "./pwned";
import { openBreaches, report, scanVault } from "./scan";

const URL = process.env.SERENITY_E2E_URL;

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

const offlinePwned = new PwnedPasswords(async (input) => {
  const digest = await sha1Hex("password123");
  return new Response(input.endsWith(digest.slice(0, 5)) ? `${digest.slice(5)}:7\r\n` : "");
});

beforeAll(ready);

describe.skipIf(!URL)("watch against the Python API", () => {
  it("reports a scan, dedupes, resolves and notifies", async () => {
    await new Api(URL).post("/__test/reset");
    const api = device();
    const pending = await signup(api, "tristan", "une phrase de passe de test");
    const { now } = await new Api(URL).post<{ now: number }>("/__test/tick");
    const { keyring } = await pending.confirm(await totpCode(pending.totpSecret, now));
    const state = new VaultState();
    const [weak] = await addEntries(api, keyring, state, [
      { v: 1, type: "login", name: "Vieux site", password: "password123" },
      { v: 1, type: "login", name: "Solide", password: "x7Kq-m2Pz-9Lw4-rT8v" }, // gitleaks:allow (sample test password)
    ]);
    if (!weak) throw new Error("missing item");
    await delegate(api, keyring, state, weak, true);
    await sync(api, state);

    const first = await report(api, await scanVault(state, keyring, offlinePwned));
    expect(first).toEqual({ new: 2, open: 2, resolved: 0 });
    expect(await report(api, await scanVault(state, keyring, offlinePwned))).toMatchObject({
      new: 0,
    });
    const kinds = (await openBreaches(api)).map((b) => b.kind).sort();
    expect(kinds).toEqual(["pwned_password", "weak"]);
    const notifications = await api.get<{ kind: string }[]>("/api/notifications");
    expect(notifications.map((n) => n.kind)).toEqual(["breach.new", "breach.new"]);

    // Nothing found this time (no Pwned Passwords check): the pwned alert is resolved.
    expect(await report(api, await scanVault(state, keyring, null))).toMatchObject({ resolved: 1 });
  });
});
