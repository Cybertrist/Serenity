import { Monogram } from "../../design";
import type { Zone } from "../../vault/state";
import { zoneChip } from "./zone";

/**
 * The face of an entry: its monogram, tinted by a hue drawn from its name, the same on every
 * device. No favicon: fetching one would tell a third party which accounts are in the vault.
 *
 * Where both zones share a list (the agent, the breaches), a small badge in the corner carries
 * the zone; in the vault the group already says it, so the badge stays off.
 */
export function EntryMark({
  name,
  zone,
  badge = false,
  size = 36,
}: {
  name: string;
  zone: Zone;
  badge?: boolean;
  size?: number;
}) {
  if (!badge) return <Monogram name={name} size={size} />;
  const chip = zoneChip(zone);
  const Glyph = chip.icon;
  return (
    <span className="relative shrink-0" aria-hidden="true">
      <Monogram name={name} size={size} />
      <span
        className={`absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-panel ring-2 ring-panel ${zone === "agent" ? "text-violet-text" : "text-accent-text"}`}
      >
        <Glyph size={12} weight="fill" />
      </span>
    </span>
  );
}
