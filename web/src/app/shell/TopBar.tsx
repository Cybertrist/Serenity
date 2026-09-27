import {
  BellIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  QuestionIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { IconButton, Kbd, setThemeChoice, useTheme } from "../../design";
import { useShell } from "./context";
import { bellLabel, UnreadDot } from "./Header";
import { useUnread } from "./useShellData";

/**
 * The top of a wide app in a browser: the search that opens the palette (Ctrl+K), then the
 * guide, the theme and the notifications. The desktop app has the same in its title bar.
 */
export function TopBar() {
  const shell = useShell();
  const unread = useUnread();
  const theme = useTheme();
  return (
    <div className="relative z-10 flex h-[56px] shrink-0 items-center gap-2 px-6 @[1180px]:px-10">
      <button
        type="button"
        onClick={() => {
          shell.openPalette();
        }}
        className="flex h-[34px] w-full max-w-[440px] items-center gap-2.5 rounded-[9px] border border-line bg-hover pl-3 pr-1.5 text-[13px] text-faint transition-colors duration-150 hover:border-line-strong hover:bg-press hover:text-muted"
      >
        <MagnifyingGlassIcon size={16} aria-hidden="true" />
        <span className="flex-1 truncate text-left">Rechercher une entrée ou une action</span>
        <Kbd keys="mod+k" />
      </button>
      <span className="flex-1" />
      <IconButton icon={QuestionIcon} label="Guide" onClick={shell.openGuide} />
      <IconButton
        icon={theme === "dark" ? SunIcon : MoonIcon}
        label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
        onClick={() => {
          setThemeChoice(theme === "dark" ? "light" : "dark");
        }}
      />
      <span className="relative">
        <IconButton icon={BellIcon} label={bellLabel(unread)} onClick={shell.openNotifications} />
        {unread > 0 ? <UnreadDot /> : null}
      </span>
    </div>
  );
}
