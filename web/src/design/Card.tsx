import type { ReactNode } from "react";
import { Glass } from "./Glass";

/**
 * One main piece of information per card: a pane of glass over the light of the app. `halo`
 * gives it the mood edge, for the one card of a screen that carries the state.
 */
export function Card({
  children,
  className = "",
  padded = true,
  halo = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  halo?: boolean;
}) {
  return (
    <Glass
      halo={halo}
      className={`${padded ? "p-4 @[620px]:px-[18px] @[620px]:py-4" : "overflow-hidden"} ${className}`}
    >
      {children}
    </Glass>
  );
}

export function SectionTitle({
  title,
  subtitle,
  trailing,
  level = 2,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Heading className="m-0 text-heading">{title}</Heading>
        {subtitle ? <p className="m-0 text-caption text-muted">{subtitle}</p> : null}
      </div>
      {trailing}
    </div>
  );
}
