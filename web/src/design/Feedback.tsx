import { InfoIcon, type Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/** Loading placeholder: skeletons rather than spinners. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-[56px] animate-pulse rounded-card border border-line bg-glass" />
      ))}
    </div>
  );
}

/**
 * Nothing here yet: a mark, a title, a sentence that says what to do, one action. Compact, so
 * an empty zone never pushes the rest of the screen out of sight.
 */
export function EmptyState({
  icon: IconComponent,
  title,
  text,
  action,
  tone = "neutral",
}: {
  icon: Icon;
  title: string;
  text?: string;
  action?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong px-6 py-8 text-center">
      <span
        className={`glass mb-2 flex h-14 w-14 items-center justify-center rounded-[18px] ${tone === "neutral" ? "text-muted" : TONE_TEXT[tone]}`}
      >
        <IconComponent size={26} weight="duotone" aria-hidden="true" />
      </span>
      <p className="m-0 text-heading">{title}</p>
      {text ? <p className="m-0 max-w-[42ch] text-caption text-muted">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** One line that explains a screen or a control. Never decorative: it always says why. */
export function Note({
  children,
  tone = "neutral",
  icon: IconComponent = InfoIcon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: Icon;
}) {
  const ink =
    tone === "neutral"
      ? "text-muted"
      : tone === "warn"
        ? "text-text [&>svg]:text-warn-text"
        : tone === "accent"
          ? "text-text [&>svg]:text-accent-text"
          : TONE_TEXT[tone];
  return (
    <p
      className={`m-0 flex items-start gap-2.5 rounded-[11px] px-3 py-2.5 text-caption ${TONE_SOFT[tone]} ${ink}`}
    >
      <IconComponent size={16} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 rounded-[11px] bg-crit-soft px-3 py-2.5 text-caption font-medium text-crit"
    >
      {children}
    </p>
  );
}
