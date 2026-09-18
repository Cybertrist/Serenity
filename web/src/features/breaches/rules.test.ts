import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sha1Hex } from "./pwned";
import { isOld, isWeak, MIN_LENGTH, parseDate, strengthBits } from "./rules";

const VECTORS =
  process.env.SERENITY_TEST_VECTORS ??
  resolve(import.meta.dirname, "../../../../shared/test-vectors");

interface WatchVectors {
  min_length: number;
  passwords: { password: string; weak: boolean; bits: number; sha1: string | null }[];
  old: { changed_at: string | null; now: string; old: boolean }[];
}

const data = JSON.parse(readFileSync(resolve(VECTORS, "watch.json"), "utf-8")) as WatchVectors;

describe("watch rules (shared vectors)", () => {
  it("agree with the server", async () => {
    expect(MIN_LENGTH).toBe(data.min_length);
    for (const c of data.passwords) {
      expect(isWeak(c.password), c.password).toBe(c.weak);
      expect(strengthBits(c.password)).toBeCloseTo(c.bits, 5);
      if (c.sha1) expect(await sha1Hex(c.password)).toBe(c.sha1);
    }
    for (const c of data.old) {
      expect(isOld(parseDate(c.changed_at), new Date(c.now))).toBe(c.old);
    }
  });
});
