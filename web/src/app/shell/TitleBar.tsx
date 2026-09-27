import {
  BellIcon,
  CopySimpleIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  MoonIcon,
  SquareIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { IconButton, Kbd, Logo, setThemeChoice, useTheme } from "../../design";
import { desktop, useMaximized } from "../desktop";
import { bellLabel, UnreadDot } from "./Header";

/** Minimise, maximise or restore, close: on the right, as Windows and most Linux desktops do. */
function WindowControls() {
  const bridge = desktop();
  const maximized = useMaximized();
  if (!bridge) return null;
  const button =
    "app-no-drag grid h-full w-[46px] place-items-center text-muted transition-colors duration-100";
  return (
    <div className="ml-2 flex h-full">
      <button
        type="button"
        aria-label="Réduire"
        title="Réduire"
        onClick={bridge.minimize}
        className={`${button} hover:bg-hover hover:text-text`}
      >
        <MinusIcon size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Restaurer" : "Agrandir"}
        title={maximized ? "Restaurer" : "Agrandir"}
        onClick={bridge.toggleMaximize}
        className={`${button} hover:bg-hover hover:text-text`}
      >
        {maximized ? (
          <CopySimpleIcon size={13} aria-hidden="true" className="-scale-x-100" />
        ) : (
          <SquareIcon size={13} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        aria-label="Fermer"
        title="Fermer"
        onClick={bridge.close}
        className={`${button} hover:bg-close hover:text-white`}
      >
        <XIcon size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The desktop app's own title bar (the window has no frame). You drag the window by it,
 * double-click it to maximise; the search in the middle opens the palette. `bare` is the
 * version of the entry screens: nothing but the window controls, over the lock screen.
 */
export function TitleBar({
  bare = false,
  unread = 0,
  onSearch,
  onNotifications,
  trailing,
}: {
  bare?: boolean;
  unread?: number;
  onSearch?: () => void;
  onNotifications?: () => void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  if (!desktop()) return null;
  if (bare)
    return (
      <header className="app-drag absolute inset-x-0 top-0 z-50 flex h-10 justify-end">
        <WindowControls />
      </header>
    );
  return (
    <header className="app-drag glass-bar relative z-30 grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-line pl-3.5">
      <div className="flex items-center gap-2.5">
        <Logo size={18} />
        <span className="font-display text-[13px] font-bold tracking-[0.01em]">Serenity</span>
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="app-no-drag flex h-[26px] w-[min(400px,40vw)] items-center gap-2 rounded-[7px] border border-line bg-hover pl-2.5 pr-1.5 text-[12.5px] text-faint transition-colors duration-150 hover:border-line-strong hover:bg-press hover:text-muted"
      >
        <MagnifyingGlassIcon size={14} aria-hidden="true" />
        <span className="flex-1 truncate text-left">Rechercher une entrée ou une action</span>
        <Kbd keys="mod+k" className="[&>kbd]:h-[17px]" />
      </button>
      <div className="flex h-full items-center justify-end gap-0.5">
        {trailing}
        <span className="app-no-drag relative">
          <IconButton
            icon={BellIcon}
            label={bellLabel(unread)}
            size="sm"
            {...(onNotifications ? { onClick: onNotifications } : {})}
          />
          {unread > 0 ? <UnreadDot /> : null}
        </span>
        <IconButton
          icon={theme === "dark" ? SunIcon : MoonIcon}
          label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
          size="sm"
          className="app-no-drag"
          onClick={() => {
            setThemeChoice(theme === "dark" ? "light" : "dark");
          }}
        />
        <WindowControls />
      </div>
    </header>
  );
}
