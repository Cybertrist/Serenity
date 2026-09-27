import { describe, expect, it } from "vitest";
import { encodeQr, qrPath } from "./qr";
import { deviceName } from "./settings/device";

/** The 7x7 finder in a corner: dark ring, light ring, dark 3x3 core. */
function finderAt(m: boolean[][], x0: number, y0: number): boolean {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      if (m[y0 + dy]?.[x0 + dx] !== (d !== 2)) return false;
    }
  }
  return true;
}

describe("encodeQr", () => {
  it("picks the smallest version that fits, level M", () => {
    // Version 1-M holds 14 bytes, version 2-M 26.
    expect(encodeQr("a".repeat(14)).length).toBe(21);
    expect(encodeQr("a".repeat(15)).length).toBe(25);
  });

  it("draws the three finders and the timing lines", () => {
    const m = encodeQr(
      "otpauth://totp/Serenity:tristan?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Serenity",
    );
    const n = m.length;
    expect(finderAt(m, 0, 0)).toBe(true);
    expect(finderAt(m, n - 7, 0)).toBe(true);
    expect(finderAt(m, 0, n - 7)).toBe(true);
    for (let i = 8; i < n - 8; i++) {
      expect(m[6]?.[i]).toBe(i % 2 === 0);
      expect(m[i]?.[6]).toBe(i % 2 === 0);
    }
    // The dark module next to the lower left finder is always there.
    expect(m[n - 8]?.[8]).toBe(true);
  });

  it("is deterministic, and draws one square per dark module", () => {
    const a = encodeQr("serenity");
    expect(encodeQr("serenity")).toEqual(a);
    const dark = a.flat().filter(Boolean).length;
    expect(qrPath(a).split("M").length - 1).toBe(dark);
  });
});

describe("deviceName", () => {
  it("names a browser and its system", () => {
    expect(
      deviceName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      ),
    ).toBe("Chrome sur Windows");
    expect(
      deviceName(
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome sur Android");
  });

  it("keeps what it does not know, cut short", () => {
    expect(deviceName("curl/8.0")).toBe("curl/8.0");
    expect(deviceName("")).toBe("Appareil");
  });
});
