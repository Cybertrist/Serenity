import { describe, expect, it } from "vitest";
import { dayLabel, daysUntil, domainOf, plural, relative } from "./format";
import { actionLabel, notificationText } from "./labels";

const NOW = new Date("2026-09-18T12:00:00Z").getTime();

describe("French formats", () => {
  it("says dates like a person", () => {
    expect(relative(null)).toBe("jamais");
    expect(relative(new Date(NOW - 20_000).toISOString(), NOW)).toBe("à l'instant");
    expect(relative(new Date(NOW - 12 * 60_000).toISOString(), NOW)).toBe("il y a 12 minutes");
    expect(relative(new Date(NOW + 12 * 86_400_000).toISOString(), NOW)).toBe("dans 12 jours");
    expect(daysUntil(new Date(NOW + 11.5 * 86_400_000).toISOString(), NOW)).toBe(12);
    expect(dayLabel(new Date(NOW).toISOString(), new Date(NOW))).toBe("Aujourd'hui");
    expect(dayLabel(new Date(NOW - 86_400_000).toISOString(), new Date(NOW))).toBe("Hier");
  });

  it("agrees words with numbers", () => {
    expect(plural(1, "compte", "comptes")).toBe("1 compte");
    expect(plural(2, "compte", "comptes")).toBe("2 comptes");
  });

  it("shows the domain of the first valid address", () => {
    expect(domainOf(["https://www.netflix.com/login"])).toBe("netflix.com");
    expect(domainOf(["", "open.spotify.com"])).toBe("open.spotify.com");
    expect(domainOf([])).toBeNull();
    expect(domainOf(undefined)).toBeNull();
  });

  it("labels the journal and notifications in French", () => {
    expect(actionLabel("auth.login", "success")).toBe("Connexion");
    expect(actionLabel("auth.login", "failure")).toBe("Connexion · échec");
    expect(actionLabel("agent.watch", "skipped")).toBe("Veille de l'agent · non lancé");
    expect(actionLabel("inconnu.x", "success")).toBe("inconnu.x");
    expect(notificationText("rotation.due", "Netflix")).toBe("Netflix : rotation à valider");
  });
});
