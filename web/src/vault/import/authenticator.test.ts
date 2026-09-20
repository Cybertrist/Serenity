import { describe, expect, it } from "vitest";
import { parseAuthenticatorExport } from "./authenticator";
import { ImportError } from "./bitwarden";

/*
 * A real migration link, the one everybody uses as a test vector: one TOTP account whose secret
 * is the bytes of "Hello!" followed by de ad be ef, which is JBSWY3DPEHPK3PXP in base32.
 */
const LINK =
  "otpauth-migration://offline?data=CjEKCkhlbGxvId6tvu8SGFRlc3QxOnRlc3QxQGV4YW1wbGUxLmNvbRoFVGVzdDEgASgBMAIQARgBIAA%3D";

describe("import Google Authenticator", () => {
  it("retrouve le compte, son service et son secret", () => {
    const accounts = parseAuthenticatorExport(LINK);
    expect(accounts).toHaveLength(1);
    const [one] = accounts;
    expect(one?.issuer).toBe("Test1");
    expect(one?.name).toBe("Test1:test1@example1.com");
    expect(one?.uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(one?.uri).toContain("issuer=Test1");
    expect(one?.uri).toMatch(/^otpauth:\/\/totp\//);
  });

  it("accepte plusieurs liens collés d'un coup", () => {
    expect(parseAuthenticatorExport(`${LINK}\n${LINK}`)).toHaveLength(2);
  });

  it("refuse autre chose qu'un lien de migration", () => {
    expect(() => parseAuthenticatorExport("otpauth://totp/Test?secret=AA")).toThrow(ImportError);
    expect(() => parseAuthenticatorExport("")).toThrow(ImportError);
  });
});
