/** Whole characters, so an accented or composed first letter is never cut in half. */
const GRAPHEMES = new Intl.Segmenter("fr", { granularity: "grapheme" });

/** A stable hue per name: the same account always gets the same colour, on every device. */
export function hueOf(name: string): number {
  let h = 2166136261;
  for (const c of name.toLowerCase()) h = Math.imul(h ^ (c.codePointAt(0) ?? 0), 16777619);
  return (h >>> 0) % 360;
}

export function initialOf(name: string): string {
  const first = GRAPHEMES.segment(name.trim())[Symbol.iterator]().next();
  return first.done ? "?" : first.value.segment.toLocaleUpperCase("fr");
}

/**
 * The face of an account: its first letter on a tile tinted by a hue drawn from its name.
 * No favicon: fetching one would tell a third party which accounts are in the vault.
 */
export function Monogram({
  name,
  size = 36,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`monogram grid shrink-0 place-items-center font-display font-bold leading-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        fontSize: size * 0.42,
        ["--h" as string]: hueOf(name),
      }}
    >
      {initialOf(name)}
    </span>
  );
}
