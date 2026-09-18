import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

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

/** Empty screen: a large duotone icon, one sentence, maybe one button. Nothing else. */
export function EmptyState({
  icon: IconComponent,
  text,
  action,
}: {
  icon: Icon;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <IconComponent size={48} weight="duotone" className="text-muted" aria-hidden="true" />
      <p className="m-0 text-body text-muted">{text}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 rounded-control bg-crit-soft px-3.5 py-3 text-caption text-crit">
      {children}
    </p>
  );
}
