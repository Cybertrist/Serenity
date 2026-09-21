/**
 * The fallback mark: the first letter of the entry, on a colour that never changes for a given
 * site. Computed in the browser from the name and the domain, so a vault of sites nobody made a
 * logo for still reads as a list of distinct things.
 */

export type Monogram = { letter: string; hue: number };

/** FNV-1a, 32 bits: short, stable across runs, and enough to spread a few dozen entries. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function monogramOf(name: string, domain: string | null): Monogram {
  const source = name.trim() || domain || "?";
  // Normalised so « Électricité » gives E and not a letter the font may not carry.
  const letter =
    source
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .match(/[a-z0-9]/i)?.[0]
      .toUpperCase() ?? "?";
  return { letter, hue: hash(domain ?? source) % 360 };
}
