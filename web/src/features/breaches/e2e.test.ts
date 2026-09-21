/** Browser scan reported to the real Python API (see features/account/e2e.test.ts). */
import { beforeAll, describe, expect, it } from "vitest";
import { Api, type Fetch } from "../../lib/api";
import { totpCode } from "../../lib/totp";
import { ready } from "../../crypto/sodium";
import { addEntries, delegate, sync } from "../../vault/operations";
import { VaultState } from "../../vault/state";
import { signup } from "../account";
import { PwnedPasswords, sha1Hex } from "./pwned";
import { openBreaches, report, scanPlan, scanVault } from "./scan";

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
    // The exposed entry was delegated to the agent, so its rotation is scheduled on the spot
    // instead of waiting for the hourly pass (docs/05-veille.md).
    expect(notifications.map((n) => n.kind).sort()).toEqual([
      "breach.new",
      "breach.new",
      "rotation.due",
    ]);
    const scheduled = await api.get<{ item_id: string; trigger: string }[]>("/api/agent/rotations");
    expect(scheduled.map((r) => [r.item_id, r.trigger])).toEqual([[weak.id, "breach"]]);

    // Without Pwned Passwords (unreachable), the "exposed" alert must stay open.
    expect(await report(api, await scanVault(state, keyring, null))).toMatchObject({ resolved: 0 });
    expect((await openBreaches(api)).map((b) => b.kind).sort()).toEqual(["pwned_password", "weak"]);
  });

  it("only asks the network about what the plan holds", async () => {
    await new Api(URL).post("/__test/reset");
    const api = device();
    const pending = await signup(api, "tristan", "une phrase de passe de test");
    const { now } = await new Api(URL).post<{ now: number }>("/__test/tick");
    const { keyring } = await pending.confirm(await totpCode(pending.totpSecret, now));
    const state = new VaultState();
    await addEntries(api, keyring, state, [
      { v: 1, type: "login", name: "Vieux site", password: "password123" },
    ]);
    await sync(api, state);

    // Fresh entry: the server asks for it, and the answer empties the plan.
    const plan = await scanPlan(api);
    expect(plan.items).toEqual(state.active().map((i) => i.id));
    expect(plan.last_scan_at).toBeNull();
    const scope = new Set(plan.items);
    await report(api, await scanVault(state, keyring, offlinePwned, new Date(), scope));
    const after = await scanPlan(api);
    expect(after.items).toEqual([]);
    expect(after.last_scan_at).not.toBeNull();

    // A second visit the same day asks about nothing, and the alert stays open.
    const second = await scanVault(state, keyring, offlinePwned, new Date(), new Set());
    expect(second.pwned_scanned).toEqual([]);
    expect(await report(api, second)).toMatchObject({ resolved: 0 });
    expect((await openBreaches(api)).map((b) => b.kind)).toContain("pwned_password");
  });
});
