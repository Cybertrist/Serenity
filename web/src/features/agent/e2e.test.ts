/** Agent flows against the real Python API (see features/account/e2e.test.ts). */
import { beforeAll, describe, expect, it } from "vitest";
import { Api, ApiError, type Fetch } from "../../lib/api";
import { totpCode } from "../../lib/totp";
import { ready } from "../../crypto/sodium";
import { addEntries, delegate } from "../../vault/operations";
import { VaultState } from "../../vault/state";
import { signup } from "../account";
import { agentStatus, approve, refuse, rotations, setKillSwitch, setPolicy } from "./api";

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

describe.skipIf(!URL)("agent against the Python API", () => {
  it("policy, due date, approval, refusal and kill switch", async () => {
    const test = new Api(URL);
    await test.post("/__test/reset");
    const api = device();
    const pending = await signup(api, "tristan", "une phrase de passe de test");
    const { now } = await test.post<{ now: number }>("/__test/tick");
    const { keyring } = await pending.confirm(await totpCode(pending.totpSecret, now));
    const state = new VaultState();
    const [personal, netflix] = await addEntries(api, keyring, state, [
      { v: 1, type: "login", name: "Banque", password: "p".repeat(20) },
      { v: 1, type: "login", name: "Netflix", password: "n".repeat(20) },
    ]);
    if (!personal || !netflix) throw new Error("missing items");
    const agentItem = await delegate(api, keyring, state, netflix, true);

    // Personal zone: reminders only.
    expect(await status(setPolicy(api, personal.id, 30, "autonomous"))).toBe(422);
    const old = new Date(Date.now() - 100 * 86_400_000).toISOString();
    await setPolicy(api, personal.id, 30, "approval", old);
    await setPolicy(api, agentItem.id, 30, "approval", old);

    await test.post("/__test/schedule");
    const [first] = await rotations(api);
    expect(first?.item_id).toBe(agentItem.id); // never the personal entry
    if (!first) throw new Error("missing rotation");
    expect((await refuse(api, first.id)).status).toBe("refused");

    // Stopped agent: a new due date schedules nothing.
    await setKillSwitch(api, true);
    expect((await agentStatus(api)).kill_switch).toBe(true);
    await setPolicy(api, agentItem.id, 7, "approval", old);
    await test.post("/__test/schedule");
    expect(await rotations(api)).toHaveLength(0);

    // Restarted: the due rotation appears and can be approved.
    await setKillSwitch(api, false);
    await test.post("/__test/schedule");
    const [second] = await rotations(api);
    if (!second) throw new Error("missing rotation");
    expect((await approve(api, second.id)).status).toBe("approved");
  });
});
