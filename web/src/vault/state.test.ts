import { describe, expect, it } from "vitest";
import { VaultState, type ItemRecord } from "./state";

function record(id: string, revision: number, extra: Partial<ItemRecord> = {}): ItemRecord {
  return {
    id,
    zone: "personal",
    revision,
    block: "AQE",
    seq: revision,
    created_at: "",
    updated_at: "",
    deleted_at: null,
    purged: false,
    ...extra,
  };
}

describe("VaultState", () => {
  it("applies sync payloads and moves the cursor", () => {
    const state = new VaultState();
    state.apply({ seq: 2, items: [record("a", 1), record("b", 1)] });
    state.apply({ seq: 3, items: [record("a", 2, { zone: "agent" })] });
    expect(state.seq).toBe(3);
    expect(state.active("agent").map((i) => i.id)).toEqual(["a"]);
    expect(state.active("personal").map((i) => i.id)).toEqual(["b"]);
  });

  it("separates the trash and drops purged items", () => {
    const state = new VaultState();
    state.apply({ seq: 2, items: [record("a", 1, { deleted_at: "2026-09-18" }), record("b", 1)] });
    expect(state.trash().map((i) => i.id)).toEqual(["a"]);
    state.apply({ seq: 3, items: [record("a", 1, { purged: true, block: null })] });
    expect(state.items.has("a")).toBe(false);
  });

  it("detects a rollback served by the server", () => {
    const state = new VaultState();
    state.apply({ seq: 5, items: [record("a", 4)] });
    state.apply({ seq: 6, items: [record("a", 2)] });
    expect(state.rollbacks).toEqual(["a"]);
    expect(state.items.get("a")?.revision).toBe(4);
  });
});
