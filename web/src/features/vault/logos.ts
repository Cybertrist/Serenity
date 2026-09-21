import { LOGO_COLOURS } from "./logos.generated";

/**
 * Finding a brand logo from a domain, without asking anyone.
 *
 * The rule is the domain's own label: `open.spotify.com` is Spotify, `mail.google.com` is
 * Google. Labels are read from the right, skipping the public suffix, so `bbc.co.uk` finds
 * `bbc` and not `co`. Nothing leaves the browser: the answer is a file name in the pack.
 */

/** Suffix labels that are never a brand, so `co.uk` and friends fall through to the real one. */
const SUFFIXES = new Set(["co", "com", "net", "org", "gov", "edu", "ac", "asso", "info", "biz"]);

export type Logo = { slug: string; hex: string };

export function logoOf(domain: string | null): Logo | null {
  if (!domain) return null;
  const labels = domain.toLowerCase().split(".");
  // The last label is the TLD: a brand is never there.
  for (let i = labels.length - 2; i >= 0; i--) {
    const label = labels[i];
    if (label === undefined || SUFFIXES.has(label)) continue;
    // simple-icons strips dashes from its slugs, domains keep them.
    const slug = label.replaceAll("-", "");
    const hex = LOGO_COLOURS[slug];
    if (hex !== undefined) return { slug, hex };
  }
  return null;
}

/**
 * A brand colour that still reads on the surface it sits on. Netflix red is fine everywhere,
 * but Apple black disappears on the dark theme and Snapchat yellow on the light one, so the
 * ones that cross the line are pulled back towards the text colour of the theme.
 */
export function logoColour(hex: string, theme: "dark" | "light"): string {
  const value = Number.parseInt(hex, 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  // Relative luminance, the sRGB weights, close enough for a 24 px glyph.
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (theme === "dark" && luminance < 0.22) return "var(--color-text)";
  if (theme === "light" && luminance > 0.8) return "var(--color-text)";
  return `#${hex}`;
}
