import { ShieldCheckIcon, SparkleIcon, type Icon } from "@phosphor-icons/react";
import type { Tone } from "../../design";
import type { Zone } from "../../vault/state";

export interface ZoneLook {
  icon: Icon;
  /** Closest charter tone, for the components that only know those. */
  tone: Tone;
  /** Colour of its pill: blue for what only you can read, violet for the agent's. */
  pill: "accent" | "violet";
  label: string;
  /** Who can read it, in one short sentence: it is the model, it is always said. */
  readers: string;
}

/**
 * The whole model in one glyph: a **shield** for what only your devices can read, a
 * **sparkle** for what you handed to the agent, violet being the agent's colour everywhere.
 */
export function zoneChip(zone: Zone): ZoneLook {
  return zone === "agent"
    ? {
        icon: SparkleIcon,
        tone: "accent",
        pill: "violet",
        label: "Confié à l'agent",
        readers: "L'agent peut les lire",
      }
    : {
        icon: ShieldCheckIcon,
        tone: "ok",
        pill: "accent",
        label: "Protégé par toi",
        readers: "Toi seul peux les lire",
      };
}
