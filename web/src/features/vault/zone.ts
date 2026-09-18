import { ShieldIcon, ShieldCheckIcon, type Icon } from "@phosphor-icons/react";
import type { Tone } from "../../design";
import type { Zone } from "../../vault/state";

/** Chip of an entry: personal entries are yours (neutral shield), agent ones are watched. */
export function zoneChip(zone: Zone): { icon: Icon; tone: Tone } {
  return zone === "agent"
    ? { icon: ShieldCheckIcon, tone: "ok" }
    : { icon: ShieldIcon, tone: "neutral" };
}
