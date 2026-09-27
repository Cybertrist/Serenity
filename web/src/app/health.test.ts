import { describe, expect, it } from "vitest";
import type { BreachRecord } from "../features/breaches/scan";
import { healthOf } from "./health";

let next = 0;
function alert(
  kind: BreachRecord["kind"],
  item: string | null,
  status: BreachRecord["status"] = "open",
): BreachRecord {
  next += 1;
  return {
    id: next,
    kind,
    item_id: item,
    source: "client",
    status,
    details: {},
    first_seen_at: "2026-09-01T00:00:00Z",
    last_seen_at: "2026-09-01T00:00:00Z",
    resolved_at: null,
  };
}

describe("healthOf", () => {
  it("gives a full score to an empty or clean vault", () => {
    expect(healthOf(0, []).score).toBe(100);
    expect(healthOf(12, []).score).toBe(100);
  });

  it("counts each entry once, by its worst alert", () => {
    const h = healthOf(10, [alert("weak", "a"), alert("pwned_password", "a"), alert("old", "b")]);
    expect(h.flagged).toBe(2);
    expect(h.leaked).toBe(1);
    // 1 (leaked) + 0.3 (old) over 10 entries.
    expect(h.score).toBe(87);
  });

  it("ignores closed alerts and takes points off per breached address", () => {
    const h = healthOf(4, [alert("reused", "a", "resolved"), alert("email_breach", null)]);
    expect(h.flagged).toBe(0);
    expect(h.emails).toBe(1);
    expect(h.score).toBe(95);
  });

  it("never goes below zero", () => {
    const all = ["a", "b"].map((id) => alert("pwned_password", id));
    expect(
      healthOf(2, [...all, ...Array.from({ length: 30 }, () => alert("email_breach", null))]).score,
    ).toBe(0);
  });
});
