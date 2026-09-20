import { XIcon, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";
import { Chip } from "./Chip";
import { DIALOG, PERSPECTIVE } from "./motion";
import type { Tone } from "./tone";

type Size = "sm" | "md" | "lg";

const WIDTHS: Record<Size, string> = {
  sm: "max-w-[440px]",
  md: "max-w-[560px]",
  lg: "max-w-[920px]",
};

/** Dialogs stack (an editor over a record): only the last one locks the page scroll. */
let openCount = 0;

function lockScroll(): () => void {
  openCount += 1;
  const previous = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    openCount -= 1;
    if (openCount === 0) document.body.style.overflow = previous;
  };
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Centred dialog: dimmed backdrop, focus kept inside, Escape and the backdrop close it.
 * Same behaviour on every screen size — the phone gets the full width, not a bottom sheet.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  tone = "neutral",
  size = "md",
  header,
  footer,
  flush = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: Icon;
  tone?: Tone;
  size?: Size;
  /** Replaces the default title block (kept inside the same sticky bar). */
  header?: ReactNode;
  /** Pinned under the scrolling body: the actions stay reachable. */
  footer?: ReactNode;
  /** Drops the body padding: for a dialog that lays out its own panes. */
  flush?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const release = lockScroll();
    // Focus the panel itself: the first field keeps its own autoFocus.
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      release();
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6"
          style={{ perspective: PERSPECTIVE }}
        >
          <motion.div
            className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={`relative z-10 flex max-h-[min(88dvh,860px)] w-full flex-col overflow-hidden rounded-card border border-line bg-raised shadow-[0_24px_60px_-12px_var(--color-shade)] outline-none ${WIDTHS[size]}`}
            {...(reduce
              ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
              : { variants: DIALOG, initial: "initial", animate: "animate", exit: "exit" })}
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4">
              {header ?? (
                <>
                  {icon ? <Chip icon={icon} tone={tone} duotone /> : null}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="m-0 truncate text-title">{title}</h2>
                    {subtitle ? (
                      <p className="m-0 truncate text-caption text-muted">{subtitle}</p>
                    ) : null}
                  </div>
                </>
              )}
              <IconButton icon={XIcon} label="Fermer" onClick={onClose} className="-mr-2.5" />
            </div>
            <div
              className={
                flush
                  ? "flex min-h-0 flex-1 flex-col"
                  : "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
              }
            >
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-line bg-raised px-5 py-4">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
