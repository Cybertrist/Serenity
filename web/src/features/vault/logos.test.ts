import { describe, expect, it } from "vitest";
import { logoColour, logoOf } from "./logos";
import { monogramOf } from "./monogram";

describe("brand logos", () => {
  it("reads the brand in the domain's own label", () => {
    expect(logoOf("netflix.com")?.slug).toBe("netflix");
    expect(logoOf("open.spotify.com")?.slug).toBe("spotify");
    expect(logoOf("mail.google.com")?.slug).toBe("google");
  });

  it("skips the public suffix instead of taking it for a brand", () => {
    // Without the rule, a `.co.uk` domain would look up `co` and find nothing.
    expect(logoOf("spotify.co.uk")?.slug).toBe("spotify");
  });

  it("has nothing for a site nobody drew, and says so", () => {
    expect(logoOf("banque.fr")).toBeNull();
    expect(logoOf("credit-agricole.fr")).toBeNull();
    expect(logoOf(null)).toBeNull();
    expect(logoOf("")).toBeNull();
  });

  it("gives a colour a 24 px glyph can be seen in, on both themes", () => {
    expect(logoColour("E50914", "dark")).toBe("#E50914");
    expect(logoColour("E50914", "light")).toBe("#E50914");
    // Apple black on black, and Snapchat yellow on white.
    expect(logoColour("000000", "dark")).toBe("var(--color-text)");
    expect(logoColour("000000", "light")).toBe("#000000");
    expect(logoColour("FFFC00", "light")).toBe("var(--color-text)");
    expect(logoColour("FFFC00", "dark")).toBe("#FFFC00");
  });
});

describe("monogram", () => {
  it("takes the first letter of the name, accents removed", () => {
    expect(monogramOf("Banque", "banque.fr").letter).toBe("B");
    expect(monogramOf("  électricité", null).letter).toBe("E");
    expect(monogramOf("", "impots.gouv.fr").letter).toBe("I");
    expect(monogramOf("«»", null).letter).toBe("?");
  });

  it("gives the same site the same colour, always", () => {
    expect(monogramOf("Banque", "banque.fr").hue).toBe(monogramOf("Banque", "banque.fr").hue);
    expect(monogramOf("Banque", "banque.fr").hue).not.toBe(monogramOf("Ameli", "ameli.fr").hue);
  });
});
