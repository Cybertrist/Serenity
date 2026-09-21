import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { logoColour, logoOf } from "./logos";
import { LOGO_COLOURS } from "./logos.generated";
import { monogramOf } from "./monogram";

const web = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

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

  it("finds the marks kept by hand, which simple-icons does not carry", () => {
    expect(logoOf("www.laposte.fr")).toEqual({ slug: "laposte", hex: "003DA5" });
    expect(logoOf("www.cineville.fr")).toEqual({ slug: "cineville", hex: "0098E0" });
    // La Poste's blue lands at 0.218 of luminance, just under the 0.22 the dark theme
    // asks for, so the bird is drawn in the text colour there and in its own blue on the
    // light one. Cineville's is bright enough to keep its colour on both.
    expect(logoColour("003DA5", "dark")).toBe("var(--color-text)");
    expect(logoColour("003DA5", "light")).toBe("#003DA5");
    expect(logoColour("0098E0", "dark")).toBe("#0098E0");
    expect(logoColour("0098E0", "light")).toBe("#0098E0");
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

describe("the pack on disk", () => {
  // The table and the files are written by the same script, but nothing used to check they
  // agreed: a slug with a colour and no file shows up as a missing logo, not as a failure.
  const files = readdirSync(join(web, "public", "logos")).filter((n) => n.endsWith(".svg"));
  const slugs = Object.keys(LOGO_COLOURS);

  it("has one file per colour, and one colour per file", () => {
    expect(files.length).toBeGreaterThan(3000);
    expect(new Set(files)).toEqual(new Set(slugs.map((slug) => `${slug}.svg`)));
  });

  it("keeps every mark to the single shape the mask can draw", () => {
    for (const name of ["laposte.svg", "cineville.svg"]) {
      const svg = readFileSync(join(web, "public", "logos", name), "utf8");
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg.split("<path")).toHaveLength(2);
      expect(svg).not.toContain("fill=");
    }
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
