import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/**
 * The head of a screen: where things stand, in one sentence, and the one thing to do about it.
 * The vault, the breaches and the agent all open on one; it is the same card everywhere.
 */
export function StatusCard({
  icon: IconComponent,
  tone,
  title,
  text,
  action,
}: {
  icon: Icon;
  tone: Tone;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-center gap-4 overflow-hidden rounded-card bg-raised p-4 shadow-card @[620px]:p-5`}
    >
      {/* A wash of the state colour from the icon side: the tone is felt before it is read. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-2/3 opacity-60 ${TONE_SOFT[tone]} [mask-image:linear-gradient(90deg,#000,transparent)]`}
      />
      <span
        aria-hidden="true"
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}
      >
        <IconComponent size={26} weight="duotone" />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-heading">{title}</span>
        {text ? <span className="text-caption text-muted">{text}</span> : null}
      </span>
      {action ? <span className="relative shrink-0">{action}</span> : null}
    </div>
  );
}
