import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Glass } from "./Glass";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

/**
 * The head of a screen: where things stand, in one sentence, and the one thing to do about it.
 * The vault, the breaches and the agent all open on one. It carries the mood edge: the light
 * of the app is what it talks about.
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
  const ink =
    tone === "accent" ? "text-accent-text" : tone === "warn" ? "text-warn-text" : TONE_TEXT[tone];
  return (
    <Glass
      halo
      className="flex items-center gap-3.5 px-4 py-3.5 @[620px]:gap-4 @[620px]:px-5 @[620px]:py-4"
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${TONE_SOFT[tone]} ${ink}`}
      >
        <IconComponent size={22} weight="duotone" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-heading">{title}</span>
        {text ? <span className="text-caption text-muted">{text}</span> : null}
      </span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </Glass>
  );
}
