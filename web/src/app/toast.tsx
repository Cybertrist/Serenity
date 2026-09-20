import { CheckCircleIcon, InfoIcon, WarningCircleIcon, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { SPRING, type Tone } from "../design";

interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ICONS: Record<Tone, Icon> = {
  ok: CheckCircleIcon,
  accent: CheckCircleIcon,
  warn: WarningCircleIcon,
  crit: WarningCircleIcon,
  neutral: InfoIcon,
};

const COLOURS: Record<Tone, string> = {
  ok: "text-ok",
  accent: "text-accent",
  warn: "text-warn",
  crit: "text-crit",
  neutral: "text-muted",
};

type Show = (text: string, tone?: Tone) => void;

const ToastContext = createContext<Show>(() => undefined);

export function useToast(): Show {
  return useContext(ToastContext);
}

/** Where the app frame wants its messages; outside the app they float over the page. */
const SLOT = "toast-slot";

/**
 * Short messages, at the bottom of the square so they never cover a title. One at a time, as
 * the charter asks: a new message replaces the previous one.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const show = useCallback<Show>((text, tone = "ok") => {
    next.current += 1;
    const id = next.current;
    // One at a time: a new message replaces the previous one, which keeps repeats calm.
    setToasts([{ id, text, tone }]);
    setTimeout(() => {
      setToasts((all) => all.filter((t) => t.id !== id));
    }, 4000);
  }, []);
  // The frame mounts after this provider, so the slot is looked up again on every message.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(SLOT));
  }, [toasts.length]);

  const area = (
    <div
      role="status"
      aria-live="polite"
      className={
        slot
          ? "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-3 @[620px]:items-end"
          : "pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4"
      }
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const IconComponent = ICONS[t.tone];
          return (
            <motion.button
              key={t.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={SPRING}
              onClick={() => {
                setToasts((all) => all.filter((x) => x.id !== t.id));
              }}
              className="pointer-events-auto flex max-w-[440px] items-start gap-2.5 rounded-control border border-line bg-raised px-4 py-3 text-left text-caption shadow-[0_12px_32px_-8px_var(--color-shade)]"
            >
              <IconComponent
                size={18}
                weight="duotone"
                aria-hidden="true"
                className={`mt-px shrink-0 ${COLOURS[t.tone]}`}
              />
              <span>{t.text}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {slot ? createPortal(area, slot) : area}
    </ToastContext.Provider>
  );
}
