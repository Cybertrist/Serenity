import { describe, expect, it } from "vitest";
import { totpCode } from "./totp";

// RFC 6238 appendix B, SHA-1 secret "12345678901234567890" (base32 below), last 6 digits.
const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

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
