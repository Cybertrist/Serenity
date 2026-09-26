import type { ReactNode } from "react";

/**
 * Page header inside the app: the name of the screen and, under it, what the screen is for.
 * Left-aligned on the same axis as the content, with room on the right for one action.
 */
export function Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 @[620px]:mb-7">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 text-title @[620px]:text-display">{title}</h1>
        <p className="m-0 text-body text-muted">{subtitle}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
