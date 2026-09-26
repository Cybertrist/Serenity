import { BellIcon, GearIcon, QuestionIcon, type Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { FRAME, FRAME_PART, IconButton, Wordmark } from "../../design";

/** A bell that says how many notifications wait, for the eye and for a screen reader. */
function bellLabel(unread: number): string {
  if (unread === 0) return "Notifications";
  return unread === 1 ? "Notifications, 1 non lue" : `Notifications, ${String(unread)} non lues`;
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"
    />
  );
}

/** A line of the sidebar that is not a screen: guide, notifications, settings. */
function SideAction({
  icon: IconComponent,
  label,
  onClick,
  dot = false,
  ariaLabel,
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  dot?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative flex min-h-10 w-full items-center gap-3 rounded-control px-3 text-caption font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
    >
      <IconComponent size={19} aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {dot ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" /> : null}
    </button>
  );
}

/**
 * The app is one object posed on the page. On a phone it is the whole screen: a title bar on
 * top, the tabs at the bottom. Once the object is wide enough (a tablet, a desktop), the tabs
 * become a sidebar and the title bar goes with them: the screen gets its whole height back.
 * Everything inside is laid out against this box, not the window (container queries).
 */
export function AppFrame({
  unread,
  onNotifications,
  onSettings,
  onGuide,
  children,
  action,
  nav,
  sidebar,
}: {
  unread: number;
  onNotifications: () => void;
  onSettings: () => void;
  onGuide: () => void;
  children: ReactNode;
  /** Floats over the bottom right of the screen, clear of the scrolling content. */
  action?: ReactNode;
  /** The tab bar, at the bottom of a narrow app. */
  nav: ReactNode;
  /** The same screens, as a column, on the side of a wide app. */
  sidebar: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center md:p-6">
      <motion.div
        variants={FRAME}
        initial="initial"
        animate="animate"
        className="@container relative flex h-dvh w-full overflow-hidden bg-surface md:h-[min(94dvh,900px)] md:w-[min(96vw,1240px)] md:rounded-[26px] md:shadow-frame"
      >
        {/* The head of the object is the flag: a letterhead, not a decoration. */}
        <span
          aria-hidden="true"
          className="tricolore absolute inset-x-0 top-0 z-50 h-[3px] opacity-90"
        />
        <motion.aside
          variants={FRAME_PART}
          className="hidden w-[244px] shrink-0 flex-col gap-6 border-r border-line bg-bg/40 px-3 pb-4 pt-7 @[900px]:flex"
        >
          <div className="px-3">
            <Wordmark size={19} />
          </div>
          {sidebar}
          <div className="mt-auto flex flex-col gap-0.5">
            <SideAction icon={QuestionIcon} label="Guide" onClick={onGuide} />
            <SideAction
              icon={BellIcon}
              label="Notifications"
              ariaLabel={bellLabel(unread)}
              onClick={onNotifications}
              dot={unread > 0}
            />
            <SideAction icon={GearIcon} label="Réglages" onClick={onSettings} />
          </div>
        </motion.aside>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <motion.header
            variants={FRAME_PART}
            className="flex shrink-0 items-center gap-1 px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))] @[900px]:hidden"
          >
            <Wordmark size={17} />
            <span className="flex-1" />
            <IconButton icon={QuestionIcon} label="Guide" onClick={onGuide} />
            <span className="relative">
              <IconButton icon={BellIcon} label={bellLabel(unread)} onClick={onNotifications} />
              {unread > 0 ? <Dot /> : null}
            </span>
            <IconButton icon={GearIcon} label="Réglages" onClick={onSettings} className="-mr-2" />
          </motion.header>
          <div className="relative flex min-h-0 flex-1 flex-col">
            {children}
            {action}
          </div>
          <motion.div variants={FRAME_PART} className="relative shrink-0 @[900px]:hidden">
            {nav}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
