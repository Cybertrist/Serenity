import type { ReactNode } from "react";

/**
 * One main piece of information per card. It stands out by its surface, a step lighter than the
 * app, and a soft shadow: no outline, so a screen of cards does not read as a wireframe.
 */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-card bg-raised shadow-card ${padded ? "p-4 @[620px]:p-5" : "overflow-hidden"} ${className}`}
    >
      {children}
    </div>
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
