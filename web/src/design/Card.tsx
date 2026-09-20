import type { ReactNode } from "react";

/** One main piece of information per card. Separated by surface colour and a thin border. */
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
      className={`rounded-card border border-line bg-surface ${padded ? "p-4" : "overflow-hidden"} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="m-0 text-body font-semibold">{title}</h2>
        {subtitle ? <p className="m-0 text-caption text-muted">{subtitle}</p> : null}
      </div>
      {trailing}
    </div>
  );
}
