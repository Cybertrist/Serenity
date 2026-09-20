import { BellIcon, GearIcon, QuestionIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { FRAME, FRAME_PART, IconButton, PERSPECTIVE, Wordmark } from "../../design";

/**
 * The app lives in one square, centred on the page: side = min(92vw, 92vh, 980px).
 * Under 768 px the square gives way to the full screen: a 390 px square is unusable.
 * Everything inside is laid out against this box, not the window (container queries).
 */
export function AppFrame({
  unread,
  onNotifications,
  onSettings,
  onGuide,
  children,
  action,
  footer,
}: {
  unread: number;
  onNotifications: () => void;
  onSettings: () => void;
  onGuide: () => void;
  children: ReactNode;
  /** Floats over the bottom right of the screen, clear of the scrolling content. */
  action?: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center md:p-6"
      style={{ perspective: PERSPECTIVE }}
    >
      <motion.div
        variants={FRAME}
        initial="initial"
        animate="animate"
        className="@container relative flex h-dvh w-full flex-col overflow-hidden border-frame bg-surface md:h-[min(92vh,92vw,980px)] md:w-[min(92vh,92vw,980px)] md:rounded-[32px] md:border-2 md:shadow-[0_40px_120px_-30px_var(--color-glow)]"
      >
        <motion.header
          variants={FRAME_PART}
          className="relative flex shrink-0 items-center gap-2 px-4 py-3 sm:px-5"
        >
          <Wordmark size={17} />
          <span className="flex-1" />
          <IconButton icon={QuestionIcon} label="Guide" onClick={onGuide} />
          <span className="relative">
            <IconButton icon={BellIcon} label="Notifications" onClick={onNotifications} />
            {unread > 0 ? (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent"
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </span>
          <IconButton icon={GearIcon} label="Réglages" onClick={onSettings} />
          {/* The rule that closes the title bar is the flag: a letterhead, not a decoration. */}
          <span aria-hidden="true" className="tricolore absolute inset-x-0 bottom-0 h-0.5" />
        </motion.header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          {children}
          {action}
        </div>
        <motion.div variants={FRAME_PART} className="relative shrink-0">
          {footer}
        </motion.div>
      </motion.div>
    </div>
  );
}
