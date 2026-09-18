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
      className={`rounded-card border border-line bg-surface ${padded ? "p-4" : "px-4 py-1"} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      <h2 className="m-0 text-body font-semibold">{title}</h2>
      {subtitle ? <p className="m-0 text-caption text-muted">{subtitle}</p> : null}
    </div>
  );
}
