import { InfoIcon, type Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/** Loading placeholder: skeletons rather than spinners. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-[60px] animate-pulse rounded-card bg-surface" />
      ))}
    </div>
  );
}

/** Empty screen: a large duotone icon, a title, a sentence that says what to do, one button. */
export function EmptyState({
  icon: IconComponent,
  title,
  text,
  action,
}: {
  icon: Icon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-10 text-center">
      <IconComponent size={40} weight="duotone" className="text-muted" aria-hidden="true" />
      <p className="m-0 text-body font-medium">{title}</p>
      {text ? <p className="m-0 max-w-[36ch] text-caption text-muted">{text}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
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
  return (
    <p
      className={`m-0 flex items-start gap-2.5 rounded-control px-3.5 py-3 text-caption ${TONE_SOFT[tone]} ${tone === "neutral" ? "text-muted" : TONE_TEXT[tone]}`}
    >
      <IconComponent size={18} weight="duotone" aria-hidden="true" className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 rounded-control bg-crit-soft px-3.5 py-3 text-caption text-crit">
      {children}
    </p>
  );
}
