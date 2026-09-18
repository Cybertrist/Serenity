import type { Icon } from "@phosphor-icons/react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/** A list icon sits in a 36 px rounded square tinted with the soft colour of its state. */
export function Chip({
  icon: IconComponent,
  tone = "neutral",
  duotone = false,
  size = 36,
}: {
  icon: Icon;
  tone?: Tone;
  duotone?: boolean;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-chip ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}
      style={{ width: size, height: size }}
    >
      <IconComponent size={Math.round(size * 0.56)} weight={duotone ? "duotone" : "regular"} />
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex h-[26px] items-center whitespace-nowrap rounded-full px-2.5 text-caption font-medium ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}
    >
      {children}
    </span>
  );
}
