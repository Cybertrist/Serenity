import { describe, expect, it } from "vitest";
import { match, normalise } from "./match";

describe("palette match", () => {
  it("ignores accents and case", () => {
    expect(normalise("Réglages")).toBe("reglages");
    expect(match("Réglages", "regl").score).toBe(3);
  });

  it("prefers the start, then the start of a word", () => {
    expect(match("Netflix", "net").score).toBe(3);
    expect(match("Banque Populaire", "pop").score).toBe(2);
    expect(match("Spotify", "tif").score).toBe(1);
    expect(match("Spotify", "xyz").score).toBe(0);
  });

  it("points the highlight into the original text", () => {
    expect(match("Accès récents", "rec").range).toEqual([6, 9]);
  });
});
