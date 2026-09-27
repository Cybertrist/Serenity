import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/** An icon in a rounded well tinted with the soft colour of its state. */
export function Chip({
  icon: IconComponent,
  tone = "neutral",
  duotone = false,
  size = 36,
}: {
  icon: Icon;
  tone?: Tone;
  duotone?: boolean;
  size?: 28 | 30 | 36 | 44;
}) {
  const box =
    size === 28
      ? "h-7 w-7 rounded-[8px]"
      : size === 30
        ? "h-[30px] w-[30px] rounded-[9px]"
        : size === 36
          ? "h-9 w-9 rounded-[10px]"
          : "h-11 w-11 rounded-[12px]";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${box} ${TONE_SOFT[tone]} ${tone === "accent" ? "text-accent-text" : tone === "warn" ? "text-warn-text" : TONE_TEXT[tone]}`}
    >
      <IconComponent size={Math.round(size * 0.52)} weight={duotone ? "duotone" : "regular"} />
    </span>
  );
}

/** A short state word, as a soft pill. A plain number is a `Count`, not a pill. */
export function Pill({
  children,
  tone = "neutral",
  icon: IconComponent,
}: {
  children: ReactNode;
  tone?: Tone | "violet";
  icon?: Icon;
}) {
  const colours =
    tone === "violet"
      ? "bg-violet-soft text-violet-text"
      : tone === "accent"
        ? "bg-accent-soft text-accent-text"
        : tone === "warn"
          ? "bg-warn-soft text-warn-text"
          : `${TONE_SOFT[tone]} ${tone === "neutral" ? "text-muted" : TONE_TEXT[tone]}`;
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full px-2 text-[12px] font-medium leading-none ${colours}`}
    >
      {IconComponent ? <IconComponent size={13} weight="bold" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** How many there are, next to a heading or in the sidebar: quiet figures, not a badge. */
export function Count({ value }: { value: number }) {
  return <span className="tabular text-[12px] font-medium text-faint">{value}</span>;
}

/**
 * Something waits: a count in a soft ring, amber for what leaked, violet for the agent, blue
 * otherwise. `label` is what a screen reader hears ("3 à voir").
 */
export function Badge({
  value,
  tone = "warn",
  label,
  className = "",
}: {
  value: number;
  tone?: "warn" | "violet" | "accent";
  label?: string;
  className?: string;
}) {
  const colours =
    tone === "violet"
      ? "bg-violet-soft text-violet-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-violet)_30%,transparent)]"
      : tone === "accent"
        ? "bg-accent-soft text-accent-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_30%,transparent)]"
        : "bg-warn-soft text-warn-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-warn)_30%,transparent)]";
  return (
    <span
      className={`tabular inline-grid h-[18px] min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold leading-none ${colours} ${className}`}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <span aria-hidden={label ? true : undefined}>{value > 99 ? "99+" : value}</span>
    </span>
  );
}
