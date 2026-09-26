import type { Icon } from "@phosphor-icons/react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/** A list icon sits in a rounded square tinted with the soft colour of its state. */
export function Chip({
  icon: IconComponent,
  tone = "neutral",
  duotone = false,
  size = 36,
}: {
  icon: Icon;
  tone?: Tone;
  duotone?: boolean;
  size?: 28 | 36 | 44;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${size === 28 ? "rounded-lg" : "rounded-chip"} ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}
      style={{ width: size, height: size }}
    >
      <IconComponent size={Math.round(size * 0.52)} weight={duotone ? "duotone" : "regular"} />
    </span>
  );
}

/** A short state word. A plain number is a `Count`, not a pill. */
export function Pill({ children, tone = "neutral" }: { children: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-micro font-semibold tracking-[0.01em] ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}
    >
      {children}
    </span>
  );
}

/** How many there are, next to a heading: quiet figures, not a badge. */
export function Count({ value }: { value: number }) {
  return <span className="tabular text-caption font-medium text-muted">{value}</span>;
}
