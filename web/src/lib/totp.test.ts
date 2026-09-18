import { describe, expect, it } from "vitest";
import { currentCode, parseTotp, totpCode } from "./totp";

// RFC 6238 appendix B, SHA-1 secret "12345678901234567890" (base32 below), last 6 digits.
const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // gitleaks:allow (public RFC 6238 test secret)

describe("totp", () => {
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("matches RFC 6238 at t=%i", async (t, code) => {
    expect(await totpCode(SECRET, t)).toBe(code);
  });
});

describe("totp parameters", () => {
  // RFC 6238 appendix B, SHA-256 and SHA-512 seeds, 8 digits.
  const SHA256 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA"; // gitleaks:allow (RFC test seed)
  const SHA512 =
    "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA"; // gitleaks:allow (RFC test seed)

  it("reads otpauth URIs", async () => {
    const uri = `otpauth://totp/Test:me?secret=${SHA256}&algorithm=SHA256&digits=8&period=30`;
    expect(parseTotp(uri)).toMatchObject({ algorithm: "SHA-256", digits: 8, period: 30 });
    expect((await currentCode(uri, 59)).code).toBe("46119246");
    const uri512 = `otpauth://totp/Test:me?secret=${SHA512}&algorithm=SHA512&digits=8`;
    expect((await currentCode(uri512, 59)).code).toBe("90693936");
  });

  it("gives the seconds left", async () => {
    expect((await currentCode(SECRET, 59)).remaining).toBe(1);
    expect((await currentCode(SECRET, 60)).remaining).toBe(30);
  });

  it("refuses HOTP and garbage", () => {
    expect(() => parseTotp("otpauth://hotp/x?secret=JBSWY3DP&counter=1")).toThrow();
    expect(() => parseTotp("pas une clé !")).toThrow();
  });
});
