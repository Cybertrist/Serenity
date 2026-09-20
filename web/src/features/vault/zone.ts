import { RobotIcon, ShieldCheckIcon, type Icon } from "@phosphor-icons/react";
import type { Tone } from "../../design";
import type { Zone } from "../../vault/state";

/**
 * The mark of an entry, and the whole model in one glyph: a **green shield** for what only your
 * devices can read, a **blue robot** for what you handed to the agent — the accent blue being
 * the agent's colour everywhere else in the app.
 */
export function zoneChip(zone: Zone): { icon: Icon; tone: Tone; label: string } {
  return zone === "agent"
    ? { icon: RobotIcon, tone: "accent", label: "Confié à l'agent" }
    : { icon: ShieldCheckIcon, tone: "ok", label: "Protégé par toi" };
}
