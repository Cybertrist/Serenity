import type { Zone } from "../../vault/state";
import { zoneChip } from "./zone";

/** Whole characters, so an accented or composed first letter is never cut in half. */
const GRAPHEMES = new Intl.Segmenter("fr", { granularity: "grapheme" });

/**
 * The face of an entry in a list: the first letter of its name on a quiet tile. No favicon:
 * fetching one would tell a third party which accounts are in the vault.
 *
 * Where both zones share a list (codes, breaches), a small badge in the corner carries the
 * zone; in the vault the section already says it, so the badge stays off.
 */
export function EntryMark({
  name,
  zone,
  badge = false,
  size = 40,
}: {
  name: string;
  zone: Zone;
  badge?: boolean;
  size?: 36 | 40;
}) {
  const first = GRAPHEMES.segment(name.trim())[Symbol.iterator]().next();
  const letter = first.done ? "?" : first.value.segment.toLocaleUpperCase("fr");
  const chip = zoneChip(zone);
  const Glyph = chip.icon;
  return (
    <span
      aria-hidden="true"
      className="relative flex shrink-0 items-center justify-center rounded-[11px] bg-neutral-soft text-[16px] font-semibold text-text shadow-[inset_0_0_0_1px_var(--color-line)]"
      style={{ width: size, height: size }}
    >
      {letter}
      {badge ? (
        <span
          className={`absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-raised ring-2 ring-raised ${chip.tone === "accent" ? "text-accent" : "text-ok"}`}
        >
          <Glyph size={13} weight="fill" />
        </span>
      ) : null}
    </span>
  );
}
