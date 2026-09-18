import { beforeAll, describe, expect, it } from "vitest";
import { ready } from "../crypto/sodium";
import {
  DEFAULT_PASSPHRASE,
  DEFAULT_PASSWORD,
  generatePassphrase,
  generatePassword,
  passphraseBits,
  passwordBits,
  WORDS,
} from "./generator";

beforeAll(ready);

describe("generator", () => {
  it("uses the full EFF list", () => {
    expect(WORDS).toHaveLength(7776);
    expect(new Set(WORDS).size).toBe(7776);
  });

  it("generates passwords with every chosen class", () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword({ ...DEFAULT_PASSWORD, length: 8 });
      expect(p).toHaveLength(8);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("respects options", () => {
    const digits = generatePassword({
      ...DEFAULT_PASSWORD,
      lower: false,
      upper: false,
      symbols: false,
      length: 12,
    });
    expect(digits).toMatch(/^[0-9]{12}$/);
    const clear = generatePassword({ ...DEFAULT_PASSWORD, avoidAmbiguous: true, length: 200 });
    expect(clear).not.toMatch(/[Il1O0o]/);
    expect(() =>
      generatePassword({
        ...DEFAULT_PASSWORD,
        lower: false,
        upper: false,
        digits: false,
        symbols: false,
      }),
    ).toThrow();
  });

  it("does not repeat itself", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generatePassword()));
    expect(seen.size).toBe(500);
  });

  it("generates passphrases", () => {
    const phrase = generatePassphrase({ ...DEFAULT_PASSPHRASE, capitalize: true, withDigit: true });
    const words = phrase.split("-");
    expect(words).toHaveLength(6);
    expect(words.every((w) => /^[A-Z]/.test(w))).toBe(true);
    expect(phrase).toMatch(/[0-9]/);
  });

  it("reports the entropy", () => {
    expect(Math.round(passwordBits(DEFAULT_PASSWORD))).toBe(
      Math.round(20 * Math.log2(26 + 26 + 10 + 18)),
    );
    expect(passphraseBits(DEFAULT_PASSPHRASE)).toBeCloseTo(6 * 12.925, 2);
  });
});
