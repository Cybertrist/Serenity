import { XIcon, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { Chip } from "./Chip";
import { DIALOG } from "./motion";
import type { Tone } from "./tone";

type Size = "sm" | "md" | "lg";

const WIDTHS: Record<Size, string> = {
  sm: "max-w-[440px]",
  md: "max-w-[560px]",
  lg: "max-w-[920px]",
};

/**
 * Where a dialog lands: a slot inside the app, like the toasts. Nothing of the app ever
 * paints over the window; the app is the whole object. Without the slot (the entry screens,
 * before the frame exists) the dialog falls back to the viewport.
 */
const SLOT = "dialog-slot";

/**
 * Open dialogs, oldest first. Dialogs stack (a confirmation over the settings): only the one
 * on top answers Escape and keeps the focus, and only the last one to close gives the page
 * its scroll back.
 */
const stack: string[] = [];
let previousOverflow = "";

function push(id: string): void {
  if (stack.length === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  stack.push(id);
}

function pop(id: string): void {
  const at = stack.lastIndexOf(id);
  if (at !== -1) stack.splice(at, 1);
  if (stack.length === 0) document.body.style.overflow = previousOverflow;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Centred dialog: dimmed backdrop, focus kept inside, Escape and the backdrop close it.
 * Same behaviour on every screen size: the phone gets the full width, not a bottom sheet.
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
  const id = useId();
  // Callers often pass a fresh arrow function on every render. Kept in a ref, it does not
  // re-run the effect below, which would steal the focus from the field being typed in.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    push(id);
    // Focus the panel itself: the first field keeps its own autoFocus.
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
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
      pop(id);
      previous?.focus();
    };
  }, [open, id]);

  // The frame mounts after the dialogs in the tree, so the slot is looked up on every opening.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(SLOT));
  }, [open]);

  const dialog = (
    <AnimatePresence>
      {open ? (
        <div
          className={`${slot ? "absolute" : "fixed"} inset-0 z-40 flex items-center justify-center p-3 @[620px]:p-6`}
        >
          <motion.div
            className="absolute inset-0 bg-scrim backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              close.current();
            }}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={subtitle ? `${id}-subtitle` : undefined}
            tabIndex={-1}
            className={`relative z-10 flex max-h-full w-full flex-col overflow-hidden rounded-sheet bg-float shadow-float outline-none ${WIDTHS[size]}`}
            {...(reduce
              ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
              : { variants: DIALOG, initial: "initial", animate: "animate", exit: "exit" })}
          >
            <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-5 @[620px]:px-6">
              {header ?? (
                <>
                  {icon ? <Chip icon={icon} tone={tone} duotone /> : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                    <h2 id={`${id}-title`} className="m-0 text-balance text-heading">
                      {title}
                    </h2>
                    {subtitle ? (
                      <p id={`${id}-subtitle`} className="m-0 truncate text-caption text-muted">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
              {header ? (
                <span id={`${id}-title`} className="sr-only">
                  {title}
                </span>
              ) : null}
              <IconButton
                icon={XIcon}
                label="Fermer"
                onClick={() => {
                  close.current();
                }}
                className="-mr-2.5 -mt-1.5"
              />
            </div>
            <div
              className={
                flush
                  ? "flex min-h-0 flex-1 flex-col border-t border-line"
                  : // Children keep their natural height: a flex child shrinks by default, and
                    // a card that shrinks with `overflow-hidden` cuts its own rows in silence
                    // instead of letting this container scroll.
                    "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2 @[620px]:px-6 [&>*]:shrink-0"
              }
            >
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-line px-5 py-4 @[620px]:px-6">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return slot ? createPortal(dialog, slot) : dialog;
}
