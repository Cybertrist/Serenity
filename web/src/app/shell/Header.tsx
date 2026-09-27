import { BellIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "../../design";
import { useShell } from "./context";
import { useUnread } from "./useShellData";

/**
 * The head of a screen: its name in Syne, one line under it that says what the screen is for
 * or where things stand, and room on the right for the screen's actions. It also names the
 * browser tab. On a phone, where there is no sidebar nor top bar, it carries the search and
 * the notifications next to the screen's own actions.
 */
export function Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
}) {
  const shell = useShell();
  const unread = useUnread();
  const phone = shell.form === "mobile";

  useEffect(() => {
    document.title = `${title} · Serenity`;
    return () => {
      document.title = "Serenity";
    };
  }, [title]);

  return (
    <header className="mb-5 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 @[900px]:mb-6 @[900px]:items-end">
      <h1 className="col-start-1 row-start-1 m-0 min-w-0 truncate font-display text-[32px] font-bold leading-[1.1] tracking-[-0.015em] @[900px]:text-display">
        {title}
      </h1>
      <div className="col-span-2 row-start-2 m-0 text-[13.5px] text-muted @[900px]:col-span-1">
        {subtitle}
      </div>
      <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 @[900px]:row-span-2 @[900px]:self-end">
        {actions}
        {phone ? (
          <>
            <IconButton
              icon={MagnifyingGlassIcon}
              label="Rechercher ou agir"
              className="!h-10 !w-10 !rounded-[12px] bg-hover text-text"
              onClick={() => {
                shell.openPalette();
              }}
            />
            <span className="relative">
              <IconButton
                icon={BellIcon}
                label={bellLabel(unread)}
                className="!h-10 !w-10 !rounded-[12px] bg-hover text-text"
                onClick={shell.openNotifications}
              />
              {unread > 0 ? <UnreadDot /> : null}
            </span>
          </>
        ) : null}
      </div>
    </header>
  );
}

/** A bell that says how many notifications wait, for the eye and for a screen reader. */
export function bellLabel(unread: number): string {
  if (unread === 0) return "Notifications";
  return unread === 1 ? "Notifications, 1 non lue" : `Notifications, ${String(unread)} non lues`;
}

export function UnreadDot() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-warn shadow-[0_0_0_2px_var(--color-bg)]"
    />
  );
}
